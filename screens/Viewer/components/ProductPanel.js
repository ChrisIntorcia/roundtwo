import React, { useState } from 'react';
import { View, Image, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../viewerstyles'; // ✅ ensure correct path

const ProductPanel = ({ selectedProduct, countdownSeconds, onOpenQueue }) => {
  const [imageLoading, setImageLoading] = useState(true);

  if (selectedProduct) {
    const discountPercentage = selectedProduct.fullPrice && selectedProduct.bulkPrice
      ? Math.round(((selectedProduct.fullPrice - selectedProduct.bulkPrice) / selectedProduct.fullPrice) * 100)
      : 0;

    return (
      <View style={styles.productPanel}>
        <View style={styles.imageContainer}>
          {imageLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#E76A54" />
            </View>
          )}
          <Image 
            source={{ uri: selectedProduct.images?.[0] }} 
            style={styles.productImage}
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
          />
        </View>
        
        <View style={styles.productDetails}>
          <View style={styles.priceContainer}>
            {selectedProduct.fullPrice && (
              <Text style={styles.originalPrice}>
                ${Number(selectedProduct.fullPrice).toFixed(2)}
              </Text>
            )}
            <Text style={styles.productPrice}>
              ${Number(selectedProduct.bulkPrice || 0).toFixed(2)}
            </Text>
            {discountPercentage > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{discountPercentage}%</Text>
              </View>
            )}
          </View>

          <Text style={styles.productTitle} numberOfLines={1}>
            {selectedProduct.title}
          </Text>

          {selectedProduct.description && (
            <Text style={styles.productDescription} numberOfLines={2}>
              {selectedProduct.description}
            </Text>
          )}

          <View style={styles.metaContainer}>
            <View style={styles.stockContainer}>
              <Ionicons name="cube-outline" size={14} color="#ccc" />
              <Text style={styles.productMeta}>
                ${Number(selectedProduct.shippingRate || 0).toFixed(2)} shipping
              </Text>
            </View>
            
            {countdownSeconds > 0 && (
              <View style={styles.timerBox}>
                <Ionicons name="time-outline" size={14} color="#000" />
                <Text style={styles.timerText}>{countdownSeconds}s</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.productPanel, styles.emptyPanel]}>
      <Ionicons name="cart-outline" size={32} color="#ccc" />
      <Text style={styles.emptyPanelText}>
        The next product is about to drop. Stick around or you might miss it!
      </Text>
    </View>
  );
};

export default ProductPanel;
