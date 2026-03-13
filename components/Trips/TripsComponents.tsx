import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { CaretRight } from 'react-native-phosphor';
import { Colors, Type, Space, Radius, S } from '@/constants/style';

// 1. Timeline Card Component
interface TimelineItemProps {
  imageUri: string;
  isLast?: boolean;
  isActive?: boolean;
}

export const TimelineItem = ({ imageUri, isLast, isActive }: TimelineItemProps) => (
  <View style={styles.timelineRow}>
    <View style={styles.indicatorColumn}>
      <View style={[styles.dot, isActive && styles.activeDot]} />
      {!isLast && <View style={styles.line} />}
    </View>
    <View style={styles.cardContainer}>
      <Image source={{ uri: imageUri }} style={styles.cardImage} />
      <View style={styles.skeletonTextContainer}>
        <View style={styles.skeletonLineLong} />
        <View style={styles.skeletonLineShort} />
      </View>
    </View>
  </View>
);

// 2. Primary Action Button
export const PrimaryButton = ({ title, onPress }: { title: string; onPress: () => void }) => (
  <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.8}>
    <Text style={S.btnPrimaryText}>{title}</Text>
  </TouchableOpacity>
);

// 3. Bottom Banner
export const PastTripsBanner = () => (
  <TouchableOpacity style={styles.banner}>
    <Text style={S.body}>Find past trips in your profile</Text>
    <View style={styles.bannerRight}>
      <Image 
        source={{ uri: 'https://cdn-icons-png.flaticon.com/512/831/831461.png' }} // Suitcase icon
        style={styles.suitcaseIcon} 
      />
      <CaretRight size={16} color={Colors.textPrimary} weight="bold" />
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  // Timeline Styles
  timelineRow: {
    flexDirection: 'row',
    height: 100,
    marginBottom: Space.md,
  },
  indicatorColumn: {
    alignItems: 'center',
    width: 20,
    marginRight: Space.lg,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border,
    marginTop: 10,
  },
  activeDot: {
    backgroundColor: Colors.textSecondary,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  line: {
    flex: 1,
    width: 1,
    backgroundColor: Colors.border,
  },
  cardContainer: {
    ...S.card,
    flex: 1,
    flexDirection: 'row',
    padding: Space.md,
    alignItems: 'center',
  },
  cardImage: {
    width: 70,
    height: 70,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
  },
  skeletonTextContainer: {
    marginLeft: Space.lg,
    flex: 1,
    gap: Space.sm,
  },
  skeletonLineLong: {
    height: 12,
    backgroundColor: Colors.surfacePale,
    borderRadius: Radius.sm,
    width: '80%',
  },
  skeletonLineShort: {
    height: 12,
    backgroundColor: Colors.surfacePale,
    borderRadius: Radius.sm,
    width: '40%',
  },
  // Button Styles
  button: {
    ...S.btnPrimary,
    marginTop: Space.xxl,
    width: '60%',
  },
  // Banner Styles
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    padding: Space.xl,
    borderRadius: Radius.card,
    marginTop: Space.xxxl,
    width: '100%',
  },
  bannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  suitcaseIcon: {
    width: 40,
    height: 40,
  },
});