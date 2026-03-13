import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Pressable, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from 'react-native-reanimated';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, CheckCircle, Gift } from 'react-native-phosphor';
import { Colors, Space, Radius, Shadows, S, Type } from '@/constants/style';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { Mission } from '../missions.types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.55;

// ─── Types ────────────────────────────────────────────────────────────────────

interface IncrementResult {
  current_count: number;
  target_count:  number;
  is_completed:  boolean;
  just_completed: boolean;
  reward_xp:     number;
  reward_badge:  string | null;
}

interface ClaimResult {
  success: boolean;
  reason?: string;
}

interface Props {
  visible: boolean;
  mission: Mission | null;
  onClose: () => void;
  /** Called after a successful start/continue/claim so the parent can refetch */
  onAction?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const MissionDetailDrawer = ({ visible, mission, onClose, onAction }: Props) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(PANEL_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const [isMounted, setIsMounted] = useState(false);

  // ── Local mission state (optimistic updates while drawer is open) ──────────
  const [actionLoading, setActionLoading] = useState(false);
  const [localCount,     setLocalCount]     = useState(0);
  const [localTarget,    setLocalTarget]    = useState(1);
  const [localCompleted, setLocalCompleted] = useState(false);
  const [localClaimed,   setLocalClaimed]   = useState(false);
  const [justCompleted,  setJustCompleted]  = useState(false);
  const [actionError,    setActionError]    = useState<string | null>(null);

  // Sync local state whenever the drawer opens for a new mission
  const prevMissionId = useRef<string | null>(null);
  useEffect(() => {
    if (mission && mission.id !== prevMissionId.current) {
      prevMissionId.current = mission.id;
      setLocalCount(mission.currentCount);
      setLocalTarget(mission.targetCount);
      setLocalCompleted(mission.isCompleted);
      setLocalClaimed(mission.rewardClaimed);
      setJustCompleted(false);
      setActionError(null);
    }
  }, [mission]);

  // ── Drawer animation ──────────────────────────────────────────────────────
  const springConfig = { damping: 20, stiffness: 150, mass: 0.8 };

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      backdropOpacity.value = withTiming(1, { duration: 300 });
      translateY.value = withSpring(0, springConfig);
    } else {
      backdropOpacity.value = withTiming(0, { duration: 250 });
      translateY.value = withSpring(PANEL_HEIGHT, springConfig, (f) => {
        if (f) runOnJS(setIsMounted)(false);
      });
    }
  }, [visible]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => { if (e.translationY > 0) translateY.value = e.translationY; })
    .onEnd((e) => {
      if (e.translationY > 100 || e.velocityY > 500) {
        translateY.value = withSpring(PANEL_HEIGHT, { ...springConfig, velocity: e.velocityY }, () =>
          runOnJS(onClose)()
        );
      } else {
        translateY.value = withSpring(0, springConfig);
      }
    });

  const animatedSheet   = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const animatedBackdrop = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  // ── Mission action handler ────────────────────────────────────────────────
  const handleAction = async () => {
    if (!mission || actionLoading) return;
    setActionError(null);
    setActionLoading(true);

    try {
      if (localCompleted && !localClaimed) {
        // ── Claim badge reward ────────────────────────────────────────────
        const { data, error } = await supabase.rpc('claim_mission_reward', {
          p_mission_id: mission.id,
        });
        if (error) throw error;

        const result = data as ClaimResult;
        if (result.success) {
          setLocalClaimed(true);
          onAction?.();
        } else {
          setActionError(result.reason ?? 'Could not claim reward');
        }
      } else if (!localCompleted) {
        // ── Increment progress (start / continue) ─────────────────────────
        const { data, error } = await supabase.rpc('increment_mission_progress', {
          p_mission_id: mission.id,
        });
        if (error) throw error;

        const result = data as IncrementResult;
        setLocalCount(result.current_count);
        setLocalTarget(result.target_count);

        if (result.just_completed) {
          setLocalCompleted(true);
          setJustCompleted(true);
          // If no badge reward, auto-mark as claimed (XP was already awarded)
          if (!result.reward_badge) setLocalClaimed(true);
        }
        onAction?.();
      }
    } catch (e: any) {
      setActionError(e?.message ?? 'Something went wrong');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Derived button state ──────────────────────────────────────────────────
  const isOngoing     = localCount > 0 && !localCompleted;
  const progressPct   = localTarget > 0 ? Math.min(localCount / localTarget, 1) : 0;
  const hasBadgeReward = mission?.reward?.includes('XP') === false;

  const btnLabel = (() => {
    if (actionLoading)               return '…';
    if (localCompleted && localClaimed)  return 'Mission Completed! ✓';
    if (localCompleted && !localClaimed) return hasBadgeReward ? 'Claim Badge Reward' : 'Completed ✓';
    if (isOngoing)                   return `Continue  ${localCount}/${localTarget}`;
    return 'Start Mission';
  })();

  const btnDisabled  = actionLoading || (localCompleted && localClaimed);
  const btnCompleted = localCompleted && localClaimed;

  // ── Gradient colours ──────────────────────────────────────────────────────
  const gradientStart = { x: 0, y: 0 };
  const gradientEnd   = { x: 1, y: 1 };

  if (!isMounted || !mission) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <GestureHandlerRootView style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        <Animated.View style={[styles.backdrop, animatedBackdrop]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.sheet, animatedSheet, { paddingBottom: insets.bottom + Space.xl }]}>
          {/* ── Drag zone ── */}
          <GestureDetector gesture={panGesture}>
            <View style={styles.dragZone}>
              <View style={styles.handle} />
              <View style={styles.header}>
                <Text style={styles.categoryTag}>{mission.category}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                  <X size={18} color={Colors.textPrimary} weight="bold" />
                </TouchableOpacity>
              </View>
            </View>
          </GestureDetector>

          {/* ── Content ── */}
          <View style={styles.content}>
            {/* Title row */}
            <View style={styles.titleRow}>
              <View style={styles.iconCircle}>
                <mission.icon size={28} color={Colors.brand} weight="duotone" />
              </View>
              <Text style={styles.title}>{mission.title}</Text>
            </View>

            <Text style={styles.description}>{mission.description}</Text>

            {/* Reward card */}
            <View style={styles.rewardCard}>
              <Gift size={20} color={Colors.brand} weight="fill" />
              <Text style={styles.rewardLabel}>Reward:</Text>
              <Text style={styles.rewardValue}>{mission.reward}</Text>
            </View>

            {/* ── Progress bar (shown when started but not completed) ── */}
            {(isOngoing || justCompleted) && (
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Progress</Text>
                  <Text style={styles.progressCount}>{localCount}/{localTarget}</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.round(progressPct * 100)}%` as any }]} />
                </View>
              </View>
            )}

            {/* ── Just completed celebration ── */}
            {justCompleted && (
              <View style={styles.celebrationRow}>
                <CheckCircle size={16} color="#4CAF50" weight="fill" />
                <Text style={styles.celebrationText}>Mission Complete! XP has been awarded.</Text>
              </View>
            )}

            {/* ── Error message ── */}
            {actionError && (
              <Text style={styles.errorText}>{actionError}</Text>
            )}

            {/* ── Action button ── */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleAction}
              disabled={btnDisabled}
              style={[styles.actionBtnBase, btnCompleted && styles.completedBtn]}
            >
              {btnCompleted ? (
                <LinearGradient
                  colors={['#4CAF50', '#4a964e']}
                  start={gradientStart}
                  end={gradientEnd}
                  style={styles.btnContent}
                >
                  {actionLoading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={S.btnPrimaryText}>{btnLabel}</Text>
                  }
                </LinearGradient>
              ) : (
                <LinearGradient
                  colors={[Colors.brand, Colors.brandSoft]}
                  start={gradientStart}
                  end={gradientEnd}
                  style={styles.btnContent}
                >
                  {actionLoading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={S.btnPrimaryText}>{btnLabel}</Text>
                  }
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:      { position: 'absolute', bottom: 0, left: 0, right: 0, height: PANEL_HEIGHT, backgroundColor: Colors.white, borderTopLeftRadius: Radius.cardLg, borderTopRightRadius: Radius.cardLg, ...Shadows.level5 },
  dragZone:   { paddingTop: 14, paddingBottom: 8 },
  handle:     { alignSelf: 'center', width: 40, height: 5, borderRadius: Radius.full, backgroundColor: Colors.surfaceMuted, marginBottom: 12 },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24 },
  categoryTag: { ...S.badge, backgroundColor: Colors.badgeAlt, color: Colors.brand, textTransform: 'uppercase', letterSpacing: 1, fontSize: 10, fontWeight: '700' },
  closeBtn:   { ...S.btnIcon, width: 32, height: 32, backgroundColor: Colors.surfaceMuted },
  content:    { paddingHorizontal: 24, paddingTop: 10 },
  titleRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  iconCircle: { width: 50, height: 50, borderRadius: 15, backgroundColor: Colors.surfaceMuted, ...S.center },
  title:      { ...S.h2, flex: 1 },
  description: { ...S.body, color: Colors.textSecondary, lineHeight: 22, marginBottom: 16 },

  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSoft,
    padding: 14,
    borderRadius: Radius.lg,
    gap: 10,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  rewardLabel: { ...S.label, marginTop: 0, color: Colors.textSecondary },
  rewardValue: { ...S.labelBold, fontSize: 14 },

  // Progress bar (shown when ongoing)
  progressSection: { marginBottom: 12 },
  progressHeader:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel:   { fontSize: Type.sizeCaption, color: Colors.textSecondary, fontWeight: Type.weightMedium as any },
  progressCount:   { fontSize: Type.sizeCaption, color: Colors.brand, fontWeight: Type.weightSemibold as any },
  progressTrack:   { height: 6, borderRadius: Radius.full, backgroundColor: Colors.surfaceMuted, overflow: 'hidden' },
  progressFill:    { height: '100%', borderRadius: Radius.full, backgroundColor: Colors.brand },

  // Celebration / error
  celebrationRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  celebrationText: { fontSize: Type.sizeCaption, color: '#4CAF50', fontWeight: Type.weightMedium as any, flex: 1 },
  errorText:       { fontSize: Type.sizeCaption, color: Colors.destructive, marginBottom: 10 },

  // Action button
  actionBtnBase: { height: 52, borderRadius: 16, overflow: 'hidden', ...Shadows.level3 },
  completedBtn:  { backgroundColor: '#4CAF50' },
  btnContent:    { ...S.fill, ...S.center, paddingVertical: 14, paddingHorizontal: Space.xxl },
});