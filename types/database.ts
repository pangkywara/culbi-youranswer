/**
 * types/database.ts
 * TypeScript types auto-derived from the Supabase schema.
 * Re-generate with: npx supabase gen types typescript --project-id dwtjtliumpdctqexktzg
 */

export type Region =
  | 'Brunei'
  | 'Cambodia'
  | 'Indonesia'
  | 'Laos'
  | 'Malaysia'
  | 'Myanmar'
  | 'Philippines'
  | 'Singapore'
  | 'Thailand'
  | 'Vietnam'
  | 'West Kalimantan'   // legacy — kept for existing records
  | 'Sarawak';          // legacy — kept for existing records
export type RoleName = 'user' | 'admin' | 'moderator';
export type LandmarkCategory = 'Culture' | 'Nature' | 'Food' | 'History' | 'Heritage' | 'Religion' | 'Landmark';
/** Free-form text after migration — covers all Asian countries/regions */
export type LandmarkRegion = string;
export type RuleSeverity = 'Mandatory' | 'Recommended' | 'Pro-Tip';
export type LandmarkPhotoSource = 'google' | 'sovereign_custom';
export type LandmarkReviewSource = 'google' | 'sovereign_custom';

/**
 * GeoJSON Point returned by PostgREST when querying a geography(Point) column.
 * Cast to this when you need lat/lng from a landmark.
 */
export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [longitude: number, latitude: number];
}

