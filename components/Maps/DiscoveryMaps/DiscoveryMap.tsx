import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Constants from "expo-constants";
import * as Location from "expo-location";
import {
  LongPressEvent,
  Marker,
  PROVIDER_GOOGLE,
  Region
} from "react-native-maps";
import type MapView from "react-native-maps";
import GoogleMapView from "@/components/Maps/GoogleMapView";
import { Cards, SlidersHorizontal } from "react-native-phosphor";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TAB_BAR_STYLE } from "@/app/(tabs)/_layout";
import { Colors } from "@/constants/style";
import { useAuth } from "@/context/AuthContext";
import { useMapGroups, type MapGroup } from "@/hooks/useMapGroups";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  CULTURAL_BRIDGE_BLUE,
  REGION_FETCH_DEBOUNCE_MS,
} from "../../../constants/config";
import { getMapStyle, MapThemeKey } from "../../../constants/MapStyle";
import { useCulturalTips } from "../../../hooks/useCulturalTips";
import { usePlacesSearch } from "../../../hooks/usePlacesSearch";
import { PlaceLandmark } from "../../../types";
import { CreateMapGroupSheet } from "../GroupPlacement/CreateMapGroupSheet";
import { GroupDetailSheet } from "../GroupPlacement/GroupDetailSheet";
import { GroupPlacementButton } from "../GroupPlacement/GroupPlacementButton";
import CultureMarker from "../Marker/CultureMarker";
import GroupMarker from "../Marker/GroupMarker";
import { POIDetailSheet } from "../POI/POIDetailSheet";
import MapSettingsPanel, { MapTypeKey } from "../Settings/MapSettingsPanel";

// --- Constants ---
const TAB_BAR_HEIGHT = 60;
const DEFAULT_REGION: Region = {
  latitude: -0.0263,
  longitude: 109.3425,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const MAP_PROVIDER = (
  Constants.appOwnership === "expo"
    ? undefined
    : PROVIDER_GOOGLE
) as typeof PROVIDER_GOOGLE | undefined;

interface DiscoveryMapProps {
  mapRef?: React.RefObject<any>;
  onSelectLandmark: (landmark: PlaceLandmark) => void;
  onToggleDiscovery: () => void;
  hideDiscoveryButton?: boolean;
  hideSettingsButton?: boolean;
  hideMyLocationButton?: boolean;
  hideGroupButton?: boolean;
  onPOIPress?: (landmark: PlaceLandmark) => void;
  manageTabs?: boolean;
}

function LazyMarker({ children, ...props }: React.ComponentProps<typeof Marker>) {
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setTracks(false), 500);
    return () => clearTimeout(t);
  }, []);
  return (
    <Marker {...props} tracksViewChanges={tracks}>
      {children}
    </Marker>
  );
}

