import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  Text,
  TextStyle,
  LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { Colors } from '@/constants/style';

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number;
  color?: string;
  shineColor?: string;
  fontSize?: number;
  fontWeight?: TextStyle['fontWeight'];
}

export const ShinyText: React.FC<ShinyTextProps> = ({
  text,
  disabled = false,
  speed = 3,
  color = Colors.textPrimary, // This is your base text color
  shineColor = '#ffffff',
  fontSize = 14,
  fontWeight = '600',
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [dims, setDims] = useState({ width: 0, height: 0 });

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setDims({ width, height });
  };

  useEffect(() => {
    if (disabled || dims.width === 0) {
      animatedValue.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: speed * 1000,
        easing: Easing.bezier(0.4, 0, 0.6, 1),
        useNativeDriver: true,
      })
    );

    animation.start();
    return () => animation.stop();
  }, [disabled, speed, dims.width]);

  // We increase the width so the gradient has room to move from off-screen left to off-screen right
  const panelWidth = dims.width * 3; 

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-dims.width * 2, dims.width],
  });

  if (dims.width === 0) {
    return (
      <Text
        onLayout={handleLayout}
        style={{ fontSize, fontWeight, textAlign: 'center', color: 'transparent' }}
      >
        {text}
      </Text>
    );
  }

  return (
    <MaskedView
      style={{ height: dims.height, width: dims.width }}
      maskElement={
        <View style={styles.maskContainer}>
          <Text style={[styles.text, { fontSize, fontWeight, color: 'black' }]}>
            {text}
          </Text>
        </View>
      }
    >
      {/* 1. STATIC BASE LAYER: This ensures the text color never fluctuates */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: color }]} />

      {/* 2. ANIMATED SHINE LAYER: We place this ON TOP of the base color */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            width: panelWidth,
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={[
            'transparent',
            'transparent',
            shineColor + '00', // Start fully transparent
            shineColor + '40', // The "Peak" of the shine (adjust 40 for brightness)
            shineColor + '00', // End fully transparent
            'transparent',
            'transparent',
          ]}
          locations={[0, 0.4, 0.45, 0.5, 0.55, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </MaskedView>
  );
};

const styles = StyleSheet.create({
  maskContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
});