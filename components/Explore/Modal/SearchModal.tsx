/**
 * components/Explore/Modal/SearchModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Main "Where?" search modal — the first thing users see when they tap the
 * search bar on the Explore tab.
 *
 * Features:
 *   • Animated glass-blur overlay with category tabs + discovery card
 *   • "Where?" card shows up to 3 recent searches loaded from AsyncStorage
 *   • Falls back to two curated seed destinations when history is empty
 *   • Tapping any row saves to history and navigates to ExploreScreen
 *   • CaretDown / search-input tap opens the full-screen SearchSuggestionsView
 *   • History entries preserve their original region metadata on re-tap
 *   • "Clear all" resets the currently-selected destination
 *
 * Sub-modules (same folder):
 *   SearchRows.tsx           – shared row atoms + SUGGESTED_SEEDS / FALLBACK_CARD_ITEMS
 *   SearchHeader.tsx         – animated search-bar header (used by SearchSuggestionsView)
 *   SearchSuggestionsView.tsx – full-screen destination-search sheet
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  SafeAreaView,
  Platform,
  Image,
} from 'react-native';

import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import Animated, {
  useAnimatedStyle,
  useAnimatedScrollHandler,
  useSharedValue,
  interpolate,
  Extrapolate,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';

import { X, MagnifyingGlass, MapPin, Buildings, CaretDown, Clock } from 'react-native-phosphor';

import { S, Space, Type, Colors } from '@/constants/style';
import { useSearchHistory, type RecentSearch } from '@/hooks/useSearchHistory';
import { type LandmarkResult } from '@/hooks/useLandmarkSearch';
import { FALLBACK_CARD_ITEMS } from './SearchRows';
import { SearchSuggestionsView } from './SearchSuggestionsView';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Category {
  id:     string;
  label:  string;
  source: any;
  isNew?: boolean;
}

export interface SearchModalProps {
  isVisible:   boolean;
  onClose:     () => void;
  progress:    SharedValue<number>;
  activeId:    string;
  setActiveId: (id: string) => void;
  categories:  Category[];
  /** Called with the chosen destination name and optional landmark coords; consumer handles navigation. */
  onSearch?:   (destination: string, coords?: { latitude: number; longitude: number }) => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export const SearchModal = ({
  isVisible,
  onClose,
  progress,
  activeId,
  setActiveId,
  categories,
  onSearch,
}: SearchModalProps) => {

  const scrollY                                   = useSharedValue(0);
  const [destSearchVisible,  setDestSearchVisible]  = useState(false);
  const [selectedDest,       setSelectedDest]       = useState<string>('');
  const [selectedDestCoords, setSelectedDestCoords] = useState<{ latitude: number; longitude: number } | undefined>(undefined);

  // Single source-of-truth for history; passed into SearchSuggestionsView as props
  // so both components always operate on the same in-memory list.
  const { history, addSearch, removeSearch, clearHistory, isLoaded } = useSearchHistory();

  // ── Animate the modal overlay ──────────────────────────────────────────────
  useEffect(() => {
    progress.value = withTiming(isVisible ? 1 : 0, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
  }, [isVisible]);

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale:      interpolate(progress.value, [0, 1], [0.96, 1]) },
      { translateY: interpolate(progress.value, [0, 1], [-120, 0]) },
    ],
    borderRadius: interpolate(progress.value, [0, 1], [40, 32]),
  }));

  const footerAnimStyle = useAnimatedStyle(() => ({
    opacity:   progress.value,
    transform: [{ translateY: interpolate(progress.value, [0, 1], [120, 0]) }],
  }));

  const rowTranslateStyle = useAnimatedStyle(() => ({
    transform: [{
      translateY: interpolate(scrollY.value, [0, 50], [0, -28], Extrapolate.CLAMP),
    }],
  }));

  // ── Destination commit ─────────────────────────────────────────────────────

  /**
   * Called whenever a destination is chosen from DestinationSearch or inline.
   * Stores to history (with region metadata when available) and navigates.
   */
  const handleDestSelect = useCallback((name: string, result?: LandmarkResult) => {
    setSelectedDest(name);
    setSelectedDestCoords(result?.coords);
    addSearch({
      name,
      region:   result?.region   ?? '',
      category: result?.category ?? 'destination',
      placeId:  result?.placeId,
    });
    if (onSearch) {
      onSearch(name, result?.coords);
      onClose();
    }
  }, [onSearch, onClose, addSearch]);

  /**
   * Called when a history row in the main card is tapped.
   * Re-adds with the ORIGINAL region/category intact so the stored metadata
   * is never overwritten with empty strings on re-press.
   */
  const handleRecentPress = useCallback((item: RecentSearch) => {
    setSelectedDest(item.name);
    addSearch({
      name:     item.name,
      region:   item.region,
      category: item.category,
      placeId:  item.placeId,
    });
    if (onSearch) {
      onSearch(item.name);
      onClose();
    }
  }, [onSearch, onClose, addSearch]);

  /**
   * Called when a static fallback card item is tapped (history is empty).
   * Adds a record with the seed's known region so history is properly initialised.
   */
  const handleFallbackPress = useCallback(
    (item: (typeof FALLBACK_CARD_ITEMS)[number]) => {
      setSelectedDest(item.name);
      addSearch({ name: item.name, region: item.region, category: item.category });
      if (onSearch) {
        onSearch(item.name);
        onClose();
      }
    },
    [onSearch, onClose, addSearch],
  );

  // ── Derived state ──────────────────────────────────────────────────────────
  const hasHistory = isLoaded && history.length > 0;
  const cardItems  = hasHistory ? history.slice(0, 3) : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Modal visible={isVisible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={styles.fullScreenWrapper}>

        {/* Glass-blur backdrop */}
        <BlurView intensity={120} tint="light" style={styles.glassLayer} pointerEvents="none">
          <LinearGradient
            colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.05)', 'transparent']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.cleanGlassTint} />
        </BlurView>

        <SafeAreaView style={styles.safeArea}>

          {/* ── Close button ── */}
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <View style={styles.closeIconCircle}>
              <X size={20} color="#222" weight="bold" />
            </View>
          </Pressable>

          <Animated.ScrollView
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ── Category tabs ── */}
            <Animated.View style={[styles.tabsContainer, rowTranslateStyle]}>
              {categories.map((item) => (
                <CategoryTab
                  key={item.id}
                  label={item.label}
                  source={item.source}
                  active={activeId === item.id}
                  isNew={item.isNew}
                  onPress={() => setActiveId(item.id)}
                />
              ))}
            </Animated.View>

            {/* ── Main "Where?" discovery card ── */}
            <Animated.View style={[styles.mainDiscoveryCard, cardAnimStyle]}>
              <Text style={styles.title}>Where?</Text>

              {/* Tappable search input → opens full-screen suggestions */}
              <Pressable
                style={styles.searchInputContainer}
                onPress={() => setDestSearchVisible(true)}
              >
                <MagnifyingGlass size={20} color="#222" weight="bold" />
                <Text style={[styles.textInput, !selectedDest && styles.placeholderText]}>
                  {selectedDest || 'Search destinations'}
                </Text>
              </Pressable>

              {/* Section header */}
              <Text style={styles.sectionHeader}>Recent searches</Text>

              {/* History rows OR static fallback items */}
              {cardItems
                ? cardItems.map((item) => (
                    <CardRecentItem key={item.id} item={item} onPress={handleRecentPress} />
                  ))
                : FALLBACK_CARD_ITEMS.map((item) => (
                    <CardFallbackItem key={item.name} item={item} onPress={handleFallbackPress} />
                  ))
              }

              {/* CaretDown → opens suggestions sheet */}
              <Pressable
                style={styles.bottomArrowContainer}
                onPress={() => setDestSearchVisible(true)}
                hitSlop={12}
              >
                <CaretDown size={18} color="#717171" weight="bold" />
              </Pressable>
            </Animated.View>

          </Animated.ScrollView>

          {/* ── Footer ── */}
          <Animated.View style={[styles.footer, footerAnimStyle]}>
            {/* "Clear all" resets the selected destination */}
            <Pressable onPress={() => { setSelectedDest(''); setSelectedDestCoords(undefined); }}>
              <Text style={styles.clearAll}>Clear all</Text>
            </Pressable>

            <Pressable
              style={styles.searchBtn}
              onPress={() => {
                if (selectedDest && onSearch) {
                  onSearch(selectedDest, selectedDestCoords);
                  onClose();
                } else {
                  onClose();
                }
              }}
            >
              <MagnifyingGlass size={18} color="#FFF" weight="bold" />
              <Text style={styles.searchBtnText}>Search</Text>
            </Pressable>
          </Animated.View>

        </SafeAreaView>
      </Animated.View>

      {/* ── Full-screen destination search sheet (shared history state) ── */}
      <SearchSuggestionsView
        isVisible={destSearchVisible}
        onClose={() => setDestSearchVisible(false)}
        onSelect={handleDestSelect}
        history={history}
        removeSearch={removeSearch}
        clearHistory={clearHistory}
      />
    </Modal>
  );
};

