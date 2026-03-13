/**
 * GachaPullButton.tsx
 * Optimized for smooth transitions between 'shaking' and 'reveal' phases.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { Ticket } from 'react-native-phosphor';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Colors, Space, Type, Radius } from '@/constants/style';
import { PowerShake } from '@/components/LandmarkDetection/PowerShake';
import { SkiaGyroCard } from '@/components/LandmarkDetection/SkiaGyroCard';
import { useGachaPull, useGachaTickets } from '@/hooks/useGacha';
import type { Rarity } from '@/components/Collections/Cards/constants';

export type GachaPhase = 'idle' | 'shaking' | 'reveal';

export interface GachaAnimationProps {
  phase: GachaPhase;
  rarity: Rarity;
  imageUri: string;
  onBurst: () => void;
  onDismiss: () => void;
}

// Optimized Animation component
export function GachaAnimation({ phase, rarity, imageUri, onBurst, onDismiss }: GachaAnimationProps) {
  
  // High-performance tip: Pre-fetch the image as soon as we have the URI
  useEffect(() => {
    if (imageUri) {
      Image.prefetch(imageUri);
    }
  }, [imageUri]);

  if (phase === 'idle') return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* REVEAL LAYER (Bottom) 
         We render this first. If phase is reveal, it fades in.
      */}
      {phase === 'reveal' && (
        <Animated.View 
          entering={FadeIn.duration(500)} 
          style={StyleSheet.absoluteFill}
        >
          <SkiaGyroCard
            imageUri={imageUri}
            rarity={rarity}
            onDismiss={onDismiss}
          />
        </Animated.View>
      )}

      {/* SHAKING LAYER (Top) 
         We use FadeOut here so that when the phase changes to 'reveal',
         this layer smoothly dissolves instead of disappearing instantly.
      */}
      {phase === 'shaking' && (
        <Animated.View 
          entering={FadeIn.duration(300)} 
          exiting={FadeOut.duration(400)} 
          style={StyleSheet.absoluteFill}
        >
          <PowerShake rarity={rarity} onBurst={onBurst} />
        </Animated.View>
      )}
    </View>
  );
}

interface GachaPullButtonProps {
  onPull: () => Promise<void>;
}

export function GachaPullButton({ onPull }: GachaPullButtonProps) {
  const { tickets, loading: ticketsLoading } = useGachaTickets();
  const { pulling } = useGachaPull();

  const hasNoTickets = tickets === 0;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        hasNoTickets && styles.buttonDisabled,
      ]}
      onPress={onPull}
      disabled={hasNoTickets || pulling || ticketsLoading}
      activeOpacity={0.8}
    >
      <View style={styles.iconBadge}>
        <Ticket 
          size={24} 
          color={hasNoTickets ? Colors.textPrimary : Colors.white} 
          weight="fill" 
        />
        {tickets > 0 && (
          <View style={styles.ticketBadge}>
            <Text style={styles.ticketBadgeText}>{tickets}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.textContainer}>
        <Text style={[
          styles.title, 
          hasNoTickets && { color: Colors.textPrimary }
        ]}>
          {hasNoTickets ? 'No Tickets' : `Pull Gacha Card`}
        </Text>
        <Text style={[
          styles.subtitle, 
          hasNoTickets && { color: Colors.textSecondary }
        ]}>
          {hasNoTickets ? 'Scan landmarks to earn tickets' : `${tickets} ${tickets === 1 ? 'ticket' : 'tickets'} available`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFB703',
    paddingVertical: 16,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.card,
    marginBottom: Space.xl,
    gap: Space.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: Colors.surfaceMuted,
    opacity: 0.8,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ticketBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#E63946',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFB703',
    minWidth: 20,
    alignItems: 'center',
  },
  ticketBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: Type.weightBold,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: Type.sizeTitle,
    fontWeight: Type.weight700,
    color: Colors.white,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightMedium,
    color: 'rgba(255,255,255,0.9)',
  },
});