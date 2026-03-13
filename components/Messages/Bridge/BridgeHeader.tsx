import { Colors, Radius, S, Space, Type } from '@/constants/style';
import type { ConversationCategory } from '@/types/chat';
import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import {
    Animated,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { MagnifyingGlass, PencilSimple, X } from 'react-native-phosphor';

export const CATEGORIES: ConversationCategory[] = [
    'All',
    'Traveling',
    'Support',
    'Bridge',
];

interface BridgeHeaderProps {
    activeCategory: ConversationCategory;
    onCategoryChange: (cat: ConversationCategory) => void;
    // searchQuery is NO LONGER a prop — state lives inside this component.
    // Use this callback if the parent needs to filter a list on query change.
    onSearchQueryChange?: (q: string) => void;
    searchVisible: boolean;
    onSearchOpen: () => void;
    onSearchClose: () => void;
    onCompose: () => void;
}

export const BridgeHeader = React.memo(function BridgeHeader({
    activeCategory,
    onCategoryChange,
    onSearchQueryChange,
    searchVisible,
    onSearchOpen,
    onSearchClose,
    onCompose,
}: BridgeHeaderProps) {
    // ── Internal search state ──────────────────────────────────────────────────
    // Keeping this here means the parent never re-renders on keystrokes,
    // so no new prop references are created, memo holds, and the animation
    // useEffect never re-fires while typing.
    const [searchQuery, setSearchQuery] = useState('');

    const anim = useRef(new Animated.Value(0)).current;
    const inputRef = useRef<TextInput>(null);

    // ── Animation: only fires on open/close, never on typing ──────────────────
    useEffect(() => {
        Animated.timing(anim, {
            toValue: searchVisible ? 1 : 0,
            duration: 220,
            useNativeDriver: true,
        }).start(() => {
            if (searchVisible) {
                inputRef.current?.focus();
            } else {
                inputRef.current?.blur();
            }
        });

        // Clear query when search bar closes
        if (!searchVisible) {
            setSearchQuery('');
            onSearchQueryChange?.('');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchVisible]);

    const handleQueryChange = useCallback((q: string) => {
        setSearchQuery(q);
        onSearchQueryChange?.(q);
    }, [onSearchQueryChange]);

    const handleClearQuery = useCallback(() => {
        setSearchQuery('');
        onSearchQueryChange?.('');
    }, [onSearchQueryChange]);

    const handleCancel = useCallback(() => {
        setSearchQuery('');
        onSearchQueryChange?.('');
        onSearchClose();
    }, [onSearchQueryChange, onSearchClose]);

    // ── Interpolations ─────────────────────────────────────────────────────────
    const titleOpacity = useMemo(() => anim.interpolate({
        inputRange: [0, 0.5], outputRange: [1, 0], extrapolate: 'clamp'
    }), [anim]);

    const titleTranslate = useMemo(() => anim.interpolate({
        inputRange: [0, 1], outputRange: [0, -12], extrapolate: 'clamp'
    }), [anim]);

    const searchOpacity = useMemo(() => anim.interpolate({
        inputRange: [0.4, 1], outputRange: [0, 1], extrapolate: 'clamp'
    }), [anim]);

    const searchTranslate = useMemo(() => anim.interpolate({
        inputRange: [0, 1], outputRange: [20, 0], extrapolate: 'clamp'
    }), [anim]);

    return (
        <View style={styles.container}>
            <View style={styles.topRow}>
                {/* Title layer */}
                <Animated.View
                    pointerEvents={searchVisible ? 'none' : 'auto'}
                    style={[
                        styles.titleLayer,
                        {
                            opacity: titleOpacity,
                            transform: [{ translateX: titleTranslate }],
                        },
                    ]}
                >
                    <Text style={styles.mainTitle}>Messages</Text>
                    <View style={styles.iconGroup}>
                        <TouchableOpacity style={styles.iconButton} onPress={onSearchOpen} activeOpacity={0.7}>
                            <MagnifyingGlass size={20} color={Colors.textPrimary} weight="bold" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton} onPress={onCompose} activeOpacity={0.7}>
                            <PencilSimple size={20} color={Colors.textPrimary} weight="bold" />
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* Search bar layer */}
                <Animated.View
                    pointerEvents={searchVisible ? 'auto' : 'none'}
                    style={[
                        styles.searchLayer,
                        {
                            opacity: searchOpacity,
                            transform: [{ translateX: searchTranslate }],
                        },
                    ]}
                >
                    <View style={styles.inputPill}>
                        <MagnifyingGlass size={16} color={Colors.textSecondary} weight="bold" />
                        <TextInput
                            ref={inputRef}
                            style={styles.searchInput}
                            placeholder="Search conversations…"
                            placeholderTextColor={Colors.textTertiary}
                            value={searchQuery}
                            onChangeText={handleQueryChange}
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity
                                onPress={handleClearQuery}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <X size={15} color={Colors.textSecondary} weight="bold" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn} activeOpacity={0.7}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>

            {/* Category pills */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoriesScroll}
                contentContainerStyle={{ paddingRight: Space.xxl }}
            >
                {CATEGORIES.map((cat) => (
                    <CategoryPill
                        key={cat}
                        label={cat}
                        isActive={activeCategory === cat}
                        onPress={() => onCategoryChange(cat)}
                    />
                ))}
            </ScrollView>
        </View>
    );
});

// ── Sub-component for pills ───────────────────────────────────────────────────
const CategoryPill = React.memo(({ label, isActive, onPress }: any) => (
    <TouchableOpacity
        onPress={onPress}
        style={[styles.categoryPill, isActive && styles.activePill]}
        activeOpacity={0.7}
    >
        <Text style={[styles.categoryText, isActive && styles.activeCategoryText]}>
            {label}
        </Text>
    </TouchableOpacity>
));

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        paddingTop: 60,
        paddingBottom: Space.lg,
    },
    topRow: {
        height: 44,
        marginHorizontal: Space.xxl,
        marginBottom: Space.xxl,
        position: 'relative',
    },
    titleLayer: {
        ...StyleSheet.absoluteFillObject,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    searchLayer: {
        ...StyleSheet.absoluteFillObject,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Space.md,
    },
    mainTitle: S.display,
    iconGroup: {
        flexDirection: 'row',
        gap: Space.sm,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: Radius.xl,
        backgroundColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
    },
    inputPill: {
        flex: 1,
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfacePale,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        paddingHorizontal: Space.md,
        gap: Space.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: Type.sizeBody,
        color: Colors.textPrimary,
        paddingVertical: 0,
        height: 40,
    },
    cancelBtn: {
        paddingHorizontal: Space.xs,
        paddingVertical: 4,
    },
    cancelText: {
        fontSize: Type.sizeBody,
        fontWeight: Type.weightMedium,
        color: Colors.brand,
    },
    categoriesScroll: {
        flexDirection: 'row',
        paddingHorizontal: Space.xxl,
        marginBottom: Space.sm,
    },
    categoryPill: {
        paddingHorizontal: Space.xl,
        paddingVertical: 10,
        borderRadius: Radius.pill,
        backgroundColor: Colors.surfaceMuted,
        marginRight: Space.sm,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
    },
    activePill: {
        backgroundColor: Colors.activeChip,
        borderColor: Colors.activeChip,
    },
    categoryText: {
        fontSize: Type.sizeBodySm,
        fontWeight: Type.weightSemibold,
        color: Colors.textPrimary,
    },
    activeCategoryText: {
        color: Colors.white,
    },
});