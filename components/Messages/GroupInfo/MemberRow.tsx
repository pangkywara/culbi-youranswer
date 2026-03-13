import React from 'react';
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from 'react-native';
import { Trash } from 'react-native-phosphor';

import { Colors } from '@/constants/style';
import type { GroupMember } from '@/types/chat';

import { styles } from './styles';

interface MemberRowProps {
  member: GroupMember;
  isCurrentUser: boolean;
  canRemove: boolean;
  isRemoving: boolean;
  onRemove: () => void;
}

export const MemberRow = React.memo(function MemberRow({
  member,
  isCurrentUser,
  canRemove,
  isRemoving,
  onRemove,
}: MemberRowProps) {
  const initials = member.displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View style={styles.memberRow}>
      {member.avatarUrl ? (
        <Image source={{ uri: member.avatarUrl }} style={styles.memberAvatar} />
      ) : (
        <View style={styles.memberAvatarFallback}>
          <Text style={styles.memberInitials}>{initials}</Text>
        </View>
      )}
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>
          {member.displayName}
          {isCurrentUser ? ' (You)' : ''}
        </Text>
        {member.role === 'admin' && <Text style={styles.adminBadge}>Admin</Text>}
      </View>
      {canRemove && (
        <TouchableOpacity
          onPress={onRemove}
          disabled={isRemoving}
          style={styles.removeBtn}
          hitSlop={8}
        >
          {isRemoving ? (
            <ActivityIndicator size="small" color={Colors.destructive} />
          ) : (
            <Trash size={17} color={Colors.destructive} weight="bold" />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
});
