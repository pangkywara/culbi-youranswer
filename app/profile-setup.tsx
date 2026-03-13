/**
 * app/profile-setup.tsx
 * Route shown to newly signed-in users who haven't completed their profile.
 * Wraps <ProfileSetupForm> in a safe-area-aware container.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '@/constants/style';
import ProfileSetupForm from '@/components/Profiles/ProfileSetupForm';

export default function ProfileSetupScreen() {
  return (
    <View style={styles.container}>
      <ProfileSetupForm />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
});
