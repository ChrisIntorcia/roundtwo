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


// Accent color for UI highlights (user can adjust if needed)
const ACCENT_COLOR = '#E76A54';

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
    
  return (
    <View style={styles.container}>
      <RtcSurfaceView 
        style={styles.video} 
        canvas={{ uid: 0, sourceType: VideoSourceType.VideoSourceCamera }} 
      />
      
      <Text style={styles.viewerCount}>{viewerCount} watching</Text>
      {selectedProduct ? (
  <View style={styles.productPanelFull}>
    <Image source={{ uri: selectedProduct.images?.[0] }} style={styles.productImageLarge} />
    <View style={{ flex: 1, paddingRight: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
        <Text style={styles.strikePrice}>${Number(selectedProduct.fullPrice || 0).toFixed(2)}</Text>
        <Text style={styles.productPrice}>${Number(selectedProduct.bulkPrice || 0).toFixed(2)}</Text>
      </View>
      <Text style={styles.productTitle}>{selectedProduct.title}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
        <Text style={styles.productMeta}>{selectedProduct.quantity} in stock</Text>
        {countdownSeconds > 0 && (
          <View style={styles.timerBox}>
            <Text style={styles.timerText}>⏱ {countdownSeconds}s</Text>
          </View>
        )}
      </View>
    </View>
  </View>
) : (
<View style={[styles.productPanelFull, { justifyContent: 'center', alignItems: 'center' }]}>
  <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center' }}>
    Your lineup is ready. Open the queue, pick the order, and hit ▶️ Play to go live. Turn on 'Product Rotate' to cycle through automatically.
  </Text>
</View>
) }

<FlatList
  ref={flatListRef}
  data={messages.slice(-7)}
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
  
  onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
  onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
  style={styles.chatOverlay}
/>

<TouchableOpacity 
  style={[styles.optionsButton, { right: 120, top: 60 }]} 
  onPress={toggleRotation}
>
  <Ionicons name={isRotating ? 'pause' : 'play'} size={24} color="#fff" />
</TouchableOpacity>

<TouchableOpacity 
  style={[styles.optionsButton, { right: 70, top: 60 }]} 
  onPress={() => setQueueModalVisible(true)}
>
  <Ionicons name="list" size={24} color="#fff" />
</TouchableOpacity>

<TouchableOpacity 
  style={[styles.optionsButton, { right: 20, top: 60 }]} 
  onPress={() => setOptionsVisible(true)}
>
  <Ionicons name="settings-sharp" size={24} color="#fff" />
</TouchableOpacity>

      <Modal visible={optionsVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.carouselCountdownLabel}>⏱ Rotate every:</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={{ marginTop: 8 }}
            >
              {[
                  { val: null, label: 'Off' },
                  { val: 15, label: '15s' },
                  { val: 30, label: '30s' },
                  { val: 60, label: '1m' },
                  { val: 120, label: '2m' },
                  { val: 180, label: '3m' },
                  { val: 300, label: '5m' },
                  { val: 600, label: '10m' },
                  { val: 900, label: '15m' },
                ].map(({ val, label }, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => {
                      setCarouselTimer(val);
                      if (!val) setCountdownSeconds(null);
                    }}
                    style={[
                      styles.carouselOption,
                      carouselTimer === val ? styles.carouselOptionSelected : null
                    ]}
                  >
                    <Text style={styles.carouselOptionText}>{label}</Text>
                  </TouchableOpacity>
                ))
                }
            </ScrollView>
            <View style={{ marginTop: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 14 }}>Product Rotate</Text>
                <Switch
                  value={continuedRotate}
                  onValueChange={setContinuedRotate}
                  trackColor={{ false: '#555', true: ACCENT_COLOR }}
                  thumbColor={'#fff'}
                />
              </View>
              <Text style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>
                Auto restart timer after each product
              </Text>
            </View>

            <TouchableOpacity 
              onPress={toggleRotation}
              style={[styles.modalButtonPrimary, { marginTop: 10 }]}
            >
              <Text style={styles.modalButtonTextPrimary}>
                {isRotating ? '⏸ Pause Rotation' : '▶️ Start Rotation'}
              </Text>
            </TouchableOpacity>


            <TouchableOpacity 
              onPress={toggleMute} 
              style={styles.modalButtonPrimary}
            >
              <Text style={styles.modalButtonTextPrimary}>
                {muted ? '🔇 Unmute Mic' : '🎤 Mute Mic'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => {
                Alert.alert(
                  "End Stream?",
                  "Are you sure you want to end your live stream?",
                  [
                    { text: "Cancel", style: "cancel" },
                    { 
                      text: "Yes, End", 
                      style: "destructive",
                      onPress: async () => {
                        try {
                          rtcEngineRef.current?.leaveChannel();
                          rtcEngineRef.current?.release();
                          await updateDoc(doc(db, 'livestreams', channelName), { isLive: false });
                          navigation.replace('MainApp');
                        } catch (err) {
                          console.error("Failed to end stream:", err);
                        }
                      }
                    }
                  ]
                );
              }} 
              style={[styles.modalButtonPrimary, { backgroundColor: '#e53935' }]} // Red button
            >
              <Text style={styles.modalButtonTextPrimary}>🛑 End Live Stream</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setOptionsVisible(false)} 
              style={styles.modalButtonSecondary}
            >
              <Text style={styles.modalButtonTextSecondary}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={queueModalVisible} transparent animationType="slide">
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <Text style={{ color: '#fff', fontSize: 16, marginBottom: 10 }}>🗂 Edit Queue</Text>
      <DraggableFlatList
  data={products}
  keyExtractor={(item) => item.id}
  onDragEnd={({ data }) => {
    setProducts(data);
    setSelectedProduct(data[0]);
  
    updateDoc(doc(db, 'livestreams', channelName), {
      selectedProductId: data[0].id,
      selectedProduct: data[0],
    }).catch((err) => {
      console.error('🔥 Failed to sync reordered product to Firestore:', err);
    });
  }}
  renderItem={({ item, drag, isActive, index }) => (
    <TouchableOpacity
      style={{
        backgroundColor: isActive ? '#555' : '#333',
        padding: 10,
        marginBottom: 10,
        borderRadius: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
      onLongPress={drag}
    >
      <View>
        <Text style={{ color: '#fff', fontSize: 14 }}>{item.title}</Text>
        <Text style={{ color: '#aaa', fontSize: 12 }}>Qty: {item.groupAmount}</Text>
      </View>
      <Text style={{ color: '#fff' }}>#{index + 1}</Text>
    </TouchableOpacity>
  )}
/>
      <TouchableOpacity
        style={styles.modalButtonSecondary}
        onPress={() => setQueueModalVisible(false)}
      >
        <Text style={styles.modalButtonTextSecondary}>Close</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

     {purchaseBanner && (
      <View style={{ position: 'absolute', top: 100, alignSelf: 'center', backgroundColor: '#E76A54', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, zIndex: 999 }}>
    <Text style={{ color: '#fff', fontWeight: 'bold' }}>{purchaseBanner}</Text>
  </View>
)}
 
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1 },
  viewerCount: { position: 'absolute', top: 60, left: 20, color: '#fff', fontSize: 16, backgroundColor: ACCENT_COLOR, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 2 },
  chatOverlay: { position: 'absolute', bottom: 130, left: 10, right: 10, maxHeight: 180, paddingHorizontal: 10, zIndex: 20 },
  message: { color: '#fff', fontSize: 14, lineHeight: 20, marginBottom: 4, paddingVertical: 1 },
  messageSender: { fontWeight: 'bold' },
  optionsButton: { position: 'absolute', top: 60, right: 20, backgroundColor: ACCENT_COLOR, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 3, elevation: 3 },
  optionsButtonText: { color: '#fff', fontWeight: '600', fontSize: 16, textAlign: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#222', padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  carouselCountdownLabel: { color: '#fff', fontSize: 14, marginBottom: 4 },
  carouselOption: { backgroundColor: '#333', paddingVertical: 8, paddingHorizontal: 12, marginRight: 8, borderRadius: 6 },
  carouselOptionSelected: { backgroundColor: ACCENT_COLOR },
  carouselOptionText: { color: '#fff', fontSize: 14 },
  modalButtonPrimary: { marginTop: 20, paddingVertical: 12, borderRadius: 8, alignItems: 'center', width: '100%', backgroundColor: ACCENT_COLOR },
  modalButtonSecondary: { marginTop: 20, paddingVertical: 12, borderRadius: 8, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: ACCENT_COLOR },
  modalButtonTextPrimary: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalButtonTextSecondary: { color: ACCENT_COLOR, fontSize: 16, fontWeight: '600' },
  productCard: { marginRight: 10, backgroundColor: '#fff', borderRadius: 12, padding: 14, width: 100, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  productImage: { width: 60, height: 60, borderRadius: 8, marginRight: 10 },
  productTitle: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  productPrice: { fontSize: 14, color: '#fff', marginTop: 2 },
  productQty: { fontSize: 14, color: '#999' },
  productPanel: { flexDirection: 'row', backgroundColor: '#1a1a1a', padding: 12, borderRadius: 16, marginHorizontal: 12, position: 'absolute', bottom: 100, left: 0, right: 0, alignItems: 'center' },
  productDetails: { flex: 1 },
  productMeta: { color: '#ccc', fontSize: 12, marginTop: 2 },
  timerBox: { backgroundColor: '#E76A54', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginLeft: 10 },
  timerText: { color: '#000', fontWeight: 'bold', fontSize: 13 },
  selectedProduct: { position: 'absolute', bottom: 20, left: 10, right: 10, backgroundColor: '#222', padding: 12, borderRadius: 12, borderWidth: 2, borderColor: ACCENT_COLOR, zIndex: 999, elevation: 999 },
  selectedProductTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  selectedProductPrice: { fontSize: 14, color: '#ccc', marginBottom: 2 },
  selectedProductQty: { fontSize: 14, color: '#aaa' },
  countdownBadge: { position: 'absolute', top: 130, right: 20, backgroundColor: '#FFD700', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 16, zIndex: 999, elevation: 4 },
  countdownText: { color: '#000', fontWeight: 'bold', fontSize: 13 },
  productPanelFull: { flexDirection: 'row', backgroundColor: '#1a1a1a', padding: 16, borderRadius: 18, marginHorizontal: 10, alignItems: 'center', position: 'absolute', bottom: 20, left: 0, right: 0, elevation: 10 },
  productImageLarge: { width: 70, height: 70, borderRadius: 12, marginRight: 12 },
  strikePrice: { color: '#999', fontSize: 12, textDecorationLine: 'line-through', marginRight: 6 },
});

