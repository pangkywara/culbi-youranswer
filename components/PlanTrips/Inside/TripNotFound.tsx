import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from './_styles';

interface TripNotFoundProps {
  onBack: () => void;
}

export const TripNotFound = ({ onBack }: TripNotFoundProps) => (
  <View style={styles.centered}>
    <Text style={styles.errorText}>Trip not found.</Text>
    <TouchableOpacity onPress={onBack} style={styles.backLink}>
      <Text style={styles.backLinkText}>← Go back</Text>
    </TouchableOpacity>
  </View>
);