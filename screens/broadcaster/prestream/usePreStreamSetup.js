import { useState } from 'react';
import { Alert, Platform, PermissionsAndroid } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { createAgoraRtcEngine, ChannelProfileType, ClientRoleType, VideoSourceType } from 'react-native-agora';
import { APP_ID, TOKEN_SERVER_URL } from './constants';

export function usePreStreamSetup(navigation) {
  const [thumbnailLocalUri, setThumbnailLocalUri] = useState(null);
  const [streamTitle, setStreamTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const auth = getAuth();
  const user = auth.currentUser;
  const db = getFirestore();
  const channelName = user?.uid;

  async function pickThumbnail() {
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
  }

  async function uploadThumbnail() {
    const response = await fetch(thumbnailLocalUri);
    const blob = await response.blob();
    const storageRef = ref(
      getStorage(),
      `thumbnails/${user.uid}_${Date.now()}.jpg`
    );
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  }

  async function startLiveStream() {
    if (isLoading) return;
    setIsLoading(true);

    if (!thumbnailLocalUri) {
      Alert.alert('Missing Thumbnail', 'Please upload a livestream thumbnail before going live.');
      setIsLoading(false);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const docSnapshot = await getDoc(userRef);
    if (!docSnapshot.exists() || !docSnapshot.data()?.stripeAccountId) {
      Alert.alert(
        'Complete Bank Info',
        'You need to set up your bank account before going live.',
        [
          { text: 'Go to Payouts', onPress: () => navigation.replace('PayoutScreen') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      setIsLoading(false);
      return;
    }

    try {
      const verifyRes = await fetch(
        'https://us-central1-roundtwo-cc793.cloudfunctions.net/verifyStripeStatus',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stripeAccountId: docSnapshot.data().stripeAccountId }),
        }
      );
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || verifyData?.error) throw new Error();
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
      token = (await tokenRes.json()).token;
    } catch {
      Alert.alert('Token Error', 'Failed to retrieve Agora token.');
      setIsLoading(false);
      return;
    }

    if (Platform.OS === 'android') {
      const cameraPerm = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA
      );
      const micPerm = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      if (
        cameraPerm !== PermissionsAndroid.RESULTS.GRANTED ||
        micPerm !== PermissionsAndroid.RESULTS.GRANTED
      ) {
        Alert.alert(
          'Permissions Required',
          'Camera and microphone permissions are required to go live.'
        );
        setIsLoading(false);
        return;
      }
    }

    const engine = createAgoraRtcEngine();
    await engine.initialize({
      appId: APP_ID,
      channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
    });
    await engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
    await engine.enableVideo();
    await engine.startPreview();
    await engine.setupLocalVideo({ uid: 0, sourceType: VideoSourceType.VideoSourceCamera });

    const thumbnailUrl = await uploadThumbnail();
    await setDoc(doc(db, 'livestreams', user.uid), {
      streamer: docSnapshot.data()?.username || user.email.split('@')[0] || 'Streamer',
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
    navigation.replace('BroadcasterScreen', { channelName, broadcasterUid: uid, token });
  }

  return {
    thumbnailLocalUri,
    streamTitle,
    isLoading,
    setStreamTitle,
    pickThumbnail,
    startLiveStream,
  };
}
