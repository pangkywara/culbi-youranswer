import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Alert, StyleSheet } from "react-native";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import * as Haptics from "expo-haptics";
import { captureRef } from "react-native-view-shot";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  runOnJS,
  FadeIn,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrintingOverlayProps, Phase } from "./Components/types";
import { BottomSheet } from "./Components/BottomSheet";
import { CardFlipContainer } from "./CardFlipContainer";
import { FlashcardStack } from "./FlashcardStack";
import { ShareCard } from "./ShareCard";
import {
  saveDetection,
  saveFlashcards,
  markDetectionCompleted,
  markDetectionShared,
  markDetectionDownloaded,
  type FlashcardData,
} from "@/lib/landmarkDetectionService";
import { useGachaTickets } from "@/hooks/useGacha";
import { useAuth } from "@/context/AuthContext";
import { useToastStore } from "@/lib/toastStore";

const ASPECT_RATIO_SCALE = 1;

export function PrintingOverlay({
  visible, loading, error, imageUri, result, userProfile, flashcards,
  onClose, onRetake,
}: PrintingOverlayProps) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { awardTicket } = useGachaTickets();
  const showGachaTicketToast = useToastStore((s) => s.showGachaTicketToast);
  const cardRef = useRef<View>(null);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState<"story" | "download" | null>(null);
  const [phase, setPhase] = useState<Phase>("card");
  const [detectionId, setDetectionId] = useState<string | null>(null);
  const [detectionSaved, setDetectionSaved] = useState(false);
  const [flashcardsSaved, setFlashcardsSaved] = useState(false);
  const [gachaProcessed, setGachaProcessed] = useState(false);

  // ── Animation shared values ──
  const backdrop = useSharedValue(0);
  const cardY = useSharedValue(40); 
  const cardRotate = useSharedValue(-2);
  const cardOp = useSharedValue(0);
  const cardScale = useSharedValue(0.85); // Cinematic zoom-in
  const sheetY = useSharedValue(32);
  const sheetOp = useSharedValue(0);

  // ── Animation Styles ──
  const backdropStyle = useAnimatedStyle(() => ({ 
    opacity: backdrop.value,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOp.value,
    transform: [
      { perspective: 1200 },
      { translateY: cardY.value },
      { scale: cardScale.value },
      { rotateZ: `${cardRotate.value}deg` },
    ],
  }));

  useEffect(() => {
    if (visible) {
      setMounted(true);
      backdrop.value = withTiming(1, { duration: 600 });
      cardY.value = withDelay(100, withTiming(0, {
        duration: 800,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      }));
      cardOp.value = withTiming(1, { duration: 450 });
      cardScale.value = withDelay(100, withTiming(ASPECT_RATIO_SCALE, { 
        duration: 800,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      }));
      cardRotate.value = withDelay(150, withTiming(0, { duration: 1000 }));
      sheetOp.value = withDelay(650, withTiming(1, { duration: 400 }));
      sheetY.value = withDelay(650, withSpring(0, { damping: 20 }));
    } else {
      cardOp.value = withTiming(0, { duration: 250 });
      cardScale.value = withTiming(0.85, { duration: 250 });
      backdrop.value = withDelay(100, withTiming(0, { duration: 300 }));
      setTimeout(() => { 
        setMounted(false); 
        setPhase("card"); 
        setDetectionSaved(false); 
        setDetectionId(null); 
        setFlashcardsSaved(false);
        setGachaProcessed(false);
      }, 400);
    }
  }, [visible]);

  // Save detection to database when result is available (without flashcards)
  useEffect(() => {
    if (!result || !imageUri || detectionSaved) return;

    const saveDetectionAsync = async () => {
      try {
        // Save detection record only (flashcards saved separately after enrichment)
        const id = await saveDetection({
          imageUrl: imageUri,
          landmarkName: result.landmarkName || "Unknown Landmark",
          city: result.city || undefined,
          country: result.country || undefined,
          latitude: result.latitude || undefined,
          longitude: result.longitude || undefined,
          shortDescription: result.shortDescription || undefined,
          landmarkId: result.dbLandmarkId || undefined,
        });

        setDetectionId(id);
        setDetectionSaved(true);
        console.log('[PrintingOverlay] Detection saved:', id);
      } catch (error) {
        console.error('[PrintingOverlay] Failed to save detection:', error);
        // Don't show error to user - this is background operation
      }
    };

    saveDetectionAsync();
  }, [result, imageUri, detectionSaved]);

  // Save flashcards separately after AI enrichment completes
  // Only save when we have finalized flashcards (with pronunciation card)
  useEffect(() => {
    console.log('[SAVE_FLASHCARDS] Effect triggered. detectionId:', detectionId, 'flashcardsSaved:', flashcardsSaved, 'flashcards.length:', flashcards.length);
    if (!detectionId || flashcardsSaved || flashcards.length === 0) return;

    // Check if flashcards are finalized (from AI enrichment, not initial DB facts)
    // AI-enriched cards have "pronunciation" type as first card
    const hasEnrichedContent = flashcards.some(card => card.type === 'pronunciation');
    console.log('[SAVE_FLASHCARDS] Has enriched content (pronunciation):', hasEnrichedContent);
    
    if (!hasEnrichedContent) {
      // These are initial DB facts (temporary), don't save yet
      console.log('[SAVE_FLASHCARDS] Skipping save - waiting for AI enrichment');
      return;
    }

    const saveFlashcardsAsync = async () => {
      try {
        console.log('[SAVE_FLASHCARDS] Starting save operation for', flashcards.length, 'flashcards');
        const flashcardData: FlashcardData[] = flashcards.map((card) => ({
          type: (card.type === 'secret' ? 'history' : card.type) as FlashcardData['type'],
          title: card.title,
          subtitle: card.subtitle,
          content: card.content,
          phonetic: card.phonetic,
          learnMoreUrl: card.learnMoreUrl,
        }));

        console.log('[SAVE_FLASHCARDS] Mapped flashcard data:', JSON.stringify(flashcardData, null, 2));
        await saveFlashcards(detectionId, flashcardData);
        setFlashcardsSaved(true);
        console.log('[SAVE_FLASHCARDS] Successfully saved flashcards to database');
      } catch (error) {
        console.error('[SAVE_FLASHCARDS] Failed to save flashcards:', error);
        // Don't show error to user - this is background operation
      }
    };

    saveFlashcardsAsync();
  }, [detectionId, flashcards, flashcardsSaved]);

  // Allow reveal only when we have result AND at least one flashcard
  const canReveal = !loading && !error && !!result && flashcards.length > 0;

  const startFlip = useCallback(() => {
    if (canReveal && phase === "card") setPhase("flipping");
  }, [canReveal, phase]);

  const handleStory = async () => {
    try {
      setSaving("story");
      const uri = await captureRef(cardRef, { format: "png", quality: 1 });
      await Sharing.shareAsync(uri);
      
      // Mark detection as shared
      if (detectionId) {
        await markDetectionShared(detectionId);
        console.log('[PrintingOverlay] Detection marked as shared');
      }
    } catch (error) {
      Alert.alert("Share failed");
      console.error('[PrintingOverlay] Share failed:', error);
    } finally {
      setSaving(null);
    }
  };

  const handleDownload = async () => {
    try {
      setSaving("download");
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required");
        return;
      }
      
      const uri = await captureRef(cardRef, { format: "png", quality: 1 });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("Saved!");
      
      // Mark detection as downloaded
      if (detectionId) {
        await markDetectionDownloaded(detectionId);
        console.log('[PrintingOverlay] Detection marked as downloaded');
      }
    } catch (error) {
      Alert.alert("Download failed");
      console.error('[PrintingOverlay] Download failed:', error);
    } finally {
      setSaving(null);
    }
  };

  if (!mounted) return null;

  return (
    <View style={[StyleSheet.absoluteFillObject, { zIndex: 10000 }]} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFillObject, backdropStyle]} />

      <View style={s.cardArea} pointerEvents="box-none">
        {phase === "card" && (
          <GestureDetector
            gesture={Gesture.Exclusive(
              Gesture.Pan().onEnd((e) => { if (e.translationY < -60) runOnJS(startFlip)(); }),
              Gesture.Tap().onEnd(() => runOnJS(startFlip)()),
            )}
          >
            <Animated.View style={cardStyle}>
              <ShareCard
                ref={cardRef}
                imageUri={imageUri ?? ""}
                loading={loading}
                result={result}
                userProfile={userProfile}
              />
            </Animated.View>
          </GestureDetector>
        )}

        {phase === "flipping" && flashcards.length > 0 && (
          <CardFlipContainer
            imageUri={imageUri ?? ""}
            loading={loading}
            result={result}
            userProfile={userProfile}
            firstCard={flashcards[0]}
            onFlipComplete={() => setPhase("flashcards")}
          />
        )}

        {phase === "flashcards" && (
          <Animated.View entering={FadeIn}>
            <FlashcardStack 
              flashcards={flashcards} 
              onComplete={async () => {
                // Mark detection as completed
                if (detectionId) {
                  try {
                    await markDetectionCompleted(detectionId);
                    console.log('[PrintingOverlay] Detection marked as completed');
                  } catch (error) {
                    console.error('[PrintingOverlay] Failed to mark completed:', error);
                  }
                }
                
                // Process gacha ticket award (50/50 chance) - only once per detection
                if (!gachaProcessed && session?.user?.id) {
                  setGachaProcessed(true);
                  try {
                    console.log('[Gacha] ===== AWARDING TICKET (50/50 CHANCE) =====');
                    console.log('[Gacha] User ID:', session.user.id);
                    
                    const ticketResult = await awardTicket();
                    
                    console.log('[Gacha] Result:', JSON.stringify(ticketResult, null, 2));
                    
                    if (ticketResult && ticketResult.awarded) {
                      // User won a gacha ticket!
                      console.log('[Gacha] ✅ TICKET AWARDED!');
                      console.log('[Gacha] New ticket count:', ticketResult.tickets);
                      
                      // Haptic feedback
                      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      
                      // Show global toast (will persist after overlay closes)
                      setTimeout(() => {
                        console.log('[Gacha] Showing ticket toast');
                        showGachaTicketToast(ticketResult.tickets);
                      }, 500);
                    } else {
                      console.log('[Gacha] ❌ No ticket awarded this time (50/50 failed)');
                    }
                  } catch (error) {
                    console.error('[Gacha] ⚠️ ERROR awarding ticket:', error);
                  }
                } else {
                  console.log('[Gacha] Skipping ticket award:');
                  console.log('[Gacha] - gachaProcessed:', gachaProcessed);
                  console.log('[Gacha] - user.id:', session?.user?.id);
                }
                
                // Close overlay immediately (toast will persist globally)
                onClose();
              }} 
            />
          </Animated.View>
        )}
      </View>

      {phase === "card" && (
        <BottomSheet
          loading={loading}
          error={error}
          saving={saving}
          canReveal={canReveal}
          bottomInset={insets.bottom}
          opacity={sheetOp}
          translateY={sheetY}
          onClose={onClose}
          onRetake={onRetake}
          onStory={handleStory}
          onDownload={handleDownload}
          onStartFlip={startFlip}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  cardArea: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
    paddingBottom: 110,
  },
});