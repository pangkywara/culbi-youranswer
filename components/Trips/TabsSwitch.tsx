import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, LayoutChangeEvent } from 'react-native';
import { MapTrifold, Camera } from 'react-native-phosphor';
import { Colors, Radius, Space, Type, Shadows } from '@/constants/style';

interface TabSwitchProps {
  activeTab: 'map' | 'camera';
  onTabChange: (tab: 'map' | 'camera') => void;
}

const TABS: { key: 'map' | 'camera'; label: string; Icon: typeof MapTrifold }[] = [
  { key: 'map', label: 'Map', Icon: MapTrifold },
  { key: 'camera', label: 'Camera', Icon: Camera },
];

export const TabSwitch = ({ activeTab, onTabChange }: TabSwitchProps) => {
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
    setTabWidth(e.nativeEvent.layout.width / TABS.length);
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
      {TABS.map(({ key, label, Icon }) => {
        const isActive = activeTab === key;
        return (
          <Pressable
            key={key}
            style={styles.tab}
            onPress={() => onTabChange(key)}
          >
            <Icon
              size={20}
              color={isActive ? Colors.textPrimary : Colors.textSecondary}
              weight={isActive ? 'fill' : 'regular'}
            />
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
    padding: 3,
    position: 'relative',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: Space.sm,
    zIndex: 1,
  },
  tabLabel: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightMedium,
    color: Colors.textSecondary,
  },
  tabLabelActive: {
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
  },
});