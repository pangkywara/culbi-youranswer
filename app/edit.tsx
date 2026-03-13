import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useTrips } from '@/context/TripContext';
import type { TripStop } from '@/components/PastTrips/TripStopRow';
import { EditNavbar } from '@/components/Edit/EditNavbar';
import { DateGroupHeader } from '@/components/Edit/Itinerary/DateGroupHeader';
import { StopRow } from '@/components/Edit/Itinerary/StopRow';
import { DatePickerSheet } from '@/components/Edit/Itinerary/DatePickerSheet';
import { Colors, Type, Space, Radius, S } from '@/constants/style';

// ─── Types ────────────────────────────────────────────────────────────────────

type DateHeaderItem = { type: 'header'; date: string; key: string };
type StopItem       = { type: 'stop';   stop: TripStop; key: string };
type ListItem       = DateHeaderItem | StopItem;

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatDateHeader(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EditItineraryScreen() {
  const router     = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { trips, removeStop, reorderStops, updateStopDate } = useTrips();

  const trip = trips.find((t) => t.id === tripId);
  const [editingStop, setEditingStop] = useState<TripStop | null>(null);

  const uniqueDates = useMemo(
    () =>
      trip
        ? [...new Set(trip.stops.map((s) => s.date).filter(Boolean) as string[])].sort()
        : [],
    [trip],
  );

  const listData = useMemo((): ListItem[] => {
    if (!trip) return [];
    const items: ListItem[] = [];

    const byDate = new Map<string, TripStop[]>();
    for (const stop of trip.stops) {
      const key = stop.date ?? '';
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(stop);
    }

    const sortedKeys = [...byDate.keys()].sort((a, b) => {
      if (!a) return 1;
      if (!b) return -1;
      return a.localeCompare(b);
    });

    for (const date of sortedKeys) {
      items.push({ type: 'header', date, key: `hdr-${date || 'undated'}` });
      for (const stop of byDate.get(date)!) {
        // FIX 1: Key by landmark id (or a stable unique id), NOT stop_order.
        // stop_order changes after reorder — React sees the same key on a
        // different row and skips re-rendering it, leaving the view stale.
        // Use landmark name + original stop_order as a stable composite key.
        // This ensures React correctly identifies each row across re-renders.
        items.push({ type: 'stop', stop, key: `stop-${stop.landmark.name}-${stop.stop_order}` });
      }
    }

    return items;
  }, [trip]);

  const handleDeleteDateGroup = useCallback(
    (date: string) => {
      if (!trip) return;
      const label = date ? formatDateHeader(date) : 'Unscheduled';
      Alert.alert(
        `Remove ${label}?`,
        'All stops on this day will be removed.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              trip.stops
                .filter((s) => (date ? s.date === date : !s.date))
                .reverse()
                .forEach((s) => removeStop(trip.id, s.stop_order));
            },
          },
        ],
      );
    },
    [trip, removeStop],
  );

  const handleAssignDate = useCallback(
    (date: string | undefined) => {
      if (editingStop && trip) updateStopDate(trip.id, editingStop.stop_order, date);
      setEditingStop(null);
    },
    [editingStop, trip, updateStopDate],
  );

  const handleDragEnd = useCallback(
    ({ data }: { data: ListItem[] }) => {
      if (!trip) return;

      // FIX 2: After drag, the flat data array has headers and stops interleaved
      // in their new visual order. We need to reassign each stop's date based on
      // whichever header most recently preceded it in the reordered list —
      // then pass the updated stops to reorderStops so context stays in sync.
      let currentDate: string | undefined;
      const reorderedStops: TripStop[] = [];

      for (const item of data) {
        if (item.type === 'header') {
          currentDate = item.date || undefined;
        } else {
          reorderedStops.push({ ...item.stop, date: currentDate });
        }
      }

      reorderStops(trip.id, reorderedStops);
    },
    [trip, reorderStops],
  );

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<ListItem>) => {
      if (item.type === 'header') {
        return (
          <DateGroupHeader
            label={item.date ? formatDateHeader(item.date) : 'Unscheduled'}
            onDelete={() => handleDeleteDateGroup(item.date)}
          />
        );
      }

      // FIX 3: Removed <ScaleDecorator>. ScaleDecorator applies its own scale
      // transform internally via Reanimated. Combined with the isActive styles
      // in StopRow (which also did a scale), the item was being scaled twice —
      // causing the ghost/flicker and the "item disappears" bug.
      // StopRow's rowActive style already handles the active visual state.
      return (
        <StopRow
          stop={item.stop}
          isActive={isActive}
          onRemove={() => removeStop(trip!.id, item.stop.stop_order)}
          onDatePress={() => setEditingStop(item.stop)}
          drag={drag}
        />
      );
    },
    [trip, removeStop, handleDeleteDateGroup],
  );

  if (!trip) return null;

  return (
    <GestureHandlerRootView style={S.fill}>
      <SafeAreaView style={S.screen}>
        <EditNavbar title="Edit itinerary" onClose={() => router.back()} />

        <DraggableFlatList
          data={listData}
          onDragEnd={handleDragEnd}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          activationDistance={10}
          containerStyle={S.fill}
          contentContainerStyle={{ paddingBottom: 100 }}
        />

        <View style={s.footer}>
          <TouchableOpacity
            style={S.btnPrimary}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={S.btnPrimaryText}>Save changes</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <DatePickerSheet
        visible={editingStop !== null}
        stopName={editingStop?.landmark.name ?? ''}
        currentDate={editingStop?.date}
        availableDates={uniqueDates}
        onSelect={handleAssignDate}
        onClose={() => setEditingStop(null)}
      />
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Space.xl,
    paddingTop: Space.lg,
    paddingBottom: Platform.OS === 'ios' ? Space.xxxl : Space.xl,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
});