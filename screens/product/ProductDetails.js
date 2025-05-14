import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const ProductDetails = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { product } = route.params;

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: product.images?.[0] }}
            style={styles.image}
            resizeMode="cover"
          />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Product Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.title}>{product.title}</Text>
          
          <View style={styles.priceContainer}>
            {product.fullPrice && (
              <Text style={styles.fullPrice}>${parseFloat(product.fullPrice).toFixed(2)}</Text>
            )}
            <Text style={styles.bulkPrice}>${parseFloat(product.bulkPrice).toFixed(2)}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{product.description || 'No description available.'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.detailsList}>
              {product.details?.map((detail, index) => (
                <Text key={index} style={styles.detailItem}>• {detail}</Text>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.addToCartButton}>
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  imageContainer: {
    width: width,
    height: width,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 8,
  },
  infoContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  fullPrice: {
    fontSize: 18,
    textDecorationLine: 'line-through',
    color: '#999',
    marginRight: 12,
  },
  bulkPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E76A54',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  detailsList: {
    marginTop: 8,
  },
  detailItem: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    lineHeight: 24,
  },
  bottomBar: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  addToCartButton: {
    backgroundColor: '#E76A54',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addToCartText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ProductDetails; 