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
  Modal,
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
  setDoc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { auth } from '../../firebaseConfig';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { filterText } from '../../utils/profanityFilter';
import ProductPanel from './components/ProductPanel';
import styles from './viewerstyles';
import ViewerChat from './components/ViewerChat';
import PurchaseCelebration from './components/PurchaseCelebration';
import usePurchase from './components/usePurchase';
import BroadcasterHeader from './components/BroadcasterHeader';
import BuyButton from './components/BuyButton';
import ViewerOptionsModal from './components/ViewerOptionsModal';
import { BlurView } from 'expo-blur';


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
  const [showConfetti, setShowConfetti] = useState(false);
  const [purchaseBanner, setPurchaseBanner] = useState(null);
  const [productPanelHeight, setProductPanelHeight] = useState(200); // fallback default


  useEffect(() => {
    const checkUserSetup = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const hasShipping = userData?.shippingAddress;
      const hasPayment = userData?.hasSavedPaymentMethod;

      if (!hasShipping || !hasPayment) {
        Alert.alert(
          'Setup Required',
          'To make purchases during live streams, you need to set up your payment and shipping information.',
          [
            {
              text: 'Add Payment Info',
              onPress: () => navigation.navigate('PaymentsShipping')
            },
            {
              text: 'Continue watching',
              style: 'cancel'
            }
          ]
        );
      }
    };

    checkUserSetup();
  }, []);

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

        // Get current user's information
        const currentUser = auth.currentUser;
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const username = userDoc.data()?.username || currentUser.email.split('@')[0];

        // Add viewer with more information
        await setDoc(doc(db, 'livestreams', channel, 'viewers', currentUser.uid), {
          uid: currentUser.uid,
          username: username,
          joinedAt: new Date(),
          email: currentUser.email,
          viewerUid: viewerUid // Agora viewer UID
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
          // Use the current user's UID instead of viewerUid for cleanup
          await deleteDoc(doc(db, 'livestreams', channel, 'viewers', auth.currentUser.uid));
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
  
    // Filter the chat message
    const filteredMessage = filterText(chatInput);
  
    await addDoc(collection(db, 'livestreams', channel, 'messages'), {
      text: filteredMessage,
      sender: senderName,
      createdAt: new Date(),
    });
  
    setChatInput('');
  };  

  const { handleBuy, isPurchasing } = usePurchase({
    db,
    selectedProduct,
    channel,
    setShowConfetti,
    setPurchaseBanner
  });  
  
  const displayUid = remoteUid || broadcasterUidRef.current;

  if (loading) return <ActivityIndicator style={{ flex: 1, backgroundColor: '#000' }} color="#E76A54" />;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
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
      <BroadcasterHeader
          broadcaster={broadcaster}
          isFollowing={isFollowing}
          toggleFollow={toggleFollow}
          viewerCount={viewerCount}
          navigation={navigation}
        />


        <View style={styles.sideToolbar}>
          <TouchableOpacity onPress={() => setMoreOptionsVisible(true)}><Icon name="ellipsis-vertical" size={20} color="#fff" /></TouchableOpacity>
          <TouchableOpacity onPress={handleShare}><Icon name="rocket" size={20} color="#fff" /></TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('PaymentsShipping')}><Icon name="wallet" size={20} color="#fff" /></TouchableOpacity>
        </View>

        <BlurView intensity={30} tint="dark" style={styles.bottomBlurOverlay} />

        <ViewerChat      
          db={db}
          channel={channel}
          messages={messages}
          setMessages={setMessages}
          chatInput={chatInput}
          setChatInput={setChatInput}
          flatListRef={flatListRef}
          styles={styles}
        />

        <BlurView intensity={30} tint="dark" style={styles.productPanelBlur} />
        <ProductPanel selectedProduct={selectedProduct} countdownSeconds={countdownSeconds} />

        <View style={styles.bottomBar}>
          <BuyButton
            selectedProduct={selectedProduct}
            purchaseQty={purchaseQty}
            setPurchaseQty={setPurchaseQty}
            handleBuy={handleBuy}
            swipeKey={swipeKey}
            setSwipeKey={setSwipeKey}
            swipeRef={swipeRef}
            isPurchasing={isPurchasing}
            db={db}
            navigation={navigation}
          />
        </View>

        <PurchaseCelebration
  showConfetti={showConfetti}
  purchaseBanner={purchaseBanner}
  clearBanner={() => {
    setShowConfetti(false);
    setPurchaseBanner(null);
  }}
/>

        <View style={{ height: insets.bottom}} />
      </Animated.View>

{/* Other components here... */}

<ViewerOptionsModal
  visible={moreOptionsVisible}
  setVisible={setMoreOptionsVisible}
  muted={muted}
  setMuted={setMuted}
  rtcEngineRef={rtcEngineRef}
/>

</View> // 
  );
}
