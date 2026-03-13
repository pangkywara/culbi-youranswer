import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  interpolateColor, 
  withSpring, 
  useSharedValue, 
  withTiming,
  interpolate
} from 'react-native-reanimated';
import { Check } from 'react-native-phosphor'; // Requires Phosphor icons

interface FilterRowProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  isLast?: boolean;
}

export function FilterRow({ label, description, value, onChange, isLast }: FilterRowProps) {
  // Animation value: 0 for Off, 1 for On
  const progress = useSharedValue(value ? 1 : 0);

  const toggleSwitch = () => {
    const newValue = !value;
    progress.value = withSpring(newValue ? 1 : 0, { damping: 20, stiffness: 200 });
    onChange(newValue);
  };

  // ─── Animated Styles ──────────────────────────────────────────────────────

  const animatedTrackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['#B0B0B0', '#222222'] // Off (Gray) to On (Black) as seen in image
    ),
  }));

  const animatedThumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [2, 18]) },
      { scale: interpolate(progress.value, [0, 0.5, 1], [1, 0.9, 1]) } // Subtle squash micro-animation
    ],
  }));

  const animatedCheckStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.8], [0, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.5, 1]) }]
  }));

  return (
    <View style={[styles.wrapper, !isLast && styles.border]}>
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.label}>{label}</Text>
          {description && <Text style={styles.description}>{description}</Text>}
        </View>

        <Pressable onPress={toggleSwitch}>
          <Animated.View style={[styles.track, animatedTrackStyle]}>
            <Animated.View style={[styles.thumb, animatedThumbStyle]}>
              <Animated.View style={animatedCheckStyle}>
                <Check size={12} color="#222222" weight="bold" />
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
  border: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDDDDD',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 4,
  },
  textContainer: {
    flex: 1,
    paddingRight: 16,
  },
  label: {
    fontSize: 16,
    color: '#222222',
    fontWeight: '400',
  },
  description: {
    fontSize: 14,
    color: '#717171',
    marginTop: 4,
    lineHeight: 18,
  },
  // ─── Custom Switch Styles ─────────────────────────────────────────────────
  track: {
    width: 48,
    height: 32,
    borderRadius: 16,
    padding: 2,
    justifyContent: 'center',
  },
  thumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow to match the elevated feel of image thumb
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
});