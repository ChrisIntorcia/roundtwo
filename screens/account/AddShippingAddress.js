// AddShippingAddress.js
import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { getAuth } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";

const GOOGLE_API_KEY = "AIzaSyDTHHIofdLua_s5TZIWzBvtfiv75oaWm1w"; // Replace with env var in prod

const AddShippingAddress = () => {
  const navigation = useNavigation();
  const auth = getAuth();
  const ref = useRef();

  const handleAddressSelect = async (data, details) => {
    const address = {
      formatted: details.formatted_address,
      street: details.address_components?.[0]?.long_name || "",
      city: details.address_components?.find(c => c.types.includes("locality"))?.long_name || "",
      state: details.address_components?.find(c => c.types.includes("administrative_area_level_1"))?.short_name || "",
      zip: details.address_components?.find(c => c.types.includes("postal_code"))?.long_name || "",
      country: details.address_components?.find(c => c.types.includes("country"))?.long_name || "",
    };

    navigation.navigate("ConfirmAddress", { address });
  };

  const handleShareLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission denied", "Enable location permissions to continue.");
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    const [geo] = await Location.reverseGeocodeAsync(location.coords);

    if (geo && ref.current) {
      const composedAddress = `${geo.name} ${geo.street}, ${geo.city}, ${geo.region} ${geo.postalCode}`;
      ref.current.setAddressText(composedAddress);

      const address = {
        formatted: composedAddress,
        street: `${geo.name} ${geo.street}`,
        city: geo.city,
        state: geo.region,
        zip: geo.postalCode,
        country: geo.country,
      };

      navigation.navigate("ConfirmAddress", { address });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Text style={styles.title}>Add Shipping Address</Text>

      <GooglePlacesAutocomplete
        ref={ref}
        placeholder="Search for an address"
        fetchDetails={true}
        onPress={handleAddressSelect}
        query={{
          key: GOOGLE_API_KEY,
          language: "en",
          types: "address",
          components: "country:us",
        }}
        enablePoweredByContainer={false}
        debounce={300}
        nearbyPlacesAPI="GooglePlacesSearch"
        styles={{
          textInput: styles.input,
          listView: styles.list,
        }}
        renderRow={(rowData) => (
          <View style={styles.resultRow}>
            <Ionicons name="location-outline" size={18} color="#555" style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 14 }}>{rowData.description}</Text>
          </View>
        )}
      />

      <TouchableOpacity
        style={styles.manualEntry}
        onPress={() => Alert.alert("Coming Soon", "Manual entry coming soon")}
      >
        <Text style={{ color: "#3366cc" }}>Add your address manually</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.shareLocationButton}
        onPress={handleShareLocation}
      >
        <Text style={styles.shareLocationText}>📩 Share Current Location</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Text style={styles.closeText}>Close</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#eee",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  list: {
    marginTop: 10,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  manualEntry: {
    marginTop: 12,
  },
  shareLocationButton: {
    marginTop: 30,
    backgroundColor: "#007aff",
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: "center",
  },
  shareLocationText: {
    color: "#fff",
    fontWeight: "bold",
  },
  closeButton: {
    marginTop: 40,
    alignItems: "center",
  },
  closeText: {
    color: "red",
    fontWeight: "bold",
  },
});

export default AddShippingAddress;
