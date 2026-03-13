import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  interpolateColor,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { X, Check } from 'react-native-phosphor';
import { ThemeCard } from './ThemeCard';

/* ───────────────── TYPES ───────────────── */

export type MapTypeKey = 'standard' | 'satellite' | 'hybrid' | 'terrain';
export type MapThemeKey = 'standard' | 'culbi' | 'minimal' | 'natural' | 'dark';

export interface MapSettingsPanelProps {
  isVisible: boolean;
  onClose: () => void;
  theme: MapThemeKey;
  onThemeChange: (t: MapThemeKey) => void;
  mapType: MapTypeKey;
  onMapTypeChange: (t: MapTypeKey) => void;
  showPOI: boolean;
  onShowPOIChange: (v: boolean) => void;
  showTransit: boolean;
  onShowTransitChange: (v: boolean) => void;
  showTraffic: boolean;
  onShowTrafficChange: (v: boolean) => void;
}

/* ───────────────── CONFIG ───────────────── */

const SHEET_DURATION = 280;
const SWITCH_DURATION = 200;
const PANEL_HEIGHT = 600; // Increased to ensure scrollability
const CLEAN_EASING = Easing.out(Easing.cubic);

function MapSettingsPanel({ isVisible, onClose, ...props }: MapSettingsPanelProps) {
  const translateY = useSharedValue(PANEL_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsMounted(true);
      backdropOpacity.value = withTiming(1, { duration: SHEET_DURATION });
      translateY.value = withTiming(0, { duration: SHEET_DURATION, easing: CLEAN_EASING });
    } else {
      backdropOpacity.value = withTiming(0, { duration: SHEET_DURATION });
      translateY.value = withTiming(PANEL_HEIGHT, { duration: SHEET_DURATION, easing: CLEAN_EASING }, (finished) => {
        if (finished) runOnJS(setIsMounted)(false);
      });
    }
  }, [isVisible]);

  const THEMES = useMemo(() => ['standard', 'culbi', 'minimal', 'natural', 'dark'] as MapThemeKey[], []);
  const MAP_TYPES = useMemo(() => ['standard', 'satellite', 'hybrid', 'terrain'] as MapTypeKey[], []);

  /* ─── GESTURE FIX ─── */
  // Memoized so the gesture object reference is stable across renders.
  // RNGH v2 crashes if the Pan gesture is replaced while a swipe is in
  // progress — it internally tries to call methods on the old (now-detached)
  // gesture object in the native gesture arena.
  const panGesture = useMemo(() =>
    Gesture.Pan()
      .onUpdate((e) => {
        if (e.translationY > 0) translateY.value = e.translationY;
      })
      .onEnd((e) => {
        if (e.translationY > 120 || e.velocityY > 600) {
          translateY.value = withTiming(PANEL_HEIGHT, { duration: 200, easing: Easing.linear }, () => runOnJS(onClose)());
        } else {
          translateY.value = withTiming(0, { duration: 250, easing: CLEAN_EASING });
        }
      }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [onClose]);

  const animatedSheet = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const animatedBackdrop = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  if (!isMounted) return null;

return (
  <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
    {/* Backdrop — pointerEvents mirrors isVisible so the opacity-0 Pressable
        cannot steal touches while the dismiss animation is playing */}
    <Animated.View
      style={[styles.backdrop, animatedBackdrop]}
      pointerEvents={isVisible ? 'auto' : 'none'}
    >
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
    </Animated.View>

    {/* Sheet — no nested GestureHandlerRootView needed; the root GHRV in
        _layout.tsx already covers the full tree. Nested roots in RNGH v2+
        create an isolated gesture context that ignores pointerEvents and
        intercepts ALL touches inside the absoluteFillObject overlay. */}
    <Animated.View style={[styles.sheet, animatedSheet]}>
      
      {/* HEADER DRAG AREA */}
      <GestureDetector gesture={panGesture}>
        <View style={styles.dragZone}>
          <View style={styles.handle} />

          <View style={styles.header}>

            <Text style={styles.titlebig}>Map settings</Text>

            <View style={{ width: 28 }} />
          </View>
        </View>
      </GestureDetector>

      {/* CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        bounces
      >
        <Section title="Map view">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themeRow}>
            {THEMES.map((key) => (
              <ThemeCard
                key={key}
                themeKey={key}
                isActive={props.theme === key}
                onPress={() => props.onThemeChange(key)}
              />
            ))}
          </ScrollView>
        </Section>

        <Section title="Map type">
          <View style={styles.pillContainer}>
            {MAP_TYPES.map((key) => (
              <Pressable
                key={key}
                style={[styles.pill, props.mapType === key && styles.activePill]}
                onPress={() => props.onMapTypeChange(key)}
              >
                <Text style={[styles.pillText, props.mapType === key && styles.activePillText]}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title="Show on map" isLast>
          <View style={styles.filterCard}>
            <FilterRow label="Points of interest" value={props.showPOI} onChange={props.onShowPOIChange} />
            <FilterRow label="Transit" value={props.showTransit} onChange={props.onShowTransitChange} />
            <FilterRow label="Traffic" value={props.showTraffic} onChange={props.onShowTrafficChange} isLast />
          </View>
        </Section>
      </ScrollView>
    </Animated.View>
  </View>
);
}

/* ───────────────── INTERNAL COMPONENTS ───────────────── */

const Section = React.memo(({ title, children, isLast }: any) => (
  <View style={[styles.section, !isLast && styles.sectionBorder]}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
));

const CustomSwitch = ({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) => {
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { 
      duration: SWITCH_DURATION, 
      easing: Easing.bezier(0.4, 0, 0.2, 1) 
    });
  }, [value]);

  const animatedTrack = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ['#B0B0B0', '#222222']),
  }));

  const animatedThumb = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [2, 18]) },
      { scale: interpolate(progress.value, [0, 0.5, 1], [1, 0.95, 1]) }
    ],
  }));

  const animatedCheck = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.8], [0, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.7, 1]) }]
  }));

  return (
    <Pressable onPress={() => onValueChange(!value)}>
      <Animated.View style={[styles.switchTrack, animatedTrack]}>
        <Animated.View style={[styles.switchThumb, animatedThumb]}>
          <Animated.View style={animatedCheck}>
            <Check size={12} color="#222" weight="bold" />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

const FilterRow = React.memo(({ label, value, onChange, isLast }: any) => (
  <View style={[styles.filterRow, !isLast && styles.filterBorder]}>
    <Text style={styles.filterLabel}>{label}</Text>
    <CustomSwitch value={value} onValueChange={onChange} />
  </View>
));

export default React.memo(MapSettingsPanel);

/* ───────────────── STYLES ───────────────── */
const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: PANEL_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },

  /* ───────── HEADER ───────── */

  dragZone: {
    paddingTop: 12,
    paddingBottom: 10,
  },

  handle: {
    alignSelf: 'center',
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    marginBottom: 12,
  },

  header: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  
  titlebig: {
    position: 'absolute',
    left: 0,
    right: 0,
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
    textAlign: 'center',
  },

  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
  },

  closeBtn: {
    padding: 4,
  },

  /* ───────── CONTENT ───────── */

  scroll: {
    paddingBottom: 80,
  },

  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 10,
  },

  sectionBorder: {
    marginTop: 8,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 16,
  },

  themeRow: {
    paddingRight: 10,
    gap: 12,
  },

  /* ───────── PILLS ───────── */

  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },

  activePill: {
    backgroundColor: '#222222',
    borderColor: '#222222',
  },

  pillText: {
    fontSize: 16,
    color: '#222',
    fontWeight: '500',
  },

  activePillText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  filterCard: {
    backgroundColor: '#F7F7F7',
    borderRadius: 14,
    paddingHorizontal: 16,
  },

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },

  filterBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },

  filterLabel: {
    fontSize: 16,
    color: '#222',
    fontWeight: '400',
  },

  /* ───────── SWITCH ───────── */

  switchTrack: {
    width: 48,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    padding: 2,
  },

  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
});