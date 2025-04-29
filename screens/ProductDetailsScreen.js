import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Alert } from 'react-native';

const { width } = Dimensions.get('window');

const ProductDetailsScreen = ({ route }) => {
  const { product } = route.params;

  const handleBuy = async (isBulk) => {
    const quantity = isBulk ? product.bulkQuantity : 1;
    const price = isBulk ? product.bulkPrice : product.fullPrice;

    try {
      const response = await fetch('https://your-cloud-function-url/createPaymentSheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          amount: price * 100, // in cents
          quantity,
          sellerId: product.sellerId,
          type: isBulk ? 'bulk' : 'single',
        }),
      });

      const data = await response.json();
      if (!data.paymentIntent) throw new Error('No PaymentIntent received');

      // Present the PaymentSheet (depends on your integration)
      Alert.alert('Success', `Ready to pay $${price} for ${quantity} item(s).`);
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', 'There was a problem processing your payment.');
    }
  };

  const safeTitle = product.title && product.title !== "Title" ? product.title : "Untitled Product";
  const safeDescription = product.description && product.description !== "Description" ? product.description : "No description provided by seller.";
  const safeSellerName = product.vendorName && product.vendorName !== "-"
    ? product.vendorName
    : product.username || "Verified Seller";
  const safeLocation = product.location && product.location !== "-" ? ` – ${product.location}` : "";

  return (
    <ScrollView style={styles.safeArea} showsVerticalScrollIndicator={false}>
      {product.images && product.images.length > 0 && (
        <Image source={{ uri: product.images[0] }} style={styles.headerImage} />
      )}

      <View style={styles.contentCard}>
        <Text style={styles.title}>{safeTitle}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{safeDescription}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seller Info</Text>
          <Text style={styles.sellerText}>
            {safeSellerName}{safeLocation}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Buy Options</Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.buyButton} onPress={() => handleBuy(false)}>
              <Text style={styles.buyButtonText}>
                {product.fullPrice ? `Buy Now for $${product.fullPrice}` : 'Buy Now'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  headerImage: {
    width: width,
    height: 300,
    resizeMode: 'cover',
  },
  contentCard: {
    backgroundColor: '#fff',
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222',
    marginBottom: 16,
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
    fontSize: 14,
    color: '#444',
    lineHeight: 22,
  },
  sellerText: {
    fontSize: 14,
    color: '#444',
    fontWeight: '500',
  },
  buttonGroup: {
    flexDirection: 'column',
    gap: 10,
  },
  buyButton: {
    backgroundColor: '#E76A54',
    paddingVertical: 12,
    borderRadius: 32,
    alignItems: 'center',
    marginBottom: 10,
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProductDetailsScreen;
