import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Dimensions, Modal, StyleSheet, Text, View } from 'react-native';
import { Gyroscope, type GyroscopeMeasurement } from 'expo-sensors';
import {
  Canvas,
  Group,
  Image as SkiaImage,
  LinearGradient,
  Rect,
  Shader,
  useImage,
  vec,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { getHoloEffect } from './Cards/index';
import { getRarityConfig } from './Cards/constants';

// Use Screen instead of Window to ensure we cover the navigation bar area
const { width: SW, height: SH } = Dimensions.get('screen');
const MODAL_CARD_W = Math.min(Math.round(SW * 0.78), 340);
const MODAL_CARD_H = Math.round(MODAL_CARD_W * 1.4);
const CENTER_LEFT = (SW - MODAL_CARD_W) / 2;
const CENTER_TOP  = (SH - MODAL_CARD_H) / 2;

const SPRING_CONFIG = {
  damping: 18,
  stiffness: 100,
  mass: 0.6,
};

export default function CardZoomOverlay({
  title, rarity, imageUri, originX, originY, originW, originH, onClose,
}: any) {
  const cfg = getRarityConfig(rarity);
  
  // Optimization: Skia's useImage is efficient, but ensuring the URI 
  // doesn't trigger unnecessary re-downloads is key.
  const cardArt = useImage(imageUri);
  // Lazily initialise Skia effect inside the component — Skia is ready by render time.
  const holoEffect = useMemo(() => getHoloEffect(), []);
  
  const progress = useSharedValue(0);
  const transX = useSharedValue(0);
  const transY = useSharedValue(0);
  const rotX = useSharedValue(0);
  const rotY = useSharedValue(0);
  const pX = useSharedValue(MODAL_CARD_W / 2);
  const pY = useSharedValue(MODAL_CARD_H / 2);

  const startScale = originW / MODAL_CARD_W;
  const startTx = (originX + originW / 2) - (CENTER_LEFT + MODAL_CARD_W / 2);
  const startTy = (originY + originH / 2) - (CENTER_TOP + MODAL_CARD_H / 2);

  // Gyro accumulator (JS thread ref)
  const gyroX = useRef(0);
  const gyroY = useRef(0);
  const GLIMIT_X = 12;
  const GLIMIT_Y = 14;

  useEffect(() => {
    progress.value = withSpring(1, SPRING_CONFIG);
  }, []);

  // Gyroscope — contributes to rotX/rotY on top of any pan drag
  useEffect(() => {
    let sub: ReturnType<typeof Gyroscope.addListener> | null = null;
    Gyroscope.isAvailableAsync().then((ok) => {
      if (!ok) return;
      Gyroscope.setUpdateInterval(16);
      sub = Gyroscope.addListener((data: GyroscopeMeasurement) => {
        if (progress.value < 0.95) return; // wait for entrance
        const dt = 0.016;
        gyroX.current = Math.min(Math.max(gyroX.current + data.y * dt * 57.3, -GLIMIT_X), GLIMIT_X);
        gyroY.current = Math.min(Math.max(gyroY.current - data.x * dt * 57.3, -GLIMIT_Y), GLIMIT_Y);
        gyroX.current *= 0.97;
        gyroY.current *= 0.97;
        // Blend gyro into tilt — pan gesture overrides when active
        rotY.value = withSpring(gyroX.current * 0.8, { damping: 14, stiffness: 80, mass: 0.4 });
        rotX.value = withSpring(gyroY.current * 0.6, { damping: 14, stiffness: 80, mass: 0.4 });
      });
    });
    return () => { sub?.remove(); };
  }, []);

  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      transX.value = e.translationX;
      transY.value = e.translationY;

      const localX = e.x - (CENTER_LEFT + transX.value);
      const localY = e.y - (CENTER_TOP + transY.value);
      pX.value = localX;
      pY.value = localY;

      const dragTiltY = -((localX / MODAL_CARD_W) * 100 - 50) / 2;
      const dragTiltX = ((localY / MODAL_CARD_H) * 100 - 50) / 2;
      
      rotY.value = dragTiltY + (e.velocityX / 200);
      rotX.value = dragTiltX - (e.velocityY / 200);
    })
    .onEnd(() => {
      transX.value = withSpring(0, SPRING_CONFIG);
      transY.value = withSpring(0, SPRING_CONFIG);
      rotX.value = withSpring(0, SPRING_CONFIG);
      rotY.value = withSpring(0, SPRING_CONFIG);
      pX.value = withSpring(MODAL_CARD_W / 2, SPRING_CONFIG);
      pY.value = withSpring(MODAL_CARD_H / 2, SPRING_CONFIG);
    });

  const tap = Gesture.Tap().onEnd((e) => {
    const isInside = 
      e.x > CENTER_LEFT + transX.value && 
      e.x < CENTER_LEFT + transX.value + MODAL_CARD_W &&
      e.y > CENTER_TOP + transY.value && 
      e.y < CENTER_TOP + transY.value + MODAL_CARD_H;
    if (!isInside) runOnJS(onClose)();
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 1200 },
        { translateX: (startTx * (1 - progress.value)) + transX.value },
        { translateY: (startTy * (1 - progress.value)) + transY.value },
        { scale: startScale + (1 - startScale) * progress.value },
        { rotateX: `${rotX.value}deg` },
        { rotateY: `${rotY.value}deg` },
      ],
    };
  });

  const uniforms = useDerivedValue(() => ({
    resolution: [MODAL_CARD_W, MODAL_CARD_H],
    pointer: [pX.value, pY.value],
    opacity: progress.value,
    mode: cfg.mode,
    fromCenter: 0.8,
  }));

  return (
    /* statusBarTranslucent ensures the modal covers the very top and bottom of the screen */
    <Modal transparent visible statusBarTranslucent animationType="none">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GestureDetector gesture={Gesture.Simultaneous(gesture, tap)}>
          <View style={styles.screen}>
            <Animated.View style={[styles.backdrop, { opacity: progress.value * 0.9 }]} />
            <Animated.View style={[styles.card, animatedStyle]}>
              <Canvas style={StyleSheet.absoluteFill}>
                <Group>
                  <Rect x={0} y={0} width={MODAL_CARD_W} height={MODAL_CARD_H}>
                    <LinearGradient start={vec(0,0)} end={vec(MODAL_CARD_W, MODAL_CARD_H)} colors={cfg.bgColors} />
                  </Rect>
                  {cardArt && <SkiaImage image={cardArt} x={0} y={0} width={MODAL_CARD_W} height={MODAL_CARD_H} fit="cover" />}
                  <Rect x={0} y={0} width={MODAL_CARD_W} height={MODAL_CARD_H} blendMode="colorDodge">
                    <Shader source={holoEffect} uniforms={uniforms} />
                  </Rect>
                </Group>
              </Canvas>
              <View style={[styles.badge, { backgroundColor: cfg.badgeColor }]}>
                <Text style={styles.badgeText}>{cfg.label.toUpperCase()}</Text>
              </View>
            </Animated.View>
          </View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#00000065' // Secondary fallback for bottom gaps
  },
  backdrop: { 
    position: 'absolute',
    top: 0,
    left: 0,
    width: SW,
    height: SH, // Explicit screen height
    backgroundColor: '#00000065' 
  },
  card: { 
    width: MODAL_CARD_W, 
    height: MODAL_CARD_H, 
    borderRadius: 24, 
    overflow: 'hidden', 
    backgroundColor: 'transparent',
  },
  badge: { position: 'absolute', top: 18, right: 18, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  badgeText: { color: 'white', fontWeight: '900', fontSize: 12 },
});