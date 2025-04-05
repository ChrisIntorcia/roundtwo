import { initializeApp, getApps } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCb1tCjXqrIWmAC7fPcfu-D21sobF4PkEw",
  authDomain: "roundtwo-cc793.firebaseapp.com",
  projectId: "roundtwo-cc793",
  storageBucket: "roundtwo-cc793.firebasestorage.app", //
  messagingSenderId: "402284856773",
  appId: "1:402284856773:web:a58476112c41be95b0b7ac",
  measurementId: "G-HT3MMGH8HL",
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// ✅ Use initializeAuth with AsyncStorage (React Native only)
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Firestore and Storage
const db = getFirestore(app);
const storage = getStorage(app);

// Export everything
export { app, auth, db, storage, firebaseConfig };
