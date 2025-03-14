import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebaseConfig"; // Ensure this import path points correctly to firebaseConfig.js

// Function to handle user sign-up
export const signUp = (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

// Function to handle user login
export const login = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};
