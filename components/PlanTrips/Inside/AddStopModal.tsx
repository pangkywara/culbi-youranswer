import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Plus, X } from 'react-native-phosphor';
import { Colors } from '@/constants/style';
import { modalStyles } from './_styles';

interface AddStopModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (stop: any) => void;
}

export const AddStopModal = ({ visible, onClose, onAdd }: AddStopModalProps) => {
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({
      landmark: {
        name: name.trim(),
        thumbnail_url:
          imageUrl.trim() ||
          'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=200&q=70',
        rarity_weight: Math.random() * 0.6 + 0.1,
        latitude: 0,
        longitude: 0,
        sign_count: 0,
      },
    });
    setName('');
    setImageUrl('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView
        style={modalStyles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />

          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Add a stop</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={20} color={Colors.textPrimary} weight="bold" />
            </TouchableOpacity>
          </View>

          <View style={modalStyles.fieldGroup}>
            <Text style={modalStyles.fieldLabel}>Landmark name *</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="e.g. Semenggoh Wildlife Centre"
              placeholderTextColor={Colors.textTertiary}
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </View>

          <View style={modalStyles.fieldGroup}>
            <Text style={modalStyles.fieldLabel}>Image URL (optional)</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="https://..."
              placeholderTextColor={Colors.textTertiary}
              value={imageUrl}
              onChangeText={setImageUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          <TouchableOpacity
            style={[modalStyles.addBtn, !name.trim() && modalStyles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!name.trim()}
            activeOpacity={0.85}
          >
            <Plus size={16} color={Colors.white} weight="bold" />
            <Text style={modalStyles.addBtnText}>Add stop</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};