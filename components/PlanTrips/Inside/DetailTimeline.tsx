import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  LayoutAnimation, 
  Platform, 
  UIManager,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { 
  CaretDown, 
  CaretUp, 
  Flag, 
  Sparkle,
  Star,
  ShieldCheck,
} from 'react-native-phosphor';
import type { TripStop } from '@/components/PastTrips/TripStopRow';
import { Colors, Type, Space, Radius, Shadows, S } from '@/constants/style';
import { supabase } from '@/lib/supabase';
import { searchPlaceByName, fetchPlaceDetails } from '@/lib/places';
import type { LandmarkReview, LandmarkRule } from '@/types/database';
import ReviewsSection from '@/components/Destinations/Structure/Section/ReviewSection';
import type { GoogleReview } from '@/components/Destinations/Structure/Section/ReviewSection';
import ReviewTimeline from './ReviewTimeline';
import TimelineEtiquette from './TimelineEtiquette';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDateHeading(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

interface DayGroup {
  date: string | null;
  stops: TripStop[];
}

function groupStopsByDate(stops: TripStop[]): DayGroup[] {
  const map = new Map<string, TripStop[]>();
  const unscheduled: TripStop[] = [];

  for (const stop of stops) {
    if (stop.date) {
      const existing = map.get(stop.date) ?? [];
      existing.push(stop);
      map.set(stop.date, existing);
    } else {
      unscheduled.push(stop);
    }
  }

  const sortedDates = [...map.keys()].sort();
  const groups: DayGroup[] = sortedDates.map((date) => ({
    date,
    stops: map.get(date)!,
  }));

  if (unscheduled.length > 0) {
    groups.push({ date: null, stops: unscheduled });
  }

  return groups;
}

// ─── Sub-Component: StopCard ────────────────────────────────────────────────

const StopCard = ({ stop, index, isLast, regionHint }: { stop: TripStop; index: number; isLast: boolean; regionHint?: string }) => {
  const [isReadMore, setIsReadMore] = useState(false);
  const [dbReviews, setDbReviews] = useState<LandmarkReview[]>([]);
  const [googleReviews, setGoogleReviews] = useState<GoogleReview[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [rules, setRules] = useState<LandmarkRule[]>([]);
  const isSuggestion = Boolean(stop.isSuggestion);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // ── Layer 1: Supabase (if we have a landmark_id) ──────────────────────
      let dbReviewsFound: LandmarkReview[] = [];
      if (stop.landmark_id) {
        const landmarkId = stop.landmark_id;
        const [reviewsRes, landmarkRes, rulesRes] = await Promise.all([
          supabase
            .from('landmark_reviews')
            .select('*')
            .eq('landmark_id', landmarkId)
            .order('rating', { ascending: false })
            .limit(5),
          supabase
            .from('landmarks')
            .select('category')
            .eq('id', landmarkId)
            .single(),
          supabase
            .from('landmark_rules')
            .select('*')
            .eq('landmark_id', landmarkId)
            .order('severity'),
        ]);
        if (cancelled) return;
        if (reviewsRes.data && reviewsRes.data.length > 0) {
          dbReviewsFound = reviewsRes.data;
          setDbReviews(reviewsRes.data);
          const avg = reviewsRes.data.reduce((s, r) => s + r.rating, 0) / reviewsRes.data.length;
          setAvgRating(avg);
          setReviewCount(reviewsRes.data.length);
        }
        if (landmarkRes.data?.category) {
          setCategory(landmarkRes.data.category);
        }
        if (rulesRes.data && rulesRes.data.length > 0) {
          setRules(rulesRes.data);
        }
      }

      // ── Layer 2: Google Places fallback when no DB reviews ────────────────
      if (dbReviewsFound.length === 0) {
        const hit = await searchPlaceByName(stop.landmark.name, regionHint);
        if (cancelled) return;
        if (hit?.placeId) {
          try {
            const detail = await fetchPlaceDetails(hit.placeId);
            if (cancelled) return;
            if (detail.rating != null) setAvgRating(detail.rating);
            if (detail.userRatingsTotal != null) setReviewCount(detail.userRatingsTotal);
            if (detail.reviews && detail.reviews.length > 0) {
              setGoogleReviews(detail.reviews);
            }
          } catch {
            // Places Details unavailable — silently skip
          }
        }
      }
    })();
    return () => { cancelled = true; };
  }, [stop.landmark_id, stop.landmark.name, regionHint]);

  const toggleReadMore = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsReadMore(!isReadMore);
  };

  return (
    <View style={[cardStyles.container, isSuggestion && cardStyles.suggestionContainer]}>
      {isSuggestion && (
        <View style={cardStyles.suggestionBadge}>
          <Sparkle size={12} color={Colors.brand} weight="fill" />
          <Text style={cardStyles.suggestionBadgeText}>Culbi Suggestion</Text>
        </View>
      )}

      <View style={cardStyles.numberCircle}>
        <Text style={cardStyles.numberText}>{index + 1}</Text>
      </View>

      {stop.landmark.thumbnail_url ? (
        <Image 
          source={{ uri: stop.landmark.thumbnail_url }} 
          style={cardStyles.heroImage}
          contentFit="cover"
          cachePolicy="memory-disk"
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
        />
      ) : (
        <View style={[cardStyles.heroImage, { backgroundColor: Colors.surfaceMuted }]} />
      )}
      
      <View style={cardStyles.cardBody}>
        <Text style={cardStyles.stopName}>{stop.landmark.name}</Text>
        
          {avgRating != null && (
            <View style={cardStyles.ratingRow}>
              <View style={cardStyles.starsContainer}>
                {[1, 2, 3, 4, 5].map((starNum) => (
                  <Star 
                    key={starNum} 
                    size={16} 
                    color={Colors.brand} 
                    weight={starNum <= Math.round(avgRating) ? 'fill' : 'regular'} 
                  />
                ))}
              </View>
              <Text style={cardStyles.reviewCount}>
                {avgRating.toFixed(1)}{reviewCount != null ? ` · ${reviewCount.toLocaleString()} ${reviewCount === 1 ? 'review' : 'reviews'}` : ''}
              </Text>
            </View>
          )}

          {category != null && (
            <View style={cardStyles.metaRow}>
              <View style={cardStyles.metaItem}>
                <Flag size={14} color={Colors.textSecondary} />
                <Text style={cardStyles.metaLabel}>{category}</Text>
              </View>
            </View>
          )}

          <View style={cardStyles.aiSection}>
            <View style={cardStyles.aiHeader}>
              <View style={cardStyles.sparkleCircle}>
                <Sparkle size={14} color={Colors.white} weight="fill" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={cardStyles.aiText} numberOfLines={isReadMore ? undefined : 2}>
                  {(stop.landmark as any).description || 
                    `${stop.landmark.name} presents an impressive collection of curated regional heritage.`}
                </Text>
                
                <TouchableOpacity onPress={toggleReadMore} style={cardStyles.readMoreBtn}>
                  <Text style={cardStyles.readMoreText}>{isReadMore ? 'Read less' : 'Read more'}</Text>
                  {isReadMore ? <CaretUp size={14} weight="bold" color={Colors.brand} /> : <CaretDown size={14} weight="bold" color={Colors.brand} />}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Cultural Etiquette */}
          <TimelineEtiquette rules={rules} maxRules={3} />

          {!isLast && <View style={cardStyles.bottomDivider} />}
      </View>
    </View>
  );
};

