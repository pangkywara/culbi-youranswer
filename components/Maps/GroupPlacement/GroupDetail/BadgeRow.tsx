import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Globe, Lock, Tag, Users } from "react-native-phosphor";
import { Colors, Type } from "@/constants/style";

interface BadgeRowProps {
  visibility: "public" | "private";
  category: string | null | undefined;
  memberCount: number;
  memberLimit: number | null | undefined;
  accentColor: string;
}

export function BadgeRow({
  visibility,
  category,
  memberCount,
  memberLimit,
  accentColor,
}: BadgeRowProps) {
  const isPublic = visibility === "public";

  return (
    <View style={styles.badgeRow}>
      {/* Visibility */}
      <View
        style={[
          styles.badge,
          { backgroundColor: isPublic ? "#E8F5E9" : "#FFF3E0" },
        ]}
      >
        {isPublic ? (
          <Globe size={12} color="#2E7D32" weight="bold" />
        ) : (
          <Lock size={12} color="#E65100" weight="bold" />
        )}
        <Text
          style={[
            styles.badgeText,
            { color: isPublic ? "#2E7D32" : "#E65100" },
          ]}
        >
          {isPublic ? "Public" : "Private"}
        </Text>
      </View>

      {/* Category */}
      {category && (
        <View
          style={[styles.badge, { backgroundColor: accentColor + "20" }]}
        >
          <Tag size={12} color={accentColor} weight="bold" />
          <Text style={[styles.badgeText, { color: accentColor }]}>
            {category}
          </Text>
        </View>
      )}

      {/* Member count */}
      <View style={[styles.badge, { backgroundColor: Colors.surfaceMuted }]}>
        <Users size={12} color={Colors.textSecondary} weight="bold" />
        <Text style={[styles.badgeText, { color: Colors.textSecondary }]}>
          {memberCount}
          {memberLimit != null ? ` / ${memberLimit}` : ""} members
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: Type.sizeSmall,
    fontWeight: Type.weightSemibold,
  },
});
