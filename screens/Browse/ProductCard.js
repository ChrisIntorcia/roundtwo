import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import FastImage from "react-native-fast-image";
import { Ionicons } from '@expo/vector-icons';
import styles from "./styles";

const ProductCard = ({ item, navigation }) => {
  const imageUrl = item.images && Array.isArray(item.images) && item.images[0] ? item.images[0] : null;
  
  const handleBuyNow = () => {
    navigation.navigate("ProductDetailsScreen", { product: item });
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardImageWrapper}
        onPress={() => navigation.navigate("ProductDetailsScreen", { product: item })}
        activeOpacity={0.85}
      >
        {imageUrl ? (
          <FastImage
            source={{ uri: imageUrl, priority: FastImage.priority.normal }}
            style={styles.image}
            resizeMode={FastImage.resizeMode.cover}
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="image-outline" size={24} color="#999" />
          </View>
        )}
      </TouchableOpacity>
      <View style={styles.cardContent}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>${parseFloat(item.fullPrice).toFixed(2)}</Text>
          <TouchableOpacity 
            style={styles.buyNowButton}
            onPress={handleBuyNow}
          >
            <Text style={styles.buyNowText}>Buy Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default ProductCard; 