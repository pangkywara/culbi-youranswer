import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckCircle, Target } from 'react-native-phosphor';
import { Colors, Type, Space, Radius, S } from '@/constants/style';

// 1. Mission Card Component
interface MissionCardProps {
  title: string;
  description: string;
  progress: number; // 0 to 1
  reward: string;
  isCompleted?: boolean;
}

export const MissionCard = ({ title, description, progress, reward, isCompleted }: MissionCardProps) => (
  <TouchableOpacity style={[S.card, { marginBottom: Space.lg }]} activeOpacity={0.7}>
    <View style={styles.cardHeader}>
      <View style={styles.iconContainer}>
        {isCompleted ? (
          <CheckCircle size={24} color={Colors.brand} weight="fill" />
        ) : (
          <Target size={24} color={Colors.textBody} weight="bold" />
        )}
      </View>
      <View style={S.fill}>
        <Text style={S.titleSemi}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
    </View>

    <View style={styles.progressSection}>
      <View style={S.progressTrack}>
        <View style={[S.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <View style={styles.footerRow}>
        <Text style={S.labelBold}>Reward: {reward}</Text>
        <Text style={S.label}>{Math.round(progress * 100)}%</Text>
      </View>
    </View>
  </TouchableOpacity>
);

// 2. Summary Stat Box
export const MissionStat = ({ label, value, icon: Icon }: any) => (
  <View style={styles.statBox}>
    <Icon size={20} color={Colors.textSecondary} weight="regular" />
    <View>
      <Text style={S.title}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    marginBottom: Space.lg,
  },
  iconContainer: {
    ...S.btnIcon,
    marginRight: Space.md,
  },
  cardDescription: {
    fontSize: Type.sizeCaption,
    color: Colors.textSecondary,
    marginTop: Space.xxs,
  },
  progressSection: {
    marginTop: Space.sm,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surfaceMuted,
    padding: Space.md,
    borderRadius: Radius.lg,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
});