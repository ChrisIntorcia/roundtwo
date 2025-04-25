import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { auth } from "../firebaseConfig"; // ✅ use the persistent instance
import { signOut } from "firebase/auth";  // ✅ keep this to use signOut()
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { AppContext } from "../context/AppContext";
import SellerHub from "./SellerHub";


const db = getFirestore();

const AccountScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { isSeller } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState("account");
  const [username, setUsername] = useState("User");

  useEffect(() => {
    if (route.params?.screen === "SellerHub") {
      setActiveTab("sellerHub");
    }
  }, [route.params]);

  useEffect(() => {
    const fetchUsername = async () => {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUsername(userSnap.data().username || "User");
        }
      }
    };

    fetchUsername();
  }, []);

  const handleLogout = () => {
    signOut(auth)
      .then(() => navigation.replace("Login"))
      .catch((error) => console.error("Logout failed:", error));
  };

  return (
    <View style={styles.container}>
      {/* Top spacer for status bar */}
      <View style={{ height: Platform.OS === "android" ? StatusBar.currentHeight : 50 }} />

      {/* Profile header */}
      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={() => navigation.navigate("ProfileScreen")}>
          <Text style={styles.username}>{username} ▼</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate("ProfileScreen")}
        >
          <Text style={styles.profileButtonText}>View Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {isSeller && (
          <TouchableOpacity
            style={[styles.tab, activeTab === "sellerHub" && styles.activeTab]}
            onPress={() => setActiveTab("sellerHub")}
          >
            <Text style={[styles.tabText, activeTab === "sellerHub" && styles.activeTabText]}>
              Seller Hub
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.tab, activeTab === "account" && styles.activeTab]}
          onPress={() => setActiveTab("account")}
        >
          <Text style={[styles.tabText, activeTab === "account" && styles.activeTabText]}>
            Account
          </Text>
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
            <TouchableOpacity
              style={styles.option}
              onPress={() => navigation.navigate("InboxScreen")}
            >
              <Text style={styles.optionText}>Messages</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.option}
              onPress={() => navigation.navigate("PaymentsShipping")}
            >
              <Text style={styles.optionText}>Payments & Shipping</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.option}
              onPress={() => navigation.navigate("AddressesScreen")}
            >
              <Text style={styles.optionText}>Addresses</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.option}
              onPress={() => navigation.navigate("Notifications")}
            >
              <Text style={styles.optionText}>Notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.option}
              onPress={() => navigation.navigate("ChangeEmail")}
            >
              <Text style={styles.optionText}>Change Email</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.option}
              onPress={() => navigation.navigate("ChangePassword")}
            >
              <Text style={styles.optionText}>Change Password</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.option, styles.logout]} onPress={handleLogout}>
              <Text style={[styles.optionText, styles.logoutText]}>Logout</Text>
            </TouchableOpacity>
          </>
        ) : isSeller ? (
          <SellerHub />
        ) : (
          <View style={styles.notSellerContainer}>
            <Text style={styles.notSellerText}>
              Seller tools are only available once you complete seller registration.
            </Text>
            <TouchableOpacity
              style={styles.becomeSellerButton}
              onPress={() => navigation.navigate("SellerDetailsScreen")}
            >
              <Text style={styles.becomeSellerText}>Become a Seller</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  profileHeader: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  username: {
    fontSize: 18,
    color: "#000",
  },
  profileButton: {
    backgroundColor: "#eee",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  profileButtonText: {
    color: "#000",
    fontSize: 14,
  },
  tabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
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
    color: "#666",
    fontSize: 16,
  },
  activeTabText: {
    color: "#000",
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  cardTitle: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
  },
  cardBalance: {
    color: "#000",
    marginTop: 5,
  },
  cardSubtitle: {
    color: "#666",
    marginTop: 5,
  },
  option: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  optionText: {
    color: "#000",
    fontSize: 16,
  },
  logout: {
    marginTop: 20,
  },
  logoutText: {
    color: "red",
    fontWeight: "bold",
  },
  notSellerContainer: {
    padding: 20,
    alignItems: "center",
  },
  notSellerText: {
    color: "#000",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  becomeSellerButton: {
    backgroundColor: "#FFD700",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  becomeSellerText: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#000",
  },
});

export default AccountScreen;