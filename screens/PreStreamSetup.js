import CustomHeader from "../components/CustomHeader";
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

const APP_ID = '262ef45d2c514a5ebb129a836c4bff93';
const TOKEN_SERVER_URL = 'https://us-central1-roundtwo-cc793.cloudfunctions.net/generateAgoraToken';

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
      Alert.alert('Stripe Not Ready', 'Your Stripe account is not fully enabled for payouts and charges.');
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

    await setDoc(doc(db, 'livestreams', user.uid), {
      streamer: user.displayName || 'Streamer',
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
        <CustomHeader title="Go Live Setup" showBack={true} />
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Stream Title</Text>
            <TextInput
  placeholder="Enter stream title"
  value={streamTitle}
  autoCapitalize="characters"
  onChangeText={(text) => setStreamTitle(text.toUpperCase())}
  style={styles.input}
/>
            <Text style={styles.sectionTitle}>Thumbnail</Text>
            <TouchableOpacity style={styles.actionButton} onPress={pickThumbnail} disabled={isLoading}>
              <Text style={styles.buttonText}>Select Thumbnail</Text>
            </TouchableOpacity>

            {thumbnailLocalUri && (
              <View style={styles.thumbnailWrapper}>
                <Image source={{ uri: thumbnailLocalUri }} style={styles.thumbnailPreview} />
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => setThumbnailLocalUri(null)}
                >
                  <Text style={styles.deleteButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.goLiveButton} onPress={startLiveStream} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Start Live Stream</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  safeArea: { flexGrow: 1, backgroundColor: '#f5f5f5' },
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  goLiveButton: {
    backgroundColor: '#28a745',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  thumbnailWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  thumbnailPreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    borderRadius: 12,
  },
  deleteButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff4444',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
});
