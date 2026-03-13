import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  InteractionManager,
  Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Trophy, Crown, Medal, CaretLeft } from 'react-native-phosphor';
import { Colors, Type, Space, Radius, Shadows, S } from '@/constants/style';
import { useAuth } from '@/context/AuthContext';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import type { LeaderboardEntry } from '@/types/database';
import { LeaderRowSkeleton } from '@/components/UI/Skeleton';

// ─── Rank icon ───────────────────────────────────────────────────────────────

function RankIcon({ position }: { position: number }) {
  if (position === 1) return <Crown size={22} color="#FFB800" weight="fill" />;
  if (position === 2) return <Medal size={22} color="#AAAAAA" weight="fill" />;
  if (position === 3) return <Medal size={22} color="#CD7F32" weight="fill" />;
  return <Text style={styles.rankNum}>#{position}</Text>;
}

// ─── Podium (top 3) ──────────────────────────────────────────────────────────

function Podium({ data }: { data: LeaderboardEntry[] }) {
  const top3    = data.slice(0, 3);
  // Reorder for visual podium: [Silver (2), Gold (1), Bronze (3)]
  const ordered = [top3[1], top3[0], top3[2]];
  const sizes   = [76, 96, 76];
  const offsets = [Space.lg, 0, Space.lg];

  return (
    <View style={styles.podium}>
      {ordered.map((item, i) =>
        item ? (
          <View key={item.user_id} style={[styles.podiumItem, { marginTop: offsets[i] }]}>
            <View
              style={[
                styles.avatarCircle,
                { width: sizes[i], height: sizes[i], borderRadius: sizes[i] / 2 },
                i === 1 && styles.avatarGold,
              ]}
            >
              <Text style={[styles.avatarText, i === 1 && { fontSize: 26 }]}>
                {(item.full_name ?? '?').charAt(0)}
              </Text>
              {i === 1 && (
                <View style={styles.crownOverlay}>
                  <Crown size={20} color="#FFB800" weight="fill" />
                </View>
              )}
            </View>
            <Text style={S.titleSemi} numberOfLines={1}>{item.full_name ?? 'Explorer'}</Text>
            <Text style={S.subtitle}>{item.total_xp.toLocaleString()} XP</Text>
          </View>
        ) : (
          <View key={i} style={{ flex: 1 }} />
        )
      )}
    </View>
  );
}

// ─── Leaderboard row ─────────────────────────────────────────────────────────

