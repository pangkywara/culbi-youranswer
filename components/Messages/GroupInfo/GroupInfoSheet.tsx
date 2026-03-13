/**
 * components/Messages/GroupInfo/GroupInfoSheet.tsx
 * ─────────────────────────────────────────────────
 * Root container (parent) for the group info bottom-sheet.
 *
 * Responsibilities:
 *   • Animated sheet presentation with spring + pan-to-dismiss
 *   • Backdrop with tap-to-close
 *   • View-mode routing → InfoView | EditView | AddMemberView
 *
 * All data + mutation logic lives in the child views.
 */

import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { GroupConversation, GroupMember } from '@/types/chat';

import { AddMemberView } from './AddMemberView';
import { EditView } from './EditView';
import { InfoView } from './InfoView';
import { SCREEN_H, styles } from './styles';

type ViewMode = 'info' | 'edit' | 'addMember';

export interface GroupInfoSheetProps {
  visible: boolean;
  group: GroupConversation | null;
  members: GroupMember[];
  currentUserId: string;
  onClose: () => void;
  /** Called after any successful mutation so the parent can re-fetch. */
  onRefresh?: () => Promise<void>;
}

export function GroupInfoSheet({
  visible,
  group,
  members,
  currentUserId,
  onClose,
  onRefresh,
}: GroupInfoSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_H);
  const backdropOpacity = useSharedValue(0);
  const [isMounted, setIsMounted] = useState(false);
  const [mode, setMode] = useState<ViewMode>('info');

  const springConfig = { damping: 22, stiffness: 180, mass: 0.9 };

  const isAdmin = members.some(
    (m) => m.userId === currentUserId && m.role === 'admin',
  );
  const adminCount = members.filter((m) => m.role === 'admin').length;

  // Reset to info mode whenever the sheet opens / closes
  useEffect(() => {
    if (visible) {
      setMode('info');
      setIsMounted(true);
      backdropOpacity.value = withTiming(1, { duration: 300 });
      translateY.value = withSpring(0, springConfig);
    } else {
      backdropOpacity.value = withTiming(0, { duration: 250 });
      translateY.value = withSpring(SCREEN_H, springConfig, (finished) => {
        if (finished) runOnJS(setIsMounted)(false);
      });
    }
  }, [visible]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 600) {
        translateY.value = withSpring(SCREEN_H, { ...springConfig, velocity: e.velocityY }, () =>
          runOnJS(onClose)(),
        );
      } else {
        translateY.value = withSpring(0, springConfig);
      }
    });

  const animatedSheet = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const animatedBackdrop = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  if (!isMounted) return null;

  // Only allow pan-dismiss in info mode; prevent it while typing
  const activePanGesture = mode === 'info' ? panGesture : Gesture.Pan();

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <GestureHandlerRootView style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, animatedBackdrop]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            animatedSheet,
            { paddingBottom: insets.bottom },
          ]}
        >
          {/* Drag handle */}
          <GestureDetector gesture={activePanGesture}>
            <View style={styles.dragZone}>
              <View style={styles.handle} />
            </View>
          </GestureDetector>

          {/* ── View routing ─────────────────────────────────────────────── */}
          {mode === 'info' && (
            <InfoView
              group={group}
              members={members}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              adminCount={adminCount}
              onClose={onClose}
              onEdit={() => setMode('edit')}
              onAddMember={() => setMode('addMember')}
              onRefresh={onRefresh}
            />
          )}
          {mode === 'edit' && group && (
            <EditView
              group={group}
              onBack={() => setMode('info')}
              onRefresh={onRefresh}
            />
          )}
          {mode === 'addMember' && group && (
            <AddMemberView
              groupId={group.id}
              existingMemberIds={members.map((m) => m.userId)}
              onBack={() => setMode('info')}
              onRefresh={onRefresh}
            />
          )}
        </Animated.View>
      </GestureHandlerRootView>
    </View>
  );
}
