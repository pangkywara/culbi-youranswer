import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Type, Space, Radius, S } from '@/constants/style';

interface Props {
  id: string; // Assuming id matches the city name (e.g., "bangkok", "pontianak")
  title: string;
}

export default function PassportCard({ id, title }: Props) {
  const router = useRouter();
  const [imageLoaded, setImageLoaded] = useState(false);

  const imageUrl = `https://assets.qramu.com/paspor_${id}.webp`;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
    >
      <View style={styles.imageWrapper}>
        {!imageLoaded && <View style={styles.imageSkeleton} />}
        <Image 
          source={{ uri: imageUrl }} 
          style={[styles.image, !imageLoaded && styles.imageHidden]}
          resizeMode="cover"
          onLoad={() => setImageLoaded(true)}
        />
      </View>
      <Text style={styles.title}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    padding: Space.lg,
    marginBottom: 14,
  },
  imageWrapper: {
    height: 160,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Space.md,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageHidden: {
    position: 'absolute',
    opacity: 0,
  },
  imageSkeleton: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.lg,
  },
  title: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
});