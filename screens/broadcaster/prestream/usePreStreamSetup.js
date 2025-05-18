import { useState, useEffect } from 'react';
import { Alert, Platform, PermissionsAndroid } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, doc, setDoc, serverTimestamp, getDoc, collection, query, where, getDocs, updateDoc, Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { createAgoraRtcEngine, ChannelProfileType, ClientRoleType, VideoSourceType } from 'react-native-agora';
import { APP_ID, TOKEN_SERVER_URL } from './constants';
import { useNavigation } from '@react-navigation/native';

export function usePreStreamSetup() {
  const navigation = useNavigation();
  const [thumbnailLocalUri, setThumbnailLocalUri] = useState(null);
  const [streamTitle, setStreamTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scheduledStreams, setScheduledStreams] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [useAllInventory, setUseAllInventory] = useState(false);
  const [selectedStream, setSelectedStream] = useState(null);
  const auth = getAuth();
  const user = auth.currentUser;
  const db = getFirestore();
  const channelName = user?.uid;

  useEffect(() => {
    fetchScheduledStreams();
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const productsQuery = query(
        collection(db, 'products'),
        where('sellerId', '==', user.uid)
      );
      const snapshot = await getDocs(productsQuery);
      const productsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsList);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchScheduledStreams = async () => {
    try {
      const now = Timestamp.now();
      const streamsQuery = query(
        collection(db, 'scheduledStreams'),
        where('userId', '==', user.uid),
        where('date', '>=', now)
      );
      const snapshot = await getDocs(streamsQuery);
      const streams = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setScheduledStreams(streams);
    } catch (error) {
      console.error('Error fetching scheduled streams:', error);
    }
  };

  const selectScheduledStream = (stream) => {
    setStreamTitle(stream.title || '');
    setSelectedStream(stream);
    setSelectedProducts(Array.isArray(stream.products) ? stream.products : []);
    setUseAllInventory(stream.useAllInventory || false);
    setShowDropdown(false);
  };

  const toggleProductSelection = (productId) => {
    if (!productId) return;
    
    setSelectedProducts(prev => {
      const currentSelection = Array.isArray(prev) ? prev : [];
      if (currentSelection.includes(productId)) {
        return currentSelection.filter(id => id !== productId);
      } else {
        return [...currentSelection, productId];
      }
    });
  };

  const toggleUseAllInventory = () => {
    setUseAllInventory(prev => !prev);
    if (!useAllInventory) {
      setSelectedProducts([]);
    }
  };

  const pickThumbnail = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to make this work!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
      });

      if (!result.canceled) {
        setThumbnailLocalUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking thumbnail:', error);
    }
  };

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
    const streamData = {
      streamer: docSnapshot.data()?.username || user.email.split('@')[0] || 'Streamer',
      channel: channelName,
      broadcasterUid: uid,
      firebaseUid: user.uid,
      thumbnailUrl,
      title: streamTitle,
      viewers: 0,
      isLive: true,
      createdAt: serverTimestamp(),
      useAllInventory,
      products: useAllInventory ? [] : (Array.isArray(selectedProducts) ? selectedProducts : [])
    };

    await setDoc(doc(db, 'livestreams', user.uid), streamData);

    setIsLoading(false);
    navigation.replace('BroadcasterScreen', { channelName, broadcasterUid: uid, token });
  };

  // Filter products based on selected stream
  const filteredProducts = selectedStream?.products 
    ? products.filter(product => selectedStream.products.includes(product.id))
    : products;

  return {
    thumbnailLocalUri,
    streamTitle,
    isLoading,
    setStreamTitle,
    pickThumbnail,
    startLiveStream,
    scheduledStreams,
    showDropdown,
    setShowDropdown,
    selectScheduledStream,
    products: filteredProducts,
    selectedProducts,
    useAllInventory,
    toggleProductSelection,
    toggleUseAllInventory,
    setSelectedProducts
  };
}
