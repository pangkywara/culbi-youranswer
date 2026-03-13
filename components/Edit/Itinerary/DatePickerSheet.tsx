import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  Platform,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Check, CalendarBlank } from 'react-native-phosphor'; // Added Calendar icon
import { Colors, Type, Space, Radius } from '@/constants/style';
import { CalendarView } from '@/components/Calendar/CalendarView'; // Your new Wix Calendar component

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.75); // Slightly taller to fit calendar
const DURATION = 300;
const EASING_OUT = Easing.out(Easing.cubic);

function formatDateFull(isoDate: string): string {
  if (!isoDate) return '';
  const d = new Date(`${isoDate}T00:00:00Z`);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric', 
    timeZone: 'UTC',
  }).format(d);
}

interface DatePickerSheetProps {
  visible: boolean;
  stopName: string;
  currentDate?: string;
  availableDates: string[];
  onSelect: (date: string | undefined) => void;
  onClose: () => void;
}

export const DatePickerSheet = ({
  visible,
  stopName,
  currentDate,
  availableDates,
  onSelect,
  onClose,
}: DatePickerSheetProps) => {
  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const [isMounted, setIsMounted] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false); // Toggle for Calendar view

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      setShowCalendar(false); // Reset to list view when opening
      backdropOpacity.value = withTiming(1, { duration: DURATION });
      translateY.value = withTiming(0, { duration: DURATION, easing: EASING_OUT });
    } else {
      backdropOpacity.value = withTiming(0, { duration: DURATION });
      translateY.value = withTiming(
        SHEET_HEIGHT,
        { duration: DURATION, easing: EASING_OUT },
        (finished) => { if (finished) runOnJS(setIsMounted)(false); }
      );
    }
  }, [visible]);

  const panGesture = useMemo(() =>
    Gesture.Pan()
      .activeOffsetX([-10, 10]) // Don't trigger pan if swiping horizontally (on calendar)
      .onUpdate((e) => {
        if (e.translationY > 0) translateY.value = e.translationY;
      })
      .onEnd((e) => {
        if (e.translationY > 100 || e.velocityY > 600) {
          translateY.value = withTiming(SHEET_HEIGHT, { duration: 200 }, () => runOnJS(onClose)());
        } else {
          translateY.value = withTiming(0, { duration: 250, easing: EASING_OUT });
        }
      }),
  [onClose]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  if (!isMounted) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.sheet, sheetStyle]}>
        <GestureDetector gesture={panGesture}>
          <View style={styles.dragZone}>
            <View style={styles.handle} />
          </View>
        </GestureDetector>

        <View style={styles.headerPadding}>
          <View style={styles.titleRow}>
             <View>
                <Text style={styles.title}>{showCalendar ? 'Pick a custom date' : 'Choose a day'}</Text>
                <Text style={styles.subtitle} numberOfLines={1}>{stopName}</Text>
             </View>
             {/* Toggle Button */}
             <TouchableOpacity 
               onPress={() => setShowCalendar(!showCalendar)}
               style={styles.calendarToggle}
             >
                <CalendarBlank size={24} color={showCalendar ? Colors.brand : Colors.textPrimary} />
             </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {showCalendar ? (
            <View style={styles.calendarWrapper}>
              <CalendarView 
                selectedDate={currentDate} 
                onDateChange={(date) => {
                  // If Wix calendar returns range "YYYY-MM-DD  →  YYYY-MM-DD"
                  // we might just want the first date for a "Stop"
                  const singleDate = date.split(' ')[0];
                  onSelect(singleDate);
                }} 
              />
              <TouchableOpacity 
                style={styles.backBtn} 
                onPress={() => setShowCalendar(false)}
              >
                <Text style={styles.backBtnText}>Back to suggestions</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.optionsList}>
              {availableDates.map((date) => (
                <TouchableOpacity 
                  key={date} 
                  style={styles.option} 
                  onPress={() => onSelect(date)}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionLeft}>
                    <View style={[styles.dot, currentDate === date && styles.dotActive]} />
                    <Text style={[styles.optionText, currentDate === date && styles.optionTextActive]}>
                      {formatDateFull(date)}
                    </Text>
                  </View>
                  {currentDate === date && <Check size={20} color={Colors.brand} weight="bold" />}
                </TouchableOpacity>
              ))}

              <TouchableOpacity 
                style={[styles.option, styles.optionLast]} 
                onPress={() => onSelect(undefined)}
                activeOpacity={0.7}
              >
                <View style={styles.optionLeft}>
                  <View style={[styles.dot, !currentDate && styles.dotActive]} />
                  <Text style={[styles.optionText, { color: Colors.textSecondary }]}>No date / TBD</Text>
                </View>
                {!currentDate && <Check size={20} color={Colors.brand} weight="bold" />}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 20 },
    }),
  },
  dragZone: { paddingVertical: Space.md, alignItems: 'center', width: '100%', zIndex: 10 },
  handle: { width: 36, height: 5, borderRadius: 2.5, backgroundColor: Colors.borderSubtle },
  headerPadding: { paddingHorizontal: Space.xxl },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  calendarToggle: {
    padding: Space.sm,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.full,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Space.xxl,
    paddingBottom: Platform.OS === 'ios' ? 60 : 40,
  },
  title: { fontSize: Type.sizeH3, fontWeight: Type.weightBold, color: Colors.textPrimary, marginBottom: Space.xxs },
  subtitle: { fontSize: Type.sizeBodySm, color: Colors.textSecondary, marginBottom: Space.md },
  optionsList: { marginTop: Space.xs },
  calendarWrapper: { marginTop: Space.sm },
  backBtn: {
    marginTop: Space.xl,
    alignItems: 'center',
    padding: Space.md,
  },
  backBtnText: {
    color: Colors.textSecondary,
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightSemibold,
    textDecorationLine: 'underline',
  },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Space.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderSubtle,
  },
  optionLast: { borderBottomWidth: 0 },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  dotActive: { backgroundColor: Colors.brand, borderColor: Colors.brand },
  optionText: { fontSize: Type.sizeBody, fontWeight: Type.weightMedium, color: Colors.textPrimary },
  optionTextActive: { fontWeight: Type.weightSemibold, color: Colors.brand },
});