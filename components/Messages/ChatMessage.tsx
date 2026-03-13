import type { DirectMessageUI, GroupMessageUI, ReplyTarget } from '@/types/chat';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { MessageBubble } from './Bubbles/MessageBubble';

/** Accepts either a DM or a group message — only the shared fields are used. */
type AnyMessage = DirectMessageUI | GroupMessageUI;

interface Props {
  message: AnyMessage;
  /** Show sender name at the top of a new group block */
  showSenderName?: boolean;
  /** Show read receipt below the last message in a current-user block (DM only) */
  showReadReceipt?: boolean;
  /** When true, render an avatar column left of incoming messages (group mode) */
  showAvatar?: boolean;
  onReply: (target: ReplyTarget) => void;
  onImagePress: (uri: string) => void;
}

export const ChatMessage = ({
  message,
  showSenderName,
  showReadReceipt,
  showAvatar = false,
  onReply,
  onImagePress,
}: Props) => {
  const { isCurrentUser, senderName, content, imageUrl, createdAt } = message;
  const readAt = (message as DirectMessageUI).readAt ?? null;
  const senderAvatar = message.senderAvatar ?? null;

  const timeLabel = new Date(createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  /** Two-letter initials fallback */
  const initials = senderName
    ? senderName
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('')
    : '?';

  return (
    <View style={[
      styles.wrapper,
      isCurrentUser ? styles.userWrapper : styles.otherWrapper,
    ]}>
      {/* Avatar column — only for incoming messages in group chat */}
      {!isCurrentUser && showAvatar && (
        <View style={styles.avatarCol}>
          {showSenderName ? (
            senderAvatar ? (
              <Image source={{ uri: senderAvatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )
          ) : (
            /* Spacer keeps bubble aligned when avatar is hidden */
            <View style={styles.avatarSpacer} />
          )}
        </View>
      )}

      <View style={styles.bubbleCol}>
        {/* Sender name + timestamp */}
        {!isCurrentUser && senderName && showSenderName && (
          <Text style={[styles.senderHeader, showAvatar && styles.senderHeaderGroup]}>
            {senderName} • {timeLabel}
          </Text>
        )}

        <MessageBubble
          text={content ?? undefined}
          imageUri={imageUrl ?? undefined}
          isUser={isCurrentUser}
          onReply={() =>
            onReply({ text: content ?? undefined, imageUri: imageUrl ?? undefined, isUser: isCurrentUser, senderName })
          }
          onImagePress={onImagePress}
        />

        {/* Read receipt — DM only, last message in the current-user's block */}
        {isCurrentUser && showReadReceipt && (
          <Text style={styles.readBy}>
            {readAt ? 'Read' : 'Delivered'}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  otherWrapper: {
    justifyContent: 'flex-start',
  },
  avatarCol: {
    marginRight: 6,
    alignSelf: 'flex-end',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  avatarFallback: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#DDDDE0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555',
  },
  avatarSpacer: {
    width: 30,
  },
  bubbleCol: {
    flexShrink: 1,
    maxWidth: '80%',
  },
  senderHeader: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
    fontWeight: '500',
    marginLeft: 8,
  },
  senderHeaderGroup: {
    marginLeft: 2,
  },
  readBy: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
    marginRight: 8,
    textAlign: 'right',
  },
});