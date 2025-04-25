import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import CustomHeader from "../../components/CustomHeader";
import { useNavigation } from "@react-navigation/native";

const AddressesScreen = () => {
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const navigation = useNavigation();

  useEffect(() => {
    const fetchAddress = async () => {
      try {
        const docRef = doc(db, "users", auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        const data = docSnap.data();

        if (data?.shippingAddress) {
          setAddress(data.shippingAddress);
        } else {
          setAddress(null);
        }
      } catch (err) {
        console.error("Error fetching address:", err);
        setAddress(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAddress();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E76A54" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader title="Shipping Address" showBack />

      <ScrollView contentContainerStyle={styles.content}>
        {!address ? (
          <Text style={styles.emptyText}>No address saved yet.</Text>
        ) : (
          <View style={styles.card}>
            <Text style={styles.line}>📍 {address.formatted || address.street}</Text>
            <Text style={styles.line}>
              {address.city}, {address.state} {address.zip}
            </Text>
            <Text style={styles.line}>{address.country}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.replace("AddShippingAddress")}
        >
          <Text style={styles.buttonText}>
            {address ? "Edit Address" : "Add Address"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: "#F5F5F5",
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  line: {
    fontSize: 15,
    marginBottom: 6,
    color: "#333",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#E76A54",
    paddingVertical: 14,
    borderRadius: 32,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});

export default AddressesScreen;
