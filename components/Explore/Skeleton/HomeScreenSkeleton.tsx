/**
 * HomeScreenSkeleton
 * ─────────────────────────────────────────────────────────────────────────────
 * Full placeholder for the index.tsx content area while `experiences` is
 * loading.  Renders skeleton versions of:
 *   • "Top nearest"  (standard cards)
 *   •  Two country sections  (standard cards)
 *
 * All sections share a single `shimmerX` shared value so every box pulses
 * in perfect phase-lock — zero extra overhead.
 *
 * Designed to sit INLINE inside the `Animated.ScrollView` in index.tsx,
 * not as a full-screen overlay.
 */
import React from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { useSkeletonShimmer } from '@/components/Destinations/Skeleton/useSkeletonShimmer';
import { SkeletonHorizontalSection } from './SkeletonHorizontalSection';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STANDARD_WIDTH = SCREEN_WIDTH * 0.52;
const COMPACT_WIDTH  = SCREEN_WIDTH * 0.36;

// Mirrors the section count the user will see once data arrives
const SKELETON_SECTIONS = 3;

export function HomeScreenSkeleton() {
  const shimmerX = useSkeletonShimmer();

  return (
    <View style={styles.container}>
      {/* Compact-width section — mimics "Recently viewed" when present */}
      <SkeletonHorizontalSection
        shimmerX={shimmerX}
        cardWidth={COMPACT_WIDTH}
        variant="compact"
        cardCount={4}
      />

      {/* Standard sections — mimics "Top nearest" + country sections */}
      {Array.from({ length: SKELETON_SECTIONS }).map((_, i) => (
        <SkeletonHorizontalSection
          key={i}
          shimmerX={shimmerX}
          cardWidth={STANDARD_WIDTH}
          variant="standard"
          cardCount={3}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
