import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  Switch,
} from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';
import { updateDoc, doc } from 'firebase/firestore';
import styles, { ACCENT_COLOR } from './broadcasterStyles';
import { SafeAreaView } from 'react-native-safe-area-context';

const ProductQueueModal = ({
  visible,
  products,
  selectedProduct,
  isRotating,
  setIsRotating,
  carouselTimer,
  continuedRotate,
  countdownSeconds,
  setCarouselTimer,
  setCountdownSeconds,
  setContinuedRotate,
  setProducts,
  setSelectedProduct,
  toggleRotation,
  setQueueModalVisible,
  channelName,
  db,
}) => {
  // Maintain local state for products to handle reordering
  const [localProducts, setLocalProducts] = useState(products);

  // Update local products when props change
  useEffect(() => {
    setLocalProducts(products);
  }, [products]);

  // Filter out products with no inventory
  useEffect(() => {
    const productsWithInventory = localProducts.filter(product => product.quantity > 0);
    if (productsWithInventory.length !== localProducts.length) {
      setLocalProducts(productsWithInventory);
      setProducts(productsWithInventory);
      // If the currently selected product has no inventory, select the first available product
      if (selectedProduct && selectedProduct.quantity === 0) {
        setSelectedProduct(productsWithInventory[0]);
        updateDoc(doc(db, 'livestreams', channelName), {
          selectedProductId: productsWithInventory[0]?.id,
          selectedProduct: productsWithInventory[0],
        }).catch((err) => {
          console.error('🔥 Failed to update selected product in Firestore:', err);
        });
      }
    }
  }, [localProducts]);

  const renderHeader = () => (
    <>
      <View style={styles.queueHeader}>
        <Text style={styles.queueTitle}>🗂 Product Queue</Text>
        <View style={styles.queueStats}>
          <Text style={styles.queueStatsText}>
            {products.length} {products.length === 1 ? 'Product' : 'Products'}
          </Text>
          {isRotating && (
            <View style={styles.rotatingBadge}>
              <Text style={styles.rotatingBadgeText}>🔄 Active</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.rotationControls}>
        <Text style={styles.rotationTitle}>Rotation Settings</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.timerScroll}
        >
          {[
            { val: null, label: 'Off' },
            { val: 15, label: '15s' },
            { val: 30, label: '30s' },
            { val: 60, label: '1m' },
            { val: 120, label: '2m' },
            { val: 180, label: '3m' },
            { val: 300, label: '5m' },
            { val: 480, label: '8m' },
            { val: 600, label: '10m' },
            { val: 900, label: '15m' },
          ].map(({ val, label }, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                setCarouselTimer(val);
                if (!val) setCountdownSeconds(null);
              }}
              style={[
                styles.timerOption,
                carouselTimer === val && styles.timerOptionSelected,
              ]}
            >
              <Text style={styles.timerOptionText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.rotationSetting}>
          <Text style={styles.rotationSettingText}>Auto Restart Timer</Text>
          <Switch
            value={continuedRotate}
            onValueChange={setContinuedRotate}
            trackColor={{ false: '#555', true: ACCENT_COLOR }}
            thumbColor={'#fff'}
          />
        </View>
        <Text style={styles.rotationSettingHint}>
          Automatically restart timer after each product
        </Text>
      </View>
    </>
  );

  const renderFooter = () => (
    <View style={[styles.queueActions, { paddingBottom: 24 }]}>
      <TouchableOpacity
        style={[styles.queueButton, styles.queueButtonPrimary]}
        onPress={() => {
          if (!isRotating && products.length > 0) {
            toggleRotation();
          } else if (isRotating) {
            setCountdownSeconds(null);
            setIsRotating(false);
          }
          setQueueModalVisible(false);
        }}
      >
        <Ionicons
          name={isRotating ? 'pause-circle' : 'play-circle'}
          size={24}
          color="#fff"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.queueButtonTextPrimary}>
          {isRotating ? 'Pause Rotation' : 'Start Rotation'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.queueButton, styles.queueButtonSecondary]}
        onPress={() => setQueueModalVisible(false)}
      >
        <Text style={styles.queueButtonTextSecondary}>Close</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
        <SafeAreaView style={[styles.modalContent, { maxHeight: '80%', paddingBottom: 0 }]}>
          {localProducts.length === 0 ? (
            <>
              {renderHeader()}
              <View style={styles.emptyQueue}>
                <Ionicons name="cube-outline" size={48} color="#666" />
                <Text style={styles.emptyQueueText}>No products in queue</Text>
                <Text style={styles.emptyQueueSubtext}>
                  Add products from your inventory to start streaming
                </Text>
              </View>
              {renderFooter()}
            </>
          ) : (
            <DraggableFlatList
              data={localProducts}
              keyExtractor={(item) => item.id}
              onDragEnd={({ data }) => {
                setLocalProducts(data);
                setProducts(data);
                setSelectedProduct(data[0]);
                // Update the order in Firestore
                const productIds = data.map(item => item.id);
                updateDoc(doc(db, 'livestreams', channelName), {
                  selectedProductId: data[0].id,
                  selectedProduct: data[0],
                  products: productIds // Update the order of products
                }).catch((err) => {
                  console.error('🔥 Failed to sync reordered product to Firestore:', err);
                });
              }}
              ListHeaderComponent={renderHeader}
              ListFooterComponent={renderFooter}
              renderItem={({ item, index, drag, isActive }) => (
                <TouchableOpacity
                  style={[
                    styles.queueItem,
                    isActive && styles.queueItemActive,
                    selectedProduct?.id === item.id && styles.queueItemSelected,
                  ]}
                  onLongPress={drag}
                  delayLongPress={150}
                >
                  <View style={styles.queueItemDragHandle}>
                    <Ionicons name="menu" size={24} color="#666" />
                  </View>
                  <Image source={{ uri: item.images?.[0] }} style={styles.queueItemImage} />
                  <View style={styles.queueItemContent}>
                    <Text style={styles.queueItemTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={styles.queueItemDetails}>
                      <Text style={styles.queueItemPrice}>
                        ${Number(item.bulkPrice || 0).toFixed(2)}
                      </Text>
                      <Text style={styles.queueItemQuantity}>{item.quantity} left</Text>
                    </View>
                  </View>
                  <View style={styles.queueItemOrder}>
                    {selectedProduct?.id === item.id && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>Current</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
};

export default ProductQueueModal;
