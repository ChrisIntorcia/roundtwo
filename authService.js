import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebaseConfig"; // Ensure db is imported

// Function to handle user sign-up and save user data in Firestore
export const signUp = async (email, password, fullName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Ensure fullName is defined before setting the document
    if (!fullName) {
      throw new Error("Full Name is required.");
    }

    // Store user data in Firestore
    await setDoc(doc(db, "users", user.uid), {
      fullName,
      email,
      username: null, // Will be set later after signup in the username popup
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
  return signInWithEmailAndPassword(auth, email, password);
};
