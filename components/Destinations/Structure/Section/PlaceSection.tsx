import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { MapPin } from 'react-native-phosphor';

export interface PlaceSectionProps {
  /** Landmark name from Supabase or Google */
  name?: string;
  /** Category from Supabase landmark.category */
  category?: string;
  /** Region from Supabase landmark.region (e.g. "Sarawak, Malaysia") */
  region?: string;
  /** Primary photo URL/ref already resolved to a full URL */
  primaryPhotoUrl?: string | null;
}

export default function PlaceSection({ name, category, region, primaryPhotoUrl }: PlaceSectionProps) {
  const displayName = name ?? 'Cultural Destination';
  const subLine = [category, region].filter(Boolean).join(' · ');

  return (
    <View style={styles.outerWrapper}>
      <View style={styles.container}>
        {/* Avatar — primary photo thumbnail, falls back to an icon background */}
        <View style={styles.avatarWrapper}>
          {primaryPhotoUrl ? (
            <Image
              source={{ uri: primaryPhotoUrl }}
              style={styles.avatar}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <MapPin size={22} color="#717171" weight="duotone" />
            </View>
          )}
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.hostName} numberOfLines={1}>{displayName}</Text>
          {subLine ? <Text style={styles.hostSub}>{subLine}</Text> : null}
        </View>
      </View>

      <View style={styles.dividerBottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {},
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatarWrapper: {
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 32,
    backgroundColor: '#f0f0f0',
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: { flex: 1 },
  hostName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  hostSub: {
    color: '#717171',
    fontSize: 14,
    marginTop: 2,
  },
  dividerBottom: {
    height: 1,
    backgroundColor: '#ebebeb',
    marginTop: 8,
  },
});