import React, { useCallback, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Pressable, TouchableOpacity, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Easing,
  withDelay,
} from "react-native-reanimated";
import {
  ArrowCounterClockwise,
  InstagramLogo,
  DownloadSimple,
  ArrowRight,
  Gear,
  X,
} from "react-native-phosphor";

import { Colors, Type, Space, Radius, Shadows, S } from "@/constants/style";

// Clean Easing for the "Dip" feel
const DIP_EASING = Easing.bezier(0.33, 1, 0.68, 1);
const BUBBLE_DURATION = 240; // Snappier duration
const STAGGER_MS = 40;

interface ActionBubbleProps {
  onPress: () => void;
  label: string;
  icon: React.ReactNode;
  loading?: boolean;
}

const ActionBubble = ({ onPress, label, icon, loading }: ActionBubbleProps) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Touch feedback remains subtle timing-based
  const handlePressIn = () => { scale.value = withTiming(0.96, { duration: 100 }); };
  const handlePressOut = () => { scale.value = withTiming(1, { duration: 100 }); };

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress} style={{ alignSelf: 'flex-start' }}>
      <Animated.View style={[s.bubbleContainer, animatedStyle]}>
        <View style={s.bubbleShadow} />
        <LinearGradient colors={[Colors.textBody, Colors.textDisplay]} style={s.bubbleGradient}>
          <View style={s.bubbleHighlight} />
          <View style={s.bubbleContent}>
            {loading ? <ActivityIndicator size="small" color={Colors.white} /> : icon}
            <Text style={s.bubbleLabel}>{label}</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
};

