import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Colors, Space, Radius } from '@/constants/style';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// We calculate height based on the width minus horizontal padding to keep the aspect ratio
const HORIZONTAL_PADDING = Space.xxl * 2; // Matches your DetailMeta padding
const CARD_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING;
const IMAGE_HEIGHT = Math.round(CARD_WIDTH * 0.75); // 4:3 Aspect Ratio

const PLACEHOLDER = 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1000&q=80';

export interface TripHeroHeaderProps {
  photos?: string[];
}

export default function TripHeroHeader({
  photos: providedPhotos,
}: TripHeroHeaderProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const photos = providedPhotos && providedPhotos.length > 0 ? providedPhotos : [PLACEHOLDER];

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);
      if (idx !== activeIndex) {
        setActiveIndex(Math.max(0, Math.min(idx, photos.length - 1)));
      }
    },
    [photos.length, activeIndex],
  );

  return (
    <View style={styles.outerContainer}>
      <View style={styles.carouselWrapper}>
        <ScrollView
          horizontal
          pagingEnabled
          snapToInterval={CARD_WIDTH} // Ensures it snaps to the card width, not screen width
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          contentContainerStyle={styles.scrollContent}
        >
          {photos.map((uri, i) => (
            <Image
              key={i}
              source={{ uri }}
              style={styles.image}
              contentFit="cover"
              transition={250}
            />
          ))}
        </ScrollView>

        {/* Pagination dots pinned to bottom of image */}
        {photos.length > 1 && (
          <View style={styles.dotContainer}>
            {photos.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === activeIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: Space.xxl, // Right and Left Margin
    paddingTop: Space.xl,        // Top Margin
    paddingBottom: Space.md,     // Bottom Margin (space before the title)
    backgroundColor: Colors.white,
  },
  carouselWrapper: {
    width: CARD_WIDTH,
    height: IMAGE_HEIGHT,
    borderRadius: Radius.xl, 
    backgroundColor: Colors.surfacePale,
    overflow: 'hidden',
    position: 'relative',
  },
  scrollContent: {
    // This ensures the images align with the wrapper's snap points
  },
  image: {
    width: CARD_WIDTH,
    height: IMAGE_HEIGHT,
  },
  dotContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotInactive: { 
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: Colors.white,
    width: 12, // Active dot is slightly elongated
  },
});