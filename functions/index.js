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
      const { product, buyerEmail } = req.body;

      if (!product?.name || !product?.price) {
        return res.status(400).json({ error: "Missing product name or price" });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: product.name },
            unit_amount: Math.round(product.price * 100),
          },
          quantity: product.quantity || 1,
        }],
        mode: "payment",
        customer_email: buyerEmail,
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
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

      if (!stripeAccountId) {
        const account = await stripe.accounts.create({
          type: "express",
          capabilities: {
            transfers: { requested: true },
          },
        });

        stripeAccountId = account.id;
        await userRef.set({ stripeAccountId }, { merge: true });
        console.log(`✅ Created and saved stripeAccountId: ${stripeAccountId}`);
      }

      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: "https://example.com/cancel",
        return_url: "https://example.com/success",
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

// ✅ Create PaymentIntent (One-Tap)
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
      const { amount, stripeAccountId, buyerEmail, application_fee_amount } = req.body;

      if (!amount || !stripeAccountId || !buyerEmail) {
        return res.status(400).json({ error: "Missing required fields" });
      }

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

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        customer: customer.id,
        payment_method: defaultPaymentMethod.id,
        off_session: true,
        confirm: true,
        application_fee_amount,
        transfer_data: {
          destination: stripeAccountId,
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
    console.log(`🔔 Notification sent to ${buyerId}`);
  });
