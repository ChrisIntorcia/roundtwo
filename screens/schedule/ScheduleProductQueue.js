import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { auth } from '../../firebaseConfig';

const db = getFirestore();

export default function ScheduleProductQueue({ visible, onClose, onConfirm, initialProducts = [] }) {
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);

  // Memoize fetchProducts to prevent recreation on every render
  const fetchProducts = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const productsQuery = query(
        collection(db, 'products'),
        where('sellerId', '==', user.uid)
      );
      const snapshot = await getDocs(productsQuery);
      const productsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsList);
      setFilteredProducts(productsList);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Only fetch products when the modal becomes visible
  useEffect(() => {
    if (visible) {
      fetchProducts();
    }
  }, [visible, fetchProducts]);

  // Update selected products when initialProducts changes
  useEffect(() => {
    if (visible) {
      setSelectedProducts(initialProducts);
    }
  }, [visible, initialProducts]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(
        products.filter(product =>
          product.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [searchQuery, products]);

  const toggleProductSelection = useCallback((productId) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (typeof onConfirm === 'function') {
      onConfirm(selectedProducts);
    }
    onClose();
  }, [onConfirm, onClose, selectedProducts]);

  const renderProductItem = useCallback(({ item }) => {
    const isSelected = selectedProducts.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.productItem, isSelected && styles.selectedProductItem]}
        onPress={() => toggleProductSelection(item.id)}
      >
        {item.images?.[0] ? (
          <Image
            source={{ uri: item.images[0] }}
            style={styles.productImage}
          />
        ) : (
          <View style={[styles.productImage, styles.placeholderImage]}>
            <MaterialIcons name="image" size={24} color="#666" />
          </View>
        )}
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.productPrice}>
            ${item.bulkPrice || item.fullPrice}
          </Text>
        </View>
        {isSelected && (
          <View style={styles.checkmarkContainer}>
            <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
          </View>
        )}
      </TouchableOpacity>
    );
  }, [selectedProducts, toggleProductSelection]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#213E4D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Products</Text>
          <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton}>
            <Text style={styles.confirmButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Select Products for Stream</Text>
          <Text style={styles.sectionSubtitle}>
            Choose the products you want to showcase in this stream
          </Text>

          {/* Search Bar */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F5F6FA',
            borderRadius: 12,
            marginBottom: 16,
            paddingHorizontal: 12,
            height: 44,
          }}>
            <MaterialIcons name="search" size={24} color="#666" style={{ marginRight: 8 }} />
            <TextInput
              style={{
                flex: 1,
                fontSize: 16,
                color: '#222',
                paddingVertical: 0,
                height: '100%',
              }}
              placeholder="Search products..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#213E4D" />
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              renderItem={renderProductItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.productList}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No products found' : 'No products available. Add products in your seller hub.'}
                </Text>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#213E4D',
  },
  confirmButton: {
    padding: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#213E4D',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#213E4D',
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productList: {
    paddingBottom: 20,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedProductItem: {
    backgroundColor: '#F1F8E9',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  placeholderImage: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: 15,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#213E4D',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  checkmarkContainer: {
    marginLeft: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 40,
  },
});

