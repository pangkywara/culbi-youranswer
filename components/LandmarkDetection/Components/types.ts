import { DetectionResult, FlashcardItem } from "@/types/landmark";

export type Phase = "card" | "flipping" | "flashcards";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface UserProfile {
  handle: string;
  avatar: string;
}

export interface PrintingOverlayProps {
  /** Visibility of the entire overlay */
  visible: boolean;
  /** Whether the landmark detection is still in progress */
  loading: boolean;
  /** Error message if detection fails */
  error: string | null;
  /** The URI of the photo taken by the user */
  imageUri: string | null;
  /** The result returned from the landmark detection engine */
  result: DetectionResult | null;
  /** Current user's profile info for the share card */
  userProfile: UserProfile;
  /** The generated educational content */
  flashcards: FlashcardItem[];
  /** Callback to close the overlay */
  onClose: () => void;
  /** Callback to reset the camera and try again */
  onRetake: () => void;
  /** User device coordinates — used for rarity calculation */
  userCoords?: Coordinates | null;
  /** Detected landmark coordinates (from Gemini / DB) */
  landmarkCoords?: Coordinates | null;
}