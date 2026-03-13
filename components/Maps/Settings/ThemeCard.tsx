import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MapThemeKey, MAP_THEME_PREVIEWS } from '../../../constants/MapStyle';

interface ThemeCardProps {
  themeKey: MapThemeKey;
  isActive: boolean;
  onPress: () => void;
}

export const ThemeCard = React.memo(function ThemeCard({
  themeKey,
  isActive,
  onPress,
}: ThemeCardProps) {

  const preview = MAP_THEME_PREVIEWS[themeKey];
  const [bg, road, water] = preview.colors;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.swatchWrapper,
          isActive && styles.activeShadow,
          isActive && styles.activeBorder, // ⭐ NEW
        ]}
      >
        <View style={[styles.swatch, { backgroundColor: bg }]}>
          <View style={[styles.swatchRoad, { backgroundColor: road }]} />
          <View style={[styles.swatchWater, { backgroundColor: water }]} />
        </View>
      </View>

      <Text style={[styles.label, isActive && styles.labelActive]}>
        {preview.label}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({

  card: {
    width: 72,
    alignItems: 'center',
    marginRight: 12,
  },

  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.85,
  },

  /* ───────── SWATCH WRAPPER ───────── */

swatchWrapper: {
  borderRadius: 14,
  backgroundColor: '#FFFFFF',
  padding: 3,

  // ⭐ FIX — border always exists
  borderWidth: 1,
  borderColor: 'transparent',

  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 4,
  elevation: 1,
},

  activeShadow: {
    shadowOpacity: 0.18,
    elevation: 2,
  },

  activeBorder: {
    borderWidth: 1,
    borderColor: '#222222', // charcoal
  },

  /* ───────── SWATCH PREVIEW ───────── */

  swatch: {
    width: 66,
    height: 48,
    borderRadius: 11,
    overflow: 'hidden',
  },

  swatchRoad: {
    position: 'absolute',
    bottom: 16,
    left: 12,
    right: 12,
    height: 6,
    borderRadius: 3,
    opacity: 0.9,
  },

  swatchWater: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 16,
    opacity: 0.85,
  },

  label: {
    marginTop: 6,
    fontSize: 12,
    color: '#8F8F8F',
    fontWeight: '500',
    textAlign: 'center',
  },

  labelActive: {
    color: '#222222',
    fontWeight: '700',
  },
});