import { Dimensions, Platform, StyleSheet } from "react-native";
import { Easing } from "react-native-reanimated";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.60);
export const PHOTO_HEIGHT = 220;
export const DURATION = 300;
export const EASING_OUT = Easing.out(Easing.cubic);
export const EASING_LINEAR = Easing.linear;

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
        shadowOpacity: 0.10,
        shadowRadius: 20,
      },
      android: { elevation: 24 },
    }),
  },
  dragZone: {
    paddingTop: 12,
    paddingBottom: 12,
    alignItems: "center",
    zIndex: 10,
    backgroundColor: "#ffffff",
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#E0E0E0",
  },
  photoWrapper: {
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  photo: {
    width: "100%",
    height: PHOTO_HEIGHT,
    borderRadius: 16,
  },
  photoFallback: {
    backgroundColor: "#F5F5F5",
    borderRadius: 18,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  card: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
    minHeight: SHEET_HEIGHT - PHOTO_HEIGHT,
  },
});
