// /screens/Viewer/components/StreakBar.js

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../../firebaseConfig';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

export default function StreakBar({ channel }) {
  const user = auth.currentUser;
  const [streakLevel, setStreakLevel] = useState(0);
  const [animatedValue] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (!user || !channel) return;

    const streakRef = doc(db, 'livestreams', channel, 'streaks', user.uid);
    const unsubscribe = onSnapshot(streakRef, (docSnap) => {
      const count = docSnap.exists() ? docSnap.data()?.purchaseCount || 0 : 0;
      const level = Math.min(count, 4); // 0 to 4
      
      // Animate scale when level changes
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      setStreakLevel(level);
      Animated.timing(animatedValue, {
        toValue: (level + 1) / 5,
        duration: 500,
        useNativeDriver: false,
      }).start();
    });

    return () => unsubscribe();
  }, [channel, user]);

  const discountPercent = Math.min((streakLevel + 1) * 10, 50);
  const barWidth = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  const getStreakEmoji = (level) => {
    const emojis = ['🔥', '🔥🔥', '🔥🔥🔥', '🔥🔥🔥🔥', '🔥🔥🔥🔥🔥'];
    return emojis[level] || '🔥';
  };

  return (
    <BlurView intensity={20} tint="dark" style={styles.wrapper}>
      <Animated.View style={[styles.content, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.header}>
          <Text style={styles.emoji}>{getStreakEmoji(streakLevel)}</Text>
          <Text style={styles.label}>Streak Level {streakLevel + 1}</Text>
          <Text style={styles.discount}>{discountPercent}% OFF</Text>
        </View>
        <View style={styles.barContainer}>
          <Animated.View style={[styles.barFill, { width: barWidth }]} />
          <View style={styles.markers}>
            {[...Array(5)].map((_, i) => (
              <View key={i} style={[styles.marker, i <= streakLevel && styles.markerActive]} />
            ))}
          </View>
        </View>
      </Animated.View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    borderRadius: 15,
    overflow: 'hidden',
    zIndex: 1000,
  },
  content: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    marginLeft: 8,
  },
  discount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E76A54',
  },
  barContainer: {
    height: 6,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#E76A54',
    borderRadius: 3,
  },
  markers: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  marker: {
    width: 2,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  markerActive: {
    backgroundColor: '#fff',
  },
});