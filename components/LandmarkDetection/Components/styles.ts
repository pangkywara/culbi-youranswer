import { StyleSheet } from "react-native";
import { Colors } from "@/constants/style";

export const ov = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(0,0,0,0.88)", zIndex: 0 },
  closeWrap: { position: "absolute", right: 20, zIndex: 100 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  cardArea: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", zIndex: 10 },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20,
    paddingTop: 18, paddingHorizontal: 20, gap: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.07)",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  loadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 6 },
  loadingText: { fontSize: 13, color: "rgba(255,255,255,0.45)", fontWeight: "500" },
  errorDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.destructive },
  errorText: { fontSize: 13, color: Colors.destructive, fontWeight: "500" },
  hintRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  hintText: { fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: "600", letterSpacing: 0.5 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  utilBtn: {
    flex: 1, height: 62, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center", gap: 4,
  },
  utilBtnText: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.65)" },
  primaryBtn: {
    flex: 2, height: 62, borderRadius: 18,
    backgroundColor: Colors.brand,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  primaryBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  btnPressed: { opacity: 0.55 },
});

export const d = StyleSheet.create({
  row: { flexDirection: "row", gap: 5, alignItems: "center" },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.7)" },
});