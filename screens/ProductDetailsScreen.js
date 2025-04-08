import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const ProductDetailsScreen = ({ route }) => {
  const { product } = route.params;

  return (
    <ScrollView style={styles.safeArea} showsVerticalScrollIndicator={false}>
      <Image source={{ uri: product.images[0] }} style={styles.headerImage} />

      <View style={styles.contentCard}>
        <Text style={styles.title}>{product.title}</Text>

        <View style={styles.priceCard}>
          <View style={styles.priceBox}>
            <Text style={styles.priceLabel}>Full Price</Text>
            <Text style={styles.priceValue}>${product.fullPrice}</Text>
          </View>
          <View style={styles.priceBox}>
            <Text style={styles.priceLabel}>Group Price</Text>
            <Text style={styles.priceValue}>${product.groupPrice}</Text>
          </View>
          <View style={styles.priceBox}>
            <Text style={styles.priceLabel}>Group Amount</Text>
            <Text style={styles.priceValue}>{product.groupAmount}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{product.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seller Info</Text>
          <Text style={styles.sellerText}>
            {product.ranchName} – {product.location}
          </Text>
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
});

export default ProductDetailsScreen;