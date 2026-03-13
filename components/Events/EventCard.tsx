/**
 * EventCard.tsx
 * ─────────────
 * Horizontal card (image-left / text-right) used on the Events index screen.
 */

import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { CalendarBlank, MapPin, Users } from 'react-native-phosphor';
import { Colors, Type, Space, Radius, Shadows } from '@/constants/style';
import { AseanEvent, formatEventDateRange } from '@/hooks/useEvents';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=400&q=70';


function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
}

function attendanceLabel(n: number | null) {
  if (!n) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M attending`;
  if (n >= 1_000)     return `${Math.round(n / 1_000)}K attending`;
  return `${n} attending`;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface EventCardProps {
  event: AseanEvent;
  onPress: () => void;
}

export const EventCard = memo(function EventCard({ event, onPress }: EventCardProps) {
  const dateRange   = formatEventDateRange(event.start_dt, event.end_dt);
  const location    = [event.city, event.country_name].filter(Boolean).join(', ');
  const attendance  = attendanceLabel(event.phq_attendance);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      {/* ── Left: image ── */}
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: event.image_url ?? FALLBACK_IMAGE }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
        />
        {/* Category badge overlaid on image */}
        <View style={[styles.catBadge,]}>
          <Text style={styles.catBadgeText}>{capitalize(event.category)}</Text>
        </View>
      </View>

      {/* ── Right: info ── */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{event.title}</Text>

        <View style={styles.metaRow}>
          <CalendarBlank size={13} color={Colors.textSecondary} weight="bold" />
          <Text style={styles.metaText} numberOfLines={1}>{dateRange}</Text>
        </View>

        <View style={styles.metaRow}>
          <MapPin size={13} color={Colors.textSecondary} weight="bold" />
          <Text style={styles.metaText} numberOfLines={1}>{location}</Text>
        </View>

        {attendance && (
          <View style={styles.metaRow}>
            <Users size={13} color={Colors.textSecondary} weight="bold" />
            <Text style={styles.metaText}>{attendance}</Text>
          </View>
        )}

        {event.venue_name && (
          <Text style={styles.venue} numberOfLines={1}>{event.venue_name}</Text>
        )}
      </View>
    </Pressable>
  );
});

// ── Styles ────────────────────────────────────────────────────────────────────

const IMAGE_SIZE = 110;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.cardLg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginHorizontal: Space.xl,
    marginBottom: Space.md,
    ...Shadows.level2,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },

  // Image side
  imageWrapper: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    flexShrink: 0,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  catBadge: {
    position: "absolute",
    top: Space.md,
    left: Space.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderRadius: Radius.full,
  },
  catBadgeText: {
    fontSize: Type.sizeSmall,
    fontWeight: Type.weightSemibold,
    color: Colors.white,
  },

  // Info side
  info: {
    flex: 1,
    paddingHorizontal: Space.md,
    paddingVertical: Space.md,
    justifyContent: 'center',
    gap: 4,
  },
  title: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weight700,
    color: Colors.textPrimary,
    marginBottom: 2,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
  },
  metaText: {
    fontSize: Type.sizeSmall,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  venue: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },
});
