/**
 * app/collections/[id].tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified Collections screen — Cards / Passports / Badges all live here.
 * Tab switching is pure state; no router.replace() calls so there is never
 * a page unmount/remount on tab change.
 *
 * All three tab panels are mounted simultaneously (display:'none' hides
 * inactive ones) which means zero layout recalculation on every tab press
 * and no scroll position lost when returning to a tab.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { memo, useCallback, useState } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';

import CollectionsHeader from '@/components/Collections/CollectionsHeader';
import CollectionsTabs   from '@/components/Collections/CollectionsTabs';
import PassportStatsCard from '@/components/Collections/PassportStatsCard';
import CulturalCardGrid  from '@/components/Collections/CulturalCardGrid';
import PassportCard      from '@/components/Collections/PassportsCard';
import { GachaPullButton, GachaAnimation, type GachaPhase } from '@/components/Gacha/GachaPullButton';
import { useGachaPull } from '@/hooks/useGacha';
import type { Rarity } from '@/components/Collections/Cards/constants';

// ─── Data ─────────────────────────────────────────────────────────────────────

const TABS = ['Cards', 'Passports',] as const;
type Tab = typeof TABS[number];

const PASSPORTS = [
  { id: 'bangkok',   title: 'Bangkok Passport' },
  { id: 'kl',        title: 'Kuala Lumpur Passport' },
  { id: 'kuching',   title: 'Kuching Passport' },
  { id: 'manila',    title: 'Manila Passport' },
  { id: 'pontianak', title: 'Pontianak Passport' },
];


// ─── Tab Panels (memo = never re-render when sibling tab is selected) ─────────

const CardsPanel = memo(function CardsPanel() {
  return <CulturalCardGrid />;
});

const PassportsPanel = memo(function PassportsPanel() {
  return (
    <View style={styles.grid}>
      {PASSPORTS.map((p) => (
        <PassportCard key={p.id} id={p.id} title={p.title} />
      ))}
    </View>
  );
});

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function CollectionsScreen() {
  const { id, tab: tabParam } = useLocalSearchParams<{ id: string; tab?: string }>();
  // Accept deep-link ?tab= param so passports/badges routes can redirect here
  const initial: Tab = (TABS as readonly string[]).includes(tabParam ?? '')
    ? (tabParam as Tab)
    : 'Cards';

  const [activeTab, setActiveTab] = useState<Tab>(initial);
  const [gachaPhase, setGachaPhase] = useState<GachaPhase>('idle');
  const [pulledCard, setPulledCard] = useState<{ rarity: Rarity; imageUri: string } | null>(null);
  
  const { pull, clearLastPull } = useGachaPull();

  const handleTabChange = useCallback((t: string) => {
    setActiveTab(t as Tab);
  }, []);

  const handlePull = useCallback(async () => {
    const result = await pull();
    
    if (result?.success && result.card) {
      const rarity = result.card.rarity as Rarity;
      const imageUri = result.card.image_url || 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80';
      
      setPulledCard({ rarity, imageUri });
      setGachaPhase('shaking');
    }
  }, [pull]);

  const handleBurst = useCallback(() => {
    setGachaPhase('reveal');
  }, []);

  const handleDismiss = useCallback(() => {
    setGachaPhase('idle');
    setPulledCard(null);
    clearLastPull();
  }, [clearLastPull]);

  // Show gacha animations fullscreen
  if (gachaPhase !== 'idle' && pulledCard) {
    return (
      <GachaAnimation
        phase={gachaPhase}
        rarity={pulledCard.rarity}
        imageUri={pulledCard.imageUri}
        onBurst={handleBurst}
        onDismiss={handleDismiss}
      />
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <CollectionsHeader />
      <PassportStatsCard />
      
      {/* Gacha Pull Button */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <GachaPullButton onPull={handlePull} />
      </View>

      <CollectionsTabs
        tabs={[...TABS]}
        active={activeTab}
        onChange={handleTabChange}
      />

      {/*
        All three panels are always mounted.
        display:'none' makes them take zero layout space and receive no touch
        events while keeping their state alive — identical to how React
        Navigation renders inactive tab screens.
      */}
      <View style={{ display: activeTab === 'Cards'     ? 'flex' : 'none' }}>
        <CardsPanel />
      </View>
      <View style={{ display: activeTab === 'Passports' ? 'flex' : 'none' }}>
        <PassportsPanel />
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  content:   { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingTop: 8,
  },
  badgeCard: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  emoji:      { fontSize: 26 },
  badgeLabel: { fontSize: 11, fontWeight: '600', color: '#333', textAlign: 'center' },
});
