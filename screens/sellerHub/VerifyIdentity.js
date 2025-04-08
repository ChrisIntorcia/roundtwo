import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { auth } from "../../firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function VerifyIdentity() {
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleUpload = async () => {
    const user = auth.currentUser;
    if (!user || !image) return;

    try {
      setUploading(true);
      const blob = await (await fetch(image)).blob();
      const storage = getStorage();
      const storageRef = ref(storage, `identityDocs/${user.uid}.jpg`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      await setDoc(doc(db, "users", user.uid), {
        identityVerified: true,
        identityDocUrl: downloadURL,
      }, { merge: true });

      Alert.alert("✅ Success", "Your ID has been uploaded for review.");
    } catch (err) {
      console.error("Upload error:", err);
      Alert.alert("Upload Failed", err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Verify Your Identity</Text>
      <Text style={styles.instructions}>Take a photo of a government-issued ID to complete verification.</Text>

      {image && <Image source={{ uri: image }} style={styles.preview} />}

      <TouchableOpacity style={styles.button} onPress={handlePickImage}>
        <Text style={styles.buttonText}>Take Photo of ID</Text>
      </TouchableOpacity>

      {image && (
        <TouchableOpacity style={[styles.button, { backgroundColor: uploading ? '#aaa' : 'black' }]} onPress={handleUpload} disabled={uploading}>
          <Text style={styles.buttonText}>{uploading ? "Uploading..." : "Submit for Review"}</Text>
        </TouchableOpacity>
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
    marginBottom: 10,
  },
  instructions: {
    fontSize: 14,
    color: "gray",
    marginBottom: 20,
  },
  preview: {
    width: "100%",
    height: 300,
    resizeMode: "contain",
    marginBottom: 20,
    borderRadius: 8,
  },
  button: {
    backgroundColor: "black",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});