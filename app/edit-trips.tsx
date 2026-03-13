import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTrips } from '@/context/TripContext';
import { EditNavbar } from '@/components/Edit/EditNavbar';
import { SettingsField } from '@/components/Edit/TripSettings/SettingsField';
import { ToggleRow } from '@/components/Edit/TripSettings/ToggleRow';
import { CollaboratorsSection } from '@/components/Edit/TripSettings/CollaboratorsSection';
import { CalendarView } from '@/components/Calendar/CalendarView';
import { Colors, Type, Space, S } from '@/constants/style';

export default function EditTripSettingsScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { trips, updateTrip } = useTrips();

  const trip = trips.find((t) => t.id === tripId);

  // ─── Local Form State ──────────────────────────────────────────────────────
  const [name, setName]                     = useState(trip?.trip_name ?? '');
  const [dates, setDates]                   = useState(trip?.date_range ?? '');
  const [description, setDescription]       = useState(trip?.description ?? '');
  const [collaborators, setCollaborators]   = useState<string[]>(trip?.collaborators ?? []);
  const [isPublic, setIsPublic]             = useState((trip?.privacy ?? 'private') === 'public');

  // Logic to detect if anything changed
  const isDirty = (
    name          !== (trip?.trip_name ?? '') ||
    dates         !== (trip?.date_range ?? '') ||
    description   !== (trip?.description ?? '') ||
    isPublic      !== ((trip?.privacy ?? 'private') === 'public') ||
    JSON.stringify(collaborators) !== JSON.stringify(trip?.collaborators ?? [])
  );

  const handleSave = useCallback(() => {
    if (!trip || !name.trim()) return;
    updateTrip(trip.id, {
      trip_name:     name.trim(),
      date_range:    dates.trim() || 'TBD',
      description:   description.trim() || undefined,
      collaborators: collaborators.length > 0 ? collaborators : undefined,
      privacy:       isPublic ? 'public' : 'private',
    });
    router.back();
  }, [trip, name, dates, description, collaborators, isPublic, updateTrip, router]);

  const handleAddCollaborator = useCallback((email: string) => {
    setCollaborators((prev) => [...prev, email]);
  }, []);

  const handleRemoveCollaborator = useCallback((email: string) => {
    setCollaborators((prev) => prev.filter((c) => c !== email));
  }, []);

  if (!trip) return null;

  return (
    <KeyboardAvoidingView
      style={S.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={S.screen}>
        {/* ── Header ── */}
        <EditNavbar title="Trip settings" onClose={() => router.back()} />

        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ─ Section: Details ─ */}
          <SectionHeader label="Details" />

          <View style={s.fieldWrapper}>
            <SettingsField
              label="Trip name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Sarawak Heritage Walk"
              returnKeyType="next"
            />

            {/* Calendar Integrated Here */}
            <View style={s.calendarSection}>
              <Text style={s.fieldLabel}>Trip Dates</Text>
              <CalendarView 
                selectedDate={dates}
                onDateChange={(range) => setDates(range)} 
              />
              {dates ? (
                <View style={s.dateBubble}>
                   <Text style={s.dateText}>{dates.replace(/ /g, '  →  ')}</Text>
                </View>
              ) : null}
            </View>

            <SettingsField
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="What's this trip about?"
              optional
              multiline
              returnKeyType="done"
            />
          </View>

          {/* ─ Section: People ─ */}
          <SectionHeader label="People" topGap />
          <CollaboratorsSection
            collaborators={collaborators}
            onAdd={handleAddCollaborator}
            onRemove={handleRemoveCollaborator}
          />

          {/* ─ Section: Privacy ─ */}
          <SectionHeader label="Privacy" topGap />
          <ToggleRow
            label="Make visible to all"
            description="Anyone with the link can view this trip."
            value={isPublic}
            onValueChange={setIsPublic}
          />

          <View style={{ height: 140 }} />
        </ScrollView>

        {/* ── Footer ── */}
        <View style={s.footer}>
          <TouchableOpacity
            style={[S.btnPrimary, (!name.trim() || !isDirty) && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!name.trim() || !isDirty}
            activeOpacity={0.8}
          >
            <Text style={S.btnPrimaryText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// ─── Internal Helper Component ──────────────────────────────────────────────

function SectionHeader({ label, topGap }: { label: string; topGap?: boolean }) {
  return (
    <View style={[sh.row, topGap && sh.topGap]}>
      <Text style={sh.label}>{label}</Text>
      <View style={sh.line} />
    </View>
  );
}

const sh = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.md, marginBottom: Space.md },
  topGap: { marginTop: Space.xl },
  label: {
    fontSize: Type.sizeSmall,
    fontWeight: Type.weightBold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  line: { flex: 1, height: 1, backgroundColor: Colors.borderSubtle },
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Space.xxl, paddingTop: Space.xl },
  fieldWrapper: { gap: Space.lg },
  calendarSection: {
    marginTop: Space.xs,
  },
  fieldLabel: {
    fontSize: Type.sizeSmall,
    fontWeight: Type.weightBold,
    color: Colors.textSecondary,
    marginBottom: Space.xs,
  },
  dateBubble: {
    backgroundColor: Colors.surfaceMuted,
    padding: Space.md,
    borderRadius: 8,
    marginTop: Space.sm,
    alignItems: 'center',
  },
  dateText: {
    // Changed sizeMedium -> sizeBody
    fontSize: Type.sizeBody, 
    color: Colors.textPrimary,
    // Changed weightSemiBold -> weightSemibold
    fontWeight: Type.weightSemibold, 
  },
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: Space.xxl,
    paddingTop: Space.lg,
    paddingBottom: Platform.OS === 'ios' ? 44 : Space.xl,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  saveBtnDisabled: { backgroundColor: Colors.surfaceMuted, opacity: 0.6 },
});