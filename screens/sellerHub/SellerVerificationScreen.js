import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getAuth } from "firebase/auth";
import { useStripe } from "@stripe/stripe-react-native";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { Ionicons } from "@expo/vector-icons";

export default function SellerVerificationScreen() {
  const navigation = useNavigation();
  const auth = getAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [phoneVerified, setPhoneVerified] = useState(false);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [paymentMethodVerified, setPaymentMethodVerified] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const data = userSnap.data();
      setPhoneVerified(!!data?.phoneVerified);
      setIdentityVerified(!!data?.identityVerified);
      setPaymentMethodVerified(!!data?.hasSavedPaymentMethod);
    };
    fetchStatus();
  }, []);

  const openVerifyPhone = () => {
    navigation.navigate("VerifyPhone");
  };

  const openVerifyIdentity = () => {
    navigation.navigate("VerifyIdentity");
  };

  const openPaymentSheet = async () => {
    const user = auth.currentUser;

    if (!user || !user.email) {
      Alert.alert("Login Required", "Please log in to add a payment method.");
      return;
    }

    try {
      const response = await fetch(
        "https://us-central1-roundtwo-cc793.cloudfunctions.net/createPaymentSheet",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: 500,
            customerEmail: user.email,
          }),
        }
      );

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Failed to load payment sheet.");
      }

      const { paymentIntent, ephemeralKey, customer } = json;

      const initResult = await initPaymentSheet({
        customerId: customer,
        customerEphemeralKeySecret: ephemeralKey,
        paymentIntentClientSecret: paymentIntent,
        merchantDisplayName: "Roundtwo",
        returnURL: "roundtwo://stripe-redirect"
      });

      if (initResult.error) {
        console.error("❌ initPaymentSheet error:", initResult.error.message);
        Alert.alert("Stripe Init Error", initResult.error.message);
        return;
      }

      const { error: sheetError } = await presentPaymentSheet();

      if (sheetError) {
        console.error("Payment Sheet Error:", sheetError);
      } else {
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, { hasSavedPaymentMethod: true }, { merge: true });
        setPaymentMethodVerified(true);
        Alert.alert("✅ Success", "Payment method added and saved!");
      }
    } catch (err) {
      console.error("💥 Payment Sheet Error:", err);
      Alert.alert("Error", err.message || "Something went wrong.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Seller Verification</Text>
      <Text style={styles.subtext}>Complete the steps below to activate selling features.</Text>

      <TouchableOpacity style={styles.section} onPress={openVerifyPhone}>
        <Ionicons name="call-outline" size={24} color="#444" style={styles.icon} />
        <View>
          <Text style={styles.sectionTitle}>Verify Phone Number</Text>
          <Text style={styles.sectionSubtitle}>{phoneVerified ? "Verified" : "Verify"}</Text>
        </View>
        <Ionicons name="create-outline" size={20} color="#444" style={styles.editIcon} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.section} onPress={openPaymentSheet}>
        <Ionicons name="card-outline" size={24} color="#444" style={styles.icon} />
        <View>
          <Text style={styles.sectionTitle}>Add Payment Method</Text>
          <Text style={styles.sectionSubtitle}>{paymentMethodVerified ? "Verified" : "Verify"}</Text>
        </View>
        <Ionicons name="create-outline" size={20} color="#444" style={styles.editIcon} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.section} onPress={openVerifyIdentity}>
        <Ionicons name="person-circle-outline" size={24} color="#444" style={styles.icon} />
        <View>
          <Text style={styles.sectionTitle}>Verify Identity</Text>
          <Text style={styles.sectionSubtitle}>{identityVerified ? "Verified" : "Verify"}</Text>
        </View>
        <Ionicons name="create-outline" size={20} color="#444" style={styles.editIcon} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    color: "gray",
    marginBottom: 20,
  },
  section: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "gray",
  },
  icon: {
    marginRight: 12,
  },
  editIcon: {
    marginLeft: "auto",
  },
});
