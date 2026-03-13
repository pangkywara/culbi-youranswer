import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'react-native-phosphor';
import { Colors } from '@/constants/style';
import { styles } from './_styles';

interface TripHeaderProps {
  count: number;
  onBack: () => void;
}

export const TripHeader = ({ count, onBack }: TripHeaderProps) => (
  <View style={styles.header}>
    <TouchableOpacity
      style={styles.backButton}
      onPress={onBack}
      hitSlop={8}
    >
      <ArrowLeft size={20} color={Colors.textPrimary} weight="bold" />
    </TouchableOpacity>
    <Text style={styles.title}>Trip Planner</Text>
    <Text style={styles.subtitle}>
      {count} trip{count !== 1 ? 's' : ''} total
    </Text>
  </View>
);