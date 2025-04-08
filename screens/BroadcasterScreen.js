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
} from 'react-native';
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
  VideoSourceType,
} from 'react-native-agora';

// Accent color for UI highlights (user can adjust if needed)
const ACCENT_COLOR = '#4caf50';

export default function BroadcasterScreen({ route, navigation }) {
  const { channelName, broadcasterUid, token } = route.params;

  const [joined, setJoined] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [carouselTimer, setCarouselTimer] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [muted, setMuted] = useState(false);
  const flatListRef = useRef();
  const rtcEngineRef = useRef(null);

  const auth = getAuth();
  const user = auth.currentUser;
  const db = getFirestore();

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
        }, { merge: true });

        return nextIndex;
      });
    }, carouselTimer * 1000);

    return () => clearInterval(interval);
  }, [carouselTimer, joined, selectedIndex, products]);

  const fetchProducts = async () => {
    const q = query(collection(db, 'products'), where('sellerId', '==', user.uid));
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setProducts(items);
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

  return (
    <View style={styles.container}>
      <RtcSurfaceView 
        style={styles.video} 
        canvas={{ uid: 0, sourceType: VideoSourceType.VideoSourceCamera }} 
      />
      
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
        <Text style={styles.optionsButtonText}>⚙️ Options</Text>
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
              {[null, 15, 30, 60, 120, 180, 300, 600].map((val, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    setCarouselTimer(val);
                    setOptionsVisible(false);
                  }}
                  style={[
                    styles.carouselOption, 
                    carouselTimer === val ? styles.carouselOptionSelected : null
                  ]}
                >
                  <Text style={styles.carouselOptionText}>
                    {val ? `${val}s` : 'Off'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity 
              onPress={toggleMute} 
              style={styles.modalButtonPrimary}
            >
              <Text style={styles.modalButtonTextPrimary}>
                {muted ? '🔇 Unmute Mic' : '🎤 Mute Mic'}
              </Text>
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
      
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        horizontal
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.productCard, 
              item.id === selectedProduct?.id ? { borderColor: ACCENT_COLOR, borderWidth: 2 } : null
            ]}
            onPress={() => updateSelectedProduct(item)}
          >
            <Image 
              source={{ uri: item.images?.[0] }} 
              style={styles.productImage} 
            />
            <Text style={styles.productTitle}>{item.title}</Text>
            <Text style={styles.productPrice}>${item.fullPrice}</Text>
            <Text style={styles.productQty}>Qty: {item.groupAmount}</Text>
          </TouchableOpacity>
        )}
        style={styles.carousel}
      />
      
      {selectedProduct && (
        <View style={styles.selectedProduct}>
          <Text style={styles.selectedProductTitle}>
            {selectedProduct.title}
          </Text>
          <Text style={styles.selectedProductPrice}>
            ${selectedProduct.fullPrice}
          </Text>
          <Text style={styles.selectedProductQty}>
            Qty: {selectedProduct.groupAmount}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1 },
  viewerCount: {
    position: 'absolute',
    top: 40,
    left: 20,
    color: '#fff',
    fontSize: 16,
    backgroundColor: ACCENT_COLOR,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    // Add a slight shadow for better readability over video
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
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
    marginBottom: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6,
    borderRadius: 8,
  },
  optionsButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: ACCENT_COLOR,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    // Add elevation/shadow for a raised button effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  optionsButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#222',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  carouselCountdownLabel: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  carouselOption: {
    backgroundColor: '#333',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 6,
  },
  carouselOptionSelected: {
    backgroundColor: ACCENT_COLOR,
  },
  carouselOptionText: {
    color: '#fff',
    fontSize: 14,
  },
  modalButtonPrimary: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    backgroundColor: ACCENT_COLOR,
  },
  modalButtonSecondary: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: ACCENT_COLOR,
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextSecondary: {
    color: ACCENT_COLOR,
    fontSize: 16,
    fontWeight: '600',
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
    // Add shadow for card elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginBottom: 8,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  productPrice: {
    fontSize: 14,
    color: '#555',
  },
  productQty: {
    fontSize: 14,
    color: '#999',
  },
  selectedProduct: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    backgroundColor: '#222',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: ACCENT_COLOR,
  },
  selectedProductTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  selectedProductPrice: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 2,
  },
  selectedProductQty: {
    fontSize: 14,
    color: '#aaa',
  },
});
