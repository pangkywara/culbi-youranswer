import React from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowUpRight } from "react-native-phosphor";

import { Colors, Radius, Space, Type, Shadows } from "@/constants/style";
import type { FlashcardItem as FlashcardItemType } from "@/types/landmark";

// ─── Original Colors, New Card Structure ─────────────────────────────────────

const Themes = [
  {
    bg: Colors.brand,       // Charcoal #222222
    accent: Colors.white,
    secondary: "rgba(255,255,255,0.4)",
    btn: "rgba(255,255,255,0.1)",
  },
  {
    bg: Colors.brandSoft,   // Dark Gray #484848
    accent: Colors.white,
    secondary: "rgba(255,255,255,0.4)",
    btn: "rgba(255,255,255,0.1)",
  },
  {
    bg: "#111111",           // Deepest black
    accent: Colors.brand,   // Culbi Blue pop
    secondary: "rgba(255,255,255,0.4)",
    btn: "rgba(255,255,255,0.08)",
  },
];

interface FlashcardCardProps {
  card: FlashcardItemType;
  index: number;
  isBackground?: boolean;
}

export function FlashcardCard({ card, index, isBackground }: FlashcardCardProps) {
  // Safety check: return null if card is undefined
  if (!card) {
    console.warn('[FlashcardCard] Received undefined card');
    return null;
  }

  const theme = Themes[index % Themes.length];

  const handleLearnMore = () => {
    if (card.learnMoreUrl) Linking.openURL(card.learnMoreUrl);
  };

  return (
    <View style={[fc.root, { backgroundColor: theme.bg }, !isBackground && Shadows.level5]}>
      {/* Editorial Header */}
      <View style={fc.header}>
        <View style={fc.badge}>
          <Text style={fc.badgeText}>STEP</Text>
        </View>
        <Text style={fc.cardNumber}>0{index + 1}</Text>
      </View>

      <View style={fc.mainBody}>
        {/* Title Section */}
        <View style={fc.titleContainer}>
          <Text style={[fc.subtitle, { color: theme.secondary }]}>
            {(card.subtitle || "Info").toUpperCase()}
          </Text>
          <Text style={fc.title} numberOfLines={2}>
            {card.title || "Unknown"}
          </Text>
        </View>

        {/* Content Area */}
        <View style={fc.contentArea}>
          {card.type === "pronunciation" && card.phonetic ? (
            <View style={fc.pronunciationWrap}>
              <Text style={[fc.phonetic, { color: theme.accent }]}>
                {card.phonetic}
              </Text>
              <Text style={fc.content} numberOfLines={isBackground ? 2 : undefined}>
                {card.content}
              </Text>
            </View>
          ) : (
            <Text style={fc.content} numberOfLines={isBackground ? 5 : undefined}>
              {card.content}
            </Text>
          )}
        </View>
      </View>

      {/* Footer */}
      {!isBackground && (
        <View style={fc.footer}>
          {card.learnMoreUrl ? (
            <Pressable
              style={({ pressed }) => [
                fc.learnMore,
                { backgroundColor: theme.btn, transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
              onPress={handleLearnMore}
            >
              <Text style={fc.learnMoreText}>Discovery</Text>
              <ArrowUpRight size={14} color={Colors.white} weight="bold" />
            </Pressable>
          ) : (
            <View />
          )}

          <View style={fc.progressWrap}>
            <View style={fc.track}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={[
                    fc.dot,
                    i === index && { backgroundColor: theme.accent, width: 16 },
                    i < index && { backgroundColor: theme.accent, opacity: 0.4 },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const fc = StyleSheet.create({
  root: {
    width: 340,
    height: 480,
    borderRadius: 32,
    padding: 32,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.white,
    letterSpacing: 1,
  },
  cardNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.2)",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  mainBody: {
    flex: 1,
    justifyContent: "center",
  },
  titleContainer: {
    marginBottom: Space.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.white,
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: Space.xs,
  },
  contentArea: {
    marginTop: Space.sm,
  },
  pronunciationWrap: {
    alignItems: "flex-start",
    gap: Space.sm,
  },
  phonetic: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -1,
  },
  content: {
    fontSize: 17,
    color: Colors.white,
    lineHeight: 26,
    fontWeight: "400",
    opacity: 0.8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  learnMore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  learnMoreText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.white,
  },
  progressWrap: {
    alignItems: "flex-end",
  },
  track: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
});