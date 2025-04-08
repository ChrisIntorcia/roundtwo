import React, { useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { auth, db, firebaseConfig } from "../../firebaseConfig";
import { PhoneAuthProvider, linkWithCredential } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";

export default function VerifyPhone() {
  const navigation = useNavigation();
  const recaptchaVerifier = useRef(null);

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [verificationId, setVerificationId] = useState(null);
  const [step, setStep] = useState(1);

  const formatPhone = (input) => {
    const cleaned = input.replace(/[^0-9]/g, "");
    const match = cleaned.match(/(\d{0,3})(\d{0,3})(\d{0,4})/);
    if (!match) return "";
    return [match[1], match[2] ? `-${match[2]}` : "", match[3] ? `-${match[3]}` : ""].join("");
  };

  const handlePhoneChange = (text) => {
    const digits = text.replace(/[^0-9]/g, "");
    setPhone(formatPhone(digits));
  };

  const sendCode = async () => {
    try {
      const cleaned = phone.replace(/[^0-9]/g, "");
      if (cleaned.length !== 10) {
        Alert.alert("Invalid Number", "Please enter a valid 10-digit US phone number.");
        return;
      }

      const provider = new PhoneAuthProvider(auth);
      const formattedPhone = `+1${cleaned}`;
      const id = await provider.verifyPhoneNumber(formattedPhone, recaptchaVerifier.current);
      setVerificationId(id);
      setStep(2);
    } catch (error) {
      console.error("Verification error:", error);
      Alert.alert("Error", error.message);
    }
  };

  const confirmCode = async () => {
    try {
      const credential = PhoneAuthProvider.credential(verificationId, code);
      const currentUser = auth.currentUser;

      if (!currentUser) {
        Alert.alert("Error", "You must be logged in to verify your phone number.");
        return;
      }

      await linkWithCredential(currentUser, credential);

      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          phoneVerified: true,
          phoneNumber: `+1${phone.replace(/[^0-9]/g, "")}`,
        },
        { merge: true }
      );

      Alert.alert("✅ Success", "Your phone number has been verified.");
      navigation.goBack();
    } catch (error) {
      console.error("Code confirmation error:", error);
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={firebaseConfig}
      />

      <Text style={styles.header}>Verify Phone</Text>

      {step === 1 && (
        <>
          <Text style={styles.label}>US phone numbers only. No need to type +1.</Text>
          <View style={styles.phoneRow}>
            <View style={styles.prefixBox}>
              <Text style={styles.prefix}>+1</Text>
            </View>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="555-555-5555"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={handlePhoneChange}
              maxLength={12}
            />
          </View>
          <TouchableOpacity style={styles.button} onPress={sendCode}>
            <Text style={styles.buttonText}>Send Verification Code</Text>
          </TouchableOpacity>
        </>
      )}

      {step === 2 && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Enter verification code"
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
          />
          <TouchableOpacity style={styles.button} onPress={confirmCode}>
            <Text style={styles.buttonText}>Confirm Code</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "white",
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: "gray",
    marginBottom: 8,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  prefixBox: {
    backgroundColor: "#eee",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  prefix: {
    fontSize: 16,
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "black",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});