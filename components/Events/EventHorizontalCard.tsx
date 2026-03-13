/**
 * EventHorizontalCard.tsx
 * ──────────────────────
 * Vertical card (image top / info below) sized identically to ExperienceCard
 * so it fits the same HorizontalSection / animated card slot on the home screen.
 */

import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { CalendarBlank, MapPin } from 'react-native-phosphor';
import { Colors, Type, Space, Radius, Shadows } from '@/constants/style';
import { AseanEvent, formatEventDateRange } from '@/hooks/useEvents';

const FALLBACK =
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=500&q=75';

const CATEGORY_COLORS: Record<string, string> = {
  festivals:        '#E67E22',
  concerts:         '#8E44AD',
  sports:           '#27AE60',
  expos:            '#2980B9',
  observances:      '#C0392B',
  conferences:      '#16A085',
  community:        '#F39C12',
  'performing-arts':'#9B59B6',
};

function catColor(c: string) {
  return CATEGORY_COLORS[c] ?? Colors.brand;
}
function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ') : s;
}

interface EventHorizontalCardProps {
  event: AseanEvent;
  onPress: () => void;
}

export const EventHorizontalCard = memo(function EventHorizontalCard({
  event,
  onPress,
}: EventHorizontalCardProps) {
  const dateRange = formatEventDateRange(event.start_dt, event.end_dt);
  const location  = [event.city, event.country_name].filter(Boolean).join(', ');

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* ── Image ── */}
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: event.image_url ?? FALLBACK }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
        />
        {/* Category badge */}
        <View style={[styles.catBadge]}>
          <Text style={styles.catText}>{capitalize(event.category)}</Text>
        </View>
      </View>

      {/* ── Info ── */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{event.title}</Text>

        <View style={styles.metaRow}>
          <CalendarBlank size={12} color={Colors.textSecondary} weight="bold" />
          <Text style={styles.metaText} numberOfLines={1}>{dateRange}</Text>
        </View>

        <View style={styles.metaRow}>
          <MapPin size={12} color={Colors.textSecondary} weight="bold" />
          <Text style={styles.metaText} numberOfLines={1}>{location}</Text>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { width: '100%' },

  imageWrapper: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: Colors.surfacePale,
    position: 'relative',
    ...Shadows.level5,
  },
  image: { width: '100%', height: '100%' },

  catBadge: {
    position: "absolute",
    top: Space.md,
    left: Space.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderRadius: Radius.full,
  },
  catText: {
    fontSize: Type.sizeSmall,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
  },

  info: { paddingTop: Space.sm, gap: 3 },

  title: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weight700,
    color: Colors.textPrimary,
    lineHeight: 19,
    marginBottom: 1,
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
});
