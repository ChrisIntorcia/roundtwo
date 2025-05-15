import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

const db = getFirestore();

export default function OrderDetailsScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const orderRef = doc(db, 'orders', orderId);
        const orderSnap = await getDoc(orderRef);
        if (orderSnap.exists()) {
          setOrder(orderSnap.data());
        } else {
          setError('Order not found');
        }
      } catch (err) {
        setError('Failed to fetch order');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E76A54" />
        <Text>Loading order details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={40} color="#E76A54" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Order Details</Text>
      <Text style={styles.label}>Product:</Text>
      <Text style={styles.value}>{order.title}</Text>
      <Text style={styles.label}>Quantity:</Text>
      <Text style={styles.value}>{order.quantity}</Text>
      <Text style={styles.label}>Price:</Text>
      <Text style={styles.value}>${order.price}</Text>
      <Text style={styles.label}>Buyer Email:</Text>
      <Text style={styles.value}>{order.buyerEmail}</Text>
      <Text style={styles.label}>Shipping Address:</Text>
      <Text style={styles.value}>{order.shippingAddress ? JSON.stringify(order.shippingAddress) : 'N/A'}</Text>
      <Text style={styles.label}>Order Status:</Text>
      <Text style={styles.value}>{order.fulfilled ? 'Shipped' : 'Pending'}</Text>
      <Text style={styles.label}>Purchased At:</Text>
      <Text style={styles.value}>{order.purchasedAt?.toDate ? order.purchasedAt.toDate().toLocaleString() : ''}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    color: '#222',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    color: '#666',
  },
  value: {
    fontSize: 16,
    color: '#222',
    marginBottom: 8,
  },
  errorText: {
    color: '#E76A54',
    fontSize: 18,
    marginTop: 16,
  },
}); 