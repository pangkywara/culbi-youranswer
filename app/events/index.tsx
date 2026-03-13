/**
 * app/events/index.tsx
 * ────────────────────
 * ASEAN Events index screen.
 * • Sticky header with back button + title
 * • Horizontal category pill tabs
 * • Animated FlatList of horizontal EventCard entries, grouped by month
 * • Loading skeleton + empty state
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar, SmileyMeh } from 'react-native-phosphor';

import { Colors, Type, Space, Radius, Shadows, S } from '@/constants/style';
import { EventCard } from '@/components/Events/EventCard';
import {
  useEvents,
  EVENT_CATEGORIES,
  monthHeader,
  type AseanEvent,
} from '@/hooks/useEvents';

// ── Country filter pills ──────────────────────────────────────────────────────

const COUNTRIES = [
  { code: 'all', name: 'All countries' },
  { code: 'ID',  name: '🇮🇩 Indonesia'  },
  { code: 'SG',  name: '🇸🇬 Singapore'  },
  { code: 'MY',  name: '🇲🇾 Malaysia'   },
  { code: 'TH',  name: '🇹🇭 Thailand'   },
  { code: 'VN',  name: '🇻🇳 Vietnam'    },
  { code: 'PH',  name: '🇵🇭 Philippines'},
  { code: 'KH',  name: '🇰🇭 Cambodia'   },
  { code: 'MM',  name: '🇲🇲 Myanmar'    },
  { code: 'LA',  name: '🇱🇦 Laos'       },
  { code: 'BN',  name: '🇧🇳 Brunei'     },
  { code: 'TL',  name: '🇹🇱 Timor-Leste'},
];

// ── List item type (flat + month headers) ─────────────────────────────────────

type ListItem =
  | { kind: 'header'; month: string; key: string }
  | { kind: 'event';  event: AseanEvent;  key: string };

// ── Skeleton ─────────────────────────────────────────────────────────────────

function EventCardSkeleton() {
  return (
    <View style={skStyles.card}>
      <View style={skStyles.image} />
      <View style={skStyles.info}>
        <View style={[skStyles.line, { width: '80%' }]} />
        <View style={[skStyles.line, { width: '55%' }]} />
        <View style={[skStyles.line, { width: '65%' }]} />
      </View>
    </View>
  );
}

const skStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.cardLg,
    overflow: 'hidden',
    marginHorizontal: Space.xl,
    marginBottom: Space.md,
    height: 110,
  },
  image: { width: 110, height: '100%', backgroundColor: Colors.surfacePale },
  info: { flex: 1, padding: Space.md, gap: 10, justifyContent: 'center' },
  line: { height: 12, borderRadius: 6, backgroundColor: Colors.surfacePale },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [activeCategory, setActiveCategory] = useState('all');
  const [activeCountry,  setActiveCountry]  = useState('all');

  const { events, loading, error, refetch } = useEvents({
    category: activeCategory,
    country:  activeCountry !== 'all' ? activeCountry : undefined,
    limit:    200,
  });

  // ── Animated scroll header collapse ──────────────────────────────────────
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => { scrollY.value = e.contentOffset.y; },
  });

  const headerShadowStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(scrollY.value, [0, 20], [0, 0.08], Extrapolation.CLAMP),
    elevation:     interpolate(scrollY.value, [0, 20], [0, 4],    Extrapolation.CLAMP),
  }));

  // ── Group events by month ─────────────────────────────────────────────────
  const listItems = useMemo<ListItem[]>(() => {
    const result: ListItem[] = [];
    let lastMonth = '';
    for (const event of events) {
      const m = monthHeader(event.start_dt);
      if (m !== lastMonth) {
        result.push({ kind: 'header', month: m, key: `header-${m}` });
        lastMonth = m;
      }
      result.push({ kind: 'event', event, key: event.id });
    }
    return result;
  }, [events]);

  // ── Render list item ──────────────────────────────────────────────────────
  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.kind === 'header') {
      return (
        <View style={styles.monthHeader}>
          <Calendar size={14} color={Colors.textSecondary} weight="bold" />
          <Text style={styles.monthHeaderText}>{item.month}</Text>
        </View>
      );
    }
    return (
      <EventCard
        event={item.event}
        onPress={() => {
          // Future: router.push(`/events/${item.event.id}`)
        }}
      />
    );
  }, []);

  const keyExtractor = useCallback((item: ListItem) => item.key, []);

  const HEADER_HEIGHT = insets.top + 56;

  return (
    <View style={styles.screen}>
      {/* ── Sticky header ── */}
      <Animated.View style={[styles.header, { paddingTop: insets.top }, headerShadowStyle]}>
        <Pressable style={S.btnIconBordered} onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={20} color={Colors.textPrimary} weight="bold" />
        </Pressable>

        <Text style={styles.headerTitle}>Events</Text>

        {/* Intentional spacer for symmetry */}
        <View style={{ width: 44 }} />
      </Animated.View>

      {/* ── Sticky filter bar (category + country) ── */}
      <View style={[styles.filterBar, { top: HEADER_HEIGHT }]}>
        {/* Category pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
          bounces={false}
        >
          {EVENT_CATEGORIES.map((cat) => {
            const active = cat.id === activeCategory;
            return (
              <Pressable
                key={cat.id}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => setActiveCategory(cat.id)}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Country pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
          bounces={false}
        >
          {COUNTRIES.map((c) => {
            const active = c.code === activeCountry;
            return (
              <Pressable
                key={c.code}
                style={[styles.pill, styles.pillSm, active && styles.pillActive]}
                onPress={() => setActiveCountry(c.code)}
              >
                <Text style={[styles.pillText, styles.pillTextSm, active && styles.pillTextActive]}>
                  {c.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Event list ── */}
      {loading ? (
        <View style={[styles.listContent, { paddingTop: HEADER_HEIGHT + 112 }]}>
          {Array.from({ length: 6 }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <SmileyMeh size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>Could not load events</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <Pressable style={[S.btnSecondary, { marginTop: Space.xl }]} onPress={refetch}>
            <Text style={S.btnSecondaryText}>Try again</Text>
          </Pressable>
        </View>
      ) : listItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Calendar size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No events found</Text>
          <Text style={styles.emptySubtitle}>
            Try changing the category or country filter.
          </Text>
        </View>
      ) : (
        <Animated.FlatList
          data={listItems}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingTop:    HEADER_HEIGHT + 114,
              paddingBottom: Platform.OS === 'ios' ? insets.bottom + 80 : 80,
            },
          ]}
          removeClippedSubviews
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          windowSize={7}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space.xl,
    paddingBottom: Space.md,
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  headerTitle: {
    fontSize: Type.sizeH3,
    fontWeight: Type.weight700,
    color: Colors.textPrimary,
  },

  // Filters
  filterBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 99,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    paddingVertical: Space.sm,
  },
  pillRow: {
    paddingHorizontal: Space.xl,
    gap: Space.sm,
    flexDirection: 'row',
    paddingVertical: Space.xs,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillSm: {
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  pillActive: {
    backgroundColor: Colors.activeChip,
    borderColor: Colors.activeChip,
  },
  pillText: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
  },
  pillTextSm: {
    fontSize: Type.sizeSmall,
  },
  pillTextActive: {
    color: Colors.white,
  },

  // List
  listContent: {
    paddingTop: 0,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingHorizontal: Space.xl,
    paddingTop: Space.xl,
    paddingBottom: Space.sm,
  },
  monthHeaderText: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightSemibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Empty / error state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Space.xl * 2,
    gap: Space.md,
  },
  emptyTitle: {
    fontSize: Type.sizeTitle,
    fontWeight: Type.weight700,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: Type.sizeBodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