export default function DiscoveryMap({
  mapRef: externalMapRef,
  onSelectLandmark,
  onToggleDiscovery,
  hideDiscoveryButton = false,
  hideSettingsButton = false,
  hideMyLocationButton = false,
  hideGroupButton = false,
  onPOIPress,
  manageTabs = true,
}: DiscoveryMapProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();
  const { session, isAnonymous } = useAuth();
  const internalMapRef = useRef<any>(null);
  const mapRef = externalMapRef ?? internalMapRef;
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentRegionRef = useRef<Region | null>(null);

  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState<PlaceLandmark | null>(null);
  const [groupPlacementCoords, setGroupPlacementCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<MapGroup | null>(null);

  const [themeUI, setThemeUI] = useState<MapThemeKey>("culbi");
  const [mapTypeUI, setMapTypeUI] = useState<MapTypeKey>("standard");
  const [showPOI, setShowPOI] = useState(true);
  const [showTransit, setShowTransit] = useState(true);
  const [showTraffic, setShowTraffic] = useState(false);

  const { landmarks: rawLandmarks, loading, fetchPlaces, clearLandmarks } = usePlacesSearch();
  const { fetchTips, hasTip } = useCulturalTips();
  const { groups, fetchGroups } = useMapGroups();

  const isAuthenticated = !!session && !isAnonymous;

  const landmarks = useMemo<PlaceLandmark[]>(
    () => rawLandmarks.slice(0, 15).map((lm) => ({ ...lm, hasCulturalTip: hasTip(lm.id) })),
    [rawLandmarks, hasTip],
  );

  const fetchedTipIdsRef = useRef<string>("");
  useEffect(() => {
    if (rawLandmarks.length === 0) return;
    const ids = rawLandmarks.map((lm) => lm.id).sort().join(",");
    if (ids === fetchedTipIdsRef.current) return;
    fetchedTipIdsRef.current = ids;
    fetchTips(rawLandmarks.map((lm) => lm.id));
  }, [rawLandmarks, fetchTips]);

  useEffect(() => {
    if (!showPOI) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      clearLandmarks();
    } else if (currentRegionRef.current) {
      fetchPlaces(currentRegionRef.current);
    }
  }, [showPOI, clearLandmarks, fetchPlaces]);

  useEffect(() => {
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, []);

  useEffect(() => {
    fetchPlaces(DEFAULT_REGION);
    fetchGroups(DEFAULT_REGION);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        setHasLocationPermission(true);
        const lastKnown = await Location.getLastKnownPositionAsync();
        const coords = lastKnown ? lastKnown.coords : (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low })).coords;
        mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 600);
      } catch (e) { console.log(e); }
    })();
  }, [mapRef]);

  const handleRegionChangeComplete = useCallback((region: Region) => {
    currentRegionRef.current = region;
    fetchGroups(region);
    if (!showPOI) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchPlaces(region), REGION_FETCH_DEBOUNCE_MS);
  }, [fetchPlaces, fetchGroups, showPOI]);

  const handleGoToMyLocation = useCallback(async () => {
    if (!hasLocationPermission) return;
    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    mapRef.current?.animateToRegion({ ...location.coords, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 800);
  }, [hasLocationPermission, mapRef]);

  const handleMarkerPress = useCallback((lm: PlaceLandmark) => {
    if (onPOIPress) onPOIPress(lm);
    else setSelectedPOI(lm);
  }, [onPOIPress]);

  const handleGroupMarkerPress = useCallback((group: MapGroup) => {
    setSelectedGroup(group);
  }, []);

  const handleLongPress = useCallback((e: LongPressEvent) => {
    if (!isAuthenticated || settingsVisible || selectedPOI) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGroupPlacementCoords(e.nativeEvent.coordinate);
  }, [isAuthenticated, settingsVisible, selectedPOI]);

  const handlePlaceGroup = useCallback((coordinate: { latitude: number; longitude: number }) => {
    if (!isAuthenticated) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGroupPlacementCoords(coordinate);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!manageTabs) return;
    navigation.setOptions({ tabBarStyle: selectedPOI ? { display: "none" } : TAB_BAR_STYLE.bar });
  }, [selectedPOI, navigation, manageTabs]);

  const markerElements = useMemo(() =>
    landmarks.map((lm) => (
      <LazyMarker key={lm.id} coordinate={lm.coords} onPress={() => handleMarkerPress(lm)}>
        <CultureMarker landmark={lm} />
      </LazyMarker>
    )), [landmarks, handleMarkerPress]);

  const groupMarkerElements = useMemo(() =>
    groups.map((g) => (
      <LazyMarker key={`group-${g.id}`} coordinate={{ latitude: g.latitude, longitude: g.longitude }} anchor={{ x: 0.5, y: 1 }} onPress={() => handleGroupMarkerPress(g)}>
        <GroupMarker name={g.name} category={g.category} visibility={g.visibility} memberCount={g.memberCount} />
      </LazyMarker>
    )), [groups, handleGroupMarkerPress]);

  const computedMapStyle = useMemo(() => {
    const base = getMapStyle(themeUI);
    const overrides = [];
    if (!showPOI) overrides.push({ featureType: "poi", elementType: "all", stylers: [{ visibility: "off" }] });
    if (!showTransit) overrides.push({ featureType: "transit", elementType: "all", stylers: [{ visibility: "off" }] });
    return [...base, ...overrides];
  }, [themeUI, showPOI, showTransit]);

  const baseBottom = insets.bottom + TAB_BAR_HEIGHT;

  return (
    <View style={styles.container}>
      <GoogleMapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={MAP_PROVIDER}
        initialRegion={DEFAULT_REGION}
        mapType={mapTypeUI}
        customMapStyle={computedMapStyle}
        showsUserLocation={hasLocationPermission}
        showsTraffic={showTraffic}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsMyLocationButton={false}
        rotateEnabled={false}
        pitchEnabled={false}
        moveOnMarkerPress={false}
        zoomControlEnabled={false}
        toolbarEnabled={false}
        onLongPress={handleLongPress}
      >
        {markerElements}
        {groupMarkerElements}
      </GoogleMapView>

      {/* 1. BUTTONS (PLACED BEFORE SHEETS SO THEY STAY BEHIND BACKDROP) */}
      {!hideGroupButton && isAuthenticated && (
        <GroupPlacementButton
          mapRef={mapRef}
          onPlaceGroup={handlePlaceGroup}
          bottomOffset={baseBottom}
        />
      )}

      {loading && (
        <View style={styles.loadingBadge}>
          <ActivityIndicator size="small" color={CULTURAL_BRIDGE_BLUE} />
          <Text style={styles.loadingText}>Finding places…</Text>
        </View>
      )}

      {!hideMyLocationButton && hasLocationPermission && (
        <TouchableOpacity style={[styles.floatingBtn, { bottom: baseBottom + (Platform.OS === "ios" ? 120 : 140) }]} onPress={handleGoToMyLocation}>
          <MaterialIcons name="my-location" size={24} color="#4A4A4A" />
        </TouchableOpacity>
      )}

      {!hideSettingsButton && (
        <TouchableOpacity style={[styles.floatingBtn, { bottom: baseBottom + (Platform.OS === "ios" ? 60 : 80) }]} onPress={() => setSettingsVisible(true)}>
          <SlidersHorizontal size={22} color="#4A4A4A" weight="bold" />
        </TouchableOpacity>
      )}

      {!hideDiscoveryButton && (
        <TouchableOpacity style={[styles.discoveryButton, { bottom: baseBottom + (Platform.OS === "ios" ? 0 : 20) }]} onPress={onToggleDiscovery}>
          <View style={styles.discoveryInner}><Cards size={22} color="#FFF" /><Text style={styles.discoveryText}>Discovery</Text></View>
        </TouchableOpacity>
      )}

      {/* 2. OVERLAY SHEETS (PLACED LAST TO STAY ON TOP) */}
      <MapSettingsPanel
        isVisible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        theme={themeUI}
        onThemeChange={setThemeUI}
        mapType={mapTypeUI}
        onMapTypeChange={setMapTypeUI}
        showPOI={showPOI}
        onShowPOIChange={setShowPOI}
        showTransit={showTransit}
        onShowTransitChange={setShowTransit}
        showTraffic={showTraffic}
        onShowTrafficChange={setShowTraffic}
      />

      {!onPOIPress && (
        <POIDetailSheet
          isVisible={selectedPOI !== null}
          landmark={selectedPOI}
          onClose={() => setSelectedPOI(null)}
        />
      )}

      <GroupDetailSheet
        isVisible={selectedGroup !== null}
        group={selectedGroup}
        currentUserId={session?.user?.id ?? ""}
        onClose={() => setSelectedGroup(null)}
        onJoined={(id) => currentRegionRef.current && fetchGroups(currentRegionRef.current)}
        onOpenChat={(id) => router.push(`/groupchat/${id}`)}
      />

      <CreateMapGroupSheet
        visible={groupPlacementCoords !== null}
        coordinate={groupPlacementCoords}
        onClose={() => setGroupPlacementCoords(null)}
        onGroupCreated={(id) => {
          if (currentRegionRef.current) fetchGroups(currentRegionRef.current);
          router.push(`/groupchat/${id}`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingBadge: {
    position: "absolute", top: Platform.OS === "ios" ? 60 : 40, alignSelf: "center",
    flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFFFFF",
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, elevation: 6,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, zIndex: 5
  },
  loadingText: { fontSize: 13, fontWeight: "500", color: "#4A4A4A" },
  floatingBtn: {
    position: "absolute", right: 16, backgroundColor: "#FFFFFF", padding: 12,
    borderRadius: 30, elevation: 5, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 6,
  },
  discoveryButton: {
    position: "absolute", right: 16, backgroundColor: Colors.activeChip, borderRadius: 28,
    paddingVertical: 12, paddingHorizontal: 18, elevation: 10, shadowColor: "#000",
    shadowOpacity: 0.3, shadowRadius: 10,
  },
  discoveryInner: { flexDirection: "row", alignItems: "center", gap: 6 },
  discoveryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
});