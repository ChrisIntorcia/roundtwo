import CustomHeader from "../../components/CustomHeader";
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  VideoSourceType,
} from 'react-native-agora';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { MaterialIcons } from '@expo/vector-icons';

const APP_ID = '262ef45d2c514a5ebb129a836c4bff93';
const TOKEN_SERVER_URL = 'https://us-central1-roundtwo-cc793.cloudfunctions.net/generateAgoraToken';

const { width } = Dimensions.get('window');
const CARD_PADDING = 20;
const THUMBNAIL_SIZE = width - (CARD_PADDING * 4);

export default function PreStreamSetup() {
  const [thumbnailLocalUri, setThumbnailLocalUri] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const auth = getAuth();
  const user = auth.currentUser;
  const db = getFirestore();
  const navigation = useNavigation();
  const channelName = user?.uid;
  const [streamTitle, setStreamTitle] = useState('');

  const pickThumbnail = async () => {
    if (isLoading) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setThumbnailLocalUri(result.assets[0].uri);
    }
  };

  const uploadThumbnail = async () => {
    const response = await fetch(thumbnailLocalUri);
    const blob = await response.blob();
    const storageRef = ref(getStorage(), `thumbnails/${user.uid}_${Date.now()}.jpg`);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const startLiveStream = async () => {
    if (isLoading) return;
    setIsLoading(true);

    if (!thumbnailLocalUri) {
      Alert.alert('Missing Thumbnail', 'Please upload a livestream thumbnail before going live.');
      setIsLoading(false);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const docSnapshot = await getDoc(userRef);

    if (!docSnapshot.exists()) {
      Alert.alert('Complete Bank Info', 'You need to set up your bank account before going live.', [
        { text: 'Go to Payouts', onPress: () => navigation.replace('PayoutScreen') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      setIsLoading(false);
      return;
    }

    const stripeAccountId = docSnapshot.data()?.stripeAccountId;

    if (!stripeAccountId) {
      Alert.alert('Complete Bank Info', 'You need to set up your bank account before going live.', [
        { text: 'Go to Payouts', onPress: () => navigation.replace('PayoutScreen') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      setIsLoading(false);
      return;
    }

    let verifyData;
    try {
      const verifyRes = await fetch('https://us-central1-roundtwo-cc793.cloudfunctions.net/verifyStripeStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stripeAccountId }),
      });
      verifyData = await verifyRes.json();
      if (!verifyRes.ok || verifyData?.error) {
        throw new Error();
      }
    } catch {
      Alert.alert(
        'Stripe Not Ready',
        'Your Stripe account is not fully enabled for payouts and charges.',
        [
          { text: 'Go to Payouts', onPress: () => navigation.replace('PayoutScreen') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      setIsLoading(false);
      return;      
    }

    const uid = Math.floor(Math.random() * 1000000);

    let token;
    try {
      const tokenRes = await fetch(TOKEN_SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelName, uid }),
      });
      const tokenData = await tokenRes.json();
      token = tokenData.token;
    } catch {
      Alert.alert('Token Error', 'Failed to retrieve Agora token.');
      setIsLoading(false);
      return;
    }

    if (Platform.OS === 'android') {
      const camera = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
      const mic = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (camera !== PermissionsAndroid.RESULTS.GRANTED || mic !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permissions Required', 'Camera and microphone permissions are required to go live.');
        setIsLoading(false);
        return;
      }
    }

    const engine = createAgoraRtcEngine();
    await engine.initialize({ appId: APP_ID, channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting });
    await engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
    await engine.enableVideo();
    await engine.startPreview();
    await engine.setupLocalVideo({ uid: 0, sourceType: VideoSourceType.VideoSourceCamera });

    const thumbnailUrl = await uploadThumbnail();
    const userData = docSnapshot.data();

    await setDoc(doc(db, 'livestreams', user.uid), {
      streamer: userData?.username || user.email.split('@')[0] || 'Streamer',
      channel: channelName,
      broadcasterUid: uid,
      firebaseUid: user.uid,
      thumbnailUrl,
      title: streamTitle,
      viewers: 0,
      isLive: true,
      createdAt: serverTimestamp(),
    });

    setIsLoading(false);
    navigation.replace('BroadcasterScreen', {
      channelName,
      broadcasterUid: uid,
      token,
    });
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.safeArea}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
      >
        <CustomHeader title="Show Setup" showBack={true} />
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Stream Title</Text>
            <TextInput
              placeholder="Enter an engaging title for your stream"
              value={streamTitle}
              onChangeText={(text) => {
                const capitalized = text
                  .toLowerCase()
                  .split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
                setStreamTitle(capitalized);
              }}
              style={styles.input}
              placeholderTextColor="#999"
              maxLength={50}
            />
            
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
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.uploadPrompt}>
                  <MaterialIcons name="add-photo-alternate" size={40} color="#666" />
                  <Text style={styles.uploadText}>Upload Thumbnail</Text>
                  <Text style={styles.uploadSubtext}>Tap to choose an image</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.startButton,
                (isLoading || !thumbnailLocalUri) && styles.startButtonDisabled
              ]}
              onPress={startLiveStream}
              disabled={isLoading || !thumbnailLocalUri}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.loadingText}>Preparing Stream...</Text>
                </View>
              ) : (
                <>
                  <MaterialIcons name="live-tv" size={24} color="#fff" />
                  <Text style={styles.startButtonText}>Go Live</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flexGrow: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    padding: CARD_PADDING,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: CARD_PADDING,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  thumbnailContainer: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE * 9/16,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
  },
  thumbnailPlaceholder: {
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  uploadPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 10,
  },
  uploadSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  startButtonDisabled: {
    backgroundColor: '#a5d6a7',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
});
