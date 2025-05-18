import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import styles from "./styles";

const EmptyState = () => (
  <View style={styles.emptyContainer}>
    <Ionicons name="bag-handle-outline" size={64} color="#ddd" />
    <Text style={styles.emptyText}>No Products Found</Text>
    <Text style={styles.emptySubtext}>Check back later for new items</Text>
  </View>
);

export default EmptyState; 