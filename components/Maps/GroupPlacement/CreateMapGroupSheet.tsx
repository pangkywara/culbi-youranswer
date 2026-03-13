import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { Globe, Lock, MapPin, X } from "react-native-phosphor";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, Space } from "@/constants/style";
import { useMapGroups, type CreateMapGroupParams } from "@/hooks/useMapGroups";

const { height: SCREEN_H } = Dimensions.get("window");
const PANEL_HEIGHT = SCREEN_H * 0.75;
const SHEET_DURATION = 300;
const CLEAN_EASING = Easing.out(Easing.cubic);

const CATEGORIES = ["Culture", "Food", "Nature", "History", "Heritage", "Religion", "Landmark", "General"] as const;
type GroupCategory = (typeof CATEGORIES)[number];

interface Props {
  visible: boolean;
  coordinate: { latitude: number; longitude: number } | null;
  onClose: () => void;
  onGroupCreated: (groupId: string) => void;
}

export function CreateMapGroupSheet({ visible, coordinate, onClose, onGroupCreated }: Props) {
  const insets = useSafeAreaInsets();
  const nameInputRef = useRef<TextInput>(null);

  const translateY = useSharedValue(PANEL_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const [isMounted, setIsMounted] = useState(false);

  // Form state
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [category, setCategory] = useState<GroupCategory | null>(null);
  const [memberLimitText, setMemberLimitText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { createMapGroup, creating, error: hookError } = useMapGroups();

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      backdropOpacity.value = withTiming(1, { duration: SHEET_DURATION });
      translateY.value = withTiming(0, { duration: SHEET_DURATION, easing: CLEAN_EASING });
      setTimeout(() => nameInputRef.current?.focus(), 400);
    } else {
      Keyboard.dismiss();
      backdropOpacity.value = withTiming(0, { duration: SHEET_DURATION });
      translateY.value = withTiming(PANEL_HEIGHT, { duration: SHEET_DURATION, easing: CLEAN_EASING }, (fin) => {
        if (fin) runOnJS(setIsMounted)(false);
      });
    }
  }, [visible]);

  const panGesture = useMemo(() =>
    Gesture.Pan()
      .onUpdate((e) => { if (e.translationY > 0) translateY.value = e.translationY; })
      .onEnd((e) => {
        if (e.translationY > 120 || e.velocityY > 600) {
          translateY.value = withTiming(PANEL_HEIGHT, { duration: 200 }, () => runOnJS(onClose)());
        } else {
          translateY.value = withTiming(0, { duration: 250, easing: CLEAN_EASING });
        }
      }), [onClose]);

  const animatedSheet = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const animatedBackdrop = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  const handleCreate = async () => {
    if (!coordinate || creating || !groupName.trim()) return;
    setFormError(null);
    const limit = memberLimitText ? parseInt(memberLimitText, 10) : null;
    
    const groupId = await createMapGroup({
      name: groupName.trim(),
      description: groupDesc.trim() || null,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      visibility,
      category,
      memberLimit: limit,
    });
    if (groupId) { onClose(); setTimeout(() => onGroupCreated(groupId), 300); }
  };

  if (!isMounted) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, animatedBackdrop]} pointerEvents={visible ? 'auto' : 'none'}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.sheet, animatedSheet, { paddingBottom: insets.bottom + 20 }]}>
        <GestureDetector gesture={panGesture}>
          <View style={styles.dragZone}>
            <View style={styles.handle} />
            <Text style={styles.headerTitle}>Create Group</Text>
          </View>
        </GestureDetector>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* 1. Location Header */}
          {coordinate && (
            <View style={styles.locationBanner}>
              <MapPin size={16} color="#222" weight="fill" />
              <Text style={styles.locationText}>
                Pinned at {coordinate.latitude.toFixed(4)}, {coordinate.longitude.toFixed(4)}
              </Text>
            </View>
          )}

          {/* 2. Primary Details Section */}
          <Section title="Basic info">
            <View style={styles.inputCard}>
              <View style={styles.inputRow}>
                <TextInput
                  ref={nameInputRef}
                  style={styles.nameInput}
                  placeholder="Group name"
                  placeholderTextColor="#A0A0A0"
                  value={groupName}
                  onChangeText={setGroupName}
                  maxLength={50}
                />
                <Text style={styles.charCount}>{groupName.length}/50</Text>
              </View>
              <View style={styles.divider} />
              <TextInput
                style={styles.descInput}
                placeholder="Description (optional)"
                placeholderTextColor="#A0A0A0"
                value={groupDesc}
                onChangeText={setGroupDesc}
                multiline
                maxLength={200}
              />
            </View>
          </Section>

          {/* 3. Privacy Toggle */}
          <Section title="Visibility">
            <View style={styles.pillContainer}>
              <Pressable
                style={[styles.pill, visibility === 'public' && styles.activePill]}
                onPress={() => setVisibility('public')}
              >
                <Globe size={16} color={visibility === 'public' ? '#FFF' : '#222'} weight="bold" />
                <Text style={[styles.pillText, visibility === 'public' && styles.activePillText]}>Public</Text>
              </Pressable>
              <Pressable
                style={[styles.pill, visibility === 'private' && styles.activePill]}
                onPress={() => setVisibility('private')}
              >
                <Lock size={16} color={visibility === 'private' ? '#FFF' : '#222'} weight="bold" />
                <Text style={[styles.pillText, visibility === 'private' && styles.activePillText]}>Private</Text>
              </Pressable>
            </View>
          </Section>

          {/* 4. Category selection */}
          <Section title="Category">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(category === cat ? null : cat)}
                  style={[styles.catChip, category === cat && styles.activeCatChip]}
                >
                  <Text style={[styles.catText, category === cat && styles.activeCatText]}>{cat}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Section>

          {/* 5. Limitations */}
          <Section title="Settings" isLast>
            <View style={styles.inputCard}>
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Member Limit</Text>
                <TextInput
                  style={styles.limitInput}
                  placeholder="Unlimited"
                  placeholderTextColor="#A0A0A0"
                  value={memberLimitText}
                  onChangeText={setMemberLimitText}
                  keyboardType="number-pad"
                  textAlign="right"
                />
              </View>
            </View>
          </Section>

          {/* Footer CTA */}
          <View style={styles.footer}>
            {(formError || hookError) && <Text style={styles.errorText}>{formError || hookError}</Text>}
            <TouchableOpacity
              style={[styles.ctaBtn, (!groupName.trim() || creating) && styles.ctaDisabled]}
              onPress={handleCreate}
              disabled={!groupName.trim() || creating}
            >
              {creating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.ctaText}>Create Group</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const Section = ({ title, children, isLast }: any) => (
  <View style={[styles.section, !isLast && styles.sectionBorder]}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: PANEL_HEIGHT, backgroundColor: '#FFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', marginBottom: 20,
  },
  dragZone: { paddingTop: 12, paddingBottom: 10, alignItems: 'center' },
  handle: { width: 32, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', marginBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#222' },
  scroll: { paddingBottom: 40 },
  section: { paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#8F8F8F', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 },
  sectionBorder: { marginBottom: 4 },

  locationBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F0F0',
    marginHorizontal: 20, padding: 12, borderRadius: 14, gap: 8, marginTop: 10
  },
  locationText: { fontSize: 14, fontWeight: '600', color: '#222' },

  inputCard: { backgroundColor: '#F7F7F7', borderRadius: 16, paddingHorizontal: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  nameInput: { flex: 1, fontSize: 16, fontWeight: '600', color: '#222', padding: 0 },
  charCount: { fontSize: 12, color: '#A0A0A0', marginLeft: 8 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E5E5' },
  descInput: { fontSize: 15, color: '#222', paddingVertical: 14, minHeight: 80, textAlignVertical: 'top' },

  pillContainer: { flexDirection: 'row', gap: 10 },
  pill: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: '#E5E5E5', backgroundColor: '#FFF' 
  },
  activePill: { backgroundColor: '#222', borderColor: '#222' },
  pillText: { fontSize: 15, fontWeight: '600', color: '#222' },
  activePillText: { color: '#FFF' },

  categoryRow: { gap: 8 },
  catChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: '#F7F7F7', borderWidth: 1, borderColor: '#F7F7F7' },
  activeCatChip: { backgroundColor: '#FFF', borderColor: '#222' },
  catText: { fontSize: 14, fontWeight: '600', color: '#8F8F8F' },
  activeCatText: { color: '#222' },

  filterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  filterLabel: { fontSize: 16, color: '#222', fontWeight: '500' },
  limitInput: { flex: 1, fontSize: 16, fontWeight: '600', color: '#222', padding: 0 },

  footer: { paddingHorizontal: 20, marginTop: 30,  },
  errorText: { color: Colors.destructive, fontSize: 13, textAlign: 'center', marginBottom: 12, fontWeight: '500' },
  ctaBtn: { backgroundColor: '#222', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctaDisabled: { opacity: 0.3 },
  ctaText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});