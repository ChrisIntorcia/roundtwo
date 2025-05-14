import React, { useState } from 'react';
import { View, Image, Text, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../viewerstyles'; // ✅ ensure correct path

const ProductPanel = ({ selectedProduct, countdownSeconds, onOpenQueue }) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [showPriceDetails, setShowPriceDetails] = useState(false);

  if (!selectedProduct) {
    return (
      <View style={[styles.productPanel, styles.emptyPanel]}>
        <Ionicons name="cart-outline" size={32} color="#ccc" />
        <Text style={styles.emptyPanelText}>
          The next product is about to drop. Stick around or you might miss it!
        </Text>
      </View>
    );
  }

  const discountPercentage = selectedProduct.fullPrice && selectedProduct.bulkPrice
    ? Math.round(((selectedProduct.fullPrice - selectedProduct.bulkPrice) / selectedProduct.fullPrice) * 100)
    : 0;

  const shippingPrice = selectedProduct.shippingRate || 0;
  const totalPrice = (selectedProduct.bulkPrice || 0) + shippingPrice;

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
        <View style={styles.titleRow}>
          <Text style={styles.productTitle} numberOfLines={1}>
            {selectedProduct.title}
          </Text>
          {countdownSeconds > 0 && (
            <View style={styles.timerBox}>
              <Ionicons name="time-outline" size={14} color="#000" />
              <Text style={styles.timerText}>{countdownSeconds}s</Text>
            </View>
          )}
        </View>

        {selectedProduct.description && (
          <Text style={styles.productDescription} numberOfLines={2}>
            {selectedProduct.description}
          </Text>
        )}

        <View style={styles.priceContainer}>
          {selectedProduct.fullPrice && (
            <Text style={styles.originalPrice}>
              ${Number(selectedProduct.fullPrice).toFixed(2)}
            </Text>
          )}
          <Text style={styles.productPrice}>
            ${Number(selectedProduct.bulkPrice || 0).toFixed(2)}
          </Text>
          <Text style={styles.feesText}>+ Fees</Text>
          <TouchableOpacity onPress={() => setShowPriceDetails(true)}>
            <Text style={styles.seeMoreButton}>See More</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showPriceDetails}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPriceDetails(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPriceDetails(false)}
        >
          <View style={styles.priceDetailsModal}>
            <View style={styles.priceDetailRow}>
              <Text style={styles.priceDetailLabel}>Bulk Price:</Text>
              <Text style={styles.priceDetailValue}>
                ${Number(selectedProduct.bulkPrice || 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.priceDetailRow}>
              <Text style={styles.priceDetailLabel}>Shipping:</Text>
              <Text style={styles.priceDetailValue}>
                ${Number(shippingPrice).toFixed(2)}
              </Text>
            </View>
            <View style={[styles.priceDetailRow, { marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 8 }]}>
              <Text style={styles.priceDetailLabel}>Total:</Text>
              <Text style={styles.priceDetailValue}>
                ${Number(totalPrice).toFixed(2)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default ProductPanel;
