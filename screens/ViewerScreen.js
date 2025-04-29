// 🔒 Fixed ViewerScreen with Agora streaming and Whatnot-style UI + viewer count
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
  StatusBar,
  Animated,
  Share,
  Modal
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import Icon from 'react-native-vector-icons/Ionicons';
import SwipeButton from 'rn-swipe-button';
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
  VideoSourceType,
} from 'react-native-agora';
import {
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  collection,
  query,
  orderBy,
  addDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  runTransaction
} from 'firebase/firestore';
import { auth } from '../firebaseConfig';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const APP_ID = '262ef45d2c514a5ebb129a836c4bff93';
const TOKEN_SERVER_URL = 'https://us-central1-roundtwo-cc793.cloudfunctions.net/generateAgoraToken';

export default function ViewerScreen({ route, navigation }) {
  const { channel } = route.params;
  const [remoteUid, setRemoteUid] = useState(null);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [purchaseBanner, setPurchaseBanner] = useState(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [countdown, setCountdown] = useState(null); 
  const rtcEngineRef = useRef(null);
  const db = getFirestore();
  const viewerUid = useRef(Math.floor(Math.random() * 1000000)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef();
  const broadcasterUidRef = useRef(null);
  const insets = useSafeAreaInsets();
  const [broadcaster, setBroadcaster] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(null);
  const swipeRef = useRef(null); 
  const [purchaseQty, setPurchaseQty] = useState(1);
  const [swipeKey, setSwipeKey] = useState(Date.now());
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const startViewing = async () => {
      try {
        const streamDoc = await getDoc(doc(db, 'livestreams', channel));
        if (!streamDoc.exists()) return;
        const broadcasterUid = streamDoc.data()?.broadcasterUid;
        broadcasterUidRef.current = broadcasterUid;

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
        engine.initialize({ appId: APP_ID, channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting });
        engine.setClientRole(ClientRoleType.ClientRoleAudience);
        engine.enableVideo();

        engine.registerEventHandler({
          onJoinChannelSuccess: () => setJoined(true),
          onUserJoined: (connection, uid) => {
            setRemoteUid(uid);
          },
          onUserOffline: () => setRemoteUid(null),
        });

        engine.joinChannel(token, channel, viewerUid, {
          channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
          clientRoleType: ClientRoleType.ClientRoleAudience,
          autoSubscribeAudio: true,
          autoSubscribeVideo: true,
        });

        await setDoc(doc(db, 'livestreams', channel, 'viewers', String(viewerUid)), {
          uid: viewerUid,
          joinedAt: new Date(),
        });

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();

        setLoading(false);
      } catch (err) {
        console.error('🔥 Error joining channel:', err);
      }
    };

    startViewing();

    return () => {
      const cleanup = async () => {
        try {
          await rtcEngineRef.current?.leaveChannel();
          rtcEngineRef.current?.release();
          await deleteDoc(doc(db, 'livestreams', channel, 'viewers', String(viewerUid)));
        } catch (e) {
          console.warn('Cleanup error:', e);
        }
      };
      cleanup();
    };
  }, []);

  useEffect(() => {
    let interval = setInterval(() => {
      const fetchBroadcaster = async () => {
        try {
          const streamDoc = await getDoc(doc(db, 'livestreams', channel));
          const firebaseUid = streamDoc.data()?.firebaseUid;
          if (!firebaseUid || typeof firebaseUid !== 'string') return;
      
          const docRef = doc(db, 'users', firebaseUid);
          const userDoc = await getDoc(docRef);
      
          if (userDoc.exists()) {
            setBroadcaster({ id: userDoc.id, ...userDoc.data() });
          }
        } catch (err) {
          console.warn('⚠️ Failed to load broadcaster profile:', err);
        }
      };
      
      fetchBroadcaster();
      clearInterval(interval);
    }, 500);
  
    return () => clearInterval(interval);
  }, []);    

  useEffect(() => {
    if (countdownSeconds === null || countdownSeconds <= 0) return;
  
    const interval = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  
    return () => clearInterval(interval);
  }, [countdownSeconds]);  
  
  useEffect(() => {
    const unsubProduct = onSnapshot(doc(db, 'livestreams', channel), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data(); // ✅ Fix: define data before using
        setSelectedProduct(data.selectedProduct || null);
  
        // 🔁 Watch global product for updates
        if (data.selectedProduct?.id) {
          const globalProductRef = doc(db, 'products', data.selectedProduct.id);
          onSnapshot(globalProductRef, (productSnap) => {
            const freshData = productSnap.data();
            if (freshData) {
              setSelectedProduct({ id: productSnap.id, ...freshData });
            }
          });          
        }
  
        // ⏱ Update countdown
        if (typeof data.carouselCountdown === 'number') {
          setCountdownSeconds(data.carouselCountdown); // allow 0/null to clear the countdown
        }
  
        // 🔴 Stream ended — boot viewer
        if (data.isLive === false) {
          Alert.alert("Stream Ended", "This stream has ended.", [
            { text: "OK", onPress: () => navigation.replace('MainApp', { screen: 'Home' }) }
          ]);
        }        
      }
    });
  
    const chatQuery = query(collection(db, 'livestreams', channel, 'messages'), orderBy('createdAt'));
    const unsubChat = onSnapshot(chatQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      flatListRef.current?.scrollToEnd({ animated: true });
    });
  
    const unsubViewers = onSnapshot(collection(db, 'livestreams', channel, 'viewers'), (snapshot) => {
      setViewerCount(snapshot.size);
    });
  
    return () => {
      unsubProduct();
      unsubChat();
      unsubViewers();
    };
  }, [channel]);
  
  useEffect(() => {
    const checkFollowing = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser || !broadcaster?.id) return;
  
      const docRef = doc(db, 'users', currentUser.uid, 'following', broadcaster.id);
      const docSnap = await getDoc(docRef);
      setIsFollowing(docSnap.exists());
    };
  
    checkFollowing();
  }, [broadcaster]);
  
  const toggleFollow = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || !broadcaster?.id) return;
  
    const followingRef = doc(db, 'users', currentUser.uid, 'following', broadcaster.id);
    const followerRef = doc(db, 'users', broadcaster.id, 'followers', currentUser.uid);
  
    try {
      if (isFollowing) {
        await deleteDoc(followingRef);
        await deleteDoc(followerRef);
      } else {
        await setDoc(followingRef, {
          followedAt: new Date(),
          username: broadcaster.username || '',
        });
        await setDoc(followerRef, {
          followedAt: new Date(),
          username: currentUser.displayName || '',
        });
      }
  
      setIsFollowing(!isFollowing);
    } catch (err) {
      console.error('⚠️ Failed to toggle follow:', err);
    }
  };  

  const handleShare = async () => {
    try {
      const url = `https://stogora.com/live/${channel}`; // replace with your actual link pattern
      const message = `🎥 I'm watching a live stream on Stogora! Check it out: ${url}`;
      await Share.share({ message, url });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Oops', 'Failed to share the stream.');
    }
  };
  
  const sendMessage = async () => {
    const user = auth.currentUser;
    if (!chatInput.trim() || !user) return;
  
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const senderName =
      userDoc.data()?.username ||
      userDoc.data()?.displayName ||
      user.email.split('@')[0];
  
    await addDoc(collection(db, 'livestreams', channel, 'messages'), {
      text: chatInput,
      sender: senderName,
      createdAt: new Date(),
    });
  
    setChatInput('');
  };  

  const handleBuy = async () => {
    const user = auth.currentUser;
    if (!user || !selectedProduct) return;
  
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const shipping = userDoc.data()?.shippingAddress;
      const hasCard = userDoc.data()?.hasSavedPaymentMethod;
  
      if (!shipping || !hasCard) {
        return Alert.alert(
          'Missing Info',
          'You are required to have payment and shipping info to purchase this item.'
        );
      }
  
      if (!selectedProduct.bulkPrice || !selectedProduct.stripeAccountId) {
        throw new Error('Missing product details.');
      }
      if (!user.email) {
        throw new Error('Missing buyer email.');
      }
  
      const res = await fetch('https://us-central1-roundtwo-cc793.cloudfunctions.net/createPaymentIntent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          buyerEmail: user.email,
          stripeAccountId: selectedProduct.stripeAccountId,
          application_fee_amount: Math.round(selectedProduct.bulkPrice * 100 * purchaseQty * 0.1),
        }),
      });
      
  
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Payment failed.');
      }
  
      setShowConfetti(true);
      const buyerUsername =
        userDoc.data()?.username ||
        userDoc.data()?.displayName ||
        user.email.split('@')[0];
  
      setPurchaseBanner(`${buyerUsername} Purchase Complete! "${selectedProduct.title}"`);
  
      await addDoc(collection(db, 'users', user.uid, 'purchases'), {
        productId: selectedProduct.id,
        title: selectedProduct.title,
        price: selectedProduct.bulkPrice * purchaseQty,
        quantity: purchaseQty,
        sellerId: selectedProduct.sellerId,
        channel,
        purchasedAt: new Date(),
      });
  
      const streamDoc = await getDoc(doc(db, 'livestreams', channel));
      if (!streamDoc.exists()) {
        throw new Error('Stream not found.');
      }
      const streamTitle = streamDoc.data()?.title || '';
  
      await addDoc(collection(db, 'orders'), {
        buyerId: user.uid,
        buyerEmail: user.email,
        sellerId: selectedProduct.sellerId,
        productId: selectedProduct.id,
        title: selectedProduct.title,
        price: selectedProduct.bulkPrice * purchaseQty,
        quantity: purchaseQty,
        shippingAddress: shipping,
        channel,
        streamTitle,
        fulfilled: false,
        purchasedAt: new Date(),
      });
  
      const productId = selectedProduct.id;
      const newQty = selectedProduct.groupAmount - purchaseQty;
  
      const productRefGlobal = doc(db, 'products', productId);
      const productRefUser = doc(db, 'users', selectedProduct.sellerId, 'products', productId);
  
      await runTransaction(db, async (transaction) => {
        const globalSnap = await transaction.get(productRefGlobal);
        const userSnap = await transaction.get(productRefUser);
  
        const currentQty = globalSnap.data()?.quantity;
        if (currentQty === undefined || currentQty < purchaseQty) {
          throw new Error('Not enough stock');
        }
  
        transaction.update(productRefGlobal, { quantity: currentQty - purchaseQty });
  
        if (userSnap.exists()) {
          transaction.update(productRefUser, { quantity: currentQty - purchaseQty });
        }
      });
  
    } catch (err) {
      console.error("🔥 handleBuy error:", err.message);
      Alert.alert("Purchase Failed", err.message);
    } finally {
      swipeRef.current?.reset();
      setTimeout(() => {
        setShowConfetti(false);
        setPurchaseBanner(null);
      }, 3000);
    }
  }
  
  const displayUid = remoteUid || broadcasterUidRef.current;

  if (loading) return <ActivityIndicator style={{ flex: 1, backgroundColor: '#000' }} color="#E76A54" />;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      {joined && displayUid ? (
        <RtcSurfaceView
          style={{ flex: 1 }}
          canvas={{ uid: displayUid, sourceType: VideoSourceType.VideoSourceRemote }}
        />
      ) : (
        <View style={styles.waitingContainer}>
          <Text style={styles.waitingText}>Waiting for stream to start...</Text>
        </View>
      )}

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
      <View style={styles.headerRow}>
  <View style={styles.leftRow}>
    <Image
      source={
        broadcaster?.avatarUrl
          ? { uri: broadcaster.avatarUrl }
          : require('../assets/nothing.png')
      }
      style={styles.avatar}
    />
    <TouchableOpacity
      onPress={() => {
        if (broadcaster?.id) {
          navigation.navigate('ProfileScreen', {
            userId: broadcaster.id,
            username: broadcaster.username,
          });
        }
      }}
    >
      <Text style={styles.hostName}>@{broadcaster?.username || 'seller'}</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.follow} onPress={toggleFollow}>
      <Text style={{ color: '#fff' }}>{isFollowing ? 'Following' : 'Follow'}</Text>
    </TouchableOpacity>
  </View>

  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#E76A54',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginRight: 10,
    }}>
      <Icon name="stats-chart" size={16} color="#fff" style={{ marginRight: 6 }} />
      <Text style={{ fontWeight: 'bold', color: '#fff' }}>{viewerCount}</Text>
    </View>

    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonWrapper}>
      <Icon name="chevron-down" size={20} color="#fff" />
    </TouchableOpacity>
  </View>
