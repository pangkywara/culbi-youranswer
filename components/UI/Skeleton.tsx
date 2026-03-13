/**
 * components/UI/Skeleton.tsx
 *
 * Shared animated skeleton-loading components used across Missions, Points, and
 * Explorer screens.  Each component mirrors the exact layout of its real
 * counterpart so the transition feels seamless.
 *
 * Animation: a gentle opacity pulse (0.35 → 1 → 0.35) driven by
 * Animated.loop so it works even without the Reanimated worklet thread.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { Colors, Space, Radius } from '@/constants/style';

// ─── Shared pulse hook ────────────────────────────────────────────────────────

function usePulse() {
  const anim = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1,    duration: 850, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.35, duration: 850, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return anim;
}

// ─── Generic box ─────────────────────────────────────────────────────────────

interface BoxProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: object;
}

export function SkeletonBox({ width = '100%', height = 14, radius = 7, style }: BoxProps) {
  const pulse = usePulse();
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: Colors.surfaceMuted, opacity: pulse },
        style,
      ]}
    />
  );
}

// ─── Mission item skeleton ────────────────────────────────────────────────────
// Mirrors: components/Missions/Structure/MissionItem.tsx

export function MissionSkeletonItem() {
  const pulse = usePulse();
  return (
    <Animated.View
      style={{
        opacity: pulse,
        flexDirection: 'row',
        paddingHorizontal: Space.xxl,
        paddingVertical: Space.sm,
      }}
    >
      {/* Icon circle */}
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: Radius.lg,
          backgroundColor: Colors.surfaceMuted,
          marginRight: Space.lg,
          flexShrink: 0,
        }}
      />

      {/* Content */}
      <View
        style={{
          flex: 1,
          borderBottomWidth: 1,
          borderBottomColor: Colors.borderSubtle,
          paddingBottom: Space.lg,
        }}
      >
        {/* Title row */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
          }}
        >
          <View style={{ width: '55%', height: 14, borderRadius: 7, backgroundColor: Colors.surfaceMuted }} />
          <View style={{ width: '18%', height: 12, borderRadius: 6, backgroundColor: Colors.surfaceMuted }} />
        </View>

        {/* Description */}
        <View style={{ width: '78%', height: 12, borderRadius: 6, backgroundColor: Colors.surfaceMuted, marginBottom: 10 }} />

        {/* Reward row */}
        <View style={{ width: '38%', height: 10, borderRadius: 5, backgroundColor: Colors.surfaceMuted }} />
      </View>
    </Animated.View>
  );
}

// ─── XP row skeleton (points screen) ─────────────────────────────────────────
// Mirrors: app/points/index.tsx → XPRow

export function XPRowSkeleton() {
  const pulse = usePulse();
  return (
    <Animated.View
      style={{
        opacity: pulse,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Space.xl,
        paddingVertical: Space.lg,
        gap: Space.md,
      }}
    >
      {/* Icon */}
      <View style={{ width: 44, height: 44, borderRadius: Radius.lg, backgroundColor: Colors.surfaceMuted }} />

      {/* Info */}
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ width: '58%', height: 14, borderRadius: 7, backgroundColor: Colors.surfaceMuted }} />
        <View style={{ width: '38%', height: 12, borderRadius: 6, backgroundColor: Colors.surfaceMuted }} />
      </View>

      {/* Badge + date */}
      <View style={{ alignItems: 'flex-end', gap: 5 }}>
        <View style={{ width: 58, height: 14, borderRadius: Radius.full, backgroundColor: Colors.surfaceMuted }} />
        <View style={{ width: 38, height: 10, borderRadius: 5, backgroundColor: Colors.surfaceMuted }} />
      </View>
    </Animated.View>
  );
}

// ─── Leaderboard row skeleton (explorer screen) ──────────────────────────────
// Mirrors: app/explorer/index.tsx → LeaderRow

