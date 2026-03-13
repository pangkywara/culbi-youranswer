/**
 * DraggableStopList
 *
 * Absolutely-positioned items driven by react-native-reanimated + gesture-handler.
 * Each item occupies a fixed ITEM_HEIGHT slot. A pan gesture on the drag handle
 * lets the user reorder stops. Non-active items animate (withSpring) into their
 * new slots as the dragged item crosses their midpoints.
 *
 * Architecture:
 *  - positions[i]  → current slot (0..n-1) assigned to item at index i
 *  - dragStartSlot → slot of the active item when the gesture started
 *  - gestureY      → raw .translationY (gesture-relative, NOT slot-relative)
 *  - Visual Y of active item  = dragStartSlot * ITEM_HEIGHT + gestureY
 *  - Visual Y of passive item = withSpring(positions[i] * ITEM_HEIGHT)
 */

import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import {
  DotsSixVertical,
  Trash,
  ArrowUp,
  ArrowDown,
} from 'react-native-phosphor';
import { Colors, Type, Space, Radius, Shadows } from '@/constants/style';
import { getRarity, type TripStop } from './TripStopRow';
import type { RarityLevel } from './TripStopRow';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Height of one slot including bottom margin — must match stop card render height. */
export const ITEM_HEIGHT = 96;

const RARITY_COLORS: Record<RarityLevel, { bg: string; text: string }> = {
  Common:   { bg: '#F2F2F2', text: Colors.textTertiary },
  Uncommon: { bg: '#EAFAF1', text: '#27AE60' },
  Rare:     { bg: '#E8EFFE', text: Colors.brand },
  Epic:     { bg: '#FFF6E0', text: '#E6A817' },
};

// ─── Worklet helpers ──────────────────────────────────────────────────────────

function clampW(v: number, lo: number, hi: number): number {
  'worklet';
  return Math.min(Math.max(v, lo), hi);
}

// ─── Single draggable row ─────────────────────────────────────────────────────

interface DraggableRowProps {
  index: number;
  stop: TripStop;
  isLast: boolean;
  isEditing: boolean;
  positions: ReturnType<typeof useSharedValue<number[]>>;
  activeIndex: ReturnType<typeof useSharedValue<number>>;
  dragStartSlot: ReturnType<typeof useSharedValue<number>>;
  gestureY: ReturnType<typeof useSharedValue<number>>;
  count: number;
  onReorder: (fromIndex: number, newSlot: number) => void;
  onRemove: (stopOrder: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

function DraggableRow({
  index,
  stop,
  isLast,
  isEditing,
  positions,
  activeIndex,
  dragStartSlot,
  gestureY,
  count,
  onReorder,
  onRemove,
  onMoveUp,
  onMoveDown,
}: DraggableRowProps) {
  const rarity = getRarity(stop.landmark.rarity_weight);
  const rarityStyle = RARITY_COLORS[rarity];

  // ── Animated position ─────────────────────────────────────────────────────
  const animatedStyle = useAnimatedStyle(() => {
    const isActive = activeIndex.value === index;
    const top = isActive
      ? dragStartSlot.value * ITEM_HEIGHT + gestureY.value
      : withSpring(positions.value[index] * ITEM_HEIGHT, {
          damping: 20,
          stiffness: 300,
        });
    return {
      top,
      zIndex: isActive ? 100 : 1,
      transform: [
        { scale: withSpring(isActive ? 1.02 : 1, { damping: 15, stiffness: 400 }) },
      ],
      opacity: withTiming(1, { duration: 150 }),
    };
  });

  const shadowStyle = useAnimatedStyle(() => ({
    shadowOpacity: withSpring(activeIndex.value === index ? 0.18 : 0.04),
  }));

  // ── Pan gesture on drag handle ────────────────────────────────────────────
  const panGesture = Gesture.Pan()
    .activateAfterLongPress(120)
    .onStart(() => {
      activeIndex.value = index;
      dragStartSlot.value = positions.value[index];
      gestureY.value = 0;
    })
    .onUpdate((e) => {
      gestureY.value = e.translationY;

      // Compute desired new slot
      const newSlot = clampW(
        Math.round(
          (dragStartSlot.value * ITEM_HEIGHT + e.translationY) / ITEM_HEIGHT,
        ),
        0,
        count - 1,
      );

      const currentActiveSlot = positions.value[activeIndex.value];
      if (newSlot !== currentActiveSlot) {
        const other = positions.value.findIndex((p) => p === newSlot);
        if (other !== -1) {
          const next = [...positions.value];
          next[activeIndex.value] = newSlot;
          next[other] = currentActiveSlot;
          positions.value = next;
        }
      }
    })
    .onEnd(() => {
      const finalSlot = positions.value[index];
      gestureY.value = withSpring(0, { damping: 30, stiffness: 400 });
      activeIndex.value = -1;
      runOnJS(onReorder)(index, finalSlot);
    });

  return (
    <Animated.View style={[styles.rowWrapper, animatedStyle, shadowStyle]}>
      <View style={styles.rowInner}>
        {/* Timeline bubble */}
        <View style={styles.timelineCol}>
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{stop.stop_order}</Text>
          </View>
          {!isLast && <View style={styles.line} />}
        </View>

        {/* Card */}
        <View style={[styles.card, isLast && styles.cardLast]}>
          <Image
            source={{ uri: stop.landmark.thumbnail_url }}
            style={styles.thumb}
            contentFit="cover"
            transition={200}
          />

          <View style={styles.info}>
            <Text style={styles.landmarkName} numberOfLines={2}>
              {stop.landmark.name}
            </Text>
            <View style={styles.badges}>
              <View style={[styles.badge, { backgroundColor: rarityStyle.bg }]}>
                <Text style={[styles.badgeText, { color: rarityStyle.text }]}>
                  {rarity}
                </Text>
              </View>
              {stop.landmark.sign_count > 0 && (
                <View style={styles.signBadge}>
                  <Text style={styles.signText}>
                    ✍️ {stop.landmark.sign_count}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Edit-mode controls */}
          {isEditing && (
            <View style={styles.editControls}>
              {/* Up / Down quick-move */}
              <TouchableOpacity
                onPress={() => onMoveUp(index)}
                disabled={index === 0}
                style={styles.arrowBtn}
                hitSlop={8}
              >
                <ArrowUp
                  size={14}
                  color={index === 0 ? Colors.textDisabled : Colors.textPrimary}
                  weight="bold"
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onMoveDown(index)}
                disabled={index === count - 1}
                style={styles.arrowBtn}
                hitSlop={8}
              >
                <ArrowDown
                  size={14}
                  color={
                    index === count - 1
                      ? Colors.textDisabled
                      : Colors.textPrimary
                  }
                  weight="bold"
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onRemove(stop.stop_order)}
                style={styles.deleteBtn}
                hitSlop={8}
              >
                <Trash size={14} color={Colors.destructive} weight="bold" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Drag handle — only in edit mode */}
        {isEditing && (
          <GestureDetector gesture={panGesture}>
            <Animated.View style={styles.dragHandle}>
              <DotsSixVertical
                size={18}
                color={Colors.textTertiary}
                weight="bold"
              />
            </Animated.View>
          </GestureDetector>
        )}
      </View>
    </Animated.View>
  );
}

// ─── List ─────────────────────────────────────────────────────────────────────

interface DraggableStopListProps {
  stops: TripStop[];
  isEditing: boolean;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (stopOrder: number) => void;
}

export function DraggableStopList({
  stops,
  isEditing,
  onReorder,
  onRemove,
}: DraggableStopListProps) {
  // Shared values must not change on re-render
  const count = stops.length;

  const positions = useSharedValue<number[]>(stops.map((_, i) => i));
  const activeIndex = useSharedValue(-1);
  const dragStartSlot = useSharedValue(0);
  const gestureY = useSharedValue(0);

  // Sync positions when stops change externally (add/remove)
  React.useEffect(() => {
    positions.value = stops.map((_, i) => i);
  }, [stops.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      onReorder(index, index - 1);
    },
    [onReorder],
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index === count - 1) return;
      onReorder(index, index + 1);
    },
    [onReorder, count],
  );

