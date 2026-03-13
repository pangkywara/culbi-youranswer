import React, { useRef, useCallback, memo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  Pressable, 
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent
} from 'react-native';
import CulturalCardItem from './CulturalCardItem';
import { Rarity } from '@/components/Collections/Cards/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.45;
const GAP = 15;
const ITEM_FULL_WIDTH = CARD_WIDTH + GAP;

interface SectionProps {
  title: string;
  rarity: Rarity;
  data: any[];
  onPressCard: (item: any, x: number, y: number, w: number, h: number) => void;
  onSeeAll?: (rarity: Rarity) => void;
}

// ─── OPTIMIZED ITEM WRAPPER ───
// We memoize the card item so it doesn't re-render unless the ID changes.
const MemoizedCard = memo(({ item, onPressCard }: { item: any, onPressCard: any }) => (
  <View style={styles.cardWrapper}>
    <CulturalCardItem
      title={item.title}
      rarity={item.rarity as Rarity}
      imageUri={item.image}
      cardWidth={CARD_WIDTH}
      onPress={(x, y, w, h) => onPressCard(item, x, y, w, h)}
    />
  </View>
));

export default function RaritySection({ title, rarity, data, onPressCard, onSeeAll }: SectionProps) {
  const flatListRef = useRef<FlatList>(null);
  
  const filteredData = React.useMemo(() => 
    data.filter((item) => item.rarity === rarity), 
  [data, rarity]);

  // Use a smaller loop (Double instead of Triple) to save memory
  const loopedData = React.useMemo(() => [...filteredData, ...filteredData], [filteredData]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = event.nativeEvent.contentOffset.x;
    const contentWidth = filteredData.length * ITEM_FULL_WIDTH;
    
    // Jump logic: snappy and silent
    if (x >= contentWidth) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    } else if (x <= 0) {
      flatListRef.current?.scrollToOffset({ offset: contentWidth, animated: false });
    }
  }, [filteredData.length]);

  const renderItem = useCallback(({ item }: { item: any }) => (
    <MemoizedCard item={item} onPressCard={onPressCard} />
  ), [onPressCard]);

  if (filteredData.length === 0) return null;

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Pressable 
          onPress={() => onSeeAll?.(rarity)}
          style={({ pressed }) => [styles.seeAllBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.seeAllText}>See All</Text>
        </Pressable>
      </View>

      <FlatList
        ref={flatListRef}
        data={loopedData}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={32} // Increased throttle to reduce JS bridge traffic
        snapToInterval={ITEM_FULL_WIDTH}
        decelerationRate="fast"
        
        // --- VIRTUALIZATION SETTINGS ---
        // This is the secret sauce for performance
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={3}
        removeClippedSubviews={true} 
        
        style={styles.flatListOverflow} 
        contentContainerStyle={styles.horizontalListPadding}
        getItemLayout={(_, index) => ({
          length: ITEM_FULL_WIDTH,
          offset: ITEM_FULL_WIDTH * index,
          index,
        })}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: { marginBottom: 20, overflow: 'visible' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#121212', textTransform: 'uppercase' },
  seeAllBtn: { backgroundColor: '#f2f2f2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  seeAllText: { fontSize: 11, fontWeight: '700', color: '#888' },
  flatListOverflow: { overflow: 'visible' },
  horizontalListPadding: { paddingHorizontal: 20, paddingBottom: 20 },
  cardWrapper: { marginRight: GAP, paddingVertical: 10 }
});