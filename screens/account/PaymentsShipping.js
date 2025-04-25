import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons } from "@expo/vector-icons";
import { useStripe } from "@stripe/stripe-react-native";
import { useNavigation } from "@react-navigation/native";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import CustomHeader from "../../components/CustomHeader";
import { AppContext } from "../../context/AppContext";

export default function PaymentsShippingScreen() {
  const { user } = useContext(AppContext);
  const navigation = useNavigation();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [paymentSummary, setPaymentSummary] = useState(null);
  const [shippingSummary, setShippingSummary] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    getDoc(userRef).then((docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();

        const card = data?.paymentMethod?.card;
        const name = data?.paymentMethod?.billingDetails?.name;

        if (card && card.last4 && card.brand) {
          const lastName = name?.split(" ").slice(-1)[0] || "";
          setPaymentSummary(`•••• ${card.last4} ${card.brand.toUpperCase()}`);
        }

        const addr = data?.shippingAddress;
        if (addr?.street && addr?.city && addr?.state && addr?.zip) {
          setShippingSummary(
            `${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`
          );
        }
      }
    });
  }, [user]);

  const openPaymentSheet = async () => {
  if (!user || isProcessingPayment) return;

  setIsProcessingPayment(true); // ⏳ lock button

  try {
    const response = await fetch(
      "https://us-central1-roundtwo-cc793.cloudfunctions.net/createPaymentSheet",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ customerEmail: user.email }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch setup intent");
    }

    const { setupIntentClientSecret, ephemeralKey, customer, setupIntentId } = await response.json();

    const { error: initError } = await initPaymentSheet({
      customerId: customer,
      customerEphemeralKeySecret: ephemeralKey,
      setupIntentClientSecret,
      merchantDisplayName: "Roundtwo",
    });

    if (initError) {
      Alert.alert("Stripe Init Error", initError.message);
      return;
    }

    const { error: sheetError } = await presentPaymentSheet();
    if (sheetError) {
      if (sheetError.code === "Canceled") return;
      Alert.alert("Error", sheetError.message);
      return;
    }

    // Save minimal card details to Firestore via backend
    try {
      await fetch("https://us-central1-roundtwo-cc793.cloudfunctions.net/savePaymentMethodDetails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setupIntentId,
          uid: user.uid,
        }),
      });

      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { hasSavedPaymentMethod: true }, { merge: true });

      const updatedDoc = await getDoc(userRef);
      const data = updatedDoc.data();
      const card = data?.paymentMethod?.card;
      const name = data?.paymentMethod?.billingDetails?.name;

      if (card && card.last4 && card.brand) {
        const lastName = name?.split(" ").slice(-1)[0] || "";
        setPaymentSummary(`•••• ${card.last4} ${card.brand.toUpperCase()}`);
      }

      Alert.alert("✅ Success", "Payment method added and saved!");
    } catch (err) {
      console.error("❌ Failed to save payment details:", err);
      Alert.alert("Error", "Card added, but display info could not be saved.");
    }
  } catch (err) {
    console.error("💥 Setup Sheet Error:", err);
    Alert.alert("Error", err.message || "Something went wrong.");
  } finally {
    setIsProcessingPayment(false); // ✅ always unlock
  }
};


  const openShippingSheet = () => {
    navigation.navigate("AddShippingAddress");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          extraScrollHeight={20}
        >
          <CustomHeader title="Payments & Shipping" showBack />
          <Text style={styles.subtext}>
            This is required in order to place a bid, order or buy a product on
            a livestream. We charge your card if a bid or offer is accepted.
          </Text>

          <TouchableOpacity
            style={[styles.section, isProcessingPayment && { opacity: 0.5 }]}
            onPress={openPaymentSheet}
            disabled={isProcessingPayment}
          >
            <Ionicons
              name="card-outline"
              size={24}
              color="#444"
              style={styles.icon}
            />
            <View>
              <Text style={styles.sectionTitle}>Add Payment Method</Text>
              <Text style={styles.sectionSubtitle}>
                {paymentSummary || "Please input your payment info."}
              </Text>
            </View>
            <Ionicons
              name="create-outline"
              size={20}
              color="#444"
              style={styles.editIcon}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.section} onPress={openShippingSheet}>
            <Ionicons
              name="cube-outline"
              size={24}
              color="#444"
              style={styles.icon}
            />
            <View>
              <Text style={styles.sectionTitle}>Add Shipping Details</Text>
              <Text style={styles.sectionSubtitle}>
                {shippingSummary || "Please input your shipping details."}
              </Text>
            </View>
            <Ionicons
              name="create-outline"
              size={20}
              color="#444"
              style={styles.editIcon}
            />
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    flexGrow: 1,
    padding: 20,
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
