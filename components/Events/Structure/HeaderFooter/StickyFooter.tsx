import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Plus, Star } from 'react-native-phosphor';
import { Colors, Type, Space, Radius, Shadows } from '@/constants/style';

export interface StickyFooterProps {
  /** Live rating from Google Places */
  rating?: number;
  /** Total review count */
  reviewCount?: number;
  /** Google Maps URL for directions */
  googleMapsUrl?: string;
  /** Place name for the directions link fallback */
  placeName?: string;
  /** Lat/lng fallback when googleMapsUrl is not available */
  coords?: { latitude: number; longitude: number } | null;
}

export default function StickyFooter({
  rating,
  reviewCount,
  googleMapsUrl,
  placeName,
  coords,
}: StickyFooterProps) {
  const handleDirections = () => {
    const url = googleMapsUrl ?? (coords 
      ? `https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName ?? 'cultural destination')}`);
    Linking.openURL(url);
  };

  return (
    <View style={styles.outerContainer}>
      <View style={styles.innerContainer}>
        {/* LEFT: SOCIAL PROOF */}
        <View style={styles.infoColumn}>
          {rating != null && (
            <View style={styles.ratingRow}>
              <Star size={16} weight="fill" color="#222" />
              <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
              {reviewCount != null && (
                <Text style={styles.reviewText}>({reviewCount.toLocaleString()})</Text>
              )}
            </View>
          )}
          <Text style={styles.subLabel}>Cultural destination</Text>
        </View>

        {/* RIGHT: ACTION BUTTON */}
        <TouchableOpacity 
          style={styles.directionsBtn} 
          onPress={handleDirections} 
          activeOpacity={0.8}
        >
          <Plus size={18} color="#fff" weight="bold" />
          <Text style={styles.btnText}>Add to trips</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16, // Handles iPhone "Home Bar"
    ...Shadows.level5, // Uses your style constant for a premium lift
  },
  innerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: '#F0F0F0',
  },
  infoColumn: {
    justifyContent: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  reviewText: {
    fontSize: 14,
    color: '#717171',
    fontWeight: '400',
    textDecorationLine: 'underline',
  },
  subLabel: {
    fontSize: 12,
    color: '#717171',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12, // More rounded for high-end feel
    gap: 8,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});