import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { Plus, PencilSimpleLine, SneakerMove } from 'react-native-phosphor';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  interpolate,
  Easing,
  Extrapolate,
} from 'react-native-reanimated';
import { Colors, Type, Space, Radius, Shadows, S } from '@/constants/style';

const ICON_SPRING = {
  damping: 22,
  stiffness: 180,
  mass: 0.6,
};

const BUBBLE_EASING = Easing.bezier(0.22, 1.0, 0.36, 1.0);
const BUBBLE_EASING_IN = Easing.bezier(0.4, 0.0, 1.0, 0.6);

const BUBBLE_DURATION = 320;
const STAGGER_MS = 55;

export const TripActionFAB = ({
  onManualAdd,
  onAiPlan,
  bottomOffset = 0,
}: {
  onManualAdd: () => void;
  onAiPlan: () => void;
  /** Extra bottom padding to clear a tab bar or other absolute-positioned UI. */
  bottomOffset?: number;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  const iconRotation = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);
  const bubble0 = useSharedValue(0);
  const bubble1 = useSharedValue(0);

  const toggle = () => {
    const opening = !isOpen;
    setIsOpen(opening);

    if (opening) {
      setShouldRender(true);
      overlayOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
      iconRotation.value = withSpring(1, ICON_SPRING);
      bubble0.value = withDelay(0, withTiming(1, { duration: BUBBLE_DURATION, easing: BUBBLE_EASING }));
      bubble1.value = withDelay(STAGGER_MS, withTiming(1, { duration: BUBBLE_DURATION, easing: BUBBLE_EASING }));
    } else {
      bubble1.value = withTiming(0, { duration: 200, easing: BUBBLE_EASING_IN });
      bubble0.value = withDelay(STAGGER_MS, withTiming(0, { duration: 200, easing: BUBBLE_EASING_IN }));
      iconRotation.value = withSpring(0, ICON_SPRING);
      overlayOpacity.value = withTiming(0, { duration: 250, easing: Easing.in(Easing.ease) });
      setTimeout(() => setShouldRender(false), 280);
    }
  };

  const fabIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(iconRotation.value, [0, 1], [0, 135])}deg` }],
  }));

  const fabLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(iconRotation.value, [0, 0.25], [1, 0], Extrapolate.CLAMP),
    transform: [
      { translateX: interpolate(iconRotation.value, [0, 0.25], [0, 6], Extrapolate.CLAMP) },
    ],
  })) as any;

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  // Tightened bubble gap: -70 and -122 (52px apart)
  const bubble0Style = useAnimatedStyle(() => ({
    opacity: bubble0.value,
    transform: [
      { translateY: interpolate(bubble0.value, [0, 1], [12, -120], Extrapolate.CLAMP) },
      { scale: interpolate(bubble0.value, [0, 1], [0.88, 1], Extrapolate.CLAMP) },
    ],
  }));

  const bubble1Style = useAnimatedStyle(() => ({
    opacity: bubble1.value,
    transform: [
      { translateY: interpolate(bubble1.value, [0, 1], [12, -180], Extrapolate.CLAMP) },
      { scale: interpolate(bubble1.value, [0, 1], [0.88, 1], Extrapolate.CLAMP) },
    ],
  }));

  return (
    <View style={[styles.container, { paddingBottom: Space.xxxl + bottomOffset }]} pointerEvents="box-none">
      {shouldRender && (
        <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={toggle} />
        </Animated.View>
      )}

      {shouldRender && (
        <Animated.View style={[styles.bubbleWrapper, bubble0Style]}>
          <TouchableOpacity
            style={styles.bubble}
            onPress={() => { toggle(); onManualAdd(); }}
            activeOpacity={0.85}
          >
            <Text style={styles.label}>Add manually</Text>
            <View style={[styles.iconCircle, { backgroundColor: Colors.surfaceMuted }]}>
              <PencilSimpleLine size={20} color={Colors.brand} weight="bold" />
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {shouldRender && (
        <Animated.View style={[styles.bubbleWrapper, bubble1Style]}>
          <TouchableOpacity
            style={styles.bubble}
            onPress={() => { toggle(); onAiPlan(); }}
            activeOpacity={0.85}
          >
            <Text style={styles.label}>Culbi plans</Text>
            <View style={[styles.iconCircle, { backgroundColor: '#F3E5F5' }]}>
              <SneakerMove size={20} color="#9B59B6" weight="bold" />
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      <TouchableOpacity style={styles.fab} onPress={toggle} activeOpacity={0.9}>
        <Animated.View style={fabIconStyle}>
          <Plus size={24} color={Colors.white} weight="bold" />
        </Animated.View>
        {!isOpen && (
          <Animated.Text style={[styles.fabText, fabLabelStyle]}>
            Plan new trip
          </Animated.Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    // bottomOffset is added at runtime via inline style
    paddingBottom: Space.xxxl,
  },
  overlay: {
    backgroundColor: Colors.imageOverlay,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.textPrimary,
    paddingVertical: Space.md + 2,
    paddingHorizontal: Space.xl,
    borderRadius: Radius.pill,
    ...Shadows.level3,
  },
  fabText: {
    color: Colors.white,
    fontSize: Type.sizeTitle,
    fontWeight: Type.weightSemibold,
    marginLeft: Space.sm,
  },
  bubbleWrapper: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
    width: 200,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingLeft: Space.lg,
    paddingRight: Space.xs + 2,
    paddingVertical: Space.xs + 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.level2,
  },
  label: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
    marginRight: Space.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});