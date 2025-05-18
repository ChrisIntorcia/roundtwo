import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import styles from "./styles";

const ErrorState = ({ error, onRetry }) => (
  <View style={styles.errorContainer}>
    <Ionicons name="alert-circle-outline" size={64} color="#E76A54" />
    <Text style={styles.errorText}>Oops! Something went wrong</Text>
    <Text style={styles.errorSubtext}>{error}</Text>
    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
      <Text style={styles.retryText}>Try Again</Text>
    </TouchableOpacity>
  </View>
);

export default ErrorState; 