import React, { useEffect } from "react";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";

interface SkeletonBlockProps {
  width: number | `${number}%`;
  height: number;
  radius?: number;
  style?: object;
}

export function SkeletonBlock({
  width,
  height,
  radius = 8,
  style,
}: SkeletonBlockProps) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: "#EFEFEF" },
        animStyle,
        style,
      ]}
    />
  );
}
