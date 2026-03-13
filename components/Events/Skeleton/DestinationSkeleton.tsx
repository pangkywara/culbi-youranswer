/**
 * DestinationSkeleton
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-page skeleton that mirrors the exact layout of destinations/[id].tsx.
 * Every section corresponds 1-to-1 with a real component so the layout shift
 * on load is zero — the skeleton occupies the same dimensions as live content.
 *
 * All SkeletonBox instances share one shimmerX value (from useSkeletonShimmer)
 * so the shimmer sweep is perfectly synchronised across the screen.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { ScrollView, View, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkeletonBox } from './SkeletonBox';
import { useSkeletonShimmer } from './useSkeletonShimmer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PAD = 24; // matches content paddingHorizontal in [id].tsx

// ─── Section-level skeleton pieces ───────────────────────────────────────────

function SkeletonHero({ shimmerX }: S) {
  return <SkeletonBox shimmerX={shimmerX} height={360} borderRadius={0} />;
}

function SkeletonTitle({ shimmerX }: S) {
  return (
    <View style={styles.titleContainer}>
      {/* Title */}
      <SkeletonBox shimmerX={shimmerX} width={220} height={22} style={styles.centred} />
      {/* Subtitle */}
      <SkeletonBox shimmerX={shimmerX} width={160} height={14} style={[styles.centred, { marginTop: 12 }]} />
      {/* Details */}
      <SkeletonBox shimmerX={shimmerX} width={200} height={13} style={[styles.centred, { marginTop: 6 }]} />
      {/* Rating */}
      <SkeletonBox shimmerX={shimmerX} width={120} height={13} style={[styles.centred, { marginTop: 12 }]} />
      <View style={styles.divider} />
    </View>
  );
}

function SkeletonPlaceSection({ shimmerX }: S) {
  return (
    <View style={styles.placeRow}>
      {/* Avatar circle */}
      <SkeletonBox shimmerX={shimmerX} width={56} height={56} borderRadius={28} style={styles.avatarMargin} />
      <View style={styles.placeText}>
        <SkeletonBox shimmerX={shimmerX} width={140} height={16} />
        <SkeletonBox shimmerX={shimmerX} width={100} height={13} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

function SkeletonHighlights({ shimmerX }: S) {
  return (
    <View style={styles.highlightContainer}>
      {[0, 1].map(i => (
        <View key={i} style={styles.highlightRow}>
          {/* Icon placeholder */}
          <SkeletonBox shimmerX={shimmerX} width={40} height={40} borderRadius={20} style={styles.iconMargin} />
          <View style={{ flex: 1 }}>
            <SkeletonBox shimmerX={shimmerX} width={130} height={14} />
            <SkeletonBox shimmerX={shimmerX} height={13} style={{ marginTop: 6 }} />
          </View>
        </View>
      ))}
      <View style={styles.divider} />
    </View>
  );
}

function SkeletonDescription({ shimmerX }: S) {
  return (
    <View style={styles.descriptionContainer}>
      <SkeletonBox shimmerX={shimmerX} height={14} style={{ marginBottom: 8 }} />
      <SkeletonBox shimmerX={shimmerX} height={14} style={{ marginBottom: 8 }} />
      <SkeletonBox shimmerX={shimmerX} height={14} style={{ marginBottom: 8 }} />
      <SkeletonBox shimmerX={shimmerX} width={160} height={14} />
      {/* "Show more" */}
      <SkeletonBox shimmerX={shimmerX} width={80} height={14} style={{ marginTop: 12 }} />
      <View style={styles.divider} />
    </View>
  );
}

function SkeletonFunFacts({ shimmerX }: S) {
  return (
    <View style={styles.factsContainer}>
      {/* Section title */}
      <SkeletonBox shimmerX={shimmerX} width={100} height={20} style={{ marginBottom: 24 }} />
      {[0, 1, 2].map(i => (
        <View key={i} style={styles.factRow}>
          <SkeletonBox shimmerX={shimmerX} width={26} height={26} borderRadius={13} style={styles.iconMargin} />
          <SkeletonBox shimmerX={shimmerX} height={14} style={{ flex: 1 }} />
        </View>
      ))}
      <View style={styles.divider} />
    </View>
  );
}

function SkeletonPhotos({ shimmerX }: S) {
  const CARD_W = SCREEN_WIDTH * 0.52;
  return (
    <View style={styles.photosContainer}>
      {/* Section title */}
      <SkeletonBox shimmerX={shimmerX} width={80} height={20} style={{ marginBottom: 20, marginLeft: H_PAD }} />
      <ScrollView
        horizontal
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: H_PAD, gap: 16 }}
      >
        {[0, 1, 2].map(i => (
          <SkeletonBox key={i} shimmerX={shimmerX} width={CARD_W} height={180} borderRadius={16} />
        ))}
      </ScrollView>
      <View style={[styles.divider, { marginHorizontal: H_PAD, marginTop: 32 }]} />
    </View>
  );
}

