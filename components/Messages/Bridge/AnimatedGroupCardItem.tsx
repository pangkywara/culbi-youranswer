/**
 * AnimatedGroupCardItem.tsx
 * ─────────────────────────
 * Animated wrapper for GroupHorizontalCard inside a horizontal FlatList.
 * Mirrors AnimatedEventCardItem exactly — same scale interpolation values.
 */

import React, { memo } from 'react';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { GroupHorizontalCard } from './GroupHorizontalCard';
import type { PublicGroup } from '@/hooks/useAllGroups';

interface Props {
  group: PublicGroup;
  index: number;
  scrollX: SharedValue<number>;
  cardWidth: number;
  cardGap: number;
  onPress: () => void;
}

export const AnimatedGroupCardItem = memo(function AnimatedGroupCardItem({
  group,
  index,
  scrollX,
  cardWidth,
  cardGap,
  onPress,
}: Props) {
  const stride = cardWidth + cardGap;

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollX.value,
      [(index - 1.5) * stride, index * stride, (index + 1.5) * stride],
      [0.91, 1, 0.91],
      Extrapolation.CLAMP,
    );
    return { transform: [{ scale }] };
  });

  return (
    <Animated.View style={[{ width: cardWidth, marginRight: cardGap }, animatedStyle]}>
      <GroupHorizontalCard group={group} onPress={onPress} />
    </Animated.View>
  );
});
