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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import CustomHeader from '../../components/CustomHeader';
import StreamCard from './StreamCard';
import DailyDrops from './DailyDrops';
import ProductCard from './ProductCard';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 12;
const CARD_WIDTH = (width - CARD_MARGIN * 3) / 2;

const HomeScreen = () => {
  const navigation = useNavigation();
  const [liveStreams, setLiveStreams] = useState([]);
  const [products, setProducts] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    const unsubscribeStreams = fetchLiveStreams();
    const unsubscribeProducts = fetchProducts();
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
              <Text style={styles.linkText}>See all</Text>
            </View>
            <View style={styles.productsGrid}>
              {products.map((product) => (
                <View key={product.id} style={styles.productCard}>
                  <ProductCard
                    imageUrl={product.images?.[0]}
                    name={product.title}
                    fullPrice={product.fullPrice}
                    bulkPrice={product.bulkPrice}
                    brand={product.sellerId}
                  />
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
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
});

export default HomeScreen;
