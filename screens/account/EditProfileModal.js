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
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import FastImage from 'react-native-fast-image';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { auth } from '../../firebaseConfig';
import uuid from 'react-native-uuid';
import { Ionicons } from '@expo/vector-icons';

const storage = getStorage();
const db = getFirestore();
const { width } = Dimensions.get('window');

export default function EditProfileModal({
  visible,
  onClose,
  currentAbout,
  currentAvatar,
}) {
  const [avatarUrl, setAvatarUrl] = useState(currentAvatar);
  const [aboutMe, setAboutMe] = useState(currentAbout || '');
  const [loading, setLoading] = useState(false);
  const [characterCount, setCharacterCount] = useState(currentAbout?.length || 0);
  const MAX_CHARS = 150;

  useEffect(() => {
    if (visible) {
      setAvatarUrl(currentAvatar);
      setAboutMe(currentAbout || '');
      setCharacterCount(currentAbout?.length || 0);
    }
  }, [visible, currentAvatar, currentAbout]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setLoading(true);

        const img = await fetch(result.assets[0].uri);
        const blob = await img.blob();

        const storageRef = ref(storage, `avatars/${auth.currentUser.uid}/${uuid.v4()}`);
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);

        setAvatarUrl(downloadURL);
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const updates = {};
      if (avatarUrl) updates.avatarUrl = avatarUrl;
      if (aboutMe.trim()) updates.aboutMe = aboutMe.trim();
      
      await updateDoc(doc(db, 'users', auth.currentUser.uid), updates);
      onClose();
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAboutChange = (text) => {
    if (text.length <= MAX_CHARS) {
      setAboutMe(text);
      setCharacterCount(text.length);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Profile</Text>
          <TouchableOpacity 
            onPress={handleSave} 
            disabled={loading}
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView 
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity 
            onPress={pickImage} 
            style={styles.avatarContainer}
            activeOpacity={0.8}
          >
            {avatarUrl ? (
              <FastImage
                source={{ uri: avatarUrl }}
                style={styles.avatar}
                resizeMode={FastImage.resizeMode.cover}
              />
            ) : (
              <View style={[styles.avatar, styles.placeholderAvatar]}>
                <Ionicons name="person" size={40} color="#999" />
              </View>
            )}
            <View style={styles.changeAvatarButton}>
              <Ionicons name="camera" size={20} color="#fff" />
            </View>
          </TouchableOpacity>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>About Me</Text>
            <TextInput
              style={styles.input}
              multiline
              maxLength={MAX_CHARS}
              value={aboutMe}
              onChangeText={handleAboutChange}
              placeholder="Tell others about yourself..."
              placeholderTextColor="#999"
            />
            <Text style={styles.charCount}>
              {characterCount}/{MAX_CHARS}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3436',
  },
  saveButton: {
    backgroundColor: '#E76A54',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    padding: 24,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
  },
  placeholderAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: width/2 - 80,
    backgroundColor: '#E76A54',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3436',
    marginBottom: 8,
  },
  input: {
    minHeight: 120,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2d3436',
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'right',
    marginTop: 8,
  },
});
