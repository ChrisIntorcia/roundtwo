import React, { useContext, useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { getAuth, signOut } from "firebase/auth";
import { AppContext } from "../context/AppContext";
import SellerHub from "./SellerHub";

const AccountScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { isSeller } = useContext(AppContext);
  const auth = getAuth();
  const [activeTab, setActiveTab] = useState("account");

  useEffect(() => {
    if (route.params?.screen === "SellerHub") {
      setActiveTab("sellerHub");
    }
  }, [route.params]);

  const handleLogout = () => {
    signOut(auth)
      .then(() => navigation.replace("Login"))
      .catch((error) => console.error("Logout failed:", error));
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={() => navigation.navigate("ProfileScreen")}>
          <Text style={styles.username}>mtb1162 ▼</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate("ProfileScreen")}
        >
          <Text style={styles.profileButtonText}>View Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "sellerHub" && styles.activeTab]}
          onPress={() => setActiveTab("sellerHub")}
        >
          <Text style={[styles.tabText, activeTab === "sellerHub" && styles.activeTabText]}>Seller Hub</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "account" && styles.activeTab]}
          onPress={() => setActiveTab("account")}
        >
          <Text style={[styles.tabText, activeTab === "account" && styles.activeTabText]}>Account</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === "account" ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Referrals & Credits</Text>
              <Text style={styles.cardBalance}>
                Balance: <Text style={{ color: "green" }}>$0.00</Text>
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>My Rewards</Text>
              <Text style={styles.cardSubtitle}>View Coupons</Text>
            </View>
            <TouchableOpacity style={styles.option}>
              <Text style={styles.optionText}>Affiliate Program: Earn Cash</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.option}>
              <Text style={styles.optionText}>Payments & Shipping</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.option}>
              <Text style={styles.optionText}>Addresses</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.option}>
              <Text style={styles.optionText}>Verified Buyer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.option}>
              <Text style={styles.optionText}>Notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.option}>
              <Text style={styles.optionText}>Change Email</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.option}>
              <Text style={styles.optionText}>Change Password</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.option, styles.logout]} onPress={handleLogout}>
              <Text style={[styles.optionText, styles.logoutText]}>Logout</Text>
            </TouchableOpacity>
          </>
        ) : (
          <SellerHub />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  profileHeader: {
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  username: {
    fontSize: 18,
    color: "white",
  },
  profileButton: {
    backgroundColor: "#2A2A2A",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  profileButtonText: {
    color: "white",
    fontSize: 14,
  },
  tabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  tab: {
    paddingVertical: 12,
    flex: 1,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#FFF",
  },
  tabText: {
    color: "#888",
    fontSize: 16,
  },
  activeTabText: {
    color: "white",
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: "#1E1E1E",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  cardTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  cardBalance: {
    color: "white",
    marginTop: 5,
  },
  cardSubtitle: {
    color: "#888",
    marginTop: 5,
  },
  option: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  optionText: {
    color: "white",
    fontSize: 16,
  },
  logout: {
    marginTop: 20,
  },
  logoutText: {
    color: "red",
    fontWeight: "bold",
  },
});

export default AccountScreen;
