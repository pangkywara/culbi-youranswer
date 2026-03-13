import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useRouter, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet from '@gorhom/bottom-sheet';

// Internal Components
import DiscoveryMap from '../Maps/DiscoveryMaps/DiscoveryMap';
import { ExperienceSheet } from './SearchComponents/SheetDrawer';
import { SearchModal } from './Modal/SearchModal';
import { ExploreHeader } from './ExploreHeader';
import { POIDetailSheet } from '../Maps/POI/POIDetailSheet';

// Hooks & Types
import { useExploreSearch } from '../../hooks/useExploreSearch';
import type { CulturalExperience } from '../../types';
import type { PlaceLandmark } from '../../types';
import { useTrips } from '@/context/TripContext';
import { buildPhotoUrl } from '@/lib/places';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'destinations', label: 'Destinations', source: require('../../assets/images/destinations.webp') },
  { id: 'events',       label: 'Events',       source: require('../../assets/images/events.webp'),       isNew: true },
  { id: 'groups',       label: 'Groups',       source: require('../../assets/images/groups.webp'),       isNew: true },
];

const BAR_HEIGHT = 56;

export default function ExploreScreen({ onClose, initialDestination, initialCoords, onSheetIndexChange, tripId, onAddToTrip }: {
  onClose?: () => void;
  initialDestination?: string;
  initialCoords?: { latitude: number; longitude: number };
  onSheetIndexChange?: (idx: number) => void;
  /** When set, ExploreScreen is in "picker" mode — POI will show Add to Itinerary */
  tripId?: string;
  onAddToTrip?: (landmark: PlaceLandmark) => void;
}) {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const handleClose = onClose ?? (() => router.back());
  const { addStop } = useTrips();

  const mapRef   = useRef<any>(null);
  const sheetRef = useRef<BottomSheet>(null);
  // Remembers last open snap position so we can restore it after POI closes.
  const lastSnapIndex = useRef(1);
  // Tracks POI open state in a ref to avoid stale closures in tab-bar callbacks.
  const poiOpenRef = useRef(false);

  const {
    experiences,
    activeFilter,
    initialFetch,
    handleSearch,
    handleReset,
  } = useExploreSearch();

  const [isSearchVisible,  setIsSearchVisible]  = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState('destinations');
  const [selectedPOI,      setSelectedPOI]      = useState<PlaceLandmark | null>(null);
  const searchProgress = useSharedValue(0);

  const headerHeight = insets.top + BAR_HEIGHT;

  // ─── Unified tab-bar visibility ──────────────────────────────────────────────
  // Tab bar hidden when drawer is fully expanded (snap 2) OR when POI is open.
  // Uses refs for both drawer index and POI state to guarantee no stale closures.
  const updateTabBar = useCallback((snapIndex: number, poiOpen: boolean) => {
    const shouldHide = snapIndex === 2 || poiOpen;
    navigation.getParent()?.setOptions({
      tabBarStyle: shouldHide ? { display: 'none' } : {
        display: 'flex',
        backgroundColor: '#FFFFFF',
        height: 80,
        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
      },
    });
  }, [navigation]);

  // ─── Callbacks ──────────────────────────────────────────────────────────────

  const handleSheetIndexChange = useCallback((index: number) => {
    // index === -1 means the sheet was programmatically closed (POI opened).
    // POI callbacks already handled tab-bar state — don't interfere.
    if (index < 0) return;
    lastSnapIndex.current = index;
    onSheetIndexChange?.(index);
    // Read poiOpenRef directly — avoids stale selectedPOI closure
    updateTabBar(index, poiOpenRef.current);
  }, [onSheetIndexChange, updateTabBar]);

  const handlePOIPress = useCallback((landmark: PlaceLandmark) => {
    poiOpenRef.current = true;
    setSelectedPOI(landmark);
    updateTabBar(lastSnapIndex.current, true);
    // Smoothly slide drawer off-screen
    sheetRef.current?.close();
  }, [updateTabBar]);

  const handlePOIClose = useCallback(() => {
    poiOpenRef.current = false;
    setSelectedPOI(null);
    updateTabBar(lastSnapIndex.current, false);
    // Smoothly restore drawer to last position
    sheetRef.current?.snapToIndex(lastSnapIndex.current);
  }, [updateTabBar]);

  /** Picker-mode: convert CulturalExperience → TripStop and add to trip. */
  const handleAddExperienceToTrip = useCallback((experience: CulturalExperience) => {
    if (!tripId) return;
    addStop(tripId, {
      landmark: {
        name: experience.title,
        thumbnail_url: buildPhotoUrl(experience.imageUrl, { maxWidth: 400 }),
        rarity_weight: 0.5,
        latitude: experience.location.latitude,
        longitude: experience.location.longitude,
        sign_count: 0,
      },
    });
  }, [tripId, addStop]);

  useEffect(() => {
    if (initialDestination) {
      const t = setTimeout(() => {
        handleSearch(mapRef, initialDestination, initialCoords);
        sheetRef.current?.snapToIndex(2);
      }, 350);
      return () => clearTimeout(t);
    }
    initialFetch();
  }, [initialDestination, initialCoords, initialFetch, handleSearch]);

  const onSearch = useCallback((destination: string, coords?: { latitude: number; longitude: number }) => {
    setIsSearchVisible(false);
    handleSearch(mapRef, destination, coords);
    setTimeout(() => sheetRef.current?.snapToIndex(2), 50);
  }, [handleSearch]);

  const onFilterClear = useCallback(() => {
    handleReset(mapRef);
    sheetRef.current?.snapToIndex(1);
  }, [handleReset]);

  const onItemPress = useCallback((item: CulturalExperience) => {
    router.push(`/destinations/${item.id}`);
  }, [router]);

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* 1. Map Layer */}
      <View style={StyleSheet.absoluteFillObject}>
        <DiscoveryMap
          mapRef={mapRef}
          hideDiscoveryButton
          hideMyLocationButton
          hideSettingsButton
          onSelectLandmark={() => {}}
          onToggleDiscovery={handleClose}
          onPOIPress={handlePOIPress}
          manageTabs={false}
        />
      </View>

      {/* 2. Modular Header Layer */}
      <ExploreHeader 
        topInset={insets.top}
        headerHeight={headerHeight}
        activeFilter={activeFilter}
        onBack={handleClose}
        onSearchPress={() => setIsSearchVisible(true)}
      />

      {/* 3. Bottom Sheet Layer */}
      <ExperienceSheet
        ref={sheetRef}
        data={experiences}
        onItemPress={onItemPress}
        snapIndex={1}
        activeFilter={activeFilter}
        topHeaderHeight={headerHeight}
        onFilterClear={onFilterClear}
        onSheetIndexChange={handleSheetIndexChange}
        tripId={tripId}
        onAddToTrip={tripId ? handleAddExperienceToTrip : undefined}
      />

      {/* 4. Search Modal Overlay */}
      <SearchModal
        isVisible={isSearchVisible}
        onClose={() => setIsSearchVisible(false)}
        progress={searchProgress}
        activeId={activeCategoryId}
        setActiveId={setActiveCategoryId}
        categories={CATEGORIES}
        onSearch={onSearch}
      />

      {/* 5. POI Detail Sheet — rendered above BottomSheet to fix z-order */}
      <POIDetailSheet
        isVisible={selectedPOI !== null}
        landmark={selectedPOI}
        onClose={handlePOIClose}
        tripId={tripId}
        onAddToTrip={onAddToTrip}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});