export function LeaderRowSkeleton() {
  const pulse = usePulse();
  return (
    <Animated.View
      style={{
        opacity: pulse,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Space.xl,
        paddingVertical: Space.lg,
        gap: Space.md,
      }}
    >
      {/* Rank */}
      <View style={{ width: 28, height: 14, borderRadius: 6, backgroundColor: Colors.surfaceMuted }} />

      {/* Avatar */}
      <View style={{ width: 44, height: 44, borderRadius: Radius.full, backgroundColor: Colors.surfaceMuted }} />

      {/* Info */}
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ width: '48%', height: 14, borderRadius: 7, backgroundColor: Colors.surfaceMuted }} />
        <View style={{ width: '30%', height: 12, borderRadius: 6, backgroundColor: Colors.surfaceMuted }} />
      </View>

      {/* XP */}
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <View style={{ width: 48, height: 14, borderRadius: 7, backgroundColor: Colors.surfaceMuted }} />
        <View style={{ width: 24, height: 10, borderRadius: 5, backgroundColor: Colors.surfaceMuted }} />
      </View>
    </Animated.View>
  );
}

// ─── Profile header card skeleton ────────────────────────────────────────────
// Mirrors: components/Profiles/ProfileHeaderCard.tsx

export function ProfileHeaderSkeleton() {
  const pulse = usePulse();

  return (
    <Animated.View
      style={{
        opacity: pulse,
        borderRadius: Radius.cardLg, // Matches S.cardLg
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        padding: Space.xxl, // Matches S.cardLg padding
        marginBottom: Space.xl,
      }}
    >
      {/* Top Row: Avatar + Stats */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        
        {/* Avatar Circle with Badge Placeholder */}
        <View style={{ position: 'relative' }}>
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: Colors.surfaceMuted,
            }}
          />
          {/* Badge Placeholder */}
          <View 
            style={{ 
              position: 'absolute', 
              bottom: 0, 
              right: 0, 
              width: 28, 
              height: 28, 
              borderRadius: Radius.lg, 
              backgroundColor: Colors.white,
              borderWidth: 2,
              borderColor: Colors.white 
            }} 
          />
        </View>

        {/* Stats Column */}
        <View style={{ flex: 1, marginLeft: Space.xxl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Stat 1 */}
            <View style={{ alignItems: 'center', flex: 1, gap: 4 }}>
              <View style={{ width: 32, height: 22, borderRadius: 4, backgroundColor: Colors.surfaceMuted }} />
              <View style={{ width: 44, height: 12, borderRadius: 4, backgroundColor: Colors.surfaceMuted }} />
            </View>
            
            {/* Vertical Divider */}
            <View style={{ width: 1, height: 24, backgroundColor: Colors.borderSubtle }} />
            
            {/* Stat 2 */}
            <View style={{ alignItems: 'center', flex: 1, gap: 4 }}>
              <View style={{ width: 32, height: 22, borderRadius: 4, backgroundColor: Colors.surfaceMuted }} />
              <View style={{ width: 44, height: 12, borderRadius: 4, backgroundColor: Colors.surfaceMuted }} />
            </View>
            
            {/* Vertical Divider */}
            <View style={{ width: 1, height: 24, backgroundColor: Colors.borderSubtle }} />
            
            {/* Stat 3 */}
            <View style={{ alignItems: 'center', flex: 1, gap: 4 }}>
              <View style={{ width: 32, height: 22, borderRadius: 4, backgroundColor: Colors.surfaceMuted }} />
              <View style={{ width: 44, height: 12, borderRadius: 4, backgroundColor: Colors.surfaceMuted }} />
            </View>
          </View>
        </View>
      </View>

      {/* Name Placeholder */}
      <View style={{ width: '60%', height: 28, borderRadius: 6, backgroundColor: Colors.surfaceMuted, marginBottom: 8 }} />
      
      {/* Region Placeholder */}
      <View style={{ width: '30%', height: 16, borderRadius: 6, backgroundColor: Colors.surfaceMuted }} />
    </Animated.View>
  );
}

