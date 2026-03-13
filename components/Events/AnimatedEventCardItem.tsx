/**
 * AnimatedEventCardItem.tsx
 * ─────────────────────────
 * Mirrors AnimatedCardItem but drives EventHorizontalCard instead of ExperienceCard.
 * The same scale-on-scroll animation is applied so the visual feel is identical.
 */

import React, { memo } from 'react';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { EventHorizontalCard } from '@/components/Events/EventHorizontalCard';
import type { AseanEvent } from '@/hooks/useEvents';

interface AnimatedEventCardItemProps {
  event:     AseanEvent;
  index:     number;
  scrollX:   SharedValue<number>;
  cardWidth: number;
  cardGap:   number;
  onPress:   () => void;
}

export const AnimatedEventCardItem = memo(function AnimatedEventCardItem({
  event,
  index,
  scrollX,
  cardWidth,
  cardGap,
  onPress,
}: AnimatedEventCardItemProps) {

  const animatedStyle = useAnimatedStyle(() => {
    const stride = cardWidth + cardGap;
    const inputRange = [
      (index - 1.5) * stride,
      index * stride,
      (index + 1.5) * stride,
    ];
    const scale = interpolate(scrollX.value, inputRange, [0.91, 1, 0.91], Extrapolation.CLAMP);
    return { transform: [{ scale }] };
  });

  return (
    <Animated.View style={[{ width: cardWidth, marginRight: cardGap }, animatedStyle]}>
      <EventHorizontalCard event={event} onPress={onPress} />
    </Animated.View>
  );
});
