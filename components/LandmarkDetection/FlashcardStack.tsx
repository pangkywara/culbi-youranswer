import type { FlashcardItem } from "@/types/landmark";
import React, { useCallback, useState } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { FlashcardCard } from "./FlashcardItem";

const { height: SCREEN_H } = Dimensions.get("window");
const CARD_W = 340;
const CARD_H = 460;
const PEEK = 20;

export function FlashcardStack({
  flashcards,
  onComplete,
}: {
  flashcards: FlashcardItem[];
  onComplete: () => void;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [locked, setLocked] = useState(false);

  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const exitRotate = useSharedValue(0);
  const exitOpacity = useSharedValue(1);

  // ── Called only after the exit animation fully completes ─────────────
  // At this point the card is opacity:0 and far off-screen.
  // Resetting shared values HERE (before the state update) means the
  // Animated.View is already invisible when React re-renders with the
  // new index — so the incoming card materialises at position 0 cleanly,
  // with no flash of the previous card's position.
  const advanceCard = useCallback(() => {
    // Reset FIRST — card is invisible so this is imperceptible
    translateY.value = 0;
    translateX.value = 0;
    exitRotate.value = 0;
    exitOpacity.value = 1;

    // Then update React state
    const next = currentIdx + 1;
    if (next >= flashcards.length) {
      setLocked(true);
      onComplete();
    } else {
      setCurrentIdx(next);
    }
  }, [currentIdx, flashcards.length, onComplete]);

  const pan = Gesture.Pan()
    .enabled(!locked)
    .onUpdate((e) => {
      translateY.value =
        e.translationY < 0 ? e.translationY * 0.8 : e.translationY * 0.2;
      translateX.value = e.translationX;
      exitRotate.value = interpolate(
        e.translationX,
        [-200, 0, 200],
        [-10, 0, 10],
      );
    })
    .onEnd((e) => {
      const swipedUp = e.translationY < -70 || e.velocityY < -500;
      const swipedRight = e.translationX > 70 || e.velocityX > 500;

      if (swipedUp || swipedRight) {
        // Fade out immediately
        exitOpacity.value = withTiming(0, { duration: 180 });

        // Fly off — advanceCard fires only in the completion callback of
        // the positional animation, ensuring the card is fully gone first.
        if (swipedUp) {
          translateX.value = withTiming(0, { duration: 250 });
          translateY.value = withTiming(
            -(SCREEN_H * 0.55),
            { duration: 250 },
            () => runOnJS(advanceCard)(),
          );
        } else {
          translateY.value = withTiming(0, { duration: 250 });
          translateX.value = withTiming(440, { duration: 250 }, () =>
            runOnJS(advanceCard)(),
          );
        }
      } else {
        // Snap back to rest
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
        exitRotate.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const activeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${exitRotate.value}deg` },
    ],
    opacity: exitOpacity.value,
  }));

  if (locked) return null;

  return (
    <View style={s.root}>
      <View style={s.container}>
        {/* Layer 3 — furthest back */}
        {currentIdx + 2 < flashcards.length && (
          <View
            style={[
              s.layer,
              { top: 0, zIndex: 1, transform: [{ scale: 0.9 }] },
            ]}
            pointerEvents="none"
          >
            <FlashcardCard
              card={flashcards[currentIdx + 2]}
              index={currentIdx + 2}
              isBackground
            />
          </View>
        )}

        {/* Layer 2 — middle */}
        {currentIdx + 1 < flashcards.length && (
          <View
            style={[
              s.layer,
              { top: PEEK, zIndex: 2, transform: [{ scale: 0.95 }] },
            ]}
            pointerEvents="none"
          >
            <FlashcardCard
              card={flashcards[currentIdx + 1]}
              index={currentIdx + 1}
              isBackground
            />
          </View>
        )}

        {/* Active card — front */}
        <GestureDetector gesture={pan}>
          <Animated.View
            style={[s.layer, { top: PEEK * 2, zIndex: 3 }, activeStyle]}
          >
            <FlashcardCard card={flashcards[currentIdx]} index={currentIdx} />
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { alignItems: "center", justifyContent: "center", paddingTop: 40 },
  container: { width: CARD_W, height: CARD_H + PEEK * 2 },
  layer: {
    position: "absolute",
    width: CARD_W,
    height: CARD_H,
    alignSelf: "center",
  },
});
