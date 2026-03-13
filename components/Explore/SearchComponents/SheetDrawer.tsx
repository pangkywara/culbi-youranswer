import React, { forwardRef, useMemo, useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet, { 
  BottomSheetFlatList, 
  useBottomSheetSpringConfigs 
} from '@gorhom/bottom-sheet';
import { SingleExperienceCard } from './SingleExperienceCard';
import type { CulturalExperience } from '@/types';
import { Shadows } from '@/constants/style';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const PEEK_CONTENT_HEIGHT = 80;
const HEADER_GAP = Platform.OS === 'ios' ? 30 : 40;

export interface ExperienceSheetProps {
  data: CulturalExperience[];
  onItemPress: (item: CulturalExperience) => void;
  snapIndex?: number;
  activeFilter: string | null;
  topHeaderHeight: number;
  onFilterClear: () => void;
  onSheetIndexChange?: (index: number) => void;
  /** Picker mode — when set, cards show an inline \"Add\" button */
  tripId?: string;
  onAddToTrip?: (item: CulturalExperience) => void;
}

export const ExperienceSheet = forwardRef<BottomSheet, ExperienceSheetProps>(
  function ExperienceSheet(
    { data, onItemPress, snapIndex = 1, activeFilter, topHeaderHeight, onSheetIndexChange, tripId, onAddToTrip },
    ref,
  ) {
    const [currentIndex, setCurrentIndex] = useState(snapIndex);
    const { bottom: bottomInset } = useSafeAreaInsets();

    /**
     * FIXED ANIMATION CONFIG
     * Removed restDisplacementThreshold and restSpeedThreshold to fix TS error.
     * Damping and Stiffness still provide the premium "spring" feel.
     */
    const animationConfigs = useBottomSheetSpringConfigs({
      damping: 80,
      stiffness: 500,
      overshootClamping: true,
    });

    const snapPoints = useMemo(
      () => [
        PEEK_CONTENT_HEIGHT,
        '50%',
        SCREEN_HEIGHT - topHeaderHeight - HEADER_GAP + 10,
      ],
      [topHeaderHeight],
    );

    const isFullExpanded = currentIndex === 2;

    return (
      <View style={[StyleSheet.absoluteFillObject, styles.container]} pointerEvents="box-none">
        <BottomSheet
          ref={ref}
          index={snapIndex}
          snapPoints={snapPoints}
          animationConfigs={animationConfigs}
          enableDynamicSizing={false}
          backdropComponent={undefined}
          onChange={(idx) => {
            setCurrentIndex(idx);
            onSheetIndexChange?.(idx);
          }}
          handleIndicatorStyle={[
            styles.handle,
            isFullExpanded && { opacity: 0 }
          ]}
          backgroundStyle={[
            styles.background,
            isFullExpanded && styles.expandedBackground,
          ]}
          enablePanDownToClose={false}
          enableContentPanningGesture={false}
          animateOnMount
        >
          <View style={styles.header}>
            {currentIndex === 0 ? (
              <View style={styles.collapsedHeader}>
                <Text style={styles.collapsedText}>{data.length} places found</Text>
              </View>
            ) : (
              <View style={styles.idleRow}>
                <Text style={styles.idleText}>
                  {activeFilter ?? 'ASEAN'} · {data.length} places
                </Text>
              </View>
            )}
          </View>

          <BottomSheetFlatList
            data={data}
            keyExtractor={(item: CulturalExperience) => item.id}
            contentContainerStyle={[
              styles.listContent, 
              { paddingBottom: bottomInset + 24 }
            ]}
            scrollEnabled={true}
            bounces={true}
            renderItem={({ item }: { item: CulturalExperience }) => (
              <SingleExperienceCard 
                experience={item} 
                onPress={() => onItemPress(item)}
                tripId={tripId}
                onAddToTrip={onAddToTrip}
              />
            )}
          />
        </BottomSheet>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    zIndex: 10,
  },
  background: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFFFFF',
    ...Shadows.level5,
  },
  expandedBackground: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  handle: { 
    backgroundColor: '#DDDDDD', 
    width: 40, 
    height: 4 
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  collapsedHeader: { 
    height: 32, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  collapsedText: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#222' 
  },
  idleRow: { 
    height: 32, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  idleText: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#222', 
    textAlign: 'center' 
  },
  listContent: { 
    paddingHorizontal: 20, 
    paddingTop: 12 
  },
});