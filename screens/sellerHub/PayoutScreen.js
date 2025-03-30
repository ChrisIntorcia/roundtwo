import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  ActivityIndicator,
} from "react-native";
import { getAuth } from "firebase/auth";
import { doc, getDoc, getFirestore, updateDoc } from "firebase/firestore";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

const PayoutScreen = () => {
  const [balance, setBalance] = useState({ available: 0, pending: 0 });
  const [stripeVerified, setStripeVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const auth = getAuth();
  const db = getFirestore();
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      const urlListener = ({ url }) => {
        if (url && url.includes("onboarding-success")) {
          Alert.alert("🎉 You're verified!", "Your Stripe onboarding is complete.");
          setStripeVerified(true);
          const user = auth.currentUser;
          if (user) {
            updateDoc(doc(db, "users", user.uid), {
              stripeVerified: true,
            });
          }
        }
      };

      const sub = Linking.addEventListener("url", urlListener);
      return () => sub.remove();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      const fetchSellerInfo = async () => {
        setLoading(true);
        try {
          const user = auth.currentUser;
          if (!user) return;

          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const data = userSnap.data();
            setPhoneVerified(data.phoneVerified || false);
            setStripeVerified(data.stripeVerified || false);

            if (data.stripeVerified) {
              const res = await fetch(
                "https://us-central1-roundtwo-cc793.cloudfunctions.net/getStripeBalance",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ uid: user.uid }),
                }
              );

              const result = await res.json();

              if (res.ok) {
                setBalance({
                  available: result.available / 100,
                  pending: result.pending / 100,
                });
              } else {
                setErrorMsg(result.error);
              }
            }
          }
        } catch (err) {
          console.error("❌ Stripe Fetch Error:", err.message);
          setErrorMsg("Unable to load payout info. You may need to verify your Stripe account.");
        } finally {
          setLoading(false);
        }
      };

      fetchSellerInfo();
    }, [])
  );

  const handleVerify = () => {
    navigation.navigate("SellerVerificationScreen");
  };

  const handleStripeSetup = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const response = await fetch(
        "https://us-central1-roundtwo-cc793.cloudfunctions.net/createStripeAccountLink",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: user.uid }),
        }
      );

      const data = await response.json();
      if (data?.url) {
        Linking.openURL(data.url);
      } else {
        Alert.alert("Error", "Unable to start Stripe verification.");
      }
    } catch (err) {
      console.error("❌ Stripe Setup Error:", err.message);
      Alert.alert("Error", "Failed to launch Stripe onboarding.");
    }
  };

  const handleStripeDashboard = () => {
    Linking.openURL("https://dashboard.stripe.com/express");
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Finances</Text>

      <View style={styles.tabs}>
        <Text style={[styles.tab, styles.activeTab]}>Payouts</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Transactions")}>
          <Text style={styles.tab}>Transactions</Text>
        </TouchableOpacity>
      </View>

      {stripeVerified && (
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Account Balance</Text>
          <Text style={styles.balanceAmount}>
            ${(balance.available + balance.pending).toFixed(2)}
          </Text>
          <View style={styles.detailsRow}>
            <Text style={styles.detailText}>
              ${balance.available.toFixed(2)} available for withdrawal
            </Text>
            <Text style={styles.detailText}>
              ${balance.pending.toFixed(2)} pending clearance
            </Text>
          </View>
        </View>
      )}

      {errorMsg && (
        <Text style={{ color: "red", marginBottom: 20 }}>{errorMsg}</Text>
      )}

      {!phoneVerified ? (
        <TouchableOpacity onPress={handleVerify} style={styles.verifyButton}>
          <Text style={styles.verifyText}>Complete Seller Verification</Text>
        </TouchableOpacity>
      ) : !stripeVerified ? (
        <TouchableOpacity onPress={handleStripeSetup} style={styles.verifyButton}>
          <Text style={styles.verifyText}>Start Stripe Setup</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.linkButton} onPress={handleStripeDashboard}>
          <Text style={styles.linkButtonText}>Go to Stripe Dashboard</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#121212",
    flexGrow: 1,
  },
  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  tabs: {
    flexDirection: "row",
    marginBottom: 20,
  },
  tab: {
    color: "gray",
    fontSize: 16,
    marginRight: 20,
  },
  activeTab: {
    color: "white",
    borderBottomWidth: 2,
    borderBottomColor: "white",
  },
  balanceCard: {
    backgroundColor: "#1E1E1E",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  balanceLabel: {
    color: "#aaa",
    fontSize: 14,
  },
  balanceAmount: {
    fontSize: 28,
    color: "white",
    fontWeight: "bold",
    marginVertical: 10,
  },
  detailsRow: {
    marginTop: 10,
  },
  detailText: {
    color: "gray",
    marginBottom: 5,
  },
  linkButton: {
    backgroundColor: "#333",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 30,
    alignItems: "center",
  },
  linkButtonText: {
    color: "#4EA1F3",
    fontWeight: "bold",
    fontSize: 16,
  },
  verifyButton: {
    backgroundColor: "#FFD700",
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 20,
    marginBottom: 30,
  },
  verifyText: {
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default PayoutScreen;
