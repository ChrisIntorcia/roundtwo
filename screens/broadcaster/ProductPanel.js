import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import styles from './broadcasterStyles';

const ProductPanel = ({ selectedProduct, countdownSeconds, onOpenQueue, onLayout }) => {
  const flashAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (countdownSeconds && countdownSeconds <= 5) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(flashAnim, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(flashAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      flashAnim.setValue(1);
    }
  }, [countdownSeconds]);

  const handleLayout = (event) => {
    onLayout(event.nativeEvent.layout.height);
  };

  const PanelWrapper = ({ children }) => (
    <View style={styles.productPanelFull} onLayout={handleLayout}>
      <BlurView intensity={0} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, flex: 1, alignItems: 'center' }}>
        {children}
      </View>
    </View>
  );

  if (selectedProduct) {
    return (
      <PanelWrapper>
        <Image source={{ uri: selectedProduct.images?.[0] }} style={styles.productImageLarge} />
        <View style={{ flex: 1, paddingRight: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text style={[styles.strikePrice, { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
              ${Number(selectedProduct.fullPrice || 0).toFixed(2)}
            </Text>
            <Text style={[styles.productPrice, { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
              ${Number(selectedProduct.bulkPrice || 0).toFixed(2)}
            </Text>
          </View>
          <Text style={[styles.productTitle, { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            {selectedProduct.title}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
            <Text style={[styles.productMeta, { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
              {selectedProduct.quantity} in stock
            </Text>
            {countdownSeconds > 0 && (
              <Animated.View 
                style={[
                  styles.timerBox, 
                  countdownSeconds <= 5 && {
                    opacity: flashAnim,
                    backgroundColor: '#ff4444'
                  }
                ]}
              >
                <Text style={[
                  styles.timerText, 
                  { 
                    textShadowColor: 'rgba(0,0,0,0.5)', 
                    textShadowOffset: { width: 1, height: 1 }, 
                    textShadowRadius: 2,
                    color: countdownSeconds <= 5 ? '#fff' : '#000'
                  }
                ]}>
                  ⏱ {countdownSeconds}s
                </Text>
              </Animated.View>
            )}
          </View>
        </View>
      </PanelWrapper>
    );
  }

  return (
    <PanelWrapper>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={styles.emptyProductContent}>
          <Ionicons name="cube-outline" size={32} color="#fff" style={styles.emptyProductIcon} />
          <View style={styles.emptyProductTextContainer}>
            <Text style={[styles.emptyProductTitle, { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
              Ready to Start
            </Text>
            <Text style={[styles.emptyProductDescription, { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
              Select products from your queue and start showcasing them to your viewers
            </Text>
          </View>
          <TouchableOpacity style={styles.emptyProductButton} onPress={onOpenQueue}>
            <Ionicons name="list" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.emptyProductButtonText}>Open Queue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </PanelWrapper>
  );
};

export default ProductPanel;