</View>

        <View style={styles.sideToolbar}>
          <TouchableOpacity onPress={() => setMoreOptionsVisible(true)}><Icon name="ellipsis-vertical" size={20} color="#fff" /></TouchableOpacity>
          <TouchableOpacity onPress={handleShare}><Icon name="rocket" size={20} color="#fff" /></TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('PaymentsShipping')}><Icon name="wallet" size={20} color="#fff" /></TouchableOpacity>
        </View>

        <View style={[styles.chatOverlay, { bottom: 212 }]}>
        <FlatList
  ref={flatListRef}
  data={messages.slice(-4)}
  keyExtractor={(item) => item.id}
  renderItem={({ item, index }) => {
    const faded = messages.length > 4 && index === 0;
    return (
      <Text style={{ color: '#fff', opacity: faded ? 0.4 : 1 }}>
        <Text style={{ fontWeight: 'bold' }}>{item.sender}: </Text>
        {item.text}
      </Text>
    );
  }}
  onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
  onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
  style={styles.chatOverlay}
/>
        </View>

        <View style={styles.chatInputWrapper}>
          <TextInput value={chatInput} onChangeText={setChatInput} placeholder="Say something..." placeholderTextColor="#aaa" style={styles.chatInput} />
          <TouchableOpacity onPress={sendMessage}><Text style={styles.sendButton}>Send</Text></TouchableOpacity>
        </View>

        {selectedProduct ? (
  <View style={styles.productPanel}>
    <Image source={{ uri: selectedProduct.images?.[0] }} style={styles.productImage} />
    <View style={styles.productDetails}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
        <Text style={{ color: '#999', fontSize: 12, textDecorationLine: 'line-through', marginRight: 6 }}>
          ${Number(selectedProduct.fullPrice || 0).toFixed(2)}
        </Text>
        <Text style={styles.productPrice}>
          ${Number(selectedProduct.bulkPrice || 0).toFixed(2)}
        </Text>
      </View>
      <Text style={styles.productTitle}>{selectedProduct.title}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
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
  <View style={[styles.productPanel, { justifyContent: 'center', alignItems: 'center' }]}>
    <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center' }}>
      🛍️ The next product is about to drop. Stick around or you might miss it.
    </Text>
  </View>
)}

