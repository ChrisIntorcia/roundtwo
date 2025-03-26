import React, { useContext, useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, Button, Alert } from "react-native";
import { AppContext } from "../context/AppContext";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";
import { auth } from "../firebaseConfig"; // ✅ Correctly imported auth instance

const SellerDetailsScreen = ({ navigation }) => {
  const { becomeSeller } = useContext(AppContext);
  const [ranchName, setRanchName] = useState("");
  const [ranchLocation, setRanchLocation] = useState("");
  const db = getFirestore(); // ✅ Firestore instance

  useEffect(() => {
    const user = auth.currentUser;
    console.log("SellerDetailsScreen loaded for user:", user ? user.uid : "No authenticated user");

    if (!user) {
      Alert.alert("Error", "Unauthorized access.");
      navigation.navigate("MainApp", { screen: "Home" });
    }
  }, []);

  const handleSubmit = async () => {
    if (ranchName.trim() === "" || ranchLocation.trim() === "") {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "User not authenticated.");
        return;
      }

      const userRef = doc(collection(db, "users"), user.uid);
      const sellerRef = doc(collection(db, "sellers"), user.uid);

      console.log("Updating Firestore user document with:", {
        ranchName,
        ranchLocation,
        isSeller: true,
      });

      await setDoc(userRef, { ranchName, ranchLocation, isSeller: true }, { merge: true });
      await setDoc(sellerRef, { uid: user.uid, email: user.email, ranchName, ranchLocation }, { merge: true });

      console.log("User successfully added to sellers collection.");

      becomeSeller(ranchName, ranchLocation);
      Alert.alert("Success", "Your seller details have been saved!");
      navigation.navigate("MainApp", { screen: "Home" });
    } catch (error) {
      console.error("Error saving seller details:", error);
      Alert.alert("Error", "Failed to save your details. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Seller Details</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Ranch Name:</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Ranch Name"
          value={ranchName}
          onChangeText={setRanchName}
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Ranch Location:</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Ranch Location"
          value={ranchLocation}
          onChangeText={setRanchLocation}
        />
      </View>
      <Button title="Submit" onPress={handleSubmit} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "white",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
  },
});

export default SellerDetailsScreen;
