import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PROVIDER_GOOGLE } from 'react-native-maps';
import GoogleMapView from '@/components/Maps/GoogleMapView';
import Constants from 'expo-constants';
const MAP_PROVIDER = Constants.appOwnership === 'expo' ? undefined : PROVIDER_GOOGLE;
import { ArrowsOutSimple } from 'react-native-phosphor';
import { useRouter } from 'expo-router';
import { getMapStyle } from '@/constants/MapStyle';
import PropertyMarker from '@/components/Destinations/Maps/PropertyMarker';
import { styles as screenStyles } from './TripsScreen.styles';

interface TimelineCardProps {
  status: 'active' | 'inactive';
  coords: { latitude: number; longitude: number };
  locationLabel: string;
  placeId?: string;
}

export const TimelineCard = memo(({ status, coords, locationLabel, placeId }: TimelineCardProps) => {
  const router = useRouter();

  const handleNavigate = () => {
    router.push({
      pathname: '/destinations/discovery',
      params: {
        lat: coords.latitude.toString(),
        lng: coords.longitude.toString(),
        ...(placeId ? { placeId } : {}),
      },
    });
  };

  return (
    <View style={screenStyles.timelineRow}>
      {/* 1. The Vertical Indicator (Dot) */}
      <View style={screenStyles.dotContainer}>
        <View style={[screenStyles.dot, status === 'active' ? screenStyles.dotActive : screenStyles.dotInactive]} />
      </View>

      {/* 2. The Map Card Content */}
      <View style={localStyles.mapCard}>
        <View style={localStyles.mapHeader}>
          <Text style={localStyles.locationLabel} numberOfLines={1}>{locationLabel}</Text>
        </View>

        <View style={localStyles.mapWrapper}>
          <GoogleMapView
            provider={MAP_PROVIDER}
            style={StyleSheet.absoluteFillObject}
            initialRegion={{
              ...coords,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            customMapStyle={getMapStyle('culbi')}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
            onPress={handleNavigate}
          >
            <PropertyMarker coordinate={coords} />
          </GoogleMapView>

          <TouchableOpacity style={localStyles.maximizeBtn} onPress={handleNavigate}>
            <ArrowsOutSimple size={18} color="#222" weight="bold" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const localStyles = StyleSheet.create({
  mapCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginLeft: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    // Matches your existing card shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapHeader: { marginBottom: 8 },
  locationLabel: { fontSize: 15, fontWeight: '600', color: '#222' },
  mapWrapper: {
    height: 150, // Smaller for timeline view
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  maximizeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFF',
    padding: 6,
    borderRadius: 20,
    elevation: 4,
  }
});