import { Dimensions, Platform, StyleSheet } from "react-native";
import { Easing } from "react-native-reanimated";
import { Colors, Type } from "@/constants/style";

const { height: SCREEN_H } = Dimensions.get("window");

export const SHEET_HEIGHT = Math.round(SCREEN_H * 0.6);
export const DURATION = 300;
export const EASING_OUT = Easing.out(Easing.cubic);
export const EASING_LINEAR = Easing.linear;

export const CATEGORY_COLORS: Record<string, string> = {
  Culture: "#8B5CF6",
  Food: "#F59E0B",
  Nature: "#10B981",
  History: "#6366F1",
  Heritage: "#EC4899",
  Religion: "#F97316",
  Landmark: "#3B82F6",
  General: "#6B7280",
};

export const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.30)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: { elevation: 24 },
    }),
  },
  dragZone: {
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: "center",
    backgroundColor: "#ffffff",
    zIndex: 10,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#E0E0E0",
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },
  accentBar: {
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 16,
    height: 80,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  accentBarInner: {
    position: "relative",
  },
  lockBadge: {
    position: "absolute",
    bottom: -4,
    right: -8,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 8,
    padding: 3,
  },
  nameSection: {
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  groupName: {
    fontSize: Type.sizeH2,
    fontWeight: Type.weight700,
    color: Colors.textDisplay,
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  descSection: {
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  descText: {
    fontSize: Type.sizeBody,
    color: Colors.textBody,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  metaText: {
    fontSize: Type.sizeBodySm,
    color: Colors.textTertiary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginHorizontal: 24,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: Type.sizeCaption,
    fontWeight: Type.weightSemibold,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
});
