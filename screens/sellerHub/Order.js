import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TextInput, TouchableOpacity } from 'react-native';
import { db } from '../../firebaseConfig';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { auth } from '../../firebaseConfig';
import { AppContext } from '../../context/AppContext';

const Order = () => {
  const { user } = useContext(AppContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'fulfilled' | 'unfulfilled'

  useEffect(() => {
    if (!user) return;

    const q = query(
        collection(db, 'orders'),
        where('sellerId', '==', user.uid),
        orderBy('fulfilled'),
        orderBy('purchasedAt', 'desc')
      )

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

  const renderItem = ({ item }) => (
    <View style={styles.orderCard}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          {item.title} {item.fulfilled ? '✅' : ''}
        </Text>
        <TouchableOpacity
          onPress={() => toggleFulfilled(item.id, item.fulfilled)}
          style={[styles.toggleButton, item.fulfilled ? styles.fulfilled : styles.notFulfilled]}
        >
          <Text style={styles.toggleText}>
            {item.fulfilled ? 'Unmark' : 'Mark Fulfilled'}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.meta}>Buyer: {item.buyerEmail}</Text>
      <Text style={styles.meta}>Stream: {item.channel}</Text>
      <Text style={styles.meta}>Price: ${item.price}</Text>
      <Text style={styles.meta}>Date: {new Date(item.purchasedAt.toDate()).toLocaleString()}</Text>
      {item.fulfilledAt && (
        <Text style={styles.meta}>Fulfilled: {new Date(item.fulfilledAt.toDate()).toLocaleString()}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by product or buyer"
        value={search}
        onChangeText={setSearch}
      />
      <View style={styles.toggleRow}>
        <TouchableOpacity
          onPress={() => setFilter('all')}
          style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
        >
          <Text style={styles.filterText}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilter('unfulfilled')}
          style={[styles.filterButton, filter === 'unfulfilled' && styles.activeFilter]}
        >
          <Text style={styles.filterText}>Unfulfilled</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilter('fulfilled')}
          style={[styles.filterButton, filter === 'fulfilled' && styles.activeFilter]}
        >
          <Text style={styles.filterText}>Fulfilled</Text>
        </TouchableOpacity>
      </View>
      {filteredOrders.length === 0 ? (
        <Text style={styles.noOrders}>No orders found</Text>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
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
  noOrders: { textAlign: 'center', marginTop: 30, color: '#888' },
  list: { paddingBottom: 30 },
});

export default Order;
