import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { auth, db, firebaseConfig } from "../../firebaseConfig";
import { PhoneAuthProvider, linkWithCredential } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import { useNavigation } from "@react-navigation/native";

export default function VerifyPhone() {
  const navigation = useNavigation();
  const recaptchaVerifier = useRef(null);

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [verificationId, setVerificationId] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const formatPhone = (input) => {
    const cleaned = input.replace(/[^0-9]/g, "");
    const match = cleaned.match(/(\d{0,3})(\d{0,3})(\d{0,4})/);
    if (!match) return "";
    return [match[1], match[2] ? `-${match[2]}` : "", match[3] ? `-${match[3]}` : ""].join("");
  };

  const handlePhoneChange = (text) => {
    setPhone(formatPhone(text));
  };

  const sendCode = async () => {
    const cleaned = phone.replace(/[^0-9]/g, "");
    if (cleaned.length !== 10) {
      Alert.alert("Invalid Number", "Please enter a valid 10-digit US phone number.");
      return;
    }
    setLoading(true);
    try {
      const formattedPhone = `+1${cleaned}`;
      const provider = new PhoneAuthProvider(auth);
      const id = await provider.verifyPhoneNumber(
        formattedPhone,
        recaptchaVerifier.current
      );
      setVerificationId(id);
      setStep(2);
    } catch (error) {
      Alert.alert("Error Sending Code", error.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async () => {
    if (!verificationId) {
      Alert.alert("Error", "Please request a verification code first.");
      return;
    }
    if (code.trim().length === 0) {
      Alert.alert("Error", "Please enter the verification code.");
      return;
    }
    setLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, code.trim());
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert("Error", "You must be logged in to verify your phone number.");
        return;
      }

      const alreadyLinked = currentUser.providerData.some(
        (provider) => provider.providerId === "phone"
      );

      if (!alreadyLinked) {
        await linkWithCredential(currentUser, credential);
      } else {
        console.log("Phone already linked, skipping linkWithCredential.");
      }

      const cleanedPhone = phone.replace(/[^0-9]/g, "");

      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          phoneVerified: true,
          phoneNumber: currentUser.phoneNumber || `+1${cleanedPhone}`,
        },
        { merge: true }
      );

      Alert.alert("Success", "Your phone number has been verified.");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error Confirming Code", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <FirebaseRecaptchaVerifierModal
            ref={recaptchaVerifier}
            firebaseConfig={firebaseConfig}
            attemptInvisibleVerification={true}
          />

          <Text style={styles.header}>Verify Phone</Text>

          {step === 1 && (
            <>
              <Text style={styles.label}>
                US phone numbers only. No need to type +1.
              </Text>
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
              <TouchableOpacity
                style={styles.button}
                onPress={sendCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Send Verification Code</Text>
                )}
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
                maxLength={6}
              />
              <TouchableOpacity
                style={styles.button}
                onPress={confirmCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Confirm Code</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
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
    textAlign: "center",
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
