import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PencilSimple } from 'react-native-phosphor';
import { Colors, Radius, Space, Type } from '@/constants/style';

interface DateSelectorProps {
  dates: string[];
  selectedDate: string | null;
  onSelect: (date: string | null) => void;
  onEditDates: () => void;
}

export const DateSelector = ({ dates, selectedDate, onSelect, onEditDates }: DateSelectorProps) => {
  return (
    <View style={styles.wrapper}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.container}
      >
        {/* "All" or "Unscheduled" option */}
        <TouchableOpacity 
          style={[styles.pill, !selectedDate && styles.pillActive]}
          onPress={() => onSelect(null)}
          activeOpacity={0.8}
        >
          <Text style={[styles.pillText, !selectedDate && styles.pillTextActive]}>All Days</Text>
        </TouchableOpacity>

        {dates.map((date) => {
          const isSelected = selectedDate === date;
          // Format "2026-06-20" -> "June 20"
          const label = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC'
          });

          return (
            <TouchableOpacity 
              key={date}
              style={[styles.pill, isSelected && styles.pillActive]}
              onPress={() => onSelect(date)}
              activeOpacity={0.8}
            >
              <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Gradient fade before edit button */}
      <LinearGradient
        colors={['#FFFFFF00', Colors.white]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.fadeGradient}
        pointerEvents="none"
      />

      {/* Edit Button */}
      <TouchableOpacity style={styles.editCircle} onPress={onEditDates} activeOpacity={0.7}>
        <PencilSimple size={20} color={Colors.brand} weight="bold" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Space.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  container: {
    paddingHorizontal: Space.xxl, // Matches your original 24
    gap: 10,
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
  },
  pillActive: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
  pillText: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
  },
  pillTextActive: {
    color: Colors.white,
  },
  fadeGradient: {
    position: 'absolute',
    right: 74, 
    top: 0,
    bottom: 0,
    width: 48,
  },
  editCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.brand,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    marginLeft: 10,
  }
});