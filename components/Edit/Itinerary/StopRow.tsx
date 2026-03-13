import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { MinusCircle, DotsSixVertical, CalendarBlank } from 'react-native-phosphor';
import { Colors, Type, Space, Radius } from '@/constants/style';
import type { TripStop } from '@/components/PastTrips/TripStopRow';

function formatDateChip(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

interface StopRowProps {
  stop: TripStop;
  isActive: boolean;
  onRemove: () => void;
  onDatePress: () => void;
  drag: () => void;
}

export const StopRow = ({ stop, isActive, onRemove, onDatePress, drag }: StopRowProps) => (
  // FIX 1: Use View instead of TouchableOpacity as the root.
  // TouchableOpacity was consuming touch-end events that DraggableFlatList
  // needs to resolve the drop gesture, causing list collapse.
  <View style={[s.row, isActive && s.rowActive]}>

    {/* Delete Action */}
    <TouchableOpacity onPress={onRemove} style={s.icon} hitSlop={10}>
      <MinusCircle size={24} color={Colors.destructive} weight="fill" />
    </TouchableOpacity>

    {/* Thumbnail */}
    <Image
      source={{ uri: stop.landmark.thumbnail_url }}
      style={s.thumb}
      contentFit="cover"
      transition={200}
    />

    {/* Info Column */}
    <View style={s.info}>
      <Text style={s.name} numberOfLines={1}>{stop.landmark.name}</Text>

      <TouchableOpacity
        style={[s.pill, stop.date && s.pillSet]}
        onPress={onDatePress}
        hitSlop={8}
        activeOpacity={0.7}
      >
        <CalendarBlank
          size={12}
          color={stop.date ? Colors.textSecondary : Colors.textTertiary}
          weight={stop.date ? "bold" : "regular"}
        />
        <Text style={[s.pillText, stop.date && s.pillTextSet]}>
          {stop.date ? formatDateChip(stop.date) : 'Assign date'}
        </Text>
      </TouchableOpacity>
    </View>

    {/* FIX 2: Drag handle is the ONLY drag trigger — remove onLongPress from
        the root entirely. This eliminates the double-fire that caused flickering. 
        onPressIn fires immediately on touch, giving a snappy drag feel. */}
    <TouchableOpacity
      onPressIn={drag}
      style={s.dragHandle}
      hitSlop={20}
    >
      <DotsSixVertical size={22} color={Colors.textTertiary} weight="bold" />
    </TouchableOpacity>
  </View>
);

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Space.xl,
    paddingVertical: Space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
  },
  rowActive: {
    backgroundColor: Colors.surfaceSoft,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 10,
    zIndex: 100,
    // FIX 3: Removed transform scale(1.02). DraggableFlatList measures the
    // item's layout to calculate drop positions — a scale transform throws
    // off those measurements, causing the "snaps to wrong position" bug.
  },
  icon: {
    marginRight: Space.md
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    marginRight: Space.lg,
    backgroundColor: Colors.surfaceMuted,
  },
  info: {
    flex: 1,
    gap: 4
  },
  name: {
    fontSize: Type.sizeTitle,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  pillSet: {
    borderColor: Colors.textSecondary,
    backgroundColor: Colors.white,
  },
  pillText: {
    fontSize: Type.sizeSmall,
    fontWeight: Type.weightMedium,
    color: Colors.textSecondary
  },
  pillTextSet: {
    color: Colors.textSecondary,
    fontWeight: Type.weightBold
  },
  dragHandle: {
    padding: Space.sm,
    marginLeft: Space.sm
  },
});