import { REGION_FETCH_DEBOUNCE_MS } from "@/constants/config";
import { supabase } from "@/lib/supabase";
import { useCallback, useRef, useState } from "react";
import { Region } from "react-native-maps";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MapGroup {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  visibility: string;
  latitude: number;
  longitude: number;
  memberCount: number;
  memberLimit: number | null;
  avatarUrl: string | null;
  createdBy: string;
}

export interface CreateMapGroupParams {
  name: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  visibility: "public" | "private";
  category?: string | null;
  memberLimit?: number | null;
  memberIds?: string[];
}

const VALID_CATEGORIES = [
  "Culture",
  "Food",
  "Nature",
  "History",
  "Heritage",
  "Religion",
  "Landmark",
  "General",
] as const;

// ─── Validation ──────────────────────────────────────────────────────────────

function validateCreateParams(params: CreateMapGroupParams): string | null {
  const name = params.name.trim();
  if (name.length === 0 || name.length > 50) {
    return "Group name must be 1–50 characters";
  }
  if (params.description && params.description.length > 200) {
    return "Description must be 200 characters or less";
  }
  if (params.visibility !== "public" && params.visibility !== "private") {
    return "Visibility must be public or private";
  }
  if (
    params.category != null &&
    !VALID_CATEGORIES.includes(
      params.category as (typeof VALID_CATEGORIES)[number],
    )
  ) {
    return "Invalid category";
  }
  if (params.memberLimit != null && params.memberLimit < 2) {
    return "Member limit must be at least 2";
  }
  if (params.latitude < -90 || params.latitude > 90) {
    return "Invalid latitude";
  }
  if (params.longitude < -180 || params.longitude > 180) {
    return "Invalid longitude";
  }
  return null;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

interface UseMapGroupsReturn {
  groups: MapGroup[];
  loading: boolean;
  error: string | null;
  fetchGroups: (region: Region) => void;
  createMapGroup: (params: CreateMapGroupParams) => Promise<string | null>;
  creating: boolean;
}

export function useMapGroups(): UseMapGroupsReturn {
  const [groups, setGroups] = useState<MapGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchGroups = useCallback((region: Region) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      const halfLat = region.latitudeDelta / 2;
      const halfLng = region.longitudeDelta / 2;

      try {
        setLoading(true);
        setError(null);

        const { data, error: rpcErr } = await supabase.rpc(
          "get_nearby_groups",
          {
            p_min_lat: region.latitude - halfLat,
            p_max_lat: region.latitude + halfLat,
            p_min_lng: region.longitude - halfLng,
            p_max_lng: region.longitude + halfLng,
          },
        );

        if (rpcErr) throw rpcErr;

        const mapped: MapGroup[] = (data ?? []).map((g: any) => ({
          id: g.id,
          name: g.name,
          description: g.description,
          category: g.category,
          visibility: g.visibility,
          latitude: g.latitude,
          longitude: g.longitude,
          memberCount: Number(g.member_count),
          memberLimit: g.member_limit,
          avatarUrl: g.avatar_url,
          createdBy: g.created_by,
        }));

        setGroups(mapped);
      } catch (e: any) {
        console.warn("[useMapGroups] fetchGroups error:", e?.message);
        setError(e?.message ?? "Failed to load groups");
      } finally {
        setLoading(false);
      }
    }, REGION_FETCH_DEBOUNCE_MS);
  }, []);

  const createMapGroup = useCallback(
    async (params: CreateMapGroupParams): Promise<string | null> => {
      const validationError = validateCreateParams(params);
      if (validationError) {
        setError(validationError);
        return null;
      }

      if (creating) return null;

      setCreating(true);
      setError(null);

      try {
        const { data, error: rpcErr } = await supabase.rpc(
          "create_group_conversation",
          {
            p_name: params.name.trim(),
            p_description: params.description?.trim() || null,
            p_avatar_url: null,
            p_member_ids: params.memberIds ?? [],
            p_latitude: params.latitude,
            p_longitude: params.longitude,
            p_visibility: params.visibility,
            p_category: params.category ?? null,
            p_member_limit: params.memberLimit ?? null,
          },
        );

        if (rpcErr) throw rpcErr;

        return data as string;
      } catch (e: any) {
        // 23505 = unique constraint — a group with these properties already exists.
        const msg = e?.code === '23505'
          ? 'A group with this name already exists in this area. Try a different name.'
          : (e?.message ?? 'Failed to create group');
        setError(msg);
        return null;
      } finally {
        setCreating(false);
      }
    },
    [creating],
  );

  return { groups, loading, error, fetchGroups, createMapGroup, creating };
}