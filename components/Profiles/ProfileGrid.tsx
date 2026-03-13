import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image'; // You can still use expo-image with require() for better performance
import { Colors, Type, Space, Radius, S } from '@/constants/style';
import { ProfileGridSkeleton } from '@/components/UI/Skeleton';

interface GridCardProps {
  title: string;
  // Changed to ImageSourcePropType to handle require()
  iconSource?: ImageSourcePropType; 
  isNew?: boolean;
}

function GridCard({ title, iconSource, isNew }: GridCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7}>
      <View style={styles.image}>
        {iconSource ? (
          <>
            {!imageLoaded && <View style={[styles.icon, { backgroundColor: Colors.surfaceMuted, borderRadius: 8 }]} />}
            <Image 
              source={iconSource}
              style={[styles.icon, !imageLoaded && { position: 'absolute', opacity: 0 }]}
              contentFit="contain"
              onLoad={() => setImageLoaded(true)}
            />
          </>
        ) : (
          <View style={styles.mock} />
        )}
        
        {isNew && (
          <View style={S.badgeNewCard}>
            <Text style={S.micro}>NEW</Text>
          </View>
        )}
      </View>
      <Text style={styles.title}>{title}</Text>
    </TouchableOpacity>
  );
}

export default function ProfileGrid() {
  return (
    <View style={styles.container}>
      <GridCard 
        title="Past trips" 
        // Using local require following your assets folder structure
        iconSource={require('@/assets/images/past-trips.webp')}
        isNew={true}
      />
      <GridCard 
        title="Connections"
        iconSource={require('@/assets/images/connection.webp')}
        isNew={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flexDirection: 'row', 
    gap: Space.lg, 
    marginBottom: Space.xl 
  },
  card: { 
    ...S.card, 
    flex: 1, 
    alignItems: 'center' 
  },
  image: {
    ...S.cardImagePlaceholder,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  icon: {
    width: '100%',
    height: '100%',
  },
  title: { 
    fontSize: Type.sizeBody, 
    fontWeight: Type.weightSemibold, 
    color: Colors.textPrimary,
    marginTop: 4 
  },
  mock: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.borderSubtle ?? '#F0F0F0',
  },
});