<View style={styles.bottomBar}>
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
  <TouchableOpacity style={styles.qtyButton} onPress={() => {
  setPurchaseQty(prev => Math.max(1, prev - 1));
}}>
  <Text style={styles.qtyButtonText}>−</Text>
</TouchableOpacity>

<Text style={styles.qtyText}>{purchaseQty}</Text>

<TouchableOpacity style={styles.qtyButton} onPress={() => {
  if (selectedProduct && purchaseQty < selectedProduct.quantity) {
    setPurchaseQty(prev => prev + 1);
  }
}}>
  <Text style={styles.qtyButtonText}>+</Text>
</TouchableOpacity>

  </View>

  {selectedProduct?.quantity > 0 ? (
  <SwipeButton
    key={swipeKey}
    containerStyles={{ flex: 1, marginLeft: 10 }}
    height={40}
    railBackgroundColor="#E76A54"
    thumbIconBackgroundColor="#000"
    title="Swipe to Buy"
    titleColor="#fff"
    onSwipeSuccess={async () => {
      await handleBuy();
      setSwipeKey(Date.now()); // 👈 Visually reset the button
    }}
    resetAfterSuccess={false} // 👈 disable auto-reset, we do it manually
  />
) : (
  <View style={[styles.buyButton, { backgroundColor: '#aaa', marginLeft: 10 }]}> 
    <Text style={styles.buyText}>Sold Out</Text>
  </View>
)}

        </View>

        {showConfetti && (
          <ConfettiCannon count={180} origin={{ x: Dimensions.get('window').width / 2, y: 0 }} fadeOut />
        )}

        {purchaseBanner && (
          <View style={styles.purchaseBanner}>
            <Text style={styles.purchaseBannerText}>{purchaseBanner}</Text>
          </View>
        )}
        <View style={{ height: insets.bottom}} />
      </Animated.View>

