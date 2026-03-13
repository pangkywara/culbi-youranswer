/**
 * lib/landmarkDetectionService.ts
 * Service for managing landmark detections, flashcards, and user progress.
 * Handles all database operations for the landmark detection feature.
 */

import { supabase } from './supabase';
import type { Database } from '@/types/database';

type Detection = Database['public']['Tables']['detections']['Row'];
type DetectionInsert = Database['public']['Tables']['detections']['Insert'];
type Flashcard = Database['public']['Tables']['flashcards']['Row'];
type FlashcardInsert = Database['public']['Tables']['flashcards']['Insert'];
type UserProgress = Database['public']['Tables']['user_progress']['Row'];
type UserProgressInsert = Database['public']['Tables']['user_progress']['Insert'];

export interface SaveDetectionParams {
  imageUrl: string;
  landmarkName: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  shortDescription?: string;
  landmarkId?: string;
}

export interface FlashcardData {
  type: 'pronunciation' | 'history' | 'fun_fact' | 'cultural_tip';
  title: string;
  subtitle?: string;
  content: string;
  phonetic?: string;
  learnMoreUrl?: string;
}

export interface DetectionHistoryItem {
  detection_id: string;
  landmark_name: string;
  city: string | null;
  country: string | null;
  image_url: string;
  created_at: string;
  is_completed: boolean;
  shared_to_story: boolean;
  flashcard_count: number;
}

export interface DetectionStats {
  total_detections: number;
  completed_detections: number;
  shared_detections: number;
  unique_landmarks: number;
  unique_countries: number;
  total_flashcards_viewed: number;
}

/**
 * Upload image to Supabase Storage and return public URL.
 * 
 * @param imageUri - Local file URI (file:// or content://)
 * @param userId - User ID for organizing files
 * @returns Public URL of uploaded image
 */
export async function uploadDetectionImage(
  imageUri: string,
  userId: string,
): Promise<string> {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const filename = `${timestamp}-${randomStr}.jpg`;
    const filePath = `${userId}/${filename}`;

    console.log('[uploadDetectionImage] Uploading:', filePath);

    // For React Native, we need to use FormData with proper file object
    // Create file object for upload
    const fileExt = imageUri.split('.').pop() || 'jpg';
    const file = {
      uri: imageUri,
      name: filename,
      type: `image/${fileExt}`,
    } as any;

    // Upload to Supabase Storage using ArrayBuffer approach for React Native
    const response = await fetch(imageUri);
    const arrayBuffer = await response.arrayBuffer();

    const { data, error } = await supabase.storage
      .from('landmark-detections')
      .upload(filePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('[uploadDetectionImage] Upload error:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from upload');
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('landmark-detections')
      .getPublicUrl(data.path);

    console.log('[uploadDetectionImage] Upload successful:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('[uploadDetectionImage] Upload failed:', error);
    throw error;
  }
}

/**
 * Save a new landmark detection to the database.
 * Creates a detection record and initializes user progress tracking.
 * 
 * @param params - Detection parameters (image, landmark info, location)
 * @returns Detection ID if successful
 * @throws Error if save fails or user is not authenticated
 */
export async function saveDetection(params: SaveDetectionParams): Promise<string> {
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  // Upload image to Supabase Storage if it's a local URI
  let imageUrl = params.imageUrl;
  if (params.imageUrl.startsWith('file://') || params.imageUrl.startsWith('content://')) {
    try {
      console.log('[saveDetection] Uploading image to Supabase Storage...');
      imageUrl = await uploadDetectionImage(params.imageUrl, user.id);
      console.log('[saveDetection] Image uploaded:', imageUrl);
    } catch (uploadError) {
      console.error('[saveDetection] Image upload failed, using local URI:', uploadError);
      // Continue with local URI as fallback
    }
  }

  // Insert detection
  // NOTE: coords column is GENERATED ALWAYS from latitude/longitude in the database
  // Do NOT manually insert into coords - it will be computed automatically
  const detectionData: DetectionInsert = {
    user_id: user.id,
    image_url: imageUrl,
    landmark_name: params.landmarkName,
    city: params.city,
    country: params.country,
    latitude: params.latitude,
    longitude: params.longitude,
    // coords is omitted - auto-generated by database
    short_description: params.shortDescription,
    landmark_id: params.landmarkId,
  };

  const { data, error } = await supabase
    .from('detections')
    .insert(detectionData)
    .select('id')
    .single();

  if (error) {
    console.error('Error saving detection:', error);
    throw new Error(`Failed to save detection: ${error.message}`);
  }

  if (!data) {
    throw new Error('No data returned from detection insert');
  }

  // Initialize user progress tracking
  const progressData: UserProgressInsert = {
    user_id: user.id,
    detection_id: data.id,
    is_completed: false,
    shared_to_story: false,
    downloaded: false,
    time_spent_seconds: 0,
    cards_viewed: 0,
  };

  const { error: progressError } = await supabase
    .from('user_progress')
    .insert(progressData);

  if (progressError) {
    console.error('Error initializing user progress:', progressError);
    // Don't throw here - detection is saved, progress can be created later
  }

  return data.id;
}

/**
 * Save flashcards associated with a detection.
 * 
 * @param detectionId - ID of the parent detection
 * @param cards - Array of flashcard data (max 3)
 * @throws Error if save fails or too many cards
 */
export async function saveFlashcards(
  detectionId: string,
  cards: FlashcardData[]
): Promise<void> {
  if (cards.length > 3) {
    throw new Error('Maximum 3 flashcards per detection');
  }

  const flashcardRows: FlashcardInsert[] = cards.map((card, index) => ({
    detection_id: detectionId,
    order_index: index,
    type: card.type,
    title: card.title,
    subtitle: card.subtitle,
    content: card.content,
    phonetic: card.phonetic,
    learn_more_url: card.learnMoreUrl,
  }));

  const { error } = await supabase
    .from('flashcards')
    .insert(flashcardRows);

  if (error) {
    console.error('Error saving flashcards:', error);
    throw new Error(`Failed to save flashcards: ${error.message}`);
  }
}

/**
 * Mark a detection as completed by the user.
 * Automatically sets completed_at timestamp via database trigger.
 * 
 * @param detectionId - ID of the detection to mark complete
 */
export async function markDetectionCompleted(detectionId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('user_progress')
    .update({ is_completed: true })
    .eq('user_id', user.id)
    .eq('detection_id', detectionId);

  if (error) {
    console.error('Error marking detection completed:', error);
    throw new Error(`Failed to mark detection completed: ${error.message}`);
  }
}

/**
 * Mark a detection as shared to story.
 * Automatically sets shared_at timestamp via database trigger.
 * 
 * @param detectionId - ID of the detection to mark shared
 */
export async function markDetectionShared(detectionId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('user_progress')
    .update({ shared_to_story: true })
    .eq('user_id', user.id)
    .eq('detection_id', detectionId);

  if (error) {
    console.error('Error marking detection shared:', error);
    throw new Error(`Failed to mark detection shared: ${error.message}`);
  }
}

/**
 * Mark a detection as downloaded.
 * Automatically sets downloaded_at timestamp via database trigger.
 * 
 * @param detectionId - ID of the detection to mark downloaded
 */
export async function markDetectionDownloaded(detectionId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('user_progress')
    .update({ downloaded: true })
    .eq('user_id', user.id)
    .eq('detection_id', detectionId);

  if (error) {
    console.error('Error marking detection downloaded:', error);
    throw new Error(`Failed to mark detection downloaded: ${error.message}`);
  }
}

/**
 * Update flashcard viewing progress.
 * Tracks how many cards the user has viewed and time spent.
 * 
 * @param detectionId - ID of the detection
 * @param cardsViewed - Number of cards viewed
 * @param timeSpentSeconds - Total time spent (seconds)
 */
export async function updateFlashcardProgress(
  detectionId: string,
  cardsViewed: number,
  timeSpentSeconds: number
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('user_progress')
    .update({
      cards_viewed: cardsViewed,
      time_spent_seconds: timeSpentSeconds,
    })
    .eq('user_id', user.id)
    .eq('detection_id', detectionId);

  if (error) {
    console.error('Error updating flashcard progress:', error);
    // Don't throw - this is non-critical analytics
  }
}

/**
 * Get user's detection history with pagination.
 * Uses database function for optimized query.
 * 
 * @param limit - Maximum number of records to return (default: 50)
 * @param offset - Pagination offset (default: 0)
 * @returns Array of detection history items
 */
export async function getUserDetectionHistory(
  limit: number = 50,
  offset: number = 0
): Promise<DetectionHistoryItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .rpc('get_user_detection_history', {
      p_user_id: user.id,
      p_limit: limit,
      p_offset: offset,
    });

  if (error) {
    console.error('Error getting detection history:', error);
    throw new Error(`Failed to get detection history: ${error.message}`);
  }

  return data || [];
}

