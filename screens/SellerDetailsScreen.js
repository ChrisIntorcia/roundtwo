import React, { useContext, useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, Button, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ScrollView } from "react-native";
import { AppContext } from "../context/AppContext";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import CustomHeader from "../components/CustomHeader";

const SellerDetailsScreen = ({ navigation }) => {
  const { becomeSeller } = useContext(AppContext);
  const [vendorName, setRanchName] = useState("");
  const [vendorLocation, setRanchLocation] = useState("");

  useEffect(() => {
    const user = auth.currentUser;
    console.log("SellerDetailsScreen loaded for user:", user ? user.uid : "No authenticated user");

    if (!user) {
      Alert.alert("Error", "Unauthorized access.");
      navigation.navigate("MainApp", { screen: "Home" });
    }
  }, []);

  const handleSubmit = async () => {
    if (vendorName.trim() === "" || vendorLocation.trim() === "") {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "User not authenticated.");
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const sellerRef = doc(db, "sellers", user.uid);

      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();
      const username = userData?.username || user.email.split('@')[0];

      console.log("Updating Firestore user document with:", {
        vendorName,
        vendorLocation,
        isSeller: true,
      });

      await setDoc(userRef, {
        vendorName,
        vendorLocation,
        isSeller: true
      }, { merge: true });

      await setDoc(sellerRef, {
        uid: user.uid,
        email: user.email,
        username,
        vendorName,
        vendorLocation
      }, { merge: true });

      console.log("User successfully added to sellers collection.");
      becomeSeller(vendorName, vendorLocation);
      Alert.alert("Success", "Your seller details have been saved!");
      navigation.navigate("MainApp", { screen: "Home" });
    } catch (error) {
      console.error("Error saving seller details:", error);
      Alert.alert("Error", "Failed to save your details. Please try again.");
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <CustomHeader title="Seller Setup" showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Seller Details</Text>
  
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Vendor Name:</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter Vendor Name"
              value={vendorName}
              onChangeText={(text) =>
                setRanchName(text.replace(/\b\w/g, (c) => c.toUpperCase()))
              }
            />
          </View>
  
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Vendor Location:</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter Vendor Location"
              value={vendorLocation}
              onChangeText={(text) =>
                setRanchLocation(text.replace(/\b\w/g, (c) => c.toUpperCase()))
              }
            />
          </View>
  
          <Button title="Submit" onPress={handleSubmit} />
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
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