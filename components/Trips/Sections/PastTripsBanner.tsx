import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CaretRight } from 'react-native-phosphor';
import { styles } from '../TripsScreen.styles';

interface PastTripsBannerProps {
  onPress: () => void;
}

export const PastTripsBanner = ({ onPress }: PastTripsBannerProps) => (
  <TouchableOpacity 
    style={styles.pastTripsBanner}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.bannerTextContent}>
      <Text style={styles.bannerText}>Make You're Trips Plan</Text>
      <CaretRight size={14} color="#222" weight="bold" />
    </View>
    <View style={styles.luggageContainer}>
      <Text style={{ fontSize: 40 }}>🎒</Text> 
    </View>
  </TouchableOpacity>
);