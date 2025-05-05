import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ProductCard = ({ imageUrl, name, fullPrice, bulkPrice, brand }) => {
  const parsedFullPrice = parseFloat(fullPrice);
  const parsedBulkPrice = parseFloat(bulkPrice);

  const displayFullPrice = isNaN(parsedFullPrice) ? null : `$${parsedFullPrice.toFixed(2)}`;
  const displayBulkPrice = isNaN(parsedBulkPrice) ? '$0.00' : `$${parsedBulkPrice.toFixed(2)}`;

  return (
    <View style={styles.card}>
      <Image
        source={{ uri: imageUrl }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.content}>
        <Text style={styles.brand}>{brand}</Text>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <View style={styles.row}>
          <View style={styles.priceGroup}>
            {displayFullPrice && (
              <Text style={styles.fullPrice}>{displayFullPrice}</Text>
            )}
            <Text style={styles.bulkPrice}>{displayBulkPrice}</Text>
          </View>
          <Ionicons name="cube-outline" size={16} color="#F97316" />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
  },
  image: {
    height: 120,
    width: '100%',
    backgroundColor: '#eee',
  },
  content: {
    padding: 12,
  },
  brand: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: '#222',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  priceGroup: {
    flexDirection: 'column',
  },
  fullPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
    color: '#999',
  },
  bulkPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default ProductCard;
