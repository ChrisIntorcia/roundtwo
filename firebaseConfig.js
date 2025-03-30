import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCb1tCjXqrIWmAC7fPcfu-D21sobF4PkEw",
  authDomain: "roundtwo-cc793.firebaseapp.com",
  projectId: "roundtwo-cc793",
  storageBucket: "roundtwo-cc793.firebasestorage.app",
  messagingSenderId: "402284856773",
  appId: "1:402284856773:web:a58476112c41be95b0b7ac",
  measurementId: "G-HT3MMGH8HL",
};

// Initialize Firebase app (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth only once (fallback to getAuth if already initialized)
let auth;
try {
  auth = getAuth(app);
} catch (e) {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
}

// Firestore and Storage
const db = getFirestore(app);
const storage = getStorage(app);

// ✅ Export firebaseConfig for ReCAPTCHA
export { app, auth, db, storage, firebaseConfig };
