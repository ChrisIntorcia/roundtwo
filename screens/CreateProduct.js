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
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getFirestore, collection, addDoc, Timestamp, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getApp } from 'firebase/app';
import { auth } from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import * as ImageManipulator from 'expo-image-manipulator';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
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
  const [shippingRate, setShippingRate] = useState('');
  const [photos, setPhotos] = useState([]);
  const scrollViewRef = useRef(null);
  const fullPriceRef = useRef(null);
  const bulkPriceRef = useRef(null);
  const [quantity, setQuantity] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSubmit = async () => {
    if (!title || !fullPrice || !bulkPrice || !shippingRate || !description || photos.length === 0) {
      Alert.alert("Error", "Please fill in all fields and add at least one image");
      return;
    }

    setIsLoading(true);
    try {
      console.log('Starting product creation...');
      
      // Upload images first
      const imageUrls = await Promise.all(
        photos.map(async (photo, index) => {
          const manipulated = await ImageManipulator.manipulateAsync(
            photo,
            [{ resize: { width: 600 } }],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
          );
          const response = await fetch(manipulated.uri);
          const blob = await response.blob();
          const storageRef = ref(storage, `products/${auth.currentUser.uid}/${Date.now()}_${index}`);
          await uploadBytes(storageRef, blob);
          return getDownloadURL(storageRef);
        })
      );
      console.log('Images uploaded successfully:', imageUrls);

      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const userData = userDoc.data();
      const stripeAccountId = userData?.stripeAccountId || null;

      const productData = {
        sellerId: auth.currentUser.uid,
        title,
        description: capitalizeSentences(description),
        fullPrice: parseFloat(fullPrice),
        bulkPrice: parseFloat(bulkPrice),
        shippingRate: parseFloat(shippingRate) || 0,
        currency: 'usd',
        images: imageUrls,
        createdAt: serverTimestamp(),
        stripeAccountId,
        quantity: parseInt(quantity),
        taxCode: "txcd_31010000",
      };
      console.log('Product data prepared:', productData);

      // Save to Firestore
      const productRef = doc(collection(db, 'products'));
      await setDoc(productRef, productData);
      console.log('Product saved successfully with ID:', productRef.id);

      Alert.alert("Success", "Product created successfully!");
      navigation.goBack();
    } catch (error) {
      console.error('Error creating product:', error);
      Alert.alert("Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
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
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.mediaSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="images-outline" size={24} color="#333" />
              <Text style={styles.sectionTitle}>Product Photos</Text>
            </View>
            <Text style={styles.mediaNote}>Add up to 8 photos to showcase your product</Text>
            <View style={styles.photoCountContainer}>
              <View style={styles.photoCountBadge}>
                <Text style={styles.photoCount}>{photos.length}/8</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.addMediaButton,
                photos.length >= 8 && styles.addMediaButtonDisabled
              ]} 
              onPress={handleAddMedia}
              disabled={photos.length >= 8}
            >
              <Ionicons name="add-circle-outline" size={24} color="#fff" />
              <Text style={styles.addMediaText}>Add Photo</Text>
            </TouchableOpacity>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.photoScroll}
            >
              {photos.map((photo, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri: photo }} style={styles.imagePreview} />
                  <TouchableOpacity
                    onPress={() => setPhotos((prevPhotos) => prevPhotos.filter((_, i) => i !== index))}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.detailsSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle-outline" size={24} color="#333" />
              <Text style={styles.sectionTitle}>Product Details</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Title <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, title.length > 0 && styles.inputFilled]}
                placeholder="Enter product title"
                placeholderTextColor="#999"
                value={title}
                autoFocus={true}
                onChangeText={(text) => setTitle(text.replace(/\b\w/g, (c) => c.toUpperCase()))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, styles.textArea, description.length > 0 && styles.inputFilled]}
                placeholder="Describe your product in detail"
                placeholderTextColor="#999"
                value={description}
                onChangeText={setDescription}
                multiline
                autoCapitalize="none"
                autoCorrect={true}
              />
            </View>

            <View style={[styles.inputGroup, styles.inputRow]}>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Full Price <Text style={styles.required}>*</Text></Text>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    ref={fullPriceRef}
                    style={[styles.input, styles.priceInput, fullPrice.length > 0 && styles.inputFilled]}
                    placeholder="0.00"
                    placeholderTextColor="#999"
                    value={fullPrice}
                    onChangeText={setFullPrice}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Quantity <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={[styles.input, quantity.length > 0 && styles.inputFilled]}
                  placeholder="0"
                  placeholderTextColor="#999"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={[styles.inputGroup, styles.inputRow]}>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Bulk Price <Text style={styles.required}>*</Text></Text>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    ref={bulkPriceRef}
                    style={[styles.input, styles.priceInput, bulkPrice.length > 0 && styles.inputFilled]}
                    placeholder="0.00"
                    placeholderTextColor="#999"
                    value={bulkPrice}
                    onChangeText={setBulkPrice}
                    keyboardType="numeric"
                  />
                </View>
                {fullPrice && bulkPrice && (
                  <Text style={styles.discountNote}>
                    {Math.round(((parseFloat(fullPrice) - parseFloat(bulkPrice)) / parseFloat(fullPrice)) * 100)}% discount from full price
                  </Text>
                )}
              </View>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Shipping Rate <Text style={styles.required}>*</Text></Text>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={[styles.input, styles.priceInput, shippingRate.length > 0 && styles.inputFilled]}
                    placeholder="0.00"
                    placeholderTextColor="#999"
                    value={shippingRate}
                    onChangeText={setShippingRate}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => Alert.alert('Draft Saved', 'Your draft has been saved!')}
            >
              <Text style={styles.secondaryButtonText}>Save Draft</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                !(title && description && fullPrice && bulkPrice) && styles.disabledButton
              ]}
              disabled={isLoading || !(title && description && fullPrice && bulkPrice)}
              onPress={handleSubmit}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Publish</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.notes}>
            <Ionicons name="information-circle" size={14} color="#777" /> Complete all required fields marked with * to create a quality listing
          </Text>
        </KeyboardAwareScrollView>
      </TouchableWithoutFeedback>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  mediaSection: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  mediaNote: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  photoCountContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  photoCountBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoCount: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  addMediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: "#E76A54",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  addMediaButtonDisabled: {
    backgroundColor: '#ccc',
  },
  addMediaText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  photoScroll: {
    marginTop: 8,
  },
  imageWrapper: {
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  inputGroupHalf: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  required: {
    color: '#E76A54',
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#eee',
  },
  inputFilled: {
    backgroundColor: '#fff',
    borderColor: '#E76A54',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  currencySymbol: {
    paddingLeft: 16,
    fontSize: 16,
    color: '#666',
  },
  priceInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  discountNote: {
    fontSize: 13,
    color: '#E76A54',
    marginTop: 4,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#E76A54",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E76A54',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  notes: {
    marginTop: 24,
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default CreateProduct;