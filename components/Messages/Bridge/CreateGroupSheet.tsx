/**
 * components/Messages/Bridge/CreateGroupSheet.tsx
 *
 * Two-step bottom sheet for creating a new group conversation.
 *   Step 1 — "Add Members": multi-select user search with selected chips
 *   Step 2 — "New Group":   group name + description, then create via RPC
 *
 * Matches the AddPersonModal animation style (spring, pan-to-dismiss).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    Keyboard,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from 'react-native-gesture-handler';
import {
    ArrowLeft,
    CaretRight,
    Check,
    Globe,
    Lock,
    MagnifyingGlass,
    UsersThree,
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
import AddPeoplesAnimation from '@/assets/lottie-assets/explore.json';
import { Colors, Radius, Shadows, Space, Type } from '@/constants/style';
import { useUserSearch } from '@/hooks/useUserSearch';
import { supabase } from '@/lib/supabase';
import type { UserSearchResult } from '@/types/database';
import LottieView from 'lottie-react-native';

const { height: SCREEN_H } = Dimensions.get('window');
const PANEL_HEIGHT = SCREEN_H * 0.85;
// The tab bar uses position:'absolute' with height 80 (see _layout.tsx),
// so it floats over the full-screen area. We must offset all bottom content.
const FLOATING_TAB_H = 80;
const SPRING = { damping: 22, stiffness: 180, mass: 0.9 } as const;

type Step = 'members' | 'info';

interface Props {
    visible: boolean;
    onClose: () => void;
    /** Called with the new group's UUID after successful creation. */
    onGroupReady: (groupId: string) => void;
}

