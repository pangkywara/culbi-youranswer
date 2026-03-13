/**
 * components/Profiles/ProfileSetupForm.tsx
 *
 * Profile completion form shown to newly signed-in users.
 * Collects: full name, username, country (ASEAN), region (optional) + date of birth.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert,
  Modal,
  Animated,
  FlatList,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Type, Space, Radius, Shadows } from '@/constants/style';
import { useAuth } from '@/context/AuthContext';
import type { Region } from '@/types/database';
import type { ProfileSetupData } from '@/context/AuthContext';
import { CaretDown, Check } from 'react-native-phosphor';

// ── ASEAN country data ────────────────────────────────────────────────────────

interface Country {
  value: Region;
  label: string;
  flag:  string;
}

const ASEAN_COUNTRIES: Country[] = [
  { value: 'Brunei',      label: 'Brunei',      flag: '🇧🇳' },
  { value: 'Cambodia',    label: 'Cambodia',    flag: '🇰🇭' },
  { value: 'Indonesia',   label: 'Indonesia',   flag: '🇮🇩' },
  { value: 'Laos',        label: 'Laos',        flag: '🇱🇦' },
  { value: 'Malaysia',    label: 'Malaysia',    flag: '🇲🇾' },
  { value: 'Myanmar',     label: 'Myanmar',     flag: '🇲🇲' },
  { value: 'Philippines', label: 'Philippines', flag: '🇵🇭' },
  { value: 'Singapore',   label: 'Singapore',   flag: '🇸🇬' },
  { value: 'Thailand',    label: 'Thailand',    flag: '🇹🇭' },
  { value: 'Vietnam',     label: 'Vietnam',     flag: '🇻🇳' },
];

// ── Country Picker Sheet ──────────────────────────────────────────────────────

interface PickerSheetProps {
  visible:  boolean;
  selected: Region | null;
  onSelect: (r: Region) => void;
  onClose:  () => void;
}

function CountryPickerSheet({ visible, selected, onSelect, onClose }: PickerSheetProps) {
  const insets = useSafeAreaInsets();
  const anim   = useRef(new Animated.Value(0)).current;

  const SHEET_H = ASEAN_COUNTRIES.length * 60 + 80 + insets.bottom;

  React.useEffect(() => {
    Animated.spring(anim, {
      toValue:         visible ? 1 : 0,
      damping:         22,
      stiffness:       180,
      mass:            0.9,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [SHEET_H, 0] });
  const backdrop   = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  const handleSelect = useCallback((r: Region) => {
    onSelect(r);
    onClose();
  }, [onSelect, onClose]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        {/* Backdrop */}
        <Animated.View
          style={[pick.backdrop, { opacity: backdrop }]}
          pointerEvents="auto"
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[
            pick.sheet,
            { paddingBottom: insets.bottom + Space.lg, transform: [{ translateY }] },
          ]}
        >
          {/* Handle */}
          <View style={pick.handle} />
          <Text style={pick.sheetTitle}>Where are you from?</Text>

          <FlatList
            data={ASEAN_COUNTRIES}
            keyExtractor={(c) => c.value}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const active = selected === item.value;
              return (
                <TouchableOpacity
                  style={[pick.row, active && pick.rowActive]}
                  onPress={() => handleSelect(item.value)}
                  activeOpacity={0.7}
                >
                  <Text style={pick.rowFlag}>{item.flag}</Text>
                  <Text style={[pick.rowLabel, active && pick.rowLabelActive]}>
                    {item.label}
                  </Text>
                  {active && (
                    <Check size={18} color={Colors.brand} weight="bold" />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const pick = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    backgroundColor: Colors.white,
    borderTopLeftRadius:  Radius.cardLg,
    borderTopRightRadius: Radius.cardLg,
    paddingTop:      Space.md,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 20 },
      android: { elevation: 12 },
    }),
  },
  handle: {
    width:           36,
    height:          4,
    borderRadius:    2,
    backgroundColor: Colors.borderSubtle,
    alignSelf:       'center',
    marginBottom:    Space.lg,
  },
  sheetTitle: {
    fontSize:      Type.sizeBodySm,
    fontWeight:    Type.weightSemibold,
    color:         Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Space.xxl,
    marginBottom:  Space.sm,
  },
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical:  Space.md,
    paddingHorizontal: Space.xxl,
    gap:            Space.md,
  },
  rowActive: {
    backgroundColor: Colors.surfaceMuted,
  },
  rowFlag: {
    fontSize: 26,
    width:    36,
  },
  rowLabel: {
    flex:       1,
    fontSize:   Type.sizeBody,
    fontWeight: Type.weightMedium,
    color:      Colors.textPrimary,
  },
  rowLabelActive: {
    color:      Colors.brand,
    fontWeight: Type.weightSemibold,
  },
});