// ─── Profile grid skeleton ────────────────────────────────────────────────────
// Mirrors: components/Profiles/ProfileGrid.tsx

export function ProfileGridSkeleton() {
  const pulse = usePulse();
  return (
    <Animated.View
      style={{ opacity: pulse, flexDirection: 'row', gap: Space.lg, marginBottom: Space.xl }}
    >
      {[0, 1].map((i) => (
        <View
          key={i}
          style={{
            flex: 1,
            borderRadius: Radius.card,
            backgroundColor: Colors.white,
            borderWidth: 1,
            borderColor: Colors.borderSubtle,
            padding: Space.lg,
            alignItems: 'center',
          }}
        >
          {/* Image area */}
          <View
            style={{
              width: '100%',
              height: 100,
              borderRadius: Radius.md,
              backgroundColor: Colors.surfaceMuted,
              marginBottom: 10,
            }}
          />
          {/* Title */}
          <View style={{ width: '65%', height: 13, borderRadius: 6, backgroundColor: Colors.surfaceMuted }} />
        </View>
      ))}
    </Animated.View>
  );
}

// ─── Collections card skeleton ────────────────────────────────────────────────
// Mirrors: components/Profiles/CollectionsCard.tsx

export function CollectionsCardSkeleton() {
  const pulse = usePulse();
  return (
    <Animated.View
      style={{
        opacity: pulse,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: Radius.card,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        padding: Space.lg,
        marginBottom: 30,
      }}
    >
      {/* Circular image */}
      <View
        style={{
          width: 100,
          height: 100,
          borderRadius: Radius.full,
          backgroundColor: Colors.surfaceMuted,
        }}
      />
      {/* Text lines */}
      <View style={{ flex: 1, marginLeft: Space.lg, gap: 8 }}>
        <View style={{ width: '65%', height: 15, borderRadius: 7, backgroundColor: Colors.surfaceMuted }} />
        <View style={{ width: '95%', height: 12, borderRadius: 6, backgroundColor: Colors.surfaceMuted }} />
        <View style={{ width: '75%', height: 12, borderRadius: 6, backgroundColor: Colors.surfaceMuted }} />
      </View>
    </Animated.View>
  );
}

// ─── Settings list skeleton ───────────────────────────────────────────────────
// Mirrors: components/Profiles/SettingsList.tsx

export function SettingsListSkeleton() {
  const pulse = usePulse();
  return (
    <Animated.View style={{ opacity: pulse }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: Space.lg,
            borderBottomWidth: i < 2 ? 1 : 0,
            borderBottomColor: Colors.borderSubtle,
            gap: Space.md,
          }}
        >
          {/* Icon circle */}
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: Radius.full,
              backgroundColor: Colors.surfaceMuted,
            }}
          />
          {/* Label */}
          <View style={{ flex: 1, height: 13, borderRadius: 6, backgroundColor: Colors.surfaceMuted, width: '50%' }} />
          {/* Caret */}
          <View style={{ width: 16, height: 16, borderRadius: 5, backgroundColor: Colors.surfaceMuted }} />
        </View>
      ))}
    </Animated.View>
  );
}

// ─── Passport stats card skeleton ─────────────────────────────────────────────
// Mirrors: components/Collections/PassportStatsCard.tsx

