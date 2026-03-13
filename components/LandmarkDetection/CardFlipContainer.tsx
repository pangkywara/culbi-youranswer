import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    withDelay,
    Extrapolate,
} from "react-native-reanimated";

import { DetectionResult, FlashcardItem } from "@/types/landmark";
import { FlashcardCard } from "./FlashcardItem";
import { ShareCard } from "./ShareCard";


const PREMIUM_EASING = Easing.bezier(0.4, 0, 0.2, 1);

interface CardFlipContainerProps {
  imageUri: string;
  loading: boolean;
  result: DetectionResult | null;
  userProfile: { handle: string; avatar: string };
  firstCard: FlashcardItem;
  onFlipComplete: () => void;
}

export function CardFlipContainer({
  imageUri,
  loading,
  result,
  userProfile,
  firstCard,
  onFlipComplete,
}: CardFlipContainerProps) {
  const flipProgress = useSharedValue(0); // 0 → 1

  useEffect(() => {
    // Slight delay to let the UI settle before the cinematic flip
    flipProgress.value = withDelay(150, withTiming(
      1,
      {
        duration: 950,
        easing: PREMIUM_EASING,
      },
      (finished) => {
        if (finished) runOnJS(onFlipComplete)();
      },
    ));
  }, []);

  /**
   * ── MAIN CONTAINER STYLE ──
   * Handles Scale and the "Slide Down" movement.
   * This prevents the "jumping" effect as both faces move as one object.
   */
  const containerStyle = useAnimatedStyle(() => {
    const scale = interpolate(flipProgress.value, [0, 0.5, 1], [1, 0.90, 1]);
    
    // We slide the card down 32px during the flip to align with the stack position
    const translateY = interpolate(flipProgress.value, [0, 1], [0, 32]);

    return {
      transform: [
        { perspective: 1200 },
        { scale },
        { translateY },
      ],
    };
  });

  /**
   * ── FRONT FACE (ShareCard) ──
   * Visible from 0.0 to 0.5 progress
   */
  const frontStyle = useAnimatedStyle(() => {
    const rotateY = `${interpolate(flipProgress.value, [0, 1], [0, 180])}deg`;
    const opacity = flipProgress.value < 0.5 ? 1 : 0;
    
    return {
      transform: [{ rotateY }],
      opacity,
      zIndex: flipProgress.value < 0.5 ? 1 : 0,
    };
  });

  /**
   * ── BACK FACE (Flashcard) ──
   * Pre-rotated and visible from 0.5 to 1.0 progress
   */
  const backStyle = useAnimatedStyle(() => {
    const rotateY = `${interpolate(flipProgress.value, [0, 1], [-180, 0])}deg`;
    const opacity = flipProgress.value >= 0.5 ? 1 : 0;
    
    return {
      transform: [{ rotateY }],
      opacity,
      zIndex: flipProgress.value >= 0.5 ? 1 : 0,
    };
  });

  /**
   * ── SHADOW SWEEP ──
   * Simulates a "lighting shift" as the card rotates away from the viewer.
   */
  const shadowOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      flipProgress.value,
      [0, 0.45, 0.5, 0.55, 1],
      [0, 0.35, 0, 0.35, 0], // Darkens slightly mid-flip for realism
      Extrapolate.CLAMP
    );
    return {
      opacity,
      backgroundColor: '#000',
      ...StyleSheet.absoluteFillObject,
      borderRadius: 32, // Matches card curvature
    };
  });

  return (
    <Animated.View style={[fl.container, containerStyle]}>
      {/* Front Face: ShareCard */}
      <Animated.View style={[fl.face, frontStyle]}>
        <ShareCard
          imageUri={imageUri}
          loading={loading}
          result={result}
          userProfile={userProfile}
        />
        <Animated.View style={shadowOverlayStyle} pointerEvents="none" />
      </Animated.View>

      {/* Back Face: Initial Flashcard */}
      <Animated.View style={[fl.face, fl.backFace, backStyle]}>
        <FlashcardCard card={firstCard} index={0} />
        <Animated.View style={shadowOverlayStyle} pointerEvents="none" />
      </Animated.View>
    </Animated.View>
  );
}

const fl = StyleSheet.create({
  container: {
    width: 340,
    minHeight: 480,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  face: {
    width: "100%",
    // Required to prevent ghosting of the back side on Android
    backfaceVisibility: "hidden", 
  },
  backFace: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});