/**
 * app/landmark-detection.tsx
 */

import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeft,
  Brain,
  Camera,
  Image as ImageIcon,
} from "react-native-phosphor";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrintingOverlay } from "@/components/LandmarkDetection/PrintingOverlay";
import { BACKEND_API_KEY, GEMINI_BACKEND_URL } from "@/constants/env";
import { Colors, Radius, S, Space } from "@/constants/style";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { DetectionResult, FlashcardItem } from "@/types/landmark";

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Call the backend landmark detection endpoint.
 *
 * GPS coordinates are ONLY forwarded for camera captures — gallery photos may
 * have been taken anywhere and passing the current device location would bias
 * the model toward the wrong region.
 */
async function detect(
  base64Image: string,
  opts: {
    /** Current GPS — pass only for camera captures, null for gallery picks */
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
      // Soft location hint (camera only) — backend treats this as a weak signal
      ...(coords
        ? {
          extra_context:
            `User device location: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}. ` +
            `This is the camera location, not necessarily the subject. Use only as a soft hint.`,
        }
        : {}),
      // Optional: used by backend to record scan history
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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LandmarkDetectionScreen() {
  const router = useRouter();
  const { session } = useAuth();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [userProfile, setUserProfile] = useState({
    handle: "@traveller",
    avatar: "",
  });
  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([]);

  useEffect(() => {
    if (session?.user.id) {
      supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", session.user.id)
        .single()
        .then(({ data }) => {
          if (data)
            setUserProfile({
              handle: `@${data.username}`,
              avatar: data.avatar_url ?? "",
            });
        });
    }
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status === "granted")
        Location.getCurrentPositionAsync({}).then((p) =>
          setUserCoords(p.coords),
        );
    });
  }, [session]);

  const runDetect = async (
    uri: string,
    base64?: string,
    /** "camera" passes the current GPS; "library" never sends GPS */
    source: "camera" | "library" = "library",
  ) => {
    if (!base64) return;
    setImageUri(uri);
    setResult(null);
    setError(null);
    setLoading(true);
    setShowOverlay(true);
    setFlashcards([]);
    try {
      const detected = await detect(base64, {
        coords: source === "camera" ? userCoords : null,
        userId: session?.user.id ?? null,
      });
      setResult(detected);

      // Pre-populate fun_fact flashcards from DB facts immediately (no latency)
      // so users see real verified content while AI enrichment loads.
      const dbFacts: FlashcardItem[] = (detected.funFacts ?? []).map(
        (fact, i) => ({
          type: "fun_fact" as const,
          title: "Fun Fact",
          subtitle: i === 0 ? "From Our Records" : "Cultural Insight",
          content: fact,
        }),
      );
      if (dbFacts.length > 0) setFlashcards(dbFacts);

      // Fire AI enrichment in background — now uses DB facts with randomization
      console.log('[ENRICHMENT] Starting enrichment for:', detected.landmarkName, 'dbId:', detected.dbLandmarkId);
      enrichLandmark(
        detected.landmarkName ?? "Unknown",
        detected.country ?? "",
        detected.city ?? "",
        detected.dbLandmarkId ?? undefined,  // Pass DB ID for verified facts
      )
        .then((aiCards) => {
          console.log('[ENRICHMENT] Received AI cards:', aiCards.length, 'cards');
          if (aiCards.length > 0) {
            console.log('[ENRICHMENT] First card:', JSON.stringify(aiCards[0], null, 2));
          }
          // AI cards now contain DB facts transformed into engaging flashcards
          // with randomization, so different users get different facts
          if (aiCards.length > 0) {
            setFlashcards(aiCards.slice(0, 3));
          } else if (dbFacts.length === 0) {
            console.warn('[ENRICHMENT] Empty AI cards and no DB facts, using fallback');
            // Fallback: create generic flashcards if both DB and AI failed
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
          console.error('[LandmarkDetection] Enrichment failed:', error);
          // Ensure we have fallback flashcards even if enrichment fails
          if (dbFacts.length === 0) {
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
      // Pass source type so detect() knows whether to use GPS
      runDetect(res.assets[0].uri, res.assets[0].base64 ?? undefined, type);
  };

  return (
    <SafeAreaView style={S.screen} edges={["top"]}>
      <View style={main.header}>
        <TouchableOpacity style={S.btnIcon} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={S.title}>Landmark Detection</Text>
          <Text style={S.subtitle}>Gemini Multi-modal + Search</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={main.scroll}>
        <View style={main.infoBox}>
          <Brain size={18} color={Colors.brand} weight="fill" />
          <Text style={main.infoText}>
            Point your camera at any heritage site or monument. Gemini will
            analyze the architecture and verify its history via live search.
          </Text>
        </View>
        <View style={main.dropzone}>
          <Camera size={48} color={Colors.border} weight="thin" />
          <Text style={main.dropzoneText}>No photo analyzed yet</Text>
        </View>
        <View style={S.row}>
          <TouchableOpacity
            style={[S.btnPrimary, { flex: 1 }]}
            onPress={() => handleCapture("camera")}
          >
            <Camera size={20} color={Colors.white} weight="bold" />
            <Text style={S.btnPrimaryText}>Camera</Text>
          </TouchableOpacity>
          <View style={{ width: Space.md }} />
          <TouchableOpacity
            style={[main.btnSecondary, { flex: 1 }]}
            onPress={() => handleCapture("library")}
          >
            <ImageIcon size={20} color={Colors.textPrimary} weight="bold" />
            <Text style={main.btnSecondaryText}>Library</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <PrintingOverlay
        visible={showOverlay}
        loading={loading}
        error={error}
        imageUri={imageUri}
        result={result}
        userProfile={userProfile}
        flashcards={flashcards}
        onClose={() => setShowOverlay(false)}
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
    </SafeAreaView>
  );
}

const main = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    padding: Space.xxl,
    backgroundColor: Colors.white,
  },
  scroll: { padding: Space.xxl, gap: Space.xl },
  infoBox: {
    flexDirection: "row",
    gap: Space.md,
    backgroundColor: Colors.surfaceSoft,
    padding: Space.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.badgeAlt,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  dropzone: {
    height: 240,
    borderRadius: Radius.card,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.surfacePale,
  },
  dropzoneText: {
    marginTop: Space.md,
    color: Colors.textTertiary,
    fontWeight: "600",
  },
  btnSecondary: {
    flexDirection: "row",
    height: 54,
    borderRadius: Radius.card,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  btnSecondaryText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
});
