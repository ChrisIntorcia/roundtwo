// 🔒 This ViewerScreen preserves the locked foundation (dynamic UID, token-based auth, viewer role)
// ✅ Adds: Real-time chat overlay, chat input, product display, Stripe checkout, confetti, purchase logging

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
  VideoSourceType,
} from 'react-native-agora';
import { doc, getDoc, getFirestore, onSnapshot, collection, query, orderBy, addDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { initStripe, presentPaymentSheet } from '@stripe/stripe-react-native';

const APP_ID = '262ef45d2c514a5ebb129a836c4bff93';
const TOKEN_SERVER_URL = 'https://us-central1-roundtwo-cc793.cloudfunctions.net/generateAgoraToken';

export default function ViewerScreen({ route }) {
  const { channel } = route.params;
  const [remoteUid, setRemoteUid] = useState(null);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [purchaseBanner, setPurchaseBanner] = useState(null);

  const rtcEngineRef = useRef(null);
  const db = getFirestore();
  const auth = getAuth();

  useEffect(() => {
    initStripe({ publishableKey: 'pk_test_51LLWUzBDUXSD1c3FLs6vIFKT9eyd0O3ex9yA13jcaDhUJFcabm5VZkPZfCc7rikCWyTeVjZlM7dHXm10IlhoQBKG00g4SsRQfr' });
  }, []);

  useEffect(() => {
    const startViewing = async () => {
      try {
        const streamDoc = await getDoc(doc(db, 'livestreams', channel));
        if (!streamDoc.exists()) return;

        const broadcasterUid = streamDoc.data()?.broadcasterUid;
        const viewerUid = Math.floor(Math.random() * 1000000);

        const tokenRes = await fetch(TOKEN_SERVER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelName: channel, uid: viewerUid }),
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

        engine.initialize({
          appId: APP_ID,
          channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
        });

        engine.setClientRole(ClientRoleType.ClientRoleAudience);
        engine.enableVideo();

        engine.registerEventHandler({
          onJoinChannelSuccess: () => setJoined(true),
          onUserJoined: (connection, uid) => setRemoteUid(uid),
          onUserOffline: () => setRemoteUid(null),
          onError: (err) => console.log('🚨 Agora Error:', err),
        });

        engine.joinChannel(token, channel, viewerUid, {
          channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
          clientRoleType: ClientRoleType.ClientRoleAudience,
          publishCameraTrack: false,
          publishMicrophoneTrack: false,
          autoSubscribeAudio: true,
          autoSubscribeVideo: true,
        });

        setLoading(false);
      } catch (err) {
        console.error('🔥 Error joining channel:', err);
      }
    };

    startViewing();

    return () => {
      rtcEngineRef.current?.leaveChannel();
      rtcEngineRef.current?.release();
    };
  }, []);

  useEffect(() => {
    const unsubProduct = onSnapshot(doc(db, 'livestreams', channel), (docSnap) => {
      if (docSnap.exists()) {
        setSelectedProduct(docSnap.data().selectedProduct || null);
      }
    });

    const chatQuery = query(
      collection(db, 'livestreams', channel, 'messages'),
      orderBy('createdAt')
    );
    const unsubChat = onSnapshot(chatQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });

    return () => {
      unsubProduct();
      unsubChat();
    };
  }, [channel]);

  const sendMessage = async () => {
    const user = auth.currentUser;
    if (!chatInput.trim() || !user) return;
    await addDoc(collection(db, 'livestreams', channel, 'messages'), {
      text: chatInput,
      sender: user.displayName || 'Viewer',
      createdAt: new Date(),
    });
    setChatInput('');
  };

  const handleBuy = async () => {
    const user = auth.currentUser;
    if (!user || !selectedProduct) return;

    try {
      const sellerRef = doc(db, 'users', selectedProduct.sellerId);
      const sellerSnap = await getDoc(sellerRef);
      const stripeAccountId = sellerSnap.data()?.stripeAccountId;
      if (!stripeAccountId) return Alert.alert('Seller Error', 'Seller is not set up to receive payments.');

      const res = await fetch('https://us-central1-roundtwo-cc793.cloudfunctions.net/createPaymentIntent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(parseFloat(selectedProduct.fullPrice) * 100),
          stripeAccountId,
          buyerEmail: user.email,
          application_fee_amount: 100,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed.');

      await addDoc(collection(db, 'purchases'), {
        product: selectedProduct.title,
        price: parseFloat(selectedProduct.fullPrice),
        buyer: user.email,
        seller: selectedProduct.sellerId,
        createdAt: new Date(),
      });

      setPurchaseBanner(`${user.displayName || user.email} purchased ${selectedProduct.title}`);
      setShowConfetti(true);
      setTimeout(() => setPurchaseBanner(null), 4000);
      Alert.alert('✅ Success', 'Purchase complete!');
    } catch (error) {
      console.error('🔥 handleBuy error:', error);
      Alert.alert('Error', error.message || 'Something went wrong');
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      {joined && remoteUid ? (
        <RtcSurfaceView
          style={styles.video}
          canvas={{ uid: remoteUid, sourceType: VideoSourceType.VideoSourceRemote }}
        />
      ) : (
        <Text style={styles.infoText}>Waiting for stream to start...</Text>
      )}

      <View style={styles.chatOverlay}>
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Text style={styles.chatMessage}>
              <Text style={{ fontWeight: 'bold' }}>{item.sender}: </Text>
              {item.text}
            </Text>
          )}
        />
      </View>

      <View style={styles.chatInputWrapper}>
        <TextInput
          value={chatInput}
          onChangeText={setChatInput}
          placeholder="Say something..."
          placeholderTextColor="#aaa"
          style={styles.chatInput}
        />
        <TouchableOpacity onPress={sendMessage}>
          <Text style={styles.sendButton}>Send</Text>
        </TouchableOpacity>
      </View>

      {selectedProduct && (
        <View style={styles.productPanel}>
          <Image source={{ uri: selectedProduct.images?.[0] }} style={styles.productImage} />
          <View style={styles.productDetails}>
            <Text style={styles.productTitle}>{selectedProduct.title}</Text>
            <Text style={styles.productPrice}>${Number(selectedProduct.fullPrice || 0).toFixed(2)}</Text>
            <Text style={styles.productMeta}>{selectedProduct.groupAmount} in stock</Text>
          </View>
          <TouchableOpacity style={styles.buyButton} onPress={handleBuy}>
            <Text style={styles.buyText}>Buy →</Text>
          </TouchableOpacity>
        </View>
      )}

      {showConfetti && (
        <ConfettiCannon count={80} origin={{ x: Dimensions.get('window').width / 2, y: 0 }} fadeOut />
      )}

      {purchaseBanner && (
        <View style={styles.purchaseBanner}>
          <Text style={styles.purchaseBannerText}>{purchaseBanner}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1 },
  infoText: { color: '#fff', textAlign: 'center', marginTop: 50 },
  chatOverlay: {
    position: 'absolute',
    top: 80,
    left: 10,
    right: 10,
    maxHeight: '30%',
    paddingHorizontal: 5,
  },
  chatMessage: {
    color: '#fff',
    marginBottom: 4,
    fontSize: 14,
  },
  chatInputWrapper: {
    position: 'absolute',
    bottom: 140,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1c',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chatInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 4,
  },
  sendButton: {
    color: '#FFD700',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  productPanel: {
    position: 'absolute',
    bottom: 60,
    left: 10,
    right: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
  },
  productDetails: {
    flex: 1,
  },
  productTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  productPrice: {
    color: '#fff',
    fontSize: 13,
    marginTop: 2,
  },
  productMeta: {
    color: '#ccc',
    fontSize: 11,
    marginTop: 2,
  },
  buyButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  buyText: {
    color: '#000',
    fontWeight: 'bold',
  },
  purchaseBanner: {
    position: 'absolute',
    top: 40,
    alignSelf: 'center',
    backgroundColor: '#222',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  purchaseBannerText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
