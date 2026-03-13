import React, { useCallback, useMemo, useState, useRef, memo, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  Dimensions,
  Pressable,
} from 'react-native';
import { CulturalCardGridSkeleton } from '@/components/UI/Skeleton';
import CardZoomOverlay from './CardZoomOverlay';
import CulturalCardItem from './CulturalCardItem';
import { Rarity } from '@/components/Collections/Cards/constants';
import { getAllGachaCards } from '@/lib/gacha';
import { useCollection } from '@/hooks/useGacha';
import type { GachaCard } from '@/types/gacha';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.45;
const GAP = 15;

// --- INTERFACES ---

interface CardData {
  id: string;
  title: string;
  rarity: Rarity;
  image: string;
  isOwned: boolean;
  duplicateCount?: number;
  // Overlay props
  imageUri?: string;
  originX?: number;
  originY?: number;
  originW?: number;
  originH?: number;
}

interface SectionProps {
  title: string;
  rarity: Rarity;
  data: CardData[];
  onPressCard: (item: CardData, x: number, y: number, w: number, h: number) => void;
  onSeeAll?: (rarity: Rarity) => void;
}

// --- COMPONENTS ---

const ListSeparator = memo(() => null);

const RaritySection = memo(function RaritySection({
  title, rarity, data, onPressCard, onSeeAll,
}: SectionProps) {
  const flatListRef = useRef<FlatList>(null);

  const filteredData = useMemo(
    () => data.filter((item) => item.rarity === rarity),
    [data, rarity]
  );

  const itemFullWidth = CARD_WIDTH + GAP;

  const renderItem = useCallback(({ item }: { item: CardData }) => (
    <View style={styles.cardWrapper}>
      <CulturalCardItem
        title={item.title}
        rarity={item.rarity}
        imageUri={item.image}
        cardWidth={CARD_WIDTH}
        onPress={(x, y, w, h) => onPressCard(item, x, y, w, h)}
        isLocked={!item.isOwned}
        duplicateCount={item.duplicateCount}
      />
    </View>
  ), [onPressCard]);

  if (filteredData.length === 0) return null;

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeaderRow}>
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
        data={filteredData}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        decelerationRate="fast"
        snapToInterval={itemFullWidth}
        snapToAlignment="start"
        // Style ensures the list occupies the full screen width to prevent clipping
        style={styles.flatList}
        // ContentContainer adds the padding without clipping the scroll movement
        contentContainerStyle={styles.horizontalListContent}
        renderItem={renderItem}
        removeClippedSubviews={false}
        scrollEventThrottle={16}
        ItemSeparatorComponent={ListSeparator}
      />
    </View>
  );
});

export default function CulturalCardGrid() {
  const [activeCard, setActiveCard] = useState<CardData | null>(null);
  const [allCards, setAllCards] = useState<GachaCard[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { cards: userCollection, loading: collectionLoading } = useCollection();

  useEffect(() => {
    async function fetchCards() {
      setLoading(true);
      try {
        const cards = await getAllGachaCards();
        setAllCards(cards);
      } catch (e) {
        console.error("Failed to fetch cards:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchCards();
  }, []);

  const cardsWithOwnership = useMemo(() => {
    const ownedCardIds = new Set(userCollection.map(c => c.card_id));
    const duplicateCounts = userCollection.reduce((acc, c) => {
      acc[c.card_id] = c.duplicate_count;
      return acc;
    }, {} as Record<string, number>);

    return allCards.map(card => ({
      id: card.id,
      title: card.card_title,
      rarity: card.rarity as Rarity,
      image: card.image_url,
      isOwned: ownedCardIds.has(card.id),
      duplicateCount: duplicateCounts[card.id] || 0,
    }));
  }, [allCards, userCollection]);

  const handleClose = useCallback(() => setActiveCard(null), []);

  const handlePressCard = useCallback((
    item: CardData, x: number, y: number, w: number, h: number,
  ) => {
    if (item.isOwned) {
      setActiveCard({ 
        ...item, 
        imageUri: item.image, 
        originX: x, 
        originY: y, 
        originW: w, 
        originH: h 
      });
    }
  }, []);

  const rarities: { title: string; type: Rarity }[] = [
    { title: "Common Artifacts",    type: "Common"  },
    { title: "Rare Treasures",      type: "Rare"    },
    { title: "Epic Relics",         type: "Epic"    },
    { title: "Legendary Landmarks", type: "Legends" },
    { title: "Mythic Wonders",      type: "Mythic"  },
    { title: "Secret Collection",   type: "Secret"  },
  ];

  if (loading || collectionLoading) {
    return <CulturalCardGridSkeleton />;
  }

  return (
    <View style={styles.container}>
      {rarities.map((r) => (
        <RaritySection
          key={r.type}
          title={r.title}
          rarity={r.type}
          data={cardsWithOwnership}
          onPressCard={handlePressCard}
          onSeeAll={(type) => console.log("See all for", type)}
        />
      ))}

      {activeCard && (
        <CardZoomOverlay 
          {...(activeCard as any)} 
          onClose={handleClose} 
        />
      )}
    </View>
  );
}

// --- STYLES ---

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
  },
  loadingContainer: {
    paddingVertical: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionContainer: {
    marginBottom: 32,
    // Allows shadows/tilts to render outside the immediate box
    overflow: 'visible',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#222',
    letterSpacing: -0.2,
  },
  seeAllBtn: {
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#222',
  },
  flatList: {
    width: SCREEN_WIDTH,
    overflow: 'visible', // Ensure cards don't clip on iOS
  },
  horizontalListContent: {
    // These paddings create the visual "margin" for the cards
    // while keeping the scrollable area full-width.
    paddingLeft: 20,
    paddingRight: 20 - GAP, 
    paddingBottom: 15,
  },
  cardWrapper: {
    marginRight: GAP,
    paddingVertical: 5,
    overflow: 'visible', // Essential for the 3D tilt effect
  }
});