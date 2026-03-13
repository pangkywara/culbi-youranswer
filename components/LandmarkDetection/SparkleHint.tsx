import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Sparkle } from "react-native-phosphor";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";

import { Colors } from "@/constants/style";

// ─── Component ───────────────────────────────────────────────────────────────

export function SparkleHint() {
  const iconScale = useSharedValue(1);
  const glowOp = useSharedValue(0.35);
  const textOp = useSharedValue(0.5);
  const chevronY = useSharedValue(0);

  React.useEffect(() => {
    // Sparkle icon pulse
    iconScale.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    // Glow pulse
    glowOp.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.25, {
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      true,
    );

    // Text subtle fade
    textOp.value = withRepeat(
      withSequence(
        withDelay(
          200,
          withTiming(0.9, {
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        withTiming(0.5, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    // Chevron bounce
    chevronY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOp.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOp.value,
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: chevronY.value }],
  }));

  return (
    <View style={s.root}>
      {/* Glow circle behind icon */}
      <Animated.View style={[s.glow, glowStyle]} />

      {/* Sparkle icon */}
      <Animated.View style={[s.iconWrap, iconStyle]}>
        <Sparkle size={28} color={Colors.brand} weight="fill" />
      </Animated.View>

      {/* Chevron arrows */}
      <Animated.View style={chevronStyle}>
        <Text style={s.chevrons}>⌃</Text>
      </Animated.View>

      {/* Hint text */}
      <Animated.Text style={[s.hintText, textStyle]}>
        Tap to reveal secrets
      </Animated.Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  glow: {
    position: "absolute",
    top: -10,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.brand,
  },
  iconWrap: {
    zIndex: 2,
  },
  chevrons: {
    fontSize: 18,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "700",
    lineHeight: 18,
  },
  hintText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0.5,
  },
});
