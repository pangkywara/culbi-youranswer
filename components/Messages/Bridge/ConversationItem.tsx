/**
 * components/Messages/Bridge/ConversationItem.tsx
 *
 * A single row in the Bridge inbox list.  Handles three visual variants:
 *   • bot   — AI Liaison, uses local chatbot.webp asset + verified badge
 *   • user  — regular DM conversation, shows remote avatar or initial fallback
 */

import { Colors, Space, Type } from '@/constants/style';
import type { ConversationListItem } from '@/types/chat';
import React, { memo } from 'react';
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { ShieldCheck } from 'react-native-phosphor';

interface ConversationItemProps {
    item: ConversationListItem;
    onPress: (item: ConversationListItem) => void;
}

export const ConversationItem = memo(function ConversationItem({
    item,
    onPress,
}: ConversationItemProps) {
    return (
        <TouchableOpacity
            style={[
                styles.messageItem,
                item.type === 'bot' && styles.botItemHighlight,
            ]}
            onPress={() => onPress(item)}
        >
            {/* ── Avatar ── */}
            <View style={styles.avatarContainer}>
                {item.type === 'bot' ? (
                    <View style={[styles.logoAvatar, { backgroundColor: '#d1d1d1' }]}>
                        <Image
                            source={require('@/assets/images/chatbot.webp')}
                            style={{ width: 70, height: 70 }}
                            resizeMode="contain"
                        />
                        <View style={styles.verifiedBadge}>
                            <ShieldCheck size={14} color="#FFF" weight="fill" />
                        </View>
                    </View>
                ) : item.avatar === 'logo' ? (
                    <View style={[styles.logoAvatar, { backgroundColor: '#222' }]}>
                        <Text style={styles.logoText}>A</Text>
                    </View>
                ) : item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                ) : (
                    // Initials fallback when no avatar
                    <View style={[styles.logoAvatar, { backgroundColor: Colors.border }]}>
                        <Text style={styles.logoText}>
                            {item.title.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}
            </View>

            {/* ── Content ── */}
            <View style={styles.contentContainer}>
                <View style={styles.textHeader}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                        {item.title}
                    </Text>
                    <Text style={styles.timeText}>{item.time}</Text>
                </View>
                <Text style={styles.lastMessage} numberOfLines={1}>
                    {item.lastMessage}
                </Text>
                <Text style={styles.dateSubtext}>{item.dateRange}</Text>
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    messageItem: {
        flexDirection: 'row',
        paddingHorizontal: Space.xxl,
        paddingVertical: Space.lg,
        alignItems: 'center',
    },
    botItemHighlight: {
        backgroundColor: Colors.surfaceSoft,
    },
    avatarContainer: {
        marginRight: Space.lg,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.border,
    },
    logoAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    logoText: {
        color: Colors.white,
        fontSize: Type.sizeH3,
        fontWeight: Type.weightBold,
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: Colors.textPrimary,
        borderRadius: 10,
        padding: 2,
        borderWidth: 2,
        borderColor: Colors.white,
    },
    contentContainer: {
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: Colors.surfaceMuted,
        paddingBottom: Space.lg,
    },
    textHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    itemTitle: {
        fontSize: Type.sizeTitle,
        fontWeight: Type.weightSemibold,
        color: Colors.textPrimary,
        flex: 1,
        marginRight: Space.sm,
    },
    timeText: {
        fontSize: Type.sizeCaption,
        color: Colors.textSecondary,
    },
    lastMessage: {
        fontSize: Type.sizeBodySm,
        color: Colors.textPrimary,
        marginBottom: 2,
    },
    dateSubtext: {
        fontSize: Type.sizeCaption,
        color: Colors.textSecondary,
    },
});
