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
import { auth } from "../../firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";

const GOOGLE_API_KEY = "AIzaSyDTHHIofdLua_s5TZIWzBvtfiv75oaWm1w"; // Replace with env var in prod

const AddShippingAddress = () => {
  const navigation = useNavigation();
  const ref = useRef();

  const handleAddressSelect = async (data, details) => {
    const components = details.address_components;

    const streetNumber = components.find(c => c.types.includes("street_number"))?.long_name || "";
    const route = components.find(c => c.types.includes("route"))?.long_name || "";
    const city = components.find(c => c.types.includes("locality"))?.long_name || "";
    const state = components.find(c => c.types.includes("administrative_area_level_1"))?.short_name || "";
    const zip = components.find(c => c.types.includes("postal_code"))?.long_name || "";
    const country = components.find(c => c.types.includes("country"))?.long_name || "";

    const street = `${streetNumber} ${route}`.trim();

    const address = {
      formatted: details.formatted_address,
      street,
      city,
      state,
      zip,
      country,
      location: {
        lat: details.geometry.location.lat,
        lng: details.geometry.location.lng,
      },
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

      <View style={styles.content}>
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
          <Text style={styles.manualEntryText}>Add your address manually</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shareLocationButton}
          onPress={handleShareLocation}
        >
          <Text style={styles.shareLocationText}>📩 Share Current Location</Text>
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: "20%",
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
  manualEntryText: {
    color: "#E76A54",
    fontWeight: "600",
    fontSize: 14,
  },
  shareLocationButton: {
    marginTop: 32,
    backgroundColor: "#E76A54",
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 32,
    alignItems: "center",
  },
  shareLocationText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default AddShippingAddress;
