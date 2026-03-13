/**
 * SkeletonBox — reusable shimmer primitive.
 *
 * Renders a rounded grey box whose shimmer phase is driven by a shared
 * Reanimated value so every SkeletonBox on the same screen pulses in sync.
 * Pass `shimmerX` from `useSkeletonShimmer()` to achieve this.
 *
 * Usage:
 *   const shimmerX = useSkeletonShimmer();
 *   <SkeletonBox shimmerX={shimmerX} width={200} height={16} borderRadius={8} />
 */

import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import type { SharedValue } from 'react-native-reanimated';

// ─── Shimmer colours ──────────────────────────────────────────────────────────
const BASE   = '#EBEBEB';
const HIGHLIGHT = '#F5F5F5';
const SHINE  = '#FFFFFF';

interface SkeletonBoxProps {
  shimmerX: SharedValue<number>;
  width?:   number | `${number}%`;
  height:   number;
  borderRadius?: number;
  style?:   StyleProp<ViewStyle>;
}

export function SkeletonBox({
  shimmerX,
  width = '100%',
  height,
  borderRadius = 8,
  style,
}: SkeletonBoxProps) {
  // Translate the gradient overlay by the shared shimmer value.
  // Because every SkeletonBox on the screen shares the same shimmerX, they
  // all animate in perfect phase-lock (one Reanimated loop drives all of them).
  const overlayStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  return (
    <View
      style={[
        styles.base,
        { width, height, borderRadius },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]}>
        <LinearGradient
          colors={[BASE, HIGHLIGHT, SHINE, HIGHLIGHT, BASE]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: BASE,
    overflow: 'hidden',
  },
  gradient: {
    // Wider than the box so the shine band sweeps fully across
    width: '300%',
    height: '100%',
  },
});
