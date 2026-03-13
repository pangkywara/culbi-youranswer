import React, { useCallback, useEffect, useRef } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { Accelerometer, type AccelerometerMeasurement } from "expo-sensors";
import * as Haptics from "expo-haptics";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { WebView } from "react-native-webview";
import { UnicornBackground } from "./UnicornBackground";
import { getRarityConfig, type Rarity } from "@/components/Collections/Cards/constants";

const { width: SW, height: SH } = Dimensions.get("screen");

const SHAKE_MAG_THRESHOLD = 1.7; 
const ENERGY_GAIN = 0.04;
const ENERGY_DECAY = 0.008; // Slightly faster decay for better "weight"
const BURST_THRESHOLD = 1.0;

interface PowerShakeProps {
  rarity: Rarity;
  onBurst: () => void;
}

export function PowerShake({ rarity, onBurst }: PowerShakeProps) {
  const cfg = getRarityConfig(rarity);
  const energy = useSharedValue(0);
  const hasBurst = useRef(false);
  const webViewRef = useRef<WebView | null>(null);

  // Subtle breathing animation for the prompt dot
  const pulse = useSharedValue(0.3);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(0.7, { duration: 1200 }), withTiming(0.3, { duration: 1200 })),
      -1,
      true
    );
  }, []);

  const triggerHaptic = (e: number) => {
    "worklet";
    if (e > 0.95) runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy);
    else if (e > 0.6) runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
    else if (e > 0.2) runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
  };

  const triggerBurst = useCallback(() => {
    if (hasBurst.current) return;
    hasBurst.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Short delay to let the user feel the "100%" energy before the transition
    setTimeout(onBurst, 400);
  }, [onBurst]);

  useEffect(() => {
    Accelerometer.setUpdateInterval(40); // Faster polling for snappier feel
    const sub = Accelerometer.addListener((data: AccelerometerMeasurement) => {
      const mag = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
      const isShake = Math.abs(mag - 1) > SHAKE_MAG_THRESHOLD - 1;

      if (isShake) {
        energy.value = Math.min(energy.value + ENERGY_GAIN, BURST_THRESHOLD);
        triggerHaptic(energy.value);
      } else {
        energy.value = Math.max(energy.value - ENERGY_DECAY, 0);
      }

      // Feed the energy into the visual engine
      webViewRef.current?.injectJavaScript(`window.setEnergy(${energy.value}); void 0;`);

      if (energy.value >= BURST_THRESHOLD && !hasBurst.current) {
        runOnJS(triggerBurst)();
      }
    });
    return () => sub.remove();
  }, [triggerBurst]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: energy.value > 0.1 ? withTiming(0) : pulse.value,
    transform: [{ scale: energy.value > 0.1 ? withTiming(0.5) : 1 }]
  }));

  return (
    <View style={s.root}>
      {/* Black Void Base */}
      <View style={s.bg} />

      {/* The Visual Heart: Glow and Particles */}
      <UnicornBackground webViewRef={webViewRef} glowColor={cfg.glowColor} />

      {/* Ultra-minimal indicator 
          Just a tiny breathing dot at the bottom that vanishes when you start shaking.
      */}
      <Animated.View style={[s.indicator, indicatorStyle]}>
        <Animated.Text style={s.promptText}>HARNESS ENERGY</Animated.Text>
        <View style={s.dot} />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    width: SW,
    height: SH,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  bg: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: "#000" 
  },
  indicator: {
    position: "absolute",
    bottom: 60,
    alignItems: "center",
  },
  promptText: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 5,
    marginBottom: 15,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  }
});