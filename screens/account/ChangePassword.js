import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import {
  getAuth,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import CustomHeader from "../../components/CustomHeader";

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert("Missing Fields", "Please fill in both fields.");
      return;
    }

    setLoading(true);

    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      Alert.alert("✅ Success", "Password updated.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (error) {
      console.error("❌ Password Update Error:", error);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CustomHeader showBack />
      <View style={styles.content}>
        <Text style={styles.title}>Change Password</Text>

        <TextInput
          style={styles.input}
          placeholder="Current password"
          placeholderTextColor="#888"
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />

        <TextInput
          style={styles.input}
          placeholder="New password"
          placeholderTextColor="#888"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleChangePassword}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Updating..." : "Update Password"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
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
    backgroundColor: "#FFD700",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#000",
  },
});

export default ChangePassword;
