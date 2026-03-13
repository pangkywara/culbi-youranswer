/**
 * TimelineEtiquette.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Compact cultural etiquette display for trip timeline stops.
 * Shows important cultural rules/guidelines for each landmark.
 * 
 * Differences from full ThingsToKnow.tsx:
 *  • More compact layout (fits within timeline cards)
 *  • Shows up to 3 rules (vs 4 in full version)
 *  • No "Ask Culbi" CTA (inline context)
 *  • Simplified badges and spacing
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  ShieldCheck,
  Warning,
  CheckCircle,
  Lightbulb,
  type IconProps,
} from 'react-native-phosphor';
import type { LandmarkRule, RuleSeverity } from '@/types/database';
import { Colors, Type, Space, Radius } from '@/constants/style';

export interface TimelineEtiquetteProps {
  rules: LandmarkRule[];
  maxRules?: number;
}

const SEVERITY_CONFIG: Record<
  RuleSeverity,
  { icon: React.ComponentType<IconProps>; color: string; label: string }
> = {
  Mandatory: { icon: Warning, color: '#E31C5F', label: 'Required' },
  Recommended: { icon: CheckCircle, color: '#008A05', label: 'Recommended' },
  'Pro-Tip': { icon: Lightbulb, color: '#0F62FE', label: 'Pro Tip' },
};

export default function TimelineEtiquette({ rules, maxRules = 3 }: TimelineEtiquetteProps) {
  if (!rules || rules.length === 0) return null;

  const displayRules = rules.slice(0, maxRules);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ShieldCheck size={16} color={Colors.textSecondary} weight="bold" />
        <Text style={styles.title}>Cultural etiquette</Text>
      </View>

      {displayRules.map((rule) => {
        const cfg = SEVERITY_CONFIG[rule.severity] ?? SEVERITY_CONFIG['Pro-Tip'];
        const IconComponent = cfg.icon;

        return (
          <View key={rule.id} style={styles.ruleItem}>
            <View style={styles.iconCircle}>
              <IconComponent size={14} color={cfg.color} weight="fill" />
            </View>
            <View style={styles.ruleContent}>
              <View style={styles.ruleTitleRow}>
                <Text style={styles.ruleTitle}>{rule.title}</Text>
                <View style={[styles.badge, { backgroundColor: cfg.color + '18' }]}>
                  <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>
              <Text style={styles.ruleDescription} numberOfLines={2}>
                {rule.description}
              </Text>
            </View>
          </View>
        );
      })}

      {rules.length > maxRules && (
        <Text style={styles.moreText}>
          +{rules.length - maxRules} more cultural guideline{rules.length - maxRules !== 1 ? 's' : ''}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Space.lg,
    paddingTop: Space.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
    marginBottom: Space.md,
  },
  title: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightSemibold,
    color: Colors.textSecondary,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space.sm,
    marginBottom: Space.md,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  ruleContent: {
    flex: 1,
  },
  ruleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  ruleTitle: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: Type.weightBold,
    letterSpacing: 0.3,
  },
  ruleDescription: {
    fontSize: Type.sizeBodySm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  moreText: {
    fontSize: Type.sizeBodySm,
    color: Colors.brand,
    fontWeight: Type.weightSemibold,
    marginTop: Space.xs,
  },
});
