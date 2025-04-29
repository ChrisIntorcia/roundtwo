import React, { useContext, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useStripe } from "@stripe/stripe-react-native";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import { AppContext } from "../../context/AppContext";
import * as WebBrowser from "expo-web-browser";
import CustomHeader from "../../components/CustomHeader";

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

  return (
<SafeAreaView style={styles.container}>
<View style={{ marginTop: -55 }}> 
  <CustomHeader title="Verify Seller" showBack />
  </View>
  {loading ? (
    <>
      <ActivityIndicator size="large" color="#000" style={{ marginTop: 40 }} />
      <Text style={{ textAlign: "center", marginTop: 10 }}>
        Loading verification status...
      </Text>
    </>
  ) : (
    <>
      <Text style={styles.subtext}>
        Complete the steps below to activate selling features.
      </Text>

      <TouchableOpacity style={styles.section} onPress={openVerifyPhone}>
        <Ionicons name="call-outline" size={24} color="#444" style={styles.icon} />
        <View>
          <Text style={styles.sectionTitle}>Verify Phone Number</Text>
          <Text style={styles.sectionSubtitle}>
            {phoneVerified ? "Verified" : "Verify"}
          </Text>
        </View>
        <Ionicons name="create-outline" size={20} color="#444" style={styles.editIcon} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.section} onPress={openPaymentSheet}>
        <Ionicons name="card-outline" size={24} color="#444" style={styles.icon} />
        <View>
          <Text style={styles.sectionTitle}>Add Payment Method</Text>
          <Text style={styles.sectionSubtitle}>
            {paymentMethodVerified ? "Verified" : "Verify"}
          </Text>
        </View>
        <Ionicons name="create-outline" size={20} color="#444" style={styles.editIcon} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.section} onPress={handleStartStripeVerification}>
        <Ionicons name="shield-checkmark-outline" size={24} color="#444" style={styles.icon} />
        <View>
          <Text style={styles.sectionTitle}>Stripe Verification</Text>
          <Text style={styles.sectionSubtitle}>Start Onboarding</Text>
        </View>
        <Ionicons name="create-outline" size={20} color="#444" style={styles.editIcon} />
      </TouchableOpacity>
    </>
  )}
</SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 20 },
  header: { fontSize: 22, fontWeight: "bold", marginTop: 5, marginBottom: 8 },
  subtext: { fontSize: 14, color: "gray", marginTop: 10, marginBottom: 20 },
  section: { flexDirection: "row", alignItems: "center", paddingVertical: 20, borderBottomColor: "#eee", borderBottomWidth: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "bold" },
  sectionSubtitle: { fontSize: 13, color: "gray" },
  icon: { marginRight: 12 },
  editIcon: { marginLeft: "auto" },
});