const LeaderRow = React.memo(function LeaderRow({
  item,
  isMe,
}: {
  item: LeaderboardEntry;
  isMe: boolean;
}) {
  return (
    <View style={[styles.row, isMe && styles.rowHighlight]}>
      <View style={styles.rankCol}>
        <RankIcon position={item.rank} />
      </View>
      <View style={styles.avatarSm}>
        <Text style={styles.avatarSmText}>{(item.full_name ?? '?').charAt(0)}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={[S.body, isMe && { color: Colors.brand }]}>
          {item.full_name ?? 'Explorer'}{isMe ? ' (You)' : ''}
        </Text>
        <Text style={S.caption}>{item.region ?? '—'}</Text>
      </View>
      <View style={styles.xpCol}>
        <Text style={[styles.xpValue, isMe && { color: Colors.brand }]}>
          {item.total_xp.toLocaleString()}
        </Text>
        <Text style={S.label}>XP</Text>
      </View>
    </View>
  );
});

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ExplorerScreen() {
  const [activeTab, setActiveTab] = useState<'top' | 'ranked'>('top');
  const [isReady, setIsReady]     = useState(false);
  const { profile, session }      = useAuth();
  const router                    = useRouter();
  const { leaders, userRank, loading, refetch } = useLeaderboard(20);

  const myUserId = session?.user?.id;

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        setIsReady(true);
        refetch();
      });
      return () => task.cancel();
    }, [refetch])
  );

  const listData = activeTab === 'top' ? leaders.slice(3) : leaders;

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
          <Text style={S.title}>Explorer</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item) => item.user_id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={{ paddingTop: Space.xl }}>
            {/* ── Your card (ranked tab) ── */}
            {activeTab === 'ranked' && (
              <View style={S.screenPadding}>
                <View style={styles.myCard}>
                  <View style={styles.myCardLeft}>
                    <View style={[styles.avatarCircle, styles.avatarGold, { width: 52, height: 52, borderRadius: 26 }]}>
                      <Text style={styles.avatarText}>
                        {(profile?.full_name ?? 'Y').charAt(0)}
                      </Text>
                    </View>
                    <View>
                      <Text style={[S.title, { color: Colors.textPrimary }]}>{profile?.full_name ?? 'You'}</Text>
                      <Text style={[S.subtitle, { color: Colors.textSecondary }]}>{profile?.region ?? 'Explorer'}</Text>
                    </View>
                  </View>
                  <View style={styles.xpCol}>
                    <Text style={[styles.xpValue, { color: Colors.brand, fontSize: 22 }]}>
                      {(userRank?.total_xp ?? profile?.total_xp ?? 0).toLocaleString()}
                    </Text>
                    <Text style={[S.label, { color: Colors.textSecondary }]}>
                      XP{userRank ? ` · #${userRank.rank}` : ''}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* ── Tabs ── */}
            <View style={styles.tabsContainer}>
              <View style={styles.tabsInner}>
                {(['top', 'ranked'] as const).map(tab => (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    style={[styles.tab, activeTab === tab && styles.tabActive]}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                      {tab === 'top' ? 'Top Rank' : 'Ranked'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── Podium (top tab only) ── */}
            {activeTab === 'top' && leaders.length >= 3 && <Podium data={leaders} />}

            {/* ── Section label ── */}
            <View style={S.screenPadding}>
              <Text style={styles.sectionLabel}>
                {activeTab === 'top' ? 'Leaderboard' : 'All Explorers'}
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <LeaderRow item={item} isMe={item.user_id === myUserId} />
        )}
        ItemSeparatorComponent={() => <View style={[S.divider, { marginHorizontal: Space.xl }]} />}
        ListEmptyComponent={
          loading ? (
            <View>
              {Array.from({ length: 10 }, (_, i) => (
                <LeaderRowSkeleton key={String(i)} />
              ))}
            </View>
          ) : (
            <Text style={styles.empty}>No rankings yet</Text>
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

  // ── Tabs ──
  tabsContainer: {
    paddingHorizontal: Space.xl,
    marginBottom: Space.xl,
  },
  tabsInner: {
    flexDirection: 'row',
    backgroundColor: Colors.surfacePale,
    borderRadius: Radius.lg,
    padding: Space.xxs,
  },
  tab: {
    flex: 1,
    paddingVertical: Space.sm + 2,
    alignItems: 'center',
    borderRadius: Radius.md,
  },
  tabActive: { backgroundColor: Colors.white, ...Shadows.level1 },
  tabText:   { fontSize: Type.sizeBodySm, fontWeight: Type.weightMedium, color: Colors.textSecondary },
  tabTextActive: { color: Colors.textPrimary, fontWeight: Type.weightSemibold },

  // ── Podium ──
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: Space.xl,
    marginBottom: Space.xxxl,
    gap: Space.lg,
  },
  podiumItem: {
    flex: 1,
    alignItems: 'center',
    gap: Space.xs,
  },
  avatarCircle: {
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Shadows.level1,
  },
  avatarGold: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.brand,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: Type.weight700,
    color: Colors.textPrimary,
  },
  crownOverlay: { position: 'absolute', top: -14 },

  // ── Your card (Dark variant) ──
  myCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Space.xl,
    padding: Space.xl,
    borderRadius: Radius.cardLg,
    backgroundColor: Colors.surfaceBase,
    ...Shadows.level3,
  },
  myCardLeft: { flexDirection: 'row', alignItems: 'center', gap: Space.md },

  // ── Section label ──
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
  rowHighlight: {
    backgroundColor: Colors.surfaceMuted,
  },
  rankCol: { width: 32, alignItems: 'center' },
  rankNum: { fontSize: Type.sizeBodySm, fontWeight: Type.weightSemibold, color: Colors.textSecondary },
  avatarSm: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmText: { fontSize: Type.sizeBody, fontWeight: Type.weight700, color: Colors.textPrimary },
  rowInfo: { flex: 1 },
  xpCol:     { alignItems: 'flex-end' },
  xpValue:   { fontSize: Type.sizeBody, fontWeight: Type.weight700, color: Colors.textPrimary },

  empty: { 
    textAlign: 'center', 
    marginTop: Space.xxxl, 
    color: Colors.textSecondary, 
    fontSize: Type.sizeBody,
    paddingHorizontal: Space.xl 
  },
});