import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { X } from 'react-native-phosphor';
import { MAP_THEME_PREVIEWS, MapThemeKey } from '../../../constants/MapStyle';

// ─── Types ───────────────────────────────────────────────────────────────────

export type MapTypeKey = 'standard' | 'satellite' | 'hybrid' | 'terrain';

export interface MapSettingsPanelProps {
  isVisible: boolean;
  onClose: () => void;
  // Theme
  theme: MapThemeKey;
  onThemeChange: (t: MapThemeKey) => void;
  // Map type
  mapType: MapTypeKey;
  onMapTypeChange: (t: MapTypeKey) => void;
  // Filters
  showPOI: boolean;
  onShowPOIChange: (v: boolean) => void;
  showTransit: boolean;
  onShowTransitChange: (v: boolean) => void;
  showTraffic: boolean;
  onShowTrafficChange: (v: boolean) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const THEME_KEYS: MapThemeKey[] = ['standard', 'culbi', 'minimal', 'natural', 'dark'];
const MAP_TYPES: { key: MapTypeKey; label: string }[] = [
  { key: 'standard',  label: 'Default'   },
  { key: 'satellite', label: 'Satellite' },
  { key: 'hybrid',    label: 'Hybrid'    },
  { key: 'terrain',   label: 'Terrain'   },
];

const PANEL_HEIGHT = 420;

// ─── ThemeCard ───────────────────────────────────────────────────────────────

interface ThemeCardProps {
  themeKey: MapThemeKey;
  isActive: boolean;
  onPress: () => void;
}

function ThemeCard({ themeKey, isActive, onPress }: ThemeCardProps) {
  const preview = MAP_THEME_PREVIEWS[themeKey];
  const [bg, road, water] = preview.colors;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.themeCard, isActive && styles.themeCardActive]}
    >
      {/* Swatch: three horizontal bands */}
      <View style={[styles.swatch, { backgroundColor: bg }, isActive && styles.swatchActive]}>
        <View style={[styles.swatchRoad,  { backgroundColor: road  }]} />
        <View style={[styles.swatchWater, { backgroundColor: water }]} />
      </View>
      <Text style={[styles.themeLabel, isActive && styles.themeLabelActive]}>
        {preview.label}
      </Text>
    </Pressable>
  );
}

// ─── MapSettingsPanel ────────────────────────────────────────────────────────

export default function MapSettingsPanel({
  isVisible,
  onClose,
  theme,
  onThemeChange,
  mapType,
  onMapTypeChange,
  showPOI,
  onShowPOIChange,
  showTransit,
  onShowTransitChange,
  showTraffic,
  onShowTrafficChange,
}: MapSettingsPanelProps) {
  const { height: screenH } = useWindowDimensions();

  const translateY = useSharedValue(PANEL_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  const [isMounted, setIsMounted] = useState(false);

  // Open / close animation
  useEffect(() => {
    if (isVisible) {
      setIsMounted(true);
      backdropOpacity.value = withTiming(1, { duration: 220 });
      translateY.value = withSpring(0, { damping: 22, stiffness: 220 });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 180 });
      translateY.value = withSpring(
        PANEL_HEIGHT,
        { damping: 22, stiffness: 260 },
        (finished) => {
          'worklet';
          if (finished) runOnJS(setIsMounted)(false);
        }
      );
    }
  }, [isVisible]);

  // Swipe-down to dismiss
  const panGesture = Gesture.Pan()
    .activeOffsetY([10, 9999])
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > PANEL_HEIGHT * 0.35 || e.velocityY > 700) {
        backdropOpacity.value = withTiming(0, { duration: 160 });
        translateY.value = withSpring(PANEL_HEIGHT, { damping: 22, stiffness: 260 }, () => {
          runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 22, stiffness: 220 });
      }
    });

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!isMounted) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, backdropStyle]}
        pointerEvents={isVisible ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.sheet, panelStyle]}>
          {/* Handle + Header */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Map Settings</Text>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <X size={20} color="#4A4A4A" weight="bold" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ── Theme section ── */}
            <Text style={styles.sectionLabel}>Theme</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.themeRow}
            >
              {THEME_KEYS.map((key) => (
                <ThemeCard
                  key={key}
                  themeKey={key}
                  isActive={theme === key}
                  onPress={() => onThemeChange(key)}
                />
              ))}
            </ScrollView>

            {/* ── Map type section ── */}
            <Text style={styles.sectionLabel}>Map Type</Text>
            <View style={styles.pillRow}>
              {MAP_TYPES.map(({ key, label }) => (
                <Pressable
                  key={key}
                  onPress={() => onMapTypeChange(key)}
                  style={[styles.pill, mapType === key && styles.pillActive]}
                >
                  <Text style={[styles.pillText, mapType === key && styles.pillTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* ── Filters section ── */}
            <Text style={styles.sectionLabel}>Filters</Text>
            <View style={styles.filterCard}>
              <FilterRow
                label="Points of Interest"
                value={showPOI}
                onChange={onShowPOIChange}
              />
              <View style={styles.divider} />
              <FilterRow
                label="Transit"
                value={showTransit}
                onChange={onShowTransitChange}
              />
              <View style={styles.divider} />
              <FilterRow
                label="Traffic"
                value={showTraffic}
                onChange={onShowTrafficChange}
              />
            </View>
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// ─── FilterRow ───────────────────────────────────────────────────────────────

function FilterRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.filterRow}>
      <Text style={styles.filterLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#E6DECC', true: '#B8AB9A' }}
        thumbColor={value ? '#5C5955' : '#FFFFFF'}
        ios_backgroundColor="#E6DECC"
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.30)',
  },

  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: PANEL_HEIGHT,
    backgroundColor: '#FEFEFE',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 20,
  },

  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },

  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E6DECC',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },

  closeBtn: {
    padding: 4,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8F8F8F',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 10,
  },

  // ── Theme cards ──
  themeRow: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 4,
  },

  themeCard: {
    width: 68,
    alignItems: 'center',
    gap: 6,
  },

  themeCardActive: {},

  swatchActive: {
    borderColor: '#5C5955',
  },

  swatch: {
    width: 68,
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },

  swatchRoad: {
    position: 'absolute',
    bottom: 16,
    left: 12,
    right: 12,
    height: 8,
    borderRadius: 4,
    opacity: 0.9,
  },

  swatchWater: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 18,
    opacity: 0.85,
  },

  themeLabel: {
    fontSize: 12,
    color: '#8F8F8F',
    fontWeight: '500',
  },

  themeLabelActive: {
    color: '#5C5955',
    fontWeight: '700',
  },

  // ── Map type pills ──
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#E6DECC',
    backgroundColor: '#FEFEFE',
  },

  pillActive: {
    backgroundColor: '#5C5955',
    borderColor: '#5C5955',
  },

  pillText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4A4A4A',
  },

  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // ── Filter card ──
  filterCard: {
    backgroundColor: '#FEFEFE',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6DECC',
    overflow: 'hidden',
  },

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  filterLabel: {
    fontSize: 14,
    color: '#4A4A4A',
    fontWeight: '500',
  },

  divider: {
    height: 1,
    backgroundColor: '#E6DECC',
    marginHorizontal: 16,
  },
});
