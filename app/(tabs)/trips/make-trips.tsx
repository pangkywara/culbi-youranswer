import React, { useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTrips } from '@/context/TripContext';

import { styles } from '@/components/PlanTrips/_styles';
import { TripHeader } from '@/components/PlanTrips/TripHeader';
import { TripTabs } from '@/components/PlanTrips/TripTabs';
import { TripList } from '@/components/PlanTrips/TripList';
import { TripActionFAB } from '@/components/PlanTrips/TripActionFAB';
import { NewTripModal, type NewTripPayload } from '@/components/PlanTrips/NewTripModal';
import { Colors } from '@/constants/style';

export default function TripPlannerScreen() {
  const router = useRouter();
  const { trips, loading, addTrip, setActiveTripId } = useTrips();
  const [activeTab, setActiveTab] = useState<'planned' | 'completed'>('planned');
  const [modalVisible, setModalVisible] = useState(false);

  const filteredTrips = trips.filter((t) => t.status === activeTab);

  const handleCreateTrip = ({ name, dateRange, description, privacy }: NewTripPayload) => {
    const id = addTrip({
      trip_name:   name,
      date_range:  dateRange,
      status:      'planned',
      stops:       [],
      description: description || undefined,
      privacy,
    });
    setActiveTripId(id);
    // Navigate within the Trips Stack so the Trips tab stays active
    router.push(`/trips/${id}` as any);
  };

  const handleCulbiPlan = () => {
    router.push('/chatbot/chatbot' as any);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <TripHeader count={0} onBack={() => router.back()} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TripHeader count={trips.length} onBack={() => router.back()} />
      <TripTabs activeTab={activeTab} onSelect={setActiveTab} />
      
      <TripList 
        trips={filteredTrips} 
        activeTab={activeTab} 
        onTripPress={(id) => router.push(`/trips/${id}` as any)} 
      />

      <TripActionFAB 
        onManualAdd={() => setModalVisible(true)} 
        onAiPlan={handleCulbiPlan}
        bottomOffset={Platform.OS === 'ios' ? 60 : 60}
      />

      <NewTripModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        onAdd={handleCreateTrip} 
      />
    </SafeAreaView>
  );
}
