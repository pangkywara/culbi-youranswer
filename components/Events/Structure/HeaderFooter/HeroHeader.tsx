import React, { useState, useRef } from 'react';
import { 
  View, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  FlatList, 
  Dimensions, 
  Text, 
  ViewToken,
  Share,
  Alert,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import type { PlacePhoto, BuildPhotoUrlOptions } from '@/lib/places';
import { buildPhotoUrl } from '@/lib/places';
import { useLike } from '@/hooks/useLike';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PLACEHOLDER = 'https://placehold.co/1000x800/E8E8E8/888888/png?text=Loading...';

export interface HeroHeaderProps {
  /** Google Places photo references. Falls back to a placeholder if empty. */
  photos?: PlacePhoto[];
  placeName?: string;
  placeId?: string;
}

export default function HeroHeader({ photos, placeName, placeId }: HeroHeaderProps) {
  // Build gallery: real photo URLs from Google, pad with placeholder if needed
  const gallery = photos && photos.length > 0
    ? photos.map(p => buildPhotoUrl(p.photoReference, { maxWidth: 1000 }))
    : [PLACEHOLDER];
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);

  // ── Persisted like state from Supabase ──────────────────────────────────
  const { isLiked, toggleLike } = useLike({ placeId: placeId ?? '', placeName });

  // Animation values
  const scale = useRef(new Animated.Value(1)).current;
  const burstScale = useRef(new Animated.Value(0)).current;
  const burstOpacity = useRef(new Animated.Value(0)).current;

  const onViewRef = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setActiveIndex(viewableItems[0].index);
    }
  });

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const handleHeartPress = () => {
    const nextLiked = !isLiked;

    if (nextLiked) {
      // LIKE: Snappy pop with organic spring physics
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.45,
          friction: 3,
          tension: 45,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();

      // BURST: Smooth expansion and fade
      burstScale.setValue(0);
      burstOpacity.setValue(0.5);
      Animated.parallel([
        Animated.timing(burstScale, {
          toValue: 2.8,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(burstOpacity, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // UNLIKE: Simple soft bounce back
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }).start();
    }

    // Persist to Supabase (fire-and-forget — optimistic in useLike)
    toggleLike();
  };

  const onShare = async () => {
    try {
      await Share.share({
        message: `Check out this amazing place${placeName ? ` at ${placeName}` : ''}!`,
        url: gallery[activeIndex],
        title: placeName ?? 'Cultural Destination',
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const navigateToPhotos = () => {
    if (placeId) router.push(`/destinations/photos/${placeId}`);
  };

  const renderItem = ({ item }: { item: string }) => (
    <TouchableOpacity activeOpacity={0.9} onPress={navigateToPhotos}>
      <Image 
        source={{ uri: item }} 
        style={styles.carouselImage} 
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={gallery}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, index) => index.toString()}
        onViewableItemsChanged={onViewRef.current}
        viewabilityConfig={viewConfigRef.current}
        style={styles.flatList}
      />
      <TouchableOpacity style={styles.counterBadge} onPress={navigateToPhotos}>
        <Text style={styles.counterText}>
          {activeIndex + 1} / {gallery.length}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    height: 300, 
    width: '100%', 
    position: 'relative' 
  },
  flatList: {
    flex: 1,
  },
  carouselImage: { 
    width: SCREEN_WIDTH, 
    height: '100%',
  },
  overlay: { 
    position: 'absolute', 
    top: 10, 
    left: 20, 
    right: 20, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingTop: 20
  },
  rightBtns: { 
    flexDirection: 'row', 
    gap: 10, 
  },
  btn: { 
    backgroundColor: '#fff', 
    padding: 8, 
    borderRadius: 20, 
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartWrapper: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  burst: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF385C',
  },
  counterBadge: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    backgroundColor: 'rgba(34, 34, 34, 0.7)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  counterText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  }
});