export function CreateGroupSheet({ visible, onClose, onGroupReady }: Props) {
    const insets = useSafeAreaInsets();
    const searchInputRef = useRef<TextInput>(null);
    const nameInputRef = useRef<TextInput>(null);

    // ── Sheet animation ────────────────────────────────────────────────────────
    const translateY = useSharedValue(SCREEN_H);
    const backdropOpacity = useSharedValue(0);
    const [isMounted, setIsMounted] = useState(false);

    // ── Multi-step state ───────────────────────────────────────────────────────
    const [step, setStep] = useState<Step>('members');
    const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([]);
    const [groupName, setGroupName] = useState('');
    const [groupDesc, setGroupDesc] = useState('');
    const [isPublic, setIsPublic] = useState(false); // default: private
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    const { query, results, loading, setQuery, clear } = useUserSearch();

    // ── Reset helper (called on worklet thread via runOnJS) ────────────────────
    const doReset = useCallback(() => {
        setStep('members');
        setSelectedUsers([]);
        setGroupName('');
        setGroupDesc('');
        setIsPublic(false);
        setCreating(false);
        setCreateError(null);
        clear();
    }, [clear]);

    // ── Sync visibility with animations ───────────────────────────────────────
    useEffect(() => {
        if (visible) {
            setIsMounted(true);
            backdropOpacity.value = withTiming(1, { duration: 300 });
            translateY.value = withSpring(0, SPRING);
            const t = setTimeout(() => searchInputRef.current?.focus(), 420);
            return () => clearTimeout(t);
        } else {
            Keyboard.dismiss();
            backdropOpacity.value = withTiming(0, { duration: 250 });
            translateY.value = withSpring(SCREEN_H, SPRING, (finished) => {
                if (finished) {
                    runOnJS(setIsMounted)(false);
                    runOnJS(doReset)();
                }
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    // ── Pan-to-dismiss gesture ─────────────────────────────────────────────────
    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            if (e.translationY > 0) translateY.value = e.translationY;
        })
        .onEnd((e) => {
            if (e.translationY > 120 || e.velocityY > 600) {
                translateY.value = withSpring(
                    SCREEN_H,
                    { ...SPRING, velocity: e.velocityY },
                    () => runOnJS(onClose)(),
                );
            } else {
                translateY.value = withSpring(0, SPRING);
            }
        });

    const animatedSheet = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));
    const animatedBackdrop = useAnimatedStyle(() => ({
        opacity: backdropOpacity.value,
    }));

    // ── Member selection ───────────────────────────────────────────────────────
    const toggleUser = useCallback((user: UserSearchResult) => {
        setSelectedUsers((prev) =>
            prev.find((u) => u.id === user.id)
                ? prev.filter((u) => u.id !== user.id)
                : [...prev, user],
        );
    }, []);

    const isSelected = useCallback(
        (id: string) => selectedUsers.some((u) => u.id === id),
        [selectedUsers],
    );

    // ── Step navigation ────────────────────────────────────────────────────────
    const goToInfo = useCallback(() => {
        Keyboard.dismiss();
        setStep('info');
        setTimeout(() => nameInputRef.current?.focus(), 220);
    }, []);

    const goToMembers = useCallback(() => {
        Keyboard.dismiss();
        setStep('members');
    }, []);

    // ── Create group ───────────────────────────────────────────────────────────
    const handleCreate = useCallback(async () => {
        const name = groupName.trim();
        if (!name || creating) return;

        setCreating(true);
        setCreateError(null);

        try {
            const { data, error: rpcErr } = await supabase.rpc('create_group_conversation', {
                p_name: name,
                p_description: groupDesc.trim() || null,
                p_avatar_url: null,
                p_member_ids: selectedUsers.map((u) => u.id),
                p_visibility: isPublic ? 'public' : 'private',
            });
            if (rpcErr) throw rpcErr;

            const groupId = data as string;
            onClose();
            setTimeout(() => onGroupReady(groupId), 300);
        } catch (e: any) {
            // 23505 = unique constraint violation — a group with this name already exists.
            // Find the one this user owns (same name) and navigate straight to it.
            if (e?.code === '23505') {
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { data: existing } = await supabase
                            .from('group_conversations')
                            .select('id')
                            .eq('name', name)
                            .eq('created_by', user.id)
                            .maybeSingle();
                        if (existing?.id) {
                            onClose();
                            setTimeout(() => onGroupReady(existing.id), 300);
                            return;
                        }
                    }
                } catch { /* fall through */ }
                setCreateError('A group with this name already exists.');
                return;
            }
            setCreateError(e?.message ?? 'Could not create group');
        } finally {
            setCreating(false);
        }
    }, [groupName, groupDesc, selectedUsers, creating, onClose, onGroupReady]);

    if (!isMounted) return null;

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
                        { paddingBottom: insets.bottom + FLOATING_TAB_H + Space.md },
                    ]}
                >
                    {/* ── Drag handle + dynamic header ──────────────────────────────── */}
                    <GestureDetector gesture={panGesture}>
                        <View style={styles.dragZone}>
                            <View style={styles.handle} />
                            <View style={styles.sheetHeader}>
                                {step === 'info' && (
                                    <TouchableOpacity onPress={goToMembers} style={styles.iconBtn}>
                                        <ArrowLeft size={20} color={Colors.textPrimary} weight="bold" />
                                    </TouchableOpacity>
                                )}
                                <Text style={styles.sheetTitle}>
                                    {step === 'members' ? 'Add Members' : 'New Group'}
                                </Text>
                                <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                                    <X size={18} color={Colors.textPrimary} weight="bold" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </GestureDetector>

                    {/* ── STEP 1: Member selection ──────────────────────────────────── */}
                    {step === 'members' && (
                        <View style={styles.stepContainer}>
                            {/* Selected member chips */}
                            {selectedUsers.length > 0 && (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={styles.chipsScroll}
                                    contentContainerStyle={styles.chipsContent}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    {selectedUsers.map((user) => (
                                        <MemberChip
                                            key={user.id}
                                            user={user}
                                            onRemove={() => toggleUser(user)}
                                        />
                                    ))}
                                </ScrollView>
                            )}

                            {/* Search bar */}
                            <View style={styles.inputRow}>
                                <MagnifyingGlass size={18} color={Colors.textSecondary} weight="bold" />
                                <TextInput
                                    ref={searchInputRef}
                                    style={styles.searchInput}
                                    placeholder="Search users…"
                                    placeholderTextColor={Colors.textTertiary}
                                    value={query}
                                    onChangeText={setQuery}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    returnKeyType="search"
                                />
                            </View>

                            {/* Results list — flex:1 inside the stepContainer so it fills
                    remaining space, leaving the CTA pinned at the bottom */}
                            <FlatList
                                data={results}
                                keyExtractor={(u) => u.id}
                                style={styles.resultList}
                                keyboardShouldPersistTaps="handled"
                                ListEmptyComponent={
                                    loading ? (
                                        <View style={styles.centeredRow}>
                                            <ActivityIndicator color={Colors.brand} />
                                        </View>
                                    ) : query.trim().length >= 2 ? (
                                        <Text style={styles.emptyText}>No users found for "{query.trim()}"</Text>
                                    ) : query.length > 0 ? (
                                        <Text style={styles.hintText}>Type at least 2 characters</Text>
                                    ) : (
                                        <View style={styles.emptyState}>
                                            <LottieView
                                                source={AddPeoplesAnimation}
                                                autoPlay
                                                loop={false} // Set to true if you want it to keep moving
                                                style={styles.lottieIcon}
                                            />
                                            <Text style={styles.emptyStateText}>
                                                Search for friends{'\n'}to add to your group
                                            </Text>
                                        </View>
                                    )
                                }
                                renderItem={({ item }) => (
                                    <SelectableUserRow
                                        user={item}
                                        selected={isSelected(item.id)}
                                        onPress={() => toggleUser(item)}
                                    />
                                )}
                            />

                            {/* Next button — always visible at the bottom of stepContainer */}
                            {selectedUsers.length > 0 && (
                                <TouchableOpacity
                                    style={styles.ctaBtn}
                                    onPress={goToInfo}
                                    activeOpacity={0.88}
                                >
                                    <Text style={styles.ctaBtnText}>
                                        Next ({selectedUsers.length})
                                    </Text>
                                    <CaretRight size={18} color={Colors.white} weight="bold" />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* ── STEP 2: Group info ────────────────────────────────────────── */}
                    {step === 'info' && (
                        <ScrollView
                            style={styles.stepContainer}
                            contentContainerStyle={styles.stepInfoContent}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Group avatar placeholder */}
                            <View style={styles.avatarSection}>
                                <View style={styles.groupAvatarCircle}>
                                    <UsersThree size={38} color={Colors.white} weight="fill" />
                                </View>
                            </View>

                            {/* Name + description inputs */}
                            <View style={styles.infoBlock}>
                                <View style={styles.nameRow}>
                                    <TextInput
                                        ref={nameInputRef}
                                        style={styles.nameInput}
                                        placeholder="Group name (required)"
                                        placeholderTextColor={Colors.textTertiary}
                                        value={groupName}
                                        onChangeText={setGroupName}
                                        maxLength={50}
                                        returnKeyType="next"
                                    />
                                    <Text style={styles.charCount}>{groupName.length}/50</Text>
                                </View>
                                <TextInput
                                    style={styles.descInput}
                                    placeholder="Description (optional)"
                                    placeholderTextColor={Colors.textTertiary}
                                    value={groupDesc}
                                    onChangeText={setGroupDesc}
                                    maxLength={200}
                                    multiline
                                    returnKeyType="done"
                                />
                            </View>

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
                                        {isPublic
                                            ? 'Anyone can discover and join'
                                            : 'Only invited members can join'}
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

                            {/* Selected member preview */}
                            <Text style={styles.membersLabel}>
                                {selectedUsers.length} member{selectedUsers.length !== 1 ? 's' : ''}
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.chipsScroll}
                                contentContainerStyle={styles.chipsContent}
                            >
                                {selectedUsers.map((user) => (
                                    <MemberChipReadOnly key={user.id} user={user} />
                                ))}
                            </ScrollView>

                            {createError && (
                                <Text style={styles.errorText}>{createError}</Text>
                            )}

                            {/* Create Group button */}
                            <TouchableOpacity
                                style={[
                                    styles.ctaBtn,
                                    styles.ctaBtnStep2,
                                    (!groupName.trim() || creating) && styles.ctaBtnDisabled,
                                ]}
                                onPress={handleCreate}
                                activeOpacity={0.88}
                                disabled={!groupName.trim() || creating}
                            >
                                {creating ? (
                                    <ActivityIndicator color={Colors.white} />
                                ) : (
                                    <>
                                        <Check size={18} color={Colors.white} weight="bold" />
                                        <Text style={styles.ctaBtnText}>Create Group</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    )}
                </Animated.View>
            </GestureHandlerRootView>
        </View>
    );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

/** Chip shown in the horizontal scroll of selected members (step 1 — tappable to deselect). */
const MemberChip = React.memo(
    ({ user, onRemove }: { user: UserSearchResult; onRemove: () => void }) => {
        const initials = (user.full_name ?? user.username ?? '?').charAt(0).toUpperCase();
        return (
            <TouchableOpacity style={styles.chip} onPress={onRemove} activeOpacity={0.8}>
                <View>
                    {user.avatar_url ? (
                        <Image source={{ uri: user.avatar_url }} style={styles.chipAvatar} />
                    ) : (
                        <View style={[styles.chipAvatar, styles.chipAvatarFallback]}>
                            <Text style={styles.chipAvatarText}>{initials}</Text>
                        </View>
                    )}
                    <View style={styles.chipRemoveBadge}>
                        <X size={9} color={Colors.white} weight="bold" />
                    </View>
                </View>
                <Text style={styles.chipLabel} numberOfLines={1}>
                    {(user.full_name ?? user.username ?? 'User').split(' ')[0]}
                </Text>
            </TouchableOpacity>
        );
    },
);

/** Read-only chip shown in the member preview on step 2. */
const MemberChipReadOnly = React.memo(({ user }: { user: UserSearchResult }) => {
    const initials = (user.full_name ?? user.username ?? '?').charAt(0).toUpperCase();
    return (
        <View style={styles.chip}>
            {user.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.chipAvatar} />
            ) : (
                <View style={[styles.chipAvatar, styles.chipAvatarFallback]}>
                    <Text style={styles.chipAvatarText}>{initials}</Text>
                </View>
            )}
            <Text style={styles.chipLabel} numberOfLines={1}>
                {(user.full_name ?? user.username ?? 'User').split(' ')[0]}
            </Text>
        </View>
    );
});

