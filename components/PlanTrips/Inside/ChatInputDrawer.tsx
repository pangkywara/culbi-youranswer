/**
 * ChatInputDrawer.tsx
 * Optimized for dynamic height and keyboard-reactive layouts.
 */

import { Colors, Radius, S, Space, Type } from '@/constants/style';
import type { ReplyTarget } from '@/types/chat';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowBendUpLeft,
  ArrowUp,
  Camera,
  Images,
  PencilSimple,
  Plus,
  X,
} from 'react-native-phosphor';

export interface AttachedImage {
  uri: string;
  base64: string;
  mime: string;
}

interface ChatInputProps {
  replyTo?: ReplyTarget | null;
  onCancelReply?: () => void;
  onSend?: (text: string) => void;
  isLoading?: boolean;
  pendingEdit?: string | null;
  onEditConsumed?: () => void;
  isEditing?: boolean;
  onCancelEdit?: () => void;
  attachedImage?: AttachedImage | null;
  onImagePicked?: (image: AttachedImage) => void;
  onClearImage?: () => void;
}

export const ChatInput = ({
  replyTo,
  onCancelReply,
  onSend,
  isLoading,
  pendingEdit,
  onEditConsumed,
  isEditing,
  onCancelEdit,
  attachedImage,
  onImagePicked,
  onClearImage,
}: ChatInputProps) => {
  const [value, setValue] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (pendingEdit != null) {
      setValue(pendingEdit);
      onEditConsumed?.();
    }
  }, [pendingEdit, onEditConsumed]);

  const toggleAttachMenu = () => {
    const toValue = showAttachMenu ? 0 : 1;
    Animated.spring(menuAnim, { 
      toValue, 
      useNativeDriver: true, 
      tension: 120, 
      friction: 8 
    }).start();
    setShowAttachMenu(v => !v);
  };

  const closeAttachMenu = () => {
    Animated.timing(menuAnim, { 
      toValue: 0, 
      duration: 150, 
      useNativeDriver: true 
    }).start(() => setShowAttachMenu(false));
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if ((!trimmed && !attachedImage) || isLoading) return;
    onSend?.(trimmed);
    setValue('');
  };

  const _pickFromResult = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    if (!asset.base64) return;
    onImagePicked?.({ 
      uri: asset.uri, 
      base64: asset.base64, 
      mime: asset.mimeType ?? 'image/jpeg' 
    });
    closeAttachMenu();
  };

  const handlePickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission needed', 'Library access required.');
    const result = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ['images'], 
      quality: 0.7, 
      base64: true 
    });
    _pickFromResult(result);
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission needed', 'Camera access required.');
    const result = await ImagePicker.launchCameraAsync({ 
      mediaTypes: ['images'], 
      quality: 0.7, 
      base64: true 
    });
    _pickFromResult(result);
  };

  const canSend = (value.trim().length > 0 || !!attachedImage) && !isLoading;

  return (
    <View style={styles.outerContainer}>
      {/* ── Context Previews (Reply / Edit) ── */}
      {(isEditing || replyTo || attachedImage) && (
        <View style={styles.previewSection}>
          {isEditing && (
            <View style={styles.previewCard}>
              <PencilSimple size={14} weight="bold" color={Colors.textSecondary} />
              <Text style={styles.previewText}>Editing message</Text>
              <TouchableOpacity onPress={onCancelEdit}><X size={16} color={Colors.textSecondary}/></TouchableOpacity>
            </View>
          )}
          {replyTo && !isEditing && (
            <View style={styles.previewCard}>
              <ArrowBendUpLeft size={14} weight="bold" color={Colors.textSecondary} />
              <Text style={styles.previewText} numberOfLines={1}>
                Replying to {replyTo.senderName || 'AI'}
              </Text>
              <TouchableOpacity onPress={onCancelReply}><X size={16} color={Colors.textSecondary}/></TouchableOpacity>
            </View>
          )}
          {attachedImage && (
            <View style={styles.imageChip}>
              <Image source={{ uri: attachedImage.uri }} style={styles.chipImg} />
              <Pressable onPress={onClearImage} style={styles.chipRemove}>
                <X size={10} color={Colors.white} />
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* ── Attach Menu (Floating above input) ── */}
      {showAttachMenu && (
        <Animated.View 
          style={[
            styles.attachMenu, 
            { 
              opacity: menuAnim, 
              transform: [{ 
                translateY: menuAnim.interpolate({ 
                  inputRange: [0, 1], 
                  outputRange: [20, 0] 
                }) 
              }] 
            }
          ]}
        >
          <TouchableOpacity style={styles.attachOption} onPress={handlePickFromLibrary}>
            <Images size={20} color={Colors.textPrimary} />
            <Text style={styles.attachText}>Library</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachOption} onPress={handleTakePhoto}>
            <Camera size={20} color={Colors.textPrimary} />
            <Text style={styles.attachText}>Camera</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── Input Bar ── */}
      <View style={styles.inputWrapper}>
        <TouchableOpacity 
          style={[styles.circleBtn, showAttachMenu && styles.activeBtn]} 
          onPress={toggleAttachMenu}
        >
          <Plus 
            size={22} 
            color={showAttachMenu ? Colors.brand : Colors.textPrimary} 
            weight="bold" 
          />
        </TouchableOpacity>

        <TextInput
          placeholder="Message Culbi..."
          style={styles.input}
          multiline
          value={value}
          onChangeText={setValue}
          editable={!isLoading}
          placeholderTextColor={Colors.textTertiary}
          // Important for Android responsiveness
          textAlignVertical="center"
        />

        <TouchableOpacity 
          style={[
            styles.sendBtn, 
            { backgroundColor: canSend ? Colors.brand : Colors.surfaceMuted }
          ]} 
          onPress={handleSend}
          disabled={!canSend}
        >
          <ArrowUp 
            size={22} 
            color={canSend ? Colors.white : Colors.textTertiary} 
            weight="bold" 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
outerContainer: { 
    backgroundColor: Colors.white, 
    paddingTop: 4,
    paddingBottom: 0, 
  },
  previewSection: { 
    paddingHorizontal: 20, 
    marginBottom: Space.sm, 
    gap: 8 
  },
  previewCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Colors.surfaceMuted, 
    padding: 10, 
    borderRadius: Radius.md, 
    gap: 8 
  },
  previewText: { 
    flex: 1, 
    fontSize: 13, 
    color: Colors.textSecondary 
  },
  imageChip: { 
    width: 56, 
    height: 56, 
    borderRadius: Radius.md, 
    overflow: 'hidden', 
    marginLeft: 4 
  },
  chipImg: { 
    width: '100%', 
    height: '100%' 
  },
  chipRemove: { 
    position: 'absolute', 
    top: 4, 
    right: 4, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    borderRadius: 10, 
    padding: 2 
  },
  attachMenu: { 
    position: 'absolute', 
    bottom: 70, // Sits above the input bar
    left: 20, 
    backgroundColor: Colors.white, 
    borderRadius: Radius.lg, 
    padding: 4, 
    elevation: 10, 
    shadowOpacity: 0.12, 
    shadowRadius: 10,
    zIndex: 1000, 
    borderWidth: 1, 
    borderColor: Colors.borderSubtle 
  },
  attachOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12, 
    gap: 12 
  },
  attachText: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: Colors.textPrimary 
  },
inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    paddingHorizontal: 16, 
    gap: 10,
    marginBottom: 0, 
  },
  input: { 
    flex: 1, 
    borderRadius: 24, 
    paddingHorizontal: 18, 
    paddingTop: Platform.OS === 'ios' ? 12 : 8, 
    paddingBottom: Platform.OS === 'ios' ? 12 : 8, 
    fontSize: 16, 
    maxHeight: 120,
    color: Colors.textPrimary,
  },
  circleBtn: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: Colors.surfaceMuted 
  },
  activeBtn: { 
    backgroundColor: `${Colors.brand}15`, 
    borderColor: Colors.brand, 
    borderWidth: 1 
  },
  sendBtn: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
});