function SkeletonReviews({ shimmerX }: S) {
  return (
    <View style={styles.reviewsContainer}>
      {/* Rating header */}
      <SkeletonBox shimmerX={shimmerX} width={180} height={40} borderRadius={8} style={{ marginLeft: H_PAD, marginBottom: 20 }} />
      <ScrollView
        horizontal
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: H_PAD, gap: 20 }}
      >
        {[0, 1].map(i => (
          <View key={i} style={styles.reviewCard}>
            <SkeletonBox shimmerX={shimmerX} height={14} style={{ marginBottom: 8 }} />
            <SkeletonBox shimmerX={shimmerX} height={14} style={{ marginBottom: 8 }} />
            <SkeletonBox shimmerX={shimmerX} width={160} height={14} style={{ marginBottom: 16 }} />
            {/* Author row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <SkeletonBox shimmerX={shimmerX} width={36} height={36} borderRadius={18} />
              <SkeletonBox shimmerX={shimmerX} width={100} height={13} />
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={[styles.divider, { marginHorizontal: H_PAD, marginTop: 20 }]} />
    </View>
  );
}

function SkeletonLocation({ shimmerX }: S) {
  return (
    <View style={styles.locationContainer}>
      <SkeletonBox shimmerX={shimmerX} width={160} height={20} style={{ marginBottom: 8 }} />
      <SkeletonBox shimmerX={shimmerX} width={200} height={14} style={{ marginBottom: 16 }} />
      <SkeletonBox shimmerX={shimmerX} height={220} borderRadius={16} />
      <View style={styles.divider} />
    </View>
  );
}

function SkeletonThingsToKnow({ shimmerX }: S) {
  return (
    <View style={styles.rulesContainer}>
      <SkeletonBox shimmerX={shimmerX} width={160} height={20} style={{ marginBottom: 20 }} />
      {[0, 1, 2].map(i => (
        <View key={i} style={styles.ruleRow}>
          <SkeletonBox shimmerX={shimmerX} width={24} height={24} borderRadius={12} style={styles.iconMargin} />
          <View style={{ flex: 1 }}>
            <SkeletonBox shimmerX={shimmerX} width={100} height={14} style={{ marginBottom: 6 }} />
            <SkeletonBox shimmerX={shimmerX} height={13} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Footer skeleton ──────────────────────────────────────────────────────────

function SkeletonFooter({ shimmerX }: S) {
  return (
    <View style={styles.footer}>
      <SkeletonBox shimmerX={shimmerX} width={80} height={16} />
      <SkeletonBox shimmerX={shimmerX} width={140} height={44} borderRadius={22} />
    </View>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function DestinationSkeleton() {
  const shimmerX = useSkeletonShimmer();
  const insets   = useSafeAreaInsets();
  const s: S = { shimmerX };

  return (
    <View style={styles.screen}>
      <ScrollView
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* HeroHeader */}
        <SkeletonHero {...s} />

        {/* White card — mirrors whiteCard style in [id].tsx */}
        <View style={styles.whiteCard}>
          <View style={styles.content}>
            <SkeletonTitle       {...s} />
            <SkeletonPlaceSection {...s} />
            <SkeletonHighlights  {...s} />
            <SkeletonDescription {...s} />
            <SkeletonFunFacts    {...s} />
          </View>

          {/* Photos strip — full bleed, no horizontal padding */}
          <SkeletonPhotos {...s} />

          {/* Reviews strip — full bleed */}
          <SkeletonReviews {...s} />

          <View style={styles.content}>
            <SkeletonLocation    {...s} />
            <SkeletonThingsToKnow {...s} />
          </View>
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <SkeletonFooter {...s} />
    </View>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

import type { SharedValue } from 'react-native-reanimated';
interface S { shimmerX: SharedValue<number> }

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },

  // Mirrors [id].tsx whiteCard
  whiteCard: {
    backgroundColor: '#fff',
    marginTop: -32,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 10,
  },
  content: { paddingHorizontal: H_PAD },

  divider: { height: 1, backgroundColor: '#ebebeb', marginVertical: 24 },

  // TitleSection
  titleContainer: { marginTop: 24 },
  centred: { alignSelf: 'center' },

  // PlaceSection
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ebebeb',
  },
  avatarMargin: { marginRight: 16 },
  placeText: { flex: 1 },

  // HighlightsSection
  highlightContainer: { marginTop: 8 },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  iconMargin: { marginRight: 16 },

  // DescriptionSection
  descriptionContainer: { marginTop: 32 },

  // FunFacts
  factsContainer: { marginTop: 32 },
  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  // Photos
  photosContainer: { marginTop: 32 },

  // Reviews
  reviewsContainer: { marginTop: 20 },
  reviewCard: {
    width: 280,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ebebeb',
  },

  // LocationSection
  locationContainer: { marginTop: 32 },

  // ThingsToKnow
  rulesContainer: { marginTop: 32, marginBottom: 16 },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },

  // StickyFooter
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    borderTopWidth: 1,
    borderTopColor: '#ebebeb',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
  },
});
