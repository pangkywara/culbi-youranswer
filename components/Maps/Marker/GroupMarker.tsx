import { Colors, Shadows } from "@/constants/style";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Lock, UsersThree } from "react-native-phosphor";

// ─── Category colour map ────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Culture: "#8B5CF6",
  Food: "#F59E0B",
  Nature: "#10B981",
  History: "#6366F1",
  Heritage: "#EC4899",
  Religion: "#F97316",
  Landmark: "#3B82F6",
  General: "#6B7280",
};

const DEFAULT_COLOR = Colors.activeChip;

/**
 * Android specific scaling: 
 * iOS stays at 40, Android drops to 28 (approx 30% smaller)
 */
const PIN_SIZE = Platform.OS === "ios" ? 40 : 28;
const TAIL_SIZE = Platform.OS === "ios" ? 12 : 6;
const ICON_SIZE = Platform.OS === "ios" ? 20 : 14;

interface GroupMarkerProps {
  name: string;
  category: string | null;
  visibility: string;
  memberCount: number;
}

function GroupMarkerInner({
  name,
  category,
  visibility,
  memberCount,
}: GroupMarkerProps) {
  const color = (category && CATEGORY_COLORS[category]) || DEFAULT_COLOR;

  return (
    <View
      style={styles.outerRow}
      shouldRasterizeIOS
      renderToHardwareTextureAndroid
    >
      {/* Pin + tail column */}
      <View style={styles.container}>
        <View style={styles.tailWrapper}>
          <View style={[styles.roundedTail, { backgroundColor: color }]} />
        </View>

        <View style={[styles.pinHead, { backgroundColor: color }]}>
          <UsersThree
            size={ICON_SIZE}
            color={Colors.white}
            weight="fill"
          />

          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {memberCount > 99 ? "99+" : memberCount}
            </Text>
          </View>

          {visibility === "private" && (
            <View style={styles.lockBadge}>
              <Lock size={Platform.OS === 'ios' ? 8 : 6} color={Colors.white} weight="fill" />
            </View>
          )}
        </View>
      </View>

      {/* Name — no bg, colored text, white outline via stacked textShadow */}
      <View style={styles.nameWrapper}>
        <Text style={[styles.nameText, { color }]} numberOfLines={2}>
          {name}
        </Text>
      </View>
    </View>
  );
}

const GroupMarker = React.memo(GroupMarkerInner);
export default GroupMarker;

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  container: {
    width: PIN_SIZE,
    height: PIN_SIZE + (Platform.OS === 'ios' ? 6 : 4),
    alignItems: "center",
    justifyContent: "flex-start",
  },
  pinHead: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
    ...Shadows.level2,
  },
  countBadge: {
    position: "absolute",
    top: Platform.OS === 'ios' ? -4 : -3,
    right: Platform.OS === 'ios' ? -5 : -4,
    backgroundColor: Colors.white,
    minWidth: Platform.OS === 'ios' ? 16 : 13,
    height: Platform.OS === 'ios' ? 16 : 13,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
    zIndex: 3,
    ...Shadows.level1,
  },
  countText: {
    fontSize: Platform.OS === 'ios' ? 9 : 7.5,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  lockBadge: {
    position: "absolute",
    bottom: Platform.OS === 'ios' ? -2 : -1,
    right: Platform.OS === 'ios' ? -2 : -1,
    backgroundColor: "#FF5A5F",
    width: Platform.OS === 'ios' ? 13 : 11,
    height: Platform.OS === 'ios' ? 13 : 11,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: Platform.OS === 'ios' ? 1.5 : 1,
    borderColor: Colors.white,
    zIndex: 3,
  },
  tailWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1,
  },
  roundedTail: {
    width: TAIL_SIZE,
    height: TAIL_SIZE,
    borderRadius: Platform.OS === 'ios' ? 3 : 2,
    transform: [{ rotate: "45deg" }],
    marginBottom: Platform.OS === 'ios' ? 4 : 3,
  },

  nameWrapper: {
    marginLeft: 5,
    // Dynamically center text based on pin size
    marginTop: (PIN_SIZE - (Platform.OS === 'ios' ? 22 : 18)) / 2,
    maxWidth: Platform.OS === 'ios' ? 100 : 85,
  },
  nameText: {
    fontSize: Platform.OS === 'ios' ? 11 : 10,
    fontWeight: "800",
    lineHeight: Platform.OS === 'ios' ? 14 : 12,
    letterSpacing: 0.1,
    textShadowColor: "#FFFFFF",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
});