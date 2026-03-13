/**
 * Explorer Picker Screen
 *
 * Full-screen explore map launched when the user taps "Add a stop" inside a
 * trip. Receives `tripId` as a route param and renders `ExploreScreen` in
 * "picker mode" — POIDetailSheet shows an "Add to Itinerary" button instead
 * of the normal navigation footer.
 *
 * Route: /explorer/picker?tripId=<id>
 */
import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'react-native-phosphor';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ExploreScreen from '@/components/Explore/ExploreScreen';
import { useTrips } from '@/context/TripContext';
import { buildPhotoUrl } from '@/lib/places';
import type { PlaceLandmark } from '@/types';

export default function ExplorerPickerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { addStop } = useTrips();

  // Called by POIDetailSheet when the user taps "Add to Itinerary"
  const handleAddToTrip = useCallback(
    (landmark: PlaceLandmark) => {
      if (!tripId) return;

      // Map PlaceLandmark → TripStop shape
      const thumbnailUrl =
        landmark.heroPhoto
          ? buildPhotoUrl(landmark.heroPhoto.photoReference, { maxWidth: 400 })
          : 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&q=70';

      addStop(tripId, {
        landmark: {
          name: landmark.name,
          thumbnail_url: thumbnailUrl ?? '',
          rarity_weight: 0.5,
          latitude: landmark.coords.latitude,
          longitude: landmark.coords.longitude,
          sign_count: 0,
        },
      });

      // Navigate straight back to the trip detail screen
      router.back();
    },
    [tripId, addStop, router],
  );

  const handleClose = useCallback(() => router.back(), [router]);

  if (!tripId) {
    // Fallback — shouldn't happen, but avoids a blank screen
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No trip selected.</Text>
        <TouchableOpacity onPress={handleClose} style={styles.backBtn} hitSlop={12}>
          <ArrowLeft size={20} color="#000" />
          <Text style={styles.backText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Back button floated over the map */}
      <TouchableOpacity
        style={[styles.floatingBack, { top: insets.top + 12 }]}
        onPress={handleClose}
        hitSlop={12}
        activeOpacity={0.8}
      >
        <ArrowLeft size={18} color="#111" weight="bold" />
      </TouchableOpacity>

      <ExploreScreen
        tripId={tripId}
        onAddToTrip={handleAddToTrip}
        onClose={handleClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  floatingBack: {
    position: 'absolute',
    left: 16,
    zIndex: 999,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#888',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
