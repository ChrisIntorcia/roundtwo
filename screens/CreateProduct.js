import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getFirestore, collection, addDoc, Timestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getApp } from "firebase/app"; 
import { auth } from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import * as ImageManipulator from 'expo-image-manipulator'; 

const app = getApp();
const db = getFirestore();
const storage = getStorage(app, "gs://roundtwo-cc793.firebasestorage.app");

const CreateProduct = () => {
  const navigation = useNavigation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fullPrice, setFullPrice] = useState('');
  const [groupPrice, setGroupPrice] = useState('');
  const [groupAmount, setGroupAmount] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [quantity, setQuantity] = useState('');
  const scrollViewRef = useRef(null);

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
    if (
      !title ||
      !description ||
      !fullPrice ||
      !quantity ||
      !groupPrice ||
      !groupAmount ||
      !groupDescription ||
      photos.length === 0
    ) {
      return Alert.alert('Incomplete Fields', 'Please complete all required fields and add at least one photo.');
    }
  
    // Parse numeric fields safely
    const parsedFullPrice = parseFloat(fullPrice);
    const parsedGroupPrice = parseFloat(groupPrice);
    const parsedGroupAmount = parseInt(groupAmount);
    const parsedQuantity = parseInt(quantity);
  
    if (
      isNaN(parsedFullPrice) ||
      isNaN(parsedGroupPrice) ||
      isNaN(parsedGroupAmount) ||
      isNaN(parsedQuantity)
    ) {
      return Alert.alert('Invalid Input', 'Please enter valid numbers for price, quantity, and group info.');
    }
  
    try {
      const user = auth.currentUser;
      if (!user) {
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
  
      const productData = {
        sellerId: user.uid,
        title,
        description,
        fullPrice: parsedFullPrice,
        groupPrice: parsedGroupPrice,
        groupAmount: parsedGroupAmount,
        quantity: parsedQuantity,
        groupDescription,
        currency: 'usd',
        images: imageUrls,
        createdAt: Timestamp.now(),
      };
  
      await addDoc(collection(db, 'users', user.uid, 'products'), productData);
      await addDoc(collection(db, 'products'), productData);
  
      Alert.alert(
        'Published',
        'Your product has been published successfully!',
        [{ text: 'OK', onPress: () => navigation.navigate('MainApp', { screen: 'Home' }) }]
      );
    } catch (error) {
      console.error("Error publishing product:", error);
      Alert.alert('Error', 'There was an issue publishing your product.');
    }
  };
  
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} ref={scrollViewRef}>
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
            <TextInput style={styles.input} placeholder="Enter title" value={title} onChangeText={setTitle} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter description"
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputGroupHalf}>
              <Text style={styles.inputLabel}>Full Price *</Text>
              <TextInput
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

          <View style={styles.inputRow}>
            <View style={styles.inputGroupHalf}>
              <Text style={styles.inputLabel}>Group Price *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={groupPrice}
                onChangeText={setGroupPrice}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputGroupHalf}>
              <Text style={styles.inputLabel}>Group Amount *</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={groupAmount}
                onChangeText={setGroupAmount}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Group Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What does each person receive?"
              value={groupDescription}
              onChangeText={setGroupDescription}
              multiline
            />
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
            style={[
              styles.primaryButton,
              !(title && description && fullPrice && groupPrice && groupAmount && groupDescription) && styles.disabledButton,
            ]}
            disabled={!(title && description && fullPrice && groupPrice && groupAmount && groupDescription)}
            onPress={handlePublish}
          >
            <Text style={styles.buttonText}>Publish</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.notes}>
          Complete all required fields to create a quality listing.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContainer: { padding: 16 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#222',
  },
  mediaSection: {
    marginBottom: 24,
  },
  mediaNote: {
    fontSize: 13,
    color: '#777',
  },
  mediaCounter: {
    marginTop: 4,
    fontSize: 13,
    color: '#555',
  },
  addMediaButton: {
    marginTop: 10,
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  addMediaText: {
    color: '#fff',
    fontWeight: '600',
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  deleteButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ff4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailsSection: {
    backgroundColor: '#f7f7f7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputGroup: { marginBottom: 16 },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  inputGroupHalf: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    color: '#333',
  },
  input: {
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderColor: '#ccc',
    borderWidth: 1,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#28a745',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginLeft: 10,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  notes: {
    marginTop: 24,
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
  },
});

export default CreateProduct;