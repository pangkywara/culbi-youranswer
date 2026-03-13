/**
 * AnimatedHeartButton
 * ─────────────────────────────────────────────────────────────────────────────
 * A reusable, database-connected heart button.
 *
 * Pass `placeId` + `placeName` to persist likes to Supabase.
 * The button works without a session (animation-only), and syncs once
 * the user authenticates.
 *
 * Props
 *   placeId    — Google place_id (required for DB persistence)
 *   placeName  — stored for convenience in the likes row
 *   size       — icon size (default 22)
 *   showBg     — render the white pill background (default true)
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Heart } from 'react-native-phosphor';
import { useLike } from '@/hooks/useLike';

interface AnimatedHeartButtonProps {
  placeId:    string;
  placeName?: string;
  size?:      number;
  showBg?:    boolean;
  style?:     ViewStyle;
  /** Called after the toggle resolves (useful for parent state sync) */
  onToggled?: (isLiked: boolean) => void;
}

export default function AnimatedHeartButton({
  placeId,
  placeName = '',
  size = 22,
  showBg = true,
  style,
  onToggled,
}: AnimatedHeartButtonProps) {
  const { isLiked, toggleLike } = useLike({ placeId, placeName });

  const scale      = useSharedValue(1);
  const isMounted  = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = async () => {
    // Haptic pop animation — runs immediately (optimistic)
    scale.value = withSpring(1.35, { damping: 8, stiffness: 120 }, () => {
      scale.value = withSpring(1, { damping: 10, stiffness: 150 });
    });

    await toggleLike();
    onToggled?.(!isLiked);
  };

  return (
    <Pressable
      onPress={handlePress}
      // Prevents tap from bubbling to parent cards' onPress
      onStartShouldSetResponder={() => true}
      style={[showBg ? styles.btnContainer : styles.naked, style]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Animated.View style={animatedStyle}>
        <Heart
          size={size}
          weight={isLiked ? 'fill' : 'bold'}
          color={isLiked ? '#FF385C' : '#fff'}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btnContainer: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // No background — used inside photo overlays where the card already provides context
  naked: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});