// 🔒 Locked foundation + features: thumbnail upload, Stripe check, chat, product carousel, viewer count
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  PermissionsAndroid,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
  VideoSourceType,
} from 'react-native-agora';

const APP_ID = '262ef45d2c514a5ebb129a836c4bff93';
const TOKEN_SERVER_URL = 'https://us-central1-roundtwo-cc793.cloudfunctions.net/generateAgoraToken';

export default function GoLiveScreen() {
  const [joined, setJoined] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [thumbnailLocalUri, setThumbnailLocalUri] = useState(null);
  const [viewerCount, setViewerCount] = useState(0);
  const rtcEngineRef = useRef(null);
  const [carouselTimer, setCarouselTimer] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [muted, setMuted] = useState(false);
  const flatListRef = useRef();

  const auth = getAuth();
  const user = auth.currentUser;
  const navigation = useNavigation();
  const db = getFirestore();
  const channelName = user.uid;

  useEffect(() => {
    if (!joined || !carouselTimer || products.length === 0) return;

    const interval = setInterval(() => {
      setSelectedIndex(prevIndex => {
        const nextIndex = (prevIndex + 1) % products.length;
        const nextProduct = products[nextIndex];
        setSelectedProduct(nextProduct);

        setDoc(doc(db, 'livestreams', user.uid), {
          selectedProduct: nextProduct,
          carouselCountdown: carouselTimer,
        }, { merge: true }).catch((err) => {
          console.error('🔥 Failed to update Firestore with new product:', err);
        });

        return nextIndex;
      });
    }, carouselTimer * 1000);

    return () => clearInterval(interval);
  }, [carouselTimer, joined, selectedIndex, products]);

  useEffect(() => {
    fetchProducts();

    const unsubMessages = onSnapshot(
      collection(db, 'livestreams', channelName, 'messages'),
      (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMessages(msgs);
      }
    );

    const unsubViewers = onSnapshot(
      collection(db, 'livestreams', channelName, 'viewers'),
      (snapshot) => {
        setViewerCount(snapshot.size);
      }
    );

    return () => {
      rtcEngineRef.current?.leaveChannel();
      rtcEngineRef.current?.release();
      updateDoc(doc(db, 'livestreams', channelName), { isLive: false });
      unsubMessages();
      unsubViewers();
    };
  }, []);

  const fetchProducts = async () => {
    const q = query(collection(db, 'products'), where('sellerId', '==', user.uid));
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setProducts(items);
  };

  const pickThumbnail = async () => {
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

  const updateSelectedProduct = async (product) => {
    await setDoc(doc(db, 'livestreams', user.uid), { selectedProduct: product }, { merge: true });
    setSelectedProduct(product);
  };

  const toggleMute = () => {
    const engine = rtcEngineRef.current;
    engine.muteLocalAudioStream(!muted);
    setMuted(!muted);
  };

  const startLiveStream = async () => {
    if (!thumbnailLocalUri) {
      Alert.alert('Missing Thumbnail', 'Please upload a livestream thumbnail before going live.');
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const docSnapshot = await getDoc(userRef);
    const stripeAccountId = docSnapshot.data()?.stripeAccountId;
    if (!docSnapshot.exists() || !stripeAccountId) {
      Alert.alert('Complete Bank Info', 'You need to set up your bank account before going live.', [
        { text: 'Go to Payouts', onPress: () => navigation.navigate('PayoutScreen') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }

    const verifyRes = await fetch('https://us-central1-roundtwo-cc793.cloudfunctions.net/verifyStripeStatus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stripeAccountId }),
    });
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || verifyData?.error) {
      Alert.alert('Stripe Not Ready', 'Your Stripe account is not fully enabled for payouts and charges.');
      return;
    }

    const uid = Math.floor(Math.random() * 1000000);
    const tokenRes = await fetch(TOKEN_SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelName, uid }),
    });
    const { token } = await tokenRes.json();

    if (Platform.OS === 'android') {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ]);
    }

    const engine = createAgoraRtcEngine();
    rtcEngineRef.current = engine;
    engine.initialize({ appId: APP_ID, channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting });
    engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
    engine.enableVideo();
    engine.startPreview();
    engine.setupLocalVideo({ uid: 0, sourceType: VideoSourceType.VideoSourceCamera });

    await setDoc(doc(db, 'livestreams', user.uid), {
      streamer: user.displayName || 'Streamer',
      channel: channelName,
      broadcasterUid: uid,
      thumbnailUrl: await uploadThumbnail(),
      viewers: 0,
      isLive: true,
      createdAt: serverTimestamp(),
    });

    engine.joinChannel(token, channelName, uid, {
      channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
      clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      publishMicrophoneTrack: true,
      publishCameraTrack: true,
      autoSubscribeAudio: true,
      autoSubscribeVideo: true,
    });

    setJoined(true);
  };

  return (
    <View style={styles.container}>
      {carouselTimer && (
        <Text style={{
          position: 'absolute',
          bottom: 160,
          left: 10,
          color: '#fff',
          backgroundColor: '#111',
          padding: 6,
          borderRadius: 6,
          zIndex: 10,
        }}>
          ⏱ Auto-rotate: {carouselTimer}s
        </Text>
      )}
      {!joined ? (
        <>
          <TouchableOpacity style={styles.thumbnailButton} onPress={pickThumbnail}>
            <Text style={styles.thumbnailText}>📸 Select Thumbnail (Required)</Text>
          </TouchableOpacity>

          {thumbnailLocalUri && (
            <Image
              source={{ uri: thumbnailLocalUri }}
              style={{ width: 200, height: 200, marginBottom: 20, alignSelf: 'center' }}
            />
          )}

          <TouchableOpacity style={styles.startButton} onPress={startLiveStream}>
            <Text style={styles.startText}>📡 Start Live Stream</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <RtcSurfaceView style={styles.video} canvas={{ uid: 0, sourceType: VideoSourceType.VideoSourceCamera }} />

          <Text style={styles.viewerCount}>👁️ {viewerCount} watching</Text>

          <FlatList
            ref={flatListRef}
            data={messages.slice(-4)}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Text style={styles.message}>{item.sender}: {item.text}</Text>
            )}
            style={styles.chatOverlay}
          />

          <TouchableOpacity
            style={styles.optionsButton}
            onPress={() => setOptionsVisible(true)}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>⚙️ Options</Text>
          </TouchableOpacity>

          <Modal visible={optionsVisible} transparent animationType="slide">
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ backgroundColor: '#111', padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
          {/* Rotate Options */}
          <Text style={styles.carouselCountdownLabel}>⏱ Rotate every:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {[
              { label: 'Off', value: null },
              { label: '15s', value: 15 },
              { label: '30s', value: 30 },
              { label: '1m', value: 60 },
              { label: '2m', value: 120 },
              { label: '3m', value: 180 },
              { label: '5m', value: 300 },
              { label: '10m', value: 600 },
            ].map(option => (
              <TouchableOpacity
                key={option.label}
                onPress={() => {
                  setCarouselTimer(option.value);
                  setOptionsVisible(false);
                }}
                style={{
                  backgroundColor: carouselTimer === option.value ? '#444' : '#222',
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  marginRight: 8,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: '#fff' }}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* 🎤 Mute/Unmute Button */}
          <TouchableOpacity onPress={toggleMute} style={{ marginTop: 20 }}>
            <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center' }}>
              {muted ? '🔇 Unmute Mic' : '🎤 Mute Mic'}
            </Text>
          </TouchableOpacity>

          {/* Close Options Tab */}
          <TouchableOpacity onPress={() => setOptionsVisible(false)}>
            <Text style={{ color: '#fff', marginTop: 20, textAlign: 'center' }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            horizontal
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.productCard, item.id === selectedProduct?.id && { borderColor: 'blue', borderWidth: 2 }]}
                onPress={() => updateSelectedProduct(item)}
              >
                <Image source={{ uri: item.images?.[0] }} style={styles.productImage} />
                <Text style={styles.productTitle}>{item.title}</Text>
                <Text style={styles.productPrice}>${item.fullPrice}</Text>
                <Text style={styles.productQty}>Qty: {item.groupAmount}</Text>
              </TouchableOpacity>
            )}
            style={styles.carousel}
          />

          {selectedProduct && (
            <View style={styles.selectedProduct}>
            {carouselTimer && (
              <Text style={{
                position: 'absolute',
                bottom: 160,
                left: 10,
                color: '#fff',
                backgroundColor: '#111',
                padding: 6,
                borderRadius: 6,
                zIndex: 999
              }}>
                ⏱ Auto-rotate: {carouselTimer}s
              </Text>
            )}
              <Text style={styles.productTitle}>{selectedProduct.title}</Text>
              <Text style={styles.productPrice}>${selectedProduct.fullPrice}</Text>
              <Text style={styles.productQty}>Qty: {selectedProduct.groupAmount}</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1 },
  startButton: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#fff',
    alignSelf: 'center',
    borderRadius: 12,
  },
  startText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
  thumbnailButton: {
    marginTop: 100,
    padding: 14,
    backgroundColor: '#eee',
    alignSelf: 'center',
    borderRadius: 12,
  },
  thumbnailText: { color: '#333', fontWeight: '600' },
  viewerCount: {
    position: 'absolute',
    top: 40,
    left: 20,
    color: '#fff',
    fontSize: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  chatOverlay: {
    position: 'absolute',
    bottom: 270,
    left: 10,
    right: 10,
    maxHeight: 200,
    paddingHorizontal: 10,
    zIndex: 20,

  },
  message: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 4,
    borderRadius: 5,
  },
  carousel: {
    position: 'absolute',
    bottom: 110,
    paddingLeft: 10,
  },
  productCard: {
    marginRight: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    width: 140,
    alignItems: 'center',
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginBottom: 8,
  },
  productTitle: { fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  productPrice: { fontSize: 14, color: '#555' },
  productQty: { fontSize: 14, color: '#999' },
  selectedProduct: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    backgroundColor: '#1e1e1e',
    padding: 10,
    borderRadius: 10,
  },
  carouselCountdownLabel: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  carouselCountdownPicker: {
    height: 40,
    color: '#fff',
    backgroundColor: '#222',
  },
  optionsButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: '#333',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});