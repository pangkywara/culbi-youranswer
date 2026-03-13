import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Sparkle } from 'react-native-phosphor';

// 1. Handle the library reliably
const AnimatedGlowLib = require('react-native-animated-glow');
const AnimatedGlow = AnimatedGlowLib.AnimatedGlow || AnimatedGlowLib.default || AnimatedGlowLib;

import type { PresetConfig } from 'react-native-animated-glow';
import { Colors } from '@/constants/style';

// --- ULTRA-PREMIUM ATMOSPHERIC PRESET ---
export const appleIntelligence: PresetConfig = {
  metadata: {
    name: 'appleIntelligence',
    textColor: '#FFFFFF',
    category: 'Custom',
    tags: [],
  },
  states: [
    {
      name: "default",
      preset: {
        cornerRadius: 22,
        outlineWidth: 0,
        borderColor: "transparent",
        backgroundColor: "transparent",
        animationSpeed: 0.4, // Barely-there breathing pace
        borderSpeedMultiplier: 1,
        glowLayers: [
          // Background wash: Dropped to 0.03
          { glowPlacement: "inside", colors: ['rgba(0, 2, 251, 1)', 'rgba(170, 27, 123, 1)', 'rgba(207, 0, 0, 1)', 'rgba(255, 158, 25, 1)'], glowSize: 24, opacity: 0.03, speedMultiplier: 1, coverage: 1 },
          
          // Secondary accent: Dropped to 0.04
          { glowPlacement: "inside", colors: ['rgba(0, 14, 255, 1)', 'rgba(170, 22, 150, 1)', 'rgba(207, 0, 0, 1)', 'rgba(255, 154, 16, 1)'], glowSize: 8, opacity: 0.04, speedMultiplier: 1, coverage: 1 },
          
          // The "Edge" light: Dropped to 0.15 (gives just a hint of a sharp rim)
          { glowPlacement: "inside", colors: ['rgba(233, 235, 255, 1)', 'rgba(255, 84, 182, 1)', 'rgba(255, 38, 87, 1)', 'rgba(255, 195, 137, 1)'], glowSize: 1, opacity: 0.15, speedMultiplier: 1, coverage: 1 },
          
          // Atmospheric highlights: Dropped to 0.02
          { glowPlacement: "inside", colors: ['rgba(91, 87, 255, 1)', 'rgba(178, 222, 255, 1)'], glowSize: [0, 4, 4, 0], opacity: 0.02, speedMultiplier: 2, coverage: 0.4 },
          
          // Subtle shimmer: Dropped to 0.01 (purely subconscious)
          { glowPlacement: "inside", colors: ['#FFFFFF'], glowSize: [0, 2, 0], opacity: 0.01, speedMultiplier: 2, coverage: 0.4 }
        ]
      }
    },
    {
      name: "hover",
      preset: {
        animationSpeed: 0.8,
        glowLayers: [
          { glowSize: 29, opacity: 0.06 },
          { glowSize: 8, opacity: 0.08 },
          { glowSize: 1, opacity: 0.25 },
          { glowSize: [0, 5, 5, 0], opacity: 0.04 },
          { glowSize: [0, 2, 0], opacity: 0.02 }
        ]
      }
    },
    {
      name: "press",
      preset: {
        animationSpeed: 1.2,
        glowLayers: [
          { glowSize: 34, opacity: 0.1 },
          { glowSize: 10, opacity: 0.12 },
          { glowSize: 1, opacity: 0.4 },
          { glowSize: [0, 6, 6, 0], opacity: 0.06 },
          { glowSize: [0, 3, 0], opacity: 0.04 }
        ]
      }
    }
  ]
};

export default function AiButton({ onPress }: { onPress?: () => void }) {
  
  if (typeof AnimatedGlow !== 'function' && typeof AnimatedGlow !== 'object') {
    return (
      <Pressable style={styles.fallbackCircle} onPress={onPress}>
        <Sparkle size={18} color={Colors.textSecondary} weight="bold" />
      </Pressable>
    );
  }

  return (
    <View style={styles.buttonWrapper}>
      <AnimatedGlow preset={appleIntelligence}>
        <Pressable 
          style={styles.smallCircle}
          onPress={onPress}
        >
          {/* Slightly smaller icon (18) and bolder weight for better contrast at low opacity */}
          <Sparkle size={18} color={Colors.textSecondary} weight="bold" />
        </Pressable>
      </AnimatedGlow>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent', 
  },
  fallbackCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
});