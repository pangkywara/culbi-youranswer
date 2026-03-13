import React, { useState, useCallback, memo, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, Platform, InteractionManager } from 'react-native';
import { Colors, Type, Space, Radius } from '@/constants/style';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapTrifold, ArrowRight } from 'react-native-phosphor';
import { useNavigation } from '@react-navigation/native';
import { useRouter, useFocusEffect } from 'expo-router';
import { TAB_BAR_STYLE } from './_layout';

import * as Location from 'expo-location';
import { SearchBar } from '@/components/Explore/SearchBar';
import { AnimatedCardItem } from '@/components/Explore/AnimatedCardItem';
import DiscoveryMap from '@/components/Maps/DiscoveryMaps/DiscoveryMap';
import ExploreScreen from '@/components/Explore/ExploreScreen';
import { SearchModal } from '@/components/Explore/Modal/SearchModal';
import { useNearbyLandmarks } from '@/hooks/useNearbyLandmarks';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { HomeScreenSkeleton } from '@/components/Explore/Skeleton/HomeScreenSkeleton';
import { useAuth } from '@/context/AuthContext';
import { useEvents, type AseanEvent } from '@/hooks/useEvents';
import { AnimatedEventCardItem } from '@/components/Events/AnimatedEventCardItem';
import { useAllGroups, type PublicGroup } from '@/hooks/useAllGroups';
import { AnimatedGroupCardItem } from '@/components/Messages/Bridge/AnimatedGroupCardItem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RECENT_WIDTH = SCREEN_WIDTH * 0.36;
const STANDARD_WIDTH = SCREEN_WIDTH * 0.52;
const CARD_GAP = 12;
const HORIZONTAL_PADDING = 20;

const DEFAULT_REGION = {
  latitude: 1.5533,
  longitude: 110.3592,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

const CATEGORIES = [
  { id: 'destinations', label: 'Destinations', source: require('@/assets/images/destinations.webp') },
  { id: 'events', label: 'Events', source: require('@/assets/images/events.webp'), isNew: true },
  { id: 'groups', label: 'Groups', source: require('@/assets/images/groups.webp'), isNew: true },
];

interface HorizontalSectionProps {
  title: string;
  data: any[];
  cardWidth: number;
  variant: 'compact' | 'standard';
  onPressItem: (id: string) => void;
  /** Optional — when provided the header arrow becomes a tappable button */
  onSeeAll?: () => void;
}

type SectionItem =
  | { key: string; type: 'recent'; data: any[];         cardWidth: number }
  | { key: string; type: 'std';    title: string; data: any[];         cardWidth: number }
  | { key: string; type: 'events'; title: string; data: AseanEvent[];  cardWidth: number }
  | { key: string; type: 'groups'; title: string; data: PublicGroup[]; cardWidth: number };

const HorizontalSection = memo(function HorizontalSection({ title, data, cardWidth, variant, onPressItem, onSeeAll }: HorizontalSectionProps) {
  const scrollX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => { scrollX.value = event.contentOffset.x; },
  });

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: cardWidth + CARD_GAP,
    offset: (cardWidth + CARD_GAP) * index,
    index,
  }), [cardWidth]);

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <AnimatedCardItem
      item={item}
      index={index}
      scrollX={scrollX}
      cardWidth={cardWidth}
      cardGap={CARD_GAP}
      variant={variant}
      onPress={() => onPressItem(item.id)}
    />
  ), [scrollX, cardWidth, variant, onPressItem]);

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {onSeeAll ? (
          <Pressable style={styles.seeAllBtn} onPress={onSeeAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ArrowRight size={18} color={Colors.textPrimary} weight="bold" />
          </Pressable>
        ) : (
          <View style={styles.seeAllBtn}>
            <ArrowRight size={18} color={Colors.textPrimary} weight="bold" />
          </View>
        )}
      </View>
      <Animated.FlatList
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalListPadding}
        keyExtractor={(item: any) => item.id?.toString()}
        renderItem={renderItem}
        onScroll={onScroll}
        scrollEventThrottle={16}
        snapToInterval={cardWidth + CARD_GAP}
        snapToAlignment="start"
        decelerationRate={0.95}
        bounces={false}
        removeClippedSubviews={true}
        getItemLayout={getItemLayout}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        updateCellsBatchingPeriod={50}
      />
    </View>
  );
});

