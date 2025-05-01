import React, { useState, useRef, useEffect } from "react";
import {
  TextInput,
  Button,
  Text,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Platform
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { signUp, login, signInWithApple } from "../authService";
import { getFriendlyError } from "../utils/authUtils";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig";
import Checkbox from "expo-checkbox"; // ✅ add this if you don't already have it installed

const SignupScreen = ({ navigation }) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false); // ✅ new checkbox state
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigation.reset({
          index: 0,
          routes: [{ name: "MainApp" }],
        });
      }
    });
    return unsubscribe;
  }, []);

  const handleAppleSignIn = async () => {
    try {
      await signInWithApple();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSignup = async () => {
    if (loading) return;
    if (!agreed) {
      setError("You must agree to the Terms of Use and Privacy Policy.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signUp(email.trim(), password, fullName);
      await login(email.trim(), password);
    } catch (err) {
      setError(getFriendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAwareScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
      >
        <Text style={styles.title}>Sign Up</Text>

        {Platform.OS === "ios" && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={32}
            style={styles.appleButton}
            onPress={handleAppleSignIn}
          />
        )}

        <Text style={styles.orText}>Or via Email</Text>

        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={fullName}
          onChangeText={setFullName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {/* ✅ Terms and Conditions Agreement */}
        <View style={styles.checkboxContainer}>
          <Checkbox
            value={agreed}
            onValueChange={setAgreed}
            color={agreed ? "#E76A54" : undefined}
          />
          <Text style={styles.checkboxLabel}>
            I agree to the{" "}
            <Text
              style={styles.linkText}
              onPress={() => navigation.navigate("TermsOfUse")} // assume you have TermsOfUse screen or link it to a WebView/modal
            >
              Terms of Use
            </Text>{" "}
            and{" "}
            <Text
              style={styles.linkText}
              onPress={() => navigation.navigate("PrivacyPolicy")} // same for Privacy Policy
            >
              Privacy Policy
            </Text>.
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity onPress={handleSignup} style={styles.signupButton} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.signupText}>Sign up</Text>}
        </TouchableOpacity>

        <Text style={styles.link} onPress={() => navigation.replace("Login")}>
          Already have an account? <Text style={styles.linkBold}>Login</Text>
        </Text>
      </KeyboardAwareScrollView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 16 },
  input: { borderWidth: 1, borderColor: "#ccc", marginBottom: 16, padding: 12, borderRadius: 12 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 24, textAlign: "center" },
  error: { color: "red", marginBottom: 12, textAlign: "center" },
  link: { color: "#000", marginTop: 16, textAlign: "center" },
  linkBold: { color: "blue", fontWeight: "500" },
  orText: { textAlign: "center", marginVertical: 20, color: "#999" },
  appleButton: { width: "100%", height: 44, marginTop: 12 },
  signupButton: { backgroundColor: "#E76A54", padding: 14, borderRadius: 32, alignItems: "center", marginTop: 16 },
  signupText: { color: "#fff", fontWeight: "bold" },
  checkboxContainer: { flexDirection: "row", alignItems: "center", marginVertical: 12 },
  checkboxLabel: { flex: 1, marginLeft: 8, color: "#555" },
  linkText: { color: "#007f6b", textDecorationLine: "underline" }, // brand color for links
});

export default SignupScreen;
