import { Image } from "expo-image";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import {
  CaretRight,
  CheckCircle,
  Crown,
  Globe,
  Lock,
  MapPin,
  Users,
} from "react-native-phosphor";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/style";
import type { MapGroup } from "@/hooks/useMapGroups";
import { supabase } from "@/lib/supabase";

// ─── Config (Synchronized with POIDetailSheet) ───────────────────────────────

const { height: SCREEN_H } = Dimensions.get("window");
const SHEET_HEIGHT  = Math.round(SCREEN_H * 0.60); // Matches reference
const DURATION      = 300;
const EASING_OUT    = Easing.out(Easing.cubic);
const EASING_LINEAR = Easing.linear;

interface OwnerProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  username: string | null;
}

interface GroupDetailSheetProps {
  isVisible: boolean;
  group: MapGroup | null;
  currentUserId: string;
  onClose: () => void;
  onJoined?: (groupId: string) => void;
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
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const [isMounted, setIsMounted] = useState(false);
  
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  // ── Animation lifecycle (Synchronized) ────────────────────────────────────
  useEffect(() => {
    if (isVisible) {
      setIsMounted(true);
      setJoined(false);
      backdropOpacity.value = withTiming(1, { duration: DURATION });
      translateY.value = withTiming(0, { duration: DURATION, easing: EASING_OUT });
    } else {
      backdropOpacity.value = withTiming(0, { duration: DURATION });
      translateY.value = withTiming(
        SHEET_HEIGHT, 
        { duration: DURATION, easing: EASING_OUT }, 
        (fin) => {
          if (fin) runOnJS(setIsMounted)(false);
        }
      );
    }
  }, [isVisible]);

  // ── Data Fetching ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!group || !isVisible) return;
    (async () => {
      const { data: profile } = await supabase.from("profiles").select("id, full_name, username, avatar_url").eq("id", group.createdBy).single();
      if (profile) {
        setOwner({
          id: profile.id,
          displayName: profile.full_name ?? profile.username ?? "Explorer",
          avatarUrl: profile.avatar_url ?? null,
          username: profile.username,
        });
      }
      if (currentUserId) {
        const { count } = await supabase.from("group_members").select("*", { count: "exact", head: true }).eq("group_id", group.id).eq("user_id", currentUserId);
        setIsMember((count ?? 0) > 0);
      }
    })();
  }, [group?.id, isVisible, currentUserId]);

  // ── Swipe-down-to-dismiss gesture (Synchronized) ───────────────────────────
  const panGesture = useMemo(() => Gesture.Pan()
    .onUpdate((e) => { 
      if (e.translationY > 0) translateY.value = e.translationY; 
    })
    .onEnd((e) => {
      // Logic thresholds matched exactly to POIDetailSheet
      if (e.translationY > 110 || e.velocityY > 600) {
        translateY.value = withTiming(
          SHEET_HEIGHT, 
          { duration: 220, easing: EASING_LINEAR }, 
          () => runOnJS(onClose)()
        );
      } else {
        translateY.value = withTiming(0, { duration: 260, easing: EASING_OUT });
      }
    }), [onClose]);

  const sheetStyle = useAnimatedStyle(() => ({ 
    transform: [{ translateY: translateY.value }] 
  }));
  
  const backdropStyle = useAnimatedStyle(() => ({ 
    opacity: backdropOpacity.value 
  }));

  const handleJoin = async () => {
    if (!group || !currentUserId || joining || isMember) return;
    setJoining(true);
    const { error } = await supabase.from("group_members").insert({ group_id: group.id, user_id: currentUserId, role: "member" });
    setJoining(false);
    if (!error) {
      setJoined(true);
      setIsMember(true);
      onJoined?.(group.id);
    }
  };

  if (!isMounted || !group) return null;

  const isFull = group.memberLimit != null && group.memberCount >= group.memberLimit;
  const isOwner = group.createdBy === currentUserId;
  const alreadyIn = isMember || isOwner;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {/* Scrim matched to POI opacity */}
      <Animated.View 
        style={[styles.backdrop, backdropStyle]} 
        pointerEvents={isVisible ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.sheet, sheetStyle]}>
        <GestureDetector gesture={panGesture}>
          <View style={styles.dragZone}>
            <View style={styles.handle} />
          </View>
        </GestureDetector>

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
          bounces={false} // Matched to reference
        >
          <View style={styles.header}>
            <Text style={styles.groupName}>{group.name}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: group.visibility === 'public' ? '#E8F5E9' : '#FFF3E0' }]}>
                {group.visibility === 'public' ? <Globe size={12} color="#2E7D32" weight="bold" /> : <Lock size={12} color="#E65100" weight="bold" />}
                <Text style={[styles.badgeText, { color: group.visibility === 'public' ? '#2E7D32' : '#E65100' }]}>
                  {group.visibility.toUpperCase()}
                </Text>
              </View>
              {group.category && (
                <View style={styles.badge}>
                  <Text style={[styles.badgeText, { color: '#666' }]}>{group.category.toUpperCase()}</Text>
                </View>
              )}
            </View>
          </View>

          {group.description && (
            <Section title="About">
              <Text style={styles.descText}>{group.description}</Text>
            </Section>
          )}

          <Section title="Group details">
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Users size={18} color="#222" weight="bold" />
                <Text style={styles.infoLabel}>Members</Text>
                <Text style={styles.infoValue}>{group.memberCount}{group.memberLimit ? ` / ${group.memberLimit}` : ''}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <MapPin size={18} color="#222" weight="bold" />
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{group.latitude.toFixed(4)}, {group.longitude.toFixed(4)}</Text>
              </View>
            </View>
          </Section>

          <Section title="Created by" isLast>
            <Pressable style={styles.ownerCard}>
              {owner?.avatarUrl ? (
                <Image source={{ uri: owner.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}><Text style={styles.avatarInitial}>{owner?.displayName[0]}</Text></View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.ownerName}>{owner?.displayName}</Text>
                <Text style={styles.ownerSub}>Group Owner</Text>
              </View>
              {isOwner && <View style={styles.youBadge}><Text style={styles.youText}>YOU</Text></View>}
              <CaretRight size={16} color="#A0A0A0" weight="bold" />
            </Pressable>
          </Section>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 20 : 10) }]}>
          {alreadyIn ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => { onClose(); onOpenChat?.(group.id); }}>
              <Text style={styles.primaryBtnText}>Open Group</Text>
            </TouchableOpacity>
          ) : isFull ? (
            <View style={[styles.primaryBtn, styles.disabledBtn]}>
              <Text style={styles.primaryBtnText}>Group Full</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleJoin} disabled={joining}>
              {joining ? <ActivityIndicator color="#FFF" /> : (
                <Text style={styles.primaryBtnText}>{joined ? "Joined Successfully" : "Join Group"}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </View>
  );
});

