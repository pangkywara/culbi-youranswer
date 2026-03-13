/**
 * app/destinations/[id].tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Production Architecture — three-layer data composition:
 *
 *   Supabase  → Source of Truth  (isBridgeEnabled, cultural rules & facts)
 *   Google    → Media Provider   (photos, live rating, address, reviews)
 *   Gemini    → Intelligence     (cultural rules rendered + "Ask Culbi" CTA)
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Animated,
  InteractionManager,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { useLandmarkDetail } from '@/hooks/useLandmarkDetail';
import { buildPhotoUrl } from '@/lib/places';
import { supabase } from '@/lib/supabase';

import HeroHeader      from '@/components/Destinations/Structure/HeaderFooter/HeroHeader';
import TitleSection    from '@/components/Destinations/Structure/Section/TitleSection';
import HighlightsSection from '@/components/Destinations/Structure/Section/HighlightSection';
import DescriptionSection from '@/components/Destinations/Structure/Section/DescriptionSection';
import SleepSection    from '@/components/Destinations/Photos/Photos';
import StickyFooter    from '@/components/Destinations/Structure/HeaderFooter/StickyFooter';
import FloatingStickyHeader from '@/components/Destinations/Structure/HeaderFooter/FloatingStickyHeader';
import AmenitiesSection from '@/components/Destinations/Structure/Section/FunFacts';
import ReviewsSection  from '@/components/Destinations/Structure/Section/ReviewSection';
import LocationSection from '@/components/Destinations/Maps/LocationSection';
import ThingsToKnow    from '@/components/Destinations/Structure/ThingsToKnow';
import DestinationSkeleton from '@/components/Destinations/Skeleton/DestinationSkeleton';

export default function ListingDetailScreen() {
  // id = Google place_id, passed via router.push('/destinations/${place_id}')
  const { id } = useLocalSearchParams<{ id: string }>();
  const placeId = Array.isArray(id) ? id[0] : id ?? '';

  // ── Three-layer data fetch ────────────────────────────────────────────────
  const { isLoading, landmark, detail, isBridgeEnabled } = useLandmarkDetail(placeId);

  // ── Hooks must be declared unconditionally (Rules of Hooks) ──────────────
  const lastScrollY  = useRef(0);
  const isShown      = useRef(false);
  const recordedRef  = useRef(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  // ── Record this destination as recently viewed once data has loaded ───────
  // This fires whenever the user opens the detail page — from ExploreScreen,
  // search results, or any other entry point — ensuring all visits are tracked.
  useEffect(() => {
    if (isLoading || recordedRef.current || !placeId) return;
    if (!landmark && !detail) return;
    recordedRef.current = true;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        // Prefer raw Google photo reference so buildPhotoUrl can reconstruct
        // the CDN URL later; fall back to Supabase DB photo refs.
        const photoRef =
          detail?.photos?.[0]?.photoReference ??
          landmark?.landmark_photos?.find(p => p.is_primary)?.url_or_ref ??
          landmark?.landmark_photos?.[0]?.url_or_ref ??
          null;

        await (supabase.from('recently_viewed') as any).upsert({
          user_id:         session.user.id,
          place_id:        placeId,
          place_name:      detail?.name ?? landmark?.name ?? placeId,
          photo_reference: photoRef,
          vicinity:        detail?.formattedAddress ?? detail?.vicinity ?? landmark?.region ?? null,
          rating:          detail?.rating ?? null,
          place_types:     null,
          coords:          detail?.coords ?? null,
          viewed_at:       new Date().toISOString(),
        }, { onConflict: 'user_id,place_id' });
      } catch { /* non-critical — recently viewed is best-effort */ }
    })();
  }, [isLoading, landmark, detail, placeId]);

  // ── Defer below-fold sections until the navigation animation finishes ─────
  // This prevents the slide-in animation from janking due to heavy initial render.
  const [contentReady, setContentReady] = useState(false);
  useEffect(() => {
    if (isLoading) return;
    const task = InteractionManager.runAfterInteractions(() => setContentReady(true));
    return () => task.cancel();
  }, [isLoading]);

  // ── Show skeleton while parallel fetches are in-flight ───────────────────
  if (isLoading) return <DestinationSkeleton />;

  // ── Derived values ────────────────────────────────────────────────────────
  const primaryPhoto = landmark?.landmark_photos?.find(p => p.is_primary) ?? landmark?.landmark_photos?.[0];
  // url_or_ref is already normalised to a full resource name by useLandmarkDetail
  // (for Google photos), so buildPhotoUrl handles every format automatically.
  const primaryPhotoUrl: string | undefined = primaryPhoto
    ? buildPhotoUrl(primaryPhoto.url_or_ref, { maxWidth: 200 })
    : (detail?.photos?.[0]
        ? buildPhotoUrl(detail.photos[0].photoReference, { maxWidth: 200 })
        : undefined);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    const direction = currentOffset > lastScrollY.current ? 'down' : 'up';

    // 1. HIDDEN AT THE TOP
    if (currentOffset < 50) {
      if (isShown.current) {
        isShown.current = false;
        setHeaderVisible(false);
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => slideAnim.setValue(-100));
      }
    }
    // 2. SCROLLING UP → Slide In + Fade In
    else if (direction === 'up' && currentOffset > 150) {
      if (!isShown.current) {
        isShown.current = true;
        setHeaderVisible(true);
        Animated.parallel([
          Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
      }
    }
    // 3. SCROLLING DOWN → Fade Out
    else if (direction === 'down' && isShown.current) {
      isShown.current = false;
      setHeaderVisible(false);
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        if (!isShown.current) slideAnim.setValue(-100);
      });
    }

    lastScrollY.current = currentOffset;
  };

  return (
    <View style={styles.container}>

      <Animated.View
        pointerEvents={headerVisible ? 'box-none' : 'none'}
        style={[
          styles.stickyHeader,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <FloatingStickyHeader placeName={detail?.name ?? landmark?.name} />
      </Animated.View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollPadding}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={false}
        >
          {/* ── Layer 2: GOOGLE — hero photo carousel ───────────────── */}
          <HeroHeader
            photos={detail?.photos}
            placeName={detail?.name ?? landmark?.name}
            placeId={placeId}
          />

          <View style={styles.whiteCard}>
            <View style={styles.content}>
              {/* ── Layer 2: GOOGLE — name, rating, location ──────── */}
              <TitleSection
                name={detail?.name ?? landmark?.name}
                vicinity={detail?.formattedAddress ?? detail?.vicinity ?? landmark?.region}
                rating={detail?.rating}
                reviewCount={detail?.userRatingsTotal}
                category={landmark?.category}
                region={landmark?.region}
              />

              {/* ── Layer 1+2: Supabase facts OR Google rating ─────── */}
              <HighlightsSection
                facts={landmark?.landmark_facts?.map(f => f.fact_content)}
                rating={detail?.rating}
                userRatingsTotal={detail?.userRatingsTotal}
                region={landmark?.region}
              />

              {/* ── Layer 2: GOOGLE — editorial overview ───────────── */}
              <DescriptionSection overview={detail?.overview} />
              <AmenitiesSection
                facts={landmark?.landmark_facts?.map(f => f.fact_content)}
              />
            </View>

            {/* ── Layer 1: Supabase photos, fallback Google photos ─── */}
            {contentReady && (
              <SleepSection
                dbPhotos={landmark?.landmark_photos}
                googlePhotos={detail?.photos}
              />
            )}

            {/* ── Layer 1+2: DB reviews preferred, Google fallback ─── */}
            {contentReady && (
              <ReviewsSection
                rating={detail?.rating}
                reviewCount={detail?.userRatingsTotal}
                dbReviews={landmark?.landmark_reviews}
                reviews={detail?.reviews?.map(r => ({
                  authorName:   r.authorName,
                  rating:       r.rating,
                  text:         r.text,
                  relativeTime: r.relativeTime,
                }))}
              />
            )}

            <View style={styles.content}>
              {contentReady && (
                <LocationSection
                  coords={detail?.coords}
                  locationLabel={detail?.formattedAddress ?? landmark?.region}
                  placeId={placeId}
                />
              )}
              {/* ── Layer 1+3: Supabase rules → Gemini Intelligence ── */}
              {contentReady && (
                <ThingsToKnow
                  rules={landmark?.landmark_rules}
                  placeName={detail?.name ?? landmark?.name}
                />
              )}
            </View>
          </View>
        </ScrollView>
      <StickyFooter
        rating={detail?.rating}
        reviewCount={detail?.userRatingsTotal}
        googleMapsUrl={detail?.googleMapsUrl}
        placeName={detail?.name ?? landmark?.name}
        coords={detail?.coords}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  whiteCard: {
    backgroundColor: '#ffffff',
    marginTop: -32,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 10,
  },
  content: { paddingHorizontal: 24 },
  scrollPadding: { paddingBottom: 120 },
});