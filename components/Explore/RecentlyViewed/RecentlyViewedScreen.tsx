/**
 * components/Explore/RecentlyViewed/RecentlyViewedScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen "Recently viewed" page.
 *
 * Features:
 *  - Back button (ArrowLeft) and "Edit" button in the header
 *  - Large "Recently viewed" title
 *  - Destinations grouped by date (Today / Yesterday / weekday date)
 *  - Two-column card grid per group using RecentlyViewedCard
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'react-native-phosphor';
import { useRouter } from 'expo-router';

import { Colors, Type, Space, Radius } from '@/constants/style';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { CulturalExperience } from '@/types';
import { RecentlyViewedCard } from './RecentlyViewedCard';

// ─── Date-grouping helpers ────────────────────────────────────────────────────

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateLabel(viewedAt: string): string {
  const d = new Date(viewedAt);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameLocalDay(d, today)) return 'Today';
  if (isSameLocalDay(d, yesterday)) return 'Yesterday';

  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

type DateGroup = { label: string; items: CulturalExperience[] };

function groupByDate(items: CulturalExperience[]): DateGroup[] {
  const map = new Map<string, CulturalExperience[]>();

  for (const item of items) {
    const label = item.viewedAt ? formatDateLabel(item.viewedAt) : 'Recent';
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  }

  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RecentlyViewedScreen() {
  const router = useRouter();
  const { recentlyViewed, clearHistory } = useRecentlyViewed();

  const groups = useMemo(() => groupByDate(recentlyViewed), [recentlyViewed]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>

      {/* ── Header row ── */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={20} color={Colors.textPrimary} weight="bold" />
        </Pressable>

        <Pressable
          onPress={clearHistory}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.editText}>Clear All</Text>
        </Pressable>
      </View>

      {/* ── Page title ── */}
      <Text style={styles.pageTitle}>Recently{'\n'}viewed</Text>

      {/* ── Date-grouped grid ── */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {groups.length === 0 ? (
          <Text style={styles.emptyText}>Nothing here yet.</Text>
        ) : (
          groups.map(group => (
            <View key={group.label} style={styles.group}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              <View style={styles.grid}>
                {group.items.map(exp => (
                  <RecentlyViewedCard
                    key={exp.id}
                    experience={exp}
                    onPress={() => router.push(`/destinations/${exp.id}`)}
                  />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? Space.xxxl : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space.xxl,
    paddingTop: Space.lg,
    paddingBottom: Space.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editText: {
    fontSize: Type.sizeBody,
    fontWeight: Type.weight700,
    color: Colors.textPrimary,
    textDecorationLine: 'underline',
  },
  pageTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.textPrimary,
    lineHeight: 42,
    paddingHorizontal: Space.xxl,
    marginTop: Space.lg,
    marginBottom: Space.xl,
  },
  scroll: {
    paddingHorizontal: Space.xxl,
    paddingBottom: 48,
  },
  group: {
    marginBottom: Space.xxl,
  },
  groupLabel: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightSemibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Space.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.md,
  },
  emptyText: {
    fontSize: Type.sizeBody,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 48,
  },
});
