import React, { useState, useEffect } from 'react';
import { View, Image, Text, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { auth } from '../../../firebaseConfig';
import styles from '../viewerstyles'; // ✅ ensure correct path

const ProductPanel = ({ selectedProduct, countdownSeconds, onOpenQueue, channel }) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [showPriceDetails, setShowPriceDetails] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [gamifiedDiscount, setGamifiedDiscount] = useState(false);

  useEffect(() => {
    const fetchDiscountData = async () => {
      if (!selectedProduct || !channel) return;
      try {
        const db = getFirestore();
        const user = auth.currentUser;
        if (!user) return;

        const streamDoc = await getDoc(doc(db, 'livestreams', channel));
        setGamifiedDiscount(streamDoc.data()?.gamifiedDiscount || false);

        const streakDoc = await getDoc(doc(db, 'livestreams', channel, 'streaks', user.uid));
        const count = streakDoc.exists() ? streakDoc.data().purchaseCount || 0 : 0;
        setStreakCount(count);
      } catch (err) {
        console.warn('🔥 Error fetching discount/streak info:', err);
      }
    };

    fetchDiscountData();
  }, [selectedProduct, channel]);

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

  const fullPrice = Number(selectedProduct.fullPrice || 0);
  const shippingPrice = Number(selectedProduct.shippingRate || 0);

  const discountPercentage = gamifiedDiscount ? Math.min((streakCount + 1) * 10, 50) : 0;
  const discountedPrice = fullPrice * (1 - discountPercentage / 100);
  const totalPrice = discountedPrice + shippingPrice;

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
          {fullPrice > 0 && (
            <Text style={styles.originalPrice}>
              ${fullPrice.toFixed(2)}
            </Text>
          )}
          <Text style={styles.productPrice}>
            ${discountedPrice.toFixed(2)}
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
              <Text style={styles.priceDetailLabel}>Discounted Price:</Text>
              <Text style={styles.priceDetailValue}>${discountedPrice.toFixed(2)}</Text>
            </View>
            <View style={styles.priceDetailRow}>
              <Text style={styles.priceDetailLabel}>Shipping:</Text>
              <Text style={styles.priceDetailValue}>${shippingPrice.toFixed(2)}</Text>
            </View>
            <View style={[styles.priceDetailRow, { marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 8 }]}>
              <Text style={styles.priceDetailLabel}>Total:</Text>
              <Text style={styles.priceDetailValue}>${totalPrice.toFixed(2)}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default ProductPanel;
