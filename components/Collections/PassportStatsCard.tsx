import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Type, Space, S } from '@/constants/style';
import { useGachaStats } from '@/hooks/useGacha';
import { PassportStatsCardSkeleton } from '@/components/UI/Skeleton';

export default function PassportStatsCard() {
  const { stats, loading } = useGachaStats();

  if (loading) {
    return <PassportStatsCardSkeleton />;
  }

  const totalCards = stats?.unique_cards_owned || 0;
  const rareCount = stats?.rarity_counts?.Rare || 0;
  const mythicCount = stats?.rarity_counts?.Mythic || 0;
  const secretCount = stats?.rarity_counts?.Secret || 0;
  const collectionProgress = stats?.collection_progress || 0;

  return (
    <View style={[S.cardLg, { padding: 18, marginBottom: Space.xxl }]}>
      <Text style={styles.title}>Collection Stats</Text>

      <View style={styles.row}>
        <Stat label="Cards" value={`${totalCards}/${stats?.total_cards_available || 12}`} />
        <Stat label="Rare+" value={`${rareCount + mythicCount + secretCount}`} />
        <Stat label="Progress" value={`${Math.round(collectionProgress)}%`} />
      </View>
    </View>
  );
}

function Stat({ label, value }: any) {
  return (
    <View style={S.statBox}>
      <Text style={S.statValue}>{value}</Text>
      <Text style={S.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightSemibold,
    color: Colors.textDisabled,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});