// ─── Card-scoped sub-components ───────────────────────────────────────────────

/**
 * History row inside the main discovery card.
 * Shows a clock icon with name + region subtitle.
 */
const CardRecentItem = React.memo(function CardRecentItem({
  item,
  onPress,
}: {
  item:    RecentSearch;
  onPress: (item: RecentSearch) => void;
}) {
  return (
    <Pressable style={styles.cardRow} onPress={() => onPress(item)}>
      <View style={[styles.cardIconBox, { backgroundColor: '#F7F7F7' }]}>
        <Clock size={22} color="#717171" weight="regular" />
      </View>
      <View>
        <Text style={styles.locationTitle}>{item.name}</Text>
        <Text style={styles.locationSub}>{item.region || item.category || 'Recent search'}</Text>
      </View>
    </Pressable>
  );
});

/**
 * Static seed item shown when history is empty.
 */
const CardFallbackItem = React.memo(function CardFallbackItem({
  item,
  onPress,
}: {
  item:    (typeof FALLBACK_CARD_ITEMS)[number];
  onPress: (item: (typeof FALLBACK_CARD_ITEMS)[number]) => void;
}) {
  const isOrange = item.name !== FALLBACK_CARD_ITEMS[0].name;
  return (
    <Pressable style={styles.cardRow} onPress={() => onPress(item)}>
      <View style={[styles.cardIconBox, { backgroundColor: isOrange ? '#FFF3E0' : '#F7F7F7' }]}>
        {isOrange
          ? <Buildings size={22} color="#FF8A00" />
          : <MapPin    size={22} color="#222"    />}
      </View>
      <View>
        <Text style={styles.locationTitle}>{item.name}</Text>
        <Text style={styles.locationSub}>{item.region}</Text>
      </View>
    </Pressable>
  );
});

