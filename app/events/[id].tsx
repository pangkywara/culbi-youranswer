/**
 * app/events/[id].tsx
 * ────────────────────
 * Event detail screen. Fetches a single event from Supabase by phq_id and
 * renders it using the existing Events structure components.
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { CalendarBlank, MapPin, Users, NavigationArrow, Clock, HouseSimple, MapPinLine, FlowerLotus } from 'react-native-phosphor';

import { useEventDetail } from '@/hooks/useEventDetail';
import { formatEventDateRange, formatEventDate } from '@/hooks/useEvents';

import EventHeroHeader   from '@/components/Events/EventHeroHeader';
import TitleSection      from '@/components/Events/Structure/Section/TitleSection';
import PlaceSection      from '@/components/Events/Structure/Section/PlaceSection';
import DescriptionSection from '@/components/Events/Structure/Section/DescriptionSection';
import FunFactsSection   from '@/components/Events/Structure/Section/FunFacts';
import FloatingStaticHeader from '@/components/Events/Structure/HeaderFooter/FloatingStaticHeader'; // Assuming this is where you saved it
import { Colors, Shadows } from '@/constants/style';
import { LinearGradient } from 'expo-linear-gradient';

// ─── Utilities ───────────────────────────────────────────────────────────────

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ') : s;
}

// ─── Event info row ──────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={infoStyles.row}>
      <View style={infoStyles.iconWrapper}>{icon}</View>
      <View style={infoStyles.text}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={infoStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 20,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, justifyContent: 'center' },
  label: { fontSize: 12, color: '#717171', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 15, color: '#222', fontWeight: '500', marginTop: 2, lineHeight: 20 },
});

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { event, loading, error } = useEventDetail(id ?? '');

  // ── Loading state ──
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#222" />
        <Text style={styles.loadingText}>Loading event…</Text>
      </View>
    );
  }

  // ── Error / not found ──
  if (error || !event) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Event not found.'}</Text>
      </View>
    );
  }

  // ── Derived values ──
  const dateRange   = formatEventDateRange(event.start_dt, event.end_dt);
  const startFull   = formatEventDate(event.start_dt);
  const endFull     = event.end_dt ? formatEventDate(event.end_dt) : null;
  const location    = [event.city, event.state, event.country_name].filter(Boolean).join(', ');
  const venueLabel  = event.venue_name ?? location;

  const handleLearnMore = () => {
    const query = encodeURIComponent(`${event.title} ${event.city ?? event.country_name}`);
    Linking.openURL(`https://www.google.com/search?q=${query}`);
  };

  const funFacts: string[] = event.labels && event.labels.length > 0
    ? event.labels.map(l => capitalize(l.replace(/-/g, ' ')))
    : [
        `A ${capitalize(event.category)} event held in ${event.country_name}.`,
        event.scope ? `Scope: ${capitalize(event.scope)} event.` : '',
        event.phq_attendance
          ? `Expected attendance: ${event.phq_attendance.toLocaleString()} people.`
          : '',
      ].filter(Boolean);

  return (
    <View style={styles.container}>
      {/* ── Fixed Static Header ── */}
      <FloatingStaticHeader placeId={event.id} placeName={event.title} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollPadding}
      >
        <View style={styles.content}>
            {/* ── Hero image container ── */}
            <View style={styles.heroWrapper}>
                <EventHeroHeader 
                    id={event.id} 
                    imageUrl={event.image_url} 
                    eventTitle={event.title} 
                />
            </View>

            {/* ── Title ── */}
            <TitleSection
                name={event.title}
                vicinity={venueLabel}
                category={capitalize(event.category)}
                region={event.country_name}
            />

            {/* ── Venue / Host row ── */}
            <PlaceSection
                name={venueLabel}
                category={capitalize(event.category)}
                region={location}
                primaryPhotoUrl={event.image_url}
            />

            {/* ── Event info grid ── */}
            <View style={styles.infoSection}>
                <InfoRow
                    icon={<CalendarBlank size={18} color="#222" weight="regular" />}
                    label="Date"
                    value={endFull ? `${startFull} – ${endFull}` : startFull}
                />

                {event.venue_name ? (
                    <InfoRow
                        icon={<HouseSimple size={18} color="#222" weight="regular" />}
                        label="Venue"
                        value={event.venue_name + (event.venue_address ? `\n${event.venue_address}` : '')}
                    />
                ) : null}

                {location ? (
                    <InfoRow
                        icon={<MapPinLine size={18} color="#222" weight="regular" />}
                        label="Location"
                        value={location}
                    />
                ) : null}

                {event.phq_attendance ? (
                    <InfoRow
                        icon={<Users size={18} color="#222" weight="regular" />}
                        label="Expected Attendance"
                        value={event.phq_attendance.toLocaleString() + ' people'}
                    />
                ) : null}

                {event.scope ? (
                    <InfoRow
                        icon={<FlowerLotus size={18} color="#222" weight="regular" />}
                        label="Scope"
                        value={capitalize(event.scope)}
                    />
                ) : null}
            </View>

            <View style={styles.divider} />

            <DescriptionSection overview={event.description ?? undefined} />
            <FunFactsSection facts={funFacts} />
        </View>
      </ScrollView>

      {/* ── Sticky footer ── */}
      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerDate}>{dateRange}</Text>
          <Text style={styles.footerSub}>{event.country_name}</Text>
        </View>
        <TouchableOpacity 
            style={styles.learnBtnContainer} 
            onPress={handleLearnMore} 
            activeOpacity={0.85}
        >
            <LinearGradient
                colors={[Colors.brand, Colors.brandSoft]} 
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.learnBtn}
            >
                <Text style={styles.learnBtnText}>Learn More</Text>
            </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollPadding: { paddingBottom: 120 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
  },
  loadingText: { fontSize: 14, color: '#717171' },
  errorText:   { fontSize: 15, color: '#717171', textAlign: 'center', paddingHorizontal: 32 },

  // Content
  content: { 
    paddingHorizontal: 24, 
    // Reduced padding top since Header handles the safe area spacing
    paddingTop: 24, 
  }, 

  heroWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    // Adds breathing room below the static header
    marginTop: 8, 
    marginBottom: 24,
    backgroundColor: '#f0f0f0',
    ...Shadows.level2,
  },

  infoSection: {
    marginTop: 8,
    paddingTop: 4,
  },

  divider: { height: 1, backgroundColor: '#ebebeb', marginVertical: 8 },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    ...Shadows.level5,
  },
  footerInfo: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: '#F0F0F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerDate: { fontSize: 16, fontWeight: '700', color: '#222' },
  footerSub:  { fontSize: 14, color: '#717171' },
  learnBtnContainer: {
    borderRadius: 12,
    overflow: 'hidden', 
  },
  learnBtn: {
    marginTop: 12,
    marginHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  learnBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});