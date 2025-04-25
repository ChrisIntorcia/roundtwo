import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import * as Google from 'expo-auth-session/providers/google';
import { getAuth, signInWithCredential, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';

// Function to handle user sign-up and save user data in Firestore
export const signUp = async (email, password, fullName) => {
  try {
    const cleanEmail = email.trim(); // ✅ Trim email

    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    const user = userCredential.user;

    if (!fullName) {
      throw new Error("Full Name is required.");
    }

    await setDoc(doc(db, "users", user.uid), {
      fullName,
      email: cleanEmail, // ✅ Save trimmed email
      username: null,
      createdAt: new Date(),
    });

    return user;
  } catch (error) {
    console.error("Error signing up:", error);
    throw error;
  }
};

// Function to handle user login
export const login = (email, password) => {
  return signInWithEmailAndPassword(auth, email.trim(), password); // ✅ Trim on login too
};

// Google Sign-in
export const authenticateWithGoogle = async (idToken) => {
  const auth = getAuth();
  const credential = GoogleAuthProvider.credential(idToken);
  return await signInWithCredential(auth, credential);
};

// Apple Sign-in
export const signInWithApple = async () => {
  const auth = getAuth();
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  const provider = new OAuthProvider('apple.com');
  const firebaseCredential = provider.credential({
    idToken: credential.identityToken,
    rawNonce: null,
  });

  return await signInWithCredential(auth, firebaseCredential);
};
