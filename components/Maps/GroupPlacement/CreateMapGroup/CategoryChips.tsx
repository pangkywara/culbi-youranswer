import React from 'react';
import { ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';

export const CATEGORIES = [
  'Culture',
  'Food',
  'Nature',
  'History',
  'Heritage',
  'Religion',
  'Landmark',
  'General',
] as const;

export type GroupCategory = (typeof CATEGORIES)[number];

interface CategoryChipsProps {
  selected: GroupCategory | null;
  onSelect: (cat: GroupCategory | null) => void;
}

export function CategoryChips({ selected, onSelect }: CategoryChipsProps) {
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORIES.map((cat) => {
          const isActive = selected === cat;
          
          return (
            <Pressable
              key={cat}
              onPress={() => onSelect(isActive ? null : cat)}
              style={({ pressed }) => [
                styles.pill,
                isActive && styles.activePill,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.pillText, isActive && styles.activePillText]}>
                {cat}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingRight: 20, // Allows last item to clear screen edge
    gap: 10,         // Matches the gap from your MapSettingsPanel
  },

  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },

  activePill: {
    backgroundColor: '#222222',
    borderColor: '#222222',
  },

  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },

  pillText: {
    fontSize: 15,
    color: '#222',
    fontWeight: '500',
  },

  activePillText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});