/**
 * components/Messages/GroupInfoSheet.tsx
 *
 * Bottom-sheet drawer that shows group metadata, member list, and (for admins)
 * group management controls: edit name/description, add members, remove members.
 *
 * Internal view modes:
 *   'info'      – default: group meta + member list
 *   'edit'      – edit group name / description
 *   'addMember' – search for users to add
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  ArrowLeft,
  Globe,
  Lock,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  UserPlus,
  Users,
  X,
} from 'react-native-phosphor';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Shadows, Space, Type } from '@/constants/style';
import { useGroupManagement } from '@/hooks/useGroupManagement';
import { useUserSearch } from '@/hooks/useUserSearch';
import type { GroupConversation, GroupMember } from '@/types/chat';
import type { UserSearchResult } from '@/types/database';

const { height: SCREEN_H } = Dimensions.get('window');
const PANEL_HEIGHT = SCREEN_H * 0.85;
const NAME_MAX = 64;

type ViewMode = 'info' | 'edit' | 'addMember';

interface Props {
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
}: Props) {
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

// ─── Info View ────────────────────────────────────────────────────────────────

function InfoView({
  group,
  members,
  currentUserId,
  isAdmin,
  adminCount,
  onClose,
  onEdit,
  onAddMember,
  onRefresh,
}: {
  group: GroupConversation | null;
  members: GroupMember[];
  currentUserId: string;
  isAdmin: boolean;
  adminCount: number;
  onClose: () => void;
  onEdit: () => void;
  onAddMember: () => void;
  onRefresh?: () => Promise<void>;
}) {
  const { loading: mutating, error, removeMember } = useGroupManagement(group?.id ?? '');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (userId: string) => {
    setRemovingId(userId);
    const ok = await removeMember(userId);
    setRemovingId(null);
    if (ok) await onRefresh?.();
  };

  return (
    <>
      {/* Header */}
      <View style={styles.header}>
        <Users size={20} color={Colors.brand} weight="bold" />
        <Text style={styles.title}>Group Info</Text>
        {isAdmin && (
          <TouchableOpacity onPress={onEdit} style={styles.iconBtn} hitSlop={12}>
            <PencilSimple size={18} color={Colors.brand} weight="bold" />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
          <X size={18} color={Colors.textPrimary} weight="bold" />
        </TouchableOpacity>
      </View>

      {/* Group metadata */}
      {group && (
        <View style={styles.metaSection}>
          {group.avatarUrl ? (
            <Image source={{ uri: group.avatarUrl }} style={styles.groupAvatar} />
          ) : (
            <View style={styles.groupAvatarFallback}>
              <Text style={styles.groupAvatarInitials}>
                {group.name.slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.groupName}>{group.name}</Text>
          {group.description ? (
            <Text style={styles.groupDescription}>{group.description}</Text>
          ) : null}
          <Text style={styles.memberCountLabel}>
            {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
          </Text>
          {/* Visibility badge */}
          <View style={styles.visBadge}>
            {group.visibility === 'public'
              ? <Globe size={12} color={Colors.brand} weight="bold" />
              : <Lock size={12} color={Colors.textSecondary} weight="bold" />}
            <Text style={[
              styles.visText,
              { color: group.visibility === 'public' ? Colors.brand : Colors.textSecondary },
            ]}>
              {group.visibility === 'public' ? 'Public' : 'Private'}
            </Text>
          </View>
        </View>
      )}

      {/* Error */}
      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {/* Members section header */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Members</Text>
        {isAdmin && (
          <TouchableOpacity onPress={onAddMember} style={styles.addMemberBtn} hitSlop={12}>
            <UserPlus size={16} color={Colors.brand} weight="bold" />
            <Text style={styles.addMemberText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isSelf = item.userId === currentUserId;
          // Don't show remove on the last admin, or on yourself (leave is separate)
          const canRemove =
            isAdmin && !isSelf && !(item.role === 'admin' && adminCount <= 1);
          return (
            <MemberRow
              member={item}
              isCurrentUser={isSelf}
              canRemove={canRemove}
              isRemoving={removingId === item.userId}
              onRemove={() => handleRemove(item.userId)}
            />
          );
        }}
      />
    </>
  );
}

// ─── Edit View ────────────────────────────────────────────────────────────────

function EditView({
  group,
  onBack,
  onRefresh,
}: {
  group: GroupConversation;
  onBack: () => void;
  onRefresh?: () => Promise<void>;
}) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? '');
  const [isPublic, setIsPublic] = useState(group.visibility === 'public');
  const { loading, error, clearError, updateGroup } = useGroupManagement(group.id);

  const canSave = name.trim().length > 0 && name.trim().length <= NAME_MAX;

  const handleSave = async () => {
    const ok = await updateGroup(name, description, isPublic ? 'public' : 'private');
    if (ok) {
      await onRefresh?.();
      onBack();
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.iconBtn} hitSlop={12}>
          <ArrowLeft size={20} color={Colors.textPrimary} weight="bold" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Group</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!canSave || loading}
          style={[styles.saveBtn, (!canSave || loading) && styles.saveBtnDisabled]}
          hitSlop={8}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.editContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar placeholder (read-only for now) */}
        <View style={styles.avatarSection}>
          {group.avatarUrl ? (
            <Image source={{ uri: group.avatarUrl }} style={styles.editAvatar} />
          ) : (
            <View style={[styles.editAvatarFallback]}>
              <Text style={styles.editAvatarInitials}>
                {(name || group.name).slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.infoBlock}>
          {/* Group name */}
          <View style={styles.nameRow}>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={(t) => {
                clearError();
                setName(t);
              }}
              placeholder="Group name"
              placeholderTextColor={Colors.textTertiary}
              maxLength={NAME_MAX}
              returnKeyType="next"
              autoFocus
            />
            <Text style={styles.charCount}>{name.length}/{NAME_MAX}</Text>
          </View>

          {/* Description */}
          <TextInput
            style={styles.descInput}
            value={description}
            onChangeText={(t) => {
              clearError();
              setDescription(t);
            }}
            placeholder="Add a description (optional)"
            placeholderTextColor={Colors.textTertiary}
            multiline
            returnKeyType="done"
            blurOnSubmit
          />
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {/* Privacy toggle */}
        <View style={styles.privacyRow}>
          <View style={[
            styles.privacyIconWrap,
            { backgroundColor: isPublic ? '#EBF1FD' : Colors.surfaceMuted },
          ]}>
            {isPublic
              ? <Globe size={18} color={Colors.brand} weight="bold" />
              : <Lock size={18} color={Colors.textSecondary} weight="bold" />}
          </View>
          <View style={styles.privacyInfo}>
            <Text style={styles.privacyTitle}>
              {isPublic ? 'Public group' : 'Private group'}
            </Text>
            <Text style={styles.privacyDesc}>
              {isPublic ? 'Anyone can discover and join' : 'Only invited members can join'}
            </Text>
          </View>
          <View style={styles.privacyPill}>
            <TouchableOpacity
              style={[
                styles.privacyOption,
                !isPublic && styles.privacyOptionActive,
              ]}
              onPress={() => setIsPublic(false)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.privacyOptionText,
                !isPublic && styles.privacyOptionTextActive,
              ]}>Private</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.privacyOption,
                isPublic && styles.privacyOptionActive,
              ]}
              onPress={() => setIsPublic(true)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.privacyOptionText,
                isPublic && styles.privacyOptionTextActive,
              ]}>Public</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Add Member View ──────────────────────────────────────────────────────────

function AddMemberView({
  groupId,
  existingMemberIds,
  onBack,
  onRefresh,
}: {
  groupId: string;
  existingMemberIds: string[];
  onBack: () => void;
  onRefresh?: () => Promise<void>;
}) {
  const { query, results, loading: searching, setQuery, clear } = useUserSearch();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { loading: adding, error, addMembers } = useGroupManagement(groupId);

  const existingSet = new Set(existingMemberIds);
  const filteredResults = results.filter((u) => !existingSet.has(u.id));

  const toggleUser = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    const ok = await addMembers(Array.from(selected));
    if (ok) {
      clear();
      setSelected(new Set());
      await onRefresh?.();
      onBack();
    }
  };

  const canAdd = selected.size > 0 && !adding;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.iconBtn} hitSlop={12}>
          <ArrowLeft size={20} color={Colors.textPrimary} weight="bold" />
        </TouchableOpacity>
        <Text style={styles.title}>Add Members</Text>
      </View>

      {/* Search input */}
      <View style={styles.inputRow}>
        <MagnifyingGlass size={18} color={Colors.textSecondary} weight="bold" />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or username"
          placeholderTextColor={Colors.textTertiary}
          autoFocus
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Results */}
      <FlatList
        data={filteredResults}
        keyExtractor={(u) => u.id}
        style={styles.resultList}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          query.length >= 2 && !searching ? (
            <Text style={styles.emptyText}>No users found</Text>
          ) : query.length < 2 ? (
            <Text style={styles.hintText}>Type at least 2 characters to search</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <SearchUserRow
            user={item}
            selected={selected.has(item.id)}
            onPress={() => toggleUser(item.id)}
          />
        )}
      />

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {/* CTA */}
      <TouchableOpacity
        onPress={handleAdd}
        disabled={!canAdd}
        style={[styles.ctaBtn, !canAdd && styles.ctaBtnDisabled]}
        activeOpacity={0.8}
      >
        {adding ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <Text style={styles.ctaBtnText}>
            {selected.size > 0
              ? `Add ${selected.size} ${selected.size === 1 ? 'member' : 'members'}`
              : 'Select members'}
          </Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const MemberRow = React.memo(function MemberRow({
  member,
  isCurrentUser,
  canRemove,
  isRemoving,
  onRemove,
}: {
  member: GroupMember;
  isCurrentUser: boolean;
  canRemove: boolean;
  isRemoving: boolean;
  onRemove: () => void;
}) {
  const initials = member.displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View style={styles.memberRow}>
      {member.avatarUrl ? (
        <Image source={{ uri: member.avatarUrl }} style={styles.memberAvatar} />
      ) : (
        <View style={styles.memberAvatarFallback}>
          <Text style={styles.memberInitials}>{initials}</Text>
        </View>
      )}
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>
          {member.displayName}
          {isCurrentUser ? ' (You)' : ''}
        </Text>
        {member.role === 'admin' && <Text style={styles.adminBadge}>Admin</Text>}
      </View>
      {canRemove && (
        <TouchableOpacity
          onPress={onRemove}
          disabled={isRemoving}
          style={styles.removeBtn}
          hitSlop={8}
        >
          {isRemoving ? (
            <ActivityIndicator size="small" color={Colors.destructive} />
          ) : (
            <Trash size={17} color={Colors.destructive} weight="bold" />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
});

const SearchUserRow = React.memo(function SearchUserRow({
  user,
  selected,
  onPress,
}: {
  user: UserSearchResult;
  selected: boolean;
  onPress: () => void;
}) {
  const initials = (user.full_name ?? user.username ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <TouchableOpacity style={styles.userRow} onPress={onPress} activeOpacity={0.7}>
      {user.avatar_url ? (
        <Image source={{ uri: user.avatar_url }} style={styles.userAvatar} />
      ) : (
        <View style={[styles.userAvatar, styles.userAvatarFallback]}>
          <Text style={styles.userAvatarText}>{initials}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.memberName}>{user.full_name ?? user.username}</Text>
        {user.username ? (
          <Text style={styles.usernameText}>@{user.username}</Text>
        ) : null}
      </View>
      <View style={[styles.checkCircle, selected && styles.checkCircleFilled]}>
        {selected && <Text style={styles.checkMark}>✓</Text>}
      </View>
    </TouchableOpacity>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    ...Shadows.level5,
  },
  dragZone: { paddingTop: 14, paddingBottom: 4 },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 5,
    borderRadius: Radius.full,
    backgroundColor: '#EBEBEB',
    marginBottom: 6,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space.xxl,
    paddingBottom: Space.md,
    paddingTop: Space.xs,
    gap: Space.sm,
  },
  title: {
    flex: 1,
    fontSize: Type.sizeH3,
    fontWeight: Type.weightBold,
    color: Colors.textPrimary,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  closeBtn: {
    backgroundColor: Colors.surfaceMuted,
    padding: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveBtn: {
    paddingHorizontal: Space.lg,
    height: 34,
    borderRadius: Radius.pill,
    backgroundColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightSemibold,
    color: Colors.white,
  },

  // ── Group meta ────────────────────────────────────────────────────────────
  metaSection: {
    alignItems: 'center',
    paddingHorizontal: Space.xxl,
    paddingVertical: Space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  groupAvatar: { width: 72, height: 72, borderRadius: 36, marginBottom: 12 },
  groupAvatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  groupAvatarInitials: { fontSize: 22, fontWeight: '700', color: Colors.textSecondary },
  groupName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  memberCountLabel: { fontSize: 12, color: Colors.textTertiary },
  visBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfacePale,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  visText: { fontSize: 11, fontWeight: '600' },

  // ── Privacy toggle (EditView) ─────────────────────────────────────────────
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Space.xxl,
    marginTop: Space.lg,
    paddingVertical: Space.md,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfacePale,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    gap: Space.md,
  },
  privacyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyInfo: { flex: 1 },
  privacyTitle: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  privacyDesc: {
    fontSize: Type.sizeCaption,
    color: Colors.textSecondary,
    lineHeight: 15,
  },
  privacyPill: {
    flexDirection: 'row',
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceMuted,
    padding: 3,
    gap: 2,
  },
  privacyOption: {
    paddingHorizontal: Space.md,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  privacyOptionActive: { backgroundColor: Colors.brand },
  privacyOptionText: {
    fontSize: Type.sizeCaption,
    fontWeight: Type.weightSemibold,
    color: Colors.textSecondary,
  },
  privacyOptionTextActive: { color: Colors.white },

  // ── Members section ───────────────────────────────────────────────────────
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space.xxl,
    paddingTop: Space.lg,
    paddingBottom: Space.sm,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Space.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.brand,
  },
  addMemberText: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightSemibold,
    color: Colors.brand,
  },
  listContent: { paddingHorizontal: Space.xxl, paddingBottom: Space.xxxl },

  // ── Member row ────────────────────────────────────────────────────────────
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  memberAvatar: { width: 42, height: 42, borderRadius: 21, marginRight: 12 },
  memberAvatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  memberInitials: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  adminBadge: { fontSize: 11, color: Colors.brand, fontWeight: '600', marginTop: 2 },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Edit view ────────────────────────────────────────────────────────────
  editContent: { paddingBottom: Space.xl },
  avatarSection: {
    alignItems: 'center',
    marginTop: Space.lg,
    marginBottom: Space.lg,
  },
  editAvatar: { width: 80, height: 80, borderRadius: 40 },
  editAvatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarInitials: { fontSize: 24, fontWeight: '700', color: Colors.white },
  infoBlock: {
    marginHorizontal: Space.xxl,
    gap: Space.md,
    marginBottom: Space.lg,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.brand,
    paddingBottom: Space.xs,
  },
  nameInput: {
    flex: 1,
    fontSize: Type.sizeH3,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  charCount: { fontSize: Type.sizeCaption, color: Colors.textTertiary },
  descInput: {
    fontSize: Type.sizeBody,
    color: Colors.textPrimary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
    paddingVertical: Space.sm,
    minHeight: 44,
  },

  // ── Add member view ───────────────────────────────────────────────────────
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Space.xxl,
    marginTop: Space.sm,
    marginBottom: Space.xs,
    paddingHorizontal: Space.lg,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfacePale,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    gap: Space.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Type.sizeBody,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  resultList: { flex: 1, paddingHorizontal: Space.xxl, marginTop: Space.xs },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: Space.sm,
  },
  userAvatar: { width: 42, height: 42, borderRadius: 21 },
  userAvatarFallback: {
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  userAvatarText: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  usernameText: { fontSize: 12, color: Colors.textTertiary, marginTop: 1 },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleFilled: { backgroundColor: Colors.brand, borderColor: Colors.brand },
  checkMark: { fontSize: 12, color: Colors.white, fontWeight: '700' },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Space.xxl,
    marginTop: Space.md,
    marginBottom: Space.lg,
    height: 52,
    borderRadius: Radius.pill,
    backgroundColor: Colors.brand,
    gap: Space.sm,
  },
  ctaBtnDisabled: { opacity: 0.45 },
  ctaBtnText: {
    fontSize: Type.sizeBody,
    fontWeight: Type.weightSemibold,
    color: Colors.white,
  },

  // ── Shared extras ─────────────────────────────────────────────────────────
  errorText: {
    textAlign: 'center',
    color: Colors.destructive,
    fontSize: Type.sizeBodySm,
    marginHorizontal: Space.xxl,
    marginTop: Space.sm,
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
});

