import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { 
  GlobeSimple, 
  Book, 
  Star, 
  Leaf, 
  MaskHappy, 
  Fire, 
  Scroll, 
  Books
} from 'react-native-phosphor';

const HIGHLIGHT_ICONS = [Books, Leaf, MaskHappy, Fire, Star, Book, Scroll];

export interface HighlightsSectionProps {
  facts?: string[];
  rating?: number;
  userRatingsTotal?: number;
  region?: string;
}

export default function HighlightsSection({
  facts,
  rating,
  userRatingsTotal,
  region,
}: HighlightsSectionProps) {
  
  /** * Shuffles icons and pairs them with content ONLY ONCE on mount.
   * This ensures icons are randomized AND unique for each highlight.
   */
  const items = useMemo(() => {
    const list: { icon: any; head: string; sub: string }[] = [];
    
    // Create a shuffled copy of the icons to ensure uniqueness
    const shuffledIcons = [...HIGHLIGHT_ICONS].sort(() => Math.random() - 0.5);

    if (facts && facts.length > 0) {
      facts.slice(0, 2).forEach((fact, i) => {
        list.push({
          icon: shuffledIcons[i % shuffledIcons.length],
          head: 'Cultural Insight',
          sub: fact,
        });
      });
    } else {
      // Fallback logic
      if (rating != null && userRatingsTotal != null) {
        list.push({
          icon: Star,
          head: `Rated ${rating.toFixed(1)} by visitors`,
          sub: `Based on ${userRatingsTotal.toLocaleString()} reviews from guests worldwide.`,
        });
      }
      if (region) {
        list.push({
          icon: GlobeSimple,
          head: `Part of ${region}`,
          sub: `A highlighted cultural destination in the ${region} corridor.`,
        });
      }
    }
    return list;
    // Empty dependency array ensures randomization only happens once per mount
  }, []);

  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      {items.map((item, index) => (
        <View key={index} style={[styles.row, index > 0 && { marginTop: 24 }]}>
          <item.icon size={28} color="#222" weight="regular" />
          <View style={styles.txtContainer}>
            <Text style={styles.head}>{item.head}</Text>
            <Text style={styles.sub}>{item.sub}</Text>
          </View>
        </View>
      ))}
      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 10 },
  row: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  txtContainer: { flex: 1 },
  head: { fontSize: 16, fontWeight: '600', color: '#222' },
  sub: { fontSize: 14, color: '#717171', marginTop: 4, lineHeight: 20 },
  divider: { height: 1, backgroundColor: '#ebebeb', marginTop: 32 }
});