import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import CustomHeader from '../../components/CustomHeader';

const AffiliateProgram = () => {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    if (!name || !email || !message) {
      return Alert.alert('Incomplete', 'Please fill out all fields before submitting.');
    }

    try {
      await addDoc(collection(db, 'affiliateApplications'), {
        name,
        email,
        message,
        submittedAt: new Date(),
      });

      Alert.alert('Submitted', 'Thanks for applying! We’ll review your application and reach out soon.');
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      console.error('🔥 Failed to submit application:', err);
      Alert.alert('Error', 'Something went wrong. Please try again later.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <CustomHeader title="Affiliate Program" showBack onBack={() => navigation.goBack()} />
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Apply to Become an Affiliate</Text>
            <Text style={styles.description}>
              Want to host live streams and sell products on behalf of other vendors? Fill out the application below and our team will get back to you.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell us why you want to be an affiliate..."
              multiline
              numberOfLines={5}
              value={message}
              onChangeText={setMessage}
            />

            <TouchableOpacity style={styles.button} onPress={handleSubmit}>
              <Text style={styles.buttonText}>Submit Application</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: '#000' },
  description: { fontSize: 16, marginBottom: 20, lineHeight: 22, color: '#333' },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#E76A54',
    padding: 16,
    borderRadius: 32,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default AffiliateProgram;
