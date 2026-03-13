import React, { useEffect, useState, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  StatusBar,
  Keyboard,
  Animated,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, ClockCounterClockwise } from 'react-native-phosphor';
import * as Location from 'expo-location';
import { ChatMessage } from '@/components/Messages/ChatbotMessage';
import { ChatInput, type AttachedImage } from '@/components/Messages/Input/ChatInput';
import { ImageModal } from '@/components/Messages/Image/ImageModal';
import { ChatHistoryDrawer } from '@/components/Messages/ChatHistoryDrawer';
import { TripPlanFormSheet } from '@/components/Messages/TripPlanFormSheet';
import { type ReplyTarget } from '@/components/Messages/Bubbles/MessageBubblesBot';
import { useGeminiChat } from '@/hooks/useGeminiChat';

export default function ChatScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const keyboardOffset = useRef(new Animated.Value(0)).current;

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [replyTo,        setReplyTo]       = useState<ReplyTarget | null>(null);
  const [historyOpen,    setHistoryOpen]   = useState(false);
  const [planFormOpen,   setPlanFormOpen]  = useState(false);
  const [attachedImage,  setAttachedImage] = useState<AttachedImage | null>(null);

  const {
    messages, isTyping, isSending, error, sendMessage,
    sessions, switchSession, newSession, currentSessionId,
    editLastMessage, pendingEdit, clearPendingEdit,
    isEditing, cancelEdit,
  } = useGeminiChat();

  // ── Request GPS location (with user consent) on mount ──────────────────
  useEffect(() => {
    (async () => {
      const { status: existing } = await Location.getForegroundPermissionsAsync();
      let finalStatus = existing;

      if (existing !== 'granted') {
        // Show a rationale before the system dialog
        await new Promise<void>(resolve => {
          Alert.alert(
            'Share your location?',
            'Culbi can give you hyper-local recommendations and find places near you when you share your GPS location. You can deny and it still works great!',
            [
              { text: 'Not now', style: 'cancel', onPress: () => resolve() },
              {
                text: 'Share location',
                onPress: async () => {
                  const { status } = await Location.requestForegroundPermissionsAsync();
                  finalStatus = status;
                  resolve();
                },
              },
            ]
          );
        });
      }

      if (finalStatus !== 'granted') return;
    })();
  }, []);

  const lastUserMessageId = [...messages].reverse().find(m => m.isUser && !m.isTyping)?.id ?? null;

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      // On iOS keyboardWillShow gives us the animation duration/curve
      // We subtract insets.bottom because the keyboard frame overlaps the safe area
      const keyboardHeight = e.endCoordinates.height - (Platform.OS === 'ios' ? insets.bottom : 0);
      Animated.timing(keyboardOffset, {
        toValue: keyboardHeight,
        duration: Platform.OS === 'ios' ? e.duration : 200,
        useNativeDriver: false,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? e.duration : 200,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [insets.bottom]);

  const handleReply = (target: ReplyTarget) => setReplyTo(target);
  const handleSend = (text: string) => {
    const currentReply = replyTo;
    setReplyTo(null);
    setAttachedImage(null);
    sendMessage(text, currentReply);
  };
  const handleEdit = () => editLastMessage();

  const chatData = [
    ...messages,
    ...(isTyping ? [{ id: 'typing', isUser: false, isTyping: true, time: '' }] : []),
  ];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <CaretLeft size={26} color="#000" weight="regular" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>AI Assistant</Text>
            <View style={styles.statusRow}>
              <View style={[styles.onlineDot, isSending && styles.onlineDotBusy]} />
              <Text style={styles.statusText}>{isSending ? 'Typing…' : 'Online'}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.backBtn} onPress={() => setHistoryOpen(true)}>
            <ClockCounterClockwise size={24} color="#000" weight="regular" />
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Animated container — shifts up when keyboard appears, back down when dismissed */}
        <Animated.View style={[styles.body, { marginBottom: keyboardOffset }]}>
          <FlatList
            ref={flatListRef}
            data={chatData}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatMessage
                {...item}
                isEditable={item.isUser && item.id === lastUserMessageId && !isSending}
                onImagePress={(uri: string) => setSelectedImage(uri)}
                onReply={handleReply}
                onEdit={handleEdit}
                onCopy={() => {}}
                showPlanButton={item.id === 'welcome'}
                onPlanTrip={() => setPlanFormOpen(true)}
              />
            )}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={<Text style={styles.dateSeparator}>Today</Text>}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
            keyboardDismissMode="interactive"
            style={styles.list}
            removeClippedSubviews
            windowSize={8}
            maxToRenderPerBatch={8}
            updateCellsBatchingPeriod={50}
            initialNumToRender={15}
          />

          <ChatInput
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            onSend={handleSend}
            isLoading={isSending}
            pendingEdit={pendingEdit}
            onEditConsumed={clearPendingEdit}
            isEditing={isEditing}
            onCancelEdit={cancelEdit}
            attachedImage={attachedImage}
            onImagePicked={setAttachedImage}
            onClearImage={() => setAttachedImage(null)}
          />
        </Animated.View>

        <ImageModal
          uri={selectedImage}
          isVisible={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          onReply={(target: ReplyTarget) => {
            setSelectedImage(null);
            setReplyTo(target);
          }}
        />

        <ChatHistoryDrawer
          visible={historyOpen}
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={switchSession}
          onNewSession={newSession}
          onClose={() => setHistoryOpen(false)}
        />

        <TripPlanFormSheet
          visible={planFormOpen}
          onClose={() => setPlanFormOpen(false)}
          onSubmit={(msg) => {
            setPlanFormOpen(false);
            sendMessage(msg, null);
          }}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#FFFFFF' },
  body:       { flex: 1 },
  list:       { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFF',
  },
  backBtn:              { width: 40, height: 40, justifyContent: 'center' },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle:          { fontSize: 16, fontWeight: '700', color: '#000' },
  statusRow:            { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  onlineDot:            { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34C759', marginRight: 4 },
  onlineDotBusy:        { backgroundColor: '#FF9500' },
  statusText:           { fontSize: 12, color: '#8E8E93' },
  listContent:          { paddingBottom: 12, paddingTop: 8 },
  dateSeparator: {
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '600',
    marginVertical: 24,
    letterSpacing: 0.5,
  },
  errorBanner: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#FFD966',
  },
  errorText: { fontSize: 13, color: '#856404', textAlign: 'center' },
});