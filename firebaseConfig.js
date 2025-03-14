import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Set up Firebase Auth with AsyncStorage
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

// Set up Firestore & Storage
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
