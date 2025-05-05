import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Animated,
  TouchableWithoutFeedback,
  Easing
} from 'react-native';
import { Audio } from 'expo-av';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';
import spinnerStyles, { WHEEL_DIMENSIONS } from './spinnerStyles';

const SPIN_DURATION = 5000;

export default function Spinner({ prizes, onSpinComplete, canSpin }) {
  const rotation = useRef(new Animated.Value(0)).current;
  const [isSpinning, setIsSpinning] = useState(false);
  const wheelSize = WHEEL_DIMENSIONS.size;
  const radius = wheelSize / 2;
  const numberOfSegments = prizes.length;
  const segmentAngle = 360 / numberOfSegments;
  const center = radius;

  const playTickSound = async () => {
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/sounds/tick.mp3')
    );
    await sound.playAsync();
  };

  const angleByPrizeIndex = (index) =>
    270 - index * segmentAngle - segmentAngle / 2;

  const spinWheel = () => {
    if (!canSpin || isSpinning) return;

    const selectedIndex = Math.floor(Math.random() * numberOfSegments);
    const selectedPrize = prizes[selectedIndex];
    const fullSpins = 5;
    const finalRotation =
      fullSpins * 360 + angleByPrizeIndex(selectedIndex);

    rotation.setValue(0); 
    setIsSpinning(true);
    playTickSound();

    Animated.timing(rotation, {
      toValue: finalRotation,
      duration: SPIN_DURATION,
      useNativeDriver: true,
      easing: Easing.out(Easing.exp),
    }).start(() => {
      onSpinComplete(selectedPrize);
      setIsSpinning(false);
    });
  };

  const renderWheelPaths = () => {
    const colors = [
      '#FF6B6B',
      '#FFD93D',
      '#6BCB77',
      '#4D96FF',
      '#FF6B6B',
      '#FFD93D',
      '#6BCB77',
      '#4D96FF'
    ];

    return prizes.map((prize, i) => {
      const startAngle = (i * segmentAngle * Math.PI) / 180;
      const endAngle = ((i + 1) * segmentAngle * Math.PI) / 180;

      const x1 = center + radius * Math.cos(startAngle);
      const y1 = center + radius * Math.sin(startAngle);
      const x2 = center + radius * Math.cos(endAngle);
      const y2 = center + radius * Math.sin(endAngle);

      const largeArc = segmentAngle > 180 ? 1 : 0;
      const path = `M${center},${center} L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`;

      const textAngle = startAngle + (endAngle - startAngle) / 2;
      const textRadius = radius * 0.65;
      const textX = center + textRadius * Math.cos(textAngle);
      const textY = center + textRadius * Math.sin(textAngle);

      return (
        <G key={`segment-${i}`}>
          <Path d={path} fill={colors[i % colors.length]} />
          <SvgText
            x={textX}
            y={textY}
            fill="#213E4D"
            fontSize="14"
            fontWeight="bold"
            textAnchor="middle"
            alignmentBaseline="middle"
            transform={`rotate(${(segmentAngle * i) + segmentAngle / 2}, ${textX}, ${textY})`}
          >
            {prize.label}
          </SvgText>
        </G>
      );
    });
  };

  const spinInterpolation = rotation.interpolate({
    inputRange: [0, 8000],
    outputRange: ['0deg', '8000deg']
  });
  

  return (
    <View style={spinnerStyles.container}>
      <View style={spinnerStyles.indicator} />
      <TouchableWithoutFeedback onPress={spinWheel}>
        <Animated.View
          style={[
            spinnerStyles.wheelContainer,
            { transform: [{ rotate: spinInterpolation }] }
          ]}
        >
          <Svg width={wheelSize} height={wheelSize}>
            {renderWheelPaths()}
          </Svg>
          <View style={spinnerStyles.centerCap} />
        </Animated.View>
      </TouchableWithoutFeedback>
    </View>
  );
}
