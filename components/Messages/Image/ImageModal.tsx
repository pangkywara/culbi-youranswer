import React, { useEffect } from 'react';
import { Modal } from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import type { ReplyTarget } from '@/types/chat';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ImageViewerUI } from './ImageViewerUI';
import { downloadImage } from './useImageDownload';
import { createImageGestures } from './useImageGesture';

interface ImageModalProps {
  uri: string | null;
  isVisible: boolean;
  onClose: () => void;
  onReply?: (target: ReplyTarget) => void;
}

export const ImageModal = ({
  uri,
  isVisible,
  onClose,
  onReply,
}: ImageModalProps) => {

  const handleReply = () => {
    if (!uri) return;

    onClose();

    onReply?.({
      text: undefined,
      imageUri: uri,
      isUser: false,
    });
  };

  const handleShare = async () => {
    if (!uri) return;

    try {
      // download remote image to local cache
      const fs = FileSystem as typeof FileSystem & {
        cacheDirectory: string | null;
        documentDirectory: string | null;
      };

      const dir = fs.cacheDirectory ?? fs.documentDirectory;
      if (!dir) throw new Error('No writable directory available');

      const localUri = `${dir}share_${Date.now()}.jpg`;

      const result = await FileSystem.downloadAsync(uri, localUri);

      // share LOCAL file
      await Sharing.shareAsync(result.uri);

    } catch (e) {
      console.log('Share error', e);
    }
  };

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const bgOpacity = useSharedValue(1);

  // Reset all gesture state each time the modal opens (or a new URI is shown)
  // so that zoom/pan from a previously viewed image never bleeds into the next.
  useEffect(() => {
    if (isVisible) {
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      offsetX.value = 0;
      offsetY.value = 0;
      bgOpacity.value = 1;
    }
    // uri is intentionally included: opening a *different* image while the modal
    // is already visible should also reset the transform state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, uri]);

  const gesture = createImageGestures({
    scale,
    savedScale,
    translateX,
    translateY,
    offsetX,
    offsetY,
    bgOpacity,
    onClose,
  });

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(0,0,0,${bgOpacity.value})`,
  }));

  return (
    <Modal visible={isVisible} transparent animationType="fade">
      <GestureHandlerRootView style={{ flex: 1 }}>
        {uri && (
          <GestureDetector gesture={gesture}>
            <ImageViewerUI
              uri={uri}
              animatedImageStyle={animatedImageStyle}
              overlayStyle={overlayStyle}
              onClose={onClose}
              onDownload={() => downloadImage(uri)}
              onReply={handleReply}
              onShare={handleShare}
            />
          </GestureDetector>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
};