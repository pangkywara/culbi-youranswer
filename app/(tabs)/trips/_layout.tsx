import { Stack } from 'expo-router';

/**
 * Stack navigator for the Trips tab.
 * All screens here (index, make-trips, [tripId]) live inside the Trips tab,
 * so the "Trips" tab bar item stays highlighted on every sub-screen.
 * The edit screen is intentionally kept at the root Stack level (app/edit.tsx)
 * so it is presented as a full-screen modal without the tab bar.
 */
export default function TripsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="make-trips" />
      <Stack.Screen name="[tripId]" />
    </Stack>
  );
}
