import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, Alert, Animated, ActivityIndicator
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { getFirestore, collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { auth } from '../../firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import FastImage from 'react-native-fast-image';

const db = getFirestore();

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [deletingId, setDeletingId] = useState(null); // track which product is being deleted
  const navigation = useNavigation();

  useEffect(() => {
    const fetchProducts = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const productsRef = collection(db, 'users', user.uid, 'products');
      const unsubscribe = onSnapshot(productsRef, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(items);
      });

      return () => unsubscribe();
    };

    fetchProducts();
  }, []);

  const handleDelete = async (productId) => {
    const user = auth.currentUser;
    if (!user) return;

    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(productId);
              await deleteDoc(doc(db, 'users', user.uid, 'products', productId));
            } catch (error) {
              console.error('Delete failed:', error);
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const renderRightActions = (progress, dragX, productId) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0.7],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        onPress={() => handleDelete(productId)}
        style={styles.deleteButton}
        disabled={deletingId !== null} // disable if deleting
      >
        {deletingId === productId ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Animated.Text style={[styles.deleteText, { transform: [{ scale }] }]}>
            Delete
          </Animated.Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }) => (
    <Swipeable
      renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item.id)}
    >
      <TouchableOpacity
        onPress={() => navigation.navigate('ProductDetailsScreen', { product: item })}
        style={styles.card}
      >
        <FastImage
  source={{ uri: item.images[0], priority: FastImage.priority.normal }}
  style={styles.image}
  resizeMode={FastImage.resizeMode.cover}
/>
        <Text style={styles.title}>{item.title}</Text>
        <Text>{item.fullPrice} USD</Text>
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'flex-end',
    borderRadius: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
    height: '90%',
  },
  deleteText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
