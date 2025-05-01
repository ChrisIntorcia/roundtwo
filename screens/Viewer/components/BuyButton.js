import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import SwipeButton from 'rn-swipe-button';
import styles from '../viewerstyles';

export default function BuyButton({
  selectedProduct,
  purchaseQty,
  setPurchaseQty,
  handleBuy,
  swipeKey,
  setSwipeKey,
  swipeRef
}) {
  const [error, setError] = useState(null);
  const shakeAnimation = new Animated.Value(0);

  if (!selectedProduct) return null;

  const isSoldOut = selectedProduct.quantity <= 0;
  const maxQuantity = Math.min(selectedProduct.quantity, 10);

  const handleQuantityChange = (increment) => {
    const newQty = increment ? purchaseQty + 1 : purchaseQty - 1;
    if (newQty >= 1 && newQty <= maxQuantity) {
      setPurchaseQty(newQty);
    } else if (newQty > maxQuantity) {
      Animated.sequence([
        Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: -10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 0, duration: 100, useNativeDriver: true })
      ]).start();
    }
  };

  const handleBuySuccess = async () => {
    try {
      await handleBuy(purchaseQty);
      swipeRef.current?.reset();
      setSwipeKey(Date.now());
      setError(null);
    } catch (err) {
      setError('Failed to process purchase. Please try again.');
      swipeRef.current?.reset();
    }
  };

  return (
    <View style={styles.bottomBar}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity 
          style={[styles.qtyButton, isSoldOut && styles.disabledButton]} 
          onPress={() => handleQuantityChange(false)}
          disabled={isSoldOut}
        >
          <Text style={styles.qtyButtonText}>−</Text>
        </TouchableOpacity>

        <Animated.View style={{ transform: [{ translateX: shakeAnimation }] }}>
          <Text style={styles.qtyText}>{purchaseQty}</Text>
        </Animated.View>

        <TouchableOpacity 
          style={[styles.qtyButton, isSoldOut && styles.disabledButton]} 
          onPress={() => handleQuantityChange(true)}
          disabled={isSoldOut}
        >
          <Text style={styles.qtyButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {isSoldOut ? (
        <View style={[styles.buyButton, styles.soldOutButton]}> 
          <Text style={styles.buyText}>Sold Out</Text>
        </View>
      ) : (
        <SwipeButton
          ref={swipeRef}
          key={swipeKey}
          containerStyles={styles.swipeButton}
          railStyles={styles.swipeRail}
          thumbIconStyles={styles.swipeThumb}
          titleStyles={styles.swipeTitle}
          height={50}
          title="Swipe to Buy"
          onSwipeSuccess={handleBuySuccess}
          resetAfterSuccess={false}
          disabled={isSoldOut}
          railBackgroundColor="rgba(231, 106, 84, 0.9)"
          thumbIconBackgroundColor="#fff"
          titleColor="#fff"
        />
      )}
    </View>
  );
}
