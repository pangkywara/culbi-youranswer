import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Plus, X } from 'react-native-phosphor';
import { Colors, Type, Space, Radius } from '@/constants/style';
import { modalStyles } from './_styles';

// ─── Public payload type (used by callers) ────────────────────────────────────

export interface NewTripPayload {
  name: string;
  dateRange: string;
  description: string;
  privacy: 'private' | 'public';
}

interface NewTripModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (payload: NewTripPayload) => void;
}

export const NewTripModal = ({ visible, onClose, onAdd }: NewTripModalProps) => {
  const [name,        setName]        = useState('');
  const [dateRange,   setDateRange]   = useState('');
  const [description, setDescription] = useState('');
  const [isPublic,    setIsPublic]    = useState(false);

  const reset = () => {
    setName('');
    setDateRange('');
    setDescription('');
    setIsPublic(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({
      name:        name.trim(),
      dateRange:   dateRange.trim() || 'TBD',
      description: description.trim(),
      privacy:     isPublic ? 'public' : 'private',
    });
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView
        style={modalStyles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[modalStyles.sheet, s.sheetPad]}>
          <View style={modalStyles.handle} />

          {/* Header */}
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>New trip</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <X size={20} color={Colors.textPrimary} weight="bold" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.scrollContent}
          >
            {/* Trip name */}
            <View style={modalStyles.fieldGroup}>
              <Text style={modalStyles.fieldLabel}>Trip name *</Text>
              <TextInput
                style={modalStyles.input}
                placeholder="e.g. Sarawak Cultural Expedition"
                placeholderTextColor={Colors.textTertiary}
                value={name}
                onChangeText={setName}
                autoFocus
                returnKeyType="next"
              />
            </View>

            {/* Dates */}
            <View style={modalStyles.fieldGroup}>
              <Text style={modalStyles.fieldLabel}>
                Dates{' '}
                <Text style={s.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={modalStyles.input}
                placeholder="e.g. Mar 12 – 15, 2026 · 4 days"
                placeholderTextColor={Colors.textTertiary}
                value={dateRange}
                onChangeText={setDateRange}
                returnKeyType="next"
              />
            </View>

            {/* Description */}
            <View style={modalStyles.fieldGroup}>
              <Text style={modalStyles.fieldLabel}>
                Description{' '}
                <Text style={s.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={[modalStyles.input, s.multiline]}
                placeholder="What's this trip about?"
                placeholderTextColor={Colors.textTertiary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                returnKeyType="done"
              />
            </View>

            {/* Privacy toggle */}
            <View style={s.toggleRow}>
              <View style={s.toggleText}>
                <Text style={s.toggleLabel}>Make visible to all</Text>
                <Text style={s.toggleSub}>Anyone with the link can view this trip.</Text>
              </View>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ false: Colors.borderSubtle, true: Colors.brand }}
                thumbColor={Colors.white}
              />
            </View>
          </ScrollView>

          {/* CTA */}
          <TouchableOpacity
            style={[modalStyles.addBtn, !name.trim() && modalStyles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!name.trim()}
            activeOpacity={0.85}
          >
            <Plus size={16} color={Colors.white} weight="bold" />
            <Text style={modalStyles.addBtnText}>Create trip</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const s = StyleSheet.create({
  sheetPad: {
    paddingBottom: Platform.OS === 'ios' ? 8 : Space.xl,
  },
  scrollContent: {
    gap: Space.xs,
    paddingBottom: Space.lg,
  },
  optional: {
    fontWeight: Type.weightNormal,
    color: Colors.textTertiary,
    fontSize: Type.sizeCaption,
  },
  multiline: {
    height: 80,
    paddingTop: Space.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Space.sm,
    paddingHorizontal: Space.lg,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.card,
    gap: Space.md,
    marginTop: Space.xs,
  },
  toggleText: { flex: 1, gap: 2 },
  toggleLabel: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
  },
  toggleSub: {
    fontSize: Type.sizeCaption,
    color: Colors.textTertiary,
  },
});