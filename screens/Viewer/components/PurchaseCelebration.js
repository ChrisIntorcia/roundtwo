import React, { useEffect } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

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
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{purchaseBanner}</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: 150,
    left: 20,
    right: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  bannerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
