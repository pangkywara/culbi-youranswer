import React, { useState } from 'react';
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import {
  Globe,
  Lock,
  PencilSimple,
  UserPlus,
  Users,
  X,
} from 'react-native-phosphor';

import { Colors } from '@/constants/style';
import { useGroupManagement } from '@/hooks/useGroupManagement';
import type { GroupConversation, GroupMember } from '@/types/chat';

import { MemberRow } from './MemberRow';
import { styles } from './styles';

interface InfoViewProps {
  group: GroupConversation | null;
  members: GroupMember[];
  currentUserId: string;
  isAdmin: boolean;
  adminCount: number;
  onClose: () => void;
  onEdit: () => void;
  onAddMember: () => void;
  onRefresh?: () => Promise<void>;
}

export function InfoView({
  group,
  members,
  currentUserId,
  isAdmin,
  adminCount,
  onClose,
  onEdit,
  onAddMember,
  onRefresh,
}: InfoViewProps) {
  const { loading: mutating, error, removeMember } = useGroupManagement(group?.id ?? '');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (userId: string) => {
    setRemovingId(userId);
    const ok = await removeMember(userId);
    setRemovingId(null);
    if (ok) await onRefresh?.();
  };

  return (
    <>
      {/* Header */}
      <View style={styles.header}>
        <Users size={20} color={Colors.brand} weight="bold" />
        <Text style={styles.title}>Group Info</Text>
        {isAdmin && (
          <TouchableOpacity onPress={onEdit} style={styles.iconBtn} hitSlop={12}>
            <PencilSimple size={18} color={Colors.brand} weight="bold" />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
          <X size={18} color={Colors.textPrimary} weight="bold" />
        </TouchableOpacity>
      </View>

      {/* Group metadata */}
      {group && (
        <View style={styles.metaSection}>
          {group.avatarUrl ? (
            <Image source={{ uri: group.avatarUrl }} style={styles.groupAvatar} />
          ) : (
            <View style={styles.groupAvatarFallback}>
              <Text style={styles.groupAvatarInitials}>
                {group.name.slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.groupName}>{group.name}</Text>
          {group.description ? (
            <Text style={styles.groupDescription}>{group.description}</Text>
          ) : null}
          <Text style={styles.memberCountLabel}>
            {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
          </Text>
          {/* Visibility badge */}
          <View style={styles.visBadge}>
            {group.visibility === 'public'
              ? <Globe size={12} color={Colors.brand} weight="bold" />
              : <Lock size={12} color={Colors.textSecondary} weight="bold" />}
            <Text style={[
              styles.visText,
              { color: group.visibility === 'public' ? Colors.brand : Colors.textSecondary },
            ]}>
              {group.visibility === 'public' ? 'Public' : 'Private'}
            </Text>
          </View>
        </View>
      )}

      {/* Error */}
      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {/* Members section header */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Members</Text>
        {isAdmin && (
          <TouchableOpacity onPress={onAddMember} style={styles.addMemberBtn} hitSlop={12}>
            <UserPlus size={16} color={Colors.brand} weight="bold" />
            <Text style={styles.addMemberText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isSelf = item.userId === currentUserId;
          // Don't show remove on the last admin, or on yourself (leave is separate)
          const canRemove =
            isAdmin && !isSelf && !(item.role === 'admin' && adminCount <= 1);
          return (
            <MemberRow
              member={item}
              isCurrentUser={isSelf}
              canRemove={canRemove}
              isRemoving={removingId === item.userId}
              onRemove={() => handleRemove(item.userId)}
            />
          );
        }}
      />
    </>
  );
}
