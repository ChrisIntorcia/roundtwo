import React, { useEffect, useRef, useState } from 'react';
import { Text, Animated, StyleSheet, View } from 'react-native';
import { getFirestore, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth } from '../../../firebaseConfig';
import { BlurView } from 'expo-blur';
import Icon from 'react-native-vector-icons/Ionicons';

const PriceTag = ({ channel }) => {
  const [level, setLevel] = useState(1);
  const [visible, setVisible] = useState(false);
  const [gamifiedDiscount, setGamifiedDiscount] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const db = getFirestore();
    const user = auth.currentUser;
    if (!user || !channel) return;

    const streakRef = doc(db, 'livestreams', channel, 'streaks', user.uid);
    const streamRef = doc(db, 'livestreams', channel);

    const loadInitial = async () => {
      const streamSnap = await getDoc(streamRef);
      const isGamified = streamSnap.exists() && streamSnap.data()?.gamifiedDiscount === true;
      setGamifiedDiscount(isGamified);
    };

    const unsubscribe = onSnapshot(streakRef, async (snap) => {
      const streamSnap = await getDoc(streamRef);
      const isGamified = streamSnap.exists() && streamSnap.data()?.gamifiedDiscount === true;
      setGamifiedDiscount(isGamified);

      if (!isGamified) return;

      const count = snap.exists() ? snap.data().purchaseCount || 0 : 0;
      const newLevel = Math.min(count + 1, 5);
      setLevel(newLevel);
      setVisible(true);

      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      slideAnim.setValue(20);

      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate out after delay
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 0.8,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: -20,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start(() => setVisible(false));
      }, 8000);
    });

    loadInitial();
    return () => unsubscribe();
  }, [channel]);

  if (!gamifiedDiscount || !visible) return null;

  const discount = level * 10;

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { translateY: slideAnim }
          ]
        }
      ]}
    >
      <BlurView intensity={30} tint="dark" style={styles.badge}>
        <View style={styles.content}>
          <Icon name="flame" size={20} color="#E76A54" style={styles.icon} />
          <View style={styles.textContainer}>
            <Text style={styles.levelText}>Level {level}</Text>
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </View>
          <Icon name="arrow-forward" size={16} color="#fff" style={styles.arrow} />
        </View>
      </BlurView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 160,
    alignSelf: 'center',
    zIndex: 1000,
  },
  badge: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  icon: {
    marginRight: 8,
  },
  textContainer: {
    marginRight: 8,
  },
  levelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  discountText: {
    color: '#E76A54',
    fontSize: 16,
    fontWeight: '700',
  },
  arrow: {
    opacity: 0.7,
  },
});

export default PriceTag;
