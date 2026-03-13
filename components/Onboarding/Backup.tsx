/**
 * app/onboarding/index.tsx
 * 3-slide onboarding: Welcome → Sign In → Select Region
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  useAnimatedScrollHandler,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Type, Space, Radius, Shadows } from '@/constants/style';
import { useAuth } from '@/context/AuthContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SLIDE_COUNT = 3;

// ─── Slide data ───────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: 'welcome',
    emoji:    '🏝',
    gradient: ['#FAFAFA', '#F0EDE8'] as [string, string],
    accent:   Colors.brand,
    tag:      'Cultural Bridge',
    title:    'Bridge the\nBorneo Gap.',
    body:     'Explore the unique traditions, landmarks, and shared heritage between West Kalimantan and Sarawak.',
  },
  {
    id: 'signin',
    emoji:    '👋',
    gradient: ['#FAFAFA', '#F0EDE8'] as [string, string],
    accent:   Colors.brand,
    tag:      'Join for free',
    title:    'Join the Community\nwith One Tap',
    body:     'Sign in to save your discoveries, earn Cultural Passport stamps, and connect with fellow explorers.',
  },
  {
    id: 'promise',
    emoji:    '🤝',
    gradient: ['#FAFAFA', '#F0EDE8'] as [string, string],
    accent:   Colors.brand,
    tag:      'Ready to explore',
    title:    'Your AI Liaison\nIs Ready',
    body:     "Navigate cultural nuances between Borneo\u2019s two proud regions. Your journey starts now.",
  },
];

// ─── AnimatedFlatList for scroll-driven dot indicator ────────────────────────
const AnimatedFlatList = Animated.createAnimatedComponent(
  FlatList<(typeof SLIDES)[number]>
);

export default function OnboardingScreen() {
  const insets    = useSafeAreaInsets();
  const router    = useRouter();
  const { signInWithGoogle, signingIn, markGuestOnboarded } = useAuth();

  const flatListRef = useRef<FlatList<any>>(null);
  const scrollX     = useSharedValue(0);
  const [activeIndex, setActiveIndex] = useState(0);

  // ── Scroll handler ─────────────────────────────────────────────────────────
  const onScroll = useAnimatedScrollHandler({ onScroll: (e) => { scrollX.value = e.contentOffset.x; } });

  const goToSlide = useCallback((index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setActiveIndex(index);
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleNext = useCallback(() => {
    if (activeIndex < SLIDE_COUNT - 1) goToSlide(activeIndex + 1);
  }, [activeIndex, goToSlide]);

  const handleGoogleSignIn = useCallback(async () => {
    await signInWithGoogle();
    // AuthGate will redirect to /profile-setup once session is set
    // Also navigate explicitly to avoid any delay from the AuthGate
    router.replace('/profile-setup');
  }, [signInWithGoogle, router]);

  // Slide 2 (Promise) — guest-only final step
  const handleFinish = useCallback(async () => {
    await markGuestOnboarded();
    router.replace('/(tabs)');
  }, [markGuestOnboarded, router]);

  // ── Render each slide content ──────────────────────────────────────────────
  const renderSlide = useCallback(
    ({ item, index }: { item: (typeof SLIDES)[number]; index: number }) => {
      return (
        <View style={[styles.slide, { width: SCREEN_W }]}>
          {/* Illustration */}
          <View style={styles.illustrationContainer}>
            <LinearGradient
              colors={item.gradient}
              style={styles.illustrationGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.illustrationEmoji}>{item.emoji}</Text>
            </LinearGradient>
          </View>

          {/* Text block */}
          <View style={styles.textBlock}>
            <View style={styles.tagPill}>
              <View style={[styles.tagDot, { backgroundColor: item.accent }]} />
              <Text style={[styles.tagText, { color: item.accent }]}>{item.tag}</Text>
            </View>

            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideBody}>{item.body}</Text>
          </View>

          {/* Slide-specific CTA */}
          <View style={[styles.ctaBlock, { paddingBottom: insets.bottom + Space.xl }]}>
            {index === 0 && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleNext}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Get Started</Text>
              </TouchableOpacity>
            )}

            {index === 1 && (
              <>
                <TouchableOpacity
                  style={styles.googleButton}
                  onPress={handleGoogleSignIn}
                  disabled={signingIn}
                  activeOpacity={0.85}
                >
                  {signingIn ? (
                    <ActivityIndicator color={Colors.textPrimary} size="small" />
                  ) : (
                    <>
                      <Text style={styles.googleIcon}>G</Text>
                      <Text style={styles.googleButtonText}>Continue with Google</Text>
                    </>
                  )}
                </TouchableOpacity>

                <Text style={styles.legalText}>
                  By continuing you agree to our Terms of Service and Privacy Policy.
                </Text>
              </>
            )}

            {index === 2 && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleFinish}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Start Exploring</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    },
    [
      insets.bottom,
      handleNext,
      handleGoogleSignIn,
      handleFinish,
      signingIn,
    ]
  );

  // ── Dot indicator ──────────────────────────────────────────────────────────
  const Dot = React.memo(({ dotIndex }: { dotIndex: number }) => {
    const animStyle = useAnimatedStyle(() => {
      const inputRange = [
        (dotIndex - 1) * SCREEN_W,
        dotIndex * SCREEN_W,
        (dotIndex + 1) * SCREEN_W,
      ];
      const width = interpolate(scrollX.value, inputRange, [8, 24, 8], Extrapolation.CLAMP);
      const opacity = interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], Extrapolation.CLAMP);
      return { width, opacity };
    });
    return <Animated.View style={[styles.dot, animStyle]} />;
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* Skip button — only on slide 1 (Google Login).
           Tapping it skips sign-in, jumping straight to The Promise. */}
      {activeIndex === 1 && (
        <TouchableOpacity
          style={[styles.skipButton, { top: insets.top + Space.md }]}
          onPress={() => goToSlide(2)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <AnimatedFlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}          // manual navigation only
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={renderSlide}
        getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
      />

      {/* Dot indicator */}
      <View style={[styles.dotsRow, { bottom: insets.bottom + 100 }]}>
        {SLIDES.map((_, i) => <Dot key={i} dotIndex={i} />)}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  // ── Slide ────────────────────────────────────────────────────────────────
  slide: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  // ── Illustration ─────────────────────────────────────────────────────────
  illustrationContainer: {
    paddingHorizontal: Space.xl,
    paddingTop: Space.xxxl + 24,
  },
  illustrationGrad: {
    height: SCREEN_H * 0.36,
    borderRadius: Radius.cardLg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24 },
      android: { elevation: 4 },
    }),
  },
  illustrationEmoji: {
    fontSize: 80,
  },

  // ── Text block ────────────────────────────────────────────────────────────
  textBlock: {
    paddingHorizontal: Space.xl,
    paddingTop: Space.xxl + Space.md,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
    marginBottom: Space.lg,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
  },
  tagText: {
    fontSize: Type.sizeCaption,
    fontWeight: Type.weightSemibold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  slideTitle: {
    fontSize: 30,
    fontWeight: Type.weightBold,
    color: Colors.textPrimary,
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: Space.md,
  },
  slideBody: {
    fontSize: Type.sizeBody,
    fontWeight: Type.weightNormal,
    color: Colors.textSecondary,
    lineHeight: 24,
  },

  // ── CTA block ─────────────────────────────────────────────────────────────
  ctaBlock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Space.xl,
    gap: Space.md,
  },

  // ── Primary button ────────────────────────────────────────────────────────
  primaryButton: {
    backgroundColor: Colors.brand,
    borderRadius: Radius.pill,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios:     { shadowColor: Colors.brand, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14 },
      android: { elevation: 6 },
    }),
  },
  primaryButtonDisabled: {
    backgroundColor: Colors.surfaceOverlay,
    ...Platform.select({
      ios:     { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: Type.sizeBody,
    fontWeight: Type.weight700,
    letterSpacing: 0.2,
  },

  // ── Google button ─────────────────────────────────────────────────────────
  googleButton: {
    backgroundColor: Colors.white,
    borderRadius: Radius.pill,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm + 2,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: Type.weightBold,
    color: '#4285F4',
    fontFamily: 'Georgia',
  },
  googleButtonText: {
    fontSize: Type.sizeBody,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
  },

  legalText: {
    fontSize: Type.sizeCaption - 1,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Space.md,
  },

  // ── Region cards ──────────────────────────────────────────────────────────
  regionRow: {
    flexDirection: 'row',
    gap: Space.md,
    marginBottom: Space.sm,
  },
  regionCard: {
    flex: 1,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.card,
    padding: Space.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: Space.xs,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 1 },
    }),
  },
  regionCardActive: {
    borderColor: Colors.brand,
    backgroundColor: Colors.white,
    ...Platform.select({
      ios:     { shadowColor: Colors.brand, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  regionFlag: {
    fontSize: 36,
    marginBottom: Space.xs,
  },
  regionLabel: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weight700,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  regionLabelActive: {
    color: Colors.brand,
  },
  regionSub: {
    fontSize: Type.sizeCaption,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  regionCheck: {
    position: 'absolute',
    top: Space.sm,
    right: Space.sm,
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    backgroundColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regionCheckIcon: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: Type.weightBold,
  },

  // ── Dots ──────────────────────────────────────────────────────────────────
  dotsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Space.xs,
  },
  dot: {
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.brand,
  },

  // ── Skip ──────────────────────────────────────────────────────────────────
  skipButton: {
    position: 'absolute',
    right: Space.xl,
    zIndex: 10,
  },
  skipText: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightSemibold,
    color: Colors.textTertiary,
  },
});
