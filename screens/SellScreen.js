import React, { useContext } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { AppContext } from "../context/AppContext";

const SellerHubScreen = ({ navigation }) => {
  const { isSeller } = useContext(AppContext);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to the Seller Hub</Text>
      <Text style={styles.description}>
        Here, you can manage your products, schedule live shows, and access seller resources.
      </Text>

      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => navigation.navigate("CreateProduct")}
      >
        <Text style={styles.optionButtonText}>Create a Product</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => navigation.navigate("ScheduleShowScreen")}
      >
        <Text style={styles.optionButtonText}>Schedule a Show</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => navigation.navigate("SellerAnalyticsScreen")}
      >
        <Text style={styles.optionButtonText}>View Analytics</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 10, textAlign: "center" },
  description: { fontSize: 16, textAlign: "center", marginBottom: 20 },
  optionButton: {
    backgroundColor: "green",
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    width: "80%",
    alignItems: "center",
  },
  optionButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },
});

export default SellerHubScreen;
