import React, { useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { auth } from "../../firebaseConfig";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
} from "firebase/auth";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import CustomHeader from "../../components/CustomHeader";

const ChangeEmail = () => {
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const user = auth.currentUser;
  const db = getFirestore();

  const handleChangeEmail = async () => {
    if (!newEmail || !password) {
      Alert.alert("Missing Fields", "Please fill in both fields.");
      return;
    }

    setLoading(true);

    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      await updateEmail(user, newEmail);

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { email: newEmail });

      Alert.alert("✅ Success", "Email address updated.");
      setNewEmail("");
      setPassword("");
    } catch (error) {
      console.error("❌ Email Update Error:", error);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          extraScrollHeight={20}
        >
          <CustomHeader showBack />
          <Text style={styles.title}>Change Email</Text>

          <TextInput
            style={styles.input}
            placeholder="New email"
            placeholderTextColor="#888"
            autoCapitalize="none"
            keyboardType="email-address"
            value={newEmail}
            onChangeText={setNewEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="Current password"
            placeholderTextColor="#888"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleChangeEmail}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Updating..." : "Update Email"}
            </Text>
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    color: "#222",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#F1F1F1",
    color: "#000",
    borderRadius: 8,
    padding: 14,
    marginBottom: 15,
    borderColor: "#DDD",
    borderWidth: 1,
  },
  button: {
    backgroundColor: "#E76A54",
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 32,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ChangeEmail;
