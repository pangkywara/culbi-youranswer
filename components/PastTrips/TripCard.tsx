import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Type, Space, Radius, Shadows } from '@/constants/style';

interface TripCardProps {
  imageUri: string;
  location: string;
  dateRange: string;
  onPress?: () => void;
}

export const TripCard = ({ imageUri, location, dateRange, onPress }: TripCardProps) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <Image source={{ uri: imageUri }} style={styles.image} />
      <View style={styles.textContainer}>
        <Text style={styles.location}>{location}</Text>
        <Text style={styles.date}>{dateRange}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Space.sm,
    alignItems: 'center',
    marginBottom: Space.lg,
    ...Shadows.level1,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    backgroundColor: Colors.borderSubtle,
  },
  textContainer: {
    marginLeft: Space.lg,
    flex: 1,
  },
  location: {
    fontSize: Type.sizeTitle,
    fontWeight: Type.weightBold,
    color: Colors.textPrimary,
  },
  date: {
    fontSize: Type.sizeBodySm,
    color: Colors.textSecondary,
    marginTop: Space.xs,
  },
});