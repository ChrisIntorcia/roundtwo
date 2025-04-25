import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Alert } from 'react-native';

const { width } = Dimensions.get('window');

const ProductDetailsScreen = ({ route }) => {
  const { product } = route.params;

  const handleBuy = async (isBulk) => {
    const quantity = isBulk ? product.bulkQuantity : 1;
    const price = isBulk ? product.bulkPrice : product.fullPrice;
  
    // Call your Firebase Function to create a Stripe PaymentIntent
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
  
      // Use your existing Stripe integration here to present the PaymentSheet
      // For example:
      // await initPaymentSheet({ ...data });
      // await presentPaymentSheet();
  
      Alert.alert('Success', `Ready to pay $${price} for ${quantity} item(s).`);
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', 'There was a problem processing your payment.');
    }
  };  

  return (
    <ScrollView style={styles.safeArea} showsVerticalScrollIndicator={false}>
      <Image source={{ uri: product.images[0] }} style={styles.headerImage} />

      <View style={styles.contentCard}>
        <Text style={styles.title}>{product.title}</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{product.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seller Info</Text>
          <Text style={styles.sellerText}>
            {product.vendorName} – {product.location}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Buy Options</Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.buyButton} onPress={() => handleBuy(false)}>
              <Text style={styles.buyButtonText}>Buy Now for ${product.fullPrice}</Text>
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
  priceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f2f2f2',
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  priceBox: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
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

  buttonGroup: { flexDirection: 'column', gap: 10 },
  buyButton: {
    backgroundColor: '#E76A54',
    paddingVertical: 12,
    borderRadius: 32,
    alignItems: 'center',
    marginBottom: 10,
  },
  bulkBuyButton: {
    backgroundColor: '#E76A54',
    paddingVertical: 12,
    borderRadius: 32,
    alignItems: 'center',
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  

});

export default ProductDetailsScreen;