import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

interface ClusterMarkerProps {
  count: number;
}

// Keeping your brand red, but adding the Culbi "crisp" styling
const CLUSTER_COLOR = '#3874ff';

export const ClusterMarker = React.memo(function ClusterMarker({
  count,
}: ClusterMarkerProps) {
  // Dynamic sizing based on density
  const size = count >= 100 ? 48 : count >= 20 ? 42 : 36;
  const haloSize = size + 10;

  return (
    <View style={[styles.wrapper, { width: haloSize, height: haloSize }]}>
      {/* Translucent Outer Halo */}
      <View
        style={[
          styles.halo,
          {
            width: haloSize,
            height: haloSize,
            borderRadius: haloSize / 2,
            backgroundColor: `${CLUSTER_COLOR}22`, // Very light translucent ring
          },
        ]}
      />

      {/* Main Cluster Body */}
      <View
        style={[
          styles.inner,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: CLUSTER_COLOR,
            borderColor: '#FFFFFF', // Crisp white border from PropertyMarker
            borderWidth: 2.5,
          },
        ]}
      >
        <Text style={styles.count} numberOfLines={1}>
          {count >= 100 ? '99+' : count}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  halo: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow logic consistent with PlaceMarker
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  count: {
    fontSize: 14,
    fontWeight: '800', // Heavier weight for readability at a distance
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
});