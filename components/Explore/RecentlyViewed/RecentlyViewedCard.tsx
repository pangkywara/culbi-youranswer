import React from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Star } from 'react-native-phosphor';
import { CulturalExperience } from '@/types';
import { Colors, Type, Space, Radius, Shadows } from '@/constants/style';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Two columns with 24px horizontal padding on each side and a 12px gap between cards
const CARD_WIDTH = (SCREEN_WIDTH - Space.xxl * 2 - Space.md) / 2;

interface RecentlyViewedCardProps {
  experience: CulturalExperience;
  onPress: () => void;
}

export const RecentlyViewedCard = React.memo(function RecentlyViewedCard({
  experience,
  onPress,
}: RecentlyViewedCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: experience.imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
        />
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {experience.title}
        </Text>

        {experience.bridgeRating > 0 && (
          <View style={styles.metaRow}>
            <Star size={11} color={Colors.textPrimary} weight="fill" />
            <Text style={styles.rating}>
              {experience.bridgeRating % 1 === 0
                ? experience.bridgeRating.toFixed(1)
                : experience.bridgeRating.toFixed(2)}
            </Text>
          </View>
        )}

        <Text style={styles.subtitle} numberOfLines={1}>
          {experience.distance.split(',')[0]}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.card,
    overflow: 'hidden',
    backgroundColor: Colors.surfacePale,
    ...Shadows.level2,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  info: {
    paddingTop: Space.sm,
    gap: Space.xxs,
  },
  title: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xxs,
  },
  rating: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weight700,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: Type.sizeBodySm,
    color: Colors.textSecondary,
  },
});
