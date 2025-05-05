import React, { useEffect } from 'react';
import { View, Text, Dimensions, StyleSheet, Animated } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { BlurView } from 'expo-blur';

export default function PurchaseCelebration({ showConfetti, purchaseBanner, clearBanner }) {
  useEffect(() => {
    if (purchaseBanner) {
      const timeout = setTimeout(() => {
        clearBanner(); // clears both confetti + banner after 3s
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [purchaseBanner]);

  return (
    <>
      {showConfetti && (
        <ConfettiCannon
          count={180}
          origin={{ x: Dimensions.get('window').width / 2, y: 0 }}
          fadeOut
        />
      )}

      {purchaseBanner && (
        <View style={styles.bannerContainer}>
          <BlurView intensity={20} tint="dark" style={styles.blurBackground}>
            <View style={styles.banner}>
              <Text style={styles.bannerText}>{purchaseBanner}</Text>
            </View>
          </BlurView>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  blurBackground: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  banner: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '80%',
  },
  bannerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});
