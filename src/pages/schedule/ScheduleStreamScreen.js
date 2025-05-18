// screens/ScheduleStreamScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  TextInput,
  Alert
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import CustomHeader from '../components/CustomHeader';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';
import { auth } from '../firebaseConfig';

const db = getFirestore();
const storage = getStorage();

const ScheduleStreamScreen = ({ navigation }) => {
  const [streamTitle, setStreamTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [thumbnailLocalUri, setThumbnailLocalUri] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canConfirm = streamTitle.trim().length > 0 && !!thumbnailLocalUri && !isSubmitting;

  const onChange = (_, selectedDate) => {
    setShowPicker(false);
    if (selectedDate) setDate(selectedDate);
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

  const confirmSchedule = async () => {
    if (!canConfirm || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to schedule a stream');
        return;
      }
  
      // Fetch the user's username from Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      const username = userDocSnap.exists() ? userDocSnap.data().username || '' : '';
  
      let downloadURL = null;
      if (thumbnailLocalUri) {
        const response = await fetch(thumbnailLocalUri);
        const blob = await response.blob();
        const fileRef = storageRef(storage, `thumbnails/${Date.now()}.jpg`);
        await uploadBytes(fileRef, blob);
        downloadURL = await getDownloadURL(fileRef);
      }
  
      const streamDate = Timestamp.fromDate(date);
      console.log('Saving stream with date:', streamDate.toDate().toISOString());
  
      await addDoc(collection(db, 'scheduledStreams'), {
        title: streamTitle,
        date: streamDate,
        coverImage: downloadURL,
        createdAt: serverTimestamp(),
        userId: user.uid,
        username // ✅ Added here
      });
  
      Alert.alert(
        'Scheduled!',
        `"${streamTitle}" is set for ${formatDateTime(date)}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      console.error('Error scheduling stream:', e);
      Alert.alert('Oops', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F9F9F9' }}>
      <CustomHeader title="Schedule Your Show" showBack />
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Stream Title</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your stream title"
          value={streamTitle}
          onChangeText={setStreamTitle}
        />

        <Text style={styles.sectionTitle}>Pick Date & Time</Text>
        <TouchableOpacity
          style={styles.calButton}
          onPress={() => setShowPicker(true)}
        >
          <MaterialIcons name="event" size={24} color="#213E4D" />
          <Text style={styles.calButtonText}>{formatDateTime(date)}</Text>
        </TouchableOpacity>
        {showPicker && (
          <DateTimePicker
            value={date}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={onChange}
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
          onPress={() => navigation.navigate('ScheduleProductQueue')}
        >
          <MaterialIcons name="queue" size={24} color="#213E4D" />
          <Text style={styles.productQueueText}>View Product Queue</Text>
          <MaterialIcons name="chevron-right" size={24} color="#213E4D" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.confirm,
            !canConfirm && styles.buttonDisabled
          ]}
          onPress={confirmSchedule}
          disabled={!canConfirm || isSubmitting}
        >
          <Text style={styles.buttonText}>
            {isSubmitting ? 'Scheduling...' : 'Confirm Schedule'}
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
    </View>
  );
};

const styles = StyleSheet.create({
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
  calButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 30,
    marginBottom: 20
  },
  calButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#213E4D',
    fontWeight: '600'
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
    alignItems: 'center'
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
