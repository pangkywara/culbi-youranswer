import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'react-native-phosphor';
import { TripCard } from '@/components/PastTrips/TripCard';

export default function PastTripsScreen() {
  const router = useRouter();

  const PAST_TRIPS = [
    {
      id: '1',
      location: 'Kuching',
      dateRange: 'Jan 28 – 30, 2026',
      imageUri: 'https://images.unsplash.com/photo-1554224155-1696413565d3?q=80&w=300',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header Area */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color="#222" weight="bold" />
          </TouchableOpacity>

          <Text style={styles.title}>Past trips</Text>
        </View>

        {/* Trips List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {PAST_TRIPS.map((trip) => (
            <TripCard 
              key={trip.id}
              location={trip.location}
              dateRange={trip.dateRange}
              imageUri={trip.imageUri}
            />
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 40 : 12,
    backgroundColor: '#FFFFFF',
  },

  content: {
    flex: 1,
  },

  // header keeps the horizontal padding instead
  header: {
    paddingHorizontal: 24,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },

  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#222',
    marginTop: 24,
    marginBottom: 24,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 6,
  },
});