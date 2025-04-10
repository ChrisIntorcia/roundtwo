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
import { auth } from "../../firebaseConfig";
import { doc, getDoc, getFirestore, updateDoc } from "firebase/firestore";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

const PayoutScreen = () => {
  const [balance, setBalance] = useState({ available: 0, pending: 0 });
  const [stripeVerified, setStripeVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
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
            let isVerified = data.stripeVerified || false;
      
            // 🟡 Double-check with Stripe if not marked verified
            if (!isVerified) {
              const verifyRes = await fetch('https://us-central1-roundtwo-cc793.cloudfunctions.net/checkStripeVerified', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: user.uid }),
              });
            
              const { verified } = await verifyRes.json();
            
              if (verified) {
                await updateDoc(userRef, { stripeVerified: true });
                isVerified = true;
              }
            }
            
            setStripeVerified(isVerified);
            
            // ✅ Now fetch balance if verified
            if (isVerified) {
              const res = await fetch('https://us-central1-roundtwo-cc793.cloudfunctions.net/getStripeBalance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: user.uid }),
              });
            
              if (res.ok) {
                const result = await res.json();
                setBalance({
                  available: result.available / 100,
                  pending: result.pending / 100,
                });
              } else {
                const text = await res.text();
                console.error("❌ getStripeBalance failed:", text);
                setErrorMsg("Failed to fetch Stripe balance. Please try again.");
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
  <>
    <View style={styles.balanceCard}>
      <Text style={styles.balanceLabel}>Account Balance</Text>
      <Text style={styles.balanceAmount}>
        ${(balance.available + balance.pending).toFixed(2)}
      </Text>
      <Text style={styles.detailText}>
        Estimated payout: {new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toDateString()}
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

    <TouchableOpacity
      onPress={async () => {
        const user = auth.currentUser;
        if (!user) return;

        try {
          const res = await fetch(
            "https://us-central1-roundtwo-cc793.cloudfunctions.net/createInstantPayout",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ uid: user.uid }),
            }
          );

          const data = await res.json();
          if (res.ok) {
            Alert.alert("✅ Payout Started", "Funds are being transferred to your bank.");
          } else {
            Alert.alert("Error", data.error || "Failed to create payout.");
          }
        } catch (err) {
          console.error("❌ Withdraw error:", err.message);
          Alert.alert("Withdraw Error", err.message);
        }
      }}
      style={[styles.verifyButton, { backgroundColor: "#4EA1F3" }]}
    >
      <Text style={[styles.verifyText, { color: "#fff" }]}>Withdraw Now</Text>
    </TouchableOpacity>
  </>
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
    backgroundColor: "#FFFFFF",
    flexGrow: 1,
  },
  title: {
    color: "#000",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  tabs: {
    flexDirection: "row",
    marginBottom: 20,
  },
  tab: {
    color: "#888",
    fontSize: 16,
    marginRight: 20,
  },
  activeTab: {
    color: "#000",
    borderBottomWidth: 2,
    borderBottomColor: "#000",
  },
  balanceCard: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  balanceLabel: {
    color: "#666",
    fontSize: 14,
  },
  balanceAmount: {
    fontSize: 28,
    color: "#000",
    fontWeight: "bold",
    marginVertical: 10,
  },
  detailsRow: {
    marginTop: 10,
  },
  detailText: {
    color: "#444",
    marginBottom: 5,
  },
  linkButton: {
    backgroundColor: "#EAEAEA", // lighter button
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 30,
    alignItems: "center",
  },
  linkButtonText: {
    color: "#007AFF", // bright blue, iOS-style
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
    color: "#000", // black text on gold
  },  
});

export default PayoutScreen;