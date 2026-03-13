import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent, Platform } from "react-native";
import { Image } from 'expo-image';
import { Star, Plus, CheckCircle } from "react-native-phosphor";
import { CulturalExperience } from "@/types";
import { Colors, Type, Space, Radius, Shadows } from "@/constants/style";
import AnimatedHeartButton from '@/components/AnimatedHeartButton';
import { buildPhotoUrl } from '@/lib/places';

interface SingleExperienceCardProps {
  experience: CulturalExperience;
  onPress: () => void;
  /** When set, card shows an "Add to trip" overlay button */
  tripId?: string;
  onAddToTrip?: (experience: CulturalExperience) => void;
}

export const SingleExperienceCard = React.memo(function SingleExperienceCard({
  experience,
  onPress,
  tripId,
  onAddToTrip,
}: SingleExperienceCardProps) {
  // Build CDN-ready URLs — buildPhotoUrl passes through full https:// URLs unchanged
  const rawPhotos = (experience.photos && experience.photos.length > 0)
    ? experience.photos
    : [experience.imageUrl].filter(Boolean) as string[];
  const photos = rawPhotos.map((ref) => buildPhotoUrl(ref, { maxWidth: 800 }));

  const [activeIndex, setActiveIndex] = useState(0);
  const [imgWidth, setImgWidth] = useState(0);
  // Picker-mode: track "added" state, reset when the experience changes
  const [added, setAdded] = useState(false);
  useEffect(() => { setAdded(false); }, [experience.id]);

  // Track raw touch positions to distinguish tap vs swipe
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);

  const handleLayout = useCallback((e: any) => {
    setImgWidth(e.nativeEvent.layout.width);
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (imgWidth <= 0) return;
    const xOffset = e.nativeEvent.contentOffset.x;
    const idx = Math.round(xOffset / imgWidth);
    if (idx !== activeIndex) {
      setActiveIndex(Math.max(0, Math.min(idx, photos.length - 1)));
    }
  }, [imgWidth, photos.length, activeIndex]);

  const hasRating = experience.bridgeRating > 0;

  return (
    <View style={styles.card}>
      {/* 1. IMAGE SECTION */}
      <View
        style={styles.imageWrapper}
        onLayout={handleLayout}
        onTouchStart={(e) => {
          touchStartX.current = e.nativeEvent.pageX;
          touchStartY.current = e.nativeEvent.pageY;
          isDragging.current = false;
        }}
        onTouchMove={(e) => {
          const dx = Math.abs(e.nativeEvent.pageX - touchStartX.current);
          const dy = Math.abs(e.nativeEvent.pageY - touchStartY.current);
          if (dx > 5 || dy > 5) isDragging.current = true;
        }}
        onTouchEnd={() => {
          if (!isDragging.current) onPress();
          isDragging.current = false;
        }}
      >
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          style={styles.carouselScroll}
          nestedScrollEnabled
          decelerationRate="fast"
          // Optimization for Android scroll performance
          removeClippedSubviews={Platform.OS === 'android'}
        >
          {photos.map((uri, i) => (
            <Image
              key={i}
              source={{ uri }}
              style={[
                styles.carouselImage, 
                // FIX: Base width is 100% so it never renders at 0px during snaps
                { width: imgWidth || '100%' } 
              ]}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            />
          ))}
        </ScrollView>

        {experience.bridgeRating >= 4.8 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Guest favorite</Text>
          </View>
        )}

        <AnimatedHeartButton
          placeId={experience.id}
          placeName={experience.title}
          size={18}
          showBg={false}
          style={styles.heartButton}
        />

        {photos.length > 1 && (
          <View style={styles.dotContainer}>
            {photos.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === activeIndex ? styles.dotActive : styles.dotInactive
                ]}
              />
            ))}
          </View>
        )}

        {/* Picker-mode: "Add to trip" pill button at bottom-right of image */}
        {tripId && onAddToTrip && (
          <TouchableOpacity
            style={[styles.addPill, added && styles.addPillDone]}
            onPress={() => {
              if (!added) {
                setAdded(true);
                onAddToTrip(experience);
              }
            }}
            activeOpacity={0.85}
          >
            {added
              ? <CheckCircle size={16} color="#FFF" weight="fill" />
              : <Plus size={16} color="#FFF" weight="bold" />
            }
            <Text style={styles.addPillText}>{added ? 'Added' : 'Add'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 2. TEXT CONTENT SECTION */}
      <Pressable style={styles.cardContent} onPress={onPress}>
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {experience.title}
          </Text>
          {hasRating && (
            <View style={styles.ratingInline}>
              <Star size={12} color="#000" weight="fill" />
              <Text style={styles.ratingValue}>
                {experience.bridgeRating % 1 === 0
                  ? experience.bridgeRating.toFixed(1)
                  : experience.bridgeRating.toFixed(2)}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.cardSubtitle}>{experience.distance}</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { width: "100%", marginBottom: 40, },
  imageWrapper: {
    width: "100%",
    aspectRatio: 1, // Reserves square space immediately
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: Colors.surfacePale,
    position: "relative",
    // Fixes Android sub-pixel rendering flashes
    backfaceVisibility: 'hidden',
    ...Platform.select({
      ios: { ...Shadows.level5 },
      android: { elevation: 4 }, // Elevation is heavy; 4 is a sweet spot for performance
    }),
  },
  carouselScroll: { flex: 1 },
  carouselImage: { 
    height: "100%",
    // Ensure image takes full container width by default
    width: '100%', 
  },
  heartButton: {
    position: "absolute",
    top: Space.md,
    right: Space.md,
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: Colors.imageOverlay,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  badge: {
    position: "absolute",
    top: Space.md,
    left: Space.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderRadius: Radius.full,
    zIndex: 5,
  },
  badgeText: {
    fontSize: Type.sizeSmall,
    fontWeight: Type.weightSemibold,
    color: "#000",
  },
  dotContainer: {
    position: 'absolute',
    bottom: 12,
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 6,
    zIndex: 10,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotInactive: { backgroundColor: 'rgba(255, 255, 255, 0.4)' },
  dotActive: { backgroundColor: '#fff', transform: [{ scale: 1.2 }] },
  cardContent: { marginTop: Space.md },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: Type.sizeBody,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: Space.sm,
  },
  cardSubtitle: {
    fontSize: Type.sizeBodySm,
    color: Colors.textSecondary,
    marginTop: Space.xxs,
  },
  ratingInline: { flexDirection: "row", alignItems: "center", gap: 2 },
  ratingValue: {
    fontSize: Type.sizeCaption,
    fontWeight: Type.weightMedium,
    color: "#000",
  },
  // ─── Picker-mode add button ──────────────────────────────────────────
  addPill: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#111',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    zIndex: 20,
  },
  addPillDone: {
    backgroundColor: '#1A7A4A',
  },
  addPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
});