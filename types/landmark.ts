// ─── Shared types for landmark detection ─────────────────────────────────────

export interface DetectionResult {
  landmarkName?: string;
  country?: string | null;
  city?: string | null;
  shortDescription?: string | null;
  /** DB UUID from landmarks table — present when a match was found */
  dbLandmarkId?: string | null;
  /** Curated facts from landmark_facts table (up to 5) */
  funFacts?: string[];
  /** DB image_url for the matched landmark (optional) */
  dbImageUrl?: string | null;
  /** Landmark latitude from Gemini detection or DB */
  latitude?: number | null;
  /** Landmark longitude from Gemini detection or DB */
  longitude?: number | null;
}

// ─── Flashcard types ─────────────────────────────────────────────────────────

export type FlashcardType = "pronunciation" | "secret" | "fun_fact";

export interface FlashcardItem {
  type: FlashcardType;
  title: string;
  subtitle: string;
  content: string;
  phonetic?: string;
  learnMoreUrl?: string;
}