// ─── Sub-Component: DaySection ───────────────────────────────────────────────

const DaySection = ({
  group,
  dayNumber,
  totalDays,
  regionHint,
}: {
  group: DayGroup;
  dayNumber: number;
  totalDays: number;
  regionHint?: string;
}) => {
  const [expanded, setExpanded] = useState(true);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  const heading = group.date ? formatDateHeading(group.date) : 'Unscheduled';
  const subLabel = group.date
    ? `Day ${dayNumber} of ${totalDays} · ${group.stops.length} stops`
    : `${group.stops.length} stop${group.stops.length !== 1 ? 's' : ''}`;

  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.dayHeader} onPress={toggle} activeOpacity={0.7}>
        <View style={styles.dayHeaderLeft}>
          <View>
            <Text style={S.title}>{heading}</Text>
            <Text style={S.subtitle}>{subLabel}</Text>
          </View>
        </View>
        {expanded
          ? <CaretUp size={18} color={Colors.textPrimary} weight="bold" />
          : <CaretDown size={18} color={Colors.textPrimary} weight="bold" />
        }
      </TouchableOpacity>

      {expanded && (
        <View style={styles.contentPadding}>
          {group.stops.map((stop, index) => (
            <StopCard
              key={stop.stop_order}
              stop={stop}
              index={index}
              isLast={index === group.stops.length - 1}
              regionHint={regionHint}
            />
          ))}
        </View>
      )}
    </View>
  );
};

