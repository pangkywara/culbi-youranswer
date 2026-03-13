import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { MapPin, CalendarBlank } from 'react-native-phosphor';
import { Colors, Type, Space, Radius, S, Shadows } from '@/constants/style';

export type TripStatus = 'planned' | 'completed';

interface TripPlannerCardProps {
  tripName: string;
  dateRange: string;
  stopCount: number;
  coverUri: string;
  status: TripStatus;
  onPress?: () => void;
}

export const TripPlannerCard = ({
  tripName,
  dateRange,
  stopCount,
  coverUri,
  onPress,
}: TripPlannerCardProps) => {
  return (
    <TouchableOpacity
      style={[S.card, styles.cardOverride]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Cover thumbnail */}
      <Image
        source={{ uri: coverUri }}
        style={styles.cover}
        contentFit="cover"
        transition={300}
      />

      {/* Trip info */}
      <View style={styles.body}>
        {/* Trip name - Truncates if too long */}
        <Text style={styles.titleText} numberOfLines={1} ellipsizeMode="tail">
          {tripName}
        </Text>

        {/* Meta row: stops + date */}
        <View style={styles.meta}>
          {/* Stops section */}
          <View style={styles.metaItem}>
            <MapPin size={14} color={Colors.textSecondary} weight="bold" />
            <Text style={styles.metaText} numberOfLines={1}>
              {stopCount} stops
            </Text>
          </View>
          
          <View style={styles.dot} />
          
          {/* Date section - flexShrink allows this to truncate when the screen is narrow */}
          <View style={[styles.metaItem, { flexShrink: 1 }]}>
            <CalendarBlank size={14} color={Colors.textSecondary} weight="bold" />
            <Text 
              style={styles.metaText} 
              numberOfLines={1} 
              ellipsizeMode="tail"
            >
              {dateRange}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardOverride: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Space.md,
    marginBottom: Space.md,
    gap: Space.md,
    backgroundColor: Colors.white,
    ...Shadows.level3,
    borderRadius: Radius.card, // Ensure consistency with S.card
  },

  cover: {
    width: 80,
    height: 80,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfacePale,
  },

  body: {
    flex: 1, // Takes up all remaining horizontal space
    justifyContent: 'center',
    gap: 2,
    overflow: 'hidden', // Prevents children from bleeding out
  },

  titleText: {
    fontSize: Type.sizeTitle,
    fontWeight: Type.weightBold,
    color: Colors.textPrimary,
  },

  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  
  metaText: {
    fontSize: Type.sizeCaption,
    color: Colors.textSecondary,
    flexShrink: 1, // Allows the text to shrink within its container
  },

  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.border,
    marginHorizontal: Space.sm,
  },
});