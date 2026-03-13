import React from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet, TouchableOpacity, ActionSheetIOS, Alert, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard'; // Assuming Expo, or use react-native-clipboard
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS, interpolate } from 'react-native-reanimated';
import { ArrowBendUpLeft } from 'react-native-phosphor';
import { MarkdownText } from './MarkdownText';

export type ReplyTarget = {
  text?: string;
  imageUri?: string;
  isUser: boolean;
};

interface MessageBubbleProps {
  text?: string;
  imageUri?: string;
  isUser: boolean;
  isTyping?: boolean;
  isEditable?: boolean;
  onImagePress: (uri: string) => void;
  onReply: (target: ReplyTarget) => void;
  onEdit?: () => void;
  onCopy?: () => void;
  replyTo?: ReplyTarget;
}

const THRESHOLD = 60;

export const MessageBubble = ({ text, imageUri, isUser, isTyping, isEditable, onImagePress, onReply, onEdit, onCopy, replyTo }: MessageBubbleProps) => {
  const swipeX = useSharedValue(0);
  

  const handleReply = () => onReply({ text, imageUri, isUser });

  const handleLongPress = () => {
    const options = isEditable ? ['Cancel', 'Copy', 'Edit'] : ['Cancel', 'Copy'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: 0 }, (idx) => {
        if (idx === 1) { Clipboard.setStringAsync(text ?? ''); onCopy?.(); }
        if (idx === 2 && isEditable) onEdit?.();
      });
    } else {
      Alert.alert('', undefined, [
        { text: 'Copy', onPress: () => { Clipboard.setStringAsync(text ?? ''); onCopy?.(); } },
        ...(isEditable ? [{ text: 'Edit', onPress: () => onEdit?.() }] : []),
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      const move = isUser ? Math.min(0, e.translationX) : Math.max(0, e.translationX);
      swipeX.value = move;
    })
    .onEnd(() => {
      if (Math.abs(swipeX.value) > THRESHOLD) runOnJS(handleReply)();
      swipeX.value = withTiming(0, { duration: 200 });
    });

  const longPressGesture = Gesture.LongPress().minDuration(420).onStart(() => { runOnJS(handleLongPress)(); });
  const composedGesture = Gesture.Simultaneous(panGesture, longPressGesture);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: swipeX.value }] }));

  const iconStyle = useAnimatedStyle(() => {
    const absX = Math.abs(swipeX.value);
    const opacity = interpolate(absX, [0, THRESHOLD * 0.5, THRESHOLD], [0, 0, 1]);
    const scale = interpolate(absX, [0, THRESHOLD], [0.5, 1]);
    const translateX = isUser 
      ? interpolate(swipeX.value, [-THRESHOLD, 0], [0, 30]) 
      : interpolate(swipeX.value, [0, THRESHOLD], [-30, 0]);

    return { opacity, transform: [{ translateX }, { scale }], [isUser ? 'right' : 'left']: -35 };
  });

  return (
    <View style={[styles.container, isUser ? styles.alignRight : styles.alignLeft]}>
      <Animated.View style={[styles.replyIcon, iconStyle]}>
        <ArrowBendUpLeft size={20} color="#8E8E93" weight="bold" />
      </Animated.View>

      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble, animatedStyle]}>
          {replyTo && (
            <View style={[styles.quoteCard, { backgroundColor: isUser ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <View style={[styles.quoteBar, { backgroundColor: isUser ? '#FFF' : '#AAA' }]} />
              <View style={styles.quoteContent}>
                <Text style={[styles.quoteFrom, { color: isUser ? '#FFF' : '#666' }]}>{replyTo.isUser ? 'You' : 'AI'}</Text>
                <Text style={[styles.quoteText, { color: isUser ? '#EEE' : '#444' }]} numberOfLines={1}>{replyTo.text || '📷 Photo'}</Text>
              </View>
            </View>
          )}
          {isTyping ? (
            <ActivityIndicator size="small" color="#717171" />
          ) : (
            <>
              {text && (isUser ? <Text style={styles.userText}>{text}</Text> : <MarkdownText isUser={false}>{text}</MarkdownText>)}
              {imageUri && (
                <TouchableOpacity onPress={() => onImagePress(imageUri)} style={styles.imageMargin}>
                  <Image source={{ uri: imageUri }} style={styles.messageImage} />
                </TouchableOpacity>
              )}
            </>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { maxWidth: '85%', position: 'relative' },
  alignRight: { alignSelf: 'flex-end' },
  alignLeft: { alignSelf: 'flex-start' },
  replyIcon: { position: 'absolute', top: '35%', width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  userBubble: { backgroundColor: '#222', borderBottomRightRadius: 4 },
  botBubble: { backgroundColor: '#F2F2F7', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E5E5EA' },
  userText: { color: '#FFF', fontSize: 16, lineHeight: 22 },
  imageMargin: { marginTop: 4 },
  messageImage: { width: 220, height: 160, borderRadius: 12 },
  quoteCard: { flexDirection: 'row', borderRadius: 8, marginBottom: 6, overflow: 'hidden' },
  quoteBar: { width: 3 },
  quoteContent: { flex: 1, padding: 6 },
  quoteFrom: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  quoteText: { fontSize: 13, opacity: 0.8 },
});