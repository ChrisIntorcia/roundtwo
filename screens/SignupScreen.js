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
  Platform
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { signUp, login, authenticateWithGoogle, signInWithApple } from "../authService";
import { getFriendlyError } from "../utils/authUtils";

WebBrowser.maybeCompleteAuthSession();

const SignupScreen = ({ navigation }) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: "<YOUR_EXPO_CLIENT_ID>",
    iosClientId: "<YOUR_IOS_CLIENT_ID>",
    androidClientId: "<YOUR_ANDROID_CLIENT_ID>",
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.authentication;
      authenticateWithGoogle(id_token).then(() => navigation.replace("MainApp"));
    }
  }, [response]);

  const handleGoogleSignIn = () => {
    promptAsync();
  };

  const handleAppleSignIn = async () => {
    try {
      await signInWithApple();
      navigation.replace("MainApp");
    } catch (err) {
      console.error(err);
    }
  };

  const handleSignup = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await signUp(email.trim(), password, fullName);
      await login(email.trim(), password);
      navigation.replace("MainApp");
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

        <TouchableOpacity onPress={handleGoogleSignIn} style={styles.oauthButton}>
          <Text style={styles.oauthText}>Continue with Google</Text>
        </TouchableOpacity>

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
  oauthButton: { backgroundColor: "#fff", borderColor: "#ccc", borderWidth: 1, padding: 12, borderRadius: 32, marginTop: 12, alignItems: "center" },
  oauthText: { color: "#000", fontWeight: "500" },
  appleButton: { width: "100%", height: 44, marginTop: 12 },
  signupButton: { backgroundColor: "#E76A54", padding: 14, borderRadius: 32, alignItems: "center", marginTop: 16 },
  signupText: { color: "#fff", fontWeight: "bold" }
});

export default SignupScreen;