  return (
    <View style={{ height: count * ITEM_HEIGHT }}>
      {stops.map((stop, index) => (
        <DraggableRow
          key={`stop-${stop.stop_order}-${stop.landmark.name}`}
          index={index}
          stop={stop}
          isLast={index === count - 1}
          isEditing={isEditing}
          positions={positions}
          activeIndex={activeIndex}
          dragStartSlot={dragStartSlot}
          gestureY={gestureY}
          count={count}
          onReorder={onReorder}
          onRemove={onRemove}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
        />
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const BUBBLE_SIZE = 28;

const styles = StyleSheet.create({
  rowWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    // iOS shadow lifted when active (controlled by animated shadowOpacity)
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },

  // Timeline
  timelineCol: {
    alignItems: 'center',
    width: BUBBLE_SIZE,
    marginTop: 2,
  },
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: Colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleText: {
    fontSize: Type.sizeSmall,
    fontWeight: Type.weightBold,
    color: Colors.white,
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 20,
    backgroundColor: Colors.border,
    marginVertical: 3,
  },

  // Card
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: Space.sm,
    marginLeft: Space.md,
    marginBottom: Space.sm,
    gap: Space.sm,
    ...Shadows.level1,
  },
  cardLast: {
    marginBottom: 0,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceMuted,
    flexShrink: 0,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  landmarkName: {
    fontSize: Type.sizeCaption,
    fontWeight: Type.weight700,
    color: Colors.textPrimary,
    letterSpacing: -0.1,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: Type.weightSemibold,
  },
  signBadge: {
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  signText: {
    fontSize: 9,
    color: Colors.textSecondary,
  },

  // Edit controls
  editControls: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginLeft: 2,
  },
  arrowBtn: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.xs,
    backgroundColor: Colors.surfaceMuted,
  },
  deleteBtn: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.xs,
    backgroundColor: '#FFF0F0',
    marginTop: 2,
  },

  // Drag handle
  dragHandle: {
    width: 28,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    paddingLeft: 4,
  },
});
