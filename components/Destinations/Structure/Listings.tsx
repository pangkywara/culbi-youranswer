/**
 * Listings.tsx — standalone listing preview driven by a place_id prop.
 * Mirrors the data composition used by app/destinations/[id].tsx:
 *   Supabase  → cultural facts, rules, photos, reviews
 *   Google    → hero photos, rating, address
 */
import React from 'react';
import { StyleSheet, ScrollView, View, ActivityIndicator, Text } from 'react-native';

import { useLandmarkDetail } from '@/hooks/useLandmarkDetail';

import HeroHeader         from './HeaderFooter/HeroHeader';
import TitleSection       from './Section/TitleSection';
import HostSection        from './Section/PlaceSection';
import HighlightsSection  from './Section/HighlightSection';
import DescriptionSection from './Section/DescriptionSection';
import SleepSection       from '../Photos/Photos';
import StickyFooter       from './HeaderFooter/StickyFooter';
import AmenitiesSection   from './Section/FunFacts';
import ReviewsSection     from './Section/ReviewSection';

export interface ListingProps {
  /** Google place_id — drives both Supabase and Google data fetches. */
  placeId: string;
}

export default function Listing({ placeId }: ListingProps) {
  const { isLoading, landmark, detail } = useLandmarkDetail(placeId);

  const primaryPhotoUrl =
    landmark?.landmark_photos?.find(p => p.is_primary)?.url_or_ref ??
    landmark?.landmark_photos?.[0]?.url_or_ref ??
    null;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#222" />
        <Text style={styles.loadingText}>Loading destination…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
        <HeroHeader
          photos={detail?.photos}
          placeName={detail?.name ?? landmark?.name}
          placeId={placeId}
        />
        <View style={styles.content}>
          <TitleSection
            name={detail?.name ?? landmark?.name}
            vicinity={detail?.formattedAddress ?? detail?.vicinity ?? landmark?.region}
            rating={detail?.rating}
            reviewCount={detail?.userRatingsTotal}
            category={landmark?.category}
            region={landmark?.region}
          />
          <HostSection
            name={detail?.name ?? landmark?.name}
            category={landmark?.category}
            region={landmark?.region}
            primaryPhotoUrl={primaryPhotoUrl}
          />
          <HighlightsSection
            facts={landmark?.landmark_facts?.map(f => f.fact_content)}
            rating={detail?.rating}
            userRatingsTotal={detail?.userRatingsTotal}
            region={landmark?.region}
          />
          <DescriptionSection overview={detail?.overview} />
          <AmenitiesSection facts={landmark?.landmark_facts?.map(f => f.fact_content)} />
        </View>

        <SleepSection
          dbPhotos={landmark?.landmark_photos}
          googlePhotos={detail?.photos}
        />

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
  container:   { flex: 1, backgroundColor: '#fff' },
  content:     { paddingHorizontal: 24 },
  scrollPadding: { paddingBottom: 120 },
  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#717171' },
});