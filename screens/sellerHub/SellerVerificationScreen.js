import React, { useContext, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useStripe } from "@stripe/stripe-react-native";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import { AppContext } from "../../context/AppContext";
import * as WebBrowser from "expo-web-browser";

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

export default function SellerVerificationScreen() {
  const navigation = useNavigation();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { user } = useContext(AppContext);

  const [phoneVerified, setPhoneVerified] = useState(false);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [paymentMethodVerified, setPaymentMethodVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let unsubscribe;
      const fetchStatus = async (user) => {
        try {
          await user?.reload();
          const refreshedUser = auth.currentUser;
          if (!refreshedUser) return;

          const userRef = doc(db, "users", refreshedUser.uid);
          const userSnap = await getDoc(userRef);
          const data = userSnap.data();

          setPhoneVerified(!!data?.phoneVerified);
          setIdentityVerified(!!data?.identityVerified);
          setPaymentMethodVerified(!!data?.hasSavedPaymentMethod);
        } catch (err) {
          console.error("Error refreshing user or fetching data:", err);
        } finally {
          setLoading(false);
        }
      };

      const delayedSubscribe = () => {
        setLoading(true);
        unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          if (firebaseUser) {
            fetchStatus(firebaseUser);
          }
        });
      };

      const timeout = setTimeout(delayedSubscribe, 500);
      return () => {
        clearTimeout(timeout);
        if (unsubscribe) unsubscribe();
      };
    }, [])
  );

  const openVerifyPhone = () => {
    navigation.navigate("VerifyPhone");
  };

  const openVerifyIdentity = () => {
    navigation.navigate("VerifyIdentity");
  };

  const openPaymentSheet = async () => {
    if (!user) {
      Alert.alert("Login Required", "Please log in to add a payment method.");
      return;
    }

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

      const { setupIntentClientSecret, ephemeralKey, customer } = await response.json();

      const { error: initError } = await initPaymentSheet({
        customerId: customer,
        customerEphemeralKeySecret: ephemeralKey,
        setupIntentClientSecret,
        merchantDisplayName: "Roundtwo",
        returnURL: "roundtwo://payment-complete",
      });

      if (initError) {
        Alert.alert("Stripe Init Error", initError.message);
        return;
      }

      const { error: sheetError } = await presentPaymentSheet();

      if (sheetError) {
        Alert.alert("Error", sheetError.message);
        return;
      }

      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { hasSavedPaymentMethod: true }, { merge: true });

      setPaymentMethodVerified(true);
      Alert.alert("✅ Success", "Payment method added and saved!");
    } catch (err) {
      console.error("💥 Setup Sheet Error:", err);
      Alert.alert("Error", err.message || "Something went wrong.");
    }
  };

  const handleStartStripeVerification = async () => {
    if (!user) {
      Alert.alert("Login Required", "Please log in first.");
      return;
    }
  
    try {
      const response = await fetch(
        "https://us-central1-roundtwo-cc793.cloudfunctions.net/createStripeAccountLink",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: user.uid }),
        }
      );
  
      const { url } = await response.json();
  
      if (url && url.startsWith("https://")) {
        await WebBrowser.openBrowserAsync(url);
      } else {
        console.error("Invalid Stripe URL:", url);
        Alert.alert("Stripe Error", "Invalid Stripe onboarding link received.");
      }
    } catch (err) {
      console.error("💥 Stripe Verification Error:", err.message);
      Alert.alert("Stripe Error", err.message || "Unable to start Stripe verification.");
    }
  };

  const renderVerificationStep = (title, subtitle, icon, status, onPress, isLast = false) => (
    <TouchableOpacity 
      style={[styles.verificationStep, !isLast && styles.stepWithBorder]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.stepIconContainer}>
        <View style={[styles.stepIcon, status && styles.stepIconCompleted]}>
          <Ionicons 
            name={icon} 
            size={24} 
            color={status ? "#fff" : "#666"} 
          />
        </View>
        {!isLast && <View style={[styles.stepConnector, status && styles.stepConnectorCompleted]} />}
      </View>
      
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepSubtitle}>{subtitle}</Text>
      </View>
      
      <View style={styles.stepStatus}>
        {status ? (
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
        ) : (
          <Ionicons name="chevron-forward" size={24} color="#666" />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seller Verification</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E76A54" />
          <Text style={styles.loadingText}>Loading verification status...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Complete Verification</Text>
            <Text style={styles.cardSubtitle}>
              Follow these steps to verify your account and start selling on Roundtwo.
            </Text>

            <View style={styles.stepsContainer}>
              {renderVerificationStep(
                "Phone Verification",
                phoneVerified ? "Verified" : "Verify your phone number",
                "call-outline",
                phoneVerified,
                openVerifyPhone
              )}

              {renderVerificationStep(
                "Payment Method",
                paymentMethodVerified ? "Verified" : "Add a payment method",
                "card-outline",
                paymentMethodVerified,
                openPaymentSheet
              )}

              {renderVerificationStep(
                "Stripe Verification",
                "Complete Stripe onboarding",
                "shield-checkmark-outline",
                false,
                handleStartStripeVerification,
                true
              )}
            </View>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#2196F3" />
            <Text style={styles.infoText}>
              Verification helps ensure a safe and trusted marketplace for all users. Your information is securely stored and protected.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
  },
  placeholder: {
    width: 44,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    width: CARD_WIDTH,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
    lineHeight: 20,
  },
  stepsContainer: {
    marginTop: 8,
  },
  verificationStep: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },
  stepWithBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  stepIconContainer: {
    alignItems: "center",
    marginRight: 16,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  stepIconCompleted: {
    backgroundColor: "#4CAF50",
  },
  stepConnector: {
    width: 2,
    height: 32,
    backgroundColor: "#f0f0f0",
    position: "absolute",
    top: 48,
    left: 19,
  },
  stepConnectorCompleted: {
    backgroundColor: "#4CAF50",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  stepStatus: {
    marginLeft: 12,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#1976D2",
    marginLeft: 12,
    lineHeight: 20,
  },
});
