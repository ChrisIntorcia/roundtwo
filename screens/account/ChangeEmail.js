import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from "@react-navigation/native";
import { auth } from "../../firebaseConfig";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail,
} from "firebase/auth";

const ChangeEmail = () => {
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const user = auth.currentUser;

  const handleChangeEmail = async () => {
    if (!newEmail || !password) {
      Alert.alert("Missing Fields", "Please fill in both fields.");
      return;
    }

    setLoading(true);
    try {
      // Reauthenticate the user
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      // Send verify-then-update email to the new address
      await verifyBeforeUpdateEmail(user, newEmail, {
        url: "https://roundtwo-cc793.web.app/email-verification",
        handleCodeInApp: false, // set true if using Firebase Dynamic Links
      });

      Alert.alert(
        "Verification Sent",
        "Check your new inbox for the link. Once you click it, your email will be updated automatically."
      );

      // Optionally clear inputs
      setNewEmail("");
      setPassword("");
    } catch (error) {
      console.error("Email Change Error:", error);
      Alert.alert(
        "Error",
        error.code === "auth/wrong-password"
          ? "Incorrect password. Please try again."
          : error.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
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
              <Text style={styles.headerTitle}>Change Email</Text>
              <View style={styles.placeholder} />
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Current Email</Text>
                <View style={styles.currentEmailContainer}>
                  <Text style={styles.currentEmail}>{user.email}</Text>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>New Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter new email"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={newEmail}
                  onChangeText={setNewEmail}
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Current Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleChangeEmail}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Send Verification</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  placeholder: {
    width: 36,
  },
  form: {
    flex: 1,
    padding: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },
  currentEmailContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  currentEmail: {
    fontSize: 16,
    color: '#666',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#222',
  },
  button: {
    backgroundColor: '#E76A54',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChangeEmail;
