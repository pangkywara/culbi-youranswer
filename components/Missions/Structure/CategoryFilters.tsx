import React from 'react';
import { ScrollView, TouchableOpacity, Text } from 'react-native';
import { styles } from '../missions.styles';
import { MissionCategory } from '../missions.types';

interface CategoryFiltersProps {
  categories: string[];
  active: MissionCategory;
  onSelect: (category: MissionCategory) => void;
}

export const CategoryFilters = ({ categories, active, onSelect }: CategoryFiltersProps) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
    {categories.map((cat) => {
      const isActive = active === cat;
      return (
        <TouchableOpacity
          key={cat}
          onPress={() => onSelect(cat as MissionCategory)}
          style={[styles.categoryPill, isActive && styles.activePill]}
        >
          <Text style={[styles.categoryText, isActive && styles.activeCategoryText]}>
            {cat}
          </Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);