import React, { useCallback } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { UsersThree } from "react-native-phosphor";
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";

// ─── Config ──────────────────────────────────────────────────────────────────

const FAB_SIZE = 52;
const SPRING = { damping: 22, stiffness: 220, mass: 0.9 } as const;
const CANCEL_RADIUS = 40;

// Colors matching your premium Charcoal/Neutral theme
const THEME = {
  bg: "#222222",
  accent: "#FFFFFF",
  shadow: "rgba(0,0,0,0.15)",
};

interface GroupPlacementButtonProps {
  /** MapView ref — used to call coordinateForPoint */
  mapRef: React.RefObject<any>;
  /** Called when the user drops the pin at a valid location */
  onPlaceGroup: (coordinate: { latitude: number; longitude: number }) => void;
  /** Bottom offset for the button (accounts for tab bar + safe area) */
  bottomOffset: number;
}

export function GroupPlacementButton({
  mapRef,
  onPlaceGroup,
  bottomOffset,
}: GroupPlacementButtonProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  
  // elevation starts at 5 to match the "My Location" button in DiscoveryMap
  const elevation = useSharedValue(5); 

  const handleDrop = useCallback(
    async (absX: number, absY: number) => {
      try {
        const coordinate = await mapRef.current?.coordinateForPoint({
          x: absX,
          y: absY,
        });
        if (coordinate) {
          onPlaceGroup(coordinate);
        }
      } catch (e) {
        console.warn("[GroupPlacementButton] Placement failed:", e);
      }
    },
    [mapRef, onPlaceGroup],
  );

  const panGesture = Gesture.Pan()
    .onStart(() => {
      scale.value = withSpring(1.1, SPRING);
      elevation.value = withSpring(15, SPRING); // "Lifts" visually on drag
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      const distance = Math.sqrt(
        e.translationX * e.translationX + e.translationY * e.translationY,
      );

      if (distance > CANCEL_RADIUS) {
        runOnJS(handleDrop)(e.absoluteX, e.absoluteY);
      }

      translateX.value = withSpring(0, SPRING);
      translateY.value = withSpring(0, SPRING);
      scale.value = withSpring(1, SPRING);
      elevation.value = withSpring(5, SPRING);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    // Matches the shadow behavior of floatingBtn in DiscoveryMap
    elevation: elevation.value,
    shadowOpacity: elevation.value / 40,
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.fab,
          { bottom: bottomOffset + (Platform.OS === "ios" ? 10 : 30) },
          animatedStyle,
        ]}
      >
        <View style={styles.inner}>
          <UsersThree size={24} color={THEME.accent} weight="bold" />
        </View>
        
        {/* Subtle "Target" pointer visible during drag */}
        <View style={styles.pointerTail} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    left: 20,
    width: FAB_SIZE,
    height: FAB_SIZE,
    alignItems: "center",
    justifyContent: "center",
    // Standardized zIndex: Higher than Map (0) but lower than Sheets/Modals
    // Removing the explicit zIndex: 10 allows the natural draw order to work.
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  inner: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: THEME.bg,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  pointerTail: {
    position: "absolute",
    bottom: -4,
    width: 12,
    height: 12,
    backgroundColor: THEME.bg,
    transform: [{ rotate: "45deg" }],
    zIndex: 1,
    borderRadius: 2,
  },
});