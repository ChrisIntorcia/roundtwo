import React, { useContext, useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { AppContext } from "../context/AppContext";

const SellerHub = ({ navigation }) => {
  const { isSeller } = useContext(AppContext);
  const [userInfo, setUserInfo] = useState(null);
  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserInfo({
            username: userDoc.data().username || "Seller",
          });
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };

    fetchUserInfo();
  }, []);

  return (
    <View style={styles.container}>
      {/* Content Section */}
      <ScrollView contentContainerStyle={styles.content}>
        {/* Grid Items */}
        <View style={styles.gridContainer}>
          <TouchableOpacity style={styles.gridItem}>
            <Text style={styles.gridText}>Inventory</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem}>
            <Text style={styles.gridText}>Payouts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem}>
            <Text style={styles.gridText}>Orders</Text>
          </TouchableOpacity>
        </View>

        {/* List Items */}
        <TouchableOpacity style={styles.option}>
          <Text style={styles.optionText}>Affiliate Program: Earn Cash</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.option}>
          <Text style={styles.optionText}>Offers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.option}>
          <Text style={styles.optionText}>Premier Shop</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.option}>
          <Text style={styles.optionText}>Shipping</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.option}>
          <Text style={styles.optionText}>Seller Status</Text>
        </TouchableOpacity>

        {/* Adding extra margin to the bottom */}
        <View style={styles.lastOption}></View>
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
  activeTabText: {
    color: "white",
    fontWeight: "bold",
  },
  content: {
    padding: 0,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridItem: {
    width: "48%",
    height: 80,
    backgroundColor: "#1E1E1E",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginBottom: 10,
  },
  gridText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
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
  lastOption: {
    marginBottom: 30,  // Adding extra space at the bottom
  },
});

export default SellerHub;
