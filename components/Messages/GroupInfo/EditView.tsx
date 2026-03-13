import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, Globe, Lock } from 'react-native-phosphor';

import { Colors } from '@/constants/style';
import { useGroupManagement } from '@/hooks/useGroupManagement';
import type { GroupConversation } from '@/types/chat';

import { styles } from './styles';

const NAME_MAX = 64;

interface EditViewProps {
  group: GroupConversation;
  onBack: () => void;
  onRefresh?: () => Promise<void>;
}

export function EditView({ group, onBack, onRefresh }: EditViewProps) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? '');
  const [isPublic, setIsPublic] = useState(group.visibility === 'public');
  const { loading, error, clearError, updateGroup } = useGroupManagement(group.id);

  const canSave = name.trim().length > 0 && name.trim().length <= NAME_MAX;

  const handleSave = async () => {
    const ok = await updateGroup(name, description, isPublic ? 'public' : 'private');
    if (ok) {
      await onRefresh?.();
      onBack();
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.iconBtn} hitSlop={12}>
          <ArrowLeft size={20} color={Colors.textPrimary} weight="bold" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Group</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!canSave || loading}
          style={[styles.saveBtn, (!canSave || loading) && styles.saveBtnDisabled]}
          hitSlop={8}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.editContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar placeholder (read-only for now) */}
        <View style={styles.avatarSection}>
          {group.avatarUrl ? (
            <Image source={{ uri: group.avatarUrl }} style={styles.editAvatar} />
          ) : (
            <View style={[styles.editAvatarFallback]}>
              <Text style={styles.editAvatarInitials}>
                {(name || group.name).slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.infoBlock}>
          {/* Group name */}
          <View style={styles.nameRow}>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={(t) => {
                clearError();
                setName(t);
              }}
              placeholder="Group name"
              placeholderTextColor={Colors.textTertiary}
              maxLength={NAME_MAX}
              returnKeyType="next"
              autoFocus
            />
            <Text style={styles.charCount}>{name.length}/{NAME_MAX}</Text>
          </View>

          {/* Description */}
          <TextInput
            style={styles.descInput}
            value={description}
            onChangeText={(t) => {
              clearError();
              setDescription(t);
            }}
            placeholder="Add a description (optional)"
            placeholderTextColor={Colors.textTertiary}
            multiline
            returnKeyType="done"
            blurOnSubmit
          />
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {/* Privacy toggle */}
        <View style={styles.privacyRow}>
          <View style={[
            styles.privacyIconWrap,
            { backgroundColor: isPublic ? '#EBF1FD' : Colors.surfaceMuted },
          ]}>
            {isPublic
              ? <Globe size={18} color={Colors.brand} weight="bold" />
              : <Lock size={18} color={Colors.textSecondary} weight="bold" />}
          </View>
          <View style={styles.privacyInfo}>
            <Text style={styles.privacyTitle}>
              {isPublic ? 'Public group' : 'Private group'}
            </Text>
            <Text style={styles.privacyDesc}>
              {isPublic ? 'Anyone can discover and join' : 'Only invited members can join'}
            </Text>
          </View>
          <View style={styles.privacyPill}>
            <TouchableOpacity
              style={[
                styles.privacyOption,
                !isPublic && styles.privacyOptionActive,
              ]}
              onPress={() => setIsPublic(false)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.privacyOptionText,
                !isPublic && styles.privacyOptionTextActive,
              ]}>Private</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.privacyOption,
                isPublic && styles.privacyOptionActive,
              ]}
              onPress={() => setIsPublic(true)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.privacyOptionText,
                isPublic && styles.privacyOptionTextActive,
              ]}>Public</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
