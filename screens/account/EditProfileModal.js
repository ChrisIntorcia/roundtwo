import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import FastImage from 'react-native-fast-image';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { auth } from '../../firebaseConfig';
import uuid from 'react-native-uuid';

const storage = getStorage();
const db = getFirestore();

export default function EditProfileModal({
  visible,
  onClose,
  currentAbout,
  currentAvatar,
  onSaved,
}) {
  const [avatarUrl, setAvatarUrl] = useState(currentAvatar);
  const [aboutMe, setAboutMe] = useState(currentAbout || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setAvatarUrl(currentAvatar);
      setAboutMe(currentAbout || '');
    }
  }, [visible, currentAvatar, currentAbout]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.cancelled && result.assets?.[0]?.uri) {
      setLoading(true);
      const img = await fetch(result.assets[0].uri);
      const blob = await img.blob();

      const storageRef = ref(storage, `avatars/${auth.currentUser.uid}/${uuid.v4()}`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      setAvatarUrl(downloadURL);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      avatarUrl,
      aboutMe,
    });
    setLoading(false);
    onSaved({ avatarUrl, aboutMe });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Edit Profile</Text>

            <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
              {loading ? (
                <ActivityIndicator />
              ) : (
                <FastImage
                  source={{ uri: avatarUrl }}
                  style={styles.avatar}
                  resizeMode={FastImage.resizeMode.cover}
                />
              )}
              <Text style={styles.linkText}>Change Avatar</Text>
            </TouchableOpacity>

            <Text style={styles.label}>About Me</Text>
            <TextInput
              style={styles.input}
              multiline
              numberOfLines={4}
              value={aboutMe}
              onChangeText={setAboutMe}
              placeholder="Tell us about yourself"
              placeholderTextColor="#888"
            />

            <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={loading}>
              <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Changes'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ccc',
  },
  linkText: {
    marginTop: 8,
    color: '#007bff',
  },
  label: {
    fontSize: 16,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    height: 100,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#000',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#888',
  },
});
