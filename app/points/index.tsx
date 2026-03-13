import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  InteractionManager,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Star, ArrowUp, CaretLeft } from 'react-native-phosphor';
import { Colors, Type, Space, Radius, Shadows, S } from '@/constants/style';
import { useAuth } from '@/context/AuthContext';
import { useXpLedger, type XPEntry } from '@/hooks/useXpLedger';
import { XPRowSkeleton } from '@/components/UI/Skeleton';

// ─── Level progression ────────────────────────────────────────────────────────

const LEVEL_DATA = [
  { label: 'Newcomer',      min: 0    },
  { label: 'Explorer',      min: 200  },
  { label: 'Adventurer',    min: 500  },
  { label: 'Trailblazer',   min: 1000 },
  { label: 'Navigator',     min: 2000 },
  { label: 'Grand Explorer',min: 4000 },
];

function getCurrentLevel(xp: number) {
  let level = LEVEL_DATA[0];
  for (const l of LEVEL_DATA) {
    if (xp >= l.min) level = l;
  }
  return level;
}

function getNextLevel(xp: number) {
  for (let i = 0; i < LEVEL_DATA.length; i++) {
    if (xp < LEVEL_DATA[i].min) return LEVEL_DATA[i];
  }
  return null;
}

// ─── XP Row ───────────────────────────────────────────────────────────────────

const XPRow = React.memo(function XPRow({ item }: { item: XPEntry }) {
  const IconComp = item.icon;
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: item.iconBg || Colors.surfaceMuted }]}>
        <IconComp size={20} color={item.iconColor || Colors.brand} weight="fill" />
      </View>
      <View style={styles.rowInfo}>
        <Text style={S.titleSemi}>{item.title}</Text>
        <Text style={S.subtitle} numberOfLines={1}>{item.description}</Text>
      </View>
      <View style={styles.rowRight}>
        <View style={styles.xpBadge}>
          <ArrowUp size={11} color={Colors.brand} weight="bold" />
          <Text style={styles.xpBadgeText}>{item.xp} XP</Text>
        </View>
        <Text style={S.caption}>{item.date}</Text>
      </View>
    </View>
  );
});

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function PointsHistoryScreen() {
  const [isReady, setIsReady] = useState(false);
  const { profile } = useAuth();
  const { entries, loading, refetch } = useXpLedger(50);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        setIsReady(true);
        refetch();
      });
      return () => task.cancel();
    }, [refetch])
  );

  const currentXp = profile?.total_xp ?? 0;
  const currentLevel = getCurrentLevel(currentXp);
  const nextLevel = getNextLevel(currentXp);
  const progress = nextLevel
    ? (currentXp - currentLevel.min) / (nextLevel.min - currentLevel.min)
    : 1;

  if (!isReady) return <View style={S.screen} />;

  return (
    <SafeAreaView style={S.screen}>
      {/* ── Nav header ── */}
      <View style={styles.navHeader}>
        <View style={styles.navContent}>
          <TouchableOpacity
            style={S.btnIcon}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <CaretLeft size={20} weight="bold" color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={S.title}>Points</Text>
          <View style={{ width: 40 }} /> 
        </View>
      </View>

      <FlatList
        data={entries}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={S.screenPadding}>
            {/* ── XP stat card ── */}
            <View style={styles.statCard}>
              <View style={styles.statLeft}>
                <Text style={styles.statXp}>{currentXp.toLocaleString()}</Text>
                <Text style={styles.statXpLabel}>Total XP</Text>
              </View>

              <View style={styles.statRight}>
                <Text style={styles.levelBadge}>{currentLevel.label}</Text>
                {nextLevel && (
                  <>
                    <View style={styles.progressBar}>
                      <View
                        style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any }]}
                      />
                    </View>
                    <Text style={styles.nextLevelText}>
                      {(nextLevel.min - currentXp).toLocaleString()} XP to {nextLevel.label}
                    </Text>
                  </>
                )}
              </View>
            </View>

            <Text style={styles.sectionLabel}>Recent Activity</Text>
          </View>
        }
        renderItem={({ item }) => <XPRow item={item} />}
        ItemSeparatorComponent={() => <View style={[S.divider, { marginHorizontal: Space.xl }]} />}
        ListEmptyComponent={
          loading ? (
            <View>
              {Array.from({ length: 8 }, (_, i) => (
                <XPRowSkeleton key={String(i)} />
              ))}
            </View>
          ) : (
            <Text style={styles.empty}>No XP activity yet.{'\n'}Complete a mission to earn points!</Text>
          )
        }
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  listContent: { paddingBottom: 100 },

  navHeader: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  navContent: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space.lg,
    marginTop: Platform.OS === 'android' ? 30 : 0,
  },

  // ── Stat card (Customized Dark Theme for focus) ──
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Space.xl,
    marginBottom: Space.xxl,
    padding: Space.xxl,
    borderRadius: Radius.cardLg,
    backgroundColor: Colors.surfaceBase, // Charcoal background
    ...Shadows.level3,
  },
  statLeft: { justifyContent: 'center' },
  statXp: {
    fontSize: Type.sizeDisplay,
    fontWeight: Type.weight700,
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  statXpLabel: {
    fontSize: Type.sizeBodySm,
    color: Colors.textPrimary,
    marginTop: Space.xxs,
  },
  statRight: { alignItems: 'flex-end', flex: 1, marginLeft: Space.xl },
  levelBadge: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightSemibold,
    color: Colors.brand, // Gamification gold accent
    marginBottom: Space.sm,
  },
  progressBar: {
    height: 6,
    width: 100,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfacePale,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
    backgroundColor: '#FFB800',
  },
  nextLevelText: {
    fontSize: Type.sizeMicro + 2,
    color: Colors.textSecondary,
    marginTop: Space.xs,
    textAlign: 'right',
  },

  sectionLabel: {
    fontSize: Type.sizeSmall,
    fontWeight: Type.weightSemibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Space.md,
  },

  // ── Rows ──
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space.xl,
    paddingVertical: Space.lg,
    gap: Space.md,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: { flex: 1 },
  rowRight: { alignItems: 'flex-end', gap: Space.xxs },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.badgeAlt,
    paddingHorizontal: Space.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  xpBadgeText: { 
    fontSize: Type.sizeSmall, 
    fontWeight: Type.weightSemibold, 
    color: Colors.brand 
  },
  empty: {
    textAlign: 'center',
    marginTop: Space.xxxl,
    color: Colors.textSecondary,
    fontSize: Type.sizeBody,
    lineHeight: 24,
    paddingHorizontal: Space.xxl,
  },
});