export interface Database {
  public: {
    Tables: {
      roles: {
        Row: { id: number; name: RoleName };
        Insert: { name: RoleName };
        Update: { name?: RoleName };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          role_id: number;
          full_name: string | null;
          avatar_url: string | null;
          email: string | null;
          username: string | null;
          date_of_birth: string | null;
          region: Region | null;
          onboarded: boolean;
          onboarding_step: number;
          onboarded_at: string | null;
          created_at: string;
          updated_at: string;
          total_xp: number;
          level: number;
        };
        Insert: {
          id: string;
          role_id?: number;
          full_name?: string | null;
          avatar_url?: string | null;
          email?: string | null;
          username?: string | null;
          date_of_birth?: string | null;
          region?: Region | null;
          onboarded?: boolean;
          onboarding_step?: number;
        };
        Update: {
          role_id?: number;
          full_name?: string | null;
          avatar_url?: string | null;
          email?: string | null;
          username?: string | null;
          date_of_birth?: string | null;
          region?: Region | null;
          onboarded?: boolean;
          onboarding_step?: number;
        };
        Relationships: [];
      };
      chat_sessions: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
        };
        Update: {
          title?: string | null;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          role: 'user' | 'assistant';
          content: string;
          tool_used: string | null;
          sources: { uri: string; title: string }[] | null;
          image_url: string | null;
          /** Serialised TripItinerary JSON; non-null only on assistant trip-plan messages. */
          itinerary_json: unknown | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          role: 'user' | 'assistant';
          content: string;
          tool_used?: string | null;
          sources?: { uri: string; title: string }[] | null;
          image_url?: string | null;
          itinerary_json?: unknown | null;
        };
        Update: never;
        Relationships: [];
      };
      landmarks: {
        Row: {
          id: string;
          place_id: string | null;
          name: string;
          /** PostgREST returns geography as a GeoJSON string – parse with JSON.parse() */
          coords: string | null;
          category: LandmarkCategory;
          image_url: string | null;
          /** Country or region name, e.g. "Bali, Indonesia", "Kyoto, Japan" */
          region: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          place_id?: string | null;
          name: string;
          coords?: string | null;
          category: LandmarkCategory;
          image_url?: string | null;
          region: string;
        };
        Update: {
          place_id?: string | null;
          name?: string;
          coords?: string | null;
          category?: LandmarkCategory;
          image_url?: string | null;
          region?: string;
        };
        Relationships: [];
      };
      landmark_rules: {
        Row: {
          id: string;
          landmark_id: string;
          title: string;
          description: string;
          severity: RuleSeverity;
          created_at: string;
        };
        Insert: {
          id?: string;
          landmark_id: string;
          title: string;
          description: string;
          severity: RuleSeverity;
        };
        Update: {
          title?: string;
          description?: string;
          severity?: RuleSeverity;
        };
        Relationships: [{ foreignKeyName: 'landmark_rules_landmark_id_fkey'; columns: ['landmark_id']; referencedRelation: 'landmarks'; referencedColumns: ['id'] }];
      };
      landmark_facts: {
        Row: {
          id: string;
          landmark_id: string;
          fact_content: string;
          source_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          landmark_id: string;
          fact_content: string;
          source_url?: string | null;
        };
        Update: {
          fact_content?: string;
          source_url?: string | null;
        };
        Relationships: [{ foreignKeyName: 'landmark_facts_landmark_id_fkey'; columns: ['landmark_id']; referencedRelation: 'landmarks'; referencedColumns: ['id'] }];
      };
      landmark_photos: {
        Row: {
          id: string;
          landmark_id: string;
          url_or_ref: string;
          is_primary: boolean;
          source: LandmarkPhotoSource;
          caption: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          landmark_id: string;
          url_or_ref: string;
          is_primary?: boolean;
          source?: LandmarkPhotoSource;
          caption?: string | null;
          sort_order?: number;
        };
        Update: {
          url_or_ref?: string;
          is_primary?: boolean;
          source?: LandmarkPhotoSource;
          caption?: string | null;
          sort_order?: number;
        };
        Relationships: [{ foreignKeyName: 'landmark_photos_landmark_id_fkey'; columns: ['landmark_id']; referencedRelation: 'landmarks'; referencedColumns: ['id'] }];
      };
      landmark_reviews: {
        Row: {
          id: string;
          landmark_id: string;
          author_name: string;
          author_photo_url: string | null;
          /** 1–5 */
          rating: number;
          text: string;
          relative_time: string;
          language: string;
          source: LandmarkReviewSource;
          created_at: string;
        };
        Insert: {
          id?: string;
          landmark_id: string;
          author_name: string;
          author_photo_url?: string | null;
          rating: number;
          text?: string;
          relative_time?: string;
          language?: string;
          source?: LandmarkReviewSource;
        };
        Update: {
          author_name?: string;
          author_photo_url?: string | null;
          rating?: number;
          text?: string;
          relative_time?: string;
          language?: string;
          source?: LandmarkReviewSource;
        };
        Relationships: [{ foreignKeyName: 'landmark_reviews_landmark_id_fkey'; columns: ['landmark_id']; referencedRelation: 'landmarks'; referencedColumns: ['id'] }];
      };
      recently_viewed: {
        Row: {
          id: string;
          user_id: string;
          place_id: string;
          place_name: string;
          /** Raw Google photo_reference – build the URL with buildPhotoUrl() */
          photo_reference: string | null;
          vicinity: string | null;
          rating: number | null;
          place_types: string[] | null;
          /** JSON { latitude: number; longitude: number } */
          coords: { latitude: number; longitude: number } | null;
          viewed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          place_id: string;
          place_name: string;
          photo_reference?: string | null;
          vicinity?: string | null;
          rating?: number | null;
          place_types?: string[] | null;
          coords?: { latitude: number; longitude: number } | null;
          viewed_at?: string;
        };
        Update: {
          place_name?: string;
          photo_reference?: string | null;
          vicinity?: string | null;
          rating?: number | null;
          place_types?: string[] | null;
          coords?: { latitude: number; longitude: number } | null;
          viewed_at?: string;
        };
        Relationships: [];
      };
      guests: {
        Row: {
          id: string;  // = auth.uid() of the anonymous user
          onboarded: boolean;
          region: Region | null;
          created_at: string;
          converted_at: string | null;
        };
        Insert: {
          id: string;
          onboarded?: boolean;
          region?: Region | null;
          converted_at?: string | null;
        };
        Update: {
          onboarded?: boolean;
          region?: Region | null;
          converted_at?: string | null;
        };
        Relationships: [];
      };
      search_history: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          region: string;
          category: string;
          place_id: string | null;
          searched_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          region?: string;
          category?: string;
          place_id?: string | null;
          searched_at?: string;
        };
        Update: {
          name?: string;
          region?: string;
          category?: string;
          place_id?: string | null;
          searched_at?: string;
        };
        Relationships: [];
      };
      likes: {
        Row: {
          id: string;
          user_id: string;
          place_id: string;
          place_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          place_id: string;
          place_name?: string;
        };
        Update: {
          place_name?: string;
        };
        Relationships: [];
      };
      missions: {
        Row: {
          id: string;
          title: string;
          description: string;
          category: 'Daily' | 'Milestones' | 'Social';
          reward_xp: number;
          reward_badge: string | null;
          target_count: number;
          reset_type: 'daily' | 'weekly' | 'permanent';
          icon_name: string;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          category: 'Daily' | 'Milestones' | 'Social';
          reward_xp?: number;
          reward_badge?: string | null;
          target_count?: number;
          reset_type?: 'daily' | 'weekly' | 'permanent';
          icon_name?: string;
          is_active?: boolean;
          sort_order?: number;
        };
        Update: Partial<Omit<Database['public']['Tables']['missions']['Insert'], 'id'>>;
        Relationships: [];
      };
      user_mission_progress: {
        Row: {
          id: string;
          user_id: string;
          mission_id: string;
          current_count: number;
          is_completed: boolean;
          completed_at: string | null;
          reward_claimed: boolean;
          claimed_at: string | null;
          reset_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mission_id: string;
          current_count?: number;
          is_completed?: boolean;
          completed_at?: string | null;
          reward_claimed?: boolean;
          claimed_at?: string | null;
          reset_at?: string | null;
        };
        Update: Partial<Omit<Database['public']['Tables']['user_mission_progress']['Insert'], 'id' | 'user_id' | 'mission_id'>>;
        Relationships: [
          { foreignKeyName: 'user_mission_progress_mission_id_fkey'; columns: ['mission_id']; referencedRelation: 'missions'; referencedColumns: ['id'] },
        ];
      };
      user_xp_ledger: {
        Row: {
          id: string;
          user_id: string;
          xp_delta: number;
          source_type: string;
          source_id: string | null;
          description: string | null;
          icon_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          xp_delta: number;
          source_type?: string;
          source_id?: string | null;
          description?: string | null;
          icon_name?: string;
        };
        Update: never;  // ledger rows are immutable
        Relationships: [];
      };
      direct_conversations: {
        Row: {
          id: string;
          participant_one_id: string;
          participant_two_id: string;
          last_message_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          participant_one_id: string;
          participant_two_id: string;
          last_message_at?: string | null;
        };
        Update: {
          last_message_at?: string | null;
        };
        Relationships: [];
      };
      direct_messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string | null;
          image_url: string | null;
          reply_to_id: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content?: string | null;
          image_url?: string | null;
          reply_to_id?: string | null;
          read_at?: string | null;
        };
        Update: {
          read_at?: string | null;
        };
        Relationships: [
          { foreignKeyName: 'direct_messages_conversation_id_fkey'; columns: ['conversation_id']; referencedRelation: 'direct_conversations'; referencedColumns: ['id'] },
          { foreignKeyName: 'direct_messages_reply_to_id_fkey'; columns: ['reply_to_id']; referencedRelation: 'direct_messages'; referencedColumns: ['id'] },
        ];
      };
      events: {
        Row: {
          phq_id: string;
          title: string;
          description: string | null;
          category: string;
          labels: string[];
          start_dt: string;
          end_dt: string | null;
          timezone: string | null;
          country: string;
          country_name: string;
          state: string | null;
          city: string | null;
          venue_name: string | null;
          venue_address: string | null;
          scope: string | null;
          rank: number | null;
          local_rank: number | null;
          aviation_rank: number | null;
          phq_attendance: number | null;
          predicted_spend: number | null;
          currency: string | null;
          entities: Record<string, unknown>[] | null;
          raw_data: Record<string, unknown> | null;
          image_url: string | null;
          scraped_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          phq_id: string;
          title: string;
          description?: string | null;
          category: string;
          labels?: string[];
          start_dt: string;
          end_dt?: string | null;
          timezone?: string | null;
          country?: string;
          country_name?: string;
          state?: string | null;
          city?: string | null;
          venue_name?: string | null;
          venue_address?: string | null;
          scope?: string | null;
          rank?: number | null;
          local_rank?: number | null;
          aviation_rank?: number | null;
          phq_attendance?: number | null;
          predicted_spend?: number | null;
          currency?: string | null;
          entities?: Record<string, unknown>[] | null;
          raw_data?: Record<string, unknown> | null;
          image_url?: string | null;
        };
        Update: Partial<Database['public']['Tables']['events']['Insert']>;
        Relationships: [];
      };
      group_conversations: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          avatar_url: string | null;
          created_by: string;
          last_message_at: string | null;
          created_at: string;
          updated_at: string;
          latitude: number | null;
          longitude: number | null;
          visibility: "public" | "private";
          category: string | null;
          member_limit: number | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          avatar_url?: string | null;
          created_by: string;
          last_message_at?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          visibility?: "public" | "private";
          category?: string | null;
          member_limit?: number | null;
        };
        Update: {
          name?: string;
          description?: string | null;
          avatar_url?: string | null;
          last_message_at?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          visibility?: "public" | "private";
          category?: string | null;
          member_limit?: number | null;
        };
        Relationships: [];
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          role: 'admin' | 'member';
          joined_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          role?: 'admin' | 'member';
          joined_at?: string;
        };
        Update: {
          role?: 'admin' | 'member';
        };
        Relationships: [
          { foreignKeyName: 'group_members_group_id_fkey'; columns: ['group_id']; referencedRelation: 'group_conversations'; referencedColumns: ['id'] },
        ];
      };
      group_messages: {
        Row: {
          id: string;
          group_id: string;
          sender_id: string;
          content: string | null;
          image_url: string | null;
          reply_to_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          sender_id: string;
          content?: string | null;
          image_url?: string | null;
          reply_to_id?: string | null;
        };
        Update: never;
        Relationships: [
          { foreignKeyName: 'group_messages_group_id_fkey'; columns: ['group_id']; referencedRelation: 'group_conversations'; referencedColumns: ['id'] },
          { foreignKeyName: 'group_messages_reply_to_id_fkey'; columns: ['reply_to_id']; referencedRelation: 'group_messages'; referencedColumns: ['id'] },
        ];
      };
      // ─── Trip planning tables ──────────────────────────────────────────────────
      trips: {
        Row: {
          id:              string;
          user_id:         string;
          trip_name:       string;
          date_range:      string;
          start_date:      string | null;
          end_date:        string | null;
          status:          'draft' | 'planned' | 'completed';
          description:     string | null;
          privacy:         'private' | 'public';
          cover_image_url: string | null;
          created_at:      string;
          updated_at:      string;
        };
        Insert: {
          id?:              string;
          user_id:          string;
          trip_name:        string;
          date_range?:      string;
          start_date?:      string | null;
          end_date?:        string | null;
          status?:          'draft' | 'planned' | 'completed';
          description?:     string | null;
          privacy?:         'private' | 'public';
          cover_image_url?: string | null;
        };
        Update: {
          trip_name?:       string;
          date_range?:      string;
          start_date?:      string | null;
          end_date?:        string | null;
          status?:          'draft' | 'planned' | 'completed';
          description?:     string | null;
          privacy?:         'private' | 'public';
          cover_image_url?: string | null;
        };
        Relationships: [];
      };
      trip_stops: {
        Row: {
          id:                 string;
          trip_id:            string;
          landmark_id:        string | null;
          stop_order:         number;
          scheduled_date:     string | null;
          note:               string | null;
          custom_name:        string | null;
          custom_image_url:   string | null;
          custom_latitude:    number | null;
          custom_longitude:   number | null;
          custom_description: string | null;
          rarity_weight:      number;
          is_suggestion:      boolean;
          created_at:         string;
          updated_at:         string;
        };
        Insert: {
          id?:                string;
          trip_id:            string;
          landmark_id?:       string | null;
          stop_order:         number;
          scheduled_date?:    string | null;
          note?:              string | null;
          custom_name?:       string | null;
          custom_image_url?:  string | null;
          custom_latitude?:   number | null;
          custom_longitude?:  number | null;
          custom_description?:string | null;
          rarity_weight?:     number;
          is_suggestion?:     boolean;
        };
        Update: {
          stop_order?:        number;
          scheduled_date?:    string | null;
          note?:              string | null;
          custom_name?:       string | null;
          custom_image_url?:  string | null;
          rarity_weight?:     number;
          is_suggestion?:     boolean;
        };
        Relationships: [
          { foreignKeyName: 'trip_stops_trip_id_fkey'; columns: ['trip_id']; referencedRelation: 'trips'; referencedColumns: ['id'] },
          { foreignKeyName: 'trip_stops_landmark_id_fkey'; columns: ['landmark_id']; referencedRelation: 'landmarks'; referencedColumns: ['id'] },
        ];
      };
      trip_collaborators: {
        Row: {
          id:            string;
          trip_id:       string;
          user_id:       string | null;
          invited_email: string;
          role:          'owner' | 'editor' | 'viewer';
          status:        'pending' | 'accepted' | 'declined';
          invited_at:    string;
          responded_at:  string | null;
        };
        Insert: {
          id?:           string;
          trip_id:       string;
          user_id?:      string | null;
          invited_email: string;
          role?:         'owner' | 'editor' | 'viewer';
          status?:       'pending' | 'accepted' | 'declined';
        };
        Update: {
          user_id?:      string | null;
          role?:         'owner' | 'editor' | 'viewer';
          status?:       'pending' | 'accepted' | 'declined';
          responded_at?: string | null;
        };
        Relationships: [
          { foreignKeyName: 'trip_collaborators_trip_id_fkey'; columns: ['trip_id']; referencedRelation: 'trips'; referencedColumns: ['id'] },
        ];
      };
      detections: {
        Row: {
          id: string;
          user_id: string;
          image_url: string;
          landmark_id: string | null;
          landmark_name: string;
          city: string | null;
          country: string | null;
          latitude: number | null;
          longitude: number | null;
          /** PostgREST returns geography as a GeoJSON string – parse with JSON.parse() */
          coords: string | null;
          short_description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          image_url: string;
          landmark_id?: string | null;
          landmark_name: string;
          city?: string | null;
          country?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          coords?: string | null;
          short_description?: string | null;
        };
        Update: {
          image_url?: string;
          landmark_id?: string | null;
          landmark_name?: string;
          city?: string | null;
          country?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          coords?: string | null;
          short_description?: string | null;
        };
        Relationships: [
          { foreignKeyName: 'detections_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'detections_landmark_id_fkey'; columns: ['landmark_id']; referencedRelation: 'landmarks'; referencedColumns: ['id'] },
        ];
      };
      flashcards: {
        Row: {
          id: string;
          detection_id: string;
          order_index: number;
          type: 'pronunciation' | 'history' | 'fun_fact' | 'cultural_tip';
          title: string;
          subtitle: string | null;
          content: string;
          phonetic: string | null;
          learn_more_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          detection_id: string;
          order_index: number;
          type: 'pronunciation' | 'history' | 'fun_fact' | 'cultural_tip';
          title: string;
          subtitle?: string | null;
          content: string;
          phonetic?: string | null;
          learn_more_url?: string | null;
        };
        Update: {
          order_index?: number;
          type?: 'pronunciation' | 'history' | 'fun_fact' | 'cultural_tip';
          title?: string;
          subtitle?: string | null;
          content?: string;
          phonetic?: string | null;
          learn_more_url?: string | null;
        };
        Relationships: [
          { foreignKeyName: 'flashcards_detection_id_fkey'; columns: ['detection_id']; referencedRelation: 'detections'; referencedColumns: ['id'] },
        ];
      };
      user_progress: {
        Row: {
          id: string;
          user_id: string;
          detection_id: string;
          is_completed: boolean;
          completed_at: string | null;
          shared_to_story: boolean;
          shared_at: string | null;
          downloaded: boolean;
          downloaded_at: string | null;
          time_spent_seconds: number;
          cards_viewed: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          detection_id: string;
          is_completed?: boolean;
          completed_at?: string | null;
          shared_to_story?: boolean;
          shared_at?: string | null;
          downloaded?: boolean;
          downloaded_at?: string | null;
          time_spent_seconds?: number;
          cards_viewed?: number;
        };
        Update: {
          is_completed?: boolean;
          completed_at?: string | null;
          shared_to_story?: boolean;
          shared_at?: string | null;
          downloaded?: boolean;
          downloaded_at?: string | null;
          time_spent_seconds?: number;
          cards_viewed?: number;
        };
        Relationships: [
          { foreignKeyName: 'user_progress_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'user_progress_detection_id_fkey'; columns: ['detection_id']; referencedRelation: 'detections'; referencedColumns: ['id'] },
        ];
      };
    };
    Views: {};
    Functions: {
      landmarks_near: {
        Args: {
          user_lat: number;
          user_lng: number;
          radius_m?: number;
          max_results?: number;
        };
        Returns: Array<{
          id: string;
          place_id: string | null;
          name: string;
          coords_json: { type: 'Point'; coordinates: [number, number] } | null;
          category: string;
          region: string;
          distance_m: number;
          primary_photo: string | null;
          avg_rating: number | null;
        }>;
      };
      get_user_missions: {
        Args: { p_category?: string };
        Returns: MissionWithProgress[];
      };
      increment_mission_progress: {
        Args: { p_mission_id: string };
        Returns: {
          current_count: number;
          target_count: number;
          is_completed: boolean;
          just_completed: boolean;
          reward_xp: number;
          reward_badge: string | null;
        };
      };
      claim_mission_reward: {
        Args: { p_mission_id: string };
        Returns: { success: boolean; reason?: string };
      };
      get_xp_leaderboard: {
        Args: { p_limit?: number };
        Returns: LeaderboardEntry[];
      };
      get_or_create_direct_conversation: {
        Args: { other_user_id: string };
        Returns: string;
      };
      search_users_by_username: {
        Args: { p_query: string };
        Returns: UserSearchResult[];
      };
      reorder_trip_stops: {
        Args: { p_trip_id: string; p_stop_ids: string[] };
        Returns: void;
      };
      remove_trip_stop: {
        Args: { p_trip_id: string; p_stop_id: string };
        Returns: void;
      };
      create_group_conversation: {
        Args: {
          p_name: string;
          p_description?: string | null;
          p_avatar_url?: string | null;
          p_member_ids?: string[];
          p_latitude?: number | null;
          p_longitude?: number | null;
          p_visibility?: string;
          p_category?: string | null;
          p_member_limit?: number | null;
        };
        Returns: string; // group UUID
      };
      get_nearby_groups: {
        Args: {
          p_min_lat: number;
          p_max_lat: number;
          p_min_lng: number;
          p_max_lng: number;
        };
        Returns: Array<{
          id: string;
          name: string;
          description: string | null;
          category: string | null;
          visibility: string;
          latitude: number;
          longitude: number;
          member_count: number;
          member_limit: number | null;
          avatar_url: string | null;
          created_by: string;
        }>;
      };
      search_my_messages: {
        Args: { p_query: string; p_limit?: number };
        Returns: Array<{
          conversation_id: string;
          conversation_name: string;
          is_group: boolean;
          message_content: string;
          message_at: string;
          avatar_url: string | null;
        }>;
      };
      get_user_detection_history: {
        Args: { p_user_id: string; p_limit?: number; p_offset?: number };
        Returns: Array<{
          detection_id: string;
          landmark_name: string;
          city: string | null;
          country: string | null;
          image_url: string;
          created_at: string;
          is_completed: boolean;
          shared_to_story: boolean;
          flashcard_count: number;
        }>;
      };
      get_user_detection_stats: {
        Args: { p_user_id: string };
        Returns: Array<{
          total_detections: number;
          completed_detections: number;
          shared_detections: number;
          unique_landmarks: number;
          unique_countries: number;
          total_flashcards_viewed: number;
        }>;
      };
    };
    Enums: {};
    CompositeTypes: {};
  };
}

