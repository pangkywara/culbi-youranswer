import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Space, S } from '@/constants/style';
import { useAuth } from '@/context/AuthContext';

export default function StickyProfileHeader() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  // Logic extracted from your data fetch code
  const displayName = profile?.full_name ?? 'Explorer';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <View style={styles.container}>
        {/* AVATAR LOGIC */}
        <View style={styles.avatarWrapper}>
          {profile?.avatar_url ? (
            <Image 
              source={{ uri: profile.avatar_url }} 
              style={styles.avatarSmall} 
            />
          ) : (
            <View style={[styles.avatarSmall, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{avatarLetter}</Text>
            </View>
          )}
        </View>

        {/* CENTER TITLE */}
        <Text style={styles.title} numberOfLines={1}>
          {displayName}
        </Text>

        {/* EMPTY VIEW FOR BALANCED FLEXBOX */}
        <View style={{ width: 36 }} /> 
      </View>
      <View style={styles.bottomBorder} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { 
    backgroundColor: Colors.white,
    zIndex: 100,
  },
  container: {
    height: 56, // Standard mobile header height
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space.xl,
    justifyContent: 'space-between',
  },
  avatarWrapper: {
    width: 36,
    height: 36,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222', // Darker background for the letter fallback
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  title: {
    fontSize: 16,
    fontWeight: '700', // Made bolder for better visibility as a header
    color: '#222222',
    textAlign: 'center',
    flex: 1, // Ensures title stays centered between the avatar and the empty view
  },
  bottomBorder: {
    height: 1,
    backgroundColor: '#F0F0F0',
  }
});