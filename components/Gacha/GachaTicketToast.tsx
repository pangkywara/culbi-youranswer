import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  withSequence,
  withDelay,
  runOnJS,
  FadeInUp,
  FadeOutUp
} from 'react-native-reanimated';
import { Ticket } from 'react-native-phosphor';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Using your centralized style tokens
import { Colors, Space, Type, Radius, Shadows } from '@/constants/style';

interface GachaTicketToastProps {
  visible: boolean;
  tickets: number;
  onDismiss: () => void;
  onViewCollection?: () => void;
}

export function GachaTicketToast({
  visible,
  tickets,
  onDismiss,
  onViewCollection,
}: GachaTicketToastProps) {
  const insets = useSafeAreaInsets();
  
  // Animation Values
  const progress = useSharedValue(0);
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Entrance: Snappy Spring
      translateY.value = withSpring(0, { damping: 15, stiffness: 120 });
      opacity.value = withTiming(1, { duration: 400 });

      // Progress bar timing
      progress.value = withTiming(1, { duration: 4000 });

      // Auto-exit sequence
      const timer = setTimeout(() => {
        handleDismiss();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleDismiss = () => {
    translateY.value = withTiming(-100, { duration: 300 });
    opacity.value = withTiming(0, { duration: 300 }, () => {
      runOnJS(onDismiss)();
      progress.value = 0; // Reset for next time
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${(1 - progress.value) * 100}%`,
  }));

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.wrapper, 
        { top: insets.top + Space.sm }, 
        animatedStyle
      ]}
    >
      <View style={styles.pillContainer}>
        {/* Left: Icon Badge */}
        <View style={styles.iconCircle}>
          <Ticket size={20} color={Colors.brand} weight="fill" />
        </View>

        {/* Center: Content */}
        <View style={styles.content}>
          <Text style={styles.title}>Ticket Earned</Text>
          <Text style={styles.countText}>
            You have <Text style={styles.bold}>{tickets}</Text> total
          </Text>
        </View>

        {/* Right: Action */}
        {onViewCollection && (
          <Pressable 
            onPress={onViewCollection}
            style={({ pressed }) => [
              styles.viewBtn,
              { opacity: pressed ? 0.6 : 1 }
            ]}
          >
            <Text style={styles.viewBtnText}>View</Text>
          </Pressable>
        )}

        {/* Tactile Progress Indicator (Hidden at bottom edge) */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10000,
    paddingHorizontal: Space.xl,
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingVertical: Space.sm,
    paddingLeft: Space.sm,
    paddingRight: Space.lg,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.level3,
    minWidth: 240,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.badgeAlt, // Soft sky blue from your palette
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginLeft: Space.md,
    marginRight: Space.lg,
  },
  title: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightBold,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  countText: {
    fontSize: Type.sizeCaption,
    color: Colors.textSecondary,
    fontWeight: Type.weightMedium,
  },
  bold: {
    color: Colors.brand,
    fontWeight: Type.weight700,
  },
  viewBtn: {
    paddingHorizontal: Space.md,
    paddingVertical: Space.xs,
    borderLeftWidth: 1,
    borderLeftColor: Colors.borderSubtle,
  },
  viewBtnText: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightBold,
    color: Colors.brand,
    marginLeft: Space.sm,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: Radius.pill, // Keep inside rounded corners
    right: Radius.pill,
    height: 2,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.brand,
    opacity: 0.3, // Subtle indicator
    borderRadius: 1,
  },
});