// ── Horizontal section for events ───────────────────────────────────────────
interface HorizontalEventSectionProps {
  title: string;
  data: AseanEvent[];
  cardWidth: number;
}

const HorizontalEventSection = memo(function HorizontalEventSection({
  title,
  data,
  cardWidth,
}: HorizontalEventSectionProps) {
  const router   = useRouter();
  const scrollX  = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => { scrollX.value = event.contentOffset.x; },
  });

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: cardWidth + CARD_GAP,
    offset: (cardWidth + CARD_GAP) * index,
    index,
  }), [cardWidth]);

  const renderItem = useCallback(({ item, index }: { item: AseanEvent; index: number }) => (
    <AnimatedEventCardItem
      event={item}
      index={index}
      scrollX={scrollX}
      cardWidth={cardWidth}
      cardGap={CARD_GAP}
      onPress={() => router.push(`/events/${item.id}`)}
    />
  ), [scrollX, cardWidth]);

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.seeAllBtn}>
          <ArrowRight size={18} color={Colors.textPrimary} weight="bold" />
        </View>
      </View>
      <Animated.FlatList
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalListPadding}
        keyExtractor={(item: AseanEvent) => item.id}
        renderItem={renderItem}
        onScroll={onScroll}
        scrollEventThrottle={16}
        snapToInterval={cardWidth + CARD_GAP}
        snapToAlignment="start"
        decelerationRate={0.95}
        bounces={false}
        removeClippedSubviews={true}
        getItemLayout={getItemLayout}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        updateCellsBatchingPeriod={50}
      />
    </View>
  );
});

// ── Horizontal section for groups ───────────────────────────────────────────
interface HorizontalGroupSectionProps {
  title: string;
  data: PublicGroup[];
  cardWidth: number;
}

const HorizontalGroupSection = memo(function HorizontalGroupSection({
  title,
  data,
  cardWidth,
}: HorizontalGroupSectionProps) {
  const router   = useRouter();
  const scrollX  = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => { scrollX.value = event.contentOffset.x; },
  });

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: cardWidth + CARD_GAP,
    offset: (cardWidth + CARD_GAP) * index,
    index,
  }), [cardWidth]);

  const renderItem = useCallback(({ item, index }: { item: PublicGroup; index: number }) => (
  <AnimatedGroupCardItem
      group={item}
      index={index}
      scrollX={scrollX}
      cardWidth={cardWidth}
      cardGap={CARD_GAP}
      onPress={() => router.push(`/groups/${item.id}` as any)} 
    />
  ), [scrollX, cardWidth]);

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.seeAllBtn}>
          <ArrowRight size={18} color={Colors.textPrimary} weight="bold" />
        </View>
      </View>
      <Animated.FlatList
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalListPadding}
        keyExtractor={(item: PublicGroup) => item.id}
        renderItem={renderItem}
        onScroll={onScroll}
        scrollEventThrottle={16}
        snapToInterval={cardWidth + CARD_GAP}
        snapToAlignment="start"
        decelerationRate={0.95}
        bounces={false}
        removeClippedSubviews={true}
        getItemLayout={getItemLayout}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        updateCellsBatchingPeriod={50}
      />
    </View>
  );
});

