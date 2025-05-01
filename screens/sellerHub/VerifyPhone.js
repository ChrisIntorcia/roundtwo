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
  SafeAreaView,
  Dimensions,
} from "react-native";
import { auth, db, firebaseConfig } from "../../firebaseConfig";
import { PhoneAuthProvider, linkWithCredential } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

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
      Alert.alert("Code Sent!", "Please check your messages for the verification code.");
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

      Alert.alert("Success", "Your phone number has been verified!", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert("Error Confirming Code", error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={[styles.step, step === 1 && styles.activeStep]}>
        <Text style={[styles.stepNumber, step === 1 && styles.activeStepNumber]}>1</Text>
      </View>
      <View style={[styles.stepConnector, step === 2 && styles.completedConnector]} />
      <View style={[styles.step, step === 2 && styles.activeStep]}>
        <Text style={[styles.stepNumber, step === 2 && styles.activeStepNumber]}>2</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="chevron-back" size={28} color="#222" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Verify Phone</Text>
              <View style={styles.placeholder} />
            </View>

            <FirebaseRecaptchaVerifierModal
              ref={recaptchaVerifier}
              firebaseConfig={firebaseConfig}
              attemptInvisibleVerification={true}
            />

            <View style={styles.card}>
              {renderStepIndicator()}

              <Text style={styles.stepTitle}>
                {step === 1 ? "Enter Phone Number" : "Enter Verification Code"}
              </Text>
              <Text style={styles.stepDescription}>
                {step === 1 
                  ? "Enter your US phone number to receive a verification code."
                  : "Enter the 6-digit code sent to your phone."
                }
              </Text>

              {step === 1 ? (
                <View style={styles.phoneInputContainer}>
                  <View style={styles.prefixContainer}>
                    <Text style={styles.prefix}>+1</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="555-555-5555"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={handlePhoneChange}
                    maxLength={12}
                  />
                </View>
              ) : (
                <TextInput
                  style={styles.codeInput}
                  placeholder="Enter 6-digit code"
                  keyboardType="number-pad"
                  value={code}
                  onChangeText={setCode}
                  maxLength={6}
                />
              )}

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={step === 1 ? sendCode : confirmCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>
                      {step === 1 ? "Send Code" : "Verify Code"}
                    </Text>
                    <Ionicons 
                      name={step === 1 ? "arrow-forward" : "checkmark"} 
                      size={20} 
                      color="#fff" 
                      style={styles.buttonIcon}
                    />
                  </>
                )}
              </TouchableOpacity>

              {step === 2 && (
                <TouchableOpacity 
                  style={styles.resendButton} 
                  onPress={() => {
                    setStep(1);
                    setCode("");
                  }}
                >
                  <Text style={styles.resendText}>Didn't receive the code?</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
  },
  placeholder: {
    width: 44,
  },
  card: {
    margin: 16,
    padding: 24,
    backgroundColor: "#fff",
    borderRadius: 16,
    width: CARD_WIDTH,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  step: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  activeStep: {
    backgroundColor: "#E76A54",
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  activeStepNumber: {
    color: "#fff",
  },
  stepConnector: {
    width: 40,
    height: 2,
    backgroundColor: "#f0f0f0",
    marginHorizontal: 8,
  },
  completedConnector: {
    backgroundColor: "#E76A54",
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#222",
    marginBottom: 8,
    textAlign: "center",
  },
  stepDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 20,
  },
  phoneInputContainer: {
    flexDirection: "row",
    marginBottom: 24,
  },
  prefixContainer: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginRight: 8,
    justifyContent: "center",
  },
  prefix: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
  },
  phoneInput: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#222",
  },
  codeInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#222",
    marginBottom: 24,
    textAlign: "center",
    letterSpacing: 4,
  },
  button: {
    backgroundColor: "#E76A54",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    backgroundColor: "#ffaa99",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonIcon: {
    marginLeft: 8,
  },
  resendButton: {
    marginTop: 16,
    alignItems: "center",
  },
  resendText: {
    color: "#E76A54",
    fontSize: 14,
    fontWeight: "500",
  },
});
