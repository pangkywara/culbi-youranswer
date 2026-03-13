// ─────────────────────────────────────────────────────────────────────────────
// POIDetailSheet — Clean Inset Image Version
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState, memo, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
  Platform,
  TouchableOpacity,
  Text,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Image } from 'expo-image';

import { PlaceLandmark } from '@/types';
import { useLandmarkDetail } from '@/hooks/useLandmarkDetail';
import { buildPhotoUrl } from '@/lib/places';

// ── Destination components — do not modify these imports ──────────────────────
import TitleSection from '@/components/Destinations/Structure/Section/TitleSection';
import PlaceSection from '@/components/Destinations/Structure/Section/PlaceSection';
import StickyFooter from '@/components/Destinations/Structure/HeaderFooter/StickyFooter';
import { POIDetailSkeleton } from '@/components/Maps/POI/Skeleton/POIDetailSkeleton';
import { useSkeletonShimmer } from '@/components/Destinations/Skeleton/useSkeletonShimmer';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/style';

// ─── Config ──────────────────────────────────────────────────────────────────

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const SHEET_HEIGHT  = Math.round(SCREEN_HEIGHT * 0.60);
const PHOTO_HEIGHT  = 220; // Slightly adjusted for the inset look
const DURATION      = 300;
const EASING_OUT    = Easing.out(Easing.cubic);
const EASING_LINEAR = Easing.linear;

// ─── Main component ───────────────────────────────────────────────────────────

interface POIDetailSheetProps {
  isVisible: boolean;
  landmark:  PlaceLandmark | null;
  onClose:   () => void;
  /** When set, sheet is in "picker" mode — shows Add to Itinerary button */
  tripId?:      string;
  onAddToTrip?: (landmark: PlaceLandmark) => void;
}

