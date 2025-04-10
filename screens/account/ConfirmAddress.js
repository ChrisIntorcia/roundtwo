import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useRoute, useNavigation } from "@react-navigation/native";
import { auth } from "../../firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

export default function ConfirmAddress() {
  const route = useRoute();
  const navigation = useNavigation();
  const { address } = route.params;

  const [form, setForm] = useState({
    fullName: "",
    street: address.street || address.formatted || "",
    city: address.city || "",
    state: address.state || "",
    zip: address.zip || "",
    country: address.country || "",
  });

  const handleChange = (field, value) => setForm({ ...form, [field]: value });

  const handleConfirm = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          shippingAddress: { ...form },
        },
        { merge: true }
      );
      navigation.replace("AddressesScreen");
    } catch (err) {
      console.error("Failed to save address", err);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          extraScrollHeight={20}
        >
          <Text style={styles.header}>Confirm Address</Text>
          <MapView
            style={styles.map}
            region={{
              latitude: address?.location?.lat || 40.7128,
              longitude: address?.location?.lng || -74.006,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            <Marker
              coordinate={{
                latitude: address?.location?.lat || 40.7128,
                longitude: address?.location?.lng || -74.006,
              }}
            />
          </MapView>

          <TextInput
            placeholder="Full Name"
            style={styles.input}
            placeholderTextColor="#888"
            value={form.fullName}
            onChangeText={(text) => handleChange("fullName", text)}
          />
          <TextInput
            placeholder="Address"
            style={styles.input}
            placeholderTextColor="#888"
            value={form.street}
            onChangeText={(text) => handleChange("street", text)}
          />
          <TextInput
            placeholder="City"
            style={styles.input}
            placeholderTextColor="#888"
            value={form.city}
            onChangeText={(text) => handleChange("city", text)}
          />
          <View style={styles.row}>
            <TextInput
              placeholder="State"
              style={[styles.input, { flex: 1, marginRight: 10 }]}
              placeholderTextColor="#888"
              value={form.state}
              onChangeText={(text) => handleChange("state", text)}
            />
            <TextInput
              placeholder="Postal Code"
              style={[styles.input, { flex: 1 }]}
              placeholderTextColor="#888"
              value={form.zip}
              onChangeText={(text) => handleChange("zip", text)}
            />
          </View>
          <TextInput
            placeholder="Country"
            style={styles.input}
            placeholderTextColor="#888"
            value={form.country}
            onChangeText={(text) => handleChange("country", text)}
          />

          <TouchableOpacity style={styles.button} onPress={handleConfirm}>
            <Text style={styles.buttonText}>Confirm Address</Text>
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#fff",
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 10,
  },
  map: {
    height: 180,
    width: "100%",
    borderRadius: 12,
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#f1f1f1",
    color: "#000",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    backgroundColor: "#FFD700",
    padding: 15,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#000",
  },
});

