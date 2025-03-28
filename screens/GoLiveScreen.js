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
} from 'react-native';
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
} from 'react-native-agora';
import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../firebaseConfig';

const APP_ID = '262ef45d2c514a5ebb129a836c4bff93';

export default function GoLiveScreen() {
  const [joined, setJoined] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [messages, setMessages] = useState([]);

  const rtcEngineRef = useRef(null);
  const auth = getAuth();
  const user = auth.currentUser;
  const channelName = user?.uid || 'livestream';

  useEffect(() => {
    const init = async () => {
      try {
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

        engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
        engine.enableVideo();
        engine.startPreview();

        engine.registerEventHandler({
          onJoinChannelSuccess: (connection, uid) => {
            console.log('✅ Joined channel', connection.channelId, uid);
            setJoined(true);
          },
          onError: (err) => {
            console.log('❌ Agora error:', err);
          },
        });

        setEngineReady(true);
      } catch (err) {
        console.error('Error initializing Agora:', err);
      }
    };

    init();
    fetchProducts();

    const unsubMessages = onSnapshot(
      collection(db, 'livestreams', channelName, 'messages'),
      (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMessages(msgs);
      }
    );

    return () => {
      if (rtcEngineRef.current) {
        rtcEngineRef.current.leaveChannel();
        rtcEngineRef.current.release();
        rtcEngineRef.current = null;
      }
      if (user) {
        updateDoc(doc(db, 'livestreams', user.uid), { isLive: false });
      }
      unsubMessages();
    };
  }, []);

  const fetchProducts = async () => {
    if (!user) return;
    const q = query(collection(db, 'products'), where('sellerId', '==', user.uid));
    const querySnapshot = await getDocs(q);
    const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setProducts(items);
  };

  const updateSelectedProduct = async (product) => {
    if (!user) return;
    await setDoc(doc(db, 'livestreams', user.uid), {
      selectedProduct: product,
    }, { merge: true });
    setSelectedProduct(product);
  };

  const startLiveStream = async () => {
    if (!engineReady || !rtcEngineRef.current || !user) return;
    await setDoc(
      doc(db, 'livestreams', user.uid),
      {
        streamer: user.displayName || 'Streamer',
        channel: user.uid,
        thumbnailUrl: 'https://link-to-thumbnail',
        viewers: 0,
        isLive: true,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
    rtcEngineRef.current.joinChannel('', channelName, 0, {});
  };

  const renderProductItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.productCard,
        item.id === selectedProduct?.id && { borderColor: 'blue', borderWidth: 2 },
      ]}
      onPress={() => updateSelectedProduct(item)}
    >
      <Image source={{ uri: item.images?.[0] }} style={styles.productImage} />
      <Text style={styles.productTitle}>{item.title}</Text>
      <Text style={styles.productPrice}>${item.fullPrice}</Text>
      <Text style={styles.productQty}>Qty: {item.groupAmount}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {!joined ? (
        <TouchableOpacity style={styles.startButton} onPress={startLiveStream}>
          <Text style={styles.startText}>📡 Start Live Stream</Text>
        </TouchableOpacity>
      ) : (
        <>
          <RtcSurfaceView
            style={styles.video}
            canvas={{ uid: 0, renderMode: 1 }}
          />

          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Text style={styles.message}>{item.sender}: {item.text}</Text>
            )}
            style={styles.chatOverlay}
          />

          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            horizontal
            renderItem={renderProductItem}
            style={styles.carousel}
          />

          {selectedProduct && (
            <View style={styles.selectedProduct}>
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
    marginTop: 100,
    padding: 20,
    backgroundColor: '#2196F3',
    alignSelf: 'center',
    borderRadius: 12,
  },
  startText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  chatOverlay: {
    position: 'absolute',
    top: 60,
    left: 10,
    right: 10,
    maxHeight: 200,
    paddingHorizontal: 10,
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
    borderRadius: 10,
    padding: 10,
    width: 120,
    alignItems: 'center',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 6,
  },
  productTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  productPrice: { fontSize: 12, color: '#555' },
  productQty: { fontSize: 12, color: '#999' },
  selectedProduct: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    backgroundColor: '#1e1e1e',
    padding: 10,
    borderRadius: 10,
  },
});
