import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getAuth } from "firebase/auth";
import { useStripe } from "@stripe/stripe-react-native";
import { useNavigation } from "@react-navigation/native";

export default function PaymentsShippingScreen() {
  const auth = getAuth();
  const navigation = useNavigation();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const openPaymentSheet = async () => {
    const user = auth.currentUser;
  
    if (!user) {
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
            amount: 500, // temporary amount just to set up payment method
            customerEmail: user.email,
          }),
        }
      );
  
      const json = await response.json();
  
      if (!response.ok) {
        throw new Error(json.error || "Failed to load payment sheet.");
      }
  
      const { paymentIntent, ephemeralKey, customer, publishableKey } = json;
  
      const { error: initError } = await initPaymentSheet({
        customerId: customer,
        customerEphemeralKeySecret: ephemeralKey,
        paymentIntentClientSecret: paymentIntent,
        merchantDisplayName: "Roundtwo",
      });
  
      if (initError) {
        Alert.alert("Stripe Init Error", initError.message);
        return;
      }
  
      const { error: sheetError } = await presentPaymentSheet();
  
      if (sheetError) {
        Alert.alert("Payment Error", sheetError.message);
      } else {
        Alert.alert("✅ Success", "Payment method added!");
      }
    } catch (err) {
      console.error("💥 Payment Sheet Error:", err);
      Alert.alert("Error", err.message || "Something went wrong.");
    }
  };
  
  

  const openShippingSheet = () => {
    navigation.navigate("AddShippingAddress");
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Payments & Shipping</Text>
      <Text style={styles.subtext}>
        This is required in order to place a bid, order or buy a product on a
        livestream. We charge your card if a bid or offer is accepted.
      </Text>

      <TouchableOpacity style={styles.section} onPress={openPaymentSheet}>
        <Ionicons name="card-outline" size={24} color="#444" style={styles.icon} />
        <View>
          <Text style={styles.sectionTitle}>Add Payment Method</Text>
          <Text style={styles.sectionSubtitle}>
            Please input your payment info.
          </Text>
        </View>
        <Ionicons name="create-outline" size={20} color="#444" style={styles.editIcon} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.section} onPress={openShippingSheet}>
        <Ionicons name="cube-outline" size={24} color="#444" style={styles.icon} />
        <View>
          <Text style={styles.sectionTitle}>Add Shipping Details</Text>
          <Text style={styles.sectionSubtitle}>
            Please input your shipping details.
          </Text>
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