/**
 * Get user's detection statistics.
 * Uses database function for optimized aggregation.
 * 
 * @returns User detection stats
 */
export async function getUserDetectionStats(): Promise<DetectionStats> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .rpc('get_user_detection_stats', {
      p_user_id: user.id,
    });

  if (error) {
    console.error('Error getting detection stats:', error);
    throw new Error(`Failed to get detection stats: ${error.message}`);
  }

  if (!data || data.length === 0) {
    // Return default stats if no data
    return {
      total_detections: 0,
      completed_detections: 0,
      shared_detections: 0,
      unique_landmarks: 0,
      unique_countries: 0,
      total_flashcards_viewed: 0,
    };
  }

  return data[0];
}

/**
 * Get a specific detection with its flashcards and progress.
 * 
 * @param detectionId - ID of the detection
 * @returns Complete detection data with flashcards and progress
 */
export async function getDetectionWithFlashcards(detectionId: string): Promise<{
  detection: Detection;
  flashcards: Flashcard[];
  progress: UserProgress | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get detection
  const { data: detection, error: detectionError } = await supabase
    .from('detections')
    .select('*')
    .eq('id', detectionId)
    .eq('user_id', user.id)
    .single();

  if (detectionError) {
    console.error('Error getting detection:', detectionError);
    throw new Error(`Failed to get detection: ${detectionError.message}`);
  }

  // Get flashcards
  const { data: flashcards, error: flashcardsError } = await supabase
    .from('flashcards')
    .select('*')
    .eq('detection_id', detectionId)
    .order('order_index', { ascending: true });

  if (flashcardsError) {
    console.error('Error getting flashcards:', flashcardsError);
    throw new Error(`Failed to get flashcards: ${flashcardsError.message}`);
  }

  // Get progress
  const { data: progress } = await supabase
    .from('user_progress')
    .select('*')
    .eq('detection_id', detectionId)
    .eq('user_id', user.id)
    .single();

  return {
    detection,
    flashcards: flashcards || [],
    progress: progress || null,
  };
}
