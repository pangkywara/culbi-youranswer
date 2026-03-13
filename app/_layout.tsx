import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { TripProvider } from '@/context/TripContext';
import { GachaTicketToast } from '@/components/Gacha/GachaTicketToast';
import { useToastStore } from '@/lib/toastStore';
import { useRouter as useExpoRouter } from 'expo-router';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    ...FontAwesome.font,
  });

  useEffect(() => { if (error) throw error; }, [error]);

  return (
    <AuthProvider>
      <TripProvider>
        <RootLayoutNav fontLoaded={loaded} />
      </TripProvider>
    </AuthProvider>
  );
}

/**
 * AuthGate — handles redirection and hides splash screen
 */
function AuthGate({ fontLoaded }: { fontLoaded: boolean }) {
  const { session, profile, loading, profileLoaded, guestOnboarded, isAnonymous } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!fontLoaded || loading || !profileLoaded) return;

    SplashScreen.hideAsync();

    const inOnboarding = segments[0] === 'onboarding';
    const inProfileSetup = segments[0] === 'profile-setup';

    if (isAnonymous) {
      if (!guestOnboarded && !inOnboarding) router.replace('/onboarding');
      if (guestOnboarded && inOnboarding) router.replace('/(tabs)');
      return;
    }

    if (!session) {
      if (!inOnboarding) router.replace('/onboarding');
      return;
    }

    if (!profile?.onboarded) {
      if (!inProfileSetup) router.replace('/profile-setup');
      return;
    }

    if (inProfileSetup) router.replace('/(tabs)');
  }, [session, profile, loading, profileLoaded, segments, guestOnboarded, isAnonymous, fontLoaded]);

  return null;
}

/**
 * RootLayoutNav — Refactored to eliminate "Black Sheet" flashes
 */
function RootLayoutNav({ fontLoaded }: { fontLoaded: boolean }) {
  const router = useExpoRouter();
  const showTicketToast = useToastStore((s) => s.showTicketToast);
  const ticketCount = useToastStore((s) => s.ticketCount);
  const hideGachaToast = useToastStore((s) => s.hideGachaTicketToast);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* FORCING DEFAULT THEME:
          By using DefaultTheme exclusively, the navigation container stays white
          even if the user's system is in Dark Mode.
        */}
        <ThemeProvider value={DefaultTheme}>
          <AuthGate fontLoaded={fontLoaded} />
          
          <Stack 
            screenOptions={{ 
              headerShown: false,
              // CONTENT STYLE FIX:
              // This ensures the background of EVERY screen is white during 
              // the transition animation, preventing the black sheet/flash.
              contentStyle: { backgroundColor: '#FFFFFF' } 
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding/index" options={{ animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="profile-setup" options={{ animation: 'slide_from_right', gestureEnabled: false }} />
            <Stack.Screen name="chat/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="groupchat/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="destinations/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="landmark-detection" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="events/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="events/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            
            <Stack.Screen name="edit" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="edit-trips" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          </Stack>
          
          <GachaTicketToast
            visible={showTicketToast}
            tickets={ticketCount}
            onDismiss={hideGachaToast}
            onViewCollection={() => {
              hideGachaToast();
              router.push('/collections/passport?tab=Cards');
            }}
          />
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}