// ─── Main Component: DetailTimeline ──────────────────────────────────────────

export const DetailTimeline = ({ stops, regionHint }: { stops: TripStop[]; regionHint?: string }) => {
  const groups = groupStopsByDate(stops);
  const datedGroups = groups.filter((g) => g.date !== null);

  return (
    <View style={styles.timelineWrapper}>
      {groups.map((group, idx) => (
        <DaySection
          key={group.date ?? '__unscheduled__'}
          group={group}
          dayNumber={idx + 1}
          totalDays={datedGroups.length}
          regionHint={regionHint}
        />
      ))}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  timelineWrapper: { marginTop: Space.xxl },
  section: {
    marginBottom: Space.sm,
    backgroundColor: Colors.white,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space.xxl,
    paddingVertical: Space.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    flex: 1,
  },
  contentPadding: { 
    paddingHorizontal: Space.xxl, 
    paddingTop: Space.xl 
  },
});

const cardStyles = StyleSheet.create({
  container: { marginBottom: Space.lg },
  suggestionContainer: {
    borderWidth: 1.5,
    borderColor: Colors.brand,
    borderStyle: 'dashed',
    borderRadius: Radius.card,
    padding: Space.sm,
    backgroundColor: Colors.surfaceSoft,
    ...Shadows.level1,
  },
  suggestionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
    alignSelf: 'flex-start',
    backgroundColor: Colors.badgeAlt,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.sm,
    paddingVertical: 4,
    marginBottom: Space.sm,
  },
  suggestionBadgeText: {
    fontSize: Type.sizeSmall,
    fontWeight: Type.weightSemibold,
    color: Colors.brand,
  },
  numberCircle: { 
    width: 26, 
    height: 26, 
    borderRadius: 13, 
    backgroundColor: Colors.textPrimary, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: Space.md 
  },
  numberText: { 
    color: Colors.white, 
    fontSize: Type.sizeSmall, 
    fontWeight: Type.weightBold 
  },
  heroImage: { 
    width: '100%', 
    height: 220, 
    borderRadius: Radius.lg, 
    backgroundColor: Colors.surfaceMuted 
  },
  cardBody: { paddingVertical: Space.lg },
  stopName: { 
    fontSize: Type.sizeH2, 
    fontWeight: Type.weightBold, 
    color: Colors.textPrimary,
    letterSpacing: -0.5 
  },
  ratingRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: Space.sm, 
    marginTop: Space.xs 
  },
  starsContainer: { flexDirection: 'row', gap: 2 },
  reviewCount: { 
    fontSize: Type.sizeBodySm, 
    color: Colors.textSecondary 
  },
  metaRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: Space.sm 
  },
  metaItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: Space.xs 
  },
  metaLabel: { 
    fontSize: Type.sizeBodySm, 
    color: Colors.textSecondary, 
    textDecorationLine: 'underline' 
  },
  aiSection: { 
    marginTop: Space.lg, 
    paddingTop: Space.lg, 
    borderTopWidth: 1, 
    borderTopColor: Colors.borderSubtle 
  },
  aiHeader: { flexDirection: 'row', gap: Space.md },
  sparkleCircle: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    backgroundColor: Colors.dark, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 2 
  },
  aiText: { 
    fontSize: Type.sizeBody, 
    lineHeight: 22, 
    color: Colors.textBody 
  },
  readMoreBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: Space.xxs, 
    marginTop: Space.sm 
  },
  readMoreText: { 
    fontSize: Type.sizeBody, 
    fontWeight: Type.weightBold, 
    color: Colors.brand, 
    textDecorationLine: 'underline' 
  },
  bottomDivider: {
    marginTop: Space.xxl,
    height: 1,
    backgroundColor: Colors.borderSubtle,
    width: '100%',
  },
});