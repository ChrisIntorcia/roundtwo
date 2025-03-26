import React from "react";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import SellerHub from "./SellerHub";
import AccountScreen from "./AccountScreen";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { getAuth } from "firebase/auth";

const Tab = createMaterialTopTabNavigator();

const SellerAccountTabs = ({ navigation, route }) => {
  const auth = getAuth();
  const user = auth.currentUser;
  const initialTab = route.params?.screen === "SellerHub" ? "Seller Hub" : "Account";

  return (
    <View style={{ flex: 1, backgroundColor: "#121212" }}>
      {/* Fixed Header */}
      <View style={styles.profileHeader}>
        <Text style={styles.headerTitle}>Seller Hub</Text>
        <TouchableOpacity onPress={() => navigation.navigate("ProfileScreen")}>
          <Text style={styles.username}>{user?.displayName || "User"} ▼</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate("ProfileScreen")}
        >
          <Text style={styles.profileButtonText}>View Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Swipeable Tabs */}
      <Tab.Navigator
        initialRouteName={initialTab}
        screenOptions={{
          tabBarStyle: { backgroundColor: "#121212" },
          tabBarIndicatorStyle: { backgroundColor: "#FFF", height: 2 },
          tabBarLabelStyle: { fontSize: 16, fontWeight: "bold" },
          tabBarActiveTintColor: "#FFF",
          tabBarInactiveTintColor: "#888",
        }}
      >
        <Tab.Screen name="Seller Hub" component={SellerHub} />
        <Tab.Screen name="Account" component={AccountScreen} />
      </Tab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  profileHeader: {
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#121212",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
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
});

export default SellerAccountTabs;