// ── Main Form ─────────────────────────────────────────────────────────────────

export default function ProfileSetupForm() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { completeOnboarding } = useAuth();

  const [fullName,     setFullName]     = useState('');
  const [username,     setUsername]     = useState('');
  const [country,      setCountry]      = useState<Region | null>(null);
  const [dateOfBirth,  setDateOfBirth]  = useState('');
  const [saving,       setSaving]       = useState(false);
  const [pickerOpen,   setPickerOpen]   = useState(false);

  const selectedCountry = ASEAN_COUNTRIES.find((c) => c.value === country);

  const isValid = fullName.trim().length > 0
    && username.trim().length > 0
    && country !== null;

  const handleSave = useCallback(async () => {
    if (!isValid) return;

    if (dateOfBirth.trim().length > 0) {
      const iso = /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth.trim());
      if (!iso) {
        Alert.alert('Invalid date', 'Please use the format YYYY-MM-DD, e.g. 1995-06-15');
        return;
      }
    }

    const data: ProfileSetupData = {
      fullName:    fullName.trim(),
      username:    username.trim().toLowerCase().replace(/\s+/g, '_'),
      region:      country!,
      dateOfBirth: dateOfBirth.trim() || undefined,
    };

    setSaving(true);
    try {
      await completeOnboarding(data);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [isValid, fullName, username, country, dateOfBirth, completeOnboarding, router]);

  return (
    <>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + Space.xl, paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Page header ─────────────────────────────────────── */}
          <View style={styles.tagPill}>
            <View style={styles.tagDot} />
            <Text style={styles.tagText}>One last step</Text>
          </View>

          <Text style={styles.title}>Set up your{'\n'}profile</Text>
          <Text style={styles.subtitle}>
            Tell us a little about yourself so we can personalise your experience.
          </Text>

          {/* ── Full name ───────────────────────────────────────── */}
          <Text style={styles.label}>
            Full name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Budi Santoso"
            placeholderTextColor={Colors.textTertiary}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            returnKeyType="next"
          />

          {/* ── Username ─────────────────────────────────────────── */}
          <Text style={styles.label}>
            Username <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.usernameRow}>
            <View style={styles.atPrefix}>
              <Text style={styles.atSign}>@</Text>
            </View>
            <TextInput
              style={[styles.input, styles.usernameInput]}
              placeholder="your_handle"
              placeholderTextColor={Colors.textTertiary}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          {/* ── Country (ASEAN dropdown) ─────────────────────────── */}
          <Text style={[styles.label, { marginTop: Space.lg }]}>
            Country <Text style={styles.required}>*</Text>
          </Text>
          <Text style={styles.hint}>
            Used to personalise your AI Liaison and cultural recommendations.
          </Text>

          <TouchableOpacity
            style={[styles.selector, country && styles.selectorSelected]}
            onPress={() => setPickerOpen(true)}
            activeOpacity={0.8}
          >
            {selectedCountry ? (
              <View style={styles.selectorValue}>
                <Text style={styles.selectorFlag}>{selectedCountry.flag}</Text>
                <Text style={styles.selectorLabel}>{selectedCountry.label}</Text>
              </View>
            ) : (
              <Text style={styles.selectorPlaceholder}>Select your country…</Text>
            )}
            <CaretDown
              size={18}
              color={country ? Colors.textPrimary : Colors.textTertiary}
              weight="bold"
            />
          </TouchableOpacity>

          {/* ── Date of birth ────────────────────────────────────── */}
          <Text style={[styles.label, { marginTop: Space.lg }]}>
            Date of birth{' '}
            <Text style={styles.optional}>(optional)</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textTertiary}
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />

          {/* ── Save button ──────────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.saveBtn, !isValid && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!isValid || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save &amp; Start Exploring</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country picker sheet — outside ScrollView to avoid z-index issues */}
      <CountryPickerSheet
        visible={pickerOpen}
        selected={country}
        onSelect={setCountry}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    paddingHorizontal: Space.xl,
  },

  // Header
  tagPill: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Space.xs,
    marginBottom:  Space.lg,
  },
  tagDot: {
    width:           6,
    height:          6,
    borderRadius:    3,
    backgroundColor: Colors.brand,
  },
  tagText: {
    fontSize:      Type.sizeCaption,
    fontWeight:    Type.weightSemibold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color:         Colors.brand,
  },
  title: {
    fontSize:      30,
    fontWeight:    Type.weightBold,
    color:         Colors.textPrimary,
    lineHeight:    38,
    letterSpacing: -0.5,
    marginBottom:  Space.md,
  },
  subtitle: {
    fontSize:     Type.sizeBody,
    color:        Colors.textSecondary,
    lineHeight:   22,
    marginBottom: Space.xxl,
  },

  // Labels
  label: {
    fontSize:     Type.sizeBodySm,
    fontWeight:   Type.weightSemibold,
    color:        Colors.textPrimary,
    marginBottom: Space.sm,
  },
  required: {
    color: Colors.brand,
  },
  optional: {
    fontWeight: Type.weightNormal,
    color:      Colors.textTertiary,
  },
  hint: {
    fontSize:    Type.sizeCaption,
    color:       Colors.textTertiary,
    lineHeight:  18,
    marginTop:   -Space.xs,
    marginBottom: Space.md,
  },

  // Inputs
  input: {
    backgroundColor:   Colors.surfaceMuted,
    borderRadius:      Radius.md,
    borderWidth:       1,
    borderColor:       Colors.border,
    paddingHorizontal: Space.md,
    paddingVertical:   Platform.OS === 'ios' ? 14 : 12,
    fontSize:          Type.sizeBody,
    color:             Colors.textPrimary,
    marginBottom:      Space.lg,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  Space.lg,
  },
  atPrefix: {
    backgroundColor:        Colors.surfacePale,
    borderWidth:            1,
    borderRightWidth:       0,
    borderColor:            Colors.border,
    borderTopLeftRadius:    Radius.md,
    borderBottomLeftRadius: Radius.md,
    paddingHorizontal:      Space.md,
    paddingVertical:        Platform.OS === 'ios' ? 14 : 12,
    justifyContent:         'center',
  },
  atSign: {
    fontSize:   Type.sizeBody,
    color:      Colors.textSecondary,
    fontWeight: Type.weightSemibold,
  },
  usernameInput: {
    flex:                    1,
    borderTopLeftRadius:     0,
    borderBottomLeftRadius:  0,
    marginBottom:            0,
  },

  // Country selector trigger
  selector: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.surfaceMuted,
    borderRadius:    Radius.md,
    borderWidth:     1,
    borderColor:     Colors.border,
    paddingHorizontal: Space.md,
    paddingVertical:   Platform.OS === 'ios' ? 14 : 12,
    marginBottom:    Space.lg,
  },
  selectorSelected: {
    borderColor: Colors.brand,
    backgroundColor: Colors.white,
  },
  selectorValue: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Space.sm,
  },
  selectorFlag: {
    fontSize: 22,
  },
  selectorLabel: {
    fontSize:   Type.sizeBody,
    color:      Colors.textPrimary,
    fontWeight: Type.weightMedium,
  },
  selectorPlaceholder: {
    flex:     1,
    fontSize: Type.sizeBody,
    color:    Colors.textTertiary,
  },

  // Save button
  saveBtn: {
    backgroundColor: Colors.brand,
    borderRadius:    Radius.pill,
    height:          56,
    alignItems:      'center',
    justifyContent:  'center',
    marginTop:       Space.xl,
    ...Platform.select({
      ios:     { shadowColor: Colors.brand, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14 },
      android: { elevation: 6 },
    }),
  },
  saveBtnDisabled: {
    backgroundColor: Colors.surfaceOverlay,
    ...Platform.select({
      ios:     { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  saveBtnText: {
    color:         Colors.white,
    fontSize:      Type.sizeBody,
    fontWeight:    Type.weight700,
    letterSpacing: 0.2,
  },
});
