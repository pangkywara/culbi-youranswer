import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, InteractionManager } from 'react-native';
import { MagnifyingGlass } from 'react-native-phosphor';
import { useFocusEffect } from 'expo-router';
import { Colors, S } from '@/constants/style';

// Feature Imports
import { styles } from '@/components/Missions/missions.styles';
import { CATEGORIES } from '@/components/Missions/missions.data';
import { MissionCategory, Mission } from '@/components/Missions/missions.types';
import { useMissions } from '@/hooks/useMissions';
import { MissionSkeletonItem } from '@/components/UI/Skeleton';

// Component Imports
import { MissionStats } from '@/components/Missions/Structure/MissionStats';
import { CategoryFilters } from '@/components/Missions/Structure/CategoryFilters';
import { MissionItem } from '@/components/Missions/Structure/MissionItem';
import { MissionDetailDrawer } from '@/components/Missions/Drawer/MissionDetailDrawer';

export default function MissionsScreen() {
  // ─── State ─────────────────────────────────────────────────────────────────
  const [activeCategory, setActiveCategory] = useState<MissionCategory>('All');
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // ─── Data ──────────────────────────────────────────────────────────────────
  const { missions, loading: missionsLoading, totalXp, levelLabel, refetch } = useMissions();

  // ─── Lifecycle ─────────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        setIsReady(true);
        refetch(); // refresh data every time screen is focused
      });
      return () => task.cancel();
    }, [refetch])
  );

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleOpenDetail = useCallback((mission: Mission) => {
    setSelectedMission(mission);
    setDrawerVisible(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDrawerVisible(false);
  }, []);

  const filteredMissions = useMemo(
    () => missions.filter(m => activeCategory === 'All' || m.category === activeCategory),
    [missions, activeCategory]
  );

  // ─── Render Components ─────────────────────────────────────────────────────
  const renderHeader = useCallback(() => (
    <View style={styles.headerContainer}>
      <View style={styles.titleRow}>
        <Text style={styles.mainTitle}>Missions</Text>
        <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
          <MagnifyingGlass size={22} color={Colors.textPrimary} weight="bold" />
        </TouchableOpacity>
      </View>

      <MissionStats
        points={totalXp.toLocaleString()}
        rank={levelLabel}
      />

      <CategoryFilters
        categories={CATEGORIES}
        active={activeCategory}
        onSelect={setActiveCategory}
      />
    </View>
  ), [activeCategory, totalXp, levelLabel]);

  if (!isReady) return <View style={S.screen} />;

  return (
    <View style={S.screen}>
      <FlatList
        data={filteredMissions}
        ListHeaderComponent={renderHeader}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MissionItem
            item={item}
            onPress={() => handleOpenDetail(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        initialNumToRender={10}
        removeClippedSubviews={true}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          missionsLoading ? (
            <View>
              {Array.from({ length: 6 }, (_, i) => (
                <MissionSkeletonItem key={String(i)} />
              ))}
            </View>
          ) : (
            <Text style={{ textAlign: 'center', marginTop: 40, color: Colors.textSecondary }}>
              No missions found
            </Text>
          )
        }
      />

      {/* The Detail Drawer */}
      <MissionDetailDrawer
        visible={drawerVisible}
        mission={selectedMission}
        onClose={handleCloseDetail}
        onAction={refetch}
      />
    </View>
  );
}