/**
 * Photos.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Horizontal photo strip for a destination.
 *
 * Data priority:
 *  1. landmark_photos from Supabase (seeded Google photo_references)  — preferred
 *  2. PlacePhoto[] from Google Places Detail API                      — fallback
 *  3. Placeholder tile                                                — last resort
 *
 * Google photo_references are resolved via buildPhotoUrl() at display time,
 * keeping the DB row lean (reference only, not a full CDN URL).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { buildPhotoUrl } from '@/lib/places';
import type { PlacePhoto } from '@/lib/places';
import type { LandmarkPhoto } from '@/types/database';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.52;
const PLACEHOLDER = 'https://placehold.co/400x300/E8E8E8/888888/png?text=Photo';
const BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PhotosSectionProps {
  /**
   * Photos from Supabase landmark_photos — preferred source.
   * url_or_ref is either a full https:// URL or a Google photo_reference.
   */
  dbPhotos?: LandmarkPhoto[];
  /**
   * Photos from Google Places Detail API — used when dbPhotos is empty.
   */
  googlePhotos?: PlacePhoto[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveUrl(urlOrRef: string): string {
  // buildPhotoUrl handles all three cases:
  //   - full https:// URL → pass-through
  //   - 'places/{id}/photos/{ref}' resource name → new API media endpoint
  //   - legacy opaque ref → legacy photos endpoint fallback
  return buildPhotoUrl(urlOrRef, { maxWidth: 600 });
}

// ─── Component ────────────────────────────────────────────────────────────────

const PhotosSection = memo(function PhotosSection({
  dbPhotos,
  googlePhotos,
}: PhotosSectionProps) {
  // Build the ordered URL list
  const urls: string[] = (() => {
    if (dbPhotos && dbPhotos.length > 0) {
      // Sort by sort_order ascending (primary photo first)
      return [...dbPhotos]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(p => resolveUrl(p.url_or_ref));
    }
    if (googlePhotos && googlePhotos.length > 0) {
      return googlePhotos.map(p => buildPhotoUrl(p.photoReference, { maxWidth: 600 }));
    }
    return [PLACEHOLDER, PLACEHOLDER, PLACEHOLDER];
  })();

  React.useEffect(() => {
    if (urls && urls.length > 0 && urls[0] !== PLACEHOLDER) {
      Image.prefetch(urls);
    }
  }, [urls]);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Photos</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        style={styles.fullBleedScroll}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + 16}
        snapToAlignment="start"
      >
        {urls.map((uri, idx) => (
          <View key={idx} style={styles.card}>
            <Image
              source={{ uri }}
              style={styles.cardImage}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              placeholder={{ blurhash: BLURHASH }}
            />
          </View>
        ))}
      </ScrollView>

      <View style={styles.divider} />
    </View>
  );
});

export default PhotosSection;

const styles = StyleSheet.create({
  container: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#222',
    marginBottom: 20,
  },
  fullBleedScroll: {
    marginHorizontal: -24,
  },
  scrollContainer: {
    paddingHorizontal: 24,
    gap: 16,
  },
  card: {
    width: CARD_WIDTH,
  },
  cardImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  divider: {
    height: 1,
    backgroundColor: '#ebebeb',
    marginTop: 32,
  },
});