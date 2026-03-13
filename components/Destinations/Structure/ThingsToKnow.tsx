/**
 * ThingsToKnow.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Production Architecture — Layer 3: GEMINI / Intelligence Layer
 *
 *  • When `rules` are provided (from Supabase landmark_rules):
 *      → Renders real cultural rules with severity badges
 *      → "Ask Culbi" CTA deep-links to the AI chatbot for live follow-ups
 *
 *  • When no rules exist (place not yet in our DB):
 *      → Falls back to generic house-rules style UI (unchanged appearance)
 *      → "Ask Culbi" CTA still available for AI-generated cultural tips
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  ShieldCheck,
  Robot,
  CaretRight,
  Warning,
  CheckCircle,
  Lightbulb,
  type IconProps,
} from 'react-native-phosphor';
import { useRouter } from 'expo-router';
import type { LandmarkRule, RuleSeverity } from '@/types/database';

export interface ThingsToKnowProps {
  rules?: LandmarkRule[];
  placeName?: string;
}

const SEVERITY_CONFIG: Record<
  RuleSeverity,
  { icon: React.ComponentType<IconProps>; color: string; label: string }
> = {
  Mandatory: { icon: Warning, color: '#E31C5F', label: 'Required' },
  Recommended: { icon: CheckCircle, color: '#008A05', label: 'Recommended' },
  'Pro-Tip': { icon: Lightbulb, color: '#0F62FE', label: 'Pro Tip' },
};

export default function ThingsToKnow({ rules, placeName }: ThingsToKnowProps) {
  const router = useRouter();
  const hasCulturalRules = rules && rules.length > 0;

  const handleAskCulbi = () => {
    router.push('/chatbot/chatbot');
  };

  return (
    <View style={styles.container}>
      <View style={styles.topDivider} />

      {/* Section Title */}
      <Text style={styles.title}>
        {hasCulturalRules ? 'Cultural etiquette' : 'Good to know'}
      </Text>

      {/* ── Cultural Rules from Supabase (Layer 3 — Intelligence) ─────── */}
      {hasCulturalRules ? (
        rules!.slice(0, 4).map((rule) => {
          const cfg = SEVERITY_CONFIG[rule.severity] ?? SEVERITY_CONFIG['Pro-Tip'];
          const IconComponent = cfg.icon;
          return (
            <View key={rule.id} style={styles.row}>
              <View style={styles.iconContainer}>
                <IconComponent size={26} color={cfg.color} weight="fill" />
              </View>
              <View style={styles.textContainer}>
                <View style={styles.ruleTitleRow}>
                  <Text style={styles.rowTitle}>{rule.title}</Text>
                  <View style={[styles.badge, { backgroundColor: cfg.color + '18' }]}>
                    <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>
                <Text style={styles.rowSub}>{rule.description}</Text>
              </View>
            </View>
          );
        })
      ) : (
        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <ShieldCheck size={26} color="#222" weight="light" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.rowTitle}>Respect local customs</Text>
            <Text style={styles.rowSub}>
              {'Dress modestly when entering religious or cultural sites.\nAsk before photographing people or ceremonies.'}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.sectionDivider} />

      {/* ── Ask Culbi CTA — always visible ─────────────────────────────── */}
      <TouchableOpacity style={styles.askCulbiBtn} onPress={handleAskCulbi} activeOpacity={0.8}>
        <Text style={styles.askCulbiText}>
          {hasCulturalRules
            ? `Ask Culbi about ${placeName ?? 'this place'}`
            : 'Ask Culbi for cultural tips'}
        </Text>
        <CaretRight size={18} color="#222" weight="bold" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  topDivider: {
    height: 1,
    backgroundColor: '#ebebeb',
    marginTop: 30,
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#222',
    marginBottom: 24,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#ebebeb',
    marginTop: 24,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  iconContainer: {
    marginRight: 16,
    paddingTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  ruleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  rowSub: {
    fontSize: 14,
    color: '#717171',
    lineHeight: 20,
  },
  askCulbiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: '#222', // Already defined
    borderWidth: 1,      // ADDED THIS: Makes the border visible
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  askCulbiText: {
    flex: 1,
    color: '#222',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
