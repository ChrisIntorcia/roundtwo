import React from 'react';
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
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <SafeAreaView style={[styles.modalContent, { maxHeight: '80%' }]}>
          <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
            {/* Header */}
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

            {/* Rotation Settings */}
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

            {/* Queue */}
            {products.length === 0 ? (
              <View style={styles.emptyQueue}>
                <Ionicons name="cube-outline" size={48} color="#666" />
                <Text style={styles.emptyQueueText}>No products in queue</Text>
                <Text style={styles.emptyQueueSubtext}>
                  Add products from your inventory to start streaming
                </Text>
              </View>
            ) : (
              <DraggableFlatList
                scrollEnabled={false}
                data={products}
                keyExtractor={(item) => item.id}
                onDragEnd={({ data }) => {
                  setProducts(data);
                  setSelectedProduct(data[0]);
                  updateDoc(doc(db, 'livestreams', channelName), {
                    selectedProductId: data[0].id,
                    selectedProduct: data[0],
                  }).catch((err) => {
                    console.error('🔥 Failed to sync reordered product to Firestore:', err);
                  });
                }}
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
          </ScrollView>

          {/* Fixed Footer Buttons */}
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
        </SafeAreaView>
      </View>
    </Modal>
  );
};

export default ProductQueueModal;
