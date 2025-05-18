// screens/ScheduleStreamScreen.js
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
import ScheduleProductQueue from './ScheduleProductQueue';
import {
  getFirestore,
  collection,
  addDoc,
  Timestamp
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

const ScheduleStreamScreen = ({ navigation, route }) => {
  const [streamTitle, setStreamTitle] = useState('');
  const [streamDescription, setStreamDescription] = useState('');
  const [streamDate, setStreamDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [thumbnailLocalUri, setThumbnailLocalUri] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showProductQueue, setShowProductQueue] = useState(false);

  useEffect(() => {
    if (route.params?.selectedProducts) {
      setSelectedProducts(route.params.selectedProducts);
    }
  }, [route.params?.selectedProducts]);

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setStreamDate(selectedDate);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    if (selectedTime) {
      const newDate = new Date(streamDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setStreamDate(newDate);
    }
  };

  const handleTimePickerDismiss = () => {
    if (Platform.OS === 'ios') {
      setShowTimePicker(false);
      setIsTimePickerOpen(false);
    }
  };

  const handleTimeButtonPress = () => {
    if (showTimePicker) {
      setShowTimePicker(false);
      setIsTimePickerOpen(false);
    } else {
      setShowTimePicker(true);
      setIsTimePickerOpen(true);
    }
  };

  const formatDateTime = (dateObj) => {
    return dateObj.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }) + ' EST';
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

  const handleSchedule = async () => {
    if (!streamTitle.trim() || !streamDescription.trim() || isLoading) return;
    setIsLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to schedule a stream');
        return;
      }

      let downloadURL = null;
      if (thumbnailLocalUri) {
        const response = await fetch(thumbnailLocalUri);
        const blob = await response.blob();
        const fileRef = storageRef(storage, `thumbnails/${Date.now()}.jpg`);
        await uploadBytes(fileRef, blob);
        downloadURL = await getDownloadURL(fileRef);
      }

      const streamRef = await addDoc(collection(db, 'scheduledStreams'), {
        title: streamTitle,
        description: streamDescription,
        date: Timestamp.fromDate(streamDate),
        coverImage: downloadURL,
        userId: user.uid,
        createdAt: Timestamp.now(),
        products: selectedProducts,
        useAllInventory: false
      });

      Alert.alert(
        'Scheduled!',
        `"${streamTitle}" has been scheduled for ${formatDateTime(streamDate)}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      console.error('Error scheduling stream:', e);
      Alert.alert('Oops', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductQueueConfirm = (products) => {
    setSelectedProducts(products);
    setShowProductQueue(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F9F9F9' }}>
     <CustomHeader
  title="Schedule Stream"
  showBack
      />
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <Text style={styles.sectionTitle}>Stream Title</Text>
          <TextInput
            style={styles.input}
            value={streamTitle}
            onChangeText={setStreamTitle}
            placeholder="Enter an engaging title for your stream"
            placeholderTextColor="#999"
            maxLength={50}
          />

          <Text style={styles.sectionTitle}>Description</Text>
          <TextInput
            style={[styles.input, styles.descriptionInput]}
            value={streamDescription}
            onChangeText={setStreamDescription}
            placeholder="Enter stream description (max 70 characters)"
            placeholderTextColor="#999"
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
              onPress={handleTimeButtonPress}
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
              onDismiss={handleTimePickerDismiss}
            />
          )}

          <Text style={styles.sectionTitle}>Schedule Thumbnail</Text>
          <TouchableOpacity
            style={[
              styles.thumbnailContainer,
              !thumbnailLocalUri && styles.thumbnailPlaceholder
            ]}
            onPress={pickThumbnail}
            disabled={isLoading}
          >
            {thumbnailLocalUri ? (
              <Image
                source={{ uri: thumbnailLocalUri }}
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
          <TouchableOpacity
            style={styles.productQueueButton}
            onPress={() => setShowProductQueue(true)}
          >
            <MaterialIcons name="queue" size={24} color="#213E4D" />
            <Text style={styles.productQueueText}>
              {selectedProducts.length > 0 
                ? `${selectedProducts.length} products selected`
                : 'Select Products'}
            </Text>
            <MaterialIcons name="chevron-right" size={24} color="#213E4D" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.confirm,
              (!streamTitle.trim() || !streamDescription.trim() || isLoading) && styles.buttonDisabled
            ]}
            onPress={handleSchedule}
            disabled={!streamTitle.trim() || !streamDescription.trim() || isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Scheduling...' : 'Schedule Stream'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.liveContainer}>
          <Text style={[styles.liveText, styles.noBottomMargin]}>
            Want to go live Now?
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('PreStreamSetup')}
          >
            <Text style={styles.buttonText}>Go Live Now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ScheduleProductQueue
        visible={showProductQueue}
        onClose={() => setShowProductQueue(false)}
        onConfirm={handleProductQueueConfirm}
        initialProducts={selectedProducts}
      />
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
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    flex: 1,
    marginHorizontal: 5,
  },
  dateTimeText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#2c3e50',
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
  },
  liveContainer: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 20
  },
  liveText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
    color: '#213E4D'
  },
  noBottomMargin: {
    marginBottom: 5
  },
  productQueueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F0F0',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 30,
    marginBottom: 20
  },
  productQueueText: {
    fontSize: 16,
    color: '#213E4D',
    flex: 1,
    marginLeft: 10
  }
});

export default ScheduleStreamScreen;
