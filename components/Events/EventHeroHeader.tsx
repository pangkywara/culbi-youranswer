/**
 * EventHeroHeader.tsx
 * ────────────────────
 * - Full-width carousel image (no text/gradient overlay)
 * - Pagination dots pinned to bottom of image
 * - Floating back / share / heart buttons over the image
 * - Bold centred title + optional description rendered BELOW the image
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Share,
  Alert,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { CaretLeft, ShareNetwork } from 'react-native-phosphor';
import { useRouter } from 'expo-router';
import { Colors, Space, Radius, Shadows, Type } from '@/constants/style';
import AnimatedHeartButton from '@/components/AnimatedHeartButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = Math.round(SCREEN_WIDTH * 0.78); // ~4:3 feel

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1000&q=80';

export interface EventHeroHeaderProps {
  id: string;
  imageUrl?: string | null;
  photos?: string[];
  eventTitle?: string;
  /** Short description shown below the title, mirroring the screenshot subtitle */
  description?: string | null;
  isGuestFavorite?: boolean;
}

export default function EventHeroHeader({
  id,
  imageUrl,
  photos: providedPhotos,
  eventTitle,
  description,
  isGuestFavorite,
}: EventHeroHeaderProps) {
  const router = useRouter();

  const photos =
    providedPhotos && providedPhotos.length > 0
      ? providedPhotos
      : [imageUrl || PLACEHOLDER];

  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      if (idx !== activeIndex) {
        setActiveIndex(Math.max(0, Math.min(idx, photos.length - 1)));
      }
    },
    [photos.length, activeIndex],
  );

  const onShare = async () => {
    try {
      await Share.share({
        message: `Check out ${eventTitle ?? 'this amazing event'} on Culbi!`,
        title: eventTitle ?? 'Cultural Event',
      });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View>
      {/* ── 1. Carousel image ── */}
      <View style={styles.carouselWrapper}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          decelerationRate="fast"
          removeClippedSubviews={Platform.OS === 'android'}
        >
          {photos.map((uri, i) => (
            <Image
              key={i}
              source={{ uri }}
              style={styles.image}
              contentFit="cover"
              transition={250}
              cachePolicy="memory-disk"
              placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            />
          ))}
        </ScrollView>

        {/* Pagination dots */}
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

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  /* Carousel */
  carouselWrapper: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: Colors.surfacePale,
    overflow: 'hidden',
  },
  image: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    borderRadius: 30,
  },

  /* Floating overlay row */
  overlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 0 : 10,
    left: Space.xl,
    right: Space.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  rightBtns: {
    flexDirection: 'row',
    gap: Space.sm,
  },
  btn: {
    backgroundColor: Colors.white,
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.level2,
  },
  heartBtnStyle: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    ...Shadows.level2,
  },

  /* Pagination dots */
  dotContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotInactive: { backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: {
    backgroundColor: Colors.white,
    transform: [{ scale: 1.25 }],
  },

  /* Text block below image */
  textBlock: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 6,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  description: {
    marginTop: 10,
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '400',
    paddingHorizontal: 8,
  },
});