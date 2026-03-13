import { getRarityConfig, type Rarity } from "@/components/Collections/Cards/constants";
import { SkiaGyroCard } from "@/components/LandmarkDetection/SkiaGyroCard";
import { PowerShake } from "@/components/LandmarkDetection/PowerShake";
import { determineRarity } from "@/components/LandmarkDetection/rarityEngine";
import { Colors, Space, Radius, Type } from "@/constants/style";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ArrowLeft } from "react-native-phosphor";
import Animated, { FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

type GachaPhase = "pick" | "shaking" | "reveal";

const ALL_RARITIES: Rarity[] = ["Common", "Rare", "Epic", "Legends", "Mythic", "Secret"];

const TEST_IMAGE = "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80";

export default function GachaTestScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<GachaPhase>("pick");
  const [rarity, setRarity] = useState<Rarity | null>(null);

  const startRandom = () => {
    setRarity(determineRarity(null, null, null, null));
    setPhase("shaking");
  };

  const startWithRarity = (r: Rarity) => {
    setRarity(r);
    setPhase("shaking");
  };

  const handleBurst = () => setPhase("reveal");

  const handleDismiss = () => {
    setPhase("pick");
    setRarity(null);
  };

  if (phase === "shaking" && rarity) {
    return (
      <Animated.View entering={FadeIn} style={StyleSheet.absoluteFill}>
        <PowerShake rarity={rarity} onBurst={handleBurst} />
      </Animated.View>
    );
  }

  if (phase === "reveal" && rarity) {
    return (
      <Animated.View entering={FadeIn} style={StyleSheet.absoluteFill}>
        <SkiaGyroCard imageUri={TEST_IMAGE} rarity={rarity} onDismiss={handleDismiss} />
      </Animated.View>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={24} color={Colors.textBody} />
        </Pressable>
        <Text style={s.title}>Gacha Test</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.body}>
        <Text style={s.sectionTitle}>Pick a rarity or roll random</Text>

        <Pressable style={[s.btn, { backgroundColor: Colors.brand }]} onPress={startRandom}>
          <Text style={s.btnText}>🎲  Random Roll</Text>
        </Pressable>

        <View style={s.grid}>
          {ALL_RARITIES.map((r) => {
            const cfg = getRarityConfig(r);
            return (
              <Pressable
                key={r}
                style={[s.rarityBtn, { borderColor: cfg.glowColor }]}
                onPress={() => startWithRarity(r)}
              >
                <View style={[s.rarityDot, { backgroundColor: cfg.badgeColor }]} />
                <Text style={s.rarityLabel}>{cfg.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceBase },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
  },
  title: {
    fontSize: Type.sizeH2,
    fontWeight: Type.weightBold,
    color: Colors.textBody,
  },
  body: {
    flex: 1,
    paddingHorizontal: Space.lg,
    paddingTop: Space.xl,
    gap: Space.lg,
  },
  sectionTitle: {
    fontSize: Type.sizeBody,
    fontWeight: Type.weightSemibold,
    color: Colors.textBody,
    textAlign: "center",
  },
  btn: {
    paddingVertical: 14,
    borderRadius: Radius.card,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontSize: Type.sizeBody,
    fontWeight: Type.weightBold,
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.sm,
    justifyContent: "center",
    marginTop: Space.md,
  },
  rarityBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.card,
    borderWidth: 1.5,
    backgroundColor: Colors.surfaceMuted,
  },
  rarityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rarityLabel: {
    fontSize: Type.sizeCaption,
    fontWeight: Type.weightSemibold,
    color: Colors.textBody,
  },
});
