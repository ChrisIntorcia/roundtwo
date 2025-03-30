import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import {
  getAuth,
  PhoneAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { useNavigation } from "@react-navigation/native";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import firebaseConfig from "../../firebaseConfig";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import DismissKeyboardView from "../../styles/DismissKeyboardView";

const SellerVerificationScreen = () => {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [verificationId, setVerificationId] = useState(null);
  const recaptchaVerifier = useRef(null);
  const auth = getAuth();
  const user = auth.currentUser;
  const navigation = useNavigation();

  const handleSendCode = async () => {
    try {
      const formattedPhone = phone.startsWith("+") ? phone : `+1${phone}`;
      const phoneProvider = new PhoneAuthProvider(auth);
      const id = await phoneProvider.verifyPhoneNumber(
        formattedPhone,
        recaptchaVerifier.current
      );
      setVerificationId(id);
      Alert.alert("✅ Code Sent", `A verification code was sent to ${formattedPhone}`);
    } catch (error) {
      console.error("📲 Error sending code:", error);
      Alert.alert("Error", error.message);
    }
  };

  const handleConfirmCode = async () => {
    try {
      const credential = PhoneAuthProvider.credential(verificationId, code);
      await signInWithCredential(auth, credential);

      if (user) {
        const formattedPhone = phone.startsWith("+") ? phone : `+1${phone}`;
        const userRef = doc(getFirestore(), "users", user.uid);
        await setDoc(
          userRef,
          { phoneVerified: true, phoneNumber: formattedPhone },
          { merge: true }
        );
      }

      Alert.alert("🎉 You're verified!", "Phone number confirmed.");
      navigation.goBack();
    } catch (error) {
      console.error("📵 Error confirming code:", error);
      Alert.alert("Error", error.message);
    }
  };

  return (
    <DismissKeyboardView>
      <View style={styles.container}>
        <FirebaseRecaptchaVerifierModal
          ref={recaptchaVerifier}
          firebaseConfig={firebaseConfig}
          attemptInvisibleVerification={true}
        />

        <Text style={styles.title}>Complete Seller Verification</Text>
        <Text style={styles.description}>
          To sell on the platform, please verify your phone number.
        </Text>

        <Text style={styles.label}>📱 Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 5555555555"
          placeholderTextColor="#888"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        <TouchableOpacity style={styles.buttonAlt} onPress={handleSendCode}>
          <Text style={styles.buttonText}>Send Verification Code</Text>
        </TouchableOpacity>

        <Text style={styles.label}>🔒 Verification Code</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter the code"
          placeholderTextColor="#888"
          keyboardType="number-pad"
          value={code}
          onChangeText={setCode}
        />
        <TouchableOpacity style={styles.buttonAlt} onPress={handleConfirmCode}>
          <Text style={styles.buttonText}>Confirm Code</Text>
        </TouchableOpacity>
      </View>
    </DismissKeyboardView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#121212",
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  title: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  description: {
    color: "#ccc",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
  },
  label: {
    color: "#aaa",
    marginBottom: 8,
    fontSize: 16,
  },
  input: {
    backgroundColor: "#1E1E1E",
    color: "white",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderColor: "#333",
    borderWidth: 1,
  },
  buttonAlt: {
    backgroundColor: "#4EA1F3",
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 10,
    marginBottom: 10,
  },
  buttonText: {
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default SellerVerificationScreen;
