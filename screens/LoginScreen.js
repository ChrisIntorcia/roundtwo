import React, { useState } from "react";
import { TextInput, Text, StyleSheet, ActivityIndicator, Platform, TouchableOpacity, TouchableWithoutFeedback, Keyboard, Alert } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { login, signInWithApple, resetPassword } from "../authService";
import { getFriendlyError } from "../utils/authUtils";

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAppleSignIn = async () => {
    try {
      await signInWithApple();
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainApp' }],
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      navigation.reset({
        index: 0,
        routes: [{ name: "MainApp" }],
      });
    } catch (err) {
      switch (err.code) {
        case "auth/wrong-password":
          setError("Incorrect password. Please try again.");
          break;
        case "auth/user-not-found":
          setError("No account found with that email. Please check your email or sign up.");
          break;
        case "auth/invalid-credential":
          setError("Invalid credentials. Please check your email and password.");
          break;
        default:
          setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) return setError("Please enter your email first.");
    try {
      await resetPassword(email);
      Alert.alert("Reset Email Sent", "Check your inbox for the reset link.");
    } catch (err) {
      console.error("❌ Forgot password error:", err);
      setError("Could not send reset email. Double check your email address.");
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAwareScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" enableOnAndroid extraScrollHeight={20}>
        <Text style={styles.title}>Login</Text>

        {Platform.OS === 'ios' && (
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

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity onPress={handleLogin} style={styles.loginButton} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginText}>Log In</Text>}
        </TouchableOpacity>

        <Text style={styles.forgotPassword} onPress={handleForgotPassword}>Forgot password?</Text>

        <Text style={styles.link} onPress={() => navigation.replace("Signup")}>
          Don't have an account? <Text style={styles.linkBold}>Sign up</Text>
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
  loginButton: { backgroundColor: "#E76A54", padding: 14, borderRadius: 32, alignItems: "center", marginTop: 16 },
  loginText: { color: "#fff", fontWeight: "bold" },
  forgotPassword: { color: "#E76A54", textAlign: "center", marginTop: 16, fontWeight: "500" },
});

export default LoginScreen;
