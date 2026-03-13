/**
 * BotProposalBar.tsx
 * ──────────────────
 * Slides up from the bottom when Culbi returns a PROPOSE_CHANGES response.
 * Shows the AI's summary, ghost-stop count, and Accept / Discard controls.
 *
 * Props
 * ─────
 * proposal   ActiveProposal from TripContext
 * onAccept   () => void  — caller commits the change
 * onDiscard  () => void  — caller clears the proposal
 * bottomOffset  — compensate for tab bar height (default 0)
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { Sparkle, Check, X } from 'react-native-phosphor';
import { Colors, Type, Space, Radius, Shadows } from '@/constants/style';
import type { ActiveProposal } from '@/context/TripContext';

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  proposal:     ActiveProposal | undefined;
  onAccept:     () => void;
  onDiscard:    () => void;
  bottomOffset?: number;
}

export function BotProposalBar({
  proposal,
  onAccept,
  onDiscard,
  bottomOffset = 0,
}: Props) {
  const translateY = useRef(new Animated.Value(200)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: proposal ? 0 : 200,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [proposal]);

  if (!proposal) return null;

  const addCount    = proposal.changes.additions.length;
  const reorderCount = proposal.changes.reorders.length;
  const deleteCount  = proposal.changes.deletions.length;

  const changesLine = [
    addCount    > 0 && `+${addCount} added`,
    reorderCount > 0 && `${reorderCount} reordered`,
    deleteCount  > 0 && `${deleteCount} removed`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }], bottom: bottomOffset + (Platform.OS === 'ios' ? 16 : 8) },
      ]}
    >
      {/* AI sparkle header */}
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Sparkle size={16} color={Colors.brand} weight="fill" />
        </View>
        <Text style={styles.label}>Culbi suggests</Text>
      </View>

      {/* Summary text */}
      <Text style={styles.summary} numberOfLines={3}>
        {proposal.summary}
      </Text>

      {/* Changes pill */}
      {changesLine ? (
        <Text style={styles.changesPill}>{changesLine}</Text>
      ) : null}

      {/* Action row */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.discardBtn}
          onPress={onDiscard}
          activeOpacity={0.75}
        >
          <X size={16} color={Colors.textSecondary} weight="bold" />
          <Text style={styles.discardText}>Discard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={onAccept}
          activeOpacity={0.85}
        >
          <Check size={16} color="#fff" weight="bold" />
          <Text style={styles.acceptText}>Keep Changes</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Space.lg,
    right: Space.lg,
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    padding: Space.md,
    paddingBottom: Space.lg,
    ...Shadows.level4,
    zIndex: 100,
    // Thin brand-blue top accent
    borderTopWidth: 3,
    borderTopColor: Colors.brand,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Space.xs,
    gap: Space.xs,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${Colors.brand}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: Type.weightSemibold,
    fontSize: Type.sizeSmall,
    color: Colors.brand,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summary: {
    fontWeight: Type.weightNormal,
    fontSize: Type.sizeBodySm,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginBottom: Space.xs,
  },
  changesPill: {
    fontWeight: Type.weightMedium,
    fontSize: Type.sizeSmall,
    color: Colors.textSecondary,
    marginBottom: Space.md,
  },
  actions: {
    flexDirection: 'row',
    gap: Space.sm,
    marginTop: Space.xs,
  },
  discardBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  discardText: {
    fontWeight: Type.weightMedium,
    fontSize: Type.sizeBodySm,
    color: Colors.textSecondary,
  },
  acceptBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.brand,
  },
  acceptText: {
    fontWeight: Type.weightSemibold,
    fontSize: Type.sizeBodySm,
    color: '#fff',
  },
});
