import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PROVIDER_GOOGLE } from 'react-native-maps';
import type MapView from 'react-native-maps';
import GoogleMapView from '@/components/Maps/GoogleMapView';
import Constants from 'expo-constants';
const MAP_PROVIDER = Constants.appOwnership === 'expo' ? undefined : PROVIDER_GOOGLE;
import { ArrowsOutSimple, CaretRight } from 'react-native-phosphor';
import { useRouter } from 'expo-router';
import { getMapStyle } from '@/constants/MapStyle';
import PropertyMarker from './PropertyMarker';

const DEFAULT_COORDS = { latitude: 1.5333, longitude: 110.3667 };

export interface LocationSectionProps {
  coords?: { latitude: number; longitude: number } | null;
  locationLabel?: string;
  placeId?: string;
  /** NEW: If true, hides all text headers and footers for a compact UI */
  hideTextElements?: boolean;
}

export default function LocationSection({
  coords,
  locationLabel,
  placeId,
  hideTextElements = false
}: LocationSectionProps) {
  const router = useRouter();
  const mapRef = useRef<MapView | null>(null);

  const lat = coords?.latitude ?? DEFAULT_COORDS.latitude;
  const lng = coords?.longitude ?? DEFAULT_COORDS.longitude;

  const handleNavigateToDiscovery = () => {
    router.push({
      pathname: '/destinations/discovery',
      params: { lat: lat.toString(), lng: lng.toString(), ...(placeId ? { placeId } : {}) },
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      mapRef.current?.animateCamera(
        { center: { latitude: lat, longitude: lng }, zoom: 17.5 },
        { duration: 500 }
      );
    }, 250);
    return () => clearTimeout(timer);
  }, [lat, lng]);

  return (
    <View style={[styles.container, hideTextElements && styles.containerCompact]}>
      {/* Conditionally render header */}
      {!hideTextElements && (
        <View style={styles.header}>
          <Text style={styles.title}>Where you'll be</Text>
          <Text style={styles.locationSub}>{locationLabel ?? 'ASEAN Cultural Destination'}</Text>
        </View>
      )}

      <View style={[styles.mapWrapper, hideTextElements && styles.mapWrapperCompact]}>
        <GoogleMapView
          ref={mapRef}
          provider={MAP_PROVIDER}
          style={styles.map}
          initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
          customMapStyle={getMapStyle('culbi')}
          scrollEnabled={!hideTextElements}
          zoomEnabled={true}
          onPress={handleNavigateToDiscovery}
        >
          <PropertyMarker coordinate={{ latitude: lat, longitude: lng }} />
        </GoogleMapView>

        <TouchableOpacity style={styles.maximizeBtn} onPress={handleNavigateToDiscovery}>
          <ArrowsOutSimple size={20} color="#222" weight="bold" />
        </TouchableOpacity>
      </View>

      {/* Conditionally render footer */}
      {!hideTextElements && (
        <TouchableOpacity style={styles.showMoreRow} onPress={handleNavigateToDiscovery}>
          <Text style={styles.showMoreText}>Show more</Text>
          <CaretRight size={18} color="#222" weight="bold" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 32 },
  containerCompact: { marginTop: 16 }, // Less top margin when text is hidden
  header: { marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '600', color: '#222' },
  locationSub: { fontSize: 16, color: '#222', marginTop: 12 },
  mapWrapper: {
    height: 400,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 20,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#EEE',
  },
  mapWrapperCompact: {
    height: 240, // Smaller height for the Trips list
    marginTop: 0,
  },
  map: { ...StyleSheet.absoluteFillObject },
  maximizeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  showMoreRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24, gap: 6 },
  showMoreText: { fontSize: 17, fontWeight: '600', textDecorationLine: 'underline' },
});