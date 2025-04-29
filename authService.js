import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";

// ---- Helpers ----

// Ensure we have a Firestore “users” doc for newly-signed-up social users
async function ensureUserDoc(user, extra = {}) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email,
      fullName: user.displayName || null,
      username: null,
      createdAt: new Date(),
      ...extra,
    });
  }
}

// ---- Email/Password ----

export async function signUp(email, password, fullName) {
  if (!fullName) {
    throw new Error("Full Name is required.");
  }
  const cleanEmail = email.trim();
  const { user } = await createUserWithEmailAndPassword(auth, cleanEmail, password);
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email: cleanEmail,
    fullName,
    username: null,
    createdAt: new Date(),
  });
  return user;
}

export async function login(email, password) {
  const cleanEmail = email.trim();
  const { user } = await signInWithEmailAndPassword(auth, cleanEmail, password);
  return user;
}

// ---- Google Sign-In ----

export async function authenticateWithGoogle(idToken, accessToken) {
  console.log("🪪 Google tokens received:", { idToken, accessToken }); // debug log

  if (!idToken || !accessToken) {
    throw new Error("Missing Google tokens (idToken or accessToken)");
  }

  const credential = GoogleAuthProvider.credential(idToken, accessToken);
  const { user } = await signInWithCredential(getAuth(), credential);
  await ensureUserDoc(user);
  return user;
}


// ---- Apple Sign-In ----

export async function signInWithApple() {
  // generate a random nonce and its SHA256
  const rawNonce = Math.random().toString(36).slice(2);
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  );

  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    ],
    nonce: hashedNonce,
  });

  if (!appleCredential.identityToken) {
    throw new Error("Apple authentication failed: no identity token returned");
  }

  const provider = new OAuthProvider("apple.com");
  const firebaseCred = provider.credential({
    idToken: appleCredential.identityToken,
    rawNonce,
  });

  const { user } = await signInWithCredential(getAuth(), firebaseCred);
  // record their Firestore profile on first login
  await ensureUserDoc(user, {
    fullName:
      appleCredential.fullName?.givenName +
        " " +
        appleCredential.fullName?.familyName || null,
    email: user.email,
  });

  return user;
}
export const resetPassword = async (email) => {
  if (!email) throw new Error("missing-email");
  await sendPasswordResetEmail(auth, email);
};