import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const ViewerControls = ({ 
  setMoreOptionsVisible, 
  handleShare, 
  navigation 
}) => {
  return (
    <View style={styles.sideToolbar}>
      <TouchableOpacity onPress={() => setMoreOptionsVisible(true)}>
        <Icon name="ellipsis-vertical" size={18} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity onPress={handleShare}>
        <Icon name="rocket" size={18} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('PaymentsShipping')}>
        <Icon name="wallet" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  sideToolbar: {
    position: 'absolute',
    right: 10,
    top: 300,
    backgroundColor: 'rgba(0, 0, 0, 0.30)',
    borderRadius: 20,
    padding: 10,
    gap: 15,
  },
});

export default ViewerControls; 