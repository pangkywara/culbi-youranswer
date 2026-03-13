import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MapPin } from "react-native-phosphor";
import QRCode from "react-native-qrcode-svg";

import { Shadows } from "@/constants/style";
import { DetectionResult } from "@/types/landmark";
import { SkeletonBlock } from "./SkeletonBlock";

// ─── Local design tokens (card-private) ──────────────────────────────────────

const C = {
  card: "#FFFFFF",
  ink: "#1A1A1A",
  inkMid: "#555555",
  inkLight: "#999999",
  border: "#EBEBEB",
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShareCardProps {
  imageUri: string;
  loading: boolean;
  result: DetectionResult | null;
  userProfile: { handle: string; avatar: string };
}

// ─── Component ───────────────────────────────────────────────────────────────

export const ShareCard = React.forwardRef<View, ShareCardProps>(
  function ShareCard({ imageUri, loading, result, userProfile }, ref) {
    const travelDate = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const location = result
      ? [result.city, result.country].filter(Boolean).join(", ")
      : "";

    return (
      <View style={sc.root} ref={ref} collapsable={false}>
        {/* ── Hero image ── */}
        <View style={sc.imgBox}>
          <Image source={{ uri: imageUri }} style={sc.img} contentFit="cover" />

          {/* Location pill */}
          <View style={sc.pill}>
            <MapPin size={12} color={C.ink} weight="fill" />
            {loading || !location ? (
              <SkeletonBlock width={130} height={11} radius={6} />
            ) : (
              <Text style={sc.pillText}>{location}</Text>
            )}
          </View>
        </View>

        {/* ── Body ── */}
        <View style={sc.body}>
          <Text style={sc.dateLabel}>{travelDate}</Text>

          {/* Landmark name */}
          {loading ? (
            <View style={{ gap: 8, marginTop: 2 }}>
              <SkeletonBlock width="72%" height={26} radius={7} />
              <SkeletonBlock width="46%" height={26} radius={7} />
            </View>
          ) : (
            <Text style={sc.name} numberOfLines={2}>
              {result?.landmarkName ?? "Unknown Location"}
            </Text>
          )}

          <View style={sc.divider} />

          {/* Description */}
          {loading ? (
            <View style={{ gap: 8 }}>
              <SkeletonBlock width="100%" height={12} radius={6} />
              <SkeletonBlock width="88%" height={12} radius={6} />
              <SkeletonBlock width="64%" height={12} radius={6} />
            </View>
          ) : (
            <Text style={sc.desc} numberOfLines={3}>
              {result?.shortDescription ??
                "A remarkable piece of cultural heritage waiting to be explored."}
            </Text>
          )}

          {/* ── Footer ── */}
          <View style={sc.footer}>
            <View style={sc.userRow}>
              {loading ? (
                <SkeletonBlock width={36} height={36} radius={18} />
              ) : (
                <Image
                  source={{ uri: userProfile.avatar }}
                  style={sc.avatar}
                  contentFit="cover"
                />
              )}
              <View style={{ gap: 3 }}>
                <Text style={sc.sharedBy}>Shared by</Text>
                {loading ? (
                  <SkeletonBlock width={72} height={13} radius={6} />
                ) : (
                  <Text style={sc.handle}>{userProfile.handle}</Text>
                )}
              </View>
            </View>

            <View style={sc.qrBox}>
              {loading ? (
                <SkeletonBlock width={36} height={36} radius={8} />
              ) : (
                <QRCode
                  value={`https://culbi.app/landmark/${result?.dbLandmarkId ?? "0"}`}
                  size={36}
                  color={C.ink}
                  backgroundColor="transparent"
                />
              )}
            </View>
          </View>

          <View style={sc.brand}>
            <Text style={sc.brandText}>culbi.app</Text>
          </View>
        </View>
      </View>
    );
  },
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const sc = StyleSheet.create({
  root: {
    width: 340,
    backgroundColor: C.card,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 44,
    elevation: 16,
  },
  imgBox: { height: 360, position: "relative", padding: 6 },
  img: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    borderTopRightRadius: 28,
    borderTopLeftRadius: 28,
    ...Shadows.level3,
  },
  pill: {
    position: "absolute",
    bottom: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.ink,
    letterSpacing: 0.2,
  },
  body: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 18 },
  dateLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: C.inkLight,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  name: {
    fontSize: 26,
    fontWeight: "700",
    color: C.ink,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 16 },
  desc: { fontSize: 13, lineHeight: 20, color: C.inkMid },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  userRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  sharedBy: {
    fontSize: 10,
    color: C.inkLight,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  handle: { fontSize: 14, fontWeight: "700", color: C.ink },
  qrBox: { padding: 8, backgroundColor: "#F4F4F4", borderRadius: 12 },
  brand: { marginTop: 14, alignItems: "center" },
  brandText: {
    fontSize: 11,
    color: C.inkLight,
    letterSpacing: 1.5,
    fontWeight: "500",
  },
});