export function PassportStatsCardSkeleton() {
  const pulse = usePulse();
  return (
    <Animated.View
      style={{
        opacity: pulse,
        borderRadius: Radius.card,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        padding: 18,
        marginBottom: Space.xxl,
      }}
    >
      {/* Title */}
      <View style={{ width: '35%', height: 12, borderRadius: 6, backgroundColor: Colors.surfaceMuted, marginBottom: 14 }} />
      {/* Stat boxes row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ alignItems: 'center', gap: 7, flex: 1 }}>
            <View style={{ width: 36, height: 18, borderRadius: 7, backgroundColor: Colors.surfaceMuted }} />
            <View style={{ width: 44, height: 11, borderRadius: 5, backgroundColor: Colors.surfaceMuted }} />
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

// ─── Cultural card grid skeleton ──────────────────────────────────────────────
// Mirrors: components/Collections/CulturalCardGrid.tsx — shows 2 rarity sections

const CARD_SKELETON_WIDTH = 160;
const CARD_SKELETON_HEIGHT = Math.round(CARD_SKELETON_WIDTH * 1.4);

export function CulturalCardGridSkeleton() {
  const pulse = usePulse();
  return (
    <Animated.View style={{ opacity: pulse, paddingTop: 8 }}>
      {[0, 1].map((sectionIdx) => (
        <View key={sectionIdx} style={{ marginBottom: 32 }}>
          {/* Section header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 18,
              paddingHorizontal: 20,
            }}
          >
            <View style={{ width: '42%', height: 16, borderRadius: 7, backgroundColor: Colors.surfaceMuted }} />
            <View style={{ width: 60, height: 26, borderRadius: Radius.full, backgroundColor: Colors.surfaceMuted }} />
          </View>

          {/* Horizontal card row */}
          <View style={{ flexDirection: 'row', paddingLeft: 20, gap: 15 }}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  width: CARD_SKELETON_WIDTH,
                  height: CARD_SKELETON_HEIGHT,
                  borderRadius: Math.round(CARD_SKELETON_WIDTH * 0.07),
                  backgroundColor: Colors.surfaceMuted,
                }}
              />
            ))}
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

// ─── Passport card grid skeleton ──────────────────────────────────────────────
// Mirrors: components/Collections/PassportsCard.tsx — 2-column grid

export function PassportGridSkeleton() {
  const pulse = usePulse();
  return (
    <Animated.View
      style={{
        opacity: pulse,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
      }}
    >
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ width: '48%', padding: Space.lg, marginBottom: 14 }}>
          {/* Passport image placeholder */}
          <View
            style={{
              height: 160,
              borderRadius: Radius.lg,
              backgroundColor: Colors.surfaceMuted,
              marginBottom: Space.md,
            }}
          />
          {/* Title */}
          <View
            style={{
              width: '70%',
              height: 12,
              borderRadius: 6,
              backgroundColor: Colors.surfaceMuted,
              alignSelf: 'center',
            }}
          />
        </View>
      ))}
    </Animated.View>
  );
}

// ─── Conversation item skeleton (Bridge / Messages screen) ───────────────────
// Mirrors: components/Messages/Bridge/ConversationItem.tsx

export function ConversationItemSkeleton() {
  const pulse = usePulse();
  return (
    <Animated.View
      style={{
        opacity: pulse,
        flexDirection: 'row',
        paddingHorizontal: Space.xxl,
        paddingVertical: Space.lg,
        alignItems: 'center',
      }}
    >
      {/* Avatar circle */}
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: Colors.surfaceMuted,
          marginRight: Space.lg,
          flexShrink: 0,
        }}
      />

      {/* Content */}
      <View style={{ flex: 1, gap: 7 }}>
        {/* Title + time row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ width: '45%', height: 14, borderRadius: 7, backgroundColor: Colors.surfaceMuted }} />
          <View style={{ width: '18%', height: 11, borderRadius: 5, backgroundColor: Colors.surfaceMuted }} />
        </View>
        {/* Last message */}
        <View style={{ width: '75%', height: 12, borderRadius: 6, backgroundColor: Colors.surfaceMuted }} />
        {/* Date subtext */}
        <View style={{ width: '32%', height: 10, borderRadius: 5, backgroundColor: Colors.surfaceMuted }} />
      </View>
    </Animated.View>
  );
}

// ─── Bridge inbox skeleton — renders N conversation item skeletons ─────────────

interface BridgeSkeletonProps {
  count?: number;
}

export function BridgeSkeleton({ count = 8 }: BridgeSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <ConversationItemSkeleton key={i} />
      ))}
    </>
  );
}
