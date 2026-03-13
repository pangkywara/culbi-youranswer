/**
 * components/Explore/Modal/SearchSuggestionsView.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Fullscreen destination-search sheet that slides up over the main SearchModal.
 *
 * UI states:
 *   • Empty query   → Recent-history rows (if any) + Suggested seed destinations
 *   • Typing        → Live Supabase landmark results (debounced, via useLandmarkSearch)
 *   • No results    → Empty state illustration
 *
 * History state is owned by the parent (SearchModal) and passed in as props so
 * both components always share the same list.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Modal,
  Pressable,
  Platform,
} from 'react-native';

import * as Location from 'expo-location';
import Animated, {
  Easing,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { MagnifyingGlass } from 'react-native-phosphor';

import { supabase } from '@/lib/supabase';
import { useLandmarkSearch, type LandmarkResult } from '@/hooks/useLandmarkSearch';
import { type RecentSearch } from '@/hooks/useSearchHistory';

import { SearchHeader } from './SearchHeader';
import {
  HistoryRow,
  LandmarkRow,
  SuggestedRow,
  SUGGESTED_SEEDS,
} from './SearchRows';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DestinationSearchProps {
  isVisible:     boolean;
  onClose:       () => void;
  /** Called when the user commits to a destination (history tap, result tap, submit). */
  onSelect:      (name: string, result?: LandmarkResult) => void;
  /** Passed from parent so both components share a single hook instance. */
  history:       RecentSearch[];
  removeSearch:  (id: string) => void;
  clearHistory:  () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const SearchSuggestionsView = ({
  isVisible,
  onClose,
  onSelect,
  history,
  removeSearch,
  clearHistory,
}: DestinationSearchProps) => {
  const [query, setQuery] = useState('');
  const progress           = useSharedValue(0);
  const scrollY            = useSharedValue(0);

  // history + removeSearch come from parent — no separate hook call needed here
  const { results, isSearching, search, clear } = useLandmarkSearch();

  // ── Near-you suggestions ──────────────────────────────────────────────────
  const [nearbyLandmarks, setNearbyLandmarks] = useState<LandmarkResult[]>([]);
  const nearbyLoadedRef = useRef(false);

  useEffect(() => {
    if (!isVisible || nearbyLoadedRef.current) return;
    let cancelled = false;

    const fetchNear = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;

        const { data } = await supabase.rpc('landmarks_near', {
          user_lat: loc.coords.latitude,
          user_lng: loc.coords.longitude,
          radius_m: 50_000,
        });
        if (cancelled || !data) return;

        nearbyLoadedRef.current = true;
        const mapped: LandmarkResult[] = (data as any[]).slice(0, 6).map((row) => {
          let coords: { latitude: number; longitude: number } | undefined;
          try {
            if (row.coords) {
              const geo = typeof row.coords === 'string' ? JSON.parse(row.coords) : row.coords;
              if (geo?.coordinates) coords = { latitude: geo.coordinates[1], longitude: geo.coordinates[0] };
            }
          } catch { /* leave undefined */ }
          return {
            id:       row.id,
            name:     row.name,
            region:   row.region   ?? '',
            category: row.category ?? 'destination',
            placeId:  row.place_id ?? '',
            coords,
          };
        });
        setNearbyLandmarks(mapped);
      } catch { /* silently fail, show static seeds below */ }
    };

    fetchNear();
    return () => { cancelled = true; };
  }, [isVisible]);

  // ── Animation ─────────────────────────────────────────────────────────────
  useEffect(() => {
    progress.value = withTiming(isVisible ? 1 : 0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
    if (!isVisible) {
      setQuery('');
      clear();
    }
  }, [isVisible]);

  // ── Live search ───────────────────────────────────────────────────────────
  useEffect(() => {
    search(query);
  }, [query, search]);

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const wrapperAnim = useAnimatedStyle(() => ({
    opacity:   progress.value,
    transform: [{ translateY: interpolate(progress.value, [0, 1], [30, 0]) }],
  }));

  // ── Handlers ──────────────────────────────────────────────────────────────
  const hasQuery = query.trim().length > 0;

  const handleClear = useCallback(() => {
    setQuery('');
    clear();
  }, [clear]);

  const handleSubmit = useCallback(() => {
    if (query.trim()) {
      onSelect(query.trim());
      onClose();
    }
  }, [query, onSelect, onClose]);

  /**
   * Re-selecting a history item passes the FULL RecentSearch object so the
   * parent's handleDestSelect can preserve the original region / category
   * instead of overwriting them with empty strings.
   */
  const handleHistoryPress = useCallback((item: RecentSearch) => {
    // Pass a synthetic LandmarkResult so handleDestSelect keeps the metadata.
    onSelect(item.name, {
      id:       item.id,
      name:     item.name,
      region:   item.region,
      category: item.category ?? 'destination',
      placeId:  item.placeId ?? '',
    });
    onClose();
  }, [onSelect, onClose]);

  const handleResultPress = useCallback((item: LandmarkResult) => {
    onSelect(item.name, item);
    onClose();
  }, [onSelect, onClose]);

  const handleSuggestedPress = useCallback((name: string) => {
    onSelect(name);
    onClose();
  }, [onSelect, onClose]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal visible={isVisible} transparent animationType="none" statusBarTranslucent>
      {/* Dim backdrop */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: 'rgba(0,0,0,0.2)', opacity: progress.value },
        ]}
      />

      <Animated.View style={[styles.sheet, wrapperAnim]}>
        <SafeAreaView style={{ flex: 1 }}>

          {/* ── Animated search header ── */}
          <SearchHeader
            query={query}
            onChange={setQuery}
            onClear={handleClear}
            onBack={onClose}
            onSubmit={handleSubmit}
            isSearching={isSearching}
            scrollY={scrollY}
          />

          <Animated.ScrollView
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* ── Recent history (empty query only) ── */}
            {!hasQuery && history.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeader}>Recent searches</Text>
                  <Pressable onPress={clearHistory} hitSlop={8}>
                    <Text style={styles.clearBtn}>Clear all</Text>
                  </Pressable>
                </View>
                {history.map((item) => (
                  <HistoryRow
                    key={item.id}
                    item={item}
                    onPress={handleHistoryPress}
                    onRemove={removeSearch}
                  />
                ))}
              </View>
            )}

            {/* ── Live Supabase results ── */}
            {hasQuery && results.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>Destinations</Text>
                {results.map((item) => (
                  <LandmarkRow key={item.id} item={item} onPress={handleResultPress} />
                ))}
              </View>
            )}

            {/* ── No results empty state ── */}
            {hasQuery && !isSearching && results.length === 0 && (
              <View style={styles.empty}>
                <MagnifyingGlass size={36} color="#CCC" weight="light" />
                <Text style={styles.emptyTitle}>No destinations found</Text>
                <Text style={styles.emptySub}>Try a different search term</Text>
              </View>
            )}

            {/* ── Near you (empty query, GPS-resolved) ── */}
            {!hasQuery && nearbyLandmarks.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>Near you</Text>
                {nearbyLandmarks.map((item) => (
                  <LandmarkRow key={item.id} item={item} onPress={handleResultPress} />
                ))}
              </View>
            )}

            {/* ── Suggested seeds (empty query only) ── */}
            {!hasQuery && (
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>Suggested destinations</Text>
                {SUGGESTED_SEEDS.map((item) => (
                  <SuggestedRow key={item.id} item={item} onPress={handleSuggestedPress} />
                ))}
              </View>
            )}
          </Animated.ScrollView>

        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: Platform.OS === 'ios' ? 60 : 40,
    zIndex: 999,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#FFF',
  },
  scrollContent: { paddingBottom: 40 },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearBtn: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF385C',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#444', marginTop: 8 },
  emptySub:   { fontSize: 14, color: '#888' },
});