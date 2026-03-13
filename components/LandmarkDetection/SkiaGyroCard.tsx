/**
 * SkiaGyroCard
 *
 * Card reveal screen that uses @shopify/react-native-skia for the holographic
 * effect (same shaders as Collections/Cards) and the gyroscope to animate the
 * pointer uniforms — no WebView, no CSS, no glitch.
 *
 * Architecture:
 *  • Skia Canvas renders: background gradient, card art, holo shader, glare shader
 *  • Gyroscope → shared values (tiltX / tiltY) → pX / pY uniforms via useDerivedValue
 *  • Springs (react-native-reanimated) damp the gyro signal exactly like CardZoomOverlay
 *  • Entrance: card rises from bottom + 2 Y-axis spins (same as GyroCard)
 *  • UnicornBackground behind the card (same as GyroCard)
 *  • Haptics: same per-rarity patterns as GyroCard
 *  • GyroCard is NOT removed — this is an additional export
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Dimensions, Platform, StyleSheet, Text, View } from "react-native";
import {
  Canvas,
  Group,
  Image as SkiaImage,
  LinearGradient,
  Rect,
  RoundedRect,
  Shader,
  useImage,
  vec,
} from "@shopify/react-native-skia";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeIn,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gyroscope, type GyroscopeMeasurement } from "expo-sensors";
import * as Haptics from "expo-haptics";

import { getHoloEffect, getGlareEffect } from "@/components/Collections/Cards";
import { getRarityConfig, type Rarity } from "@/components/Collections/Cards/constants";
import { UnicornBackground } from "./UnicornBackground";
import { WebView } from "react-native-webview";

// ─── Dimensions ────────────────────────────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get("screen");
const CARD_W = Math.min(Math.round(SW * 0.78), 340);
const CARD_H = Math.round(CARD_W * 1.4);
const CARD_RADIUS = 18;

// ─── Entrance timing ──────────────────────────────────────────────────────────
const SPIN_DURATION = 1200;
const SPIN_COUNT = 2;
const RISE_DURATION = SPIN_DURATION * SPIN_COUNT; // 2400 ms
const SETTLE_DURATION = 600;
const ENTRANCE_TOTAL = RISE_DURATION + SETTLE_DURATION; // 3000 ms

// ─── Gyro limits (matching Card.svelte) ───────────────────────────────────────
const LIMIT_X = 16;
const LIMIT_Y = 18;

// ─── Spring config for tilt damping ──────────────────────────────────────────
const TILT_SPRING = { damping: 14, stiffness: 80, mass: 0.4 };

// ─── Haptics (same as GyroCard) ───────────────────────────────────────────────
function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function playRevealHaptics(rarity: Rarity) {
  switch (rarity) {
    case "Secret":
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await delay(80);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await delay(80);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case "Mythic":
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await delay(120);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await delay(60);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case "Legends":
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await delay(100);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await delay(100);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case "Epic":
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await delay(150);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case "Rare":
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await delay(200);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    default:
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
interface SkiaGyroCardProps {
  imageUri: string;
  rarity: Rarity;
  onDismiss: () => void;
}

export function SkiaGyroCard({ imageUri, rarity, onDismiss }: SkiaGyroCardProps) {
  const cfg = useMemo(() => getRarityConfig(rarity), [rarity]);
  const auraWebViewRef = useRef<WebView | null>(null);

  // Skia image (loads async; canvas waits automatically)
  const cardArt = useImage(imageUri);

  // Lazily initialise shader effects inside the component (Skia safe)
  const holoEffect = useMemo(() => getHoloEffect(), []);
  const glareEffect = useMemo(() => getGlareEffect(), []);

  // ── Entrance animation ──────────────────────────────────────────────
  const translateY   = useSharedValue(SH * 0.7);
  const rotateY      = useSharedValue(0);
  const opacity      = useSharedValue(0);
  const entranceDone = useSharedValue(0);
  const holoOpacity  = useSharedValue(0);

  // ── Tilt shared values (gyro + spring) ─────────────────────────────
  // Raw gyro accumulator (JS thread ref)
  const gyroX = useRef(0);
  const gyroY = useRef(0);

  // Spring-damped tilt for Skia uniforms (on UI thread via reanimated)
  const tiltX = useSharedValue(0); // −LIMIT_X … +LIMIT_X
  const tiltY = useSharedValue(0);

  // Pointer position in canvas px (0 … CARD_W / CARD_H)
  const pX = useSharedValue(CARD_W / 2);
  const pY = useSharedValue(CARD_H / 2);

  const [gyroAvailable, setGyroAvailable] = useState(true);

  const dismissRef = useRef(onDismiss);
  useEffect(() => { dismissRef.current = onDismiss; }, [onDismiss]);
  const handleDismiss = useCallback(() => dismissRef.current(), []);

  // ── Entrance ────────────────────────────────────────────────────────
  useEffect(() => {
    playRevealHaptics(rarity);

    opacity.value = withTiming(1, { duration: 300 });

    translateY.value = withSequence(
      withTiming(0, { duration: RISE_DURATION, easing: Easing.out(Easing.cubic) }),
      withSpring(0, { damping: 14, stiffness: 120, mass: 0.5 }),
    );

    rotateY.value = withSequence(
      withTiming(360 * SPIN_COUNT, {
        duration: RISE_DURATION,
        easing: Easing.inOut(Easing.quad),
      }),
      withTiming(0, { duration: 0 }),
    );

    entranceDone.value = withDelay(ENTRANCE_TOTAL, withTiming(1, { duration: 0 }));

    // Fade in holo shine after entrance
    holoOpacity.value = withDelay(
      ENTRANCE_TOTAL,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) }),
    );
  }, []);

  // ── Gyroscope ────────────────────────────────────────────────────────
  useEffect(() => {
    let sub: ReturnType<typeof Gyroscope.addListener> | null = null;

    Gyroscope.isAvailableAsync().then((available) => {
      if (!available) { setGyroAvailable(false); return; }
      Gyroscope.setUpdateInterval(16);

      sub = Gyroscope.addListener((data: GyroscopeMeasurement) => {
        if (entranceDone.value < 1) return;

        const dt = 0.016;
        gyroX.current = Math.min(Math.max(
          gyroX.current + data.y * dt * 57.3, -LIMIT_X
        ), LIMIT_X);
        gyroY.current = Math.min(Math.max(
          gyroY.current - data.x * dt * 57.3, -LIMIT_Y
        ), LIMIT_Y);
        gyroX.current *= 0.97;
        gyroY.current *= 0.97;

        // Push to shared values — reanimated springs them on UI thread
        tiltX.value = withSpring(gyroX.current, TILT_SPRING);
        tiltY.value = withSpring(gyroY.current, TILT_SPRING);
      });
    });

    return () => { sub?.remove(); };
  }, []);

  // ── Skia pointer uniforms (derived on UI thread, no bridge cost) ─────
  // tiltX: −16…+16 → pX: 0…CARD_W   (same as Card.svelte glare.x adjust)
  // tiltY: −18…+18 → pY: 0…CARD_H
  const uniforms = useDerivedValue(() => {
    const px = CARD_W * ((tiltX.value + LIMIT_X) / (2 * LIMIT_X));
    const py = CARD_H * ((tiltY.value + LIMIT_Y) / (2 * LIMIT_Y));
    pX.value = px;
    pY.value = py;
    const fromCenter = Math.min(
      Math.sqrt(
        ((px - CARD_W / 2) / (CARD_W / 2)) ** 2 +
        ((py - CARD_H / 2) / (CARD_H / 2)) ** 2,
      ),
      1,
    );
    return {
      resolution: [CARD_W, CARD_H] as [number, number],
      pointer: [px, py] as [number, number],
      opacity: holoOpacity.value,
      mode: cfg.mode,
      fromCenter,
    };
  });

  const glareUniforms = useDerivedValue(() => ({
    resolution: [CARD_W, CARD_H] as [number, number],
    pointer: [pX.value, pY.value] as [number, number],
    opacity: holoOpacity.value,
  }));

  // ── 3-D tilt animated style (for the card wrapper) ───────────────────
  // rotateX / rotateY from tilt, perspective to give depth
  const cardWrapStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { perspective: 800 },
      { translateY: translateY.value },
      { rotateY: `${interpolate(rotateY.value, [0, 720], [0, 720])}deg` },
      // After entrance, gyro tilt drives 3-D rotation visible on card wrapper
      { rotateX: `${-tiltY.value * 0.7}deg` },
      { rotateY: `${tiltX.value * 0.7}deg` },
    ],
  }));

  const dismissOpacity = useAnimatedStyle(() => ({
    opacity: entranceDone.value,
  }));

  // ── Pan gesture (same as CardZoomOverlay): finger controls holo pointer + 3-D tilt
  const isPanning = useSharedValue(false);

  const gesture = Gesture.Pan()
    .onBegin(() => { isPanning.value = true; })
    .onUpdate((e) => {
      if (entranceDone.value < 1) return;
      const localX = e.x;
      const localY = e.y;
      pX.value = localX;
      pY.value = localY;
      tiltX.value = ((localX / CARD_W) * 2 - 1) * LIMIT_X;
      tiltY.value = ((localY / CARD_H) * 2 - 1) * LIMIT_Y;
    })
    .onEnd(() => {
      isPanning.value = false;
      tiltX.value = withSpring(0, TILT_SPRING);
      tiltY.value = withSpring(0, TILT_SPRING);
      pX.value = withSpring(CARD_W / 2, TILT_SPRING);
      pY.value = withSpring(CARD_H / 2, TILT_SPRING);
    });

  const tap = Gesture.Tap().onEnd((e) => {
    // dismiss only if tap lands outside the card area
    const cardLeft = (SW - CARD_W) / 2;
    const cardTop  = SH * 0.08;
    const inside =
      e.absoluteX > cardLeft && e.absoluteX < cardLeft + CARD_W &&
      e.absoluteY > cardTop  && e.absoluteY < cardTop  + CARD_H;
    if (!inside && entranceDone.value >= 1) runOnJS(handleDismiss)();
  });

  return (
    <GestureHandlerRootView style={s.root}>
      {/* Aura background — full energy from power-shake phase */}
      <UnicornBackground
        webViewRef={auraWebViewRef}
        glowColor={cfg.glowColor}
        initialEnergy={1}
      />

      <GestureDetector gesture={Gesture.Simultaneous(gesture, tap)}>
        <Animated.View style={s.screenFill}>
        <Animated.View style={[s.cardWrap, cardWrapStyle]}>
          <Canvas style={StyleSheet.absoluteFill}>
            <Group>
              {/* 1. Background gradient */}
              <RoundedRect x={0} y={0} width={CARD_W} height={CARD_H} r={CARD_RADIUS}>
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(CARD_W, CARD_H)}
                  colors={cfg.bgColors}
                />
              </RoundedRect>

              {/* 2. Card art */}
              {cardArt && (
                <SkiaImage
                  image={cardArt}
                  x={0}
                  y={0}
                  width={CARD_W}
                  height={CARD_H}
                  fit="cover"
                />
              )}

              {/* 3. Holo shader (colorDodge — same as CardZoomOverlay) */}
              <Rect
                x={0}
                y={0}
                width={CARD_W}
                height={CARD_H}
                blendMode="colorDodge"
              >
                <Shader source={holoEffect} uniforms={uniforms} />
              </Rect>

              {/* 4. Glare shader (overlay) */}
              <Rect
                x={0}
                y={0}
                width={CARD_W}
                height={CARD_H}
                blendMode="overlay"
              >
                <Shader source={glareEffect} uniforms={glareUniforms} />
              </Rect>
            </Group>
          </Canvas>

          {/* Badge */}
          <View style={[s.badge, { backgroundColor: cfg.badgeColor }]}>
            <Text style={s.badgeText}>{cfg.label.toUpperCase()}</Text>
          </View>
        </Animated.View>
        </Animated.View>
      </GestureDetector>

      {/* Hint */}
      <Animated.Text
        entering={FadeIn.delay(ENTRANCE_TOTAL + 400).duration(500)}
        style={s.hint}
      >
        {gyroAvailable ? "Tilt your phone to explore" : "Tap anywhere outside to close"}
      </Animated.Text>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  root: {
    width: SW,
    height: SH,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: SH * (Platform.OS === "ios" ? 0.15 : 0.25),
    overflow: "hidden",
  },
  // Full-screen hit area so gesture captures touches anywhere
  screenFill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: SH * (Platform.OS === "ios" ? 0.15 : 0.25),
  },
  cardWrap: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
    zIndex: 10,
  },
  badge: {
    position: "absolute",
    top: 18,
    right: 18,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    color: "white",
    fontWeight: "900",
    fontSize: 12,
  },
  hint: {
    position: "absolute",
    bottom: 28,
    color: "rgba(255,255,255,0.38)",
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.3,
    zIndex: 11,
  },
  dismissZone: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9,
  },
});
