import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from 'react-native';
import { db } from '../../firebaseConfig';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { auth } from '../../firebaseConfig';
import { AppContext } from '../../context/AppContext';
import * as Print from 'expo-print';
import { useNavigation } from '@react-navigation/native';


const Order = () => {
  const { user } = useContext(AppContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const navigation = useNavigation();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'orders'),
      where('sellerId', '==', user.uid),
      orderBy('fulfilled'),
      orderBy('purchasedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOrders(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const toggleFulfilled = async (orderId, currentStatus) => {
    const ref = doc(db, 'orders', orderId);
    await updateDoc(ref, {
      fulfilled: !currentStatus,
      fulfilledAt: !currentStatus ? new Date() : null,
    });
  };

  const generatePackingSlip = async (order) => {
    const html = `
      <html>
        <body style="font-family: Arial; padding: 20px;">
          <h1>Packing Slip</h1>
          <p><strong>Product:</strong> ${order.title}</p>
          <p><strong>Price:</strong> $${order.price}</p>
          <p><strong>Buyer:</strong> ${order.buyerEmail}</p>
          <p><strong>Shipping Address:</strong></p>
          <pre>${JSON.stringify(order.shippingAddress, null, 2)}</pre>
          <p><strong>Tracking Number:</strong> ${order.trackingNumber || 'N/A'}</p>
          <p><strong>Date:</strong> ${new Date(order.purchasedAt.toDate()).toLocaleString()}</p>
        </body>
      </html>
    `;

    try {
      await Print.printAsync({ html });
    } catch (err) {
      Alert.alert('Error', 'Failed to generate packing slip.');
    }
  };

  const filteredOrders = orders
    .filter((order) => {
      if (filter === 'fulfilled') return order.fulfilled;
      if (filter === 'unfulfilled') return !order.fulfilled;
      return true;
    })
    .filter((order) =>
      order.title.toLowerCase().includes(search.toLowerCase()) ||
      order.buyerEmail.toLowerCase().includes(search.toLowerCase())
    );

    const renderItem = ({ item }) => {
    
      return (
        <View style={styles.orderCard}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>
              {item.title} {item.fulfilled ? '✅' : ''}
            </Text>
            <TouchableOpacity
              onPress={() => toggleFulfilled(item.id, item.fulfilled)}
              style={[
                styles.toggleButton,
                item.fulfilled ? styles.fulfilled : styles.notFulfilled,
              ]}
            >
              <Text style={styles.toggleText}>
                {item.fulfilled ? 'Unmark' : 'Mark Fulfilled'}
              </Text>
            </TouchableOpacity>
          </View>
    
          <Text style={styles.meta}>Buyer: {item.buyerEmail}</Text>
          {item.shippingAddress && (
            <View style={styles.addressBox}>
              <Text style={styles.meta}>Shipping Address:</Text>
              <Text style={styles.addressLine}>{item.shippingAddress.name}</Text>
              <Text style={styles.addressLine}>{item.shippingAddress.street}</Text>
              <Text style={styles.addressLine}>
                {item.shippingAddress.city}, {item.shippingAddress.state} {item.shippingAddress.zip}
              </Text>
            </View>
          )}
          <Text style={styles.meta}>Stream: {item.streamTitle || item.channel}</Text>
          <Text style={styles.meta}>Price: ${item.price}</Text>
          <Text style={styles.meta}>Date: {new Date(item.purchasedAt.toDate()).toLocaleString()}</Text>
          {item.fulfilledAt && (
            <Text style={styles.meta}>Fulfilled: {new Date(item.fulfilledAt.toDate()).toLocaleString()}</Text>
          )}
    
          <TouchableOpacity onPress={() => generatePackingSlip(item)}>
            <Text style={styles.link}>Print Packing Slip</Text>
          </TouchableOpacity>
    
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('ShippingLabelScreen', {
                orderId: item.id,
                buyerId: item.buyerId,
              })
            }
          >
            <Text style={styles.link}>Manage Shipping Label</Text>
          </TouchableOpacity>
        </View>
      );
    };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by product or buyer"
            value={search}
            onChangeText={setSearch}
          />
          <View style={styles.toggleRow}>
            {['all', 'unfulfilled', 'fulfilled'].map((key) => (
              <TouchableOpacity
                key={key}
                onPress={() => setFilter(key)}
                style={[styles.filterButton, filter === key && styles.activeFilter]}
              >
                <Text style={styles.filterText}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {filteredOrders.length === 0 ? (
            <Text style={styles.noOrders}>No orders found</Text>
          ) : (
            <FlatList
              data={filteredOrders}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 10 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#eee',
    alignItems: 'center',
  },
  activeFilter: {
    backgroundColor: '#333',
  },
  filterText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  orderCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: { fontSize: 16, fontWeight: 'bold', flex: 1, flexWrap: 'wrap' },
  meta: { fontSize: 14, color: '#555' },
  toggleButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  fulfilled: {
    backgroundColor: '#4caf50',
  },
  notFulfilled: {
    backgroundColor: '#f39c12',
  },
  toggleText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  link: {
    marginTop: 8,
    color: '#007bff',
    textDecorationLine: 'underline',
    fontSize: 14,
  },
  noOrders: { textAlign: 'center', marginTop: 30, color: '#888' },
  list: { paddingBottom: 30 },
  addressBox: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 6,
    marginTop: 6,
    marginBottom: 4,
  },
  addressLine: {
    fontSize: 13,
    color: '#444',
  },
  link: {
    marginTop: 8,
    color: '#007bff',
    textDecorationLine: 'underline',
    fontSize: 14,
  },
  
  
});

export default Order;
