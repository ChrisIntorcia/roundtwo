import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { auth } from '../../../firebaseConfig';

const ReviewCartScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { channel } = route.params;
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingOrder, setProcessingOrder] = useState(false);

  useEffect(() => {
    const fetchCart = async () => {
      const userId = auth.currentUser.uid;
      const cartRef = doc(getFirestore(), 'livestreamCarts', channel, 'users', userId);
      const cartSnap = await getDoc(cartRef);

      if (cartSnap.exists()) {
        setCart(cartSnap.data());
      } else {
        Alert.alert('Error', 'No items in cart');
        navigation.goBack();
      }
      setLoading(false);
    };

    fetchCart();
  }, [channel, navigation]);

  const handleCompleteOrder = async () => {
    setProcessingOrder(true);
    try {
      const userId = auth.currentUser.uid;
      const response = await fetch('https://us-central1-roundtwo-cc793.cloudfunctions.net/createCartPaymentIntent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, channel }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        Alert.alert('Success', 'Order completed successfully!');
        navigation.navigate('Home');
      } else {
        throw new Error(result.error || 'Failed to complete order');
      }
    } catch (error) {
      Alert.alert('Payment failed', error.message);
    } finally {
      setProcessingOrder(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#E76A54" style={styles.loading} />;
  }

  const calculateTotal = () => {
    let subtotal = 0;
    cart.items.forEach(item => {
      subtotal += item.price * item.quantity;
    });
    const shipping = cart.items.find(item => item.shippingRate > 0)?.shippingRate || 0;
    const total = subtotal + shipping;
    return { subtotal, shipping, total };
  };

  const { subtotal, shipping, total } = calculateTotal();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Review Cart</Text>
      </View>

      {cart.items.map((item, index) => (
        <View key={index} style={styles.itemContainer}>
          <Image source={{ uri: item.image }} style={styles.itemImage} />
          <View style={styles.itemDetails}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemQuantity}>Quantity: {item.quantity}</Text>
            <Text style={styles.itemPrice}>Price: ${item.price.toFixed(2)}</Text>
            <Text style={styles.itemSubtotal}>Subtotal: ${(item.price * item.quantity).toFixed(2)}</Text>
          </View>
        </View>
      ))}

      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>Subtotal: ${subtotal.toFixed(2)}</Text>
        <Text style={styles.summaryText}>Shipping: ${shipping.toFixed(2)}</Text>
        <Text style={styles.summaryText}>Total: ${total.toFixed(2)}</Text>
      </View>

      <TouchableOpacity style={styles.completeOrderButton} onPress={handleCompleteOrder} disabled={processingOrder}>
        {processingOrder ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.completeOrderButtonText}>Complete Order</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    color: '#E76A54',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  itemContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  itemImage: {
    width: 60,
    height: 60,
    marginRight: 16,
    borderRadius: 8,
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
  },
  itemSubtotal: {
    fontSize: 14,
    color: '#666',
  },
  summaryContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  completeOrderButton: {
    marginTop: 24,
    backgroundColor: '#E76A54',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeOrderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ReviewCartScreen;
