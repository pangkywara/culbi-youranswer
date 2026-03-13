import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { styles } from './TripsScreen.styles';

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  activeOpacity?: number;
}

export const PrimaryButton = ({ 
  label, 
  onPress, 
  activeOpacity = 0.8 
}: PrimaryButtonProps) => (
  <TouchableOpacity 
    style={styles.primaryButton} 
    onPress={onPress}
    activeOpacity={activeOpacity}
  >
    <Text style={styles.buttonText}>{label}</Text>
  </TouchableOpacity>
);