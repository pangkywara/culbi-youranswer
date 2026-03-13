import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Star, Trophy } from 'react-native-phosphor';
import { useRouter } from 'expo-router';
import { styles } from '../missions.styles';

interface MissionStatsProps {
  points: string;
  rank: string;
}

export const MissionStats = ({ points, rank }: MissionStatsProps) => {
  const router = useRouter();

  return (
    <View style={styles.statsCard}>
      {/* 1. Points Block */}
      <TouchableOpacity 
        style={styles.statItem} 
        onPress={() => router.push('/points')}
        activeOpacity={0.7}
      >
        <View style={[styles.statIconCircle, { backgroundColor: '#FFF0F5' }]}>
          <Star size={20} color="#E31C5F" weight="fill" />
        </View>
        <View style={styles.statTextContainer}>
          <Text style={styles.statValue} numberOfLines={1} ellipsizeMode="tail">
            {points}
          </Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
      </TouchableOpacity>

      {/* 2. Central Divider */}
      <View style={styles.statDivider} />

      {/* 3. Rank Block */}
      <TouchableOpacity 
        style={styles.statItem} 
        onPress={() => router.push('/explorer')}
        activeOpacity={0.7}
      >
        <View style={[styles.statIconCircle, { backgroundColor: '#FFF8E6' }]}>
          <Trophy size={20} color="#FFB800" weight="fill" />
        </View>
        <View style={styles.statTextContainer}>
          <Text style={styles.statValue} numberOfLines={1} ellipsizeMode="tail">
            {rank}
          </Text>
          <Text style={styles.statLabel}>Rank</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};