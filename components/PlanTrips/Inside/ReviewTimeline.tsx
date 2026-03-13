import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Star } from 'react-native-phosphor';
import type { LandmarkReview } from '@/types/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Constants ───────────────────────────────────────────────────────────────
const HORIZONTAL_PADDING = 0;
const CARD_WIDTH = 280;
const GAP = 20;
const DIVIDER_WIDTH = 1;
const SNAP_INTERVAL = CARD_WIDTH + DIVIDER_WIDTH + GAP;

export interface GoogleReview {
  authorName:          string;
  rating:              number;
  text:                string;
  relativeTime:        string;
}

export interface ReviewsSectionProps {
  /** Overall star rating from Google Places */
  rating?:      number;
  /** Total review count from Google Places */
  reviewCount?: number;
  /** Reviews from Google Places Detail API (fallback) */
  reviews?:     GoogleReview[];
  /**
   * Reviews from Supabase landmark_reviews — sourced from Google via backfill.
   * Takes priority over the `reviews` prop when non-empty.
   */
  dbReviews?:   LandmarkReview[];
}

const FALLBACK_REVIEWS: GoogleReview[] = [
  {
    authorName:   'Traveller',
    rating:       5,
    text:         'A must-visit destination in Borneo. The cultural experience here is unlike anything else.',
    relativeTime: 'recently',
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={12}
          weight="fill"
          color={i <= rating ? '#222' : '#E0E0E0'}
          style={{ marginRight: 2 }}
        />
      ))}
    </View>
  );
}

export default function ReviewTimeline({ rating, reviewCount, reviews, dbReviews }: ReviewsSectionProps) {
  // Prefer DB reviews (backfilled from Google), fallback to live Google reviews,
  // then the generic placeholder.
  const displayReviews: GoogleReview[] = (() => {
    if (dbReviews && dbReviews.length > 0) {
      return dbReviews.map(r => ({
        authorName:   r.author_name,
        rating:       r.rating,
        text:         r.text,
        relativeTime: r.relative_time,
      }));
    }
    if (reviews && reviews.length > 0) return reviews;
    return FALLBACK_REVIEWS;
  })();
  const headerLabel = rating != null
    ? `${rating.toFixed(2)}${reviewCount != null ? ` · ${reviewCount} reviews` : ''}`
    : 'Guest reviews';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Star size={18} weight="fill" color="#222" />
        <Text style={styles.ratingTitle}>{headerLabel}</Text>
      </View>

      {/* Horizontal review cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="start"
      >
        {displayReviews.map((item, index) => (
          <View key={index} style={styles.reviewWrapper}>
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <StarRating rating={item.rating} />
                <Text style={styles.dot}>·</Text>
                <Text style={styles.date}>{item.relativeTime}</Text>
              </View>

              <Text style={styles.reviewText} numberOfLines={4}>
                {item.text}
              </Text>

              <View style={styles.userInfo}>
                {item.authorName ? (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitial}>
                      {item.authorName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                ) : null}
                <View>
                  <Text style={styles.userName}>{item.authorName}</Text>
                </View>
              </View>
            </View>
            {index < displayReviews.length - 1 && <View style={styles.verticalDivider} />}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 32,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 6,
    paddingHorizontal: HORIZONTAL_PADDING, // Keeps header aligned with list start
  },
  starIcon: {
    fontSize: 18,
    color: '#222',
  },
  ratingTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#222',
  },
  scrollContent: {
    // Adds margin to the START and END of the scrollable list
    paddingHorizontal: HORIZONTAL_PADDING, 
  },
  reviewWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: {
    width: CARD_WIDTH,
    paddingRight: GAP, // Space between text and divider
  },
  verticalDivider: {
    width: DIVIDER_WIDTH,
    height: '100%',
    backgroundColor: '#EBEBEB',
    marginRight: GAP, // Space after divider before next card
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 10,
    marginRight: 1,
  },
  dot: {
    marginHorizontal: 4,
    color: '#222',
    fontSize: 10,
  },
  date: {
    fontSize: 12,
    fontWeight: '400',
    color: '#717171',
  },
  reviewText: {
    fontSize: 15,
    color: '#222',
    lineHeight: 22,
  },
  showMore: {
    textDecorationLine: 'underline',
    fontWeight: '600',
    fontSize: 14,
    color: '#222',
    marginTop: 4,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 12,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
  },
  userName: {
    fontWeight: '600',
    fontSize: 14,
    color: '#222',
  },
  footer: {
    paddingHorizontal: HORIZONTAL_PADDING, // Keeps button aligned with content
  },
  bottomDivider: {
    height: 1,
    backgroundColor: '#EBEBEB',
    marginTop: 32,
    marginBottom: 32,
  },
  showAllBtn: {
    borderWidth: 1.5,
    borderColor: '#222',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  showAllText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
});