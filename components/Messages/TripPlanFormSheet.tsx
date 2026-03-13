/**
 * TripPlanFormSheet
 * ─────────────────
 * A page-sheet modal that lets the user fill in structured trip details
 * (destination, dates, name, specific places) then fires them off as a
 * single natural-language message to Culbi — bypassing multi-turn ambiguity.
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import {
  X,
  MapPin,
  CalendarBlank,
  Sparkle,
  ArrowRight,
  Tag,
  Star,
} from 'react-native-phosphor';
import { Colors, Type, Space, Radius } from '@/constants/style';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TripPlanFormSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Called with the fully-constructed message to send to Culbi */
  onSubmit: (message: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const TripPlanFormSheet = ({ visible, onClose, onSubmit }: TripPlanFormSheetProps) => {
  const [destination, setDestination] = useState('');
  const [startDate,   setStartDate]   = useState('');
  const [endDate,     setEndDate]     = useState('');
  const [tripName,    setTripName]    = useState('');
  const [places,      setPlaces]      = useState('');

  const startRef  = useRef<TextInput>(null);
  const endRef    = useRef<TextInput>(null);
  const nameRef   = useRef<TextInput>(null);
  const placesRef = useRef<TextInput>(null);

  const canSubmit = destination.trim().length > 0 && startDate.trim().length > 0;

  const reset = useCallback(() => {
    setDestination('');
    setStartDate('');
    setEndDate('');
    setTripName('');
    setPlaces('');
  }, []);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;

    // Build a clear, structured natural-language request
    const dest      = destination.trim();
    const start     = startDate.trim();
    const end       = endDate.trim();
    const name      = tripName.trim();
    const wantVisit = places.trim();

    let msg = `Plan a trip to ${dest}`;
    if (start && end) {
      msg += ` starting from ${start} to ${end}`;
    } else if (start) {
      msg += ` starting from ${start}`;
    }
    msg += '.';

    if (name) {
      msg += ` The trip name is "${name}".`;
    }

    msg += ' Please make a detailed day-by-day itinerary.';

    if (wantVisit) {
      msg += ` I specifically want to visit: ${wantVisit}.`;
    }

    onSubmit(msg);
    reset();
    onClose();
  }, [canSubmit, destination, startDate, endDate, tripName, places, onSubmit, reset, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* ── Header ─────────────────────────────────────────────── */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <View style={s.badge}>
                <Sparkle size={11} color={Colors.brand} weight="fill" />
                <Text style={s.badgeText}>Culbi</Text>
              </View>
              <Text style={s.headerTitle}>Plan a Trip</Text>
              <Text style={s.headerSub}>Fill in the details and Culbi will build your itinerary</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={s.closeBtn} hitSlop={10}>
              <X size={20} color={Colors.textPrimary} weight="bold" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Destination ──────────────────────────────────────── */}
            <View style={s.fieldGroup}>
              <View style={s.fieldLabel}>
                <MapPin size={14} color={Colors.brand} weight="fill" />
                <Text style={s.labelText}>Destination <Text style={s.required}>*</Text></Text>
              </View>
              <TextInput
                style={s.input}
                placeholder="e.g. Kuching, Sarawak"
                placeholderTextColor={Colors.textDisabled}
                value={destination}
                onChangeText={setDestination}
                returnKeyType="next"
                onSubmitEditing={() => startRef.current?.focus()}
                blurOnSubmit={false}
                autoCapitalize="words"
              />
            </View>

            {/* ── Dates row ─────────────────────────────────────────── */}
            <View style={s.dateRow}>
              <View style={[s.fieldGroup, s.dateHalf]}>
                <View style={s.fieldLabel}>
                  <CalendarBlank size={14} color={Colors.brand} weight="fill" />
                  <Text style={s.labelText}>Start Date <Text style={s.required}>*</Text></Text>
                </View>
                <TextInput
                  ref={startRef}
                  style={s.input}
                  placeholder="e.g. April 10, 2026"
                  placeholderTextColor={Colors.textDisabled}
                  value={startDate}
                  onChangeText={setStartDate}
                  returnKeyType="next"
                  onSubmitEditing={() => endRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <View style={[s.fieldGroup, s.dateHalf]}>
                <View style={s.fieldLabel}>
                  <CalendarBlank size={14} color={Colors.textSecondary} weight="regular" />
                  <Text style={s.labelText}>End Date</Text>
                </View>
                <TextInput
                  ref={endRef}
                  style={s.input}
                  placeholder="e.g. April 15, 2026"
                  placeholderTextColor={Colors.textDisabled}
                  value={endDate}
                  onChangeText={setEndDate}
                  returnKeyType="next"
                  onSubmitEditing={() => nameRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>
            </View>

            {/* ── Trip Name ─────────────────────────────────────────── */}
            <View style={s.fieldGroup}>
              <View style={s.fieldLabel}>
                <Tag size={14} color={Colors.textSecondary} weight="regular" />
                <Text style={s.labelText}>Trip Name <Text style={s.optional}>(optional)</Text></Text>
              </View>
              <TextInput
                ref={nameRef}
                style={s.input}
                placeholder="e.g. My Borneo Adventure"
                placeholderTextColor={Colors.textDisabled}
                value={tripName}
                onChangeText={setTripName}
                returnKeyType="next"
                onSubmitEditing={() => placesRef.current?.focus()}
                blurOnSubmit={false}
                autoCapitalize="words"
              />
            </View>

            {/* ── Specific Places ───────────────────────────────────── */}
            <View style={s.fieldGroup}>
              <View style={s.fieldLabel}>
                <Star size={14} color={Colors.textSecondary} weight="regular" />
                <Text style={s.labelText}>Must-Visit Places <Text style={s.optional}>(optional)</Text></Text>
              </View>
              <TextInput
                ref={placesRef}
                style={[s.input, s.textArea]}
                placeholder={'e.g. Sarawak Museum, Semenggoh Wildlife Centre, Bako National Park'}
                placeholderTextColor={Colors.textDisabled}
                value={places}
                onChangeText={setPlaces}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                returnKeyType="done"
              />
              <Text style={s.hint}>Separate multiple places with commas</Text>
            </View>

            {/* ── Spacer for button ─────────────────────────────────── */}
            <View style={{ height: 24 }} />
          </ScrollView>

          {/* ── Footer CTA ───────────────────────────────────────────── */}
          <View style={s.footer}>
            <TouchableOpacity
              style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              <Sparkle size={17} color="#FFF" weight="fill" />
              <Text style={s.submitBtnText}>Ask Culbi to Plan</Text>
              <ArrowRight size={17} color="#FFF" weight="bold" />
            </TouchableOpacity>
            <Text style={s.footerNote}>
              Destination and start date are required
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.surfaceSoft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Space.xl,
    paddingTop: Space.xl,
    paddingBottom: Space.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flex: 1,
    gap: Space.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
    marginBottom: Space.xxs,
  },
  badgeText: {
    fontSize: Type.sizeMicro + 3,
    fontWeight: Type.weight700,
    color: Colors.brand,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: Type.sizeH2,
    fontWeight: Type.weight700,
    color: Colors.textDisplay,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: Type.sizeCaption,
    color: Colors.textSecondary,
    marginTop: Space.xxs,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfacePale,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Space.md,
    marginTop: Space.xxs + 2,
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Space.xl,
    paddingTop: Space.xxl,
    paddingBottom: Space.lg,
  },

  dateRow: {
    flexDirection: 'row',
    gap: Space.md,
  },
  dateHalf: {
    flex: 1,
  },

  fieldGroup: {
    marginBottom: Space.xl,
  },
  fieldLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs + 2,
    marginBottom: Space.sm,
  },
  labelText: {
    fontSize: Type.sizeCaption,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
  },
  required: {
    color: Colors.destructive,
  },
  optional: {
    color: Colors.textDisabled,
    fontWeight: Type.weightNormal,
  },

  input: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Space.lg - 2,
    paddingVertical: Space.md,
    fontSize: Type.sizeBody,
    color: Colors.textDisplay,
    fontWeight: Type.weightNormal,
  },
  textArea: {
    minHeight: 78,
    paddingTop: Space.md,
    paddingBottom: Space.md,
  },
  hint: {
    fontSize: Type.sizeMicro + 3,
    color: Colors.textDisabled,
    marginTop: Space.xs + 1,
    marginLeft: Space.xxs,
  },

  footer: {
    paddingHorizontal: Space.xl,
    paddingTop: Space.md,
    paddingBottom: Platform.OS === 'ios' ? Space.sm : Space.lg,
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    gap: Space.sm,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
    backgroundColor: Colors.brand,
    borderRadius: Radius.card,
    paddingVertical: Space.lg,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    fontSize: Type.sizeTitle,
    fontWeight: Type.weight700,
    color: Colors.white,
    letterSpacing: -0.2,
  },
  footerNote: {
    fontSize: Type.sizeMicro + 3,
    color: Colors.textDisabled,
    textAlign: 'center',
  },
});
