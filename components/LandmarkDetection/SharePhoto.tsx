import { Shadows } from "@/constants/style";
import { Image } from "expo-image";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MapPin } from "react-native-phosphor";
import QRCode from "react-native-qrcode-svg";

interface CulbiShareCardProps {
  userPhotoUri: string;
  landmarkName: string;
  location: string;
  aiFunFact?: string;
  userHandle: string;
  userAvatarUri: string;
  landmarkId: string;
}

export const CulbiShareCard = ({
  userPhotoUri,
  landmarkName,
  location,
  aiFunFact,
  userHandle,
  userAvatarUri,
  landmarkId,
}: CulbiShareCardProps) => {
  const travelDate = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  return (
    <View style={s.wrapper}>
      {/* ── Card (capture target) ── */}
      <View style={s.card} collapsable={false}>
        {/* Hero Image */}
        <View style={s.imageContainer}>
          <Image
            source={{ uri: userPhotoUri }}
            style={s.heroImage}
            contentFit="cover"
          />

          {/* Gradient scrim at bottom of image */}
          <View style={s.imageScrim} />

          {/* Location pill overlaid on image */}
          <View style={s.locationPill}>
            <MapPin size={12} color="#1A1A1A" weight="fill" />
            <Text style={s.locationPillText}>{location}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={s.content}>
          {/* Date */}
          <Text style={s.dateLabel}>{travelDate}</Text>

          {/* Landmark name */}
          <Text style={s.landmarkName} numberOfLines={2}>
            {landmarkName}
          </Text>

          {/* Divider */}
          <View style={s.divider} />

          {/* Fun fact */}
          <Text style={s.funFact} numberOfLines={3}>
            {aiFunFact ||
              "A lost city carved in colored stone hiding behind grand majestic canyons, waiting to be discovered."}
          </Text>

          {/* Footer */}
          <View style={s.footer}>
            {/* User info */}
            <View style={s.userRow}>
              <Image source={{ uri: userAvatarUri }} style={s.avatar} />
              <View>
                <Text style={s.sharedByLabel}>Shared by</Text>
                <Text style={s.userHandle}>{userHandle}</Text>
              </View>
            </View>

            {/* QR code */}
            <View style={s.qrContainer}>
              <QRCode
                value={`https://culbi.app/landmark/${landmarkId}`}
                size={36}
                color="#1A1A1A"
                backgroundColor="transparent"
              />
            </View>
          </View>

          {/* Branding */}
          <View style={s.brandRow}>
            <Text style={s.brandText}>culbi.app</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg: "#F7F5F2", // warm off-white page bg
  card: "#FFFFFF",
  ink: "#1A1A1A",
  inkMid: "#555555",
  inkLight: "#999999",
  border: "#EBEBEB",
  accent: "#1A1A1A",
};

const s = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
  },

  // ── Card ──────────────────────────────────────────────
  card: {
    width: 340,
    backgroundColor: C.card,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
    elevation: 10,
  },

  // ── Hero ──────────────────────────────────────────────
  imageContainer: {
    height: 360,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    ...Shadows.level5,
  },
  imageScrim: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    // A subtle fade so the card content below feels connected
    backgroundColor: "rgba(255,255,255,0.0)",
  },
  locationPill: {
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
  locationPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.ink,
    letterSpacing: 0.2,
  },

  // ── Content ──────────────────────────────────────────
  content: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: C.inkLight,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  landmarkName: {
    fontSize: 26,
    fontWeight: "700",
    color: C.ink,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 16,
  },
  funFact: {
    fontSize: 13,
    lineHeight: 20,
    color: C.inkMid,
    fontWeight: "400",
  },

  // ── Footer ───────────────────────────────────────────
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  sharedByLabel: {
    fontSize: 10,
    color: C.inkLight,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 1,
  },
  userHandle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.ink,
  },
  qrContainer: {
    padding: 8,
    backgroundColor: "#F4F4F4",
    borderRadius: 12,
  },

  // ── Brand strip ──────────────────────────────────────
  brandRow: {
    marginTop: 14,
    alignItems: "center",
  },
  brandText: {
    fontSize: 11,
    color: C.inkLight,
    letterSpacing: 1.5,
    textTransform: "lowercase",
    fontWeight: "500",
  },

  // ── Share Actions ─────────────────────────────────────
  actions: {
    marginTop: 28,
    width: 340,
    gap: 12,
  },
  primaryAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: C.ink,
    paddingVertical: 16,
    borderRadius: 100,
  },
  primaryActionText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  secondaryActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  iconAction: {
    width: 52,
    height: 52,
    borderRadius: 100,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: "center",
    alignItems: "center",
  },
});
