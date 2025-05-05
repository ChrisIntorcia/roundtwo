// Agora code and live experience copied directly — unchanged
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  onSnapshot,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
  VideoSourceType,
} from 'react-native-agora';
import { Ionicons } from '@expo/vector-icons';
import DraggableFlatList from 'react-native-draggable-flatlist'; 
import StreamSettingsModal from './StreamSettingsModal'; 
import ProductPanel from './ProductPanel';
import styles, { ACCENT_COLOR } from './broadcasterStyles';
import ProductQueueModal from './ProductQueueModal';
import BroadcasterHeader from './BroadcasterHeader';
import { BlurView } from 'expo-blur';

const clearChatMessages = async (channelName, db) => {
  try {
    const msgRef = collection(db, 'livestreams', channelName, 'messages');
    const snapshot = await getDocs(msgRef);
    const deletes = snapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletes);
  } catch (err) {
    console.error('🔥 Failed to clear chat messages:', err);
  }
};

const clearViewers = async (channelName, db) => {
  try {
    const viewerRef = collection(db, 'livestreams', channelName, 'viewers');
    const snapshot = await getDocs(viewerRef);
    const deletes = snapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletes);
  } catch (err) {
    console.error('🔥 Failed to clear viewers:', err);
  }
};

export default function BroadcasterScreen({ route, navigation }) {
  const { channelName, broadcasterUid, token } = route.params;

  const [joined, setJoined] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [viewers, setViewers] = useState([]);
  const [carouselTimer, setCarouselTimer] = useState(null);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [muted, setMuted] = useState(false);
  const flatListRef = useRef();
  const rtcEngineRef = useRef(null);
  const [countdownSeconds, setCountdownSeconds] = useState(null);
  const [continuedRotate, setContinuedRotate] = useState(false);
  const [queueModalVisible, setQueueModalVisible] = useState(false);
  const [rotationStarted, setRotationStarted] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [allowFirestoreSync, setAllowFirestoreSync] = useState(false);
  const [purchaseBanner, setPurchaseBanner] = useState(null);
  const unsubPurchasesRef = useRef(null);
  const shownOrderIdsRef = useRef(new Set());
  const [isRotating, setIsRotating] = useState(false);
  const [setupChecks, setSetupChecks] = useState({
    camera: false,
    microphone: false,
    products: false,
    thumbnail: false
  });
  const [previewStarted, setPreviewStarted] = useState(false);
  const [productPanelHeight, setProductPanelHeight] = useState(0);

  const auth = getAuth();
  const user = auth.currentUser;
  const db = getFirestore();

  const fetchProducts = () => {
    if (!auth.currentUser) return () => {};
const userId = auth.currentUser.uid;
    if (!user) return () => {};
    
    const q = query(collection(db, 'products'), where('sellerId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
      setProductsLoaded(true);
    });
  
    return unsubscribe;
  };  

  useEffect(() => {
    const initializeStream = async () => {
      try {        
        await clearChatMessages(channelName, db);
        await clearViewers(channelName, db);
      } catch (err) {
        console.warn('⚠️ Failed to initialize stream or clear chat:', err);
      }
    };
  
    initializeStream();
  
    const unsubscribeProducts = fetchProducts();
  
    const unsubMessages = onSnapshot(
      collection(db, 'livestreams', channelName, 'messages'),
      (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMessages(msgs);
      }
    );

    const renderFadingMessage = (messages) => ({ item, index }) => {
      const max = messages.length - 1;
      const opacity = 1 - (max - index) * .20;
      return (
        <Text style={[styles.message, { opacity }]}>
          <Text style={styles.messageSender}>{item.sender}: </Text>
          {item.text}
        </Text>
      );
    };
    

    const unsubViewers = onSnapshot(
      collection(db, 'livestreams', channelName, 'viewers'),
      (snapshot) => {
        setViewerCount(snapshot.size);
        const viewerList = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data(),
          joinedAt: doc.data().joinedAt?.toDate?.()?.toLocaleTimeString() || 'Just now'
        }));
        setViewers(viewerList);
      }
    );
  
    return () => {
      rtcEngineRef.current?.leaveChannel();
      rtcEngineRef.current?.release();
      updateDoc(doc(db, 'livestreams', channelName), { isLive: false });
      unsubMessages();
      unsubViewers();
      if (unsubPurchasesRef.current) unsubPurchasesRef.current(); // ✅ safe cleanup
    };
    
  }, []);

  useEffect(() => {
    if (!joined || !carouselTimer || !countdownSeconds || products.length === 0) return;
  
    const interval = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          rotateProduct(); // ✅ this handles selectedProduct
          return continuedRotate ? carouselTimer : null;
        }
        return prev - 1;
      });
    }, 1000);
  
    return () => clearInterval(interval);
  }, [joined, carouselTimer, countdownSeconds, continuedRotate, products]);
  
  
  
  useEffect(() => {
    if (!rotationStarted || !allowFirestoreSync) return;
  
    const unsub = onSnapshot(doc(db, 'livestreams', channelName), async (docSnap) => {
      const data = docSnap.data();
      if ('selectedProduct' in data && data.selectedProduct?.id) {
        try {
          const productRef = doc(db, 'products', data.selectedProduct.id);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            const enrichedProduct = { id: productSnap.id, ...productSnap.data() };
            setSelectedProduct(enrichedProduct);
          } else {
            console.warn("⚠️ Global product not found for selectedProduct.");
            setSelectedProduct(data.selectedProduct); // fallback
          }
        } catch (err) {
          console.error("🔥 Failed to fetch global product for selectedProduct:", err);
          setSelectedProduct(data.selectedProduct); // fallback
        }
      } else {
        console.warn("⚠️ Firestore selectedProduct was null or missing. Ignoring.");
      }
    });    
  
    return unsub;
  }, [rotationStarted, allowFirestoreSync]);
  
  useEffect(() => {
  const shownOrderIds = shownOrderIdsRef.current;

  const unsub = onSnapshot(
    query(
      collection(db, 'orders'),
      where('sellerId', '==', user.uid),
      where('channel', '==', channelName)
    ),
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const orderId = change.doc.id;

        if (change.type === 'added' && !shownOrderIds.has(orderId)) {
          const order = change.doc.data();
          const orderTime = order?.purchasedAt?.toMillis?.() || 0;
          const now = Date.now();

          // ✅ Show banner only if order is less than 5 seconds old
          if (now - orderTime < 5000) {
            shownOrderIds.add(orderId);

            (async () => {
              try {
                const buyerRef = doc(db, 'users', order.buyerId);
                const buyerSnap = await getDoc(buyerRef);
                const username =
                  buyerSnap.data()?.username ||
                  buyerSnap.data()?.displayName ||
                  order.buyerEmail.split('@')[0];

                const productTitle = order.title || 'an item';
                setPurchaseBanner(`${username} bought "${productTitle}"`);

                setTimeout(() => setPurchaseBanner(null), 3000);
              } catch (err) {
                console.warn('⚠️ Failed to fetch buyer info:', err);
              }
            })();
          }
        }
      });
    }
  );

  unsubPurchasesRef.current = unsub;

  return () => unsub();
}, [user.uid, channelName]);

  
  
  const toggleMute = () => {
    const engine = rtcEngineRef.current;
    engine.muteLocalAudioStream(!muted);
    setMuted(!muted);
  };

  useEffect(() => {
    const engine = createAgoraRtcEngine();
    rtcEngineRef.current = engine;
    engine.initialize({ appId: '262ef45d2c514a5ebb129a836c4bff93', channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting });
    engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
    engine.enableVideo();
    engine.startPreview();
    engine.setupLocalVideo({ uid: 0, sourceType: VideoSourceType.VideoSourceCamera });
    engine.joinChannel(token, channelName, broadcasterUid, {
      channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
      clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      publishMicrophoneTrack: true,
      publishCameraTrack: true,
      autoSubscribeAudio: true,
      autoSubscribeVideo: true,
    });
    setJoined(true);
  }, []);

  useEffect(() => {
    if (!selectedProduct?.id) return;
  
    const globalProductRef = doc(db, 'products', selectedProduct.id);
    const unsub = onSnapshot(globalProductRef, (snap) => {
      const updatedData = snap.data();
      if (updatedData) {
        setSelectedProduct((prev) => ({ ...prev, quantity: updatedData.quantity }));
      }
    });
  
    return () => unsub();
  }, [selectedProduct?.id]);  

    const rotateProduct = () => {
      if (products.length === 0) return;
    
      const currentIndex = products.findIndex((p) => p.id === selectedProduct?.id);
      const nextIndex = (currentIndex + 1) % products.length;
      const nextProduct = products[nextIndex];
    
      setSelectedProduct(nextProduct);
    
      updateDoc(doc(db, 'livestreams', channelName), {
        selectedProductId: nextProduct.id,
        selectedProduct: nextProduct, // 👈 this is what ViewerScreen expects
        carouselCountdown: carouselTimer,
      }).catch((err) => {
        console.error('🔥 Failed to sync next product to Firestore:', err);
      });
    };
    
    const toggleRotation = async () => {
      if (!isRotating) {
        // 🔁 START rotation
        if (productsLoaded && products.length > 0) {
          const firstProduct = products[0];
          const productRef = doc(db, 'products', firstProduct.id);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            const enrichedProduct = { id: productSnap.id, ...productSnap.data() };
            setSelectedProduct(enrichedProduct);
            await updateDoc(doc(db, 'livestreams', channelName), {
              selectedProductId: enrichedProduct.id,
              selectedProduct: enrichedProduct,
              carouselCountdown: carouselTimer,
            });
            setCountdownSeconds(carouselTimer);
            setRotationStarted(true);
            setAllowFirestoreSync(true);
            setIsRotating(true);
    
            // ✅ only close modal when starting
            setOptionsVisible(false);
          }
        } else {
          Alert.alert("Queue not loaded", "Please load your queue first.");
        }
      } else {
        // ⏸ PAUSE rotation, don't close modal
        setCountdownSeconds(null);
        setIsRotating(false);
      }
    };
    
  // Function to start camera preview
  const startPreview = async () => {
    try {
      const engine = createAgoraRtcEngine();
      rtcEngineRef.current = engine;
      engine.initialize({ 
        appId: '262ef45d2c514a5ebb129a836c4bff93', 
        channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting 
      });
      engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
      engine.enableVideo();
      engine.startPreview();
      engine.setupLocalVideo({ uid: 0, sourceType: VideoSourceType.VideoSourceCamera });
      setPreviewStarted(true);
      setSetupChecks(prev => ({ ...prev, camera: true }));
    } catch (err) {
      console.error('Failed to start preview:', err);
      Alert.alert('Preview Error', 'Failed to start camera preview');
    }
  };

  // Function to test microphone
  const testMicrophone = async () => {
    try {
      if (!rtcEngineRef.current) return;
      rtcEngineRef.current.enableAudio();
      setSetupChecks(prev => ({ ...prev, microphone: true }));
    } catch (err) {
      console.error('Failed to test microphone:', err);
      Alert.alert('Microphone Error', 'Failed to test microphone');
    }
  };

  // Function to start the stream
  const startStream = async () => {
    try {
      if (!rtcEngineRef.current) return;
      await rtcEngineRef.current.joinChannel(token, channelName, broadcasterUid, {
        channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        publishMicrophoneTrack: true,
        publishCameraTrack: true,
        autoSubscribeAudio: true,
        autoSubscribeVideo: true,
      });
      setJoined(true);
      setIsPreStreamSetup(false);
    } catch (err) {
      console.error('Failed to start stream:', err);
      Alert.alert('Stream Error', 'Failed to start the stream');
    }
  };

  // Return pre-stream setup or main stream UI
  return (
    <View style={styles.container}>
      <RtcSurfaceView 
        style={styles.video} 
        canvas={{ uid: 0, sourceType: VideoSourceType.VideoSourceCamera }} 
      />
      
      <BroadcasterHeader
        viewerCount={viewerCount}
        isRotating={isRotating}
        toggleRotation={toggleRotation}
        openQueue={() => setQueueModalVisible(true)}
        openSettings={() => {
          console.log('Opening settings modal');
          setOptionsVisible(true);
        }}
      />

        <ProductPanel
          selectedProduct={selectedProduct}
          countdownSeconds={countdownSeconds}
          onOpenQueue={() => setQueueModalVisible(true)}
          onLayout={(height) => {
            setProductPanelHeight(height);
          }}
      />

<BlurView
  intensity={20}
  tint="dark"
  style={[
    styles.chatOverlay,
    {
      bottom: productPanelHeight,
      maxHeight: 200,
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 40
    }
  ]}
>
  <FlatList
    ref={flatListRef}
    data={messages.slice(-6)}
    keyExtractor={(item) => item.id}
    renderItem={({ item, index }) => {
      const isOldest = index === 0 && messages.length > 6;
      const opacity = isOldest ? 0.4 : 1;
      return (
        <Text style={[styles.message, { opacity }]}>
          <Text style={styles.messageSender}>{item.sender}: </Text>
          {item.text}
        </Text>
      );
    }}
    inverted
    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
    onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
  />
</BlurView>

      <StreamSettingsModal 
        visible={optionsVisible}
        setVisible={setOptionsVisible}
        muted={muted}
        toggleMute={toggleMute}
        viewerCount={viewerCount}
        messages={messages}
        rtcEngineRef={rtcEngineRef}
        navigation={navigation}
        channelName={channelName}
        db={db}
        viewers={viewers}
      />

      {purchaseBanner && (
        <View style={{ position: 'absolute', top: 100, alignSelf: 'center', backgroundColor: '#E76A54', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, zIndex: 999 }}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>{purchaseBanner}</Text>
        </View>
      )}

      <ProductQueueModal
        visible={queueModalVisible}
        products={products}
        selectedProduct={selectedProduct}
        isRotating={isRotating}
        carouselTimer={carouselTimer}
        continuedRotate={continuedRotate}
        countdownSeconds={countdownSeconds}
        setCarouselTimer={setCarouselTimer}
        setCountdownSeconds={setCountdownSeconds}
        setContinuedRotate={setContinuedRotate}
        setProducts={setProducts}
        setSelectedProduct={setSelectedProduct}
        toggleRotation={toggleRotation}
        setQueueModalVisible={setQueueModalVisible}
        channelName={channelName}
        db={db}
      />
    </View>
  );
}

