import React, { memo } from 'react';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { ExperienceCard } from './ExperienceCard';
import { CulturalExperience } from '@/types';

interface AnimatedCardItemProps {
  item: CulturalExperience;
  index: number;
  scrollX: SharedValue<number>;
  cardWidth: number;
  cardGap: number;
  variant: 'compact' | 'standard';
  onPress: () => void;
}

// memo — prevents re-render when parent HorizontalSection re-renders for unrelated reasons
export const AnimatedCardItem = memo(function AnimatedCardItem({
  item,
  index,
  scrollX,
  cardWidth,
  cardGap,
  variant,
  onPress,
}: AnimatedCardItemProps) {

  // Use scrollX directly — no secondary spring driver per card.
  // Scroll physics from the gesture already give smooth deceleration;
  // adding withSpring on top created a derived animation running per-frame
  // for every visible card simultaneously, which is wasteful.
  const animatedStyle = useAnimatedStyle(() => {
    const stride = cardWidth + cardGap;
    const inputRange = [
      (index - 1.5) * stride,
      index * stride,
      (index + 1.5) * stride,
    ];

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.91, 1, 0.91],
      Extrapolation.CLAMP
    );

    return { transform: [{ scale }] };
  });

  return (
    <Animated.View
      style={[
        { width: cardWidth, marginRight: cardGap },
        animatedStyle,
      ]}
    >
      <ExperienceCard
        experience={item}
        variant={variant}
        onPress={onPress}
      />
    </Animated.View>
  );
});