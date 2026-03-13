/**
 * components/Maps/POI/POIDetail/POIDetailSheet.tsx
 *
 * Parent container: animation, data-fetching, skeleton guard.
 * Children: PhotoBanner, PickerFooter (extracted leaf components).
 */

import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { GestureDetector, Gesture } from "react-native-gesture-handler";

import { PlaceLandmark } from "@/types";
import { useLandmarkDetail } from "@/hooks/useLandmarkDetail";
import { buildPhotoUrl } from "@/lib/places";

import TitleSection from "@/components/Destinations/Structure/Section/TitleSection";
import StickyFooter from "@/components/Destinations/Structure/HeaderFooter/StickyFooter";
import { POIDetailSkeleton } from "@/components/Maps/POI/Skeleton/POIDetailSkeleton";
import { useSkeletonShimmer } from "@/components/Destinations/Skeleton/useSkeletonShimmer";

import { PhotoBanner } from "./PhotoBanner";
import { PickerFooter } from "./PickerFooter";
import {
  DURATION,
  EASING_LINEAR,
  EASING_OUT,
  SHEET_HEIGHT,
  styles,
} from "./styles";

export interface POIDetailSheetProps {
  isVisible: boolean;
  landmark: PlaceLandmark | null;
  onClose: () => void;
  /** When set, sheet is in "picker" mode — shows Add to Itinerary button */
  tripId?: string;
  onAddToTrip?: (landmark: PlaceLandmark) => void;
}

export const POIDetailSheet = memo(function POIDetailSheet({
  isVisible,
  landmark,
  onClose,
  tripId,
  onAddToTrip,
}: POIDetailSheetProps) {
  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const [isMounted, setIsMounted] = useState(false);
  const [added, setAdded] = useState(false);

  // ── Fetch enriched data ───────────────────────────────────────────────────
  const { isLoading, landmark: dbLandmark, detail } = useLandmarkDetail(
    landmark?.id ?? "",
  );

  // ── Skeleton shimmer ─────────────────────────────────────────────────────
  const shimmerX = useSkeletonShimmer();

  // ── Infinite-loading guard ────────────────────────────────────────────────
  const [timedOut, setTimedOut] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isLoading) {
      setTimedOut(false);
      timeoutRef.current = setTimeout(() => setTimedOut(true), 5000);
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isLoading]);

  const showSkeleton = isLoading && !timedOut;

  // ── Animation lifecycle ───────────────────────────────────────────────────
  useEffect(() => {
    if (isVisible) {
      setIsMounted(true);
      setAdded(false);
      backdropOpacity.value = withTiming(1, { duration: DURATION });
      translateY.value = withTiming(0, { duration: DURATION, easing: EASING_OUT });
    } else {
      backdropOpacity.value = withTiming(0, { duration: DURATION });
      translateY.value = withTiming(
        SHEET_HEIGHT,
        { duration: DURATION, easing: EASING_OUT },
        (finished) => {
          if (finished) runOnJS(setIsMounted)(false);
        },
      );
    }
  }, [isVisible]);

  // ── Swipe-down-to-dismiss gesture ─────────────────────────────────────────
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((e) => {
          if (e.translationY > 0) translateY.value = e.translationY;
        })
        .onEnd((e) => {
          if (e.translationY > 110 || e.velocityY > 600) {
            translateY.value = withTiming(
              SHEET_HEIGHT,
              { duration: 220, easing: EASING_LINEAR },
              () => runOnJS(onClose)(),
            );
          } else {
            translateY.value = withTiming(0, { duration: 260, easing: EASING_OUT });
          }
        }),
    [onClose],
  );

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!isMounted || !landmark) return null;

  // ── Resolve photo URLs ────────────────────────────────────────────────────
  const heroBannerUrl =
    detail?.photos?.[0]
      ? buildPhotoUrl(detail.photos[0].photoReference, { maxWidth: 800 })
      : landmark.heroPhoto
        ? buildPhotoUrl(landmark.heroPhoto.photoReference, { maxWidth: 800 })
        : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <Animated.View
        style={[styles.backdrop, backdropStyle]}
        pointerEvents={isVisible ? "auto" : "none"}
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
          <PhotoBanner heroBannerUrl={heroBannerUrl} />

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
          <PickerFooter
            added={added}
            onAdd={() => {
              if (added) return;
              setAdded(true);
              onAddToTrip(landmark);
            }}
          />
        )}
      </Animated.View>
    </View>
  );
});
