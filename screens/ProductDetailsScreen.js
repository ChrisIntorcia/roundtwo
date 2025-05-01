import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import FastImage from 'react-native-fast-image';
import { getFirestore, collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const { width } = Dimensions.get('window');

const ProductDetailsScreen = ({ route }) => {
  const { product } = route.params;
  const navigation = useNavigation();
  
  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#222" />
          </TouchableOpacity>
        </View>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.errorText}>Product not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const handleBuy = async (isBulk) => {
    const user = getAuth().currentUser;
    if (!user) {
      Alert.alert('Login Required', 'Please log in to make a purchase.');
      return;
    }

    // Check for payment and shipping info
    const db = getFirestore();
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const shipping = userDoc.data()?.shippingAddress;
    const hasCard = userDoc.data()?.hasSavedPaymentMethod;

    if (!shipping || !hasCard) {
      Alert.alert(
        'Setup Required',
        'You need to add payment and shipping information before making a purchase.',
        [
          {
            text: 'Add Payment Info',
            onPress: () => navigation.navigate('PaymentsShipping')
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
      return;
    }

    setLoading(true);
    const quantity = isBulk ? product.bulkQuantity : 1;
    const price = isBulk ? product.bulkPrice : product.fullPrice;
    const shippingRate = product.shippingRate || 0;
    const totalPrice = (price + shippingRate) * quantity;

    try {
      const response = await fetch(
        'https://us-central1-roundtwo-cc793.cloudfunctions.net/createPaymentIntent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: product.id,
            buyerEmail: user.email,
            stripeAccountId: product.stripeAccountId,
            application_fee_amount: Math.round(totalPrice * 100 * 0.1), // 10% fee
            amount: Math.round(totalPrice * 100), // Convert to cents
          }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Payment request failed');
      }

      if (!data.success) {
        throw new Error('Payment setup failed');
      }

      // Create the order in Firestore
      const orderRef = doc(collection(db, 'orders'));
      await setDoc(orderRef, {
        buyerId: user.uid,
        buyerEmail: user.email,
        sellerId: product.sellerId,
        productId: product.id,
        title: product.title,
        price: totalPrice,
        quantity,
        shippingAddress: shipping,
        fulfilled: false,
        purchasedAt: new Date(),
      });

      Alert.alert('Success', `Order placed! Total: $${totalPrice.toFixed(2)}`);
      navigation.goBack();
      
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert(
        'Payment Failed',
        error.message || 'There was a problem processing your payment. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${product.title} on RoundTwo!\n${product.images[0]}`,
        title: product.title,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleContactSeller = () => {
    navigation.navigate('MessagesScreen', {
      otherUserId: product.sellerId,
      otherUsername: product.username || 'Seller',
    });
  };

  const submitReport = async (reason) => {
    const db = getFirestore();
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return;
  
    try {
      const reportRef = doc(collection(db, 'reports'));
      await setDoc(reportRef, {
        productId: product.id,
        reportedBy: currentUser.uid,
        reason,
        type: 'product',
        timestamp: new Date(),
      });
      Alert.alert('Report submitted', 'Thanks for helping keep the platform safe.');
    } catch (err) {
      console.error('Error reporting product:', err);
      Alert.alert('Error', 'Failed to submit report');
    }
  };

  const safeTitle = product.title && product.title !== "Title" ? product.title : "Untitled Product";
  const safeDescription = product.description && product.description !== "Description" ? product.description : "No description provided by seller.";
  const safeSellerName = product.vendorName && product.vendorName !== "-"
    ? product.vendorName
    : product.username || "Verified Seller";
  const safeLocation = product.location && product.location !== "-" ? ` – ${product.location}` : "";
  const hasMultipleImages = product.images && product.images.length > 1;

  const renderImagePagination = () => {
    if (!hasMultipleImages) return null;
    return (
      <View style={styles.paginationContainer}>
        {product.images.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === currentImageIndex && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.safeArea} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#222" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={24} color="#222" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
            setCurrentImageIndex(newIndex);
          }}
        >
          {product.images && product.images.map((image, index) => (
            <FastImage
              key={index}
              source={{ uri: image }}
              style={styles.headerImage}
              resizeMode={FastImage.resizeMode.cover}
            />
          ))}
        </ScrollView>
        {renderImagePagination()}

        <View style={styles.contentCard}>
          <Text style={styles.title}>{safeTitle}</Text>
          
          {/* Price and Shipping Section */}
          <View style={styles.priceContainer}>
            <View style={styles.mainPriceSection}>
              <Text style={styles.price}>
                ${product.fullPrice}
                <Text style={styles.priceLabel}> • Single Item</Text>
              </Text>
              {product.bulkPrice && (
                <Text style={styles.bulkPrice}>
                  ${product.bulkPrice}
                  <Text style={styles.priceLabel}> • Bulk Price ({product.bulkQuantity}+ items)</Text>
                </Text>
              )}
            </View>
            
            <View style={styles.shippingSection}>
              <View style={styles.shippingRow}>
                <Ionicons name="airplane-outline" size={20} color="#666" />
                <Text style={styles.shippingText}>
                  Shipping: ${(product.shippingRate || 0).toFixed(2)}
                </Text>
              </View>
              {product.shippingRate > 0 && (
                <Text style={styles.totalText}>
                  Total with shipping: ${(product.fullPrice + (product.shippingRate || 0)).toFixed(2)}
                </Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.sellerContainer}
            onPress={() => navigation.navigate('ProfileScreen', { userId: product.sellerId })}
          >
            <View style={styles.sellerAvatar}>
              {product.sellerAvatar ? (
                <FastImage
                  source={{ uri: product.sellerAvatar }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {safeSellerName.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{safeSellerName}</Text>
              {safeLocation && (
                <Text style={styles.location}>{safeLocation}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{safeDescription}</Text>
          </View>

          {product.condition && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Condition</Text>
              <View style={styles.conditionBadge}>
                <Text style={styles.conditionText}>{product.condition}</Text>
              </View>
            </View>
          )}

          {product.tags && product.tags.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagsContainer}>
                {product.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.messageButton}
          onPress={() => setShowOptions(true)}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#E76A54" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.buyButton, loading && styles.buyButtonDisabled]}
          onPress={() => handleBuy(false)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buyButtonText}>
              Buy Now • ${(product.fullPrice + (product.shippingRate || 0)).toFixed(2)}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {showOptions && (
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptions(false)}
        >
          <View style={styles.optionsModal}>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                setShowOptions(false);
                handleContactSeller();
              }}
            >
              <Ionicons name="chatbubble-outline" size={24} color="#E76A54" />
              <Text style={styles.optionText}>Message Seller</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                setShowOptions(false);
                Alert.alert(
                  "Report Product",
                  "Why are you reporting this product?",
                  [
                    { text: 'Counterfeit or Unauthorized Replica', onPress: () => submitReport('counterfeit') },
                    { text: 'Inappropriate Content', onPress: () => submitReport('inappropriate') },
                    { text: 'Misleading Description', onPress: () => submitReport('misleading') },
                    { text: 'Prohibited Item', onPress: () => submitReport('prohibited') },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              }}
            >
              <Ionicons name="flag-outline" size={24} color="#E76A54" />
              <Text style={styles.optionText}>Report Product</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    zIndex: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerImage: {
    width: width,
    height: 400,
  },
  paginationContainer: {
    flexDirection: 'row',
    position: 'absolute',
    top: 360,
    alignSelf: 'center',
    zIndex: 1,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#fff',
    width: 12,
  },
  contentCard: {
    backgroundColor: '#fff',
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },
  priceContainer: {
    marginBottom: 20,
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 12,
  },
  mainPriceSection: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 12,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: '#E76A54',
    marginBottom: 4,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
  },
  bulkPrice: {
    fontSize: 18,
    color: '#E76A54',
    fontWeight: '600',
    marginTop: 4,
  },
  shippingSection: {
    marginTop: 8,
  },
  shippingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  shippingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  totalText: {
    fontSize: 16,
    color: '#222',
    fontWeight: '600',
    marginTop: 4,
  },
  sellerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  sellerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E76A54',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  location: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  conditionBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  conditionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E76A54',
    marginRight: 12,
  },
  messageButtonText: {
    color: '#E76A54',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buyButton: {
    flex: 2,
    backgroundColor: '#E76A54',
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButtonDisabled: {
    opacity: 0.7,
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  optionsModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#222',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default ProductDetailsScreen;
