import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FastImage from 'react-native-fast-image';

const ProductCard = ({ imageUrl, name, fullPrice, bulkPrice, brand }) => {
  const parsedFullPrice = parseFloat(fullPrice);
  const parsedBulkPrice = parseFloat(bulkPrice);

  const displayFullPrice = isNaN(parsedFullPrice) ? null : `$${parsedFullPrice.toFixed(2)}`;
  const displayBulkPrice = isNaN(parsedBulkPrice) ? '$0.00' : `$${parsedBulkPrice.toFixed(2)}`;

  return (
    <View style={styles.card}>
      <FastImage
        source={{ uri: imageUrl, priority: FastImage.priority.high }}
        style={styles.image}
        resizeMode={FastImage.resizeMode.cover}
      />
      <View style={styles.content}>
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
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  fullPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E76A54',
    marginRight: 8,
  },
  bulkPrice: {
    fontSize: 14,
    color: '#666',
  },
});

export default ProductCard;
