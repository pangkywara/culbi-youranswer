/**
 * context/AuthContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Authentication state and Google Sign-In for the whole app.
 *
 * Architecture — Anonymous-first with identity linking:
 *   • Every user (guest or signed-in) always has a Supabase auth session.
 *   • Guests are anonymous auth users (is_anonymous = true).
 *     Their state lives in the `guests` table keyed by auth.uid().
 *   • When a guest signs in with Google, `signInWithIdToken` auto-detects the
 *     existing anonymous session and LINKS the Google identity to it.
 *     The user_id NEVER changes — all data (chat history, region…) carries over.
 *   • After sign-out a new anonymous session is created automatically.
 *
 * Usage:
 *   const { session, profile, isAnonymous, signInWithGoogle, signOut, loading } = useAuth();
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';

// ─── Google Sign-In — safe runtime require for Expo Go compatibility ─────────
// Expo Go does not ship the RNGoogleSignin native module, so a static import
// would crash the whole auth context.  We require() at runtime and fall back to
// no-op stubs so anonymous-auth and all other flows keep working in Expo Go.
let GoogleSignin: any;
let statusCodes: any;
try {
  const gs = require('@react-native-google-signin/google-signin');
  GoogleSignin  = gs.GoogleSignin;
  statusCodes   = gs.statusCodes;
} catch {
  // Running in Expo Go or native module not linked — stub everything out
  GoogleSignin = {
    configure:       () => {},
    hasPlayServices: async () => true,
    signIn:          async () => { throw Object.assign(new Error('expo_go'), { code: 'EXPO_GO' }); },
    signOut:         async () => {},
    revokeAccess:    async () => {},
  };
  statusCodes = {
    SIGN_IN_CANCELLED:          'SIGN_IN_CANCELLED',
    IN_PROGRESS:                'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE:'PLAY_SERVICES_NOT_AVAILABLE',
  };
}

import { supabase } from '@/lib/supabase';
import type { Profile, Region, Database } from '@/types/database';

// ─── Profile setup data ──────────────────────────────────────────────────────
export interface ProfileSetupData {
  fullName:     string;
  username:     string;
  region:       Region;
  dateOfBirth?: string; // ISO format: YYYY-MM-DD
}

// ─── Legacy AsyncStorage key — kept to migrate old installs ─────────────────
const STORAGE_ONBOARDING_DONE = '@cb_onboarding_done';
export { STORAGE_ONBOARDING_DONE };

// ─── Configure Google Sign-In once at module load ────────────────────────────
GoogleSignin.configure({
  // Web Client ID from Google Cloud Console → OAuth 2.0 → Web client
  // (required for Supabase to verify the ID token)
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  // iOS Client ID from Google Cloud Console → OAuth 2.0 → iOS client
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  scopes: ['profile', 'email'],
  offlineAccess: false,
});

// ─── Context shape ───────────────────────────────────────────────────────────
interface AuthContextValue {
  session:            Session | null;
  profile:            Profile | null;
  loading:            boolean;
  /** True once the initial loadProfile attempt has completed */
  profileLoaded:      boolean;
  /** True while a Google Sign-In / Supabase network call is pending */
  signingIn:          boolean;
  /** True when the current user is an anonymous (guest) auth user */
  isAnonymous:        boolean;
  /** True if the anonymous guest has completed/skipped onboarding */
  guestOnboarded:     boolean;
  signInWithGoogle:   () => Promise<void>;
  signOut:            () => Promise<void>;
  signInWithEmail:    (email: string, password: string) => Promise<void>;
  signUpWithEmail:    (email: string, password: string) => Promise<void>;
  /** Saves full profile data and marks onboarding complete (logged-in users only) */
  completeOnboarding: (data: ProfileSetupData) => Promise<void>;
  /** Marks onboarding done for the anonymous user (persists to DB) */
  markGuestOnboarded: () => Promise<void>;
  /** Refreshes the local profile from Supabase */
  refreshProfile:     () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session,        setSession]        = useState<Session | null>(null);
  const [profile,        setProfile]        = useState<Profile | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [profileLoaded,  setProfileLoaded]  = useState(false);
  const [signingIn,      setSigningIn]      = useState(false);
  const [guestOnboarded, setGuestOnboarded] = useState(false);

  // Derived: true when the current session belongs to an anonymous user
  const isAnonymous = session?.user?.is_anonymous ?? false;

  // ── Load profile for a real (non-anonymous) user ──────────────────────────
  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) {
        const status = (error as any)?.status ?? (error as any)?.code;
        if (status === 401 || status === 403 || error.message?.includes('JWT')) {
          // Dead session — sign out (SIGNED_OUT handler creates fresh anon session)
          supabase.auth.signOut().catch(() => {});
          return;
        }
      } else {
        setProfile(data as Profile | null);
      }
    } catch (e: any) {
      console.warn('[AuthContext] loadProfile error:', e.message);
    } finally {
      setProfileLoaded(true);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id && !session.user.is_anonymous) {
      await loadProfile(session.user.id);
    }
  }, [session, loadProfile]);

  // ── Load guest state for an anonymous auth user ───────────────────────────
  const loadGuestState = useCallback(async (userId: string) => {
    try {
      // Migrate: push old local onboarding flag to DB once, then remove it
      const localDone = await AsyncStorage.getItem(STORAGE_ONBOARDING_DONE);
      if (localDone === 'true') {
        setGuestOnboarded(true);
        await supabase.from('guests').upsert(
          { id: userId, onboarded: true },
          { onConflict: 'id' }
        );
        await AsyncStorage.removeItem(STORAGE_ONBOARDING_DONE);
        return;
      }
      const { data: guest } = await supabase
        .from('guests')
        .select('onboarded')
        .eq('id', userId)
        .maybeSingle();
      setGuestOnboarded(guest?.onboarded ?? false);
    } catch (e: any) {
      console.warn('[AuthContext] loadGuestState error:', e.message);
      // Keep guestOnboarded=false (show onboarding) as a safe fallback
    } finally {
      // Always unblock AuthGate — even on network failure / RLS error
      setProfileLoaded(true);
    }
  }, []);

  // ── Auth state subscription + cold-start initialisation ───────────────────
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('[AuthContext] event:', event, '| user:', newSession?.user?.id ?? 'null', '| anon:', newSession?.user?.is_anonymous ?? false);

        // After sign-out create a new anonymous session immediately so the user
        // is never in a sessionless limbo.
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setProfile(null);
          setGuestOnboarded(false);
          setProfileLoaded(true);
          // Supabase returns {error} — must check return value, not try/catch
          supabase.auth.signInAnonymously().then(({ error }) => {
            if (error) console.warn('[AuthContext] post-signout anon failed:', error.message);
          });
          return;
        }

        if ((event as string) === 'TOKEN_REFRESH_FAILED') {
          setSession(null);
          setProfile(null);
          setProfileLoaded(true);
          supabase.auth.signInAnonymously().catch(() => {});
          return;
        }

        setSession(newSession);
        if (!newSession?.user) {
          setProfile(null);
          // Do NOT set profileLoaded=true here.
          // When INITIAL_SESSION fires with null, signInAnonymously() is about
          // to run in getSession().then() — the subsequent SIGNED_IN event will
          // call loadGuestState() which sets profileLoaded=true correctly.
          // Setting it here would create a window where AuthGate sees
          // loading=false + profileLoaded=true + session=null and skips onboarding.
          return;
        }

        if (newSession.user.is_anonymous) {
          setProfile(null);
          await loadGuestState(newSession.user.id);
        } else {
          setGuestOnboarded(false);
          await loadProfile(newSession.user.id);
        }
      }
    );

    // Cold start: check for an existing persisted session (AsyncStorage)
    supabase.auth.getSession().then(async ({ data: { session: existing } }) => {
      console.log('[AuthContext] getSession → user:', existing?.user?.id ?? 'null', '| anon:', existing?.user?.is_anonymous ?? false);
      if (!existing) {
        // First open — create an anonymous session.
        // The SIGNED_IN event fired inside signInAnonymously() will call
        // loadGuestState() and then set profileLoaded=true.
        // NOTE: Supabase returns { error } rather than throwing, so we must
        // check the return value — a try/catch alone will never fire here.
        const { error: anonError } = await supabase.auth.signInAnonymously().catch((e: any) => ({ error: e }));
        if (anonError) {
          console.warn('[AuthContext] initial anon sign-in failed:', anonError.message);
          // Anonymous auth is disabled or unavailable.
          // Restore onboarding state from AsyncStorage so the user doesn't
          // repeat onboarding on every launch.
          const stored = await AsyncStorage.getItem(STORAGE_ONBOARDING_DONE);
          if (stored === 'true') setGuestOnboarded(true);
          // Unblock AuthGate so the splash screen can hide.
          setProfileLoaded(true);
        }
        // On success: SIGNED_IN event → loadGuestState() → setProfileLoaded(true)
      }
      setLoading(false);
    }).catch(() => {
      // getSession() failed (e.g. AsyncStorage error). Unblock the app.
      console.warn('[AuthContext] getSession() threw unexpectedly — unblocking loading');
      setLoading(false);
      setProfileLoaded(true);
    });

    return () => listener.subscription.unsubscribe();
  }, [loadProfile, loadGuestState]);

  // ── Mark anonymous guest onboarding complete ──────────────────────────────
  const markGuestOnboarded = useCallback(async () => {
    setGuestOnboarded(true);
    // Always persist to AsyncStorage so the flag survives app restarts even
    // when anonymous auth is disabled and there is no Supabase session.
    await AsyncStorage.setItem(STORAGE_ONBOARDING_DONE, 'true');
    const userId = session?.user?.id;
    if (!userId) return;
    await supabase.from('guests').upsert(
      { id: userId, onboarded: true },
      { onConflict: 'id' }
    );
  }, [session]);

  // ── Email / Password sign-in ─────────────────────────────────────────────────
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setSigningIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } finally {
      setSigningIn(false);
    }
  }, []);

  // ── Email / Password sign-up ─────────────────────────────────────────────────
  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    setSigningIn(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    } finally {
      setSigningIn(false);
    }
  }, []);

  // ── Google Sign-In ──────────────────────────────────────────────────────────────────────
  // When called while the user has an anonymous session, Supabase's
  // signInWithIdToken detects the existing anonymous session and LINKS the
  // Google identity to the same user_id.  is_anonymous becomes false and
  // all existing guest data (chat sessions, region…) is automatically preserved.
  const signInWithGoogle = useCallback(async () => {
    setSigningIn(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();

      const idToken = (userInfo as any).data?.idToken ?? (userInfo as any).idToken;
      if (!idToken) throw new Error('No ID token from Google');

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token:    idToken,
      });
      if (error) throw error;

      // Record conversion timestamp on the guest row (same user_id, best-effort)
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (s?.user?.id) {
          await supabase.from('guests')
            .update({ converted_at: new Date().toISOString() })
            .eq('id', s.user.id);
        }
      } catch { /* non-fatal */ }
    } catch (err: any) {
      if (err.code === 'EXPO_GO') {
        Alert.alert(
          'Not Available in Expo Go',
          'Google Sign-In requires a custom native build.\nUse `npx expo run:ios` or the production build to sign in.',
          [{ text: 'OK' }]
        );
      } else if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // dismissed
      } else if (err.code === statusCodes.IN_PROGRESS) {
        // already in flight
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Google Sign-In', 'Google Play Services not available on this device.');
      } else {
        Alert.alert('Sign-In Error', err.message ?? 'Something went wrong.');
      }
    } finally {
      setSigningIn(false);
    }
  }, []);

  // ── Sign out ──────────────────────────────────────────────────────────────
  // onAuthStateChange SIGNED_OUT handler automatically creates a new anonymous
  // session so the user stays functional as a guest.
  const signOut = useCallback(async () => {
    setProfile(null);
    await GoogleSignin.revokeAccess().catch(() => {});
    await GoogleSignin.signOut().catch(() => {});
    await supabase.auth.signOut();
  }, []);

  // ── Complete onboarding (real logged-in user only) ────────────────────────
  const completeOnboarding = useCallback(
    async ({ fullName, username, region, dateOfBirth }: ProfileSetupData) => {
      // Guard: anonymous users must never reach profile-setup
      if (!session?.user?.id || session.user.is_anonymous) return;
      const payload: Database['public']['Tables']['profiles']['Update'] = {
        full_name:        fullName,
        username,
        region,
        onboarded:        true,
        onboarding_step:  3,
        ...(dateOfBirth ? { date_of_birth: dateOfBirth } : {}),
      };

      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', session.user.id)
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message ?? 'Failed to save profile');
      if (data) setProfile(data as Profile);
    },
    [session]
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        profileLoaded,
        signingIn,
        isAnonymous,
        guestOnboarded,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        completeOnboarding,
        markGuestOnboarded,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