export const POIDetailSheet = memo(function POIDetailSheet({
  isVisible,
  landmark,
  onClose,
  tripId,
  onAddToTrip,
}: POIDetailSheetProps) {
  const translateY      = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const [isMounted, setIsMounted] = useState(false);
  const [added, setAdded] = useState(false);

  // ── Fetch enriched data ───────────────────────────────────────────────────
  const { isLoading, landmark: dbLandmark, detail } = useLandmarkDetail(
    landmark?.id ?? ''
  );

  // ── Skeleton shimmer ─────────────────────────────────────────────────────
  const shimmerX = useSkeletonShimmer();

  // ── Infinite-loading guard ────────────────────────────────────────────────
  // If Google Places or Supabase takes longer than 5 s, give up and render
  // whatever data we already have from the map marker (always non-null).
  const [timedOut, setTimedOut] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isLoading) {
      setTimedOut(false);
      timeoutRef.current = setTimeout(() => setTimedOut(true), 5000);
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [isLoading]);

  // Show skeleton only during the initial load window. Once loading resolves
  // (or times out) always show real content — landmark prop data is an
  // immediate fallback so content is never blank.
  const showSkeleton = isLoading && !timedOut;

  // ── Animation lifecycle ───────────────────────────────────────────────────
  useEffect(() => {
    if (isVisible) {
      setIsMounted(true);
      setAdded(false); // reset Add state each open
      backdropOpacity.value = withTiming(1, { duration: DURATION });
      translateY.value      = withTiming(0, { duration: DURATION, easing: EASING_OUT });
    } else {
      backdropOpacity.value = withTiming(0, { duration: DURATION });
      translateY.value      = withTiming(
        SHEET_HEIGHT,
        { duration: DURATION, easing: EASING_OUT },
        (finished) => { if (finished) runOnJS(setIsMounted)(false); }
      );
    }
  }, [isVisible]);

  // ── Swipe-down-to-dismiss gesture ─────────────────────────────────────────
  const panGesture = useMemo(() =>
    Gesture.Pan()
      .onUpdate((e) => {
        if (e.translationY > 0) translateY.value = e.translationY;
      })
      .onEnd((e) => {
        if (e.translationY > 110 || e.velocityY > 600) {
          translateY.value = withTiming(
            SHEET_HEIGHT,
            { duration: 220, easing: EASING_LINEAR },
            () => runOnJS(onClose)()
          );
        } else {
          translateY.value = withTiming(0, { duration: 260, easing: EASING_OUT });
        }
      }),
  [onClose]);

  const sheetStyle    = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  if (!isMounted || !landmark) return null;

  // ── Resolve photo URLs ────────────────────────────────────────────────────
  const heroBannerUrl =
    detail?.photos?.[0]
      ? buildPhotoUrl(detail.photos[0].photoReference, { maxWidth: 800 })
      : landmark.heroPhoto
        ? buildPhotoUrl(landmark.heroPhoto.photoReference, { maxWidth: 800 })
        : null;

  const avatarUrl = landmark.heroPhoto
    ? buildPhotoUrl(landmark.heroPhoto.photoReference, { maxWidth: 200 })
    : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <Animated.View
        style={[styles.backdrop, backdropStyle]}
        pointerEvents={isVisible ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.sheet, sheetStyle]}>
        {/* ── Drag handle ── */}
        <GestureDetector gesture={panGesture}>
          <View style={styles.dragZone}>
            <View style={styles.handle} />
          </View>
        </GestureDetector>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Inset Hero photo banner ── */}
          <View style={styles.photoWrapper}>
            {heroBannerUrl ? (
              <Image
                source={{ uri: heroBannerUrl }}
                style={styles.photo}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={[styles.photo, styles.photoFallback]} />
            )}
          </View>

          <View style={styles.card}>
            {showSkeleton ? (
              <POIDetailSkeleton shimmerX={shimmerX} />
            ) : (
              <TitleSection
                name={detail?.name ?? landmark.name}
                vicinity={detail?.formattedAddress ?? landmark.snippet}
                rating={detail?.rating ?? landmark.rating}
                reviewCount={detail?.userRatingsTotal ?? landmark.userRatingsTotal}
                category={dbLandmark?.category}
                region={dbLandmark?.region}
              />
            )}
          </View>
        </ScrollView>

        <StickyFooter
          rating={detail?.rating ?? landmark.rating}
          reviewCount={detail?.userRatingsTotal ?? landmark.userRatingsTotal}
          googleMapsUrl={detail?.googleMapsUrl}
          placeName={detail?.name ?? landmark.name}
          coords={detail?.coords ?? landmark.coords}
        />

        {/* Picker-mode footer: Add to Itinerary */}
        {tripId && onAddToTrip && (
          <View style={styles.pickerFooter}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                if (added) return;
                setAdded(true);
                onAddToTrip(landmark);
              }}
            >
              <LinearGradient
                colors={added ? [Colors.brand, Colors.brand] : [Colors.brand, Colors.brandSoft]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.addBtn, added && styles.addBtnDone]}
              >
                <Text style={styles.addBtnText}>
                  {added ? 'Added ✓' : 'Add to Itinerary'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.30)',
  },

  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28, // Softer rounding
    borderTopRightRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.10, shadowRadius: 20 },
      android: { elevation: 24 },
    }),
  },

  dragZone: {
    paddingTop: 12,
    paddingBottom: 12,
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: '#ffffff',
  },

  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#E0E0E0',
  },

  // ── Photo Container ──
  photoWrapper: {
    paddingHorizontal: 20, // Inset from edges
    marginTop: 8,          // Gap from drag handle
    marginBottom: 16,      // Gap before card content
  },

  photo: {
    width: '100%',
    height: PHOTO_HEIGHT,
    borderRadius: 16,      // Clean rounded corners
  },

  photoFallback: {
    backgroundColor: '#F5F5F5',
    borderRadius: 18,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 100, 
  },

  card: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    minHeight: SHEET_HEIGHT - PHOTO_HEIGHT,
  },

  // ── Picker mode footer ──────────────────────────────────────────────────
  pickerFooter: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    paddingTop: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
  },
  addBtn: {
    backgroundColor: '#111111',
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
  },
  addBtnDone: {
    backgroundColor: '#1A7A4A',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

});