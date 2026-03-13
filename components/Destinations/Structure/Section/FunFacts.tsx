import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Leaf, MaskHappy, Fire, Star, Book, Clover } from 'react-native-phosphor';

const FACT_ICONS = [Clover, Leaf, MaskHappy, Fire, Star, Book];

const FALLBACK_FACTS = [
  'A culturally significant site with centuries of history.',
  'Home to unique traditions celebrated by the local community.',
  'Recognized as a heritage landmark in the region.',
];

export interface FunFactsSectionProps {
  facts?: string[];
}

export default function FunFactsSection({ facts }: FunFactsSectionProps) {
  const displayFacts = facts && facts.length > 0 ? facts : FALLBACK_FACTS;

  /** * Shuffles icons and pairs them with facts ONLY ONCE on mount.
   * This ensures icons are randomized AND unique for each row.
   */
  const uniqueRandomRows = useMemo(() => {
    // 1. Create a copy and shuffle the icon list
    const shuffledIcons = [...FACT_ICONS].sort(() => Math.random() - 0.5);
    
    // 2. Map facts to the shuffled icons to ensure no duplicates
    return displayFacts.slice(0, FACT_ICONS.length).map((fact, index) => ({
      fact,
      Icon: shuffledIcons[index % shuffledIcons.length],
    }));
  }, []); // Empty array ensures this unique set stays for the whole session

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fun facts</Text>

      {uniqueRandomRows.map((item, index) => (
        <View key={index} style={styles.row}>
          <item.Icon size={26} color="#222" weight="regular" />
          <Text style={styles.label}>{item.fact}</Text>
        </View>
      ))}

      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 32 },
  title: { fontSize: 22, fontWeight: '600', color: '#222', marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, gap: 16 },
  label: { flex: 1, fontSize: 15, color: '#222', lineHeight: 22 },
  divider: { height: 1, backgroundColor: '#ebebeb', marginTop: 12 },
});