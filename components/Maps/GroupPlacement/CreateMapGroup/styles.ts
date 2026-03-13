import { Dimensions, StyleSheet } from "react-native";
import { Colors, Radius, Shadows, Space, Type } from "@/constants/style";

export const { height: SCREEN_H } = Dimensions.get("window");
export const PANEL_HEIGHT = SCREEN_H * 0.72;
export const FLOATING_TAB_H = 80;
export const SPRING = { damping: 22, stiffness: 180, mass: 0.9 } as const;

export const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: PANEL_HEIGHT,
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.cardLg,
    borderTopRightRadius: Radius.cardLg,
    ...Shadows.level5,
  },
  dragZone: {
    paddingTop: Space.sm,
    paddingBottom: Space.md,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceOverlay,
    marginBottom: Space.md,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: Space.xl,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  groupIconBg: {
    backgroundColor: "#E8F0FE",
  },
  sheetTitle: {
    fontSize: Type.sizeH3,
    fontWeight: Type.weight700,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: "center",
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: Space.xl,
    paddingBottom: Space.xxxl,
  },
  inputBlock: {
    marginBottom: Space.md,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Space.sm,
  },
  nameInput: {
    flex: 1,
    fontSize: Type.sizeTitle,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
    padding: 0,
  },
  charCount: {
    fontSize: Type.sizeSmall,
    color: Colors.textTertiary,
  },
  descInput: {
    fontSize: Type.sizeBody,
    color: Colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Space.sm,
    marginBottom: Space.lg,
    minHeight: 40,
    textAlignVertical: "top",
    padding: 0,
  },
  sectionLabel: {
    fontSize: Type.sizeCaption,
    fontWeight: Type.weightSemibold,
    color: Colors.textSecondary,
    marginBottom: Space.sm,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  limitInput: {
    fontSize: Type.sizeBody,
    color: Colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Space.sm,
    marginBottom: Space.lg,
    padding: 0,
  },
  errorText: {
    fontSize: Type.sizeCaption,
    color: Colors.destructive,
    marginBottom: Space.md,
  },
  ctaBtn: {
    backgroundColor: Colors.activeChip,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Space.sm,
  },
  ctaBtnDisabled: {
    opacity: 0.5,
  },
  ctaBtnText: {
    fontSize: Type.sizeTitle,
    fontWeight: Type.weight700,
    color: Colors.white,
  },
});
