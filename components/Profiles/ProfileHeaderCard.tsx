import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { ShieldCheck } from 'react-native-phosphor';
import { Colors, Type, Space, S } from '@/constants/style';
import { useAuth } from '@/context/AuthContext';
import { useGachaStats } from '@/hooks/useGacha';
import { getUserDetectionStats } from '@/lib/landmarkDetectionService';
import type { DetectionStats } from '@/lib/landmarkDetectionService';
import { ProfileHeaderSkeleton } from '@/components/UI/Skeleton';

function Stat({ number, label }: any) {
  return (
    <View style={styles.statItem}>
      <Text style={S.statNumber}>{number}</Text>
      <Text style={S.statLabel}>{label}</Text>
    </View>
  );
}

export default function ProfileHeaderCard() {
  const { profile } = useAuth();
  const { stats: gachaStats, loading: gachaLoading } = useGachaStats();
  const [detectionStats, setDetectionStats] = useState<DetectionStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const displayName  = profile?.full_name ?? 'Explorer';
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const regionLabel  = profile?.region ?? 'Select region';
  
  // Fetch detection stats
  useEffect(() => {
    async function fetchDetectionStats() {
      try {
        const stats = await getUserDetectionStats();
        setDetectionStats(stats);
      } catch (error) {
        console.error('Failed to fetch detection stats:', error);
        setDetectionStats({
          total_detections: 0,
          completed_detections: 0,
          shared_detections: 0,
          unique_landmarks: 0,
          unique_countries: 0,
          total_flashcards_viewed: 0,
        });
      } finally {
        setStatsLoading(false);
      }
    }
    fetchDetectionStats();
  }, []);
  
  const isLoading = gachaLoading || statsLoading;
  const cardsCollected = gachaStats?.unique_cards_owned ?? 0;
  const scansCompleted = detectionStats?.completed_detections ?? 0;
  const countriesVisited = detectionStats?.unique_countries ?? 0;

  if (isLoading) {
    return <ProfileHeaderSkeleton />;
  }

  return (
    <View style={[S.cardLg, { marginBottom: Space.xl }]}>
      <View style={styles.headerTop}>
        <View style={{ position: 'relative' }}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={S.avatarLg} />
          ) : (
            <View style={S.avatarLg}>
              <Text style={S.avatarLgText}>{avatarLetter}</Text>
            </View>
          )}
          <View style={S.avatarBadge}>
            <ShieldCheck size={18} color={Colors.white} weight="fill" />
          </View>
        </View>

        <View style={styles.stats}>
          <Stat number={cardsCollected.toString()} label="Cards" />
          <View style={S.divider} />
          <Stat number={scansCompleted.toString()} label="Scans" />
          <View style={S.divider} />
          <Stat number={countriesVisited.toString()} label="Countries" />
        </View>
      </View>

      <Text style={S.h1}>{displayName}</Text>
      <Text style={{ fontSize: Type.sizeBodySm, color: Colors.textSecondary }}>
        {regionLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  stats: { flex: 1, marginLeft: Space.xxl },
  statItem: { paddingVertical: 6 },
});