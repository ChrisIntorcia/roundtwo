const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { getFirestore } = require("firebase-admin/firestore");
const { initializeApp } = require("firebase-admin/app");
const cors = require("cors")({ origin: true });

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");

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

// ✅ Create Stripe Payment Sheet — works for buyers with or without a stripeAccountId
exports.createPaymentSheet = onRequest({
  secrets: [STRIPE_SECRET_KEY],
  timeoutSeconds: 60,
  memory: "256Mi",
  cpu: 1,
}, async (req, res) => {
  cors(req, res, async () => {
    const stripe = require("stripe")(STRIPE_SECRET_KEY.value());
    const { amount, customerEmail, stripeAccountId } = req.body;

    if (!amount || !customerEmail) {
      return res.status(400).json({ error: "Missing amount or customerEmail" });
    }

    try {
      const customer = stripeAccountId
        ? await stripe.customers.create(
            { email: customerEmail },
            { stripeAccount: stripeAccountId }
          )
        : await stripe.customers.create({ email: customerEmail });

      const ephemeralKey = stripeAccountId
        ? await stripe.ephemeralKeys.create(
            { customer: customer.id },
            { apiVersion: "2023-10-16", stripeAccount: stripeAccountId }
          )
        : await stripe.ephemeralKeys.create(
            { customer: customer.id },
            { apiVersion: "2023-10-16" }
          );

      const paymentIntent = stripeAccountId
        ? await stripe.paymentIntents.create(
            {
              amount,
              currency: "usd",
              customer: customer.id,
              automatic_payment_methods: { enabled: true },
              application_fee_amount: Math.round(amount * 0.1),
            },
            { stripeAccount: stripeAccountId }
          )
        : await stripe.paymentIntents.create({
            amount,
            currency: "usd",
            customer: customer.id,
            automatic_payment_methods: { enabled: true },
          });

      res.json({
        paymentIntent: paymentIntent.client_secret,
        ephemeralKey: ephemeralKey.secret,
        customer: customer.id,
        publishableKey: "pk_test_51LLWUzBDUXSD1c3FLs6vIFKT9eyd0O3ex9yA13jcaDhUJFcabm5VZkPZfCc7rikCWyTeVjZlM7dHXm10IlhoQBKG00g4SsRQfr",
      });
    } catch (err) {
      console.error("❌ Stripe error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });
});


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

      if (!userDoc.exists()) return res.status(404).json({ error: "User not found" });

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

      const stripeAccountId = await createStripeAccountIfNeeded(stripe, uid);

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

// ✅ Direct PaymentIntent with app fee
exports.createPaymentIntent = onRequest({
  secrets: [STRIPE_SECRET_KEY],
  timeoutSeconds: 60,
  memory: "256Mi",
  cpu: 1,
}, async (req, res) => {
  cors(req, res, async () => {
    try {
      const stripe = require("stripe")(STRIPE_SECRET_KEY.value());
      const { amount, stripeAccountId, buyerEmail, application_fee_amount } = req.body;

      if (!amount || !stripeAccountId || !buyerEmail) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const customer = await stripe.customers.create({ email: buyerEmail });

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        customer: customer.id,
        application_fee_amount,
        automatic_payment_methods: { enabled: true },
        transfer_data: {
          destination: stripeAccountId,
        },
      });

      res.status(200).json({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
      console.error("❌ createPaymentIntent error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });
});
