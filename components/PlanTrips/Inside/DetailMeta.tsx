import React from 'react';
import { View, Text } from 'react-native';
import { CalendarBlank, MapPin, Flag, Notebook } from 'react-native-phosphor';
import { Colors } from '@/constants/style'; // Assuming neutral colors are here
import { styles } from './_styles';

export const DetailMeta = ({ trip, stats }: any) => {
  const isPlanned = trip.status === 'planned';

  return (
    <View style={styles.metaSection}>
      {/* Date Row with Icon */}
      <View style={styles.metaTopRow}>
        <CalendarBlank size={16} color="#666" weight="bold" />
        <Text style={styles.dateLabel}>{trip.date_range}</Text>
      </View>

      {/* Hero Title */}
      <Text style={styles.tripTitle}>{trip.trip_name}</Text>

      {/* Editorial Stats Row with Icons */}
      <View style={styles.statsRow}>
        {/* Total Stops */}
        <View style={styles.statItem}>
          <MapPin size={14} color="#666" weight="bold" />
          <Text style={styles.statText}>{stats.totalStops} stops</Text>
        </View>

        <Text style={styles.statDot}>·</Text>

        {/* Rare Landmarks */}
        <View style={styles.statItem}>
          <Flag size={14} color="#666" weight="bold" />
          <Text style={styles.statText}>{stats.rareCounts} rare</Text>
        </View>

        <Text style={styles.statDot}>·</Text>

        {/* Signs Collected */}
        <View style={styles.statItem}>
          <Notebook size={14} color="#666" weight="bold" />
          <Text style={styles.statText}>{stats.totalSigns} signs</Text>
        </View>
      </View>
    </View>
  );
};