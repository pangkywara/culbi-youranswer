/**
 * components/Trips/LiveCameraView.tsx
 * 
 * Live camera preview for landmark detection in Trips tab
 * Always showing camera feed like a native camera app
 */

import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowsOut,
  Camera as CameraIcon,
} from "react-native-phosphor";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BACKEND_API_KEY, GEMINI_BACKEND_URL } from "@/constants/env";
import { Colors, Radius, Shadows, Space, Type } from "@/constants/style";
import { useAuth } from "@/context/AuthContext";
import { DetectionResult, FlashcardItem } from "@/types/landmark";

// ─── Props ────────────────────────────────────────────────────────────────────

interface LiveCameraViewProps {
  onDetectionComplete?: (data: {
    imageUri: string;
    result: DetectionResult;
    flashcards: FlashcardItem[];
    loading: boolean;
    error: string | null;
  }) => void;
}

// ─── API Functions ────────────────────────────────────────────────────────────

async function detect(
  base64Image: string,
  opts: {
    coords?: { latitude: number; longitude: number } | null;
    userId?: string | null;
  } = {},
): Promise<DetectionResult> {
  const { coords, userId } = opts;
  const response = await fetch(`${GEMINI_BACKEND_URL}/landmark-detect`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": BACKEND_API_KEY },
    body: JSON.stringify({
      base64_image: base64Image,
      mime_type: "image/jpeg",
      ...(coords
        ? {
          extra_context:
            `User device location: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}. ` +
            `This is the camera location, not necessarily the subject. Use only as a soft hint.`,
        }
        : {}),
      ...(userId ? { user_id: userId } : {}),
    }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json?.detail ?? "Detection failed");
  const lm = json.landmark ?? {};
  return {
    landmarkName: lm.landmark_name ?? "Unknown Location",
    country: lm.country ?? null,
    city: lm.city ?? null,
    shortDescription: lm.short_description ?? null,
    dbLandmarkId: json.db_landmark_id ?? null,
    funFacts: Array.isArray(json.fun_facts) ? json.fun_facts : [],
    dbImageUrl: json.db_image_url ?? null,
    latitude: lm.latitude ?? json.db_latitude ?? null,
    longitude: lm.longitude ?? json.db_longitude ?? null,
  };
}

async function enrichLandmark(
  landmarkName: string,
  country?: string,
  city?: string,
  landmarkId?: string,
): Promise<FlashcardItem[]> {
  const response = await fetch(`${GEMINI_BACKEND_URL}/landmark-enrich`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": BACKEND_API_KEY },
    body: JSON.stringify({
      landmark_name: landmarkName,
      country: country ?? null,
      city: city ?? null,
      landmark_id: landmarkId ?? null,
    }),
  });
  const json = await response.json();
  if (!response.ok) return [];

  const cards: FlashcardItem[] = (json.flashcards ?? []).map((c: any) => ({
    type: c.type ?? "fun_fact",
    title: c.title ?? "Unknown",
    subtitle: c.subtitle ?? "Landmark Info",
    content: c.content ?? "No information available.",
    phonetic: c.phonetic ?? undefined,
    learnMoreUrl: c.learn_more_url ?? undefined,
  }));

  return cards;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LiveCameraView({ onDetectionComplete }: LiveCameraViewProps) {
  const { session, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  // Detection state
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Transform auth profile to PrintingOverlay's UserProfile format
  const userProfile = {
    handle: profile?.username || profile?.full_name || "Guest",
    avatar: profile?.avatar_url || "",
  };

  // Request location permission on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({});
      setUserCoords({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    })();
  }, []);

  const runDetect = async (uri: string, base64: string) => {
    setImageUri(uri);
    setShowOverlay(true);
    setLoading(true);
    setError(null);
    setResult(null);
    setFlashcards([]);

    // Notify parent immediately with loading state
    onDetectionComplete?.({
      imageUri: uri,
      result: null as any,
      flashcards: [],
      loading: true,
      error: null,
    });

    try {
      const detected = await detect(base64, {
        coords: userCoords,
        userId: session?.user?.id ?? null,
      });
      setResult(detected);

      // Immediate DB facts (if available)
      const dbFacts: FlashcardItem[] = (detected.funFacts ?? []).map(
        (fact, i) => ({
          type: "fun_fact" as const,
          title: "Fun Fact",
          subtitle: i === 0 ? "From Our Records" : "Cultural Insight",
          content: fact,
        }),
      );
      if (dbFacts.length > 0) setFlashcards(dbFacts);

      // Fire AI enrichment in background
      console.log('[LIVE_CAMERA] Starting enrichment for:', detected.landmarkName, 'dbId:', detected.dbLandmarkId);
      enrichLandmark(
        detected.landmarkName ?? "Unknown",
        detected.country ?? "",
        detected.city ?? "",
        detected.dbLandmarkId ?? undefined,
      )
        .then((aiCards) => {
          console.log('[LIVE_CAMERA] Received AI cards:', aiCards.length, 'cards');
          const finalCards = aiCards.length > 0 ? aiCards.slice(0, 3) : dbFacts.length === 0 ? [
            {
              type: "pronunciation" as const,
              title: "Landmark",
              subtitle: detected.landmarkName || "Unknown",
              content: `You've discovered ${detected.landmarkName || "a landmark"}!`,
            },
            {
              type: "secret" as const,
              title: "Location",
              subtitle: "Where You Are",
              content: `${detected.city || "Unknown city"}, ${detected.country || "Unknown country"}`,
            },
            {
              type: "fun_fact" as const,
              title: "Explore More",
              subtitle: "Cultural Heritage",
              content: "Tap to learn more about this amazing place!",
            },
          ] : dbFacts;

          setFlashcards(finalCards);
          setLoading(false);

          // Notify parent with complete detection data
          onDetectionComplete?.({
            imageUri: uri,
            result: detected,
            flashcards: finalCards,
            loading: false,
            error: null,
          });
        })
        .catch((error) => {
          console.error('[LIVE_CAMERA] Enrichment failed:', error);
          const fallbackCards = dbFacts.length === 0 ? [
            {
              type: "pronunciation" as const,
              title: "Landmark",
              subtitle: detected.landmarkName || "Unknown",
              content: `You've discovered ${detected.landmarkName || "a landmark"}!`,
            },
          ] : dbFacts;

          setFlashcards(fallbackCards);
          setLoading(false);

          onDetectionComplete?.({
            imageUri: uri,
            result: detected,
            flashcards: fallbackCards,
            loading: false,
            error: null,
          });
        });
    } catch (e: any) {
      const errorMsg = e.message;
      setError(errorMsg);
      setLoading(false);

      onDetectionComplete?.({
        imageUri: uri,
        result: null as any,
        flashcards: [],
        loading: false,
        error: errorMsg,
      });
    }
  };

  const handleLaunchCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        base64: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        const photo = result.assets[0];
        if (photo.base64) {
          await runDetect(photo.uri, photo.base64);
        }
      }
    } catch (error) {
      console.error('Camera launch failed:', error);
      Alert.alert('Camera Error', 'Could not open camera. Please try again.');
    }
  };

  const handleRetake = () => {
    setShowOverlay(false);
    setImageUri(null);
    setResult(null);
    setFlashcards([]);
  };

  const handleClose = () => {
    setShowOverlay(false);
    setImageUri(null);
    setResult(null);
    setFlashcards([]);
  };

  // Minimized camera view (for tabs)
  const renderMinimizedView = () => (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
      >
        {/* Launch native camera button */}
        <TouchableOpacity
          style={styles.maximizeButton}
          onPress={handleLaunchCamera}
        >
          <ArrowsOut size={20} color={Colors.white} weight="bold" />
        </TouchableOpacity>
      </CameraView>
    </View>
  );

  // Permission handling
  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.brand} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <CameraIcon size={64} color={Colors.border} weight="thin" />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          Enable camera access to scan landmarks and discover their stories
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Enable Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      {renderMinimizedView()}
    </>
  );
}

const styles = StyleSheet.create({
  // Minimized view (in tabs)
  container: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 24,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  maximizeButton: {
    position: 'absolute',
    top: Space.md,
    right: Space.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.level3,
  },

  // Permission screen
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Space.md,
    padding: Space.xl,
    backgroundColor: '#FAFAFA',
    borderRadius: 24,
  },
  permissionTitle: {
    fontSize: Type.sizeTitle,
    fontWeight: Type.weightBold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: Space.md,
  },
  permissionText: {
    fontSize: Type.sizeBody,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Space.xl,
  },
  permissionButton: {
    backgroundColor: Colors.brand,
    paddingHorizontal: Space.xxl,
    paddingVertical: Space.lg,
    borderRadius: Radius.lg,
    marginTop: Space.md,
  },
  permissionButtonText: {
    fontSize: Type.sizeBody,
    fontWeight: Type.weightBold,
    color: Colors.white,
  },
});
