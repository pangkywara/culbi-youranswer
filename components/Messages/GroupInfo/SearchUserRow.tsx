import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';

import type { UserSearchResult } from '@/types/database';

import { styles } from './styles';

interface SearchUserRowProps {
  user: UserSearchResult;
  selected: boolean;
  onPress: () => void;
}

export const SearchUserRow = React.memo(function SearchUserRow({
  user,
  selected,
  onPress,
}: SearchUserRowProps) {
  const initials = (user.full_name ?? user.username ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <TouchableOpacity style={styles.userRow} onPress={onPress} activeOpacity={0.7}>
      {user.avatar_url ? (
        <Image source={{ uri: user.avatar_url }} style={styles.userAvatar} />
      ) : (
        <View style={[styles.userAvatar, styles.userAvatarFallback]}>
          <Text style={styles.userAvatarText}>{initials}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.memberName}>{user.full_name ?? user.username}</Text>
        {user.username ? (
          <Text style={styles.usernameText}>@{user.username}</Text>
        ) : null}
      </View>
      <View style={[styles.checkCircle, selected && styles.checkCircleFilled]}>
        {selected && <Text style={styles.checkMark}>✓</Text>}
      </View>
    </TouchableOpacity>
  );
});
