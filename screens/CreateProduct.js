import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Button,
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
import { getAuth } from 'firebase/auth';

const app = getApp();
const db = getFirestore();
const storage = getStorage(app, "gs://roundtwo-cc793.firebasestorage.app");

const CreateProduct = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fullPrice, setFullPrice] = useState('');
  const [groupPrice, setGroupPrice] = useState('');
  const [groupAmount, setGroupAmount] = useState(''); // ✅ Group Amount
  const [groupDescription, setGroupDescription] = useState(''); // ✅ Description for Each Group
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
    if (!title || !description || !fullPrice || !quantity || !groupPrice || !groupAmount || !groupDescription || photos.length === 0) {
      return Alert.alert('Incomplete Fields', 'Please complete all required fields and add at least one photo.');
    }
  
    try {
      const user = getAuth().currentUser;
      if (!user) {
        return Alert.alert('User not authenticated');
      }
  
      const imageUrls = await Promise.all(
        photos.map(async (photo, index) => {
          const response = await fetch(photo);
          const blob = await response.blob();
          const storageRef = ref(storage, `products/${user.uid}/${Date.now()}_${index}`);
          await uploadBytes(storageRef, blob);
          return getDownloadURL(storageRef);
        })
      );
  
      // ✅ Define productData once
      const productData = {
        sellerId: user.uid, // For filtering later
        title,
        description,
        fullPrice,
        quantity,
        groupPrice,
        groupAmount,
        groupDescription,
        images: imageUrls,
        createdAt: Timestamp.now(),
      };
  
      // Save in user's subcollection
      await addDoc(collection(db, 'users', user.uid, 'products'), productData);
  
      // Save in top-level collection (used for carousel)
      await addDoc(collection(db, 'products'), productData);
  
      Alert.alert('Published', 'Your product has been published successfully!');
    } catch (error) {
      console.error("Error publishing product:", error);
      Alert.alert('Error', 'There was an issue publishing your product.');
    }
  };
  

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.container} ref={scrollViewRef}>
        <View style={styles.mediaSection}>
          <Text style={styles.inputLabel}>Photos</Text>
          <Text style={styles.mediaNote}>At least 1 photo is required</Text>
          <Text style={styles.mediaCounter}>Photos: {photos.length}/8</Text>
          <Button title="Add Media" onPress={handleAddMedia} />
          <ScrollView horizontal>
            {photos.map((photo, index) => (
              <Image key={index} source={{ uri: photo }} style={styles.imagePreview} />
            ))}
          </ScrollView>
        </View>

        <View style={styles.detailsSection}>
          <Text style={styles.inputLabel}>Title *</Text>
          <TextInput style={styles.input} placeholder="Enter Title" value={title} onChangeText={setTitle} />

          <Text style={styles.inputLabel}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter Description"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <Text style={styles.inputLabel}>Full Price *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Full Price"
            value={fullPrice}
            onChangeText={setFullPrice}
            keyboardType="numeric"
          />

          <Text style={styles.inputLabel}>Quantity *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter available quantity"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
          />

          <Text style={styles.inputLabel}>Group Price *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Group Price"
            value={groupPrice}
            onChangeText={setGroupPrice}
            keyboardType="numeric"
          />

          <Text style={styles.inputLabel}>Group Amount *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter number of people needed for group"
            value={groupAmount}
            onChangeText={setGroupAmount}
            keyboardType="numeric"
          />

          <Text style={styles.inputLabel}>Description for Each Group (Quantity) *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter what each person receives"
            value={groupDescription}
            onChangeText={setGroupDescription}
            multiline
          />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.saveDraftButton} onPress={() => Alert.alert('Draft Saved', 'Your draft has been saved!')}>
            <Text style={styles.buttonText}>Save Draft</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.publishButton, !(title && description && fullPrice && groupPrice && groupAmount && groupDescription) && styles.publishButtonDisabled]}
            disabled={!(title && description && fullPrice && groupPrice && groupAmount && groupDescription)}
            onPress={handlePublish}
          >
            <Text style={styles.buttonText}>Publish</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.notes}>
          Complete key information fields to create a quality listing that counts towards your Premier Shop status.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  mediaSection: {
    marginBottom: 20,
  },
  mediaCounter: {
    fontSize: 16,
    marginBottom: 10,
  },
  mediaNote: {
    fontSize: 12,
    color: 'gray',
    marginBottom: 5,
  },
  imagePreview: {
    width: 100,
    height: 100,
    marginRight: 10,
    borderRadius: 8,
  },
  detailsSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  saveDraftButton: {
    backgroundColor: '#ccc',
    padding: 12,
    borderRadius: 8,
  },
  publishButton: {
    backgroundColor: 'blue',
    padding: 12,
    borderRadius: 8,
  },
  publishButtonDisabled: {
    backgroundColor: 'gray',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  notes: {
    fontSize: 12,
    color: 'gray',
    marginTop: 10,
  },
});

export default CreateProduct;