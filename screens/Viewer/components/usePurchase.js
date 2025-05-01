import { useState } from 'react';
import { Alert } from 'react-native';
import { auth } from '../../../firebaseConfig';
import { doc, getDoc, addDoc, runTransaction, collection } from 'firebase/firestore';


export default function usePurchase({ db, selectedProduct, channel, setShowConfetti, setPurchaseBanner }) {
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handleBuy = async (purchaseQty = 1) => {
    const user = auth.currentUser;
    if (!user || !selectedProduct) {
      Alert.alert('Error', 'Missing user or product information');
      return;
    }

    try {
      setIsPurchasing(true);

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const shipping = userDoc.data()?.shippingAddress;
      const hasCard = userDoc.data()?.hasSavedPaymentMethod;

      if (!shipping || !hasCard) {
        Alert.alert(
          'Missing Info',
          'You are required to have payment and shipping info to purchase this item.'
        );
        return;
      }

      if (!selectedProduct.bulkPrice || !selectedProduct.stripeAccountId) {
        throw new Error('Missing product details.');
      }

      if (!user.email) {
        throw new Error('Missing buyer email.');
      }

      const res = await fetch(
        'https://us-central1-roundtwo-cc793.cloudfunctions.net/createPaymentIntent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: selectedProduct.id,
            buyerEmail: user.email,
            stripeAccountId: selectedProduct.stripeAccountId,
            application_fee_amount: Math.round((selectedProduct.bulkPrice + selectedProduct.shippingRate) * 100 * purchaseQty * 0.1),
            amount: Math.round((selectedProduct.bulkPrice + selectedProduct.shippingRate) * 100 * purchaseQty),
          }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Payment failed.');
      }

      setShowConfetti(true);
      const buyerUsername =
        userDoc.data()?.username ||
        userDoc.data()?.displayName ||
        user.email.split('@')[0];

      setPurchaseBanner(`${buyerUsername} Purchase Complete! "${selectedProduct.title}"`);

      await addDoc(collection(db, 'users', user.uid, 'purchases'), {
        productId: selectedProduct.id,
        title: selectedProduct.title,
        price: (selectedProduct.bulkPrice + selectedProduct.shippingRate) * purchaseQty,
        quantity: purchaseQty,
        sellerId: selectedProduct.sellerId,
        channel,
        purchasedAt: new Date(),
      });

      const streamDoc = await getDoc(doc(db, 'livestreams', channel));
      const streamTitle = streamDoc.data()?.title || '';

      await addDoc(collection(db, 'orders'), {
        buyerId: user.uid,
        buyerEmail: user.email,
        sellerId: selectedProduct.sellerId,
        productId: selectedProduct.id,
        title: selectedProduct.title,
        price: (selectedProduct.bulkPrice + selectedProduct.shippingRate) * purchaseQty,
        quantity: purchaseQty,
        shippingAddress: shipping,
        channel,
        streamTitle,
        fulfilled: false,
        purchasedAt: new Date(),
      });

      const productId = selectedProduct.id;
      const newQty = selectedProduct.groupAmount - purchaseQty;

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

    } catch (err) {
      console.error('🔥 handleBuy error:', err.message);
      Alert.alert('Purchase Failed', err.message);
      throw err; // Re-throw to let BuyButton know it failed
    } finally {
      setIsPurchasing(false);
    }
  };

  return { handleBuy, isPurchasing };
}
