import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { MagnifyingGlass, Gear } from 'react-native-phosphor';
import { Colors, Type, Space, S } from '@/constants/style';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface BridgeMessage {
  id: string;
  title: string;
  lastMessage: string;
  subtitle: string;
  time: string;
  avatar: string | 'logo';
  isGroup: boolean;
  unread?: boolean;
}

// ─── 1. Header ───────────────────────────────────────────────────────────────
interface BridgeHeaderProps {
  onSearch?: () => void;
  onSettings?: () => void;
}

export const BridgeHeader = ({ onSearch, onSettings }: BridgeHeaderProps) => (
  <View style={styles.headerContainer}>
    <View style={styles.titleRow}>
      <Text style={styles.mainTitle}>Messages</Text>
      <View style={styles.iconGroup}>
        <Pressable
          onPress={onSearch}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Search messages"
        >
          <MagnifyingGlass size={20} color={Colors.textBody} weight="bold" />
        </Pressable>
        <Pressable
          onPress={onSettings}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Gear size={20} color={Colors.textBody} weight="bold" />
        </Pressable>
      </View>
    </View>
  </View>
);

// ─── 2. Category Pills ────────────────────────────────────────────────────────
interface CategoryPillsProps {
  categories: string[];
  active: string;
  onSelect: (cat: string) => void;
}

export const CategoryPills = ({ categories, active, onSelect }: CategoryPillsProps) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.pillsContent}
    style={styles.pillsScroll}
  >
    {categories.map((cat) => {
      const isActive = cat === active;
      return (
        <Pressable
          key={cat}
          onPress={() => onSelect(cat)}
          style={({ pressed }) => [
            styles.pill,
            isActive && styles.pillActive,
            pressed && !isActive && styles.pillPressed,
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected: isActive }}
        >
          <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
            {cat}
          </Text>
        </Pressable>
      );
    })}
  </ScrollView>
);

// ─── 3. Message Item ──────────────────────────────────────────────────────────
interface MessageItemProps {
  item: BridgeMessage;
  onPress?: () => void;
}

export const MessageItem = ({ item, onPress }: MessageItemProps) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.messageItem, pressed && styles.messageItemPressed]}
    accessibilityRole="button"
  >
    <View style={styles.avatarWrapper}>
      {item.avatar === 'logo' ? (
        <View style={styles.logoBubble}>
          <Text style={styles.logoInitial}>A</Text>
        </View>
      ) : (
        <Image source={{ uri: item.avatar }} style={S.avatarSm} />
      )}
      {item.unread && <View style={S.unreadDot} />}
    </View>

    <View style={styles.messageBody}>
      <View style={styles.messageTop}>
        <Text style={styles.messageTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.messageTime}>{item.time}</Text>
      </View>
      <Text
        style={[styles.messagePreview, item.unread && styles.messagePreviewUnread]}
        numberOfLines={1}
      >
        {item.lastMessage}
      </Text>
      <Text style={styles.messageSubtext} numberOfLines={1}>{item.subtitle}</Text>
    </View>
  </Pressable>
);

// ─── 4. Section Divider ───────────────────────────────────────────────────────
export const SectionDivider = () => <View style={styles.divider} />;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Header
  headerContainer: {
    paddingHorizontal: Space.xl,
    paddingBottom: Space.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Space.xl,
  },
  mainTitle: {
    fontSize: Type.sizeH1,
    fontWeight: Type.weight700,
    color: Colors.textBody,
    fontFamily: 'Inter',
  },
  iconGroup: {
    flexDirection: 'row',
    gap: Space.sm,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceBase,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderWarm,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  iconButtonPressed: {
    backgroundColor: Colors.surfaceRaised,
  },

  // Category Pills
  pillsScroll: { marginBottom: Space.xs },
  pillsContent: {
    paddingHorizontal: Space.xl,
    gap: Space.sm,
  },
  pill: {
    paddingHorizontal: Space.lg,
    paddingVertical: 9,
    borderRadius: 28,
    backgroundColor: Colors.surfaceBase,
    borderWidth: 1,
    borderColor: Colors.borderWarm,
  },
  pillActive: {
    backgroundColor: Colors.textBodyWarm,
    borderColor: Colors.textBodyWarm,
  },
  pillPressed: {
    backgroundColor: Colors.surfaceRaised,
  },
  pillText: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightMedium,
    color: Colors.textBodyWarm,
    fontFamily: 'Inter',
  },
  pillTextActive: {
    color: Colors.surfaceBase,
  },

  // Message Item
  messageItem: {
    flexDirection: 'row',
    paddingHorizontal: Space.xl,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.surfaceBase,
  },
  messageItemPressed: {
    backgroundColor: Colors.surfaceRaised,
  },
  avatarWrapper: {
    marginRight: 14,
    position: 'relative',
  },
  logoBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.textBodyWarm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInitial: {
    color: Colors.surfaceBase,
    fontSize: 22,
    fontWeight: Type.weight700,
    fontFamily: 'Inter',
  },
  messageBody: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderWarm,
    paddingBottom: 14,
  },
  messageTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  messageTitle: {
    fontSize: Type.sizeBody,
    fontWeight: Type.weightSemibold,
    color: Colors.textBody,
    flex: 1,
    marginRight: Space.sm,
    fontFamily: 'Inter',
  },
  messageTime: {
    fontSize: Type.sizeCaption,
    color: Colors.textTertiary,
    fontFamily: 'Inter',
  },
  messagePreview: {
    fontSize: Type.sizeBodySm,
    color: Colors.textTertiary,
    marginBottom: 2,
    fontFamily: 'Inter',
  },
  messagePreviewUnread: {
    color: Colors.textBody,
    fontWeight: Type.weightMedium,
  },
  messageSubtext: {
    fontSize: Type.sizeCaption,
    color: Colors.textTertiary,
    fontFamily: 'Inter',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.borderWarm,
    marginHorizontal: Space.xl,
  },
});
