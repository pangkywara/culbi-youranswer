/**
 * components/Messages/Bridge/AddPersonModal.tsx
 *
 * Re-engineered with Reanimated v3 and Gesture Handler for a smooth 
 * drawer experience matching the MissionDetailDrawer style.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { CaretRight, MagnifyingGlass, UserPlus, UsersThree, X } from 'react-native-phosphor';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Shadows, Space, Type } from '@/constants/style';
import { useUserSearch } from '@/hooks/useUserSearch';
import { supabase } from '@/lib/supabase';
import type { UserSearchResult } from '@/types/database';
import LottieView from 'lottie-react-native';
import AddPeoplesAnimation from '@/assets/lottie-assets/add-peoples.json';

const { height: SCREEN_H } = Dimensions.get('window');
const PANEL_HEIGHT = SCREEN_H * 0.85; // Taller for search results

interface Props {
  visible: boolean;
  onClose: () => void;
  onConversationReady: (conversationId: string) => void;
  /** Called when the user taps "New Group" to switch to group creation. */
  onNewGroup?: () => void;
}

export function AddPersonModal({ visible, onClose, onConversationReady, onNewGroup }: Props) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  // ── Animation State ────────────────────────────────────────────────────────
  const translateY = useSharedValue(SCREEN_H);
  const backdropOpacity = useSharedValue(0);
  const [isMounted, setIsMounted] = useState(false);

  // ── Logic State ────────────────────────────────────────────────────────────
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const { query, results, loading, error, setQuery, clear } = useUserSearch();

  // ── Sync Visibility ────────────────────────────────────────────────────────
  const springConfig = { damping: 22, stiffness: 180, mass: 0.9 };

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      backdropOpacity.value = withTiming(1, { duration: 300 });
      translateY.value = withSpring(0, springConfig);
      // Auto-focus the search input after the sheet settles
      const timer = setTimeout(() => inputRef.current?.focus(), 400);
      return () => clearTimeout(timer);
    } else {
      Keyboard.dismiss();
      backdropOpacity.value = withTiming(0, { duration: 250 });
      translateY.value = withSpring(SCREEN_H, springConfig, (finished) => {
        if (finished) {
          runOnJS(setIsMounted)(false);
          runOnJS(clear)();
          runOnJS(setConnectError)(null);
        }
      });
    }
  }, [visible]);

  // ── Gesture Handler ────────────────────────────────────────────────────────
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 600) {
        translateY.value = withSpring(SCREEN_H, { ...springConfig, velocity: e.velocityY }, () => {
          runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0, springConfig);
      }
    });

  const animatedSheet = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedBackdrop = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleSelect = useCallback(
    async (user: UserSearchResult) => {
      if (connecting) return;
      setConnecting(user.id);
      setConnectError(null);
      Keyboard.dismiss();

      try {
        const { data, error: rpcErr } = await supabase.rpc(
          'get_or_create_direct_conversation',
          { other_user_id: user.id },
        );
        if (rpcErr) throw rpcErr;

        const conversationId = data as string;
        onClose();
        // Wait for sheet to finish closing before navigation
        setTimeout(() => onConversationReady(conversationId), 300);
      } catch (e: any) {
        setConnectError(e?.message ?? 'Could not open conversation');
      } finally {
        setConnecting(null);
      }
    },
    [connecting, onClose, onConversationReady],
  );

  if (!isMounted) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <GestureHandlerRootView style={StyleSheet.absoluteFillObject} pointerEvents="box-none">

        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, animatedBackdrop]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheet,
              animatedSheet,
              { paddingBottom: insets.bottom + Space.xl },
            ]}
          >
            {/* Drag Zone */}
            <GestureDetector gesture={panGesture}>
              <View style={styles.dragZone}>
                <View style={styles.handle} />
                <View style={styles.sheetHeader}>
                  <UserPlus size={20} color={Colors.brand} weight="bold" />
                  <Text style={styles.sheetTitle}>New Message</Text>
                  <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <X size={18} color={Colors.textPrimary} weight="bold" />
                  </TouchableOpacity>
                </View>
              </View>
            </GestureDetector>

            {/* Search Input */}
            <View style={styles.inputRow}>
              <MagnifyingGlass size={18} color={Colors.textSecondary} weight="bold" />
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Search by username or name…"
                placeholderTextColor={Colors.textTertiary}
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
                returnKeyType="search"
              />
            </View>

            {/* Results List */}
            <View style={styles.resultList}>
              {/* New Group quick-action — visible when the search bar is empty */}
              {query.length === 0 && onNewGroup && (
                <TouchableOpacity
                  style={styles.newGroupRow}
                  onPress={onNewGroup}
                  activeOpacity={0.7}
                >
                  <View style={styles.newGroupIcon}>
                    <UsersThree size={20} color={Colors.brand} weight="bold" />
                  </View>
                  <Text style={styles.newGroupLabel}>New Group</Text>
                  <CaretRight size={16} color={Colors.textSecondary} weight="bold" />
                </TouchableOpacity>
              )}
              {loading && (
                <View style={styles.centeredRow}>
                  <ActivityIndicator color={Colors.brand} />
                </View>
              )}

              {!loading && (error || connectError) && (
                <Text style={styles.errorText}>{error || connectError}</Text>
              )}

              {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
                <Text style={styles.emptyText}>No users found for "{query.trim()}"</Text>
              )}

              {!loading && results.map((user) => (
                <UserResultRow
                  key={user.id}
                  user={user}
                  connecting={connecting === user.id}
                  onPress={() => handleSelect(user)}
                />
              ))}

              {query.trim().length < 2 && query.length > 0 && (
                <Text style={styles.hintText}>Type at least 2 characters</Text>
              )}

              {query.length === 0 && (
                <View style={styles.emptyState}>
                  <LottieView
                    source={AddPeoplesAnimation}
                    autoPlay
                    loop={false} // Set to true if you want it to keep moving
                    style={styles.lottieIcon}
                  />
                  <Text style={styles.emptyStateText}>
                    Search for a friend{'\n'}to start a conversation
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </View>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

const UserResultRow = React.memo(({ user, connecting, onPress }: any) => (
  <TouchableOpacity
    style={styles.userRow}
    onPress={onPress}
    activeOpacity={0.7}
    disabled={connecting}
  >
    {user.avatar_url ? (
      <Image source={{ uri: user.avatar_url }} style={styles.userAvatar} />
    ) : (
      <View style={[styles.userAvatar, styles.userAvatarFallback]}>
        <Text style={styles.userAvatarText}>
          {(user.full_name ?? user.username ?? '?').charAt(0).toUpperCase()}
        </Text>
      </View>
    )}

    <View style={styles.userInfo}>
      <Text style={styles.userName} numberOfLines={1}>
        {user.full_name ?? user.username ?? 'Unknown'}
      </Text>
      {user.username && (
        <Text style={styles.userUsername} numberOfLines={1}>
          @{user.username}
        </Text>
      )}
    </View>

    {connecting ? (
      <ActivityIndicator size="small" color={Colors.brand} />
    ) : (
      <View style={styles.userAdd}>
        <UserPlus size={16} color={Colors.brand} weight="bold" />
      </View>
    )}
  </TouchableOpacity>
));

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: PANEL_HEIGHT,
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.cardLg,
    borderTopRightRadius: Radius.cardLg,
    ...Shadows.level5,
  },
  lottieIcon: {
    width: 120, 
    height: 120,
    marginBottom: 10,
  },
  dragZone: {
    paddingTop: 14,
    paddingBottom: 4,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceMuted,
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space.xxl,
    paddingVertical: Space.sm,
    gap: Space.sm,
  },
  sheetTitle: {
    flex: 1,
    fontSize: Type.sizeH3,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Space.xxl,
    marginTop: Space.md,
    marginBottom: Space.lg,
    paddingHorizontal: Space.lg,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfacePale,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    gap: Space.sm,
  },
  input: {
    flex: 1,
    fontSize: Type.sizeBody,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  resultList: {
    flex: 1,
    paddingHorizontal: Space.xxl,
  },
  centeredRow: {
    alignItems: 'center',
    paddingVertical: Space.xxl,
  },
  errorText: {
    textAlign: 'center',
    color: Colors.destructive,
    fontSize: Type.sizeBodySm,
    marginVertical: Space.md,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: Type.sizeBodySm,
    marginTop: Space.xxl,
  },
  hintText: {
    textAlign: 'center',
    color: Colors.textTertiary,
    fontSize: Type.sizeCaption,
    marginTop: Space.lg,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Space.xxxl,
    gap: Space.lg,
  },
  emptyStateText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: Type.sizeBody,
    lineHeight: 22,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Space.lg,
    gap: Space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.border,
  },
  userAvatarFallback: {
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: Type.sizeH3,
    fontWeight: Type.weightBold,
    color: Colors.textPrimary,
  },
  userInfo: { flex: 1 },
  userName: {
    fontSize: Type.sizeBody,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  userUsername: {
    fontSize: Type.sizeCaption,
    color: Colors.textSecondary,
  },
  userAdd: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.badgeAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Space.lg,
    gap: Space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
    marginBottom: Space.sm,
  },
  newGroupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.badgeAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newGroupLabel: {
    flex: 1,
    fontSize: Type.sizeBody,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
  },
});