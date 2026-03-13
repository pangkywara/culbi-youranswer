import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Marker } from 'react-native-maps';
import { MapPinLine } from 'react-native-phosphor';
import { Colors, Shadows } from '@/constants/style';

interface PropertyMarkerProps {
  coordinate: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Standardized sizes for map markers:
 * iOS: 40px (Comfortable touch target)
 * Android: 28px (Clean, high-density map view)
 */
const PIN_SIZE = Platform.OS === 'ios' ? 40 : 28; 
const TAIL_SIZE = Platform.OS === 'ios' ? 14 : 6; 
const ICON_SIZE = Platform.OS === 'ios' ? 22 : 16;

export default function PropertyMarker({ coordinate }: PropertyMarkerProps) {
  return (
    <Marker 
      coordinate={coordinate} 
      anchor={{ x: 0.5, y: 1 }}
      // Note: tracksViewChanges={false} can be added here for better map performance 
      // if these markers are static.
    >
      <View style={styles.container}>
        {/* The Tail Container ensures the tail is mathematically centered */}
        <View style={styles.tailWrapper}>
           <View style={styles.roundedTail} />
        </View>

        {/* Pin head sitting on top */}
        <View style={styles.pinHead}>
          <MapPinLine 
            size={ICON_SIZE} 
            color={Colors.white} 
            weight="fill" 
          />
        </View>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: {
    width: PIN_SIZE,
    // Slightly less vertical offset for the smaller Android pin
    height: PIN_SIZE + (Platform.OS === 'ios' ? 6 : 4), 
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  pinHead: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
    backgroundColor: Colors.brand, 
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    ...Shadows.level2,
  },
  tailWrapper: {
    position: 'absolute',
    bottom: 0, 
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  roundedTail: {
    width: TAIL_SIZE,
    height: TAIL_SIZE,
    backgroundColor: Colors.brand,
    borderRadius: Platform.OS === 'ios' ? 4 : 2, 
    transform: [{ rotate: '45deg' }],
    // Reduced margin for Android to keep the tail tucked under the head
    marginBottom: Platform.OS === 'ios' ? 4 : 3, 
  },
});