import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import ChatIconAnimation from '@/assets/lottie-assets/email2.json';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { Mailbox } from 'react-native-phosphor';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import LottieView from 'lottie-react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.82;



/* ───────── Google SVG Icon ───────── */
const GoogleIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
      fill="#EA4335"
    />
  </Svg>
);

const getPasswordStrength = (password: string) => {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
};

const strengthLabel = (score: number) => {
  if (score <= 1) return { label: 'Weak', color: '#D93025' };
  if (score === 2) return { label: 'Fair', color: '#F9AB00' };
  if (score === 3) return { label: 'Good', color: '#34A853' };
  return { label: 'Strong', color: '#188038' };
};

interface LoginModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function LoginModal({ isVisible, onClose }: LoginModalProps) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, signingIn } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const translateY = useSharedValue(PANEL_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  const springConfig = { damping: 20, stiffness: 150, mass: 0.8 };

  const strengthScore = useMemo(() => getPasswordStrength(password), [password]);
  const strength = strengthLabel(strengthScore);

  const isValid =
    mode === 'login'
      ? !!(email && password)
      : !!(email && password && confirmPassword && password === confirmPassword && strengthScore >= 2);

  useEffect(() => {
    if (isVisible) {
      setIsMounted(true);
      backdropOpacity.value = withTiming(1, { duration: 300 });
      translateY.value = withSpring(0, springConfig);
    } else {
      backdropOpacity.value = withTiming(0, { duration: 250 });
      translateY.value = withSpring(PANEL_HEIGHT, springConfig, (finished) => {
        if (finished) runOnJS(setIsMounted)(false);
      });
    }
  }, [isVisible]);

  const handleClose = useCallback(() => {
    setMode('login');
    setPassword('');
    setConfirmPassword('');
    setAuthError(null);
    setAwaitingConfirmation(false);
    onClose();
  }, [onClose]);

  const handleContinue = useCallback(async () => {
    if (!isValid || submitting) return;
    setAuthError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
        handleClose();
      } else {
        await signUpWithEmail(email, password);
        const { data: { session } } = await supabase.auth.getSession();
        if (session && !session.user.is_anonymous) {
          handleClose();
        } else {
          setAwaitingConfirmation(true);
        }
      }
    } catch (err: any) {
      setAuthError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [isValid, submitting, mode, email, password, signInWithEmail, signUpWithEmail, handleClose]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > 100 || e.velocityY > 500) {
        translateY.value = withSpring(
          PANEL_HEIGHT, 
          { ...springConfig, velocity: e.velocityY }, 
          () => runOnJS(handleClose)()
        );
      } else {
        translateY.value = withSpring(0, springConfig);
      }
    });

  const animatedSheet = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedBackdrop = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!isMounted) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <GestureHandlerRootView style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        <Animated.View style={[styles.backdrop, animatedBackdrop]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={handleClose} />
        </Animated.View>

        <Animated.View style={[styles.sheet, animatedSheet]}>
          <GestureDetector gesture={panGesture}>
            <View style={styles.dragZone}>
              <View style={styles.handle} />
              <Text style={styles.headerTitle}>
                {awaitingConfirmation ? 'Verify Email' : mode === 'login' ? 'Log in' : 'Create account'}
              </Text>
            </View>
          </GestureDetector>

          <View style={styles.content}>
            {awaitingConfirmation ? (
              <View style={styles.confirmationBox}>
                <View style={styles.emailIconCircle}>
                <LottieView
                  source={ChatIconAnimation}
                  autoPlay
                  loop={false}
                  style={styles.lottie}
                />
                </View>
                <Text style={styles.confirmationTitle}>Check your inbox</Text>
                <Text style={styles.confirmationBody}>
                  We've sent a link to <Text style={styles.boldText}>{email}</Text>. 
                  Please click it to activate your account.
                </Text>
                
                <TouchableOpacity
                  style={styles.continueBtn}
                  onPress={() => {
                    setAwaitingConfirmation(false);
                    setMode('login');
                    setPassword('');
                    setConfirmPassword('');
                  }}
                >
                  <Text style={styles.continueText}>Back to login</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Input
                  placeholder="Email"
                  value={email}
                  onChangeText={(t: string) => { setEmail(t); setAuthError(null); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Input
                  placeholder="Password"
                  value={password}
                  onChangeText={(t: string) => { setPassword(t); setAuthError(null); }}
                  secureTextEntry
                />

                {mode === 'signup' && (
                  <>
                    <View style={styles.strengthContainer}>
                      <View style={styles.strengthBarBg}>
                        <View
                          style={[
                            styles.strengthBarFill,
                            {
                              width: `${(strengthScore / 4) * 100}%`,
                              backgroundColor: strength.color,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.strengthText, { color: strength.color }]}>
                        {strength.label}
                      </Text>
                    </View>

                    <Input
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChangeText={(t: string) => { setConfirmPassword(t); setAuthError(null); }}
                      secureTextEntry
                    />

                    {password && confirmPassword && password !== confirmPassword && (
                      <Text style={styles.inlineError}>Passwords don’t match.</Text>
                    )}
                  </>
                )}

                {authError ? <Text style={styles.inlineError}>{authError}</Text> : null}

                <TouchableOpacity
                  style={[styles.continueBtn, (!isValid || submitting) && styles.continueBtnDisabled]}
                  disabled={!isValid || submitting}
                  onPress={handleContinue}
                >
                  {submitting
                    ? <ActivityIndicator color="#FFF" />
                    : <Text style={styles.continueText}>
                        {mode === 'login' ? 'Log in' : 'Create account'}
                      </Text>
                  }
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.switchMode}
                  onPress={() => {
                    setMode(mode === 'login' ? 'signup' : 'login');
                    setAuthError(null);
                    setPassword('');
                    setConfirmPassword('');
                  }}
                >
                  <Text style={styles.switchText}>
                    {mode === 'login'
                      ? "Don't have an account? Sign up"
                      : 'Already have an account? Log in'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.dividerRow}>
                  <View style={styles.line} />
                  <Text style={styles.orText}>or</Text>
                  <View style={styles.line} />
                </View>

                <TouchableOpacity
                  style={styles.googleBtn}
                  onPress={async () => {
                    await signInWithGoogle();
                    handleClose();
                  }}
                  disabled={signingIn}
                  activeOpacity={0.8}
                >
                  {signingIn ? (
                    <ActivityIndicator color="#222" />
                  ) : (
                    <>
                      <View style={styles.googleIconWrapper}>
                        <GoogleIcon size={20} />
                      </View>
                      <Text style={styles.googleLabel}>Continue with Google</Text>
                      <View style={{ width: 24 }} />
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </View>
  );
}

const Input = (props: any) => (
  <View style={styles.inputContainer}>
    <TextInput 
      style={styles.textInput} 
      placeholderTextColor="#717171" 
      underlineColorAndroid="transparent"
      {...props} 
    />
  </View>
);

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: PANEL_HEIGHT,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  dragZone: { paddingTop: 12, alignItems: 'center' },
  handle: { width: 32, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  content: { padding: 24 },
    lottie: {
    width: 65,
    height: 65,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: '#B0B0B0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
  },
  textInput: { 
    fontSize: 16,
    paddingVertical: 6, 
  },

  strengthContainer: { marginBottom: 16 },
  strengthBarBg: { height: 6, backgroundColor: '#EEE', borderRadius: 3 },
  strengthBarFill: { height: 6 },
  strengthText: { fontSize: 12, marginTop: 6 },

  continueBtn: {
    backgroundColor: '#222',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
  },
  continueBtnDisabled: { opacity: 0.3 },
  continueText: { color: '#FFF', fontWeight: '600', fontSize: 16 },

  switchMode: { alignItems: 'center', marginTop: 16 },
  switchText: {
    fontSize: 14,
    color: '#222',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  line: { flex: 1, height: 1, backgroundColor: '#EBEBEB' },
  orText: { marginHorizontal: 16, fontSize: 12 },

  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    height: 52,
  },
  googleIconWrapper: { width: 24, alignItems: 'flex-start' },
  googleLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
  },

  inlineError: {
    fontSize: 13,
    color: '#D93025',
    marginBottom: 12,
    marginTop: -4,
  },

  confirmationBox: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  emailIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  confirmationTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmationBody: {
    fontSize: 16,
    color: '#717171',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  boldText: {
    fontWeight: '600',
    color: '#222',
  },
});