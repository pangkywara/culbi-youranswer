import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import type MapView from 'react-native-maps';
import GoogleMapView from '@/components/Maps/GoogleMapView';
import Constants from 'expo-constants';
const MAP_PROVIDER = Constants.appOwnership === 'expo' ? undefined : PROVIDER_GOOGLE;
import { ArrowsOutSimple, MapPin } from 'react-native-phosphor';
import { useRouter } from 'expo-router';
import { getMapStyle } from '@/constants/MapStyle';

interface LocationBubbleProps {
  latitude: number;
  longitude: number;
  address?: string;
  isUser?: boolean;
  onPress?: () => void;
}

export const LocationBubble = ({ latitude, longitude, address, isUser }: LocationBubbleProps) => {
  const mapRef = useRef<MapView | null>(null);
  const router = useRouter();

  const handleOpenDiscovery = () => {
    // Navigates to your map with the required params
    router.push({
      pathname: '/destinations/discovery', // Update this to your actual file path
      params: {
        lat: latitude.toString(),
        lng: longitude.toString()
      }
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      mapRef.current?.animateCamera({
        center: { latitude, longitude },
        zoom: 16,
      }, { duration: 400 });
    }, 400);
    return () => clearTimeout(timer);
  }, [latitude, longitude]);

  return (
    <View style={[styles.bubbleContainer, isUser ? styles.userAlign : styles.aiAlign]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleOpenDiscovery}
        style={[styles.card, isUser ? styles.userCard : styles.aiCard]}
      >
        <View style={styles.mapContainer}>
          <GoogleMapView
            ref={mapRef}
            provider={MAP_PROVIDER}
            style={styles.map}
            initialRegion={{
              latitude,
              longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            customMapStyle={getMapStyle('culbi')}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            <Marker
              coordinate={{ latitude, longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.pinHead}>
                <MapPin size={20} color="#ffffff" weight="fill" />
              </View>
            </Marker>
          </GoogleMapView>

          <View style={styles.maximizeIcon}>
            <ArrowsOutSimple size={14} color="#222" weight="bold" />
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.addressText} numberOfLines={1}>
            {address || "Location Shared"}
          </Text>
          <Text style={styles.subText}>Open in Discovery</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bubbleContainer: { marginVertical: 6, width: '100%', flexDirection: 'row' },
  userAlign: { justifyContent: 'flex-end', paddingLeft: 60 },
  aiAlign: { justifyContent: 'flex-start', paddingRight: 60 },

  card: {
    width: 260,
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EBEBEB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userCard: { borderBottomRightRadius: 4 },
  aiCard: { borderBottomLeftRadius: 4 },

  mapContainer: { height: 140, width: '100%', backgroundColor: '#F7F7F7' },
  map: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },


  maximizeIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DDD',
  },
  pinHead: {
    width: 38,
    height: 38,
    borderRadius: 22,
    backgroundColor: '#FF385C',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },

  infoSection: { padding: 12, paddingBottom: 14 },
  addressText: { fontSize: 14, fontWeight: '700', color: '#222' },
  subText: { fontSize: 12, color: '#888', marginTop: 3 },
});