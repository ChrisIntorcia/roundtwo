import React, { useContext, useEffect, useState } from "react";
import { View, Text, StyleSheet, Button, Alert } from "react-native";
import { getAuth, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { AppContext } from "../context/AppContext";

const ProfileScreen = ({ navigation }) => {
  const { isSeller } = useContext(AppContext);
  const [userInfo, setUserInfo] = useState(null);
  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          Alert.alert("Error", "User not authenticated.");
          return;
        }

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserInfo({
            email: user.email,
            ranchName: data.ranchName || "Not provided",
            ranchLocation: data.ranchLocation || "Not provided",
            phoneNumber: data.phoneNumber || "Not provided",
            shippingAddress: data.shippingAddress?.address || "Not provided",
            hasPaymentMethod: data.hasPaymentMethod ? "Yes" : "No",
            stripeVerified: data.stripeVerified ? "Yes" : "No",
          });
        } else {
          console.log("User document does not exist.");
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
        Alert.alert("Error", "Failed to fetch user info.");
      }
    };

    fetchUserInfo();
  }, []);

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        Alert.alert("Success", "You have been logged out.");
        navigation.replace("Login");
      })
      .catch((error) => {
        console.error("Error logging out:", error);
        Alert.alert("Error", "Failed to log out.");
      });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      {userInfo ? (
        <>
          <Text style={styles.infoText}>Email: {userInfo.email}</Text>
          <Text style={styles.infoText}>Phone: {userInfo.phoneNumber}</Text>
          <Text style={styles.infoText}>Shipping Address: {userInfo.shippingAddress}</Text>
          <Text style={styles.infoText}>Credit Card on File: {userInfo.hasPaymentMethod}</Text>
          {isSeller ? (
            <>
              <Text style={styles.infoText}>Ranch Name: {userInfo.ranchName}</Text>
              <Text style={styles.infoText}>Ranch Location: {userInfo.ranchLocation}</Text>
              <Text style={styles.infoText}>Stripe Verified: {userInfo.stripeVerified}</Text>
              <Text style={styles.infoText}>Role: Seller</Text>
            </>
          ) : (
            <Text style={styles.infoText}>Role: Buyer</Text>
          )}
        </>
      ) : (
        <Text>Loading...</Text>
      )}
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 10,
  },
});

export default ProfileScreen;
