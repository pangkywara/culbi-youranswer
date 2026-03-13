/**
 * POIDetailSkeleton
 * ─────────────────────────────────────────────────────────────────────────────
 * Shimmer placeholder mirroring the TitleSection layout inside POIDetailSheet:
 *   • Title line            (centred, ~180px)
 *   • Sub-text line         (centred, ~140px)
 *   • Rating row            (centred, ~120px)
 *   • Horizontal divider
 *
 * `shimmerX` comes from `useSkeletonShimmer()` in the parent so all boxes
 * on the sheet pulse in phase-lock.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { SkeletonBox } from '@/components/Destinations/Skeleton/SkeletonBox';

interface POIDetailSkeletonProps {
  shimmerX: SharedValue<number>;
}

export function POIDetailSkeleton({ shimmerX }: POIDetailSkeletonProps) {
  return (
    <View style={styles.container}>
      {/* Title — matches styles.title: fontSize 24, centred */}
      <SkeletonBox
        shimmerX={shimmerX}
        width={180}
        height={22}
        borderRadius={8}
        style={styles.centred}
      />

      {/* Sub-text — category · region, fontSize 15 */}
      <SkeletonBox
        shimmerX={shimmerX}
        width={140}
        height={14}
        borderRadius={6}
        style={[styles.centred, { marginTop: 14 }]}
      />

      {/* Details line — vicinity, fontSize 15 */}
      <SkeletonBox
        shimmerX={shimmerX}
        width={200}
        height={13}
        borderRadius={6}
        style={[styles.centred, { marginTop: 6 }]}
      />

      {/* Rating row — ★ x.xx · N reviews, fontSize 14 */}
      <SkeletonBox
        shimmerX={shimmerX}
        width={120}
        height={13}
        borderRadius={6}
        style={[styles.centred, { marginTop: 14 }]}
      />

      {/* Divider — matches styles.divider: height 1, marginVertical 24 */}
      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    alignItems: 'center',
  },
  centred: {
    alignSelf: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#ebebeb',
    marginVertical: 24,
    alignSelf: 'stretch',
  },
});
