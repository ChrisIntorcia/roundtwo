import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Alert } from 'react-native';
import SwipeButton from 'rn-swipe-button';
import styles from '../viewerstyles';
import { auth } from '../../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

const BuyButton = React.forwardRef(({
  selectedProduct,
  purchaseQty,
  setPurchaseQty,
  handleBuy,
  swipeKey,
  setSwipeKey,
  isPurchasing,
  db,
  navigation,
  channel
}, ref) => {
  const [error, setError] = useState(null);
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const [displayPrice, setDisplayPrice] = useState(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        if (!selectedProduct) return;

        const user = auth.currentUser;
        const streamDoc = await getDoc(doc(db, 'livestreams', channel));
        const gamifiedDiscount = streamDoc.data()?.gamifiedDiscount === true;

        let finalPrice = selectedProduct.bulkPrice || 0;

        if (gamifiedDiscount && user) {
          const streakDoc = await getDoc(doc(db, 'livestreams', channel, 'streaks', user.uid));
          const count = streakDoc.exists() ? streakDoc.data()?.purchaseCount || 0 : 0;
          const discount = Math.min((count + 1) * 0.1, 0.5);
          finalPrice = (selectedProduct.fullPrice * (1 - discount)).toFixed(2);
        }

        setDisplayPrice(finalPrice);
      } catch (e) {
        console.error('Error calculating buy button price:', e);
        setDisplayPrice((selectedProduct.bulkPrice || 0).toFixed(2));
      }
    };

    fetchPrice();
  }, [selectedProduct, channel]);

  if (!selectedProduct) return null;

  const isSoldOut = selectedProduct.quantity <= 0;
  const maxQuantity = Math.min(selectedProduct.quantity, 10);
  const shippingRate = selectedProduct.shippingRate || 0;
  const totalPrice = (parseFloat(displayPrice) + shippingRate) * purchaseQty;

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
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Login Required', 'Please log in to make a purchase.');
      ref.current?.reset();
      return;
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const shipping = userDoc.data()?.shippingAddress;
    const hasCard = userDoc.data()?.hasSavedPaymentMethod;

    if (!shipping || !hasCard) {
      Alert.alert(
        'Setup Required',
        'You need to add payment and shipping information before making a purchase.',
        [
          {
            text: 'Add Payment Info',
            onPress: () => {
              ref.current?.reset();
              navigation.navigate('PaymentsShipping');
            }
          },
          {
            text: 'Cancel',
            onPress: () => ref.current?.reset(),
            style: 'cancel'
          }
        ]
      );
      return;
    }

    try {
      setError(null);
      await handleBuy(purchaseQty);
      setSwipeKey(Date.now());
    } catch (err) {
      console.error('Buy error:', err);
      setError(err.message || 'Failed to process purchase. Please try again.');
    } finally {
      ref.current?.reset();
    }
  };

  return (
    <View style={styles.bottomBar}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity 
          style={[styles.qtyButton, (isSoldOut || isPurchasing) && styles.disabledButton]} 
          onPress={() => handleQuantityChange(false)}
          disabled={isSoldOut || isPurchasing}
        >
          <Text style={styles.qtyButtonText}>−</Text>
        </TouchableOpacity>

        <Animated.View style={{ transform: [{ translateX: shakeAnimation }] }}>
          <Text style={styles.qtyText}>{purchaseQty}</Text>
        </Animated.View>

        <TouchableOpacity 
          style={[styles.qtyButton, (isSoldOut || isPurchasing) && styles.disabledButton]} 
          onPress={() => handleQuantityChange(true)}
          disabled={isSoldOut || isPurchasing}
        >
          <Text style={styles.qtyButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {isSoldOut ? (
        <View style={[styles.buyButton, styles.soldOutButton]}> 
          <Text style={styles.buyText}>Sold Out</Text>
        </View>
      ) : (
        <SwipeButton
          ref={ref}
          key={swipeKey}
          containerStyles={styles.swipeButton}
          railStyles={styles.swipeRail}
          thumbIconStyles={styles.swipeThumb}
          titleStyles={styles.swipeTitle}
          height={50}
          title={isPurchasing ? "Processing..." : `Swipe to Buy • $${totalPrice.toFixed(2)}`}
          onSwipeSuccess={handleBuySuccess}
          resetAfterSuccess={true}
          disabled={isSoldOut || isPurchasing}
          railBackgroundColor={isPurchasing ? "rgba(231, 106, 84, 0.5)" : "rgba(231, 106, 84, 0.9)"}
          thumbIconBackgroundColor="#fff"
          titleColor="#fff"
          enableRightToLeftSwipe={false}
        />
      )}
    </View>
  );
});

export default BuyButton;
