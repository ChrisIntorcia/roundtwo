const functions = require("firebase-functions");
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const { getFirestore } = require("firebase-admin/firestore");
const { initializeApp } = require("firebase-admin/app");
const cors = require("cors")({ origin: true });

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const AGORA_APP_CERTIFICATE = defineSecret("AGORA_APP_CERTIFICATE");

initializeApp();
const db = getFirestore();

// ✅ Utility: Create Stripe Account if Needed
async function createStripeAccountIfNeeded(stripe, uid) {
  const userRef = db.collection("users").doc(uid);
  let userDoc = await userRef.get();

  if (!userDoc.exists) {
    await userRef.set({});
    userDoc = await userRef.get();
  }

  let stripeAccountId = userDoc.data().stripeAccountId;

  if (!stripeAccountId) {
    const account = await stripe.accounts.create({ type: "express" });
    stripeAccountId = account.id;
    await userRef.update({ stripeAccountId });
  }

  return stripeAccountId;
}

// ✅ Get Stripe Balance
exports.getStripeBalance = onRequest({
  secrets: [STRIPE_SECRET_KEY],
  timeoutSeconds: 60,
  memory: "256Mi",
  cpu: 1,
}, async (req, res) => {
  cors(req, res, async () => {
    try {
      const stripe = require("stripe")(STRIPE_SECRET_KEY.value());
      const { uid } = req.body;

      if (!uid) return res.status(400).json({ error: "Missing user ID" });

      const userRef = db.collection("users").doc(uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) return res.status(404).json({ error: "User not found" });

      const stripeAccountId = userDoc.data().stripeAccountId;

      if (!stripeAccountId) {
        return res.status(400).json({ error: "Stripe account ID not linked" });
      }

      const balance = await stripe.balance.retrieve({
        stripeAccount: stripeAccountId,
      });

      const available = balance.available[0]?.amount || 0;
      const pending = balance.pending[0]?.amount || 0;

      res.status(200).json({ available, pending });
    } catch (err) {
      console.error("❌ getStripeBalance error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });
});

// ✅ Create Account Link
exports.createStripeAccountLink = onRequest({
  secrets: [STRIPE_SECRET_KEY],
  timeoutSeconds: 60,
  memory: "256Mi",
  cpu: 1,
}, async (req, res) => {
  cors(req, res, async () => {
    try {
      const stripe = require("stripe")(STRIPE_SECRET_KEY.value());
      const { uid } = req.body;

      if (!uid) return res.status(400).json({ error: "Missing UID" });

      const userRef = db.collection("users").doc(uid);
      const userDoc = await userRef.get();

      let stripeAccountId = userDoc.exists && userDoc.data()?.stripeAccountId;
      let account;

      if (!stripeAccountId) {
        account = await stripe.accounts.create({
          type: "express",
          capabilities: { transfers: { requested: true } },
        });

        stripeAccountId = account.id;
        await userRef.set({ stripeAccountId }, { merge: true });
      } else {
        account = await stripe.accounts.retrieve(stripeAccountId);
      }

      if (!account || !account.id) {
        throw new Error("Stripe account could not be created or retrieved.");
      }

      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: "roundtwo://payout-refresh",
        return_url: "roundtwo://onboarding-success",
        type: "account_onboarding",
      });

      if (!accountLink?.url || !accountLink.url.startsWith("http")) {
        throw new Error("Stripe did not return a valid onboarding link.");
      }

      res.status(200).json({ url: accountLink.url });
    } catch (err) {
      console.error("❌ createStripeAccountLink error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });
});


// ✅ Verify Stripe Status
exports.verifyStripeStatus = onRequest({
  secrets: [STRIPE_SECRET_KEY],
  timeoutSeconds: 60,
  memory: "256Mi",
  cpu: 1,
}, async (req, res) => {
  cors(req, res, async () => {
    try {
      const stripe = require("stripe")(STRIPE_SECRET_KEY.value());
      const { stripeAccountId } = req.body;

      if (!stripeAccountId) return res.status(400).json({ error: "Missing stripeAccountId" });

      const account = await stripe.accounts.retrieve(stripeAccountId);

      if (!account.charges_enabled || !account.payouts_enabled) {
        return res.status(400).json({
          error: "Stripe account is not fully enabled for payouts or charges.",
        });
      }

      res.status(200).json({ success: true });
    } catch (err) {
      console.error("❌ verifyStripeStatus error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });
});

exports.createCartPaymentIntent = onRequest({ secrets: [STRIPE_SECRET_KEY] }, async (req, res) => {
  cors(req, res, async () => {
    try {
      const stripe = require("stripe")(STRIPE_SECRET_KEY.value());
      const { channel, uid } = req.body;

      if (!channel || !uid) {
        return res.status(400).json({ error: "Missing channel or uid" });
      }

      const userRef = db.collection("users").doc(uid);
      const userSnap = await userRef.get();
      const user = userSnap.data();

      if (!user?.hasSavedPaymentMethod || !user?.shippingAddress || !user?.stripeCustomerId) {
        return res.status(400).json({ error: "Missing payment or shipping info" });
      }

      const cartRef = db.collection("livestreamCarts").doc(channel).collection("users").doc(uid);
      let cartSnap = await cartRef.get();
      let cartData = cartSnap.exists ? cartSnap.data() : null;

      if (!cartData || !cartData.items || cartData.items.length === 0) {
        return res.status(400).json({ error: "Cart is empty or missing" });
      }

      let total = 0;
      const lineItems = [];

      for (let i = 0; i < cartData.items.length; i++) {
        const item = cartData.items[i];
        const price = item.bulkPrice || item.price || 0;
        const quantity = item.quantity || 1;
        const shipping = i === 0 ? item.shippingRate : 0;
        const subtotal = (price * quantity) + shipping;
        total += subtotal;

        lineItems.push({
          productId: item.productId,
          title: item.title,
          sellerId: item.sellerId,
          quantity: item.quantity,
          price,
          shipping,
          subtotal,
        });
      }

      const customer = await stripe.customers.retrieve(user.stripeCustomerId);
      const paymentMethodId = customer.invoice_settings.default_payment_method;
      if (!paymentMethodId) throw new Error("No default payment method found");

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(total * 100),
        currency: "usd",
        customer: customer.id,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        shipping: {
          name: user.fullName || "Customer",
          address: {
            line1: user.shippingAddress.line1,
            city: user.shippingAddress.city,
            state: user.shippingAddress.state,
            postal_code: user.shippingAddress.postalCode,
            country: user.shippingAddress.country || "US",
          },
        },
        metadata: {
          buyerId: uid,
          stream: channel,
        },
      });

      const timestamp = require("firebase-admin").firestore.FieldValue.serverTimestamp();

      for (const item of lineItems) {
        await db.collection("users").doc(uid).collection("purchases").add({
          productId: item.productId,
          title: item.title,
          quantity: item.quantity,
          price: item.price,
          shipping: item.shipping,
          subtotal: item.subtotal,
          channel,
          purchasedAt: timestamp,
        });

        await db.collection("orders").add({
          buyerId: uid,
          buyerEmail: user.email,
          productId: item.productId,
          title: item.title,
          quantity: item.quantity,
          price: item.price,
          shipping: item.shipping,
          subtotal: item.subtotal,
          streamTitle: "", // optional if you want to include
          fulfilled: false,
          channel,
          shippingAddress: user.shippingAddress,
          purchasedAt: timestamp,
        });
      }

      await cartRef.delete();

      res.status(200).json({ success: true, paymentIntentId: paymentIntent.id });
    } catch (err) {
      console.error("🔥 createCartPaymentIntent error:", err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });
});


exports.createProductPaymentIntent = onRequest({
  secrets: [STRIPE_SECRET_KEY],
}, async (req, res) => {
  cors(req, res, async () => {
    try {
      const stripe = require("stripe")(STRIPE_SECRET_KEY.value());
      const { productId, uid, quantity } = req.body;
      const qty = quantity ? parseInt(quantity, 10) : 1;

      if (!productId || !uid) {
        return res.status(400).json({ success: false, error: "Missing productId or uid" });
      }

      // Fetch product
      const productRef = db.collection("products").doc(productId);
      const productSnap = await productRef.get();
      if (!productSnap.exists) {
        return res.status(404).json({ success: false, error: "Product not found" });
      }
      const product = productSnap.data();

      // Use bulk pricing if applicable
      const bulkQtyThreshold = product.bulkQuantity || Infinity;
      const unitPrice = qty >= bulkQtyThreshold ? product.bulkPrice : product.fullPrice;
      if (typeof unitPrice !== "number" || isNaN(unitPrice)) {
        return res.status(400).json({ success: false, error: "Invalid product price" });
      }

      const subtotal = unitPrice * qty;
      const shipping = product.shippingRate || 0;
      const total = subtotal + shipping;

      // Fetch user
      const userRef = db.collection("users").doc(uid);
      const userSnap = await userRef.get();
      if (!userSnap.exists) {
        return res.status(404).json({ success: false, error: "User not found" });
      }
      const userData = userSnap.data();

      if (!userData?.hasSavedPaymentMethod || !userData?.shippingAddress) {
        return res.status(400).json({ success: false, error: "Missing payment or shipping info" });
      }

      const customerId = userData.stripeCustomerId;
      if (!customerId) {
        return res.status(400).json({ success: false, error: "Stripe customer ID missing" });
      }

      const customer = await stripe.customers.retrieve(customerId);
      const defaultPaymentMethodId = customer.invoice_settings.default_payment_method;
      if (!defaultPaymentMethodId) {
        return res.status(400).json({ success: false, error: "No saved card on file" });
      }

      const paymentMethod = await stripe.paymentMethods.retrieve(defaultPaymentMethodId);
      const sellerStripeAccountId = product.stripeAccountId;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(total * 100),
        currency: "usd",
        customer: customer.id,
        payment_method: paymentMethod.id,
        off_session: true,
        confirm: true,
        shipping: {
          name: userData.fullName || "Customer",
          address: {
            line1: userData.shippingAddress.line1,
            city: userData.shippingAddress.city,
            state: userData.shippingAddress.state,
            postal_code: userData.shippingAddress.postalCode,
            country: userData.shippingAddress.country || "US",
          },
        },
        ...(sellerStripeAccountId && {
          transfer_data: { destination: sellerStripeAccountId }
        }),
        metadata: {
          buyerId: uid,
          productId,
          quantity: qty.toString(),
          unitPrice: unitPrice.toFixed(2),
          subtotal: subtotal.toFixed(2),
          shipping: shipping.toFixed(2),
        },
      });

      const purchaseData = {
        productId,
        product,
        quantity: qty,
        total,
        purchasedAt: require("firebase-admin").firestore.FieldValue.serverTimestamp(),
        shippingAddress: userData.shippingAddress,
        paymentIntentId: paymentIntent.id,
      };

      await db.collection("users").doc(uid).collection("purchases").add(purchaseData);

      await db.collection("orders").add({
        buyerId: uid,
        items: [{ ...product, productId, quantity: qty }],
        total,
        purchasedAt: require("firebase-admin").firestore.FieldValue.serverTimestamp(),
        shippingAddress: userData.shippingAddress,
        paymentIntentId: paymentIntent.id,
      });

      res.status(200).json({ success: true, paymentIntentId: paymentIntent.id });
    } catch (err) {
      console.error("❌ createProductPaymentIntent error:", err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });
});


// ✅ Check Stripe Verified
exports.checkStripeVerified = onRequest({
  secrets: [STRIPE_SECRET_KEY],
}, async (req, res) => {
  try {
    const stripe = require("stripe")(STRIPE_SECRET_KEY.value());
    const { uid } = req.body;

    if (!uid) return res.status(400).json({ error: "Missing UID" });

    const userDoc = await db.collection("users").doc(uid).get();
    const stripeAccountId = userDoc.data()?.stripeAccountId;

    if (!stripeAccountId) return res.status(400).json({ error: "Missing Stripe account" });

    const acct = await stripe.accounts.retrieve(stripeAccountId);
    const verified = acct.details_submitted && acct.charges_enabled;

    res.status(200).json({ verified });
  } catch (err) {
    console.error("❌ checkStripeVerified error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Instant Payout
exports.createInstantPayout = onRequest({
  secrets: [STRIPE_SECRET_KEY],
}, async (req, res) => {
  try {
    const stripe = require("stripe")(STRIPE_SECRET_KEY.value());
    const { uid } = req.body;

    if (!uid) return res.status(400).json({ error: "Missing UID" });

    const userDoc = await db.collection("users").doc(uid).get();
    const stripeAccountId = userDoc.data()?.stripeAccountId;

    if (!stripeAccountId) return res.status(400).json({ error: "Missing Stripe account" });

    const payout = await stripe.payouts.create({
      amount: 1000,
      currency: "usd",
      method: "instant",
    }, {
      stripeAccount: stripeAccountId,
    });

    res.status(200).json({ success: true, payout });
  } catch (err) {
    console.error("❌ createInstantPayout error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Agora Token Generator
exports.generateAgoraToken = onRequest({
  secrets: [AGORA_APP_CERTIFICATE],
}, async (req, res) => {
  try {
    const { channelName, uid } = req.body;

    if (!channelName || uid === undefined) {
      return res.status(400).json({ error: "Missing channelName or uid" });
    }

    const APP_ID = "262ef45d2c514a5ebb129a836c4bff93";
    const APP_CERTIFICATE = AGORA_APP_CERTIFICATE.value();

    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const { RtcTokenBuilder, RtcRole } = require("agora-access-token");

    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      parseInt(uid),
      RtcRole.PUBLISHER,
      privilegeExpiredTs
    );

    res.status(200).json({ token });
  } catch (error) {
    console.error("❌ generateAgoraToken error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Order Notification
exports.sendOrderNotification = onDocumentCreated(
  {
    region: "us-central1", // ✅ matches old function
    memory: "256Mi",
    timeoutSeconds: 60,
  },
  "orders/{orderId}",
  async (event) => {
    const snap = event.data;
    const order = snap.data();
    const buyerId = order.buyerId;

    if (!buyerId || !order.title) return;

    const notification = {
      message: `Your order for "${order.title}" was placed successfully.`,
      timestamp: require("firebase-admin").firestore.FieldValue.serverTimestamp(),
      type: "order",
    };

    await db.collection("users").doc(buyerId).collection("notifications").add(notification);
  }
);

  exports.createPaymentSheet = onRequest({
    secrets: [STRIPE_SECRET_KEY],
  }, async (req, res) => {
    cors(req, res, async () => {
      try {
        const { customerEmail } = req.body;
        const stripe = require("stripe")(STRIPE_SECRET_KEY.value());
  
        if (!customerEmail) {
          return res.status(400).json({ error: "Missing customerEmail" });
        }
  
        // 🔁 Find or create Stripe customer
        const customers = await stripe.customers.list({ email: customerEmail });
        const customer = customers.data[0] || await stripe.customers.create({ email: customerEmail });
  
        // 💳 Create SetupIntent to save card
// Correct
const setupIntent = await stripe.setupIntents.create({
  customer: customer.id,
  usage: 'off_session', // (optional, but recommended)
});
     
  
        // 🔐 Create Ephemeral Key
        const ephemeralKey = await stripe.ephemeralKeys.create(
          { customer: customer.id },
          { apiVersion: "2022-11-15" }
        );
  
        // ✅ Send everything frontend needs
        res.status(200).json({
          setupIntentClientSecret: setupIntent.client_secret,
          setupIntentId: setupIntent.id,
          ephemeralKey: ephemeralKey.secret,
          customer: customer.id,
        });
      } catch (err) {
        console.error("❌ createPaymentSheet error:", err.message);
        res.status(500).json({ error: err.message });
      }
    });
  });  

  exports.savePaymentMethodDetails = onRequest({
    secrets: [STRIPE_SECRET_KEY],
  }, async (req, res) => {
    try {
      const stripe = require("stripe")(STRIPE_SECRET_KEY.value());
      const { setupIntentId, uid } = req.body;
  
      if (!setupIntentId || !uid) {
        return res.status(400).json({ error: "Missing setupIntentId or uid" });
      }
  
      // Retrieve setup intent and get the payment method ID
      const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
      const paymentMethodId = setupIntent.payment_method;
      const customerId = setupIntent.customer;
  
      if (!paymentMethodId || !customerId) {
        return res.status(404).json({ error: "No payment method or customer found" });
      }
  
      // 🔒 Attach the payment method to the customer (if not already)
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
  
      // 🔁 Set it as default for future payments
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
  
      // Retrieve full payment method details
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      const card = paymentMethod.card;
      const name = paymentMethod.billing_details.name;
  
      // 🔐 Save everything to Firestore including the Stripe customer ID
      await db.collection("users").doc(uid).set({
        stripeCustomerId: customerId,
        paymentMethod: {
          card: {
            brand: card.brand,
            last4: card.last4,
          },
          billingDetails: {
            name,
          },
        },
        hasSavedPaymentMethod: true,
      }, { merge: true });
  
      res.status(200).json({ success: true });
    } catch (err) {
      console.error("❌ savePaymentMethodDetails error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });
  