/**
 * Category tab in the scrollable row above the card.
 */
const CategoryTab = ({ label, source, active, isNew, onPress }: any) => (
  <Pressable onPress={onPress} style={styles.tabItem}>
    <View style={styles.iconCircle}>
      <Image source={source} style={styles.categoryImage} />
      {isNew && (
        <View style={styles.newBadge}>
          <Text style={[S.micro, { color: 'white', fontSize: 8 }]}>NEW</Text>
        </View>
      )}
    </View>
    <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    {active && <View style={S.activeIndicatorThick} />}
  </Pressable>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fullScreenWrapper: { flex: 1, backgroundColor: 'transparent' },
  cleanGlassTint:    { flex: 1, backgroundColor: 'rgba(255,255,255,0.35)' },
  safeArea:          { flex: 1 },
  closeBtn: {
    position: 'absolute',
    right: 20,
    top: Platform.OS === 'ios' ? 60 : 40,
    zIndex: 20,
  },
  closeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  glassLayer: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.6)',
  },

  // ── Tabs ──
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  tabItem:     { alignItems: 'center', minWidth: 70 },
  iconCircle:  { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
  categoryImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  tabLabel: {
    fontSize: Type.sizeCaption,
    color: Colors.textSecondary,
    marginTop: Space.xs,
    fontWeight: Type.weightMedium,
  },
  tabLabelActive: {
    color: Colors.textPrimary,
    fontWeight: Type.weightSemibold,
  },
  newBadge: {
    position: 'absolute',
    top: 10,
    right: -15,
    backgroundColor: '#222',
    paddingHorizontal: 4,
    borderRadius: 4,
  },

  // ── Discovery card ──
  scrollContent: { padding: 16, paddingTop: 15, paddingBottom: 140 },
  mainDiscoveryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
  },
  title:               { fontSize: 32, fontWeight: '800', color: '#222', marginBottom: 20 },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F3F3F3',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  textInput:       { flex: 1, fontSize: 16, color: '#222',    fontWeight: '600' },
  placeholderText: {          fontSize: 16, color: '#717171', fontWeight: '400' },
  sectionHeader:   { fontSize: 14, fontWeight: '700', color: '#222', marginBottom: 16 },

  // ── Card rows ──
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  cardIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  locationTitle: { fontSize: 16, fontWeight: '600', color: '#222' },
  locationSub:   { fontSize: 14, color: '#717171' },
  bottomArrowContainer: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#F0F0F0',
    paddingTop: 15,
  },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#F0F0F0',
  },
  clearAll: { textDecorationLine: 'underline', fontWeight: '700', color: '#222' },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.brand,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    gap: 8,
  },
  searchBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
});
