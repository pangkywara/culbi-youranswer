import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, InteractionManager, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { HeaderSection } from '@/components/Trips/Sections/HeaderSection';
import { CTASection } from '@/components/Trips/Sections/DescriptionSection';
import { PastTripsBanner } from '@/components/Trips/Sections/PastTripsBanner';
import LocationSection from '@/components/Destinations/Maps/LocationSection';
import { TabSwitch } from '@/components/Trips/TabsSwitch'; 
import { LiveCameraView } from '@/components/Trips/LiveCameraView';
import { PrintingOverlay } from '@/components/LandmarkDetection/PrintingOverlay';
import { Colors, Space } from '@/constants/style';
import { useAuth } from '@/context/AuthContext';
import type { DetectionResult, FlashcardItem } from '@/types/landmark';
import { TAB_BAR_STYLE } from '../_layout';

const CONTENT_HEIGHT = 280; 

// Default fallback (Kuching) if permission is denied or loading
const DEFAULT_LOCATION = {
  coords: { latitude: 1.5533, longitude: 110.3592 },
  label: "Kuching, Sarawak"
};

export default function TripsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { session, profile } = useAuth();
  
  // UI States
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'camera'>('map');
  
  // Location States
  const [location, setLocation] = useState(DEFAULT_LOCATION.coords);
  const [addressLabel, setAddressLabel] = useState(DEFAULT_LOCATION.label);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  
  // Detection States (lifted from LiveCameraView)
  const [showOverlay, setShowOverlay] = useState(false);
  const [detectionData, setDetectionData] = useState<{
    imageUri: string;
    result: DetectionResult;
    flashcards: FlashcardItem[];
    loading: boolean;
    error: string | null;
  } | null>(null);
  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Hide tab bar when overlay is active
  useEffect(() => {
    console.log('[TabBar] showOverlay changed:', showOverlay);
    const parent = navigation.getParent();
    console.log('[TabBar] Parent navigation:', parent ? 'found' : 'not found');
    if (parent) {
      parent.setOptions({
        tabBarStyle: showOverlay ? { display: 'none' } : TAB_BAR_STYLE.bar,
      });
      console.log('[TabBar] Tab bar', showOverlay ? 'hidden' : 'visible');
    }
  }, [showOverlay, navigation]);

  // 1. Initial Interaction Delay
  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => setIsReady(true));
      return () => task.cancel();
    }, [])
  );

  // 2. Location Fetching Logic
  useEffect(() => {
    async function getUserLocation() {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('[Location] Permission denied, using default location');
          setIsLocationLoading(false);
          return;
        }

        let userLoc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }).catch((err) => {
          console.log('[Location] Failed to get current position:', err.message);
          console.log('[Location] Using default location');
          return null;
        });

        if (!userLoc) {
          setIsLocationLoading(false);
          return;
        }

        const newCoords = {
          latitude: userLoc.coords.latitude,
          longitude: userLoc.coords.longitude,
        };

        setLocation(newCoords);
        setUserCoords(newCoords);

        // Reverse Geocode to get City Name
        let reverse = await Location.reverseGeocodeAsync(newCoords);
        if (reverse.length > 0) {
          const place = reverse[0];
          const city = place.city || place.subregion || "Unknown City";
          const region = place.region || place.country || "";
          setAddressLabel(`${city}, ${region}`);
        }
      } catch (error) {
        console.log('[Location] Error in location fetch:', error);
        console.log('[Location] Using default location (Kuching)');
      } finally {
        setIsLocationLoading(false);
      }
    }

    getUserLocation();
  }, []);

  const handleDetectionComplete = useCallback((data: {
    imageUri: string;
    result: DetectionResult;
    flashcards: FlashcardItem[];
    loading: boolean;
    error: string | null;
  }) => {
    console.log('[Detection] Detection complete, showing overlay');
    setDetectionData(data);
    setShowOverlay(true);
  }, []);

  const handleCloseOverlay = useCallback(() => {
    console.log('[Detection] Closing overlay');
    setShowOverlay(false);
    setDetectionData(null);
  }, []);

  const handleRetake = useCallback(() => {
    console.log('[Detection] Retaking photo');
    setShowOverlay(false);
    setDetectionData(null);
  }, []);

  const userProfile = {
    handle: profile?.username || profile?.full_name || "@traveller",
    avatar: profile?.avatar_url || "",
  };

  if (!isReady) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent, 
          { paddingBottom: insets.bottom + 40 }
        ]}
      >
        <HeaderSection />
        
        <View style={styles.body}>
          <CTASection onGetStarted={() => console.log('Get Started Pressed')} />

          {/* DYNAMIC CONTENT AREA */}
            {activeTab === 'map' ? (
              <View style={styles.mapWrapper}>
                {isLocationLoading ? (
                  <View style={styles.loaderCenter}>
                    <ActivityIndicator color={Colors.brand} />
                  </View>
                ) : (
                  <LocationSection 
                    locationLabel={addressLabel}
                    coords={location}
                    placeId="current_user_loc"
                    hideTextElements={true}
                  />
                )}
              </View>
            ) : (
              <View style={styles.cameraWrapper}>
                <LiveCameraView onDetectionComplete={handleDetectionComplete} />
              </View>
            )}

          <TabSwitch activeTab={activeTab} onTabChange={setActiveTab} />
        </View>

        <View style={styles.footerSpacer} />

        <PastTripsBanner onPress={() => router.push('/trips/make-trips')} />
      </ScrollView>
      
      {/* PrintingOverlay at screen level - not cramped inside camera wrapper */}
      <PrintingOverlay
        visible={showOverlay}
        loading={detectionData?.loading ?? false}
        error={detectionData?.error ?? null}
        imageUri={detectionData?.imageUri ?? null}
        result={detectionData?.result ?? null}
        userProfile={userProfile}
        flashcards={detectionData?.flashcards ?? []}
        onClose={handleCloseOverlay}
        onRetake={handleRetake}
        userCoords={userCoords}
        landmarkCoords={
          detectionData?.result?.latitude != null && detectionData?.result?.longitude != null
            ? { latitude: detectionData.result.latitude, longitude: detectionData.result.longitude }
            : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    position: 'relative',
  },
  scrollContent: {
    flexGrow: 1,
  },
  body: {
    paddingHorizontal: 24,
    gap: Space.md,
  },
  mapWrapper: {
    height: CONTENT_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
  },
  cameraWrapper: {
    height: CONTENT_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
  },
  loaderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerSpacer: {
    flex: 1,
    minHeight: 60,
  },
});