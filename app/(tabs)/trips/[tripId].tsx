import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTrips } from '@/context/TripContext';
import { Colors as StyleColors } from '@/constants/style';

// Components
import { DetailNavbar } from '@/components/PlanTrips/Inside/DetailNavbar';
import { DetailMeta } from '@/components/PlanTrips/Inside/DetailMeta';
import { DetailTimeline } from '@/components/PlanTrips/Inside/DetailTimeline';
import { AddStopAction } from '@/components/PlanTrips/Inside/AddStopAction';
import { DateSelector } from '@/components/PlanTrips/Inside/DateSelector';
import { TripPlanningBotSheet } from '@/components/PlanTrips/Inside/TripPlanningBotSheet'; 

export default function TripDetailScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { trips, loading } = useTrips();

  // Local state to track which date pill is active
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // Bot sheet visibility state
  const [botSheetVisible, setBotSheetVisible] = useState(false);

  const trip = trips.find((t) => t.id === tripId);

  // 1. Extract unique dates from stops to populate the DateSelector pills
  const uniqueDates = useMemo(() => {
    if (!trip) return [];
    const dates = trip.stops
      .map((s) => s.date)
      .filter((d): d is string => !!d);
    return Array.from(new Set(dates)).sort();
  }, [trip]);

  // 2. Filter the stops passed to the timeline based on the selected pill
  const filteredStops = useMemo(() => {
    if (!trip) return [];
    if (!selectedDate) return trip.stops;
    return trip.stops.filter((s) => s.date === selectedDate);
  }, [trip, selectedDate]);

  const stats = useMemo(() => {
    if (!trip) return { totalStops: 0, totalSigns: 0, rareCounts: 0 };
    return {
      totalStops: trip.stops.length,
      totalSigns: trip.stops.reduce((sum, s) => sum + s.landmark.sign_count, 0),
      rareCounts: 0, 
    };
  }, [trip]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={StyleColors.brand} />
      </SafeAreaView>
    );
  }

  if (!trip) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Navbar */}
      <DetailNavbar
        title={trip.trip_name}
        isPlanned={trip.status === 'planned'}
        onBack={() => router.back()}
        onEdit={() =>
          // Gear icon → trip settings (root modal, no tab bar)
          router.push({
            pathname: '/edit-trips',
            params: { tripId: trip.id },
          })
        }
        onOpenBot={() => setBotSheetVisible(true)}
      />

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scroll}
        stickyHeaderIndices={[1]} // Makes DateSelector stick to top during scroll
      >
        {/* Section 0: Meta Information */}
        <DetailMeta trip={trip} stats={stats} />

        {/* Section 1: Date Selector (The Pills) */}
        <View style={{ backgroundColor: '#FFF' }}>
          <DateSelector 
            dates={uniqueDates}
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            onEditDates={() => 
              router.push({
                pathname: '/edit',
                params: { tripId: trip.id },
              })
            }
          />
        </View>

        {/* Section 2: Grouped Timeline */}
        <DetailTimeline stops={filteredStops} />
      </ScrollView>

      {/* Floating Action Button — extra margin so it clears the absolute tab bar */}
      {trip.status === 'planned' && (
        <View style={styles.addStopSpacer}>
          <AddStopAction
            onPress={() =>
              router.push({
                pathname: '/explorer/picker',
                params: { tripId: trip.id },
              })
            }
            visible
            isTimelineExpanded
          />
        </View>
      )}

      {/* Trip Planning Bot Sheet */}
      <TripPlanningBotSheet
        trip={trip}
        visible={botSheetVisible}
        onClose={() => setBotSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 120 }, // Space for button + tab bar
  addStopSpacer: { paddingBottom: Platform.OS === 'ios' ? 40 : 80, borderRadius: 12, }, // Clears the 80px absolute tab bar
});
