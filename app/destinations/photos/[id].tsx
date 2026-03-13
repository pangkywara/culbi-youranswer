import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { CaretLeft } from 'react-native-phosphor';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { supabase } from '@/lib/supabase';
import { buildPhotoUrl } from '@/lib/places';
import type { LandmarkPhoto } from '@/types/database';
import { ImageModal } from '@/components/ImageModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Resolve a `landmark_photos` row to a display URL.
 * Bare Google photo refs (ATCDNf...) must be prefixed with the full resource
 * path before passing to buildPhotoUrl. placeId is required for Google photos.
 */
function resolveUrl(photo: LandmarkPhoto, placeId: string): string {
  if (photo.source === 'google') {
    const ref =
      !photo.url_or_ref.startsWith('http') && !photo.url_or_ref.startsWith('places/')
        ? `places/${placeId}/photos/${photo.url_or_ref}`
        : photo.url_or_ref;
    return buildPhotoUrl(ref, { maxWidth: 1200 });
  }
  return photo.url_or_ref;
}

export default function PhotoTourScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const placeId = Array.isArray(id) ? id[0] : id ?? '';

  const [name, setName] = useState<string>('Photo Tour');
  const [photos, setPhotos] = useState<LandmarkPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUri, setSelectedUri] = useState<string | null>(null);

  useEffect(() => {
    if (!placeId) return;

    (async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('landmarks')
        .select('id, name, landmark_photos(*)')
        .eq('place_id', placeId)
        .order('sort_order', { referencedTable: 'landmark_photos', ascending: true })
        .single();

      if (!error && data) {
        setName(data.name ?? 'Photo Tour');
        const rows = (data as any).landmark_photos as LandmarkPhoto[] ?? [];
        setPhotos(rows.sort((a, b) => a.sort_order - b.sort_order));
      }
      setIsLoading(false);
    })();
  }, [placeId]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <CaretLeft size={24} color="#222" weight="bold" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#222" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text style={styles.title}>{name}</Text>
            <Text style={styles.subtitle}>
              {photos.length} photo{photos.length !== 1 ? 's' : ''}
            </Text>

            {/* Dynamic Grid: First is big, then every 5th item */}
            <View style={styles.grid}>
              {photos.map((photo, index) => {
                /** * Rhythm Logic: 
                 * Photo 1 (index 0) is BIG.
                 * Then, every 5 steps from there (index 5, 10, 15...) is BIG.
                 */
                const isFullWidth = index === 0 || index % 5 === 0;

                return (
                  <Pressable
                    key={photo.id}
                    style={isFullWidth ? styles.fullWidthItem : styles.gridItem}
                    onPress={() => setSelectedUri(resolveUrl(photo, placeId))}
                    android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
                  >
                    <Image
                      source={{ uri: resolveUrl(photo, placeId) }}
                      style={isFullWidth ? styles.fullWidthImage : styles.gridImage}
                      contentFit="cover"
                      transition={300}
                    />
                    {photo.caption ? (
                      <Text style={styles.caption} numberOfLines={2}>
                        {photo.caption}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {photos.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No photos available yet.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Full-screen image viewer — pinch-to-zoom, swipe-to-dismiss */}
      <ImageModal
        uri={selectedUri}
        isVisible={selectedUri !== null}
        onClose={() => setSelectedUri(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 12 : 40,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '700', color: '#222', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#717171', marginBottom: 24 },
  
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 24, 
  },

  /* Small Items (The grid of 4) */
  gridItem: { 
    width: (SCREEN_WIDTH - 40 - 12) / 2, 
  },
  gridImage: {
    width: '100%',
    height: 180, 
    borderRadius: 16, // Softer rounding to match your screenshot
    backgroundColor: '#f5f5f5',
  },

  /* Big Items (Every 1st and 6th) */
  fullWidthItem: {
    width: '100%',
  },
  fullWidthImage: {
    width: '100%',
    aspectRatio: 4/3, // Better proportion for the hero images
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },

  caption: { 
    fontSize: 13, 
    color: '#717171', 
    marginTop: 8, 
    textAlign: 'left',
    lineHeight: 18,
  },
  emptyState: { alignItems: 'center', paddingTop: 48 },
  emptyText: { color: '#999', fontSize: 15 },
});