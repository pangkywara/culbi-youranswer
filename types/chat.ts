export type ReplyTarget = {
  text?: string;
  imageUri?: string;
  isUser: boolean;
  /** Display name of the sender being replied to (used in group chat previews) */
  senderName?: string;
};

/** A direct message hydrated for display in the chat UI. */
export interface DirectMessageUI {
  id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  imageUrl: string | null;
  replyToId: string | null;
  readAt: string | null;
  createdAt: string;
  /** Derived: true when senderId === current user's id */
  isCurrentUser: boolean;
  /** Sender's display name (joined from profiles) */
  senderName?: string;
  /** Sender's avatar URL (joined from profiles) */
  senderAvatar?: string | null;
}

/** Other participant's profile info shown in the chat header */
export interface DMParticipant {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

/** Conversation category used for inbox filtering */
export type ConversationCategory = 'All' | 'Traveling' | 'Support' | 'Bridge';

/** Type of conversation row rendered in the Bridge inbox */
export type ConversationItemType = 'bot' | 'user' | 'support';

/** A single inbox row — either the AI Liaison stub or a real DB conversation */
export interface ConversationListItem {
  /** For DB conversations this is the `direct_conversations.id` UUID.
   *  For the AI Liaison stub it is `'ai-liaison'`. */
  id: string;
  title: string;
  lastMessage: string;
  /** Subtitle shown under the last-message snippet */
  dateRange: string;
  time: string;
  type: ConversationItemType;
  isGroup: boolean;
  /** Remote avatar URI. `undefined` = use initials fallback, `'logo'` = app logo */
  avatar?: string | 'logo';
  category: ConversationCategory;
}

// ─────────────────────────────────────────────────────────────────────────────
// Group Chat types
// ─────────────────────────────────────────────────────────────────────────────

/** A group message hydrated for display in the group chat UI. */
export interface GroupMessageUI {
  id: string;
  groupId: string;
  senderId: string;
  content: string | null;
  imageUrl: string | null;
  replyToId: string | null;
  createdAt: string;
  /** Derived: true when senderId === current user's id */
  isCurrentUser: boolean;
  /** Sender's display name (joined from profiles) */
  senderName?: string;
  /** Sender's avatar URL (joined from profiles) */
  senderAvatar?: string | null;
}

/** Group conversation metadata shown in the chat header */
export interface GroupConversation {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  createdBy: string;
  memberCount: number;
  visibility: 'public' | 'private';
}

/** A single group member entry */
export interface GroupMember {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'admin' | 'member';
}