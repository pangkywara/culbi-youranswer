// ImageViewerUI.tsx
import React from 'react';
import {
  View,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Dimensions,
  Text,
} from 'react-native';
import Animated from 'react-native-reanimated';
import {
  DownloadSimple,
  X,
  ShareNetwork,
  ArrowBendUpLeft,
} from 'react-native-phosphor';

const { width, height } = Dimensions.get('window');

type Props = {
  uri: string;
  animatedImageStyle: any;
  overlayStyle: any;
  onClose: () => void;
  onDownload: () => void;
  onReply?: () => void;
  onShare?: () => void;
};

export const ImageViewerUI = ({
  uri,
  animatedImageStyle,
  overlayStyle,
  onClose,
  onDownload,
  onReply,
  onShare,
}: Props) => {

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      <SafeAreaView style={{ flex: 1 }}>

        {/* ─── Toolbar ─── */}
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <X size={24} color="#FFF" weight="bold" />
          </TouchableOpacity>

          <View style={styles.toolbarRight}>
            <TouchableOpacity onPress={onShare} style={styles.iconBtn}>
              <ShareNetwork size={22} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity onPress={onDownload} style={styles.iconBtn}>
              <DownloadSimple size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Image ─── */}
        <View style={styles.imageWrapper}>
          <Animated.Image
            source={{ uri }}
            style={[styles.fullImage, animatedImageStyle]}
            resizeMode="contain"
          />
        </View>

      </SafeAreaView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1 },

  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },

  toolbarRight: {
    flexDirection: 'row',
    gap: 12,
  },

  iconBtn: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },

  imageWrapper: { flex: 1, justifyContent: 'center' },

  fullImage: {
    width,
    height: height * 0.7,
  },
});