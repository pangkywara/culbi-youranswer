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
  /** Currently attached image (controlled by parent) */
  attachedImage?: AttachedImage | null;
  /** Called when the user picks a photo from library or camera */
  onImagePicked?: (image: AttachedImage) => void;
  /** Called when the user removes the attached image thumbnail */
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

  const handleChange = useCallback((t: string) => setValue(t), []);

  useEffect(() => {
    if (pendingEdit != null) {
      setValue(pendingEdit);
      onEditConsumed?.();
    }
  }, [pendingEdit, onEditConsumed]);

  // Animate attach menu open/close
  const toggleAttachMenu = () => {
    const toValue = showAttachMenu ? 0 : 1;
    Animated.spring(menuAnim, {
      toValue,
      useNativeDriver: true,
      tension: 120,
      friction: 8,
    }).start();
    setShowAttachMenu(v => !v);
  };

  const closeAttachMenu = () => {
    Animated.timing(menuAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setShowAttachMenu(false));
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if ((!trimmed && !attachedImage) || isLoading) return;
    onSend?.(trimmed); // pass empty string when only image — bubble shows image without text
    setValue('');
  };

  const handleCancelEdit = () => {
    setValue('');
    onCancelEdit?.();
  };

  // ── Image picking helpers ──────────────────────────────────────────────────

  const _pickFromResult = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    if (!asset.base64) return;
    const mime = asset.mimeType ?? 'image/jpeg';
    onImagePicked?.({ uri: asset.uri, base64: asset.base64, mime });
    closeAttachMenu();
  };

  const handlePickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
      allowsEditing: false,
    });
    _pickFromResult(result);
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your camera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });
    _pickFromResult(result);
  };

  const canSend = (value.trim().length > 0 || !!attachedImage) && !isLoading;

  const menuTranslateY = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });
  const menuOpacity = menuAnim;

  return (
    <View style={styles.outerContainer}>
      {/* ── EDIT INDICATOR ───────────────────────────────────────────────── */}
      {isEditing && (
        <View style={styles.replyPreviewContainer}>
          <View style={styles.replyContentCard}>
            <View style={styles.replyHeader}>
              <View style={styles.replyLabelRow}>
                <PencilSimple size={14} color={Colors.textPrimary} weight="bold" />
                <Text style={styles.replyTitle}>Editing message</Text>
              </View>
              <TouchableOpacity onPress={handleCancelEdit} style={styles.closeButton}>
                <X size={16} color={Colors.textPrimary} weight="bold" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── REPLY PREVIEW ────────────────────────────────────────────────── */}
      {!isEditing && replyTo && (
        <View style={styles.replyPreviewContainer}>
          <View style={styles.replyContentCard}>
            <View style={styles.replyHeader}>
              <View style={styles.replyLabelRow}>
                <ArrowBendUpLeft size={14} color={Colors.textPrimary} weight="bold" />
                <Text style={styles.replyTitle}>
                  {replyTo.isUser
                    ? 'Replying to yourself'
                    : replyTo.senderName
                      ? `Replying to ${replyTo.senderName}`
                      : 'Replying to AI Assistant'}
                </Text>
              </View>
              <TouchableOpacity onPress={onCancelReply} style={styles.closeButton}>
                <X size={16} color={Colors.textPrimary} weight="bold" />
              </TouchableOpacity>
            </View>
            <View style={styles.replyBody}>
              {replyTo.imageUri ? (
                <View style={styles.imagePreviewRow}>
                  <Image source={{ uri: replyTo.imageUri }} style={styles.replyThumbnail} />
                  <Text style={styles.replyMessageSnippet}>Photo</Text>
                </View>
              ) : (
                <Text style={styles.replyMessageSnippet} numberOfLines={2}>{replyTo.text}</Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* ── ATTACHED IMAGE PREVIEW ───────────────────────────────────────── */}
      {attachedImage && (
        <View style={styles.imageChipRow}>
          <View style={styles.imageChip}>
            <Image source={{ uri: attachedImage.uri }} style={styles.imageChipThumb} />
            <Pressable onPress={onClearImage} style={styles.imageChipRemove} hitSlop={6}>
              <X size={10} color={Colors.white} weight="bold" />
            </Pressable>
          </View>
        </View>
      )}

      {/* ── FLOATING ATTACH MENU ─────────────────────────────────────────── */}
      {showAttachMenu && (
        <Animated.View
          style={[
            styles.attachMenu,
            { opacity: menuOpacity, transform: [{ translateY: menuTranslateY }] },
          ]}
        >
          <TouchableOpacity style={styles.attachOption} onPress={handlePickFromLibrary}>
            <Images size={20} color={Colors.textPrimary} weight="regular" />
            <Text style={styles.attachOptionText}>Photo Library</Text>
          </TouchableOpacity>
          <View style={styles.attachSeparator} />
          <TouchableOpacity style={styles.attachOption} onPress={handleTakePhoto}>
            <Camera size={20} color={Colors.textPrimary} weight="regular" />
            <Text style={styles.attachOptionText}>Camera</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── INPUT ROW ────────────────────────────────────────────────────── */}
      <View style={styles.inputWrapper}>
        <TouchableOpacity
          style={[S.btnIconBordered, showAttachMenu && styles.plusActive]}
          onPress={toggleAttachMenu}
        >
          <Plus
            size={22}
            color={showAttachMenu ? Colors.brand : Colors.textPrimary}
            weight="bold"
          />
        </TouchableOpacity>

        <TextInput
          placeholder="Write a message…"
          style={styles.input}
          placeholderTextColor={Colors.textSecondary}
          cursorColor={Colors.textPrimary}
          multiline
          scrollEnabled={false}
          value={value}
          onChangeText={handleChange}
          blurOnSubmit={false}
          editable={!isLoading}
          underlineColorAndroid="transparent"
          // Ensure emoji keyboard is accessible on all platforms
          keyboardType="default"
          returnKeyType="default"
        />

        <TouchableOpacity
          style={[
            S.btnIconBordered,
            { backgroundColor: canSend ? Colors.brand : 'transparent' },
          ]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <ArrowUp size={22} color={canSend ? Colors.white : '#CCC'} weight="bold" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    paddingTop: Space.md,
    paddingBottom: Space.xxl,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 20,
  },
  replyPreviewContainer: { paddingHorizontal: Space.xl, marginBottom: Space.md },
  replyContentCard: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.lg,
    padding: Space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DDDDDD',
  },
  replyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  replyLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  replyTitle: { fontSize: Type.sizeCaption, fontWeight: Type.weightSemibold, color: Colors.textPrimary },
  closeButton: { padding: 4 },
  replyBody: { paddingLeft: Space.xl, marginTop: 4 },
  replyMessageSnippet: { fontSize: Type.sizeBodySm, color: Colors.textSecondary },
  imagePreviewRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  replyThumbnail: { width: 36, height: 36, borderRadius: Radius.sm },
  // ── Attached image chip ─────────────────────────────────────────────────
  imageChipRow: {
    paddingHorizontal: Space.xl,
    marginBottom: Space.sm,
  },
  imageChip: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  imageChipThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageChipRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Floating attach menu ────────────────────────────────────────────────
  attachMenu: {
    position: 'absolute',
    bottom: 80,
    left: Space.lg,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: Space.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
    minWidth: 180,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E8E8',
    zIndex: 100,
  },
  attachOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    gap: Space.sm,
  },
  attachOptionText: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightMedium,
    color: Colors.textPrimary,
  },
  attachSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E8E8E8',
    marginHorizontal: Space.md,
  },
  plusActive: {
    borderColor: Colors.brand,
    backgroundColor: `${Colors.brand}18`,
  },
  // ── Input row ───────────────────────────────────────────────────────────
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Space.lg,
    paddingVertical: Space.xs,
  },
  input: {
    flex: 1,
    marginHorizontal: Space.md,
    fontSize: Type.sizeTitle,
    color: Colors.textPrimary,
    minHeight: 44,
    maxHeight: 150,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    textAlignVertical: 'center',
  },
});