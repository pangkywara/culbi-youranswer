import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const THRESHOLD = 60;

interface Props {
  text?: string;
  imageUri?: string;
  isUser: boolean;
  onReply: () => void;
  onImagePress: (uri: string) => void;
  // Note: isEditable, onEdit, and onCopy are intentionally omitted per your request
}

export const MessageBubble = ({ text, imageUri, isUser, onReply, onImagePress }: Props) => {
  const swipeX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      // User swipes left (negative), Bot swipes right (positive)
      const move = isUser ? Math.min(0, e.translationX) : Math.max(0, e.translationX);
      swipeX.value = move;
    })
    .onEnd(() => {
      if (Math.abs(swipeX.value) > THRESHOLD) {
        runOnJS(onReply)();
      }
      swipeX.value = withTiming(0, { duration: 200 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeX.value }],
  }));

  return (
    <View style={[styles.container, isUser ? styles.alignRight : styles.alignLeft]}>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.bubble,
            isUser ? styles.userBubble : styles.botBubble,
            animatedStyle
          ]}
        >
          {text && (
            <Text style={[styles.text, isUser ? styles.userText : styles.botText]}>
              {text}
            </Text>
          )}
          {imageUri && (
            <TouchableOpacity
              onPress={() => onImagePress(imageUri)}
              style={styles.imageMargin}
              activeOpacity={0.9}
            >
              <Image source={{ uri: imageUri }} style={styles.messageImage} />
            </TouchableOpacity>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Container handles the alignment and width constraints
    maxWidth: '100%',
  },
  alignRight: {
    alignSelf: 'flex-end'
  },
  alignLeft: {
    alignSelf: 'flex-start'
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  // Dark style for User (matches your established UI)
  userBubble: {
    backgroundColor: '#222',
    borderBottomRightRadius: 4
  },
  // Light style with border for Bot
  botBubble: {
    backgroundColor: '#F2F2F7',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E5EA'
  },
  text: {
    fontSize: 16,
    lineHeight: 22
  },
  userText: {
    color: '#FFF'
  },
  botText: {
    color: '#000'
  },
  imageMargin: {
    marginTop: 4
  },
  messageImage: {
    width: 220,
    height: 160,
    borderRadius: 12
  },
});