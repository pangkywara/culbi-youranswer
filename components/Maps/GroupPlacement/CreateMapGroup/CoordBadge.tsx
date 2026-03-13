import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { MapPin } from "react-native-phosphor";

interface CoordBadgeProps {
  coordinate: { latitude: number; longitude: number };
}

export function CoordBadge({ coordinate }: CoordBadgeProps) {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <MapPin size={14} color="#222222" weight="bold" />
        <Text style={styles.coordText}>
          {coordinate.latitude.toFixed(5)}°, {coordinate.longitude.toFixed(5)}°
        </Text>
      </View>
      <Text style={styles.helperText}>Exact location on map</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F7F7", // Neutral grey matching input cards
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    gap: 6,
  },
  coordText: {
    fontSize: 13,
    color: "#222222",
    fontWeight: "600",
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', // Monospace keeps numbers from jumping
  },
  helperText: {
    fontSize: 13,
    color: '#717171',
    fontWeight: '400',
  },
});