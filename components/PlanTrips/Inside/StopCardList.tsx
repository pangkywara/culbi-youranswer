import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Flag, Notebook, Clock } from 'react-native-phosphor';
import { Colors, Space, Radius } from '@/constants/style';
import { getRarity, type TripStop } from '@/components/PastTrips/TripStopRow';

// ─── ADDED 'export' HERE ───────────────────────────────────────────────────────
export function StopCard({ stop }: { stop: TripStop }) {
  const rarity = getRarity(stop.landmark.rarity_weight);

  return (
    <View style={card.container}>
      <View style={card.numberCircle}>
        <Text style={card.numberText}>{stop.stop_order}</Text>
      </View>

      <Image
        source={{ uri: stop.landmark.thumbnail_url }}
        style={card.hero}
        contentFit="cover"
        transition={200}
      />

      <View style={card.content}>
        <Text style={card.name}>{stop.landmark.name}</Text>

        <View style={card.statsRow}>
          <View style={card.ratingDots}>
            {[1, 2, 3, 4, 5].map((dot) => (
              <View key={dot} style={[card.dot, dot <= 4 && card.dotActive]} />
            ))}
          </View>
          <Text style={card.reviewCount}>(134)</Text>
        </View>

        <View style={card.metaRow}>
          <View style={card.metaItem}>
            <Flag size={14} color={Colors.textSecondary} />
            <Text style={card.metaLabel}>{rarity}</Text>
          </View>
          <Text style={card.separator}>•</Text>
          <View style={card.metaItem}>
            <Notebook size={14} color={Colors.textSecondary} />
            <Text style={card.metaLabel}>{stop.landmark.sign_count} signs</Text>
          </View>
          <Text style={card.separator}>•</Text>
          <View style={card.metaItem}>
            <Clock size={14} color={Colors.textSecondary} />
            <Text style={card.metaLabel}>&lt; 1 hour</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── List ─────────────────────────────────────────────────────────────────────

export const StopCardList = ({ stops }: { stops: TripStop[] }) => (
  <View style={listStyles.container}>
    {stops.map((stop) => (
      <StopCard key={`card-${stop.stop_order}`} stop={stop} />
    ))}
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const listStyles = StyleSheet.create({
  container: {
    paddingHorizontal: Space.xxl,
    paddingTop: Space.md,
    gap: 40, // More space between stops
  },
});

const card = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
  },
  numberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#004D2C', // Deep Green
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Space.md,
  },
  numberText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  hero: {
    width: '100%',
    height: 220,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
  },
  content: {
    paddingVertical: Space.lg,
    gap: 6,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#004D2C', // Deep Green
    letterSpacing: -0.4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingDots: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00AA6C',
  },
  dotActive: {
    backgroundColor: '#00AA6C',
  },
  reviewCount: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
  separator: {
    marginHorizontal: 8,
    color: Colors.border,
  },
});