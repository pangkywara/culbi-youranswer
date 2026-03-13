import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import { TripPlannerCard } from '@/components/PastTrips/TripPlannerCard';
import { styles } from './_styles';

interface TripListProps {
  trips: any[];
  activeTab: 'planned' | 'completed';
  onTripPress: (id: string) => void;
}

export const TripList = ({ trips, activeTab, onTripPress }: TripListProps) => {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {trips.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No trips yet</Text>
          <Text style={styles.emptyBody}>
            {activeTab === 'planned'
              ? 'Tap the + button to plan your first trip.'
              : 'Completed trips will appear here.'}
          </Text>
        </View>
      ) : (
        trips.map((trip) => (
          <TripPlannerCard
            key={trip.id}
            tripName={trip.trip_name}
            dateRange={trip.date_range}
            stopCount={trip.stops.length}
            coverUri={
              trip.stops[0]?.landmark.thumbnail_url ??
              'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=200&q=70'
            }
            status={trip.status}
            onPress={() => onTripPress(trip.id)}
          />
        ))
      )}
      {/* Spacer for FAB overlap */}
      <View style={{ height: 120 }} />
    </ScrollView>
  );
};