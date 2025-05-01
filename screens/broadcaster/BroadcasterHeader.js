import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from './broadcasterStyles';

export default function BroadcasterHeader({
  viewerCount = 0,
  isRotating,
  toggleRotation,
  openQueue,
  openSettings,
}) {
  const handleSettingsPress = () => {
    console.log('Settings button pressed');
    if (openSettings) {
      console.log('Calling openSettings function');
      openSettings();
    } else {
      console.log('openSettings is not defined');
    }
  };

  return (
    <View style={styles.broadcasterHeaderRow}>
      {/* Viewer Count Pill */}
      <View style={styles.viewerCountPill}>
        <Text style={styles.viewerCountText}>{viewerCount} Watching</Text>
      </View>

      {/* Icon Controls */}
      <View style={styles.broadcasterHeaderIcons}>
        <TouchableOpacity onPress={toggleRotation} style={styles.iconButton}>
          <Ionicons name={isRotating ? 'pause' : 'play'} size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={openQueue} style={styles.iconButton}>
          <Ionicons name="list" size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSettingsPress} style={styles.iconButton}>
          <Ionicons name="settings" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
