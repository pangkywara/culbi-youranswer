import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Plus, X, UserPlus, CheckCircle, WarningCircle } from 'react-native-phosphor';
import { Colors, Type, Space, Radius, Shadows } from '@/constants/style';
import { useUserSearch } from '@/hooks/useUserSearch';
import type { UserSearchResult } from '@/types/database';

interface CollaboratorsSectionProps {
  collaborators: string[];
  onAdd: (email: string) => void;
  onRemove: (email: string) => void;
}

export const CollaboratorsSection = ({
  collaborators,
  onAdd,
  onRemove,
}: CollaboratorsSectionProps) => {
  const [input, setInput] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const { results, loading, setQuery, clear } = useUserSearch();

  const handleInputChange = (text: string) => {
    setInput(text);
    setQuery(text);
    setSelectedUser(null);
  };

  const handleSelectUser = (user: UserSearchResult) => {
    setSelectedUser(user);
    setInput(user.username || user.full_name || user.id);
    clear();
  };

  const handleAdd = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    
    // Use username or full_name as the display identifier (human-readable)
    const userIdentifier = selectedUser?.username || selectedUser?.full_name || trimmed;
    
    if (collaborators.includes(userIdentifier)) {
      // Already added
      setInput('');
      setSelectedUser(null);
      return;
    }
    
    // Only add if we have a verified user
    if (selectedUser) {
      onAdd(userIdentifier);
      setInput('');
      setSelectedUser(null);
      clear();
    }
  };

  const showValidation = input.trim().length >= 2 && !loading;
  const isValid = selectedUser !== null;
  const showDropdown = results.length > 0 && input.trim().length >= 2 && !selectedUser;

  return (
    <View style={s.wrapper}>
      <View style={s.labelRow}>
        <Text style={s.label}>COLLABORATORS</Text>
        <Text style={s.optional}>optional</Text>
      </View>

      {/* Tags */}
      {collaborators.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tags}
        >
          {collaborators.map((c) => (
            <View key={c} style={s.tag}>
              <Text style={s.tagText} numberOfLines={1}>{c}</Text>
              <TouchableOpacity onPress={() => onRemove(c)} hitSlop={6}>
                <X size={12} color={Colors.textSecondary} weight="bold" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Input row with validation */}
      <View>
        <View style={s.inputRow}>
          <UserPlus size={18} color={Colors.textTertiary} style={s.inputIcon} />
          <TextInput
            style={s.input}
            placeholder="Search by name or username"
            placeholderTextColor={Colors.textTertiary}
            value={input}
            onChangeText={handleInputChange}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          {/* Loading indicator */}
          {loading && (
            <ActivityIndicator size="small" color={Colors.brand} style={s.indicator} />
          )}
          
          {/* Validation icon */}
          {showValidation && !loading && (
            isValid ? (
              <CheckCircle size={20} color={Colors.brand} weight="fill" />
            ) : (
              <WarningCircle size={20} color={Colors.destructive} weight="fill" />
            )
          )}
          
          {/* Add button */}
          {input.trim().length > 0 && isValid && (
            <TouchableOpacity onPress={handleAdd} style={s.addBtn} hitSlop={8}>
              <Plus size={16} color={Colors.white} weight="bold" />
            </TouchableOpacity>
          )}
        </View>

        {/* Autocomplete dropdown */}
        {showDropdown && (
          <View style={s.dropdown}>
            {results.map((user) => (
              <TouchableOpacity
                key={user.id}
                style={s.dropdownItem}
                onPress={() => handleSelectUser(user)}
                activeOpacity={0.7}
              >
                {/* Avatar */}
                <View style={s.avatarContainer}>
                  {user.avatar_url ? (
                    <Image source={{ uri: user.avatar_url }} style={s.avatar} />
                  ) : (
                    <View style={[s.avatar, s.avatarPlaceholder]}>
                      <Text style={s.avatarText}>
                        {(user.full_name || user.username || '?')[0].toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                
                {/* User info */}
                <View style={s.userInfo}>
                  <Text style={s.userName} numberOfLines={1}>
                    {user.full_name || user.username || 'Unknown User'}
                  </Text>
                  {user.username && (
                    <Text style={s.userUsername} numberOfLines={1}>
                      @{user.username}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Validation message */}
        {showValidation && !loading && !isValid && results.length === 0 && (
          <Text style={s.errorText}>No user found with this name or username</Text>
        )}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  wrapper: { gap: Space.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  label: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightSemibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  optional: {
    fontSize: Type.sizeSmall,
    color: Colors.textTertiary,
  },
  tags: {
    flexDirection: 'row',
    gap: Space.sm,
    paddingVertical: Space.xs,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
    backgroundColor: Colors.surfacePale,
    borderRadius: Radius.full,
    paddingHorizontal: Space.md,
    paddingVertical: Space.xs + 1,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: 180,
  },
  tagText: {
    fontSize: Type.sizeSmall,
    fontWeight: Type.weightMedium,
    color: Colors.textBody,
    flexShrink: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Space.md,
    gap: Space.sm,
  },
  inputIcon: { opacity: 0.5 },
  input: {
    flex: 1,
    paddingVertical: Space.md,
    fontSize: Type.sizeBody,
    color: Colors.textPrimary,
  },
  indicator: {
    marginLeft: Space.xs,
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.level1,
  },
  dropdown: {
    marginTop: Space.xs,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.level2,
    maxHeight: 240,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Space.md,
    gap: Space.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  avatarContainer: {
    width: 40,
    height: 40,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: Type.sizeBody,
    fontWeight: Type.weightBold,
    color: Colors.white,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: Type.sizeBody,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
  },
  userUsername: {
    fontSize: Type.sizeSmall,
    color: Colors.textSecondary,
  },
  errorText: {
    marginTop: Space.xs,
    fontSize: Type.sizeSmall,
    color: Colors.destructive,
    paddingHorizontal: Space.xs,
  },
});
