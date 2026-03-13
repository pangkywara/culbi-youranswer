import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Type, Space, Radius, S } from '@/constants/style';
import { CollectionsCardSkeleton } from '@/components/UI/Skeleton';

export default function CollectionsCard() {
  const router = useRouter();
  const [imageLoaded, setImageLoaded] = useState(false);

  const handlePress = () => {
    router.push('/collections/passport');
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.85}>
      {!imageLoaded && (
        <View style={[styles.image, { backgroundColor: Colors.surfaceMuted }]} />
      )}
      <Image
        source={require('@/assets/images/collections.webp')}
        style={[styles.image, !imageLoaded && { position: 'absolute', opacity: 0 }]}
        onLoad={() => setImageLoaded(true)}
      />
      <View style={{ flex: 1, marginLeft: Space.lg }}>
        <Text style={S.titleSemi}>Your Collections</Text>
        <Text style={S.caption}>
          View your Cultural Cards and Passport progress.
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    ...S.card,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: Radius.pill,
  },
});