{/* Other components here... */}

<Modal visible={moreOptionsVisible} transparent animationType="fade">
  <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setMoreOptionsVisible(false)}>
    <View style={{ position: 'absolute', bottom: 80, right: 20, backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16 }}>
      <TouchableOpacity onPress={() => {
        const engine = rtcEngineRef.current;
        engine.muteAllRemoteAudioStreams(!muted);
        setMuted(!muted);
        setMoreOptionsVisible(false);
      }}>
        <Text style={{ color: '#fff', paddingVertical: 8 }}>{muted ? 'Unmute Stream' : 'Mute Stream'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => {
        setMoreOptionsVisible(false);
        Alert.alert('Report Submitted', 'Thanks for reporting. We’ll take a look!');
      }}>
        <Text style={{ color: '#fff', paddingVertical: 8 }}>Report Stream</Text>
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
</Modal>

</View> // 
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, paddingTop: 50 },
  leftRow: { flexDirection: 'row', alignItems: 'center'},
  hostInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  hostName: { color: '#fff', marginLeft: 1 },
  follow: { backgroundColor: '#E76A54', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 6 },
  viewerInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E76A54', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4,marginRight: 30 },
  viewerCount: { fontWeight: 'bold', color: '#fff'},
  sideToolbar: { position: 'absolute', right: 10, top: 200, gap: 14 },
  chatOverlay: { position: 'absolute', left: 10, right: 10, maxHeight: '30%', paddingHorizontal: 5 },
  chatInputWrapper: { position: 'absolute', bottom: 140, left: 10, right: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1c1c1c', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 30 },
  chatInput: { flex: 1, color: '#fff', fontSize: 14, paddingVertical: 4 },
  sendButton: { color: 'white', fontWeight: 'bold', marginLeft: 8 },
  productPanel: { position: 'absolute', bottom: 60, left: 10, right: 10, backgroundColor: '#1a1a1a', borderRadius: 12, flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 20 },
  productImage: { width: 60, height: 60, borderRadius: 8, marginRight: 10 },
  productDetails: { flex: 1 },
  productTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  productPrice: { color: '#fff', fontSize: 13, marginTop: 2 },
  productMeta: { color: '#ccc', fontSize: 11, marginTop: 2 },
  buyButton: { backgroundColor: '#E76A54', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  buyText: { color: '#000', fontWeight: 'bold' },
  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: 'absolute', bottom: 24, left: 0, right: 0, paddingHorizontal: 10, },
  customBtn: { backgroundColor: '#fff', padding: 10, borderRadius: 8 },
  bidBtn: { backgroundColor: '#E76A54', padding: 10, borderRadius: 8 },
  shopIcon: { backgroundColor: '#fff', padding: 10, borderRadius: 20 },
  purchaseBanner: { position: 'absolute', top: 200, alignSelf: 'center', backgroundColor: '#222', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  purchaseBannerText: { color: '#E76A54', fontSize: 14, fontWeight: 'bold' },
  backButtonWrapper: { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 6 },
  waitingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  waitingText: { color: '#fff', fontSize: 18 },
  timerBox: { backgroundColor: '#E76A54', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginLeft: 10,}, timerText: {color: '#000', fontWeight: 'bold', fontSize: 13},
  qtyButton: { backgroundColor: '#E76A54', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginHorizontal: 6 },
  qtyButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  qtyText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});