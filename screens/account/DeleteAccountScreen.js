import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { deleteUser, signOut } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import CustomHeader from '../../components/CustomHeader';

const DeleteAccountScreen = () => {
  const navigation = useNavigation();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogoutAndRedirect = async () => {
    try {
      await signOut(auth);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (confirmText.toLowerCase() !== 'delete') {
      Alert.alert('Error', 'Please type "delete" to confirm');
      return;
    }

    setIsDeleting(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No user found');

      // Delete user data from Firestore first
      await deleteDoc(doc(db, 'users', user.uid));

      try {
        // Try to delete the user account
        await deleteUser(user);
        // If successful, sign out and redirect
        await handleLogoutAndRedirect();
      } catch (error) {
        if (error.code === 'auth/requires-recent-login') {
          Alert.alert(
            'Session Expired',
            'For security reasons, please log out and log back in before deleting your account.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Log Out',
                style: 'destructive',
                onPress: handleLogoutAndRedirect
              }
            ]
          );
        } else {
          throw error; // Re-throw other errors to be caught by outer catch
        }
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert(
        'Error',
        'There was a problem deleting your account. Please try again later.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => setShowConfirm(true),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <CustomHeader title="Delete Account" showBack />
      
      <View style={styles.content}>
        <Text style={styles.warningText}>
          Warning: This action cannot be undone. All your data will be permanently deleted.
        </Text>
        
        {showConfirm ? (
          <View style={styles.confirmSection}>
            <Text style={styles.confirmText}>
              Type "delete" below to confirm account deletion:
            </Text>
            <TextInput
              style={styles.input}
              placeholder='Type "delete"'
              placeholderTextColor="#999"
              value={confirmText}
              onChangeText={setConfirmText}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.deleteButton, isDeleting && styles.disabledButton]}
              onPress={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.deleteButtonText}>Confirm & Delete Account</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
          >
            <Text style={styles.deleteButtonText}>Delete My Account</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  warningText: {
    fontSize: 16,
    color: '#E76A54',
    marginBottom: 30,
    lineHeight: 24,
  },
  confirmSection: {
    marginTop: 20,
  },
  confirmText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
  },
  deleteButton: {
    backgroundColor: '#E76A54',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DeleteAccountScreen; 