// ─── Group chat table row types (added via migration) ───────────────────────

export interface GroupConversationRow {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupMemberRow {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface GroupMessageRow {
  id: string;
  group_id: string;
  sender_id: string;
  content: string | null;
  image_url: string | null;
  reply_to_id: string | null;
  created_at: string;
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Role = Database['public']['Tables']['roles']['Row'];
export type Guest = Database['public']['Tables']['guests']['Row'];
export type ChatSession = Database['public']['Tables']['chat_sessions']['Row'];
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
export type Landmark = Database['public']['Tables']['landmarks']['Row'];
export type LandmarkRule = Database['public']['Tables']['landmark_rules']['Row'];
export type LandmarkFact = Database['public']['Tables']['landmark_facts']['Row'];
export type LandmarkPhoto = Database['public']['Tables']['landmark_photos']['Row'];
export type LandmarkReview = Database['public']['Tables']['landmark_reviews']['Row'];
export type SearchHistory = Database['public']['Tables']['search_history']['Row'];
export type RecentlyViewed = Database['public']['Tables']['recently_viewed']['Row'];
export type Like = Database['public']['Tables']['likes']['Row'];
export type DirectConversation = Database['public']['Tables']['direct_conversations']['Row'];
export type DirectMessage = Database['public']['Tables']['direct_messages']['Row'];

/** Landmark with rules, facts, photos and DB reviews pre-joined */
export type LandmarkFull = Landmark & {
  landmark_rules: LandmarkRule[];
  landmark_facts: LandmarkFact[];
  landmark_photos: LandmarkPhoto[];
  landmark_reviews: LandmarkReview[];
};

/**
 * Row returned by the `landmarks_near` Postgres RPC.
 * Sorted ascending by distance_m from the caller's location.
 */
export interface LandmarkNear {
  id: string;
  place_id: string | null;
  name: string;
  /** GeoJSON Point — parse with JSON.parse() or use coords_json.coordinates */
  coords_json: { type: 'Point'; coordinates: [number, number] } | null;
  category: LandmarkCategory;
  region: string;
  /** Distance in metres from the caller's coordinates */
  distance_m: number;
  /** Google photo_reference or Supabase Storage URL of the primary photo */
  primary_photo: string | null;
  /** All photo URLs/refs for this landmark, ordered by sort_order */
  all_photos: string[] | null;
  /** Average rating from landmark_reviews (null when no reviews yet) */
  avg_rating: number | null;
}

/** Shape returned by the landmarks_search(query_text) RPC — same columns as
 *  LandmarkNear but distance_m is always 0 (no user location context). */
export type LandmarkSearchResult = LandmarkNear;

// ─────────────────────────────────────────────────────────────────────────────
// Mission convenience types
// ─────────────────────────────────────────────────────────────────────────────

export type DBMission = Database['public']['Tables']['missions']['Row'];
export type DBUserMissionProgress = Database['public']['Tables']['user_mission_progress']['Row'];
export type DBXpLedgerEntry = Database['public']['Tables']['user_xp_ledger']['Row'];

/** Row returned by the `get_user_missions` RPC – mission columns + user progress */
export interface MissionWithProgress extends DBMission {
  current_count: number;
  is_completed: boolean;
  reward_claimed: boolean;
  completed_at: string | null;
}

/** Row returned by the `get_xp_leaderboard` RPC */
export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  region: string | null;
  total_xp: number;
  level: number;
}

// ─── Trip table row types ─────────────────────────────────────────────────────
export type DBTrip             = Database['public']['Tables']['trips']['Row'];
export type DBTripStop         = Database['public']['Tables']['trip_stops']['Row'];
export type DBTripCollaborator = Database['public']['Tables']['trip_collaborators']['Row'];

/** Row returned by `search_users_by_username` RPC */
export interface UserSearchResult {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}
