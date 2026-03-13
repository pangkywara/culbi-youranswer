import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BookOpenText, MapPinLine } from 'react-native-phosphor';
import { Colors, Shadows } from '@/constants/style';

interface PlaceMarkerProps {
  name?: string;
  hasCulturalTip?: boolean;
}

/**
 * Android specific scaling: 
 * iOS stays at 40, Android drops to 28 for a cleaner map view.
 */
const PIN_SIZE = Platform.OS === 'ios' ? 40 : 28;
const TAIL_SIZE = Platform.OS === 'ios' ? 14 : 6;
const MAIN_ICON_SIZE = Platform.OS === 'ios' ? 22 : 16;
const BADGE_SIZE = Platform.OS === 'ios' ? 16 : 13;

export default function PlaceMarker({ hasCulturalTip }: PlaceMarkerProps) {
  return (
    <View
      style={styles.wrapper}
      shouldRasterizeIOS
      renderToHardwareTextureAndroid
    >
      <View style={styles.container}>
        {/* The Rounded Tail */}
        <View style={styles.tailWrapper}>
           <View style={styles.roundedTail} />
        </View>

        {/* Pin head - Using Aero Blue and Level 2 Shadow */}
        <View style={styles.pinHead}>
          <MapPinLine 
            size={MAIN_ICON_SIZE} 
            color={Colors.white} 
            weight="fill" 
          />
          
          {/* Cultural Tip Indicator */}
          {hasCulturalTip && (
            <View style={styles.tipBadge}>
              <BookOpenText 
                size={Platform.OS === 'ios' ? 8 : 6.5} 
                color={Colors.white} 
                weight="fill" 
              />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  container: {
    width: PIN_SIZE,
    height: PIN_SIZE + (Platform.OS === 'ios' ? 6 : 4),
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  pinHead: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
    backgroundColor: Colors.brand, // Aero Blue
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
    marginBottom: Platform.OS === 'ios' ? 4 : 3,
  },
  tipBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? -2 : -1,
    right: Platform.OS === 'ios' ? -2 : -1,
    backgroundColor: '#FFB800', 
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: Platform.OS === 'ios' ? 1.5 : 1,
    borderColor: Colors.white,
    zIndex: 3,
  },
});