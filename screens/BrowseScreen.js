import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getFirestore, collection, onSnapshot, query, limit, orderBy } from "firebase/firestore";
import FastImage from "react-native-fast-image";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const db = getFirestore();
const { width } = Dimensions.get('window');
const CARD_MARGIN = 8;
const CARD_WIDTH = (width - (CARD_MARGIN * 6)) / 2;

const BrowseScreen = () => {
  const [productItems, setProductItems] = useState([]);
  const [etsyItems, setEtsyItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigation = useNavigation();

  const fetchData = () => {
    try {
      const productsQuery = query(
        collection(db, "products"), 
        orderBy("createdAt", "desc"),
        limit(50)
      );
      
      const unsubscribeProducts = onSnapshot(productsQuery, 
        (snapshot) => {
          const productList = snapshot.docs.map((doc) => ({
            id: doc.id,
            type: 'product',
            ...doc.data(),
          }));
          setProductItems(productList);
          setLoading(false);
          setIsRefreshing(false);
        },
        (error) => {
          console.error('Products error:', error);
          setError(error.message);
          setLoading(false);
          setIsRefreshing(false);
        }
      );

      const etsyQuery = query(
        collection(db, "etsy_candy"),
        limit(50)
      );
      
      const unsubscribeEtsy = onSnapshot(etsyQuery,
        (snapshot) => {
          const etsyList = snapshot.docs.map((doc) => ({
            id: doc.id,
            type: 'etsy',
            ...doc.data(),
          }));
          setEtsyItems(etsyList);
          setLoading(false);
          setIsRefreshing(false);
        },
        (error) => {
          console.error('Etsy error:', error);
          setError(error.message);
          setLoading(false);
          setIsRefreshing(false);
        }
      );

      return () => {
        unsubscribeProducts();
        unsubscribeEtsy();
      };
    } catch (err) {
      console.error('Setup error:', err);
      setError(err.message);
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = fetchData();
    return () => unsubscribe?.();
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const normalizeItem = (item) => {
    if (item.type === 'etsy') {
      return {
        ...item,
        images: [item.imageUrl],
        fullPrice: item.price,
        groupPrice: item.price,
      };
    }
    return item;
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Discover</Text>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="filter-outline" size={24} color="#222" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderItem = ({ item }) => {
    const normalizedItem = normalizeItem(item);
    const imageUrl =
      normalizedItem.images && Array.isArray(normalizedItem.images) && normalizedItem.images[0]
        ? normalizedItem.images[0]
        : null;
    
    const discount = item.type !== 'etsy' ? 
      Math.round(((normalizedItem.fullPrice - normalizedItem.groupPrice) / normalizedItem.fullPrice) * 100) : 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("ProductDetailsScreen", { product: normalizedItem })}
        activeOpacity={0.8}
      >
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <FastImage
              source={{ uri: imageUrl, priority: FastImage.priority.normal }}
              style={styles.image}
              resizeMode={FastImage.resizeMode.cover}
            />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Ionicons name="image-outline" size={24} color="#999" />
            </View>
          )}
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discount}% OFF</Text>
            </View>
          )}
          {item.type === 'etsy' && (
            <View style={styles.etsyBadge}>
              <Text style={styles.etsyText}>Etsy</Text>
            </View>
          )}
        </View>
        
        <View style={styles.cardContent}>
          <Text style={styles.title} numberOfLines={2}>
            {normalizedItem.title}
          </Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.price}>${parseFloat(normalizedItem.fullPrice).toFixed(2)}</Text>
            {normalizedItem.groupPrice && normalizedItem.groupPrice !== normalizedItem.fullPrice && (
              <Text style={styles.livePrice}>
                Live: ${parseFloat(normalizedItem.groupPrice).toFixed(2)}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="bag-handle-outline" size={64} color="#ddd" />
      <Text style={styles.emptyText}>No Products Found</Text>
      <Text style={styles.emptySubtext}>Check back later for new items</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E76A54" />
        <Text style={styles.loadingText}>Finding amazing products...</Text>
      </View>
    );
  }

  const allItems = [...productItems, ...etsyItems];

  return (
    <SafeAreaView style={styles.container}>
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#E76A54" />
          <Text style={styles.errorText}>Oops! Something went wrong</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={allItems}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#E76A54"
            />
          }
          removeClippedSubviews={true}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={12}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#222',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  grid: {
    paddingHorizontal: CARD_MARGIN * 2,
    paddingBottom: CARD_MARGIN * 2,
  },
  row: {
    justifyContent: 'space-between',
  },
  card: {
    width: CARD_WIDTH,
    marginTop: CARD_MARGIN * 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: CARD_WIDTH * 1.2,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f8f8f8',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E76A54',
    marginBottom: 2,
  },
  livePrice: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#E76A54',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  etsyBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#F56400',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  etsyText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
  },
  emptyText: {
    fontSize: 20,
    color: '#333',
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#666',
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#E76A54',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BrowseScreen;