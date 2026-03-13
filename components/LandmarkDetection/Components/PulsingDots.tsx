import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, Easing } from "react-native-reanimated";
import { d } from "./styles";

export function PulsingDots() {
  const dots = [useSharedValue(0.25), useSharedValue(0.25), useSharedValue(0.25)];

  useEffect(() => {
    const cfg = { duration: 480, easing: Easing.inOut(Easing.ease) };
    dots.forEach((dot, i) => {
      dot.value = withDelay(i * 160, withRepeat(withSequence(withTiming(1, cfg), withTiming(0.25, cfg)), -1));
    });
  }, []);

  return (
    <View style={d.row}>
      {dots.map((dot, i) => {
        const style = useAnimatedStyle(() => ({ opacity: dot.value }));
        return <Animated.View key={i} style={[d.dot, style]} />;
      })}
    </View>
  );
}