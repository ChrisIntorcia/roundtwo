import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import CustomHeader from '../../components/CustomHeader';
import { useNavigation, useRoute } from '@react-navigation/native';

const EditProductScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { product } = route.params;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: product.title || '',
    description: product.description || '',
    fullPrice: product.fullPrice?.toString() || '',
    bulkPrice: product.bulkPrice?.toString() || '',
    quantity: product.quantity?.toString() || '',
    shippingRate: product.shippingRate?.toString() || '',
  });

  const handleUpdate = async () => {
    try {
      setLoading(true);
      const productRef = doc(db, 'products', product.id);
      await updateDoc(productRef, {
        title: formData.title,
        description: formData.description,
        fullPrice: parseFloat(formData.fullPrice),
        bulkPrice: parseFloat(formData.bulkPrice),
        quantity: parseInt(formData.quantity),
        shippingRate: parseFloat(formData.shippingRate),
        updatedAt: new Date(),
      });
      Alert.alert('Success', 'Product updated successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating product:', error);
      Alert.alert('Error', 'Failed to update product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CustomHeader
        title="Edit Product"
        showBack
        onBack={() => navigation.goBack()}
      />
      <ScrollView style={styles.scrollView}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              placeholder="Product title"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Product description"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Full Price ($)</Text>
              <TextInput
                style={styles.input}
                value={formData.fullPrice}
                onChangeText={(text) => setFormData({ ...formData, fullPrice: text })}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Bulk Price ($)</Text>
              <TextInput
                style={styles.input}
                value={formData.bulkPrice}
                onChangeText={(text) => setFormData({ ...formData, bulkPrice: text })}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput
                style={styles.input}
                value={formData.quantity}
                onChangeText={(text) => setFormData({ ...formData, quantity: text })}
                placeholder="0"
                keyboardType="number-pad"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Shipping Rate ($)</Text>
              <TextInput
                style={styles.input}
                value={formData.shippingRate}
                onChangeText={(text) => setFormData({ ...formData, shippingRate: text })}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleUpdate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={24} color="#fff" />
                <Text style={styles.updateButtonText}>Update Product</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f8f8',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  updateButton: {
    backgroundColor: '#E76A54',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default EditProductScreen; 