import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Keyboard,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CaretLeft, Users } from 'react-native-phosphor';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useGroupMessages } from '@/hooks/useGroupMessages';

import { ChatMessage } from '@/components/Messages/ChatMessage';
import { GroupInfoSheet } from '@/components/Messages/GroupInfoSheet';
import { ImageModal } from '@/components/Messages/Image/ImageModal';
import { ChatInput } from '@/components/Messages/Input/ChatInput';
import type { GroupMessageUI, ReplyTarget } from '@/types/chat';

export default function GroupChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: groupId } = useLocalSearchParams<{ id: string }>();

  // ── Auth guard ─────────────────────────────────────────────────────────────
  const { session, isAnonymous, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!session || isAnonymous) router.replace('/onboarding');
  }, [authLoading, session, isAnonymous, router]);

  // ── Group data ─────────────────────────────────────────────────────────────
  const currentUserId = session?.user?.id ?? '';
  const {
    messages, group, members, loading, sending, error,
    sendMessage, loadMore, hasMore, refreshGroupAndMembers,
  } = useGroupMessages(groupId ?? '', currentUserId);

  // ── Keyboard animation ─────────────────────────────────────────────────────
  const flatListRef = useRef<FlatList>(null);
  const keyboardOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardOffset, {
        toValue: e.endCoordinates.height - (Platform.OS === 'ios' ? insets.bottom : 0),
        duration: Platform.OS === 'ios' ? e.duration : 200,
        useNativeDriver: false,
      }).start();
    });
    const hide = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? e.duration : 200,
        useNativeDriver: false,
      }).start();
    });
    return () => { show.remove(); hide.remove(); };
  }, [insets.bottom, keyboardOffset]);

  // ── Local state ────────────────────────────────────────────────────────────
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [infoVisible, setInfoVisible] = useState(false);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));
  }, []);

  // ── Render item ────────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item, index }: { item: GroupMessageUI; index: number }) => {
      const prev = messages[index - 1];
      const next = messages[index + 1];
      const isFirstInGroup = !prev || prev.senderId !== item.senderId;
      const isLastInGroup = !next || next.senderId !== item.senderId;
      return (
        <View style={{ marginBottom: isLastInGroup ? 16 : 2 }}>
          <ChatMessage
            message={item}
            showSenderName={isFirstInGroup}
            showAvatar
            onReply={setReplyTo}
            onImagePress={setSelectedImage}
          />
        </View>
      );
    },
    [messages],
  );

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (authLoading || !session || isAnonymous) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#222" />
      </View>
    );
  }

  if (!groupId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Invalid group conversation.</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />

        {/* ── Header ────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <CaretLeft size={26} color="#000" weight="regular" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {group?.name ?? 'Group Chat'}
            </Text>
            <View style={styles.statusRow}>
              <Users size={11} color="#8E8E93" weight="bold" />
              <Text style={styles.statusText}>
                {group ? `${group.memberCount} members` : ''}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.detailsBtn} onPress={() => setInfoVisible(true)}>
            <Text style={styles.detailsText}>Details</Text>
          </TouchableOpacity>
        </View>

        {/* ── Error banner ──────────────────────────────────────────────── */}
        {!!error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <Animated.View style={[styles.body, { marginBottom: keyboardOffset }]}>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#222" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="interactive"
              onContentSizeChange={scrollToBottom}
              windowSize={8}
              maxToRenderPerBatch={8}
              updateCellsBatchingPeriod={50}
              initialNumToRender={20}
              removeClippedSubviews
              ListHeaderComponent={
                hasMore
                  ? <Text style={styles.loadMore} onPress={loadMore}>Load earlier messages</Text>
                  : <Text style={styles.dateSeparator}>Beginning of conversation</Text>
              }
              ListEmptyComponent={
                <Text style={styles.emptyText}>No messages yet. Say hello! 👋</Text>
              }
            />
          )}

          <ChatInput
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            onSend={(text) => sendMessage(text)}
            isLoading={sending}
          />
        </Animated.View>

        {/* ── Image viewer ─────────────────────────────────────────────── */}
        <ImageModal
          uri={selectedImage}
          isVisible={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          onReply={(target) => { setSelectedImage(null); setReplyTo(target); }}
        />

        {/* ── Group info sheet ─────────────────────────────────────────── */}
        <GroupInfoSheet
          visible={infoVisible}
          group={group}
          members={members}
          currentUserId={currentUserId}
          onClose={() => setInfoVisible(false)}
          onRefresh={refreshGroupAndMembers}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  body: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header — mirrors direct-message screen
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFF',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#000' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  statusText: { fontSize: 12, color: '#8E8E93' },
  detailsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  detailsText: { fontSize: 13, fontWeight: '600' },

  // List
  listContent: { paddingBottom: 12, paddingTop: 8 },
  dateSeparator: {
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '600',
    marginVertical: 24,
    letterSpacing: 0.5,
  },
  loadMore: {
    textAlign: 'center',
    color: '#007AFF',
    fontSize: 13,
    paddingVertical: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#717171',
    fontSize: 14,
    marginTop: 40,
  },

  // Error
  errorText: { fontSize: 14, color: '#FF3B30' },
  errorBanner: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#FFD966',
  },
  errorBannerText: { fontSize: 13, color: '#856404', textAlign: 'center' },
});
