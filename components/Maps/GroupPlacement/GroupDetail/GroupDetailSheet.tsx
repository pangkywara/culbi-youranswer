import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Crown, Lock, MapPin, UsersThree } from "react-native-phosphor";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Colors, S } from "@/constants/style";
import type { MapGroup } from "@/hooks/useMapGroups";
import { supabase } from "@/lib/supabase";

import { BadgeRow } from "./BadgeRow";
import { GroupDetailFooter } from "./GroupDetailFooter";
import { OwnerCard, type OwnerProfile } from "./OwnerCard";
import {
  CATEGORY_COLORS,
  DURATION,
  EASING_LINEAR,
  EASING_OUT,
  SHEET_HEIGHT,
  styles,
} from "./styles";

export interface GroupDetailSheetProps {
  isVisible: boolean;
  group: MapGroup | null;
  currentUserId: string;
  onClose: () => void;
  /** Called after the user successfully joins — parent can refresh markers */
  onJoined?: (groupId: string) => void;
  /** Navigate into the group chat after joining */
  onOpenChat?: (groupId: string) => void;
}

export const GroupDetailSheet = memo(function GroupDetailSheet({
  isVisible,
  group,
  currentUserId,
  onClose,
  onJoined,
  onOpenChat,
}: GroupDetailSheetProps) {
  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const [isMounted, setIsMounted] = useState(false);
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [checkingMembership, setCheckingMembership] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // ── Sheet animation lifecycle ─────────────────────────────────────────────
  useEffect(() => {
    if (isVisible) {
      setIsMounted(true);
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
  }, [isVisible]);

  // ── Fetching Logic (Owner & Membership) ──────────────────────────────────
  useEffect(() => {
    if (!group || !isVisible) return;
    let cancelled = false;

    (async () => {
      setOwner(null);
      setCheckingMembership(true);
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .eq("id", group.createdBy)
          .single();

        if (!cancelled && profile) {
          setOwner({
            id: profile.id,
            displayName: profile.full_name ?? profile.username ?? "Explorer",
            avatarUrl: profile.avatar_url ?? null,
            username: profile.username,
          });
        }

        if (currentUserId) {
          const { count } = await supabase
            .from("group_members")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id)
            .eq("user_id", currentUserId);
          if (!cancelled) setIsMember((count ?? 0) > 0);
        }
      } finally {
        if (!cancelled) setCheckingMembership(false);
      }
    })();
    return () => { cancelled = true; };
  }, [group?.id, isVisible, currentUserId]);

  // ── Swipe-down gesture ────────────────────────────────────────────────────
  const panGesture = useMemo(() =>
    Gesture.Pan()
      .onUpdate((e) => {
        if (e.translationY > 0) translateY.value = e.translationY;
      })
      .onEnd((e) => {
        if (e.translationY > 110 || e.velocityY > 600) {
          translateY.value = withTiming(SHEET_HEIGHT, { duration: 220 }, () => runOnJS(onClose)());
        } else {
          translateY.value = withTiming(0, { duration: 260, easing: EASING_OUT });
        }
      }),
  [onClose]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  if (!isMounted || !group) return null;

  const accentColor = (group.category && CATEGORY_COLORS[group.category]) ?? Colors.brand;
  const isOwner = group.createdBy === currentUserId;
  const alreadyIn = isMember || isOwner;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.sheet, sheetStyle]}>
        {/* Fixed Drag Handle (Gesture only active here to avoid conflict with ScrollView) */}
        <GestureDetector gesture={panGesture}>
          <View style={styles.dragZone}>
            <View style={styles.handle} />
          </View>
        </GestureDetector>

        {/* Scrollable Content */}
        <ScrollView
          style={S.fill}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Header Visual */}
          <View style={[styles.accentBar, { backgroundColor: accentColor }]}>
            <View style={styles.accentBarInner}>
              <UsersThree size={28} color="#fff" weight="fill" />
              {group.visibility === "private" && (
                <View style={styles.lockBadge}>
                  <Lock size={10} color="#fff" weight="fill" />
                </View>
              )}
            </View>
          </View>

          {/* Group Content */}
          <View style={styles.nameSection}>
            <Text style={styles.groupName}>{group.name}</Text>
            <BadgeRow
              visibility={group.visibility as "public" | "private"}
              category={group.category}
              memberCount={group.memberCount}
              memberLimit={group.memberLimit}
              accentColor={accentColor}
            />
          </View>

          {group.description && (
            <View style={styles.descSection}>
              <Text style={styles.descText}>{group.description}</Text>
            </View>
          )}

          <View style={styles.metaRow}>
            <MapPin size={14} color={Colors.textTertiary} weight="fill" />
            <Text style={styles.metaText}>
              {group.latitude.toFixed(4)}, {group.longitude.toFixed(4)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.sectionHeader}>
            <Crown size={14} color={accentColor} weight="fill" />
            <Text style={[styles.sectionTitle, { color: accentColor }]}>Group Owner</Text>
          </View>

          <OwnerCard owner={owner} isOwner={isOwner} accentColor={accentColor} />
          
          {/* Extra padding to prevent content being hidden by footer */}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Fixed Footer */}
        <GroupDetailFooter
          checkingMembership={checkingMembership}
          alreadyIn={alreadyIn}
          isOwner={isOwner}
          canJoin={group.visibility === "public" && !alreadyIn && (group.memberLimit ? group.memberCount < group.memberLimit : true)}
          isFull={group.memberLimit != null && group.memberCount >= group.memberLimit}
          joining={joining}
          joined={joined}
          joinError={joinError}
          accentColor={accentColor}
          onJoin={async () => {
            if (!group || !currentUserId || joining) return;
            setJoining(true);
            setJoinError(null);
            try {
              const { error: err } = await supabase
                .from("group_members")
                .insert({ group_id: group.id, user_id: currentUserId, role: "member" });
              if (err) throw err;
              setJoined(true);
              setIsMember(true);
              onJoined?.(group.id);
            } catch (e: any) {
              setJoinError(e?.message ?? "Failed to join group");
            } finally {
              setJoining(false);
            }
          }}
          onOpenChat={() => { onClose(); onOpenChat?.(group.id); }}
        />
      </Animated.View>
    </View>
  );
});