import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView } from 'react-native';

const ProductDetailsScreen = ({ route }) => {
  const { product } = route.params;

  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: product.images[0] }} style={styles.image} />
      <Text style={styles.title}>{product.title}</Text>
      <Text style={styles.price}>Price: ${product.fullPrice}</Text>
      <Text style={styles.groupPrice}>Group Price: ${product.groupPrice}</Text>
      <Text style={styles.groupAmount}>Group Amount: {product.groupAmount}</Text>
      <Text style={styles.description}>{product.description}</Text>
      <Text style={styles.sellerInfo}>
        Seller: {product.ranchName} - {product.location}
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  image: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  price: {
    fontSize: 16,
    marginBottom: 5,
  },
  groupPrice: {
    fontSize: 16,
    marginBottom: 5,
  },
  groupAmount: {
    fontSize: 16,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    marginBottom: 10,
  },
  sellerInfo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'gray',
  },
});

export default ProductDetailsScreen;
