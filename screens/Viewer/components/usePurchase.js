import { useState } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { auth } from '../../../firebaseConfig';
import {
  doc,
  getDoc,
  addDoc,
  runTransaction,
  collection,
  setDoc,
  query,
  getDocs,
  where
} from 'firebase/firestore';

export default function usePurchase({ db, selectedProduct, channel, setShowConfetti, setPurchaseBanner }) {
  const [isPurchasing, setIsPurchasing] = useState(false);

  const addToCart = async (purchaseQty = 1) => {
    const user = auth.currentUser;
    if (!user || !selectedProduct) {
      Alert.alert('Error', 'Missing user or product information');
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.data()?.hasSavedPaymentMethod || !userDoc.data()?.shippingAddress) {
        Alert.alert('Setup Required', 'You must save your payment and shipping info before buying.');
        return;
      }

      const cartRef = doc(db, 'livestreamCarts', channel, 'users', user.uid);
      const cartSnap = await getDoc(cartRef);

      const newItem = {
        productId: selectedProduct.id || '',
        title: selectedProduct.title || '',
        quantity: purchaseQty,
        price: selectedProduct.bulkPrice || selectedProduct.fullPrice || 0,
        shippingRate: selectedProduct.shippingRate || 0,
        image: selectedProduct.images?.[0] || '',
        stripeAccountId: selectedProduct.stripeAccountId || '',
        sellerId: selectedProduct.sellerId || '',
        currency: selectedProduct.currency || 'usd',
        createdAt: new Date(),
      };

      const productRefGlobal = doc(db, 'products', selectedProduct.id);
      const productRefUser = doc(db, 'users', selectedProduct.sellerId, 'products', selectedProduct.id);

      await runTransaction(db, async (transaction) => {
        const globalSnap = await transaction.get(productRefGlobal);
        const userSnap = await transaction.get(productRefUser);
        const currentQty = globalSnap.data()?.quantity;

        if (currentQty === undefined || currentQty < purchaseQty) {
          throw new Error('Not enough stock');
        }

        transaction.update(productRefGlobal, { quantity: currentQty - purchaseQty });

        if (userSnap.exists()) {
          transaction.update(productRefUser, { quantity: currentQty - purchaseQty });
        }
      });

      let cart = {
        items: [],
        shippingApplied: false,
        updatedAt: new Date(),
        userId: user.uid,
        channel: channel
      };

      if (cartSnap.exists()) {
        cart = {
          ...cartSnap.data(),
          updatedAt: new Date()
        };
      }

      const existingIndex = cart.items.findIndex(i => i.productId === newItem.productId);

      if (existingIndex >= 0) {
        cart.items[existingIndex].quantity += purchaseQty;
      } else {
        if (!cart.shippingApplied) {
          cart.shippingApplied = true;
        } else {
          newItem.shippingRate = 0;
        }
        cart.items.push(newItem);
      }

      await setDoc(cartRef, cart, { merge: true });

      setShowConfetti(true);
    } catch (err) {
      console.error('🔥 addToCart error:', err.message);
      Alert.alert('Add to Cart Failed', err.message);
    }
  };

  const handleBuy = async (purchaseQty = 1) => {
    if (isPurchasing) return;
      setIsPurchasing(true);
    const user = auth.currentUser;
    if (!user || !selectedProduct || !channel) {
      console.error('❌ handleBuy: Missing user, product, or channel', {
        userId: user?.uid,
        productId: selectedProduct?.id,
        channel
      });
      Alert.alert('Error', 'Missing user, product, or channel information');
      return;
    }

    try {
      setPurchaseBanner('Processing purchase...');
      console.log('🔄 handleBuy: Starting purchase process', {
        userId: user.uid,
        productId: selectedProduct.id,
        channel
      });

      // Always add to cart first
      await addToCart(purchaseQty);

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const shipping = userDoc.data()?.shippingAddress;
      const hasCard = userDoc.data()?.hasSavedPaymentMethod;

      if (!shipping || !hasCard) {
        console.log('❌ handleBuy: Missing shipping or payment info');
        Alert.alert(
          'Missing Info',
          'You are required to have payment and shipping info to purchase this item.'
        );
        return;
      }

      // Check if user has already made a purchase in this stream
      const purchasesQuery = query(
        collection(db, 'users', user.uid, 'purchases'),
        where('channel', '==', channel)
      );
      const purchasesSnap = await getDocs(purchasesQuery);
      const hasExistingPurchase = !purchasesSnap.empty;

      const price = selectedProduct.bulkPrice || selectedProduct.fullPrice;
      // Only apply shipping rate for first purchase in stream
      const shippingRate = hasExistingPurchase ? 0 : (selectedProduct.shippingRate || 0);
      // Ensure we have valid numbers and convert to cents
      const priceInCents = Math.round((Number(price) || 0) * 100);
      const shippingInCents = Math.round((Number(shippingRate) || 0) * 100);
      const totalAmount = (priceInCents + shippingInCents) * purchaseQty;
      const applicationFee = Math.round(totalAmount * 0.1);

      console.log('💰 handleBuy: Price calculation', {
        price,
        shippingRate,
        purchaseQty,
        hasExistingPurchase,
        priceInCents,
        shippingInCents,
        totalAmount,
        applicationFee
      });

      console.log('🔄 handleBuy: Calling createCartPaymentIntent', {
        userId: user.uid,
        channel
      });
      const res = await fetch(
        'https://us-central1-roundtwo-cc793.cloudfunctions.net/createCartPaymentIntent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: user.uid,
            channel
          }),
        }
      );

      // Log the raw response for debugging
      const responseText = await res.text();
      console.log('📦 handleBuy: Raw response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ handleBuy: Failed to parse response as JSON:', parseError);
        throw new Error(`Server returned invalid response: ${responseText.substring(0, 100)}...`);
      }

      console.log('📦 handleBuy: Payment intent response', data);

      if (!res.ok || !data.success) {
        console.error('❌ handleBuy: Payment failed', data.error);
        throw new Error(data.error || 'Payment failed.');
      }

      // Haptic feedback for successful purchase
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Show purchase complete banner immediately
      setPurchaseBanner(`${selectedProduct.title} Purchased`);
      if (shippingRate > 0) {
        setTimeout(() => {
          setPurchaseBanner('Free shipping on rest of this stream');
        }, 2000); // Show after 2 seconds
      }

      // Create purchase record
      await addDoc(collection(db, 'users', user.uid, 'purchases'), {
        productId: selectedProduct.id,
        title: selectedProduct.title,
        price: (price + shippingRate) * purchaseQty,
        quantity: purchaseQty,
        sellerId: selectedProduct.sellerId,
        channel,
        purchasedAt: new Date(),
      });
      console.log('✅ handleBuy: Purchase record created');

      // Create order
      const streamDoc = await getDoc(doc(db, 'livestreams', channel));
      const streamTitle = streamDoc.data()?.title || '';

      await addDoc(collection(db, 'orders'), {
        buyerId: user.uid,
        buyerEmail: user.email,
        sellerId: selectedProduct.sellerId,
        productId: selectedProduct.id,
        title: selectedProduct.title,
        price: (price + shippingRate) * purchaseQty,
        quantity: purchaseQty,
        shippingAddress: shipping,
        channel,
        streamTitle,
        fulfilled: false,
        purchasedAt: new Date(),
      });
      console.log('✅ handleBuy: Order created');

      // Update inventory
      const productId = selectedProduct.id;
      const productRefGlobal = doc(db, 'products', productId);
      const productRefUser = doc(db, 'users', selectedProduct.sellerId, 'products', productId);

      await runTransaction(db, async (transaction) => {
        const globalSnap = await transaction.get(productRefGlobal);
        const userSnap = await transaction.get(productRefUser);

        const currentQty = globalSnap.data()?.quantity;
        if (currentQty === undefined || currentQty < purchaseQty) {
          throw new Error('Not enough stock');
        }

        transaction.update(productRefGlobal, { quantity: currentQty - purchaseQty });

        if (userSnap.exists()) {
          transaction.update(productRefUser, { quantity: currentQty - purchaseQty });
        }
      });
      console.log('✅ handleBuy: Inventory updated');

    } catch (err) {
      console.error('❌ handleBuy error:', err.message);
      Alert.alert('Purchase Failed', err.message);
      throw err;
    } finally {
      setIsPurchasing(false);
    }
  };

  return { handleBuy, addToCart, isPurchasing };
}
