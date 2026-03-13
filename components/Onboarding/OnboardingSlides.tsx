import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video'; 
import { CaretLeft } from 'react-native-phosphor';
import { SlideData } from './data';
import { Colors, Space, Radius } from '@/constants/style';
import LoginModal from '@/components/Profiles/LoginModal';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Props {
  item: SlideData;
  index: number;
  signingIn: boolean;
  bottomInset: number;
  topInset: number;
  isActive: boolean;
  onNext: () => void;
  onGoogleSignIn: () => Promise<void>;
  onFinish: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export const OnboardingSlide = ({
  item,
  index,
  signingIn,
  bottomInset,
  topInset,
  isActive,
  onNext,
  onFinish,
  onBack,
  onSkip,
}: Props) => {
  const [modalVisible, setModalVisible] = useState(false);

  // 1. Initialize Player with correct loop/mute settings
  const player = useVideoPlayer(item.videoSource, (p) => {
    p.loop = false;
    p.muted = true; 
  });

  // 2. Playback control based on slide visibility
  useEffect(() => {
    if (isActive) {
      player.currentTime = 0;
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, player]);

  // 3. Dynamic Video Sizing logic
  const getVideoStyle = (): ViewStyle => {
    switch (index) {
      case 1:
        return {
          width: '100%',
          height: '100%',
          transform: [{ scale: 1.1 }],
        };
      case 2:
        return {
          width: '110%',
          height: '110%',
          transform: [{ scale: 1.1 }],
        };
      default:
        return {
          width: '200%',
          height: '200%',
          transform: [{ translateX: -20 }],
        } as ViewStyle;
    }
  };

  return (
    <View style={[styles.slide, { width: SCREEN_W }]}>
      
      {/* ───────── HEADER ───────── */}
      <View style={[styles.header, { top: topInset + 12 }]}>
        <View style={styles.headerInner}>
          {index > 0 ? (
            <TouchableOpacity onPress={onBack} style={styles.pillBtn} activeOpacity={0.7}>
              <CaretLeft size={16} color="#222" weight="bold" />
              <Text style={styles.pillText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSpacer} />
          )}

          {index < 2 ? (
            <TouchableOpacity onPress={onSkip} style={styles.pillBtn} activeOpacity={0.7}>
              <Text style={styles.pillText}>Skip</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>
      </View>

      {/* ───────── VIDEO ILLUSTRATION ───────── */}
      <View style={[styles.illustrationContainer, { paddingTop: topInset + 100 }]}>
        <View style={styles.illustrationCard}>
            <VideoView
              style={[styles.videoBase, getVideoStyle()]}
              player={player}
              contentFit="contain"
              // FIX: Use 'enable' property to remove warnings and TS errors
              fullscreenOptions={{ enable: false }}
              allowsPictureInPicture={false}
              nativeControls={false}
            />
        </View>
      </View>

      {/* ───────── TEXT CONTENT ───────── */}
      <View style={styles.textBlock}>
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideBody}>{item.body}</Text>
      </View>

      {/* ───────── CTA BLOCK ───────── */}
      <View style={[styles.ctaBlock, { paddingBottom: bottomInset + 20 }]}>
        {index === 0 && (
          <TouchableOpacity style={styles.primaryButton} onPress={onNext} activeOpacity={0.9}>
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>
        )}

        {index === 1 && (
          <>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.9}
              onPress={() => setModalVisible(true)}
            >
              {signingIn ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Log in or sign up</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.legalText}>By continuing you agree to our Terms and Privacy.</Text>
          </>
        )}

        {index === 2 && (
          <TouchableOpacity style={styles.primaryButton} onPress={onFinish} activeOpacity={0.9}>
            <Text style={styles.primaryButtonText}>Start Exploring</Text>
          </TouchableOpacity>
        )}
      </View>

      <LoginModal isVisible={modalVisible} onClose={() => setModalVisible(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  slide: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 24, zIndex: 999 },
  headerInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerSpacer: { width: 90 },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    minWidth: 90,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    gap: 6,
  },
  pillText: { fontSize: 14, fontWeight: '600', color: '#222' },
  illustrationContainer: { paddingHorizontal: 24 },
  illustrationCard: {
    height: SCREEN_H * 0.30,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  videoBase: { backgroundColor: 'transparent' },
  textBlock: { paddingHorizontal: 24, paddingTop: 28 },
  slideTitle: { fontSize: 32, fontWeight: '700', color: '#222222', lineHeight: 38, letterSpacing: -0.3 },
  slideBody: { fontSize: 17, color: '#6A6A6A', lineHeight: 26, marginTop: 10 },
  ctaBlock: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, justifyContent: 'flex-end', gap: 10 },
  primaryButton: { backgroundColor: '#222', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginBottom: 12 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  legalText: { fontSize: 12, color: '#8A8A8A', textAlign: 'center', marginBottom: 8 },
});