import React, { createContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isSeller, setIsSeller] = useState(false);
  const [vendorName, setRanchName] = useState("");
  const [vendorLocation, setRanchLocation] = useState("");

  const becomeSeller = (name, location) => {
    setIsSeller(true);
    setRanchName(name);
    setRanchLocation(location);
  };

  const checkIfSeller = async (uid) => {
    if (!uid || !auth.currentUser || auth.currentUser.uid !== uid) {
      console.warn("⚠️ Skipping checkIfSeller — invalid or signed-out UID");
      return;
    }

    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.isSeller === true) {
          setIsSeller(true);
          setRanchName(data.vendorName || "");
          setRanchLocation(data.vendorLocation || "");
        } else {
          setIsSeller(false);
        }
      } else {
        console.warn("⚠️ No user document found for UID:", uid);
        setIsSeller(false);
      }
    } catch (err) {
      console.error("🔥 Firestore permission error in checkIfSeller:", err);
      setIsSeller(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser?.uid) {
        checkIfSeller(firebaseUser.uid);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && auth.currentUser) {
        checkIfSeller(auth.currentUser.uid);
      }
    });
    return () => subscription.remove();
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        isSeller,
        vendorName,
        vendorLocation,
        setUser,
        becomeSeller,
        checkIfSeller,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