export function BottomSheet({
  loading, error, saving, canReveal, opacity, translateY, bottomInset,
  onClose, onRetake, onStory, onDownload, onStartFlip,
}: any) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [shouldRenderMenu, setShouldRenderMenu] = useState(false);

  const menuIconRotation = useSharedValue(0);
  const bubble0 = useSharedValue(0);
  const bubble1 = useSharedValue(0);
  const bubble2 = useSharedValue(0);

  // Staggered "Dip" Styles - purely opacity and subtle Y translation
  const style0 = useAnimatedStyle(() => ({
    opacity: bubble0.value,
    transform: [{ translateY: interpolate(bubble0.value, [0, 1], [8, 0]) }],
  }));
  const style1 = useAnimatedStyle(() => ({
    opacity: bubble1.value,
    transform: [{ translateY: interpolate(bubble1.value, [0, 1], [8, 0]) }],
  }));
  const style2 = useAnimatedStyle(() => ({
    opacity: bubble2.value,
    transform: [{ translateY: interpolate(bubble2.value, [0, 1], [8, 0]) }],
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const menuIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(menuIconRotation.value, [0, 1], [0, 90])}deg` }],
  }));

  const toggleMenu = useCallback(() => {
    const opening = !isMenuOpen;
    setIsMenuOpen(opening);
    if (opening) {
      setShouldRenderMenu(true);
      // No spring - use withTiming for a clean dip
      menuIconRotation.value = withTiming(1, { duration: 250, easing: DIP_EASING });
      bubble0.value = withDelay(0, withTiming(1, { duration: BUBBLE_DURATION, easing: DIP_EASING }));
      bubble1.value = withDelay(STAGGER_MS, withTiming(1, { duration: BUBBLE_DURATION, easing: DIP_EASING }));
      bubble2.value = withDelay(STAGGER_MS * 2, withTiming(1, { duration: BUBBLE_DURATION, easing: DIP_EASING }));
    } else {
      [bubble2, bubble1, bubble0].forEach((b, i) => {
        b.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.quad) });
      });
      menuIconRotation.value = withTiming(0, { duration: 250, easing: DIP_EASING });
      setTimeout(() => setShouldRenderMenu(false), 200);
    }
  }, [isMenuOpen]);

  const dynamicPadding = bottomInset + Platform.select({ ios: Space.md, android: Space.xs });

  return (
    <Animated.View style={[s.sheet, { paddingBottom: dynamicPadding }, sheetStyle]}>
      {loading ? (
        <View style={s.statusRow}>
          <ActivityIndicator size="small" color={Colors.textSecondary} />
          <Text style={s.loadingText}>Identifying landmark…</Text>
        </View>
      ) : (
        <View style={s.fabContainer} pointerEvents="box-none">
          {/* LEFT: Menu/Settings */}
          <View style={s.sideCol} pointerEvents="box-none">
            {shouldRenderMenu && (
              <View style={s.bubbleStack} pointerEvents="box-none">
                <Animated.View style={style2}><ActionBubble label="Retake" icon={<ArrowCounterClockwise size={18} color={Colors.white} weight="bold" />} onPress={() => { toggleMenu(); onRetake(); }} /></Animated.View>
                <Animated.View style={style1}><ActionBubble label="Share Story" icon={<InstagramLogo size={18} color={Colors.white} weight="bold" />} onPress={() => { toggleMenu(); onStory(); }} loading={saving === "story"} /></Animated.View>
                <Animated.View style={style0}><ActionBubble label="Save" icon={<DownloadSimple size={18} color={Colors.white} weight="bold" />} onPress={() => { toggleMenu(); onDownload(); }} loading={saving === "download"} /></Animated.View>
              </View>
            )}
            <TouchableOpacity style={s.whiteFab} onPress={toggleMenu} activeOpacity={0.9}>
              <Animated.View style={menuIconStyle}><Gear size={24} color={Colors.textPrimary} weight="fill" /></Animated.View>
            </TouchableOpacity>
          </View>

          {/* CENTER: Close */}
          <TouchableOpacity style={s.whiteFab} onPress={onClose} activeOpacity={0.8}>
            <X size={24} color={Colors.textPrimary} weight="bold" />
          </TouchableOpacity>

          {/* RIGHT: Next (Only show when flashcards are ready) */}
          <View style={[s.sideCol, { alignItems: 'flex-end' }]}>
            {canReveal && (
              <TouchableOpacity style={[s.whiteFab, s.nextFab]} onPress={onStartFlip} activeOpacity={0.8}>
                <Text style={s.nextFabText}>Next</Text>
                <ArrowRight size={18} color={Colors.textPrimary} weight="bold" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 9999, paddingHorizontal: 30, alignItems: "center" },
  fabContainer: { width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  sideCol: { flex: 1, alignItems: 'flex-start' },
  bubbleStack: { gap: Space.sm, marginBottom: Space.md },
  bubbleContainer: { position: "relative", paddingBottom: 2 },
  bubbleShadow: { position: "absolute", bottom: 0, left: "8%", right: "8%", height: "40%", backgroundColor: "rgba(0,0,0,0.5)", borderRadius: Radius.pill },
  bubbleGradient: { borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.textDisplay, overflow: "hidden" },
  bubbleHighlight: { position: "absolute", top: 0, left: 0, right: 0, height: 1, backgroundColor: "rgba(255,255,255,0.12)" },
  bubbleContent: { flexDirection: "row", alignItems: "center", paddingHorizontal: Space.lg, paddingVertical: Space.md, gap: Space.sm },
  bubbleLabel: { fontSize: Type.sizeBodySm, fontWeight: Type.weight700, color: Colors.white, letterSpacing: 0.2 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: Space.sm, paddingVertical: Space.md, backgroundColor: Colors.white, paddingHorizontal: Space.xl, borderRadius: Radius.pill, ...Shadows.level3 },
  loadingText: { fontSize: Type.sizeCaption, color: Colors.textSecondary, fontWeight: Type.weightSemibold },
  whiteFab: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.white, alignItems: "center", justifyContent: "center", ...Shadows.level5 },
  nextFab: { width: undefined, flexDirection: "row", paddingHorizontal: Space.xl, gap: Space.sm },
  nextFabText: { color: Colors.textPrimary, fontWeight: Type.weightBold, fontSize: Type.sizeTitle },
});