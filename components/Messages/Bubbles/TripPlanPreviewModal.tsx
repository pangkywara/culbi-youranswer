import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, SafeAreaView, Platform, StyleSheet } from 'react-native';
import { X, CheckCircle, Sparkle } from 'react-native-phosphor';
import { useRouter } from 'expo-router';
import { useTrips } from '@/context/TripContext';
import { buildPhotoUrl, searchPlaceByName } from '@/lib/places';
import { DetailTimeline } from '@/components/PlanTrips/Inside/DetailTimeline';
import { Colors, Type, Space, Radius, S } from '@/constants/style';
import type { TripItinerary } from '@/hooks/useGeminiChat';
import type { TripStop } from '@/components/PastTrips/TripStopRow';

interface Props {
  isVisible: boolean;
  itinerary: TripItinerary;
  onClose: () => void;
  existingTripId?: string; // When editing an existing trip
}

export const TripPlanPreviewModal = ({ isVisible, itinerary, onClose, existingTripId }: Props) => {
  const [saved, setSaved] = useState(false);
  const { addTripAsync, addStopsBulk, updateTripStopsAsync, updateTrip } = useTrips();
  const router = useRouter();

  const totalStops = useMemo(() => itinerary.days.reduce((sum, d) => sum + d.stops.length, 0), [itinerary]);

  // Synthesise ISO dates for each day. Uses parsed heading dates when available,
  // falling back to today+N so scheduled_date / start_date always have a value.
  const computedDayDates = useMemo((): Map<number, string> => {
    const map = new Map<number, string>();
    for (const day of itinerary.days) {
      if (day.date) map.set(day.dayNumber, day.date);
    }
    const firstEntry = [...map.entries()].sort((a, b) => a[0] - b[0])[0];
    let baseDate: Date;
    if (firstEntry) {
      const [y, mo, d] = firstEntry[1].split('-').map(Number);
      baseDate = new Date(Date.UTC(y, mo - 1, d));
      baseDate.setUTCDate(baseDate.getUTCDate() - (firstEntry[0] - 1));
    } else {
      const t = new Date();
      baseDate = new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()));
    }
    for (const day of itinerary.days) {
      if (!map.has(day.dayNumber)) {
        const d = new Date(baseDate);
        d.setUTCDate(d.getUTCDate() + (day.dayNumber - 1));
        map.set(day.dayNumber, d.toISOString().split('T')[0]);
      }
    }
    return map;
  }, [itinerary]);

  // Build baseline timeline stops from already-enriched photo_references.
  // Stops that are not in the landmark DB will have an empty thumbnail_url here;
  // the enrichment effect below fills them in via Places Text Search.
  const baselineStops = useMemo((): TripStop[] => {
    let order = 0;
    return itinerary.days.flatMap(day => day.stops.map(stop => ({
      stop_order: order++,
      date: computedDayDates.get(day.dayNumber),
      isSuggestion: false,
      landmark_id: stop.landmark_id,
      landmark: {
        name: stop.name,
        thumbnail_url: stop.photo_reference ? buildPhotoUrl(stop.photo_reference, { maxWidth: 400 }) : '',
        rarity_weight: 0.5,
        latitude: stop.latitude ?? 0,
        longitude: stop.longitude ?? 0,
        sign_count: 0,
        description: stop.description,
      },
    })));
  }, [itinerary]);

  // displayStops is what gets rendered — baseline initially, replaced with
  // fully-enriched stops once the Places API lookups complete.
  const [displayStops, setDisplayStops] = useState<TripStop[]>(baselineStops);

  // Single effect: reset to baseline whenever itinerary/visibility changes,
  // then immediately kick off image enrichment when the modal is open.
  useEffect(() => {
    setDisplayStops(baselineStops);
    if (!isVisible) return;

    const regionHint = itinerary.tripName.split('·')[0].trim();
    let cancelled = false;

    Promise.all(
      baselineStops.map(async (stop) => {
        if (stop.landmark.thumbnail_url) return stop;
        const hit = await searchPlaceByName(stop.landmark.name, regionHint);
        if (!hit?.photoReference) return stop;
        return {
          ...stop,
          landmark: {
            ...stop.landmark,
            thumbnail_url: buildPhotoUrl(hit.photoReference, { maxWidth: 400 }),
          },
        };
      })
    ).then(enriched => { if (!cancelled) setDisplayStops(enriched); });

    return () => { cancelled = true; };
  }, [isVisible, baselineStops]);

  const handleSaveTrip = useCallback(async () => {
    try {
      const firstDate = computedDayDates.get(itinerary.days[0]?.dayNumber);
      const lastDate = computedDayDates.get(itinerary.days[itinerary.days.length - 1]?.dayNumber);
      const regionHint = itinerary.tripName.split('·')[0].trim();

      // EDITING MODE: Update existing trip
      if (existingTripId) {
        const enrichedStops = await Promise.all(
          itinerary.days.flatMap(day => day.stops.map(async stop => {
            let photoRef = stop.photo_reference ?? '';
            let lat = stop.latitude ?? 0;
            let lng = stop.longitude ?? 0;

            if (!photoRef || (lat === 0 && lng === 0)) {
              const hit = await searchPlaceByName(stop.name, regionHint);
              if (hit) {
                if (!photoRef && hit.photoReference) photoRef = hit.photoReference;
                if (lat === 0 && lng === 0 && hit.latitude) { lat = hit.latitude; lng = hit.longitude; }
              }
            }

            return {
              landmark_id: stop.landmark_id,
              date: computedDayDates.get(day.dayNumber),
              isSuggestion: false,
              landmark: {
                name: stop.name,
                thumbnail_url: photoRef ? buildPhotoUrl(photoRef, { maxWidth: 400 }) : '',
                rarity_weight: 0.5,
                latitude: lat,
                longitude: lng,
                sign_count: 0,
                description: stop.description,
              },
            };
          }))
        );

        // Update trip metadata
        updateTrip(existingTripId, {
          trip_name: itinerary.tripName,
          date_range: itinerary.duration,
        });

        // Replace all stops
        await updateTripStopsAsync(existingTripId, enrichedStops);
        setSaved(true);
        onClose();
        setTimeout(() => router.navigate(`/(tabs)/trips/${existingTripId}`), 350);
        return;
      }

      // CREATE NEW TRIP MODE
      const enrichedStops = await Promise.all(
        itinerary.days.flatMap(day => day.stops.map(async stop => {
          let photoRef = stop.photo_reference ?? '';
          let lat = stop.latitude ?? 0;
          let lng = stop.longitude ?? 0;

          if (!photoRef || (lat === 0 && lng === 0)) {
            const hit = await searchPlaceByName(stop.name, regionHint);
            if (hit) {
              if (!photoRef && hit.photoReference) photoRef = hit.photoReference;
              if (lat === 0 && lng === 0 && hit.latitude) { lat = hit.latitude; lng = hit.longitude; }
            }
          }

          return {
            landmark_id: stop.landmark_id,
            date: computedDayDates.get(day.dayNumber),
            isSuggestion: false,
            landmark: {
              name: stop.name,
              thumbnail_url: photoRef ? buildPhotoUrl(photoRef, { maxWidth: 400 }) : '',
              rarity_weight: 0.5,
              latitude: lat,
              longitude: lng,
              sign_count: 0,
              description: stop.description,
            },
          };
        }))
      );

      const tripId = await addTripAsync({
        trip_name: itinerary.tripName,
        date_range: itinerary.duration,
        start_date: firstDate,
        end_date: lastDate,
        status: 'planned',
        stops: [],
        description: `AI-generated itinerary by Culbi`,
      });

      await addStopsBulk(tripId, enrichedStops);
      setSaved(true);
      onClose();
      setTimeout(() => router.navigate('/(tabs)/trips'), 350);
    } catch (e) {
      console.error('[PreviewModal] save failed:', e);
    }
  }, [itinerary, existingTripId, addTripAsync, addStopsBulk, updateTripStopsAsync, updateTrip, onClose, router, computedDayDates]);

  return (
    <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={S.screen}>
        {/* Clean Header: No bottom border, more breathing room */}
        <View style={m.nav}>
          <View style={m.navLeft}>
            <View style={m.navBadge}>
              <Sparkle size={10} color={Colors.brand} weight="fill" />
              <Text style={m.navBadgeText}>CULBI PLAN</Text>
            </View>
            <Text style={m.navTitle} numberOfLines={1}>{itinerary.tripName}</Text>
            <Text style={m.navSub}>{itinerary.duration} · {totalStops} stops</Text>
          </View>
          
          <TouchableOpacity onPress={onClose} style={m.closeBtn}>
            <X size={20} color={Colors.textPrimary} weight="bold" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={S.fill} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: Space.md }}
        >
          <DetailTimeline stops={displayStops} regionHint={itinerary.tripName.split('·')[0].trim()} />
          <View style={{ height: 140 }} />
        </ScrollView>

        {/* Floating Save Button */}
        <View style={m.footer}>
          <TouchableOpacity
            style={[S.btnPrimary, saved && m.saveBtnDone]}
            onPress={handleSaveTrip}
            disabled={saved}
            activeOpacity={0.8}
          >
            {saved ? (
              <View style={S.row}>
                <CheckCircle size={20} color={Colors.white} weight="fill" />
                <Text style={S.btnPrimaryText}>Saved to Trips</Text>
              </View>
            ) : (
              <Text style={S.btnPrimaryText}>{existingTripId ? 'Apply Changes to Trip' : 'Save as my trip'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const m = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space.xxl,
    paddingTop: Space.xl,
    paddingBottom: Space.lg,
    backgroundColor: Colors.white,
  },
  navLeft: { flex: 1, gap: 2 },
  navBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.badgeAlt,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
  },
  navBadgeText: { 
    fontSize: 9, 
    fontWeight: Type.weightBold, 
    color: Colors.brand, 
    letterSpacing: 0.5 
  },
  navTitle: { 
    fontSize: 22, 
    fontWeight: Type.weightBold, 
    color: Colors.textPrimary,
    letterSpacing: -0.5 
  },
  navSub: { 
    fontSize: Type.sizeBodySm, 
    color: Colors.textSecondary,
    fontWeight: Type.weightMedium 
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Space.md,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Space.xxl,
    paddingTop: Space.lg,
    paddingBottom: Platform.OS === 'ios' ? 44 : Space.xxl,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  saveBtnDone: { backgroundColor: '#2ECC71' },
});