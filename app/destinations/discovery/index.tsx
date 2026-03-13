import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ClusteredMapView from 'react-native-map-clustering';
import { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import Constants from 'expo-constants';
const MAP_PROVIDER = Constants.appOwnership === 'expo' ? undefined : PROVIDER_GOOGLE;
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { ArrowUUpLeft, SlidersHorizontal } from 'react-native-phosphor';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ClusterMarker } from '@/components/Maps/Marker/ClusterMarker';
import { getMapStyle, MapThemeKey } from '@/constants/MapStyle';
import MapSettingsPanel, { MapTypeKey } from '@/components/Maps/Settings/MapSettingsPanel';
import { CULTURAL_BRIDGE_BLUE } from '@/constants/config';
import PropertyMarker from '@/components/Destinations/Maps/PropertyMarker';

const DEFAULT_REGION: Region = {
  latitude: -0.0263,
  longitude: 109.3425,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function DiscoveryMap() {
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const params = useLocalSearchParams();

  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  // ── Map Appearance State ──
  const [themeUI, setThemeUI] = useState<MapThemeKey>('culbi');
  const [mapTypeUI, setMapTypeUI] = useState<MapTypeKey>('standard');
  const [showPOI, setShowPOI] = useState(true);
  const [showTransit, setShowTransit] = useState(true);
  const [showTraffic, setShowTraffic] = useState(false);

  // ── Optimization: Instant Marker Rendering ──
  const propertyCoords = useMemo(() => ({
    latitude: params.lat ? parseFloat(params.lat as string) : DEFAULT_REGION.latitude,
    longitude: params.lng ? parseFloat(params.lng as string) : DEFAULT_REGION.longitude,
  }), [params.lat, params.lng]);

  const initialRegion = useMemo(() => ({
    ...propertyCoords,
    latitudeDelta: 0.0015,   
    longitudeDelta: 0.0015,
  }), [propertyCoords]);

  // ── THE FIX: Computed Map Style ──
  // This manually overrides the base theme to hide POI and Transit layers
  const computedMapStyle = useMemo(() => {
    const base = getMapStyle(themeUI);
    const overrides: Array<{ featureType: string; elementType: string; stylers: object[] }> = [];
    
    if (!showPOI) {
      overrides.push(
        { featureType: 'poi',            elementType: 'all', stylers: [{ visibility: 'off' }] },
        { featureType: 'poi.business',   elementType: 'all', stylers: [{ visibility: 'off' }] },
        { featureType: 'poi.attraction', elementType: 'all', stylers: [{ visibility: 'off' }] },
      );
    }
    
    if (!showTransit) {
      overrides.push(
        { featureType: 'transit', elementType: 'all', stylers: [{ visibility: 'off' }] },
      );
    }
    
    return [...base, ...overrides];
  }, [themeUI, showPOI, showTransit]);

  // Location Permissions logic remains the same...
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setHasLocationPermission(true);
          if (!params.lat && !params.lng) {
            const lastKnown = await Location.getLastKnownPositionAsync();
            const coords = lastKnown
              ? lastKnown.coords
              : (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low })).coords;

            mapRef.current?.animateToRegion({
              latitude: coords.latitude,
              longitude: coords.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }, 800);
          }
        }
      } catch (e) {
        console.log('[DiscoveryMap] Location error:', e);
      }
    })();
  }, [params.lat, params.lng]);

  useEffect(() => {
    if (!mapRef.current) return;
    const timer = setTimeout(() => {
      mapRef.current.animateCamera({
          center: propertyCoords,
          zoom: 17.5,
        }, { duration: 600 });
    }, 200);
    return () => clearTimeout(timer);
  }, [propertyCoords]);

  const handleGoToMyLocation = useCallback(async () => {
    if (!hasLocationPermission) return;
    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    mapRef.current?.animateToRegion({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 800);
  }, [hasLocationPermission]);

  return (
    <View style={styles.container}>
      <ClusteredMapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={MAP_PROVIDER}
        initialRegion={initialRegion}
        mapType={mapTypeUI}
        customMapStyle={computedMapStyle} // Updated to use the computed style
        showsUserLocation={hasLocationPermission}
        showsTraffic={showTraffic}
        showsMyLocationButton={false}
        clusterColor={CULTURAL_BRIDGE_BLUE}
        renderCluster={(cluster: any) => (
          <Marker
            key={`cluster-${cluster.id}`}
            coordinate={{
              longitude: cluster.geometry.coordinates[0],
              latitude: cluster.geometry.coordinates[1],
            }}
          >
            <ClusterMarker count={cluster.properties.point_count} />
          </Marker>
        )}
      >
        <PropertyMarker coordinate={propertyCoords} />
      </ClusteredMapView>

      {/* Custom Stacked UI Buttons */}
      {hasLocationPermission && (
        <TouchableOpacity style={styles.myLocationButton} onPress={handleGoToMyLocation}>
          <MaterialIcons name="my-location" size={24} color="#4A4A4A" />
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.settingsButton} onPress={() => setSettingsVisible(true)}>
        <SlidersHorizontal size={22} color="#4A4A4A" weight="bold" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.discoveryButton} onPress={() => router.back()}>
        <View style={styles.discoveryInner}>
          <ArrowUUpLeft size={22} color="#FFF" />
          <Text style={styles.discoveryText}>Back</Text>
        </View>
      </TouchableOpacity>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  myLocationButton: {
    position: 'absolute',
    bottom: 136,
    right: 16,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  settingsButton: {
    position: 'absolute',
    bottom: 76,
    right: 16,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  discoveryButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 18,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  discoveryInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  discoveryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});