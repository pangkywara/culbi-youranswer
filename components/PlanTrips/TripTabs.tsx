import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Colors, Type, Space, Radius, Shadows } from '@/constants/style';

type TabKey = 'planned' | 'completed';

interface TripTabsProps {
  activeTab: TabKey;
  onSelect: (tab: TabKey) => void;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'planned', label: 'Planned' },
  { key: 'completed', label: 'Completed' },
];

export const TripTabs = ({ activeTab, onSelect }: TripTabsProps) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [tabWidth, setTabWidth] = React.useState(0);

  const activeIndex = TABS.findIndex((t) => t.key === activeTab);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: activeIndex * tabWidth,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();
  }, [activeIndex, tabWidth]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const totalWidth = e.nativeEvent.layout.width;
    setTabWidth(totalWidth / TABS.length);
  };

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {/* Sliding pill */}
      <Animated.View
        style={[
          styles.slidingPill,
          {
            width: tabWidth - 6,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      />

      {/* Tab buttons */}
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={styles.tab}
          onPress={() => onSelect(tab.key)}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === tab.key && styles.tabLabelActive,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surfacePale,
    borderRadius: Radius.pill,
    padding: 3,
    position: 'relative',
    marginHorizontal: Space.xl,
    marginVertical: Space.lg,
    ...Shadows.level1,
  },
  slidingPill: {
    position: 'absolute',
    top: 3,
    left: 3,
    bottom: 3,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    ...Shadows.level3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tabLabel: {
    fontSize: Type.sizeBody,
    fontWeight: Type.weightMedium,
    color: Colors.textSecondary,
  },
  tabLabelActive: {
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
  },
});