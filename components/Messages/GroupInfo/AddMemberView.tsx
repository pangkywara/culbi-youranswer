import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, MagnifyingGlass } from 'react-native-phosphor';

import { Colors } from '@/constants/style';
import { useGroupManagement } from '@/hooks/useGroupManagement';
import { useUserSearch } from '@/hooks/useUserSearch';

import { SearchUserRow } from './SearchUserRow';
import { styles } from './styles';

interface AddMemberViewProps {
  groupId: string;
  existingMemberIds: string[];
  onBack: () => void;
  onRefresh?: () => Promise<void>;
}

export function AddMemberView({
  groupId,
  existingMemberIds,
  onBack,
  onRefresh,
}: AddMemberViewProps) {
  const { query, results, loading: searching, setQuery, clear } = useUserSearch();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { loading: adding, error, addMembers } = useGroupManagement(groupId);

  const existingSet = new Set(existingMemberIds);
  const filteredResults = results.filter((u) => !existingSet.has(u.id));

  const toggleUser = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    const ok = await addMembers(Array.from(selected));
    if (ok) {
      clear();
      setSelected(new Set());
      await onRefresh?.();
      onBack();
    }
  };

  const canAdd = selected.size > 0 && !adding;

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
        <Text style={styles.title}>Add Members</Text>
      </View>

      {/* Search input */}
      <View style={styles.inputRow}>
        <MagnifyingGlass size={18} color={Colors.textSecondary} weight="bold" />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or username"
          placeholderTextColor={Colors.textTertiary}
          autoFocus
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Results */}
      <FlatList
        data={filteredResults}
        keyExtractor={(u) => u.id}
        style={styles.resultList}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          query.length >= 2 && !searching ? (
            <Text style={styles.emptyText}>No users found</Text>
          ) : query.length < 2 ? (
            <Text style={styles.hintText}>Type at least 2 characters to search</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <SearchUserRow
            user={item}
            selected={selected.has(item.id)}
            onPress={() => toggleUser(item.id)}
          />
        )}
      />

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {/* CTA */}
      <TouchableOpacity
        onPress={handleAdd}
        disabled={!canAdd}
        style={[styles.ctaBtn, !canAdd && styles.ctaBtnDisabled]}
        activeOpacity={0.8}
      >
        {adding ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <Text style={styles.ctaBtnText}>
            {selected.size > 0
              ? `Add ${selected.size} ${selected.size === 1 ? 'member' : 'members'}`
              : 'Select members'}
          </Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}
