import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMapGroups, type CreateMapGroupParams } from '@/hooks/useMapGroups';
import { CategoryChips, type GroupCategory } from './CategoryChips';
import { CoordBadge } from './CoordBadge';
import { VisibilityToggle } from './VisibilityToggle';

/* ───────────────── CONFIG ───────────────── */
const SHEET_DURATION = 280;
const PANEL_HEIGHT = 720; // Adjusted for form content
const CLEAN_EASING = Easing.out(Easing.cubic);

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

  // Form State
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
      translateY.value = withTiming(PANEL_HEIGHT, { duration: SHEET_DURATION, easing: CLEAN_EASING }, (finished) => {
        if (finished) runOnJS(setIsMounted)(false);
      });
    }
  }, [visible]);

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
  [onClose]);

  const animatedSheet = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const animatedBackdrop = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  const handleCreate = useCallback(async () => {
    if (!coordinate || creating) return;
    const name = groupName.trim();
    if (!name) { setFormError("Group name is required"); return; }
    
    setFormError(null);
    const params: CreateMapGroupParams = {
      name,
      description: groupDesc.trim() || null,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      visibility,
      category: category ?? null,
      memberLimit: memberLimitText ? parseInt(memberLimitText, 10) : null,
    };

    const groupId = await createMapGroup(params);
    if (groupId) {
      onClose();
      setTimeout(() => onGroupCreated(groupId), 300);
    }
  }, [coordinate, groupName, groupDesc, visibility, category, memberLimitText, creating, createMapGroup, onClose, onGroupCreated]);

  if (!isMounted) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, animatedBackdrop]} pointerEvents={visible ? 'auto' : 'none'}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.sheet, animatedSheet, { paddingBottom: insets.bottom }]}>
        <GestureDetector gesture={panGesture}>
          <View style={styles.dragZone}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.titlebig}>Create Group</Text>
            </View>
          </View>
        </GestureDetector>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          
          <Section title="Location details">
             {coordinate && <CoordBadge coordinate={coordinate} />}
          </Section>

          <Section title="Basic info">
            <View style={styles.filterCard}>
              <View style={styles.inputRow}>
                <TextInput
                  ref={nameInputRef}
                  style={styles.textInput}
                  placeholder="Group name"
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholderTextColor="#8F8F8F"
                />
              </View>
              <View style={[styles.inputRow, { borderBottomWidth: 0, height: 80 }]}>
                <TextInput
                  style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 12 }]}
                  placeholder="What's this group about? (optional)"
                  value={groupDesc}
                  onChangeText={setGroupDesc}
                  multiline
                  placeholderTextColor="#8F8F8F"
                />
              </View>
            </View>
          </Section>

          <Section title="Preferences">
            <Text style={styles.subLabel}>Visibility</Text>
            <VisibilityToggle value={visibility} onChange={setVisibility} />
            
            <Text style={[styles.subLabel, { marginTop: 16 }]}>Category</Text>
            <CategoryChips selected={category} onSelect={setCategory} />
          </Section>

          <Section title="Settings" isLast>
             <View style={styles.filterCard}>
               <View style={[styles.inputRow, { borderBottomWidth: 0 }]}>
                 <Text style={styles.rowLabel}>Member Limit</Text>
                 <TextInput
                    style={styles.limitInput}
                    placeholder="Unlimited"
                    value={memberLimitText}
                    onChangeText={setMemberLimitText}
                    keyboardType="number-pad"
                    placeholderTextColor="#8F8F8F"
                  />
               </View>
             </View>
             
             {(formError || hookError) && (
               <Text style={styles.errorText}>{formError || hookError}</Text>
             )}
          </Section>

          <View style={styles.footer}>
            <Pressable 
              style={[styles.ctaBtn, (!groupName.trim() || creating) && styles.ctaDisabled]} 
              onPress={handleCreate}
              disabled={!groupName.trim() || creating}
            >
              {creating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.ctaText}>Create Group</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const Section = React.memo(({ title, children, isLast }: any) => (
  <View style={[styles.section, !isLast && styles.sectionBorder]}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
));

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: PANEL_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  dragZone: { paddingTop: 12, paddingBottom: 10 },
  handle: { alignSelf: 'center', width: 32, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', marginBottom: 12 },
  header: { alignItems: 'center', paddingBottom: 14 },
  titlebig: { fontSize: 22, fontWeight: '700', color: '#222222' },
  scroll: { paddingBottom: 40 },
  section: { paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#222', marginBottom: 12 },
  sectionBorder: { borderBottomWidth: 0 },
  subLabel: { fontSize: 14, fontWeight: '500', color: '#717171', marginBottom: 8 },
  
  /* Filter Card Aesthetic */
  filterCard: { backgroundColor: '#F7F7F7', borderRadius: 14, paddingHorizontal: 16 },
  inputRow: { height: 56, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E5E5' },
  textInput: { fontSize: 16, color: '#222', flex: 1 },
  rowLabel: { fontSize: 16, color: '#222' },
  limitInput: { fontSize: 16, color: '#222', textAlign: 'right', flex: 1 },

  footer: { paddingHorizontal: 20, marginTop: 24 },
  ctaBtn: { 
    backgroundColor: '#222', 
    height: 54, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
    flexDirection: 'row'
  },
  ctaDisabled: { backgroundColor: '#E5E5E5' },
  ctaText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  errorText: { color: '#FF385C', fontSize: 14, marginTop: 12, textAlign: 'center' }
});