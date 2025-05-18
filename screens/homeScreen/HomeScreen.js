import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import CustomHeader from '../../components/CustomHeader';
import StreamCard from './StreamCard';
import DailyDrops from './DailyDrops';
import ProductCard from './ProductCard';
import { validateUsername } from '../../utils/authUtils';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 12;
const CARD_WIDTH = (width - CARD_MARGIN * 3) / 2;

const HomeScreen = () => {
  const navigation = useNavigation();
  const [liveStreams, setLiveStreams] = useState([]);
  const [products, setProducts] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [missingUsername, setMissingUsername] = useState(false);
  const [username, setUsername] = useState('');
  const [nextStream, setNextStream] = useState(null);

  const fetchLiveStreams = () => {
    const q = query(collection(db, 'livestreams'), where('isLive', '==', true));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLiveStreams(data);
      setIsLoading(false);
      setIsRefreshing(false);
    });
  };

  const fetchProducts = async () => {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
      const streamQuery = query(
        collection(db, 'scheduledStreams'),
        where('date', '>=', Timestamp.fromDate(oneHourAgo))
      );
  
      const streamSnap = await getDocs(streamQuery);
  
      const upcomingStreams = streamSnap.docs
        .map(doc => doc.data())
        .sort((a, b) => a.date.toMillis() - b.date.toMillis())
        .slice(0, 2); // Get next 2 relevant streams
  
      const productIds = Array.from(
        new Set(
          upcomingStreams.flatMap(stream => stream.products || []).filter(Boolean)
        )
      );
  
      if (productIds.length === 0) {
        setProducts([]);
        return;
      }
  
      const productChunks = [];
      while (productIds.length) {
        productChunks.push(productIds.splice(0, 10));
      }
  
      const productResults = await Promise.all(
        productChunks.map(chunk =>
          getDocs(
            query(collection(db, 'products'), where('__name__', 'in', chunk))
          )
        )
      );
  
      const allProducts = productResults.flatMap(snap =>
        snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      );
  
      setProducts(allProducts);
    } catch (error) {
      console.error('Error fetching stream-based products:', error);
      setProducts([]);
    }
  };
  

  const checkUserProfile = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (!userData.username) {
          setMissingUsername(true);
          setShowPopup(true);
        }
      }
    } catch (error) {
      console.error('Error checking user profile:', error);
    }
  };

  const handleSetUserInfo = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const updates = {};
      if (missingUsername && username.trim()) {
        const validation = validateUsername(username.trim());
        if (!validation.isValid) {
          Alert.alert('Invalid Username', validation.error);
          return;
        }
        updates.username = username.trim();
      }

      if (Object.keys(updates).length > 0) {
        await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
      }
      setShowPopup(false);
    } catch (error) {
      console.error('Error updating user info:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const fetchNextStream = async () => {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
      const streamQuery = query(
        collection(db, 'scheduledStreams'),
        where('date', '>=', Timestamp.fromDate(oneHourAgo)),
        orderBy('date', 'asc'),
        limit(1)
      );
  
      const streamSnap = await getDocs(streamQuery);
      if (!streamSnap.empty) {
        const stream = streamSnap.docs[0].data();
        setNextStream({
          id: streamSnap.docs[0].id,
          ...stream,
        });
      } else {
        setNextStream(null);
      }
    } catch (error) {
      console.error('Error fetching next stream:', error);
      setNextStream(null);
    }
  };

  useEffect(() => {
    const unsubscribeStreams = fetchLiveStreams();
    fetchProducts();
    fetchNextStream();
    checkUserProfile();
    return () => {
      unsubscribeStreams();
    };
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchLiveStreams();
    fetchProducts();
  };

  const formatCountdown = (date) => {
    const now = new Date();
    const streamDate = date.toDate();
    const diff = streamDate - now;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    // Format the date
    const options = { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true 
    };
    const formattedDate = streamDate.toLocaleDateString('en-US', options);

    let timeString = '';
    if (days > 0) {
      timeString = `${days}d ${hours}h until show`;
    } else if (hours > 0) {
      timeString = `${hours}h ${minutes}m until show`;
    } else {
      timeString = `${minutes}m until show`;
    }

    return {
      formattedDate,
      timeString
    };
  };

  return (
    <View style={styles.container}>
      <CustomHeader />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E76A54" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        >
          {/* Featured Stream */}
          {liveStreams.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Featured Stream</Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('ViewerScreen', {
                    channel: liveStreams[0].channel,
                  })
                }
                activeOpacity={0.9}
              >
                <View style={styles.featuredCard}>
                  <StreamCard
                    imageUrl={liveStreams[0].thumbnailUrl}
                    username={liveStreams[0].streamer}
                    title={liveStreams[0].title}
                    viewerCount={liveStreams[0].viewers}
                    isLive={true}
                    featured={true}
                  />
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Featured Stream</Text>
              {nextStream ? (
                <TouchableOpacity
                  onPress={() => navigation.navigate('EventDetails', { eventId: nextStream.id })}
                  activeOpacity={0.9}
                >
                  <View style={styles.nextStreamCard}>
                    <View style={styles.nextStreamImageContainer}>
                      <Image
                        source={{ uri: nextStream.coverImage }}
                        style={styles.nextStreamImage}
                      />
                      <View style={styles.countdownOverlay}>
                        <Text style={styles.countdownDate}>
                          {formatCountdown(nextStream.date).formattedDate}
                        </Text>
                        <Text style={styles.countdownTime}>
                          {formatCountdown(nextStream.date).timeString}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.nextStreamInfo}>
                      <Text style={styles.nextStreamTitle}>{nextStream.title}</Text>
                      <Text style={styles.nextStreamUsername}>with {nextStream.username}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.emptyStreamCard}>
                  <MaterialIcons name="live-tv" size={40} color="#666" />
                  <Text style={styles.emptyStreamText}>No upcoming streams</Text>
                  <Text style={styles.emptyStreamSubtext}>Check back later for new streams</Text>
                </View>
              )}
            </View>
          )}

          {/* Daily Drops */}
          <View style={styles.section}>
            <DailyDrops excludeStreamId={nextStream?.id} />
          </View>

          {/* All Live Now Streams */}
          {liveStreams.length > 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Live Now</Text>
              <View style={styles.productsGrid}>
                {liveStreams.slice(1).map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() =>
                      navigation.navigate('ViewerScreen', {
                        channel: item.channel,
                      })
                    }
                    activeOpacity={0.9}
                    style={styles.productCard}
                  >
                    <StreamCard
                      imageUrl={item.thumbnailUrl}
                      username={item.streamer}
                      title={item.title}
                      viewerCount={item.viewers}
                      isLive={true}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Products */}
          <View style={styles.section}>
            <View style={styles.productsHeader}>
              <Text style={styles.sectionTitle}>Products</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Browse')} activeOpacity={0.7}>
                <Text style={styles.linkText}>See all</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.productsGrid}>
              {products.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  onPress={() => navigation.navigate('ProductDetailsScreen', { product })}
                  activeOpacity={0.7}
                  style={styles.productCard}
                >
                  <ProductCard
                    imageUrl={product.images?.[0]}
                    name={product.title}
                    fullPrice={product.fullPrice}
                    bulkPrice={product.bulkPrice}
                    brand={product.sellerId}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Username Modal */}
      <Modal 
        visible={showPopup} 
        transparent 
        animationType="fade"
        onRequestClose={() => {}} // Prevent back button on Android
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Complete Your Profile</Text>
            {missingUsername && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  Username <Text style={styles.requiredText}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter username"
                  value={username}
                  onChangeText={text => {
                    const filtered = text.replace(/[^a-zA-Z0-9_.]/g, '');
                    setUsername(filtered);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.inputHelper}>
                  Username must be 3-30 characters, one word only. Letters, numbers, dots, and underscores allowed.
                </Text>
              </View>
            )}
            <TouchableOpacity 
              style={[
                styles.saveButton, 
                (!username.trim() || !validateUsername(username.trim()).isValid) && styles.buttonDisabled
              ]} 
              onPress={handleSetUserInfo}
              disabled={!username.trim() || !validateUsername(username.trim()).isValid}
            >
              <Text style={styles.saveButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 80 },
  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  linkText: { fontSize: 14, color: '#6C63FF' },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: CARD_WIDTH,
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  requiredText: {
    color: '#E76A54',
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputHelper: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#E76A54',
    padding: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  featuredCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyStreamCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStreamText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStreamSubtext: {
    fontSize: 14,
    color: '#666',
  },
  nextStreamCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextStreamImageContainer: {
    position: 'relative',
    width: '100%',
    height: 300,
  },
  nextStreamImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  countdownOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
  },
  countdownDate: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  countdownTime: {
    color: '#E76A54',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  nextStreamInfo: {
    padding: 16,
  },
  nextStreamTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  nextStreamUsername: {
    fontSize: 14,
    color: '#666',
  },
});

export default HomeScreen;
