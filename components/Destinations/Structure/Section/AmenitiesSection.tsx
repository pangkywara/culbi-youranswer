/**
 * AmenitiesSection.tsx  (repurposed as FunFacts)
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders cultural fun-facts from Supabase landmark_facts.
 * Falls back to a set of generic cultural placeholders when facts are absent.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sparkle, Leaf, MaskHappy, Fire, Star, Book } from 'react-native-phosphor';

const FACT_ICONS = [Sparkle, Leaf, MaskHappy, Fire, Star, Book];

const FALLBACK_FACTS = [
  'A culturally significant site with centuries of history.',
  'Home to unique traditions celebrated by the local community.',
  'Recognized as a heritage landmark in the region.',
];

export interface FunFactsSectionProps {
  /** Fact strings from Supabase landmark_facts.fact_content */
  facts?: string[];
}

export default function FunFactsSection({ facts }: FunFactsSectionProps) {
  const displayFacts = facts && facts.length > 0 ? facts : FALLBACK_FACTS;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fun facts</Text>

      {displayFacts.map((fact, index) => {
        const Icon = FACT_ICONS[index % FACT_ICONS.length];
        return (
          <View key={index} style={styles.row}>
            <Icon size={26} color="#222" weight="duotone" />
            <Text style={styles.label}>{fact}</Text>
          </View>
        );
      })}

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