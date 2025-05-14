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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import CustomHeader from '../../components/CustomHeader';
import StreamCard from './StreamCard';
import DailyDrops from './DailyDrops';
import ProductCard from './ProductCard';
import { validateUsername } from '../../utils/authUtils';

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

  const fetchProducts = () => {
    const q = collection(db, 'products');
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(items);
    });
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

  useEffect(() => {
    const unsubscribeStreams = fetchLiveStreams();
    const unsubscribeProducts = fetchProducts();
    checkUserProfile();
    return () => {
      unsubscribeStreams();
      unsubscribeProducts();
    };
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchLiveStreams();
    fetchProducts();
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
          {liveStreams.length > 0 && (
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
          )}

          {/* Daily Drops */}
          <View style={styles.section}>
            <DailyDrops />
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
              <TouchableOpacity onPress={() => Alert.alert('Coming Soon')} activeOpacity={0.7}>
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
});

export default HomeScreen;
