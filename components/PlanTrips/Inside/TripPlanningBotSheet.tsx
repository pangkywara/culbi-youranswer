import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  Pressable,
  Modal,
  Dimensions,
  Keyboard,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'react-native-phosphor';

import { ChatMessage } from '@/components/Messages/ChatbotMessage';
import { ChatInput, type AttachedImage } from './ChatInputDrawer';
import { ImageModal } from '@/components/Messages/Image/ImageModal';
import { type ReplyTarget } from '@/components/Messages/Bubbles/MessageBubblesBot';
import { useGeminiChat } from '@/hooks/useGeminiChat';
import { Colors } from '@/constants/style';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Height Config ───
const BASE_HEIGHT = SCREEN_HEIGHT * 0.60;
const COMPACT_HEIGHT = SCREEN_HEIGHT * 0.48;
const DURATION = 300;
const CLEAN_EASING = Easing.out(Easing.cubic);
const KB_EASING = Easing.bezier(0.25, 0.1, 0.25, 1.0);

export const TripPlanningBotSheet = ({ trip, visible, onClose }: any) => {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const keyboardHeight = useSharedValue(0);
  const sheetHeight = useSharedValue(BASE_HEIGHT);
  const inputPadding = useSharedValue(insets.bottom + 12);

  const [showModal, setShowModal] = useState(visible);

  const {
    messages, isTyping, isSending, sendMessage,
    clearPendingEdit, pendingEdit, isEditing, cancelEdit,
  } = useGeminiChat(trip.id);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);

  // ─── Keyboard listeners ───────────────────────────────────────────────────
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const duration = Platform.OS === 'ios' ? e.duration : 250;
      const kbHeight = e.endCoordinates.height;
      keyboardHeight.value = kbHeight;

      sheetHeight.value = withTiming(COMPACT_HEIGHT, { duration, easing: KB_EASING });
      inputPadding.value = withTiming(
        Platform.OS === 'ios' ? 8 : 12,
        { duration, easing: KB_EASING }
      );

      if (Platform.OS === 'ios') {
        translateY.value = withTiming(-kbHeight, { duration, easing: KB_EASING });
      }
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      const duration = Platform.OS === 'ios' ? e.duration : 250;
      keyboardHeight.value = 0;

      sheetHeight.value = withTiming(BASE_HEIGHT, { duration, easing: KB_EASING });
      inputPadding.value = withTiming(insets.bottom + 12, { duration, easing: KB_EASING });

      if (Platform.OS === 'ios') {
        translateY.value = withTiming(0, { duration, easing: KB_EASING });
      }
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [insets.bottom]);

  // ─── Sheet open / close animation ────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      setShowModal(true);
      backdropOpacity.value = withTiming(1, { duration: DURATION });
      translateY.value = withTiming(0, { duration: DURATION, easing: CLEAN_EASING });
    } else {
      backdropOpacity.value = withTiming(0, { duration: DURATION });
      translateY.value = withTiming(
        SCREEN_HEIGHT,
        { duration: DURATION, easing: CLEAN_EASING },
        (finished) => { if (finished) runOnJS(setShowModal)(false); }
      );
    }
  }, [visible]);

  // ─── Pan-to-dismiss gesture ───────────────────────────────────────────────
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((e) => {
          if (e.translationY > 0) translateY.value = e.translationY;
        })
        .onEnd((e) => {
          if (e.translationY > 150 || e.velocityY > 600) {
            translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 }, () =>
              runOnJS(onClose)()
            );
          } else {
            translateY.value = withTiming(0, { duration: 250, easing: CLEAN_EASING });
          }
        }),
    [onClose]
  );

  // ─── Animated styles ──────────────────────────────────────────────────────
  const sheetStyle = useAnimatedStyle(() => ({
    height: sheetHeight.value,
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const inputContainerStyle = useAnimatedStyle(() => ({
    paddingBottom: inputPadding.value,
  }));

  // ─── Send handler ─────────────────────────────────────────────────────────
  const handleSendMessage = useCallback(
    (text: string) => {
      if (!text.trim() && !attachedImage) return;
      sendMessage(text, replyTo, trip);
      setReplyTo(null);
      setAttachedImage(null);
    },
    [attachedImage, replyTo, sendMessage, trip]
  );

  if (!showModal) return null;

  return (
    <Modal transparent visible={showModal} animationType="none" onRequestClose={onClose}>
      <View style={styles.container}>

        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View style={[styles.sheet, sheetStyle]}>

          {/* Drag handle */}
          <GestureDetector gesture={panGesture}>
            <View style={styles.dragZone}>
              <View style={styles.handle} />
            </View>
          </GestureDetector>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Culbi Planner</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {trip.trip_name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={15}>
              <X size={22} color={Colors.textPrimary} weight="bold" />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <View style={{ flex: 1 }}>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <ChatMessage
                  {...item}
                  onImagePress={(uri) => setSelectedImage(uri)}
                  onReply={(t) => setReplyTo(t)}
                  existingTripId={trip.id}
                />
              )}
            />
          </View>

          {/* Input */}
          <Animated.View style={[styles.inputContainer, inputContainerStyle]}>
            {isTyping && (
              <Text style={styles.typingText}>Culbi is thinking...</Text>
            )}
            <ChatInput
              onSend={handleSendMessage}
              isLoading={isSending}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              pendingEdit={pendingEdit}
              onCancelEdit={cancelEdit}
              isEditing={isEditing}
              onEditConsumed={clearPendingEdit}
              attachedImage={attachedImage}
              onImagePicked={(img: any) => setAttachedImage(img)}
              onClearImage={() => setAttachedImage(null)}
            />
          </Animated.View>

        </Animated.View>

        <ImageModal
          uri={selectedImage}
          isVisible={!!selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    width: '100%',
    overflow: 'hidden',
  },
  dragZone: {
    width: '100%',
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    opacity: 0.4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  headerLeft: { flex: 1 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  inputContainer: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    paddingTop: 10,
  },
  typingText: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginLeft: 24,
    marginBottom: 4,
    fontStyle: 'italic',
  },
});