import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import styles from './broadcasterStyles';

const ProductPanel = ({ selectedProduct, countdownSeconds, onOpenQueue, onLayout }) => {
  const handleLayout = (event) => {
    onLayout(event.nativeEvent.layout.height);
  };

  const PanelWrapper = ({ children }) => (
    <View style={styles.productPanelFull} onLayout={handleLayout}>
      <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, flex: 1, alignItems: 'center' }}>
        {children}
      </View>
    </View>
  );

  if (selectedProduct) {
    return (
      <PanelWrapper>
        <Image source={{ uri: selectedProduct.images?.[0] }} style={styles.productImageLarge} />
        <View style={{ flex: 1, paddingRight: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text style={styles.strikePrice}>${Number(selectedProduct.fullPrice || 0).toFixed(2)}</Text>
            <Text style={styles.productPrice}>${Number(selectedProduct.bulkPrice || 0).toFixed(2)}</Text>
          </View>
          <Text style={styles.productTitle}>{selectedProduct.title}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
            <Text style={styles.productMeta}>{selectedProduct.quantity} in stock</Text>
            {countdownSeconds > 0 && (
              <View style={styles.timerBox}>
                <Text style={styles.timerText}>⏱ {countdownSeconds}s</Text>
              </View>
            )}
          </View>
        </View>
      </PanelWrapper>
    );
  }

  return (
    <PanelWrapper>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={styles.emptyProductContent}>
          <Ionicons name="cube-outline" size={32} color="#fff" style={styles.emptyProductIcon} />
          <View style={styles.emptyProductTextContainer}>
            <Text style={styles.emptyProductTitle}>Ready to Start</Text>
            <Text style={styles.emptyProductDescription}>
              Select products from your queue and start showcasing them to your viewers
            </Text>
          </View>
          <TouchableOpacity style={styles.emptyProductButton} onPress={onOpenQueue}>
            <Ionicons name="list" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.emptyProductButtonText}>Open Queue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </PanelWrapper>
  );
};

export default ProductPanel;
