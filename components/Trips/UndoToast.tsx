/**
 * UndoToast.tsx
 * ─────────────
 * A brief auto-dismissing toast that appears after Culbi's proposal is accepted.
 * Shows "[Culbi rearranged Day N]  [Undo]" for 5 seconds.
 *
 * Props
 * ─────
 * visible    show / hide the toast
 * message    description of what Culbi did
 * onUndo     fires when user taps Undo
 * onDismiss  fires when toast self-dismisses (parent should clear it)
 * bottomOffset  adjust position above tab bar
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { Colors, Type, Space, Radius, Shadows } from '@/constants/style';

const AUTO_DISMISS_MS = 5000;

interface Props {
  visible:      boolean;
  message:      string;
  onUndo:       () => void;
  onDismiss:    () => void;
  bottomOffset?: number;
}

export function UndoToast({
  visible,
  message,
  onUndo,
  onDismiss,
  bottomOffset = 0,
}: Props) {
  const opacity   = useRef(new Animated.Value(0)).current;
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onDismiss());
  }, [opacity, onDismiss]);

  useEffect(() => {
    if (visible) {
      // Fade in
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
      // Auto-dismiss after delay
      timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    } else {
      opacity.setValue(0);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, dismiss, opacity]);

  if (!visible) return null;

  const handleUndo = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onUndo();
    onDismiss();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          bottom: bottomOffset + (Platform.OS === 'ios' ? 16 : 8),
        },
      ]}
    >
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
      <TouchableOpacity onPress={handleUndo} style={styles.undoBtn}>
        <Text style={styles.undoText}>Undo</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Space.lg,
    right: Space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: Radius.lg,
    paddingVertical: 12,
    paddingHorizontal: Space.md,
    gap: Space.sm,
    zIndex: 200,
    ...Shadows.level4,
  },
  message: {
    flex: 1,
    fontWeight: Type.weightNormal,
    fontSize: Type.sizeCaption,
    color: '#fff',
    lineHeight: 18,
  },
  undoBtn: {
    paddingHorizontal: Space.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  undoText: {
    fontWeight: Type.weightSemibold,
    fontSize: Type.sizeCaption,
    color: Colors.brand,
  },
});
