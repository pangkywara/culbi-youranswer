import React, { useMemo, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Canvas, Rect, Shader, Group, LinearGradient, vec, Image, useImage } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, useDerivedValue, runOnJS } from 'react-native-reanimated';
// Import Phosphor Icon
import { LockKey } from 'react-native-phosphor';

// Modular imports
import { getHoloEffect } from '@/components/Collections/Cards/index';
import { getRarityConfig, Rarity } from '@/components/Collections/Cards/constants';

const INTERACT_SPRING = { damping: 20, stiffness: 180, mass: 1 };
const SNAP_SPRING = { damping: 8, stiffness: 30, mass: 1.2 };

interface Props {
  title: string;
  rarity: Rarity;
  imageUri: string | number;
  cardWidth?: number;
  onPress?: (x: number, y: number, w: number, h: number) => void;
  isLocked?: boolean;
  duplicateCount?: number;
}

export default function CulturalCardItem({ rarity, imageUri, cardWidth = 160, onPress, isLocked = false, duplicateCount = 0 }: Props) {
  const width = cardWidth;
  const height = Math.round(width * 1.4);
  const BR = Math.round(width * 0.07);
  const cfg = useMemo(() => getRarityConfig(rarity), [rarity]);
  const cardArt = useImage(imageUri);
  const holoEffect = useMemo(() => getHoloEffect(), []);
  const containerRef = useRef<View>(null);

  // ── Shared values ──
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const pointerX = useSharedValue(width / 2);
  const pointerY = useSharedValue(height / 2);
  const opacity = useSharedValue(0);

  const fromCenter = useDerivedValue(() => {
    const dx = (pointerX.value - width / 2) / (width / 2);
    const dy = (pointerY.value - height / 2) / (height / 2);
    return Math.min(Math.sqrt(dx * dx + dy * dy), 1.0);
  });

  // ── Gestures ──
  const handleTap = () => {
    containerRef.current?.measureInWindow((x, y, w, h) => {
      onPress?.(x, y, w, h);
    });
  };

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(100) 
    .onBegin(() => { 
      opacity.value = withSpring(1, INTERACT_SPRING); 
    })
    .onUpdate((e) => {
      const centerX = (e.x / width) * 100 - 50;
      const centerY = (e.y / height) * 100 - 50;
      
      rotateY.value = -(centerX / 3.5);
      rotateX.value = centerY / 3.5;
      pointerX.value = e.x;
      pointerY.value = e.y;
    })
    .onFinalize(() => {
      rotateX.value = withSpring(0, SNAP_SPRING);
      rotateY.value = withSpring(0, SNAP_SPRING);
      pointerX.value = withSpring(width / 2, SNAP_SPRING);
      pointerY.value = withSpring(height / 2, SNAP_SPRING);
      opacity.value = withSpring(0, SNAP_SPRING);
    });

  const tapGesture = Gesture.Tap().onEnd(() => { runOnJS(handleTap)(); });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 600 },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
    ],
  }));

  const uniforms = useDerivedValue(() => ({
    resolution: [width, height],
    pointer: [pointerX.value, pointerY.value],
    opacity: opacity.value,
    mode: cfg.mode,
    fromCenter: fromCenter.value,
  }));

  return (
    <View ref={containerRef} style={styles.container}>
      <GestureDetector gesture={Gesture.Simultaneous(tapGesture, panGesture)}>
        <Animated.View 
          style={[
            styles.card, 
            { width, height, borderRadius: BR }, 
            cardStyle
          ]}
        >
          <Canvas style={StyleSheet.absoluteFill}>
            <Group>
              <Rect x={0} y={0} width={width} height={height}>
                <LinearGradient start={vec(0, 0)} end={vec(width, height)} colors={[...cfg.bgColors]} />
              </Rect>
              {cardArt && <Image image={cardArt} x={0} y={0} width={width} height={height} fit="cover" />}
              <Rect x={0} y={0} width={width} height={height} blendMode="colorDodge">
                <Shader source={holoEffect} uniforms={uniforms} />
              </Rect>
            </Group>
          </Canvas>
          
          {/* Lock overlay for unowned cards */}
          {isLocked && (
            <View style={[styles.lockOverlay, { borderRadius: BR }]}>
              <View style={styles.lockIcon}>
                <LockKey size={32} color="#FFF" weight="fill" />
              </View>
            </View>
          )}
          
          {/* Duplicate count badge */}
          {!isLocked && duplicateCount > 1 && (
            <View style={styles.duplicateBadge}>
              <Text style={styles.duplicateText}>x{duplicateCount}</Text>
            </View>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 0, 
    backgroundColor: 'transparent', 
    alignItems: 'center' 
  },
  card: { 
    backgroundColor: 'transparent',
    overflow: 'hidden',
    borderWidth: 0,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    // Adds a subtle glow to the icon
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  duplicateBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFB703',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  duplicateText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#222',
  },
});