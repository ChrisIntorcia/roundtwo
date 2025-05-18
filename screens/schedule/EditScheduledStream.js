import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import CustomHeader from '../../components/CustomHeader';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';
import { auth } from '../../firebaseConfig';

const db = getFirestore();
const storage = getStorage();

const EditScheduledStream = ({ route, navigation }) => {
  const { streamId } = route.params;
  const [streamTitle, setStreamTitle] = useState('');
  const [streamDescription, setStreamDescription] = useState('');
  const [streamDate, setStreamDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [thumbnailLocalUri, setThumbnailLocalUri] = useState(null);
  const [currentThumbnail, setCurrentThumbnail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);

  useEffect(() => {
    fetchStreamDetails();
    fetchUserProducts();
  }, [streamId]);

  const fetchStreamDetails = async () => {
    try {
      const streamRef = doc(db, 'scheduledStreams', streamId);
      const streamSnap = await getDoc(streamRef);
      
      if (streamSnap.exists()) {
        const data = streamSnap.data();
        setStreamTitle(data.title || '');
        setStreamDescription(data.description || '');
        setStreamDate(data.date?.toDate() || new Date());
        setCurrentThumbnail(data.coverImage);
        setSelectedProducts(data.products || []);
      } else {
        Alert.alert('Error', 'Stream not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error fetching stream:', error);
      Alert.alert('Error', 'Failed to load stream details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserProducts = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const productsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setProducts(productsList);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setStreamDate(selectedDate);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (selectedTime) {
      const newDate = new Date(streamDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setStreamDate(newDate);
    }
  };

  const pickThumbnail = async () => {
    setIsLoading(true);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        'Please grant photo library access to upload a thumbnail.'
      );
      setIsLoading(false);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7
    });
    setIsLoading(false);

    const uri = result.assets?.[0]?.uri ?? result.uri;
    if (uri) setThumbnailLocalUri(uri);
  };

  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const uploadThumbnail = async () => {
    if (!thumbnailLocalUri) return null;
    
    const response = await fetch(thumbnailLocalUri);
    const blob = await response.blob();
    const storageRef = storageRef(storage, `thumbnails/${Date.now()}.jpg`);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const handleUpdate = async () => {
    if (!streamTitle.trim() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to edit a stream');
        return;
      }

      let downloadURL = currentThumbnail;
      if (thumbnailLocalUri) {
        downloadURL = await uploadThumbnail();
      }

      const streamRef = doc(db, 'scheduledStreams', streamId);
      await updateDoc(streamRef, {
        title: streamTitle,
        description: streamDescription,
        date: Timestamp.fromDate(streamDate),
        coverImage: downloadURL,
        products: selectedProducts,
        updatedAt: Timestamp.now()
      });

      Alert.alert(
        'Updated!',
        `"${streamTitle}" has been updated for ${streamDate.toLocaleString('en-US', {
          timeZone: 'America/New_York',
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          hour12: true
        })}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      console.error('Error updating stream:', e);
      Alert.alert('Oops', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E76A54" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F9F9F9' }}>
      <CustomHeader title="Edit Scheduled Show" showBack />
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <Text style={styles.sectionTitle}>Stream Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your stream title"
            value={streamTitle}
            onChangeText={setStreamTitle}
          />

          <Text style={styles.sectionTitle}>Description</Text>
          <TextInput
            style={[styles.input, styles.descriptionInput]}
            placeholder="Enter stream description (max 70 characters)"
            value={streamDescription}
            onChangeText={setStreamDescription}
            maxLength={70}
            multiline
          />
          <Text style={styles.charCount}>
            {streamDescription.length}/70 characters
          </Text>

          <Text style={styles.sectionTitle}>Date & Time</Text>
          <View style={styles.dateTimeContainer}>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowDatePicker(true)}
            >
              <MaterialIcons name="calendar-today" size={24} color="#666" />
              <Text style={styles.dateTimeText}>
                {streamDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => {
                setShowTimePicker(true);
                setIsTimePickerOpen(true);
              }}
            >
              <MaterialIcons name="access-time" size={24} color="#666" />
              <Text style={styles.dateTimeText}>
                {streamDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={streamDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={streamDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
              onDismiss={() => {
                if (Platform.OS === 'ios') {
                  setIsTimePickerOpen(false);
                }
              }}
            />
          )}

          <Text style={styles.sectionTitle}>Schedule Thumbnail</Text>
          <TouchableOpacity
            style={[
              styles.thumbnailContainer,
              !thumbnailLocalUri && !currentThumbnail && styles.thumbnailPlaceholder
            ]}
            onPress={pickThumbnail}
            disabled={isLoading}
          >
            {(thumbnailLocalUri || currentThumbnail) ? (
              <Image
                source={{ uri: thumbnailLocalUri || currentThumbnail }}
                style={styles.thumbnail}
              />
            ) : (
              <View style={styles.uploadPrompt}>
                <MaterialIcons
                  name="add-photo-alternate"
                  size={40}
                  color="#666"
                />
                <Text style={styles.uploadText}>Upload landscape photo</Text>
                <Text style={styles.uploadSubtext}>
                  Tap to choose an image
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Product Queue</Text>
          <View style={styles.productQueueContainer}>
            {products.length > 0 ? (
              products.map(product => (
                <TouchableOpacity
                  key={product.id}
                  style={[
                    styles.productItem,
                    selectedProducts.includes(product.id) && styles.selectedProduct
                  ]}
                  onPress={() => toggleProductSelection(product.id)}
                >
                  <Image
                    source={{ uri: product.images[0] }}
                    style={styles.productImage}
                  />
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <Text style={styles.productPrice}>
                      ${product.price.toFixed(2)}
                    </Text>
                  </View>
                  <MaterialIcons
                    name={selectedProducts.includes(product.id) ? 'check-circle' : 'radio-button-unchecked'}
                    size={24}
                    color={selectedProducts.includes(product.id) ? '#E76A54' : '#666'}
                  />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noProductsText}>
                No products available. Add products in your seller hub.
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              styles.confirm,
              (!streamTitle.trim() || isSubmitting) && styles.buttonDisabled
            ]}
            onPress={handleUpdate}
            disabled={!streamTitle.trim() || isSubmitting}
          >
            <Text style={styles.buttonText}>
              {isSubmitting ? 'Updating...' : 'Update Schedule'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1
  },
  container: {
    margin: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9'
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginVertical: 10,
    textAlign: 'center',
    color: '#213E4D'
  },
  input: {
    backgroundColor: '#F0F0F0',
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 16,
    marginBottom: 20,
    color: '#213E4D'
  },
  descriptionInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    color: '#666',
    marginTop: -15,
    marginBottom: 20,
    fontSize: 12,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CCC',
    flex: 1,
    marginHorizontal: 5,
  },
  dateTimeText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#213E4D',
  },
  thumbnailContainer: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30
  },
  thumbnailPlaceholder: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#CCC'
  },
  thumbnail: {
    width: '100%',
    height: '100%'
  },
  uploadPrompt: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  uploadText: {
    marginTop: 8,
    fontSize: 16,
    color: '#666',
    fontWeight: '600'
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4
  },
  productQueueContainer: {
    marginBottom: 30
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    marginBottom: 10
  },
  selectedProduct: {
    backgroundColor: '#FFF0ED'
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 4
  },
  productInfo: {
    flex: 1,
    marginLeft: 10
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#213E4D'
  },
  productPrice: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  noProductsText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginVertical: 20
  },
  button: {
    backgroundColor: '#E76A54',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    marginVertical: 10,
    width: '100%'
  },
  confirm: {
    backgroundColor: '#213E4D'
  },
  buttonDisabled: {
    opacity: 0.5
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16
  }
});

export default EditScheduledStream; 