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

        {/* ─── Bottom Action Bar ─── */}
        <View style={styles.footer}>
          {/* We use an empty View or flex-end to push the button to the right */}
          <View style={{ flex: 1 }} /> 
          
          <TouchableOpacity onPress={onReply} style={styles.replyBtn}>
            <ArrowBendUpLeft size={18} color="#222" weight="fill" />
            <Text style={styles.replyText}>Reply</Text>
          </TouchableOpacity>
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
  },

  imageWrapper: { flex: 1, justifyContent: 'center' },

  fullImage: {
    width,
    height: height * 0.7,
  },

  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.4)', // Slightly softer overlay
    flexDirection: 'row', // Horizontal layout
    alignItems: 'center',
    justifyContent: 'flex-end', // Pushes children to the right end
  },

  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF', // White button for better contrast on black
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 8,
    // Add a slight shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  replyText: {
    color: '#222', // Charcoal text on white button
    fontSize: 15,
    fontWeight: '700',
  },
});