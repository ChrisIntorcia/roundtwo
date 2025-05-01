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
  SafeAreaView,
  Dimensions,
} from "react-native";
import { auth } from "../../firebaseConfig";
import { doc, getDoc, getFirestore, updateDoc } from "firebase/firestore";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

const PayoutScreen = () => {
  const [balance, setBalance] = useState({ available: 0, pending: 0 });
  const [stripeVerified, setStripeVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [paymentMethodSaved, setPaymentMethodSaved] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const db = getFirestore();
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      const urlListener = ({ url }) => {
        if (url && url.includes("onboarding-success")) {
          Alert.alert("🎉 Success!", "Your Stripe account is now verified and ready for payouts.", [
            { text: "Great!", style: "default" }
          ]);
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
        setErrorMsg(null);
        try {
          const user = auth.currentUser;
          if (!user) return;
      
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
      
          if (userSnap.exists()) {
            const data = userSnap.data();
            let isVerified = data.stripeVerified || false;
            setPhoneVerified(data.phoneVerified || false);
            setPaymentMethodSaved(data.hasSavedPaymentMethod || false);
      
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
                throw new Error("Failed to fetch balance");
              }
            }            
          }
        } catch (err) {
          console.error("❌ Stripe Fetch Error:", err.message);
          setErrorMsg("Unable to load payout info. Please try again.");
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

  const handleWithdraw = async () => {
    if (isWithdrawing || balance.available <= 0) return;
    
    setIsWithdrawing(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in");

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
        Alert.alert(
          "✅ Payout Initiated", 
          "Your funds are being transferred to your bank account.",
          [{ text: "OK", style: "default" }]
        );
      } else {
        throw new Error(data.error || "Failed to create payout");
      }
    } catch (err) {
      console.error("❌ Withdraw error:", err.message);
      Alert.alert("Error", "Failed to process withdrawal. Please try again.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleStripeDashboard = () => {
    Linking.openURL("https://dashboard.stripe.com/express");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E76A54" />
        <Text style={styles.loadingText}>Loading your payout information...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payouts</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {stripeVerified ? (
          <>
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <TouchableOpacity 
                  style={styles.refreshButton}
                  onPress={() => navigation.setParams({ refresh: Date.now() })}
                >
                  <Ionicons name="refresh" size={20} color="#666" />
                </TouchableOpacity>
              </View>
              <Text style={styles.balanceAmount}>
                ${(balance.available + balance.pending).toFixed(2)}
              </Text>
              
              <View style={styles.balanceDetails}>
                <View style={styles.balanceRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.balanceText}>
                    ${balance.available.toFixed(2)} available now
                  </Text>
                </View>
                <View style={styles.balanceRow}>
                  <Ionicons name="time" size={20} color="#FFA000" />
                  <Text style={styles.balanceText}>
                    ${balance.pending.toFixed(2)} pending
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.withdrawButton,
                  (balance.available <= 0 || isWithdrawing) && styles.withdrawButtonDisabled
                ]}
                onPress={handleWithdraw}
                disabled={balance.available <= 0 || isWithdrawing}
              >
                {isWithdrawing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="cash-outline" size={20} color="#fff" style={styles.buttonIcon} />
                    <Text style={styles.withdrawButtonText}>
                      {balance.available <= 0 ? "No funds to withdraw" : "Withdraw to Bank"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.dashboardButton} 
              onPress={handleStripeDashboard}
            >
              <Ionicons name="stats-chart" size={20} color="#E76A54" style={styles.buttonIcon} />
              <Text style={styles.dashboardButtonText}>View Stripe Dashboard</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.verificationCard}>
            <View style={styles.verificationHeader}>
              <Ionicons name="warning" size={32} color="#FFA000" />
              <Text style={styles.verificationTitle}>Verification Required</Text>
            </View>
            <Text style={styles.verificationText}>
              To receive payments and access your earnings, please complete the verification process.
            </Text>
            <TouchableOpacity 
              style={styles.verifyButton} 
              onPress={handleVerify}
            >
              <Ionicons name="shield-checkmark" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.verifyButtonText}>Complete Verification</Text>
            </TouchableOpacity>
          </View>
        )}

        {errorMsg && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={24} color="#D32F2F" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  balanceCard: {
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
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  refreshButton: {
    padding: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "700",
    color: "#222",
    marginBottom: 16,
  },
  balanceDetails: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  balanceText: {
    fontSize: 15,
    color: "#444",
    marginLeft: 8,
  },
  withdrawButton: {
    backgroundColor: "#E76A54",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  withdrawButtonDisabled: {
    backgroundColor: "#ccc",
  },
  withdrawButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  dashboardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dashboardButtonText: {
    flex: 1,
    fontSize: 16,
    color: "#222",
    marginLeft: 8,
    fontWeight: "500",
  },
  verificationCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  verificationHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  verificationTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
    marginTop: 12,
  },
  verificationText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  verifyButton: {
    backgroundColor: "#E76A54",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  verifyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonIcon: {
    marginRight: 8,
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: "#D32F2F",
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default PayoutScreen;