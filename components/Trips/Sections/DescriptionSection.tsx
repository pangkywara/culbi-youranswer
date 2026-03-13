import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '../TripsScreen.styles';

interface CTASectionProps {
  onGetStarted?: () => void;
}

export const CTASection = ({ onGetStarted }: CTASectionProps) => (
  <View style={styles.ctaContainer}>
    {/* TITLE: Focus on the Bridge/Journey aspect */}
    <Text style={styles.title}>Start Your Cultural Mission</Text>
    
    {/* SUBTITLE: Mention the two regions and the AI Liaison */}
    <Text style={styles.subtitle}>
      Explore landmarks from ASEAN Countries. Use Culbi to unlock 
      local nuances and collect your first card and passport stamp.
    </Text>
  </View>
);