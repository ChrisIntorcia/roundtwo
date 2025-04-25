import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useRoute } from '@react-navigation/native';

const ShippingLabelScreen = () => {
  const route = useRoute();
  const { orderId, buyerId } = route.params;

  const [shippingAddress, setShippingAddress] = useState(null);
  const [weight, setWeight] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  useEffect(() => {
    const fetchAddress = async () => {
      const docRef = doc(db, 'users', buyerId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setShippingAddress(docSnap.data().shippingAddress);
      } else {
        Alert.alert('Error', 'Buyer address not found');
      }
    };

    fetchAddress();
  }, []);

  const openShippo = () => {
    const shippoURL = `https://apps.goshippo.com/`;
    Linking.openURL(shippoURL);
  };

  const saveTrackingNumber = async () => {
    if (!trackingNumber) return Alert.alert('Error', 'Please enter a tracking number.');
    await updateDoc(doc(db, 'orders', orderId), {
      trackingNumber,
    });
    Alert.alert('Saved', 'Tracking number saved successfully.');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={styles.title}>Shipping Label</Text>

          {shippingAddress ? (
            <View style={styles.section}>
              <Text style={styles.subtitle}>Ship To:</Text>
              <Text style={styles.address}>
                {shippingAddress?.name || ''}{'\n'}
                {shippingAddress?.line1 || ''}{shippingAddress?.line2 ? `, ${shippingAddress.line2}` : ''}{'\n'}
                {shippingAddress?.city || ''}, {shippingAddress?.state || ''} {shippingAddress?.postalCode || ''}{'\n'}
                {shippingAddress?.country || ''}
              </Text>
            </View>
          ) : (
            <Text style={{ color: '#888' }}>Loading address…</Text>
          )}

          <View style={styles.section}>
            <Text style={styles.subtitle}>Package Details</Text>
            <TextInput
              style={styles.input}
              placeholder="Weight (oz)"
              keyboardType="numeric"
              value={weight}
              onChangeText={setWeight}
            />
            <TextInput
              style={styles.input}
              placeholder="Dimensions (LxWxH in inches)"
              value={dimensions}
              onChangeText={setDimensions}
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={openShippo}>
            <Text style={styles.buttonText}>Buy Shipping Label</Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.subtitle}>Add Tracking Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Tracking Number"
              value={trackingNumber}
              onChangeText={setTrackingNumber}
            />
            <TouchableOpacity style={styles.saveButton} onPress={saveTrackingNumber}>
              <Text style={styles.saveText}>Save Tracking</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  section: { marginVertical: 15 },
  subtitle: { fontSize: 18, fontWeight: '600', marginBottom: 6 },
  address: { fontSize: 16, lineHeight: 22 },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#E76A54',
    padding: 14,
    borderRadius: 30,
    alignItems: 'center',
    marginVertical: 20,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  saveButton: {
    backgroundColor: '#E76A54',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveText: { color: '#fff', fontWeight: 'bold' },
});

export default ShippingLabelScreen;
