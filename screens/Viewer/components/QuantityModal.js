import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const QuantityModal = ({ purchaseQty, adjustQuantity, showQuantityModal }) => {
  if (!showQuantityModal) return null;

  return (
    <View style={styles.quantityModal}>
      <View style={styles.quantityRow}>
        <Text style={styles.quantityLabel}>Quantity:</Text>
        <View style={styles.quantityControls}>
          <TouchableOpacity 
            style={styles.qtyButton}
            onPress={() => adjustQuantity(-1)}
          >
            <Text style={styles.qtyButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.qtyText}>{purchaseQty}</Text>
          <TouchableOpacity 
            style={styles.qtyButton}
            onPress={() => adjustQuantity(1)}
          >
            <Text style={styles.qtyButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  quantityModal: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 15,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityLabel: {
    color: '#fff',
    fontSize: 16,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyButton: {
    backgroundColor: '#E76A54',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  qtyText: {
    color: '#fff',
    fontSize: 18,
    marginHorizontal: 15,
  },
});

export default QuantityModal; 