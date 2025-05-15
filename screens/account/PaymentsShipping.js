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
  ActivityIndicator,
  Animated,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons } from "@expo/vector-icons";
import { useStripe } from "@stripe/stripe-react-native";
import { useNavigation } from "@react-navigation/native";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
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
  const [scaleAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();

        const card = data?.paymentMethod?.card;
        const name = data?.paymentMethod?.billingDetails?.name;

        if (card && card.last4 && card.brand) {
          const lastName = name?.split(" ").slice(-1)[0] || "";
          setPaymentSummary(`•••• ${card.last4} ${card.brand.toUpperCase()}`);
        } else {
          setPaymentSummary(null);
        }

        const addr = data?.shippingAddress;
        if (addr?.street && addr?.city && addr?.state && addr?.zip) {
          setShippingSummary(
            `${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`
          );
        } else {
          setShippingSummary(null);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  const animatePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const openPaymentSheet = async () => {
    if (!user || isProcessingPayment) return;
  
    animatePress();
    setIsProcessingPayment(true);
  
    try {
      const response = await fetch(
        "https://us-central1-roundtwo-cc793.cloudfunctions.net/createPaymentSheet",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerEmail: user.email }),
        }
      );
  
      if (!response.ok) {
        throw new Error("Failed to create Payment Sheet");
      }
  
      const {
        setupIntentClientSecret,
        ephemeralKey,
        customer
      } = await response.json();
  
      const { error: initError } = await initPaymentSheet({
        customerId: customer,
        customerEphemeralKeySecret: ephemeralKey,
        setupIntentClientSecret,
        merchantDisplayName: "Roundtwo",
        returnURL: "roundtwo://payment-complete",
      });
  
      if (initError) throw new Error(initError.message);
  
      const { error: sheetError } = await presentPaymentSheet();
      if (sheetError && sheetError.code !== "Canceled") {
        throw new Error(sheetError.message);
      }
  
      // ✅ Extract the setupIntentId from the client secret
      const setupIntentId = setupIntentClientSecret.split("_secret_")[0];
  
      // ✅ Save payment method details to Firestore via Cloud Function
      await fetch("https://us-central1-roundtwo-cc793.cloudfunctions.net/savePaymentMethodDetails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, setupIntentId }),
      });
  
      setPaymentSummary("•••• CARD SAVED");
      Alert.alert("Success", "Payment method added successfully!", [{ text: "OK" }]);
    } catch (err) {
      console.error("Payment Setup Error:", err.message);
      Alert.alert("Error", err.message || "Something went wrong during payment setup.", [
        { text: "Try Again" },
      ]);
    } finally {
      setIsProcessingPayment(false);
    }
  };  

  const openShippingSheet = () => {
    animatePress();
    navigation.navigate("AddShippingAddress");
  };

  const renderSection = (icon, title, subtitle, onPress, isLoading = false) => (
    <Animated.View style={[styles.sectionContainer, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={[styles.section, isLoading && { opacity: 0.7 }]}
        onPress={onPress}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={24} color="#444" />
        </View>
        <View style={styles.sectionContent}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {isLoading ? (
            <ActivityIndicator size="small" color="#444" style={{ marginTop: 4 }} />
          ) : (
            <Text style={[
              styles.sectionSubtitle,
              !subtitle && styles.sectionSubtitleEmpty
            ]}>
              {subtitle || "Not set"}
            </Text>
          )}
        </View>
        <View style={styles.editIconContainer}>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

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
          showsVerticalScrollIndicator={false}
        >
          <CustomHeader title="Account" showBack />
          
          <View style={styles.content}>
            <Text style={styles.subtext}>
              Set up your payment method and shipping details to start buying and selling on Roundtwo.
            </Text>

            {renderSection(
              "card-outline",
              "Payment Method",
              paymentSummary,
              openPaymentSheet,
              isProcessingPayment
            )}

            {renderSection(
              "cube-outline",
              "Shipping Address",
              shippingSummary,
              openShippingSheet
            )}

            <Text style={styles.disclaimer}>
              Your payment information is securely stored with Stripe. We only charge your card when a bid is accepted or a purchase is made.
            </Text>
          </View>
        </KeyboardAwareScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    flexGrow: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  subtext: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
    marginBottom: 24,
  },
  sectionContainer: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  section: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  sectionSubtitleEmpty: {
    color: "#999",
    fontStyle: "italic",
  },
  editIconContainer: {
    padding: 4,
  },
  disclaimer: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    marginTop: 24,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
});
