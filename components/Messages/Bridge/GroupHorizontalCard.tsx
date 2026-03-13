/**
 * GroupHorizontalCard.tsx
 * ───────────────────────
 * Vertical card (gradient avatar top / info below) for a PublicGroup,
 * sized identically to EventHorizontalCard so it slots into the same
 * HorizontalSection animated list on the home screen.
 */

import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { UsersThree, Lock, Globe } from 'react-native-phosphor';
import { Colors, Type, Space, Radius, Shadows } from '@/constants/style';
import type { PublicGroup } from '@/hooks/useAllGroups';

// ─── Category colour map (mirrors GroupMarker) ────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  Culture:   '#8B5CF6',
  Food:      '#F59E0B',
  Nature:    '#10B981',
  History:   '#6366F1',
  Heritage:  '#EC4899',
  Religion:  '#F97316',
  Landmark:  '#3B82F6',
  General:   '#6B7280',
};

// Unsplash category cover images as fallbacks when no avatarUrl
const CATEGORY_IMAGES: Record<string, string> = {
  Culture:   'https://images.unsplash.com/photo-1518481612222-68bbe828ecd1?w=500&q=75',
  Food:      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&q=75',
  Nature:    'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=500&q=75',
  History:   'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?w=500&q=75',
  Heritage:  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=75',
  Religion:  'https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=500&q=75',
  Landmark:  'https://images.unsplash.com/photo-1503221043305-f7498f8b763e?w=500&q=75',
};
const FALLBACK = 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=500&q=75';

function catColor(cat: string | null) {
  return cat ? (CATEGORY_COLORS[cat] ?? Colors.brand) : Colors.brand;
}
function catImage(cat: string | null) {
  return cat ? (CATEGORY_IMAGES[cat] ?? FALLBACK) : FALLBACK;
}

interface GroupHorizontalCardProps {
  group: PublicGroup;
  onPress: () => void;
}

export const GroupHorizontalCard = memo(function GroupHorizontalCard({
  group,
  onPress,
}: GroupHorizontalCardProps) {
  const color = catColor(group.category);
  const imageUri = group.avatarUrl ?? catImage(group.category);
  const memberText = group.memberCount === 1 ? '1 member' : `${group.memberCount} members`;
  const categoryLabel = group.category ?? 'General';

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* ── Image area ── */}
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
        />

        {/* Category badge */}
        <View style={styles.catBadge}>
          <Text style={styles.catText}>{categoryLabel}</Text>
        </View>

        {/* Visibility icon badge top-right */}
        <View style={[styles.visBadge, { backgroundColor: color }]}>
          {group.visibility === 'private'
            ? <Lock size={10} color={Colors.white} weight="fill" />
            : <Globe size={10} color={Colors.white} weight="fill" />
          }
        </View>
      </View>

      {/* ── Info ── */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{group.name}</Text>

        <View style={styles.metaRow}>
          <UsersThree size={12} color={Colors.textSecondary} weight="bold" />
          <Text style={styles.metaText}>{memberText}</Text>
          {group.memberLimit != null && (
            <Text style={styles.metaLimit}>/ {group.memberLimit}</Text>
          )}
        </View>

        {group.description ? (
          <Text style={styles.description} numberOfLines={2}>{group.description}</Text>
        ) : null}
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
    position: 'absolute',
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

  visBadge: {
    position: 'absolute',
    top: Space.md,
    right: Space.md,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  metaLimit: {
    fontSize: Type.sizeSmall,
    color: Colors.border,
  },

  description: {
    fontSize: Type.sizeSmall,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
});
