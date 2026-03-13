import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, LayoutChangeEvent } from 'react-native';
import { Colors, Radius, Space, Type, Shadows } from '@/constants/style';

interface DateTabSwitchProps {
  activeTab: 'dates' | 'flexible';
  onTabChange: (tab: 'dates' | 'flexible') => void;
}

const TABS: { key: 'dates' | 'flexible'; label: string }[] = [
  { key: 'dates', label: 'Dates' },
  { key: 'flexible', label: 'Flexible' },
];

export const DateTabSwitch = ({ activeTab, onTabChange }: DateTabSwitchProps) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [tabWidth, setTabWidth] = React.useState(0);
  const activeIndex = TABS.findIndex((t) => t.key === activeTab);

  useEffect(() => {
    if (tabWidth > 0) {
      Animated.spring(slideAnim, {
        toValue: activeIndex * tabWidth,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    }
  }, [activeIndex, tabWidth]);

  const handleLayout = (e: LayoutChangeEvent) => {
    setTabWidth(e.nativeEvent.layout.width / TABS.length);
  };

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <Animated.View
        style={[
          styles.slidingPill,
          {
            width: tabWidth - 4,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      />
      {TABS.map(({ key, label }) => {
        const isActive = activeTab === key;
        return (
          <Pressable key={key} style={styles.tab} onPress={() => onTabChange(key)}>
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surfacePale,
    borderRadius: Radius.pill,
    padding: 2,
    position: 'relative',
    height: 48,
    marginHorizontal: Space.xl,
  },
  slidingPill: {
    position: 'absolute',
    top: 2,
    left: 2,
    bottom: 2,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    ...Shadows.level2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tabLabel: {
    fontSize: Type.sizeBody,
    fontWeight: Type.weightMedium,
    color: Colors.textPrimary,
  },
  tabLabelActive: {
    fontWeight: Type.weightSemibold,
  },
});