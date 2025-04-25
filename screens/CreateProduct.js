import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getFirestore, collection, addDoc, Timestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getApp } from 'firebase/app';
import { auth } from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import * as ImageManipulator from 'expo-image-manipulator';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import CustomHeader from "../components/CustomHeader";

const app = getApp();
const db = getFirestore();
const storage = getStorage(app, 'gs://roundtwo-cc793.firebasestorage.app');

const capitalizeSentences = (text) => {
  return text
    .replace(/\s*([.!?])\s*/g, '$1 ') // Normalize spacing after punctuation
    .replace(/(^\s*|[.!?]\s+)(\w)/g, (_, prefix, char) => prefix + char.toUpperCase());
};

const CreateProduct = () => {
  const navigation = useNavigation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fullPrice, setFullPrice] = useState('');
  const [bulkPrice, setBulkPrice] = useState('');
  const [photos, setPhotos] = useState([]);
  const scrollViewRef = useRef(null);
  const fullPriceRef = useRef(null);
  const bulkPriceRef = useRef(null);
  const [quantity, setQuantity] = useState('');
   const [publishing, setPublishing] = useState(false);

  const handleAddMedia = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      return Alert.alert('Permission Denied', 'You need to allow access to your media library.');
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) {
      setPhotos((prevPhotos) => [...prevPhotos, result.assets[0].uri]);
    }
  };

  const handlePublish = async () => {
    if (publishing) return; // Prevent double-tap
    setPublishing(true);
  
    if (!title || !description || !fullPrice || !bulkPrice || photos.length === 0) {
      setPublishing(false);
      return Alert.alert('Incomplete Fields', 'Please complete all required fields and add at least one photo.');
    }
  
    const parsedFullPrice = parseFloat(fullPrice);
    const parsedBulkPrice = parseFloat(bulkPrice);
  
    if (isNaN(parsedFullPrice) || isNaN(parsedBulkPrice)) {
      setPublishing(false);
      return Alert.alert('Invalid Input', 'Please enter valid numbers for pricing and bulk quantity.');
    }
  
    const parsedQuantity = parseInt(quantity);
    if (isNaN(parsedQuantity)) {
      setPublishing(false);
      return Alert.alert('Invalid Input', 'Quantity must be a valid number.');
    }
  
    try {
      const user = auth.currentUser;
      if (!user) {
        setPublishing(false);
        return Alert.alert('User not authenticated');
      }
  
      const imageUrls = await Promise.all(
        photos.map(async (photo, index) => {
          const manipulated = await ImageManipulator.manipulateAsync(
            photo,
            [{ resize: { width: 600 } }],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
          );
          const response = await fetch(manipulated.uri);
          const blob = await response.blob();
          const storageRef = ref(storage, `products/${user.uid}/${Date.now()}_${index}`);
          await uploadBytes(storageRef, blob);
          return getDownloadURL(storageRef);
        })
      );
  
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const stripeAccountId = userData?.stripeAccountId || null;
  
      const productData = {
        sellerId: user.uid,
        title,
        description: capitalizeSentences(description),
        fullPrice: parsedFullPrice,
        bulkPrice: parsedBulkPrice,
        currency: 'usd',
        images: imageUrls,
        createdAt: Timestamp.now(),
        stripeAccountId,
        quantity: parsedQuantity,
      };
  
      const productRef = doc(collection(db, 'products'));
      await setDoc(productRef, productData);
  
      Alert.alert('Published', 'Your product has been published successfully!', [
        { text: 'OK', onPress: () => navigation.replace('MainApp', { screen: 'Home' }) },
      ]);
    } catch (error) {
      console.error("Error publishing product:", error);
      Alert.alert('Error', 'There was an issue publishing your product.');
    } finally {
      setPublishing(false); // Reset at the end no matter what
    }
  };  

  return (
    <View style={{ flex: 1 }}>
      <CustomHeader title="Create Product" showBack />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAwareScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          extraScrollHeight={120}
          keyboardOpeningTime={250}
          enableAutomaticScroll={true}
          enableOnAndroid={true}
        >
          <View style={styles.mediaSection}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <Text style={styles.mediaNote}>Add up to 8 photos to showcase your product.</Text>
            <Text style={styles.mediaCounter}>Photos: {photos.length}/8</Text>
            <TouchableOpacity style={styles.addMediaButton} onPress={handleAddMedia}>
              <Text style={styles.addMediaText}>+ Add Photo</Text>
            </TouchableOpacity>
            <ScrollView horizontal style={{ marginTop: 20, paddingTop: 10 }}>
              {photos.map((photo, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri: photo }} style={styles.imagePreview} />
                  <TouchableOpacity
                    onPress={() => setPhotos((prevPhotos) => prevPhotos.filter((_, i) => i !== index))}
                    style={styles.deleteButton}
                  >
                    <Text style={styles.deleteButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Product Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter title"
                value={title}
                autoFocus={true}
                onChangeText={(text) => setTitle(text.replace(/\b\w/g, (c) => c.toUpperCase()))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter description"
                value={description}
                onChangeText={setDescription}
                multiline
                autoCapitalize="none"
                autoCorrect={true}
              />
            </View>

            <View style={[styles.inputGroup, styles.inputRow]}>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Full Price *</Text>
                <TextInput
                  ref={fullPriceRef}
                  style={styles.input}
                  placeholder="0.00"
                  value={fullPrice}
                  onChangeText={setFullPrice}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Quantity *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={[styles.inputGroup, styles.inputRow]}>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Live Stream Price *</Text>
                <TextInput
                  ref={bulkPriceRef}
                  style={styles.input}
                  placeholder="0.00"
                  value={bulkPrice}
                  onChangeText={setBulkPrice}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>% Discount</Text>
                <View style={[styles.input, { justifyContent: 'center', height: 40 }]}>
                  <Text>
                    {fullPrice && bulkPrice
                      ? `${Math.round(
                          ((parseFloat(fullPrice) - parseFloat(bulkPrice)) / parseFloat(fullPrice)) * 100
                        )}%`
                      : "—"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => Alert.alert('Draft Saved', 'Your draft has been saved!')}
            >
              <Text style={styles.buttonText}>Save Draft</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, !(title && description && fullPrice && bulkPrice) && styles.disabledButton]}
              disabled={publishing || !(title && description && fullPrice && bulkPrice)}
              onPress={handlePublish}
            >
              <Text style={styles.buttonText}>Publish</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.notes}>Complete all required fields to create a quality listing.</Text>
        </KeyboardAwareScrollView>
      </TouchableWithoutFeedback>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContainer: { padding: 16, paddingBottom: 100 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8, color: '#222' },
  mediaSection: { marginBottom: 24 },
  mediaNote: { fontSize: 13, color: '#777' },
  mediaCounter: { marginTop: 4, fontSize: 13, color: '#555' },
  addMediaButton: { marginTop: 10, backgroundColor: "#E76A54", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 32, alignSelf: 'flex-start' },
  addMediaText: { color: '#fff', fontWeight: '600' },
  imageWrapper: { position: 'relative', marginRight: 10 },
  imagePreview: { width: 100, height: 100, borderRadius: 10 },
  deleteButton: { position: 'absolute', top: -6, right: -6, backgroundColor: '#ff4444', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  deleteButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  detailsSection: { backgroundColor: '#f7f7f7', padding: 16, borderRadius: 12, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  inputGroup: { marginBottom: 16 },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  inputGroupHalf: { flex: 1 },
  inputLabel: { fontSize: 14, fontWeight: '500', marginBottom: 4, color: '#333' },
  input: { height: 40, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, borderColor: '#ccc', borderWidth: 1 },
  textArea: { height: 80, textAlignVertical: 'top' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between' },
  primaryButton: { flex: 1, backgroundColor: "#E76A54", paddingVertical: 12, borderRadius: 32, alignItems: 'center', marginLeft: 10 },
  secondaryButton: { flex: 1, backgroundColor: '#6c757d', paddingVertical: 12, borderRadius: 32, alignItems: 'center', marginRight: 10 },
  disabledButton: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  notes: { marginTop: 24, fontSize: 13, color: '#777', textAlign: 'center' },
});

export default CreateProduct;