/**
 * components/Trips/CameraDetection.tsx
 * 
 * Camera interface for landmark detection in Trips tab
 */

import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import {
  Camera,
  Image as ImageIcon,
  MapPin,
} from "react-native-phosphor";

import { PrintingOverlay } from "@/components/LandmarkDetection/PrintingOverlay";
import { BACKEND_API_KEY, GEMINI_BACKEND_URL } from "@/constants/env";
import { Colors, Radius, Space, Type } from "@/constants/style";
import { useAuth } from "@/context/AuthContext";
import { DetectionResult, FlashcardItem } from "@/types/landmark";

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

export function CameraDetection() {
  const { session, profile } = useAuth();
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

  const runDetect = async (
    uri: string,
    base64?: string,
    source: "camera" | "library" = "camera",
  ) => {
    setImageUri(uri);
    setShowOverlay(true);
    setLoading(true);
    setError(null);
    setResult(null);
    setFlashcards([]);

    try {
      if (!base64) throw new Error("No base64 image data");

      const detected = await detect(base64, {
        coords: source === "camera" ? userCoords : null,
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
      console.log('[CAMERA_DETECTION] Starting enrichment for:', detected.landmarkName, 'dbId:', detected.dbLandmarkId);
      enrichLandmark(
        detected.landmarkName ?? "Unknown",
        detected.country ?? "",
        detected.city ?? "",
        detected.dbLandmarkId ?? undefined,
      )
        .then((aiCards) => {
          console.log('[CAMERA_DETECTION] Received AI cards:', aiCards.length, 'cards');
          if (aiCards.length > 0) {
            console.log('[CAMERA_DETECTION] First card:', JSON.stringify(aiCards[0], null, 2));
            setFlashcards(aiCards.slice(0, 3));
          } else if (dbFacts.length === 0) {
            console.warn('[CAMERA_DETECTION] Empty AI cards and no DB facts, using fallback');
            // Fallback flashcards
            setFlashcards([
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
            ]);
          }
        })
        .catch((error) => {
          console.error('[CAMERA_DETECTION] Enrichment failed:', error);
          if (dbFacts.length === 0) {
            setFlashcards([
              {
                type: "pronunciation" as const,
                title: "Landmark",
                subtitle: detected.landmarkName || "Unknown",
                content: `You've discovered ${detected.landmarkName || "a landmark"}!`,
              },
            ]);
          }
        });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCapture = async (type: "camera" | "library") => {
    const res =
      type === "camera"
        ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({
          base64: true,
          quality: 0.8,
        });
    if (!res.canceled && res.assets[0])
      runDetect(res.assets[0].uri, res.assets[0].base64 ?? undefined, type);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Camera size={64} color={Colors.border} weight="thin" />
        <Text style={styles.title}>Scan a Landmark</Text>
        <Text style={styles.subtitle}>
          Point your camera at any heritage site or monument
        </Text>

        {userCoords && (
          <View style={styles.locationBadge}>
            <MapPin size={14} color={Colors.brand} weight="fill" />
            <Text style={styles.locationText}>
              Location enabled for better results
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => handleCapture("camera")}
        >
          <Camera size={20} color={Colors.white} weight="bold" />
          <Text style={styles.primaryButtonText}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => handleCapture("library")}
        >
          <ImageIcon size={20} color={Colors.textPrimary} weight="bold" />
          <Text style={styles.secondaryButtonText}>From Library</Text>
        </TouchableOpacity>
      </View>

      <PrintingOverlay
        visible={showOverlay}
        loading={loading}
        error={error}
        imageUri={imageUri}
        result={result}
        userProfile={userProfile}
        flashcards={flashcards}
        onClose={() => {
          setShowOverlay(false);
          setImageUri(null);
          setResult(null);
          setFlashcards([]);
        }}
        onRetake={() => {
          setShowOverlay(false);
          setImageUri(null);
          setResult(null);
          setFlashcards([]);
        }}
        userCoords={userCoords}
        landmarkCoords={
          result?.latitude != null && result?.longitude != null
            ? { latitude: result.latitude, longitude: result.longitude }
            : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderRadius: 24,
    padding: Space.xl,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Space.md,
  },
  title: {
    fontSize: Type.sizeTitle,
    fontWeight: Type.weightBold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: Space.md,
  },
  subtitle: {
    fontSize: Type.sizeBody,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Space.xl,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    backgroundColor: 'rgba(65, 118, 237, 0.08)', // Light brand color with transparency
    borderRadius: Radius.pill,
    marginTop: Space.sm,
  },
  locationText: {
    fontSize: Type.sizeCaption,
    color: Colors.brand,
    fontWeight: Type.weightSemibold,
  },
  actions: {
    gap: Space.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
    paddingVertical: Space.lg,
    borderRadius: Radius.lg,
  },
  primaryButton: {
    backgroundColor: Colors.textDisplay,
  },
  primaryButtonText: {
    fontSize: Type.sizeBody,
    fontWeight: Type.weightBold,
    color: Colors.white,
  },
  secondaryButton: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  secondaryButtonText: {
    fontSize: Type.sizeBody,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
  },
});
