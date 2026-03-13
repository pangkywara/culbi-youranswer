import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Sparkle, ArrowUpRight } from 'react-native-phosphor';
import { Colors, Type, Space, Radius, Shadows } from '@/constants/style';
import { TripPlanPreviewModal } from './TripPlanPreviewModal';
import type { TripItinerary } from '@/hooks/useGeminiChat';
import { buildPhotoUrl } from '@/lib/places';

// Local fallback used when all remote URLs fail to load.
const FALLBACK_IMAGE = require('@/assets/images/destinations-template.webp');

interface TripPlanBubbleProps {
  itinerary: TripItinerary;
  isUser?: boolean;
  existingTripId?: string; // When editing an existing trip
}

export const TripPlanBubble = ({ itinerary, isUser = false, existingTripId }: TripPlanBubbleProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [heroError, setHeroError] = useState(false);
  const totalStops = itinerary.days.reduce((sum, d) => sum + d.stops.length, 0);

  // Grab the first stop across all days that has a photo reference
  const heroPhotoRef = itinerary.days
    .flatMap(d => d.stops)
    .find(s => s.photo_reference)?.photo_reference;

  // Build hero image source: prefer an enriched photo from the DB/Places API,
  // then fall back to the local destinations image if loading fails.
  const heroSource = heroError || !heroPhotoRef
    ? FALLBACK_IMAGE
    : { uri: buildPhotoUrl(heroPhotoRef, { maxWidth: 600 }) };

  return (
    <>
      <View style={[styles.wrapper, isUser ? styles.userAlign : styles.aiAlign]}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.card, isUser ? styles.userCard : styles.aiCard]}
          onPress={() => setModalOpen(true)}
        >
          {/* Top Section: Typography & Branding */}
          <View style={styles.contentSection}>
            <View style={styles.headerRow}>
              <Text style={styles.tripName} numberOfLines={2}>{itinerary.tripName}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Top rated</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.dateLabel}>{itinerary.duration}</Text>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.stopsLabel}>{totalStops} stops</Text>
            </View>

            <Text style={styles.description} numberOfLines={2}>
              {itinerary.days[0]?.title || "A curated cultural journey specifically designed for you."}
            </Text>

            <View style={styles.priceRow}>
              <Text style={styles.priceText}>AI Generated</Text>
              <View style={styles.actionCircle}>
                <ArrowUpRight size={18} color={Colors.white} weight="bold" />
              </View>
            </View>
          </View>

          {/* Bottom Section: Hero Image */}
          <View style={styles.imageWrapper}>
            <Image
              source={heroSource}
              style={styles.heroImage}
              contentFit="cover"
              transition={300}
              onError={() => setHeroError(true)}
            />
            {/* Sparkle Badge Floating on Image */}
            <View style={styles.sparkleBadge}>
              <Sparkle size={12} color={Colors.white} weight="fill" />
              <Text style={styles.sparkleBadgeText}>CULBI</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <TripPlanPreviewModal 
        isVisible={modalOpen} 
        itinerary={itinerary} 
        onClose={() => setModalOpen(false)}
        existingTripId={existingTripId}
      />
    </>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginVertical: Space.md, width: '100%', flexDirection: 'row' },
  userAlign: { justifyContent: 'flex-end', paddingLeft: 60 },
  aiAlign: { justifyContent: 'flex-start', paddingRight: 60 },
  card: {
    width: 280, // Slightly wider for the "Poster" look
    backgroundColor: '#F2F2F7',
    borderRadius: 18,
    borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E5E5EA',
    overflow: 'hidden',
    ...Shadows.level3,
  },
  userCard: { borderBottomRightRadius: Radius.xs },
  aiCard: { borderBottomLeftRadius: Radius.xs },

  // Typography Section
  contentSection: {
    padding: Space.xl,
    paddingBottom: Space.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Space.sm,
  },
  tripName: {
    flex: 1,
    fontSize: 22,
    fontWeight: Type.weightBold,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Space.xs,
    gap: 6,
  },
  dateLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: Type.weightMedium },
  dot: { fontSize: 12, color: Colors.textTertiary },
  stopsLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: Type.weightMedium },

  description: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: Space.sm,
    lineHeight: 16,
  },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Space.xl,
  },
  priceText: {
    fontSize: 16,
    fontWeight: Type.weightBold,
    color: Colors.textPrimary,
  },
  actionCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Image Section
  imageWrapper: {
    height: 180,
    width: '100%',
    padding: Space.sm, // Inset image look
  },
  heroImage: {
    flex: 1,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
  },
  sparkleBadge: {
    position: 'absolute',
    bottom: Space.lg,
    left: Space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  sparkleBadgeText: {
    fontSize: 9,
    fontWeight: Type.weightBold,
    color: Colors.white,
    letterSpacing: 1,
  },
});