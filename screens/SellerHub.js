import React, { useContext, useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { AppContext } from "../context/AppContext";
import { useNavigation } from "@react-navigation/native"; 

const SellerHub = () => {
  const navigation = useNavigation();
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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.gridContainer}>
          <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Inventory')}>
            <Text style={styles.gridText}>Inventory</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('PayoutScreen')}>
            <Text style={styles.gridText}>Payouts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem}>
            <Text style={styles.gridText}>Orders</Text>
          </TouchableOpacity>
        </View>

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

        <View style={styles.lastOption}></View>
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
    padding: 20,
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
  activeTabText: {
    color: "#000",
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
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginBottom: 10,
  },
  gridText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
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
  lastOption: {
    marginBottom: 30,
  },
});

export default SellerHub;