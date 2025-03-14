import React, { useState } from "react";
import { View, TextInput, Button, Text, StyleSheet } from "react-native";
import { login } from "../authService";

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      await login(email, password);
      console.log("Login successful!");
      navigation.navigate("MainApp"); // Navigate to MainApp (BottomTabs)
    } catch (err) {
      setError(err.message);
      console.error("Login failed:", err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Log In" onPress={handleLogin} />
      <Text
        style={styles.link}
        onPress={() => navigation.navigate("Signup")}
      >
        Don't have an account? Sign up.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 16 },
  input: { borderWidth: 1, borderColor: "#ccc", marginBottom: 16, padding: 8 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  error: { color: "red", marginBottom: 12 },
  link: { color: "blue", marginTop: 12, textAlign: "center" },
});

export default LoginScreen;