const Section = ({ title, children, isLast }: any) => (
  <View style={[styles.section, !isLast && styles.sectionBorder]}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  backdrop: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(0,0,0,0.30)' 
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: SHEET_HEIGHT, backgroundColor: '#FFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden',
    marginBottom: Platform.OS === 'ios' ? 40 : 60,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.10, shadowRadius: 20 },
      android: { elevation: 24 },
    }),
  },
  dragZone: { paddingTop: 12, paddingBottom: 12, alignItems: 'center', backgroundColor: '#FFF' },
  handle: { width: 36, height: 5, borderRadius: 2.5, backgroundColor: '#E0E0E0' },
  scrollContent: { paddingBottom: 40 },
  header: { paddingHorizontal: 24, paddingTop: 10, marginBottom: 20 },
  groupName: { fontSize: 24, fontWeight: '700', color: '#222', letterSpacing: -0.5, marginBottom: 12 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#F0F0F0' },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  section: { paddingHorizontal: 24, paddingTop: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#8F8F8F', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  sectionBorder: { marginBottom: 12 },
  descText: { fontSize: 15, color: '#444', lineHeight: 22 },

  infoCard: { backgroundColor: '#F7F7F7', borderRadius: 16, paddingHorizontal: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  infoLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: '#666' },
  infoValue: { fontSize: 15, fontWeight: '700', color: '#222' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E5E5' },

  ownerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F7F7F7', padding: 12, borderRadius: 16 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#FFF', fontWeight: '700' },
  ownerName: { fontSize: 15, fontWeight: '700', color: '#222' },
  ownerSub: { fontSize: 12, color: '#8F8F8F' },
  youBadge: { backgroundColor: '#E0E0E0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  youText: { fontSize: 9, fontWeight: '800', color: '#222' },

  footer: { 
    paddingHorizontal: 24, 
    paddingTop: 16, 
    borderTopWidth: 1, 
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFF'
  },
  primaryBtn: { 
    backgroundColor: '#222', 
    height: 56, 
    borderRadius: 18, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 10,
    marginBottom: 10
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  disabledBtn: { backgroundColor: '#CCC' },
});