/** User row in the search results with a checkbox-style selection indicator. */
const SelectableUserRow = React.memo(
    ({
        user,
        selected,
        onPress,
    }: {
        user: UserSearchResult;
        selected: boolean;
        onPress: () => void;
    }) => (
        <TouchableOpacity style={styles.userRow} onPress={onPress} activeOpacity={0.7}>
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

            <View style={[styles.checkCircle, selected && styles.checkCircleFilled]}>
                {selected && <Check size={14} color={Colors.white} weight="bold" />}
            </View>
        </TouchableOpacity>
    ),
);

// ── Styles ─────────────────────────────────────────────────────────────────────

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
    iconBtn: {
        width: 32,
        height: 32,
        borderRadius: Radius.full,
        backgroundColor: Colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    groupIconBg: {
        backgroundColor: Colors.badgeAlt,
    },
    sheetTitle: {
        flex: 1,
        fontSize: Type.sizeH3,
        fontWeight: Type.weightSemibold,
        color: Colors.textPrimary,
    },

    // ── Chips ──────────────────────────────────────────────────────────────────
    chipsScroll: {
        flexShrink: 0,
        marginTop: Space.md,
    },
    chipsContent: {
        paddingHorizontal: Space.xxl,
        gap: Space.md,
    },
    chip: {
        alignItems: 'center',
        width: 60,
    },
    chipAvatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
    },
    chipAvatarFallback: {
        backgroundColor: Colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chipAvatarText: {
        fontSize: Type.sizeBodySm,
        fontWeight: Type.weightBold,
        color: Colors.textPrimary,
    },
    chipRemoveBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: Colors.textSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: Colors.white,
    },
    chipLabel: {
        marginTop: 4,
        fontSize: Type.sizeCaption,
        color: Colors.textSecondary,
        textAlign: 'center',
        width: 56,
    },

    // ── Search bar ─────────────────────────────────────────────────────────────
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: Space.xxl,
        marginTop: Space.lg,
        marginBottom: Space.sm,
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
    resultList: {
        flex: 1,
        paddingHorizontal: Space.xxl,
        marginTop: Space.sm,
    },
    centeredRow: {
        alignItems: 'center',
        paddingVertical: Space.xxl,
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

    // ── CTA Button (Next / Create Group) ──────────────────────────────────────
    ctaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: Space.xxl,
        marginTop: Space.lg,
        height: 52,
        borderRadius: Radius.pill,
        backgroundColor: Colors.brand,
        gap: Space.sm,
    },
    // Extra bottom margin when inside ScrollView on step 2
    ctaBtnStep2: {
        marginBottom: Space.xl,
    },
    ctaBtnDisabled: {
        opacity: 0.45,
    },
    ctaBtnText: {
        fontSize: Type.sizeBody,
        fontWeight: Type.weightSemibold,
        color: Colors.white,
    },

    // ── Step 2: Group info ─────────────────────────────────────────────────────
    stepContainer: {
        flex: 1,
    },
    stepInfoContent: {
        paddingBottom: Space.xl,
    },
    avatarSection: {
        alignItems: 'center',
        marginTop: Space.xl,
        marginBottom: Space.xl,
    },
    groupAvatarCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: Colors.brand,
        alignItems: 'center',
        justifyContent: 'center',
    },
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
    charCount: {
        fontSize: Type.sizeCaption,
        color: Colors.textTertiary,
    },
    descInput: {
        fontSize: Type.sizeBody,
        color: Colors.textPrimary,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.borderSubtle,
        paddingVertical: Space.sm,
        minHeight: 44,
    },
    membersLabel: {
        marginHorizontal: Space.xxl,
        fontSize: Type.sizeCaption,
        color: Colors.textSecondary,
        fontWeight: Type.weightSemibold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: Space.xs,
    },

    // ── Privacy toggle ─────────────────────────────────────────────────────────
    privacyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: Space.xxl,
        marginTop: Space.lg,
        marginBottom: Space.lg,
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
    privacyOptionActive: {
        backgroundColor: Colors.brand,
    },
    privacyOptionText: {
        fontSize: Type.sizeCaption,
        fontWeight: Type.weightSemibold,
        color: Colors.textSecondary,
    },
    privacyOptionTextActive: {
        color: Colors.white,
    },

    errorText: {
        textAlign: 'center',
        color: Colors.destructive,
        fontSize: Type.sizeBodySm,
        marginHorizontal: Space.xxl,
        marginTop: Space.md,
    },

    // ── User rows ──────────────────────────────────────────────────────────────
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
    checkCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 2,
        borderColor: Colors.borderSubtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkCircleFilled: {
        backgroundColor: Colors.brand,
        borderColor: Colors.brand,
    },
});
