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
  ActivityIndicator
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import CustomHeader from '../components/CustomHeader';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { auth } from '../firebaseConfig';

const db = getFirestore();
const storage = getStorage();

const EditScheduledStream = ({ route, navigation }) => {
  const { streamId } = route.params;
  const [streamTitle, setStreamTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [thumbnailLocalUri, setThumbnailLocalUri] = useState(null);
  const [originalThumbnailUrl, setOriginalThumbnailUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchStreamData();
  }, []);

  const fetchStreamData = async () => {
    try {
      const streamDoc = await getDoc(doc(db, 'scheduledStreams', streamId));
      if (streamDoc.exists()) {
        const data = streamDoc.data();
        setStreamTitle(data.title);
        setDate(data.date.toDate());
        if (data.coverImage) {
          setThumbnailLocalUri(data.coverImage);
          setOriginalThumbnailUrl(data.coverImage);
        }
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching stream:', error);
      Alert.alert('Error', 'Failed to load stream data');
      navigation.goBack();
    }
  };

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

  const confirmEdit = async () => {
    if (!streamTitle.trim()) {
      Alert.alert('Error', 'Please enter a stream title');
      return;
    }

    setIsSaving(true);
    try {
      let downloadURL = originalThumbnailUrl;

      // If thumbnail was changed, upload the new one
      if (thumbnailLocalUri && thumbnailLocalUri !== originalThumbnailUrl) {
        const response = await fetch(thumbnailLocalUri);
        const blob = await response.blob();
        const fileRef = storageRef(storage, `thumbnails/${Date.now()}.jpg`);
        await uploadBytes(fileRef, blob);
        downloadURL = await getDownloadURL(fileRef);

        // Delete old thumbnail if it exists
        if (originalThumbnailUrl) {
          try {
            const oldRef = storageRef(storage, originalThumbnailUrl);
            await deleteObject(oldRef);
          } catch (error) {
            console.error('Error deleting old thumbnail:', error);
          }
        }
      }

      await updateDoc(doc(db, 'scheduledStreams', streamId), {
        title: streamTitle,
        date: Timestamp.fromDate(date),
        coverImage: downloadURL
      });

      Alert.alert(
        'Updated!',
        'Stream has been updated successfully.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      console.error('Error updating stream:', e);
      Alert.alert('Oops', 'Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#213E4D" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F9F9F9' }}>
      <CustomHeader title="Edit Stream" showBack />
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
        <Text style={styles.sectionTitle}>Stream Thumbnail</Text>
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

        <TouchableOpacity
          style={[styles.button, styles.confirm]}
          onPress={confirmEdit}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Save Changes</Text>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16
  }
});

export default EditScheduledStream; 