export default function TabOneScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();

  const [isMapVisible,     setIsMapVisible]     = useState(false);
  const [isExploreVisible, setIsExploreVisible] = useState(false);
  const [exploreDestination, setExploreDestination] = useState<string | null>(null);
  const [exploreCoords,      setExploreCoords]      = useState<{ latitude: number; longitude: number } | null>(null);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState('destinations');

  /** Switch active category — view updates in-place, no navigation. */
  const handleCategoryChange = useCallback((id: string) => {
    setActiveCategoryId(id);
  }, []);

  /** Most recent GPS fix — used when the user taps "See all" on a section. */
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Logic to hide tab bar on certain sheet indexes (Peek=0 or Full=2)
  const handleSheetIndexChange = useCallback((idx: number) => {
    if (idx === 0 || idx === 2) {
      navigation.setOptions({ tabBarStyle: { display: 'none' } });
    } else {
      navigation.setOptions({ tabBarStyle: TAB_BAR_STYLE.bar });
    }
  }, [navigation]);

  const handleExploreClose = useCallback(() => {
    navigation.setOptions({ tabBarStyle: TAB_BAR_STYLE.bar });
    setIsExploreVisible(false);
    setExploreDestination(null);
    setExploreCoords(null);
  }, [navigation]);

  // Auth must be done loading before fetching — but we don't need a session.
  // Landmarks are public data (anon RLS policy allows it), so the Supabase
  // anon key works even without an authenticated session.
  const { loading: authLoading } = useAuth();

  const { experiences, loading: placesLoading, fetchNearby } = useNearbyLandmarks();
  const { recentlyViewed, recordViewFromExperience, refresh: refreshRecentlyViewed } = useRecentlyViewed();
  const { events, loading: eventsLoading } = useEvents({ limit: 200 });
  const { groups, loading: groupsLoading } = useAllGroups();

  // Keep refs in-sync every render so press callbacks can read the latest data
  // without depending on the array reference — preventing FlatList card re-renders.
  const experiencesRef = useRef(experiences);
  const recentlyViewedRef = useRef(recentlyViewed);
  useLayoutEffect(() => { experiencesRef.current = experiences; });
  useLayoutEffect(() => { recentlyViewedRef.current = recentlyViewed; });

  /**
   * Group experiences by country, sorted by the closest landmark in each country.
   * Result: [{ country: 'Indonesia', items: [...], minDistanceM: 12000 }, ...]
   * This drives the dynamic per-country horizontal sections below "Top nearest".
   */
  const countrySections = useMemo(() => {
    if (experiences.length === 0) return [];

    const map = new Map<string, { items: typeof experiences; minDistanceM: number }>();

    for (const exp of experiences) {
      const country = exp.country ?? 'Other';
      const distM   = exp.distance_m ?? 0;
      const existing = map.get(country);
      if (existing) {
        existing.items.push(exp);
        if (distM < existing.minDistanceM) {
          existing.minDistanceM = distM;
        }
      } else {
        map.set(country, { items: [exp], minDistanceM: distM });
      }
    }

    return Array.from(map.entries())
      .map(([country, { items, minDistanceM }]) => ({ country, items, minDistanceM }))
      // Sort countries ascending by their closest landmark distance from the user
      .sort((a, b) => a.minDistanceM - b.minDistanceM);
  }, [experiences]);

  /**
   * Group groups by category for the horizontal sections.
   * "All groups" section leads with the 8 most active public groups.
   */
  const groupSections = useMemo<SectionItem[]>(() => {
    if (groups.length === 0) return [];
    const result: SectionItem[] = [];

    result.push({
      key: 'groups-all',
      type: 'groups',
      title: 'All groups',
      data: groups.slice(0, 8),
      cardWidth: STANDARD_WIDTH,
    });

    const catMap = new Map<string, PublicGroup[]>();
    for (const g of groups) {
      const cat = g.category ?? 'General';
      const arr = catMap.get(cat) ?? [];
      arr.push(g);
      catMap.set(cat, arr);
    }
    for (const [cat, items] of catMap.entries()) {
      result.push({
        key: `groups-${cat}`,
        type: 'groups',
        title: cat,
        data: items,
        cardWidth: STANDARD_WIDTH,
      });
    }
    return result;
  }, [groups]);

  /**
   * Group events by country_name for the horizontal sections.
   * "Upcoming" section leads with the next 8 events across all countries.
   */
  const eventSections = useMemo<SectionItem[]>(() => {
    if (events.length === 0) return [];
    const result: SectionItem[] = [];

    // Top row: up to 8 soonest events regardless of country
    result.push({
      key: 'events-upcoming',
      type: 'events',
      title: 'Upcoming events',
      data: events.slice(0, 8),
      cardWidth: STANDARD_WIDTH,
    });

    // Per-country rows
    const countryMap = new Map<string, AseanEvent[]>();
    for (const ev of events) {
      const cn = ev.country_name || ev.country;
      const arr = countryMap.get(cn);
      if (arr) arr.push(ev);
      else countryMap.set(cn, [ev]);
    }
    for (const [country, items] of countryMap.entries()) {
      result.push({
        key: `events-${country}`,
        type: 'events',
        title: country,
        data: items,
        cardWidth: STANDARD_WIDTH,
      });
    }
    return result;
  }, [events]);

  useEffect(() => {
    // Wait for auth to finish bootstrapping so the Supabase client is fully
    // initialized, then fetch — works with or without a session (anon policy).
    if (authLoading) return;

    (async () => {
      let lat = DEFAULT_REGION.latitude;
      let lng = DEFAULT_REGION.longitude;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
          setUserCoords({ latitude: lat, longitude: lng });
        }
      } catch { /* Permission denied or unavailable */ }
      await fetchNearby(lat, lng);
    })();
  }, [authLoading, fetchNearby]);

  const [mapMounted, setMapMounted] = useState(false);
  useEffect(() => {
    if (isMapVisible && !mapMounted) setMapMounted(true);
  }, [isMapVisible, mapMounted]);

  // Re-fetch recently viewed when the home tab regains focus, so any views
  // recorded by [id].tsx (while the home screen stayed mounted in the background)
  // are reflected immediately. Skip the very first focus — the auth subscription
  // in useRecentlyViewed handles the initial load.
  const firstFocusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        return;
      }
      refreshRecentlyViewed();
    }, [refreshRecentlyViewed])
  );

  const [isReady, setIsReady] = useState(false);
  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => setIsReady(true));
      return () => task.cancel();
    }, [])
  );

  const morphProgress = useSharedValue(0);
  const verticalScrollY = useSharedValue(0);
  const verticalHandler = useAnimatedScrollHandler({
    onScroll: (event) => { verticalScrollY.value = event.contentOffset.y; },
  });

  // Use refs so these callbacks never change reference — avoids re-creating
  // renderItem in every HorizontalSection whenever the data arrays update.
  const onPressRecentItem = useCallback((id: string) => {
    const exp = recentlyViewedRef.current.find(e => e.id === id);
    if (exp) recordViewFromExperience(exp);
    router.push(`/destinations/${id}`);
  }, [router, recordViewFromExperience]);

  const onPressNearbyItem = useCallback((id: string) => {
    const exp = experiencesRef.current.find(e => e.id === id);
    if (exp) recordViewFromExperience(exp);
    router.push(`/destinations/${id}`);
  }, [router, recordViewFromExperience]);

  /** Opens the Explore sheet pre-searched with the given section title and user coords. */
  const onSeeAllSection = useCallback((title: string) => {
    setExploreDestination(title);
    setExploreCoords(userCoords);
    setIsExploreVisible(true);
  }, [userCoords]);

  const navToRecentlyViewed = useCallback(() => router.push('/recently-viewed'), [router]);

  /**
   * Flat list of section descriptors — one entry per horizontal row.
   * Keeps the outer scroll virtualized so off-screen sections are unmounted.
   */
  const sections = useMemo<SectionItem[]>(() => {
    const result: SectionItem[] = [];
    if (recentlyViewed.length > 0) {
      result.push({ key: 'recently-viewed', type: 'recent', data: recentlyViewed.slice(0, 6), cardWidth: RECENT_WIDTH });
    }
    result.push({ key: 'top-nearest', type: 'std', title: 'Top nearest', data: experiences.slice(0, 8), cardWidth: STANDARD_WIDTH });
    for (const { country, items } of countrySections) {
      result.push({ key: country, type: 'std', title: country, data: items, cardWidth: STANDARD_WIDTH });
    }
    return result;
  }, [recentlyViewed, experiences, countrySections]);

  const renderSection = useCallback(({ item }: { item: SectionItem }) => {
    if (item.type === 'groups') {
      return (
        <HorizontalGroupSection
          title={item.title}
          data={item.data}
          cardWidth={item.cardWidth}
        />
      );
    }
    if (item.type === 'events') {
      return (
        <HorizontalEventSection
          title={item.title}
          data={item.data}
          cardWidth={item.cardWidth}
        />
      );
    }
    if (item.type === 'recent') {
      return (
        <HorizontalSection
          title="Recently viewed"
          data={item.data}
          cardWidth={item.cardWidth}
          variant="compact"
          onPressItem={onPressRecentItem}
          onSeeAll={navToRecentlyViewed}
        />
      );
    }
    return (
      <HorizontalSection
        title={item.title}
        data={item.data}
        cardWidth={item.cardWidth}
        variant="standard"
        onPressItem={onPressNearbyItem}
        onSeeAll={() => onSeeAllSection(item.title)}
      />
    );
  }, [onPressRecentItem, onPressNearbyItem, onSeeAllSection, navToRecentlyViewed]);

  const isEventsTab  = activeCategoryId === 'events';
  const isGroupsTab  = activeCategoryId === 'groups';
  const activeSections = isGroupsTab ? groupSections : isEventsTab ? eventSections : sections;
  const showSkeleton = isGroupsTab
    ? groupsLoading && groups.length === 0
    : isEventsTab
      ? eventsLoading && events.length === 0
      : (authLoading || placesLoading) && experiences.length === 0;

  return (
    <View style={styles.container}>
      {/* ── 1. BACKGROUND MAP ── */}
      {mapMounted && (
        <View style={[StyleSheet.absoluteFillObject, { display: isMapVisible ? 'flex' : 'none' }]}>
          <DiscoveryMap
            onSelectLandmark={() => {}}
            onToggleDiscovery={() => setIsMapVisible(false)}
          />
        </View>
      )}

      {/* ── 2. SEARCH EXPLORE SCREEN ── */}
      {isExploreVisible && (
        <View style={StyleSheet.absoluteFillObject}>
          <ExploreScreen
            initialDestination={exploreDestination ?? undefined}
            initialCoords={exploreCoords ?? undefined}
            onClose={handleExploreClose}
            onSheetIndexChange={handleSheetIndexChange}
          />
        </View>
      )}

      {/* ── 3. MAIN CONTENT ── */}
      {isReady && !isMapVisible && !isExploreVisible && (
        <>
          <SearchBar
            topOffset={insets.top}
            scrollY={verticalScrollY}
            progress={morphProgress}
            onPressSearch={() => setIsSearchVisible(true)}
            activeId={activeCategoryId}
            setActiveId={handleCategoryChange}
            categories={CATEGORIES}
          />

          <Animated.FlatList
            data={showSkeleton ? [] : activeSections}
            keyExtractor={(item: SectionItem) => item.key}
            renderItem={renderSection}
            ListEmptyComponent={showSkeleton ? <HomeScreenSkeleton /> : null}
            onScroll={verticalHandler}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: insets.top + 190, paddingBottom: 150 }}
            initialNumToRender={3}
            maxToRenderPerBatch={2}
            windowSize={5}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews={true}
          />
        </>
      )}

      {/* ── 4. SEARCH MODAL ── */}
      {isReady && !isExploreVisible && (
        <SearchModal
          isVisible={isSearchVisible}
          onClose={() => setIsSearchVisible(false)}
          progress={morphProgress}
          activeId={activeCategoryId}
          setActiveId={handleCategoryChange}
          categories={CATEGORIES}
          onSearch={(destination, coords) => {
            setIsSearchVisible(false);
            setExploreDestination(destination);
            setExploreCoords(coords ?? null);
            setIsExploreVisible(true);
          }}
        />
      )}

      {/* ── 5. FLOATING MAP BUTTON ── */}
      {!isMapVisible && !isExploreVisible && (
        <View style={[styles.mapBtnWrapper, { 
          bottom: (Platform.OS === 'ios' ? insets.bottom : insets.bottom) + 96,
        }]}>
          <Pressable onPress={() => setIsMapVisible(true)}>
            {({ pressed }) => (
              <View style={[styles.mapBtn, pressed && styles.mapBtnPressed]}>
                <MapTrifold size={20} color="#FFFFFF" weight="bold" />
                <Text style={styles.mapBtnText}>Map</Text>
              </View>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white, position: 'relative' },
  sectionContainer: { marginBottom: Space.xxxl - 8 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: Type.sizeH2, fontWeight: Type.weight700, color: Colors.textPrimary },
  seeAllBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  horizontalListPadding: { paddingHorizontal: HORIZONTAL_PADDING },
  mapBtnWrapper: { 
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100, // Highest layer to stay above tabs and lists
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.activeChip,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 99,
    gap: Space.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    top: Platform.OS === 'ios' ? 40 : 20,
  },
  mapBtnPressed: { backgroundColor: Colors.dark, transform: [{ scale: 0.95 }] },
  mapBtnText: { color: Colors.white, fontSize: Type.sizeBodySm, fontWeight: Type.weightSemibold },
});