import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  InteractionManager,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LottieView from 'lottie-react-native';

import { AddPersonModal } from '@/components/Messages/Bridge/AddPersonModal';
import { BridgeHeader } from '@/components/Messages/Bridge/BridgeHeader';
import { ConversationItem } from '@/components/Messages/Bridge/ConversationItem';
import { CreateGroupSheet } from '@/components/Messages/Bridge/CreateGroupSheet';
import { Colors, S } from '@/constants/style';
import { useAuth } from '@/context/AuthContext';
import { useConversations } from '@/hooks/useConversations';
import { useMessageSearch } from '@/hooks/useMessageSearch';
import type { ConversationCategory, ConversationListItem } from '@/types/chat';
import { BridgeSkeleton } from '@/components/UI/Skeleton';
import ChatIconAnimation from '@/assets/lottie-assets/chat-icon-peoples.json';

export default function BridgeScreen() {
  const router = useRouter();
  const { session, isAnonymous } = useAuth();

  const currentUserId = (!isAnonymous && session?.user?.id) ? session.user.id : '';

  const { items, loading, refresh } = useConversations(currentUserId);

  const [activeCategory, setActiveCategory] = useState<ConversationCategory>('All');

  // ── Search state ────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);

  const { results: msgSearchResults, loading: msgSearchLoading } = useMessageSearch(
    searchQuery,
    currentUserId,
  );
  const [addPersonVisible, setAddPersonVisible] = useState(false);
  const [createGroupVisible, setCreateGroupVisible] = useState(false);

  const handleSearchOpen = useCallback(() => setSearchVisible(true), []);
  const handleSearchClose = useCallback(() => {
    setSearchVisible(false);
    setSearchQuery('');
  }, []);

  const handleConversationReady = useCallback(
    (convId: string) => {
      setAddPersonVisible(false);
      refresh();
      router.push({ pathname: '/chat/[id]', params: { id: convId } });
    },
    [router, refresh],
  );

  const handleGroupReady = useCallback(
    (groupId: string) => {
      setCreateGroupVisible(false);
      refresh();
      router.push({ pathname: '/groupchat/[id]', params: { id: groupId } });
    },
    [router, refresh],
  );

  const handleNewGroup = useCallback(() => {
    setAddPersonVisible(false);
    setCreateGroupVisible(true);
  }, []);

  const [isReady, setIsReady] = useState(false);
  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        setIsReady(true);
        refresh();
      });
      return () => task.cancel();
    }, [refresh]),
  );

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.trim();

    if (q.length >= 2) {
      const base =
        activeCategory === 'All'
          ? items
          : items.filter((i) => i.category === activeCategory);

      const ql = q.toLowerCase();
      const localMatches = base.filter(
        (i) =>
          i.title.toLowerCase().includes(ql) ||
          i.lastMessage.toLowerCase().includes(ql),
      );

      const localIds = new Set(localMatches.map((i) => i.id));
      const msgExtras = msgSearchResults.filter((r) => !localIds.has(r.id));

      return [...localMatches, ...msgExtras];
    }

    return activeCategory === 'All'
      ? items
      : items.filter((i) => i.category === activeCategory);
  }, [items, activeCategory, searchQuery, msgSearchResults]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const handlePressMessage = useCallback(
    (item: ConversationListItem) => {
      if (item.id === 'ai-liaison') {
        router.push('/chatbot/chatbot');
        return;
      }
      if (item.isGroup) {
        router.push({ pathname: '/groupchat/[id]', params: { id: item.id } });
        return;
      }
      router.push({ pathname: '/chat/[id]', params: { id: item.id } });
    },
    [router],
  );

  const handleCompose = useCallback(() => setAddPersonVisible(true), []);

  // ── Render helpers ──────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: ConversationListItem }) => (
      <ConversationItem item={item} onPress={handlePressMessage} />
    ),
    [handlePressMessage],
  );

  return (
    <View style={styles.container}>
      <BridgeHeader
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        onSearchQueryChange={setSearchQuery}
        searchVisible={searchVisible}
        onSearchOpen={handleSearchOpen}
        onSearchClose={handleSearchClose}
        onCompose={handleCompose}
      />

      {isReady && (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          removeClippedSubviews
          ListEmptyComponent={
            loading || msgSearchLoading ? (
              <BridgeSkeleton />
            ) : (
              <View style={styles.emptyContainer}>
                <LottieView
                  source={ChatIconAnimation}
                  autoPlay
                  loop={false}
                  style={styles.lottie}
                />
                <Text style={styles.emptyText}>
                  {searchQuery.trim().length >= 2
                    ? 'No messages found for your search.'
                    : 'No conversations yet.'}
                </Text>
              </View>
            )
          }
        />
      )}

      {!isReady && <BridgeSkeleton />}

      <AddPersonModal
        visible={addPersonVisible}
        onClose={() => setAddPersonVisible(false)}
        onConversationReady={handleConversationReady}
        onNewGroup={handleNewGroup}
      />

      <CreateGroupSheet
        visible={createGroupVisible}
        onClose={() => setCreateGroupVisible(false)}
        onGroupReady={handleGroupReady}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: S.screen,
  listContent: { paddingBottom: 100 },
  loader: { marginTop: 40 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  lottie: {
    width: 150,
    height: 150,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: 10,
    fontSize: 14,
  },
});