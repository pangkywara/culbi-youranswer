import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Globe,
  Lock,
  MapPin,
  UsersThree,
  WarningCircle,
} from 'react-native-phosphor';

import { useGroupDetail } from '@/hooks/useGroupDetail';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Colors, Shadows, Type, S } from '@/constants/style';

// ─── Config ──────────────────────────────────────────────────────────────────

const HERO_HEIGHT = 280;
const CATEGORY_COLORS: Record<string, string> = {
  Culture:  '#8B5CF6', Food: '#F59E0B', Nature: '#10B981',
  History:  '#6366F1', Heritage: '#EC4899', Religion: '#F97316',
  Landmark: '#3B82F6', General: '#6B7280',
};

const CATEGORY_IMAGES: Record<string, string> = {
  Culture:  'https://images.unsplash.com/photo-1518481612222-68bbe828ecd1?w=800&q=75',
  Food:     'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=75',
  Nature:   'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800&q=75',
  History:  'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?w=800&q=75',
  Heritage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=75',
  Religion: 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=800&q=75',
  Landmark: 'https://images.unsplash.com/photo-1503221043305-f7498f8b763e?w=800&q=75',
};
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=75';

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const { group, loading, error } = useGroupDetail(id ?? '');
  const currentUserId = session?.user?.id ?? '';

  const [isMember, setIsMember] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinErr, setJoinErr] = useState<string | null>(null);
  const [checkingMembership, setCheckingMembership] = useState(false);

  // ── Logic: Membership Check ──
  useEffect(() => {
    if (!group || !currentUserId) return;
    let cancelled = false;
    setCheckingMembership(true);
    (async () => {
      const { count } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', group.id)
        .eq('user_id', currentUserId);
      if (!cancelled) {
        setIsMember((count ?? 0) > 0);
        setCheckingMembership(false);
      }
    })();
    return () => { cancelled = true; };
  }, [group?.id, currentUserId]);

  // ── Logic: Join Action ──
  const handleJoin = async () => {
    if (!group || !currentUserId || joining) return;
    setJoining(true);
    setJoinErr(null);
    try {
      const { error: err } = await supabase
        .from('group_members')
        .insert({ group_id: group.id, user_id: currentUserId, role: 'member' });
      if (err) throw err;
      setIsMember(true);
    } catch (e: any) {
      setJoinErr(e?.message ?? 'Failed to join group');
    } finally {
      setJoining(false);
    }
  };

  const handleOpenChat = () => router.push(`/groupchat/${group?.id}`);

  if (loading) return <View style={S.center}><ActivityIndicator size="large" color={Colors.brand} /></View>;
  if (error || !group) return <View style={S.center}><Text style={styles.errorText}>{error ?? 'Group not found.'}</Text></View>;

  const accentColor = CATEGORY_COLORS[group.category ?? ''] ?? Colors.brand;
  const imageUri = group.avatarUrl ?? (CATEGORY_IMAGES[group.category ?? ''] ?? FALLBACK_IMAGE);
  const isOwner = group.createdBy === currentUserId;
  const alreadyIn = isMember || isOwner;
  const isFull = group.memberLimit != null && group.memberCount >= group.memberLimit;

  // ── Derived data (from code 1) ──
  const region = (group as any).region;
  const lat = (group as any).latitude as number | undefined;
  const lng = (group as any).longitude as number | undefined;
  const memberCountDisplay = group.memberLimit
    ? `${group.memberCount} / ${group.memberLimit}`
    : `${group.memberCount}`;
  const memberFillRatio = group.memberLimit
    ? Math.min(group.memberCount / group.memberLimit, 1)
    : null;

  return (
    <View style={S.fill}>
      {/* Floating Back Button */}
      <Pressable
        style={[styles.backBtn, { top: insets.top + 12 }]}
        onPress={() => router.back()}
      >
        <ArrowLeft size={20} color="#222" weight="bold" />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── Hero Image ── */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.heroImage}
            contentFit="cover"
            transition={300}
          />

          {/* Overlapping Avatar */}
          <View style={styles.avatarRing}>
            {group.owner?.avatarUrl ? (
              <Image source={{ uri: group.owner.avatarUrl ?? undefined }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: accentColor, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={styles.avatarInitial}>{group.owner?.displayName?.charAt(0) ?? 'G'}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Body Content ── */}
        <View style={styles.body}>

          <Text style={styles.title}>{group.name}</Text>

          <Text style={styles.description}>
            {group.description}
          </Text>

          {/* ── Member limit progress bar ── */}
          {group.memberLimit != null && (
            <View style={styles.progressBlock}>
              <View style={styles.progressLabelRow}>
                <UsersThree size={13} color={Colors.textSecondary} weight="fill" />
                <Text style={styles.progressLabel}>
                  {group.memberCount} / {group.memberLimit} members
                </Text>
                {isFull && <Text style={[styles.progressLabel, { color: Colors.destructive, marginLeft: 'auto' }]}>Full</Text>}
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${(memberFillRatio ?? 0) * 100}%` as any, backgroundColor: isFull ? Colors.destructive : accentColor }]} />
              </View>
            </View>
          )}

          <View style={styles.divider} />

          {/* Meta Info */}
          <View style={styles.metaRow}>
            <Text style={styles.metaReviews}>{memberCountDisplay} members</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaLocation}>{group.category ?? 'Community'}{region ? ` in ${region}` : ''}</Text>
            <Text style={styles.metaDot}>·</Text>
            {group.visibility === 'private'
              ? <Lock size={13} color="#111" weight="fill" />
              : <Globe size={13} color="#111" weight="fill" />}
            <Text style={styles.metaLocation}>{group.visibility ?? 'public'}</Text>
          </View>
          {lat != null && lng != null && (
            <View style={[styles.metaRow, { marginTop: 4 }]}>
              <MapPin size={13} color="#111" weight="fill" />
              <Text style={styles.metaLocation}>{lat.toFixed(4)}, {lng.toFixed(4)}</Text>
            </View>
          )}
          <Text style={styles.metaSub}>
            {alreadyIn ? 'You are a member of this group' : `Hosted by ${group.owner?.displayName ?? 'the organizer'}`}
          </Text>

          <View style={styles.divider} />

          {/* ── Group Owner ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>Group Owner</Text>
            </View>
            <View style={styles.memberRow}>
              {group.owner?.avatarUrl ? (
                <Image source={{ uri: group.owner.avatarUrl ?? undefined }} style={styles.memberAvatar} contentFit="cover" />
              ) : (
                <View style={[styles.memberAvatar, { backgroundColor: accentColor, justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>{group.owner?.displayName?.charAt(0) ?? 'G'}</Text>
                </View>
              )}
              <View style={S.fill}>
                <Text style={styles.memberName}>{group.owner?.displayName ?? 'Organizer'}{isOwner ? ' (You)' : ''}</Text>
                <Text style={styles.memberRole}>Host / Organizer</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* ── Group Members ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>Group Members</Text>
            </View>
            
            {group.members?.slice(0, 5).map((m: any, index: number) => {
                const isLast = index === Math.min(group.members.length, 5) - 1;
                return (
                    <React.Fragment key={m.userId}>
                        <MemberRow
                            member={m}
                            accentColor={accentColor}
                            isCurrent={m.userId === currentUserId}
                        />
                        {!isLast && <View style={styles.memberDivider} />}
                    </React.Fragment>
                );
            })}
          </View>
        </View>
      </ScrollView>

      {/* ── Sticky Footer ── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {joinErr && (
          <View style={styles.errRow}>
            <WarningCircle size={14} color={Colors.destructive} weight="fill" />
            <Text style={styles.errText}>{joinErr}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[S.btnPrimary, isFull && !alreadyIn ? { backgroundColor: Colors.border } : {}]}
          onPress={alreadyIn ? handleOpenChat : handleJoin}
          disabled={isFull && !alreadyIn}
          activeOpacity={0.8}
        >
          {joining ? <ActivityIndicator color={Colors.white} /> : (
            <Text style={styles.btnprimary}>
              {alreadyIn ? 'Open Group Chat' : isFull ? 'Group is Full' : 'Join Group'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

const MemberRow = ({ member, isCurrent }: any) => (
  <View style={styles.memberRow}>
    <Image source={{ uri: member.avatarUrl ?? undefined }} style={styles.memberAvatar} contentFit="cover" />
    <View style={S.fill}>
      <Text style={styles.memberName}>{member.displayName}{isCurrent ? ' (You)' : ''}</Text>
      <Text style={styles.memberRole}>{member.role === 'owner' ? 'Group Admin' : 'Member'}</Text>
    </View>
  </View>
);

// ─── Styles ──────────────────────────────────────────────────────────────────

const AVATAR_SIZE = 96;

const styles = StyleSheet.create({
  backBtn: {
    position: 'absolute', left: 16, zIndex: 100,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  btnprimary: {
    color: Colors.white,
    fontSize: Type.sizeTitle,
    fontWeight: Type.weightSemibold,
  },
  heroContainer: {
    marginHorizontal: 16,
    marginTop: 56,
    borderRadius: 20,
    height: HERO_HEIGHT,
    position: 'relative',
    ...Shadows.level5,
  },
  heroImage: {
    width: '100%',
    height: HERO_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatarRing: {
    position: 'absolute',
    bottom: -(AVATAR_SIZE / 2),
    alignSelf: 'center',
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
    ...Shadows.level3,
  },
  avatarInitial: {
    fontSize: 30, fontWeight: '800', color: '#fff',
  },
  body: {
    marginTop: AVATAR_SIZE / 2 + 20,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 34,
    marginBottom: 6,
  },
  description: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 6,
  },
  // Badges
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  // Progress bar
  progressBlock: {
    marginBottom: 4,
    gap: 6,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  metaDot: {
    fontSize: 14,
    color: '#999',
    marginHorizontal: 2,
  },
  metaReviews: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
    textDecorationLine: 'underline',
  },
  metaLocation: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
    textDecorationLine: 'underline',
  },
  metaSub: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginTop: 2,
  },
  section: { gap: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  memberDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginLeft: 56,
  },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e5e7eb' },
  memberName: { fontSize: 15, fontWeight: '700', color: '#111' },
  memberRole: { fontSize: 12, color: '#999' },
  footer: {
    position: 'absolute', bottom: -20, left: 0, right: 0,
    paddingHorizontal: 24, paddingTop: 16,
    backgroundColor: Colors.white,
    borderTopWidth: 1, borderTopColor: '#e5e7eb',
    marginBottom: Platform.OS === 'ios' ? 0 : 10,
  },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, alignSelf: 'center' },
  errText: { fontSize: 12, color: '#ef4444', fontWeight: '600' },
  errorText: { fontSize: 16, color: '#888', textAlign: 'center' },
});