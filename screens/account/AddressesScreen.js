import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";

const AddressesScreen = () => {
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    const fetchAddress = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setAddress(docSnap.data().shippingAddress);
        }

        setLoading(false);
      } catch (err) {
        console.error("Failed to load address:", err);
        setLoading(false);
      }
    };

    fetchAddress();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!address) {
    return (
      <View style={styles.center}>
        <Text>No address saved.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Saved Shipping Address</Text>
      <Text style={styles.field}>📍 {address.formatted}</Text>
      <Text style={styles.field}>City: {address.city}</Text>
      <Text style={styles.field}>State: {address.state}</Text>
      <Text style={styles.field}>Zip: {address.zip}</Text>
      <Text style={styles.field}>Country: {address.country}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#fff",
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  field: {
    fontSize: 15,
    marginBottom: 8,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default AddressesScreen;
