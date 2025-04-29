const { onRequest } = require("firebase-functions/v2/https");
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

// ✅ Checkout session
exports.createCheckoutSession = onRequest({
  secrets: [STRIPE_SECRET_KEY],
  timeoutSeconds: 60,
  memory: "256Mi",
  cpu: 1,
}, async (req, res) => {
  cors(req, res, async () => {
    try {
      const stripe = require("stripe")(STRIPE_SECRET_KEY.value());
      const { productId, buyerEmail } = req.body;   // 👈 FRONTEND MUST SEND productId NOW

      if (!productId || !buyerEmail) {
        return res.status(400).json({ error: "Missing productId or buyerEmail" });
      }

      // Fetch product from Firestore
      const productRef = db.collection("products").doc(productId);
      const productSnap = await productRef.get();

      if (!productSnap.exists) {
        return res.status(404).json({ error: "Product not found" });
      }

      const product = productSnap.data();

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: product.title,
              tax_code: product.taxCode || 'txcd_31010000',  // 👈 pass dynamic taxCode (fallback if missing)
            },
            unit_amount: Math.round(product.fullPrice * 100),
          },
          quantity: 1,
        }],
        mode: "payment",
        customer_email: buyerEmail,
        success_url: "https://yourdomain.com/success",   // update to real app URLs
        cancel_url: "https://yourdomain.com/cancel",
      });

      res.status(200).json({ url: session.url });
    } catch (err) {
      console.error("❌ createCheckoutSession error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });
});

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
        refresh_url: "https://stogora.shop/refresh",
        return_url: "https://stogora.shop/return",
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

exports.createPaymentIntent = onRequest({
  secrets: [STRIPE_SECRET_KEY],
  timeoutSeconds: 60,
  memory: "256Mi",
  cpu: 1,
}, async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    try {
      const stripe = require("stripe")(STRIPE_SECRET_KEY.value());
      const { productId, stripeAccountId, buyerEmail, application_fee_amount } = req.body;

      if (!productId || !stripeAccountId || !buyerEmail) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const db = getFirestore();
      const productRef = db.collection('products').doc(productId);
      const productSnap = await productRef.get();

      if (!productSnap.exists) {
        return res.status(404).json({ error: "Product not found" });
      }

      const product = productSnap.data();

      const customers = await stripe.customers.list({ email: buyerEmail });
      let customer = customers.data[0];

      if (!customer) {
        customer = await stripe.customers.create({ email: buyerEmail });
      }

      const paymentMethods = await stripe.paymentMethods.list({
        customer: customer.id,
        type: "card",
      });

      const defaultPaymentMethod = paymentMethods.data[0];

      if (!defaultPaymentMethod) {
        return res.status(400).json({ error: "No saved payment method found." });
      }

      // 🔥 Tax Calculation
      const TAX_RATE_PERCENT = 0.07; // 7% flat sales tax
      const basePrice = product.bulkPrice; // ✅ bulk price, since they're buying live
      const taxAmount = basePrice * TAX_RATE_PERCENT;
      const totalAmount = Math.round((basePrice + taxAmount) * 100); // Stripe expects cents

      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: "usd",
        customer: customer.id,
        payment_method: defaultPaymentMethod.id,
        off_session: true,
        confirm: true,
        application_fee_amount,
        transfer_data: {
          destination: stripeAccountId,
        },
        metadata: {
          basePrice: basePrice.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          totalPrice: ((basePrice + taxAmount).toFixed(2)),
          productId: productId,
        },
      });

      res.status(200).json({ success: true, paymentIntentId: paymentIntent.id });
    } catch (err) {
      console.error("❌ createPaymentIntent error:", err.message);
      res.status(500).json({ error: err.message });
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
exports.sendOrderNotification = require("firebase-functions").firestore
  .document("orders/{orderId}")
  .onCreate(async (snap, context) => {
    const order = snap.data();
    const buyerId = order.buyerId;

    if (!buyerId || !order.title) return;

    const notification = {
      message: `Your order for "${order.title}" was placed successfully.`,
      timestamp: require("firebase-admin").firestore.FieldValue.serverTimestamp(),
      type: "order",
    };

    await db.collection("users").doc(buyerId).collection("notifications").add(notification);
  });

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

    // Get setup intent to find attached payment method
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    const paymentMethodId = setupIntent.payment_method;

    if (!paymentMethodId) {
      return res.status(404).json({ error: "No payment method attached" });
    }

    // Retrieve the payment method details
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    const card = paymentMethod.card;
    const name = paymentMethod.billing_details.name;

    // Save to Firestore
    const userRef = db.collection("users").doc(uid);
    await userRef.set({
      paymentMethod: {
        card: {
          brand: card.brand,
          last4: card.last4,
        },
        billingDetails: {
          name,
        },
      },
    }, { merge: true });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ savePaymentMethodDetails error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

