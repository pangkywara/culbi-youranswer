/**
 * TripContext — global trip state backed by Supabase.
 *
 * Architecture:
 *   • All reads:  SELECT with joins from trips + trip_stops + landmarks
 *   • All writes: optimistic UI (local state updated immediately) + Supabase
 *     mutation in the background; on error the local change is rolled back.
 *   • Culbi concierge shadow state (proposals / undo) is 100% local — it never
 *     touches the DB until the user explicitly accepts a proposal.
 *
 * Data model mapping:
 *   Trip.id              → trips.id (uuid)
 *   Trip.status          → trips.status ('draft'|'planned'|'completed')
 *   TripStop.stop_order  → trip_stops.stop_order (smallint)
 *   TripStop.date        → trip_stops.scheduled_date (date ISO)
 *   TripStop.isSuggestion→ trip_stops.is_suggestion (boolean)
 *   TripStop._stop_id    → trip_stops.id (uuid) — used for RPC calls
 *   TripStop.landmark.*  → trip_stops.custom_* OR joined landmarks row
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { supabase } from '@/lib/supabase';
import { uuidv4 } from '@/lib/uuid';
import { buildPhotoUrl } from '@/lib/places';
import type { TripStop } from '@/components/PastTrips/TripStopRow';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TripStatus = 'draft' | 'planned' | 'completed';

export interface Trip {
  id: string;
  trip_name: string;
  date_range: string;
  /** ISO date (YYYY-MM-DD) for the first travel day */
  start_date?: string;
  /** ISO date (YYYY-MM-DD) for the last travel day */
  end_date?: string;
  status: TripStatus;
  stops: TripStop[];
  description?: string;
  collaborators?: string[];
  privacy?: 'private' | 'public';
  /** Hero image URL for the trip card — set to a random stop's thumbnail on create */
  cover_image_url?: string;
}

// ─── Culbi proposal types ─────────────────────────────────────────────────────

export interface ProposalAddition {
  date: string;
  stop_order: number;
  landmark: {
    name: string;
    thumbnail_url?: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    rarity_weight?: number;
  };
}

export interface ProposalReorder {
  stop_id: string;    // existing stop_order as string
  new_date: string;
  new_order: number;
}

export interface ProposalDeletion {
  stop_id: string;
}

export interface ChangeSet {
  additions: ProposalAddition[];
  reorders:  ProposalReorder[];
  deletions: ProposalDeletion[];
}

export interface BotProposal {
  proposal_id: string | null;
  summary: string;
  changes: ChangeSet;
}

export interface ActiveProposal extends BotProposal {
  /** Snapshot of trip.stops *before* changes — used for Discard + Undo. */
  prevStops: TripStop[];
  /** Computed merged stops:  original − deletions + reorders + additions(ghost). */
  previewStops: TripStop[];
}

/** Pure helper: merge original stops with a ChangeSet to produce a preview. */
export function computePreviewStops(
  origStops: TripStop[],
  changes: ChangeSet,
): TripStop[] {
  // 1. Apply deletions
  const deleteIds = new Set(changes.deletions.map((d) => Number(d.stop_id)));
  let working = origStops.filter((s) => !deleteIds.has(s.stop_order));

  // 2. Apply reorders (update date + stop_order in-place)
  working = working.map((s) => {
    const ro = changes.reorders.find((r) => Number(r.stop_id) === s.stop_order);
    return ro ? { ...s, date: ro.new_date, stop_order: ro.new_order } : s;
  });

  // 3. Ghost additions — flagged with isSuggestion:true
  const additions: TripStop[] = changes.additions.map((a) => ({
    stop_order: a.stop_order,
    date: a.date,
    isSuggestion: true,
    landmark: {
      name: a.landmark.name,
      thumbnail_url: a.landmark.thumbnail_url ?? '',
      description: a.landmark.description,
      latitude: a.landmark.latitude ?? 0,
      longitude: a.landmark.longitude ?? 0,
      rarity_weight: a.landmark.rarity_weight ?? 0.5,
      sign_count: 0,
    },
  }));

  // 4. Merge → sort by date then stop_order
  return [...working, ...additions].sort((a, b) => {
    const d = (a.date ?? '').localeCompare(b.date ?? '');
    return d !== 0 ? d : a.stop_order - b.stop_order;
  });
}

interface TripContextValue {
  trips: Trip[];
  loading: boolean;
  activeTripId: string | null;
  setActiveTripId: (id: string | null) => void;
  addTrip: (trip: Omit<Trip, 'id'>) => string;
  /** Async variant — awaits the Supabase INSERT before resolving the trip ID.
   *  Use this when you need to add stops immediately after (avoids RLS race condition). */
  addTripAsync: (trip: Omit<Trip, 'id'>) => Promise<string>;
  deleteTrip: (tripId: string) => void;
  addStop: (tripId: string, stop: Omit<TripStop, 'stop_order'>) => void;
  /** Bulk-insert all stops for a newly-created trip in a SINGLE Supabase call.
   *  Use this from TripPlanBubble to avoid the race-condition (and concurrent
   *  request limit) caused by calling addStop once per stop in a tight loop. */
  addStopsBulk: (tripId: string, stops: Omit<TripStop, 'stop_order'>[]) => Promise<void>;
  /** Replace ALL stops in a trip with new ones (used for bot edits). */
  updateTripStopsAsync: (tripId: string, newStops: Omit<TripStop, 'stop_order'>[]) => Promise<void>;
  removeStop: (tripId: string, stopOrder: number) => void;
  /** UPDATED: Now accepts the full updated array for Draggable Lists */
  reorderStops: (tripId: string, newStops: TripStop[]) => void;
  /** Assign or clear a date on a specific stop (by stop_order). */
  updateStopDate: (tripId: string, stopOrder: number, date: string | undefined) => void;
  /** Update top-level trip metadata (name, dates, description, collaborators, privacy). */
  updateTrip: (tripId: string, patch: Partial<Pick<Trip, 'trip_name' | 'date_range' | 'description' | 'collaborators' | 'privacy'>>) => void;
  // ── Culbi concierge shadow state ────────────────────────────────────────
  /** Active AI proposal keyed by tripId (undefined = no pending proposal). */
  proposals: Record<string, ActiveProposal>;
  /** Apply a bot proposal → populate previewStops but DON'T touch trip.stops yet. */
  applyProposal: (tripId: string, proposal: BotProposal) => void;
  /** Accept: commit previewStops → trip.stops; keep prevStops in undoBuffer. */
  acceptProposal: (tripId: string) => void;
  /** Discard: clear proposal without changing trip.stops. */
  discardProposal: (tripId: string) => void;
  /** Undo after accept: restore trip.stops from undoBuffer. */
  undoAccept: (tripId: string) => void;
  /** Whether an undo snapshot exists for a trip (shows the Undo toast). */
  canUndo: (tripId: string) => boolean;
}

// ─── Row shape returned by the Supabase join query ────────────────────────────

type StopRow = {
  id:                 string;
  stop_order:         number;
  scheduled_date:     string | null;
  is_suggestion:      boolean;
  note:               string | null;
  rarity_weight:      number;
  custom_name:        string | null;
  custom_image_url:   string | null;
  custom_latitude:    number | null;
  custom_longitude:   number | null;
  custom_description: string | null;
  landmark_id:        string | null;
  landmarks: {
    id:        string;
    name:      string;
    image_url: string | null;
    coords:    unknown;
  } | null;
};

function rowToStop(r: StopRow): TripStop {
  const lm = r.landmarks;
  let lat = r.custom_latitude ?? 0;
  let lng = r.custom_longitude ?? 0;
  if (lm?.coords) {
    try {
      const c = lm.coords as { coordinates?: [number, number] };
      if (Array.isArray(c.coordinates)) { lng = c.coordinates[0]; lat = c.coordinates[1]; }
    } catch { /* ignore */ }
  }
  return {
    _stop_id:     r.id,
    stop_order:   r.stop_order,
    date:         r.scheduled_date ?? undefined,
    isSuggestion: r.is_suggestion,
    landmark: {
      name:          lm?.name           ?? r.custom_name        ?? 'Unknown',
      // Resolve photo references to full CDN URLs via buildPhotoUrl
      thumbnail_url: lm?.image_url
        ? buildPhotoUrl(lm.image_url, { maxWidth: 400 })
        : (r.custom_image_url
            ? buildPhotoUrl(r.custom_image_url, { maxWidth: 400 })
            : ''),
      rarity_weight: r.rarity_weight,
      latitude:      lat,
      longitude:     lng,
      sign_count:    0,
      description:   r.custom_description ?? undefined,
    },
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

const TripContext = createContext<TripContextValue | null>(null);

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [trips,        setTrips]        = useState<Trip[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);

  // Culbi shadow state
  const [proposals,  setProposals]  = useState<Record<string, ActiveProposal>>({});
  const [undoBuffer, setUndoBuffer] = useState<Record<string, TripStop[]>>({});

  // Keep a stable ref to trips so callbacks always see fresh state
  const tripsRef = useRef(trips);
  useEffect(() => { tripsRef.current = trips; }, [trips]);

  // ── Initial load + auth-change reload ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadTrips() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || cancelled) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('trips')
        .select(`
          id, trip_name, date_range, start_date, end_date, status, description, privacy, cover_image_url,
          trip_stops (
            id, stop_order, scheduled_date, is_suggestion, note,
            rarity_weight, custom_name, custom_image_url,
            custom_latitude, custom_longitude, custom_description,
            landmark_id,
            landmarks ( id, name, image_url, coords )
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (cancelled) return;
      if (error) {
        console.error('[TripContext] load error:', error.message);
        setLoading(false);
        return;
      }

      const loaded: Trip[] = (data ?? []).map((row) => ({
        id:              row.id,
        trip_name:       row.trip_name,
        date_range:      row.date_range,
        start_date:      (row as any).start_date       ?? undefined,
        end_date:        (row as any).end_date         ?? undefined,
        cover_image_url: (row as any).cover_image_url  ?? undefined,
        status:          (row.status as TripStatus) ?? 'planned',
        description:     row.description ?? undefined,
        privacy:         (row.privacy as 'private' | 'public') ?? 'private',
        stops:           ((row.trip_stops ?? []) as StopRow[])
                           .sort((a, b) => a.stop_order - b.stop_order)
                           .map(rowToStop),
      }));

      setTrips(loaded);
      if (loaded.length > 0) setActiveTripId((cur) => cur ?? loaded[0].id);
      setLoading(false);
    }

    loadTrips();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (!cancelled) loadTrips();
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── addTrip — optimistic insert ─────────────────────────────────────────
  const addTrip = useCallback((trip: Omit<Trip, 'id'>): string => {
    const id = uuidv4();
    setTrips((prev) => [{ ...trip, id, stops: [] }, ...prev]);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      supabase.from('trips').insert({
        id,
        user_id:         session.user.id,
        trip_name:       trip.trip_name,
        date_range:      trip.date_range,
        start_date:      trip.start_date      ?? null,
        end_date:        trip.end_date        ?? null,
        status:          trip.status          ?? 'planned',
        description:     trip.description     ?? null,
        privacy:         trip.privacy         ?? 'private',
        cover_image_url: trip.cover_image_url ?? null,
      }).then(({ error }) => {
        if (error) {
          console.error('[TripContext] addTrip error:', error.message);
          setTrips((prev) => prev.filter((t) => t.id !== id));
        }
      });
    });

    return id;
  }, []);

  // ── addTripAsync — awaits the Supabase INSERT before returning ─────────────
  // Use this when stops need to be inserted immediately after the trip is created,
  // to avoid the RLS race condition where trip_stops.trip_id doesn't exist yet.
  const addTripAsync = useCallback(async (trip: Omit<Trip, 'id'>): Promise<string> => {
    const id = uuidv4();
    setTrips((prev) => [{ ...trip, id, stops: [] }, ...prev]);

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { error } = await supabase.from('trips').insert({
        id,
        user_id:         session.user.id,
        trip_name:       trip.trip_name,
        date_range:      trip.date_range,
        start_date:      trip.start_date      ?? null,
        end_date:        trip.end_date        ?? null,
        status:          trip.status          ?? 'planned',
        description:     trip.description     ?? null,
        privacy:         trip.privacy         ?? 'private',
        cover_image_url: trip.cover_image_url ?? null,
      });
      if (error) {
        console.error('[TripContext] addTripAsync error:', error.message);
        setTrips((prev) => prev.filter((t) => t.id !== id));
        throw error;
      }
    }

    return id;
  }, []);

  // ── deleteTrip ──────────────────────────────────────────────────────────
  const deleteTrip = useCallback((tripId: string) => {
    const snapshot = tripsRef.current.find((t) => t.id === tripId);
    setTrips((prev) => prev.filter((t) => t.id !== tripId));
    setActiveTripId((cur) => (cur === tripId ? null : cur));

    supabase.from('trips').delete().eq('id', tripId).then(({ error }) => {
      if (error) {
        console.error('[TripContext] deleteTrip error:', error.message);
        if (snapshot) setTrips((prev) => [...prev, snapshot]);
      }
    });
  }, []);

  // ── addStop — optimistic insert ─────────────────────────────────────────
  const addStop = useCallback(
    (tripId: string, stop: Omit<TripStop, 'stop_order'>) => {
      const stopId = stop._stop_id ?? uuidv4();
      let nextOrder = 1;

      setTrips((prev) =>
        prev.map((t) => {
          if (t.id !== tripId) return t;
          nextOrder = t.stops.length + 1;
          return { ...t, stops: [...t.stops, { ...stop, _stop_id: stopId, stop_order: nextOrder }] };
        }),
      );

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.user) return;
        supabase.from('trip_stops').insert({
          id:                 stopId,
          trip_id:            tripId,
          stop_order:         nextOrder,
          scheduled_date:     stop.date ?? null,
          is_suggestion:      stop.isSuggestion ?? false,
          rarity_weight:      stop.landmark.rarity_weight,
          custom_name:        stop.landmark.name,
          custom_image_url:   stop.landmark.thumbnail_url,
          custom_latitude:    stop.landmark.latitude,
          custom_longitude:   stop.landmark.longitude,
          custom_description: stop.landmark.description ?? null,
          landmark_id:        stop.landmark_id ?? null,
        }).then(({ error }) => {
          if (error) {
            console.error('[TripContext] addStop error:', error.message);
            setTrips((prev) =>
              prev.map((t) => t.id !== tripId ? t : {
                ...t, stops: t.stops.filter((s) => s._stop_id !== stopId),
              }),
            );
          }
        });
      });
    },
    [],
  );

  // ── addStopsBulk — single bulk insert for all stops at once ────────────
  // Avoids the race condition where many parallel addStop() calls all compute
  // nextOrder = 1 before any of the setTrips updaters have flushed, causing
  // duplicate stop_order values and "Network request failed" errors.
  const addStopsBulk = useCallback(
    async (tripId: string, stops: Omit<TripStop, 'stop_order'>[]) => {
      if (!stops.length) return;

      // Assign deterministic IDs and orders up-front so both optimistic UI
      // and the DB insert use exactly the same values
      const withMeta = stops.map((stop, i) => ({
        ...stop,
        _stop_id:   stop._stop_id ?? uuidv4(),
        stop_order: i + 1,
      }));

      // Optimistic UI — add all stops at once
      setTrips((prev) =>
        prev.map((t) =>
          t.id !== tripId
            ? t
            : { ...t, stops: [...t.stops, ...withMeta] },
        ),
      );

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const rows = withMeta.map((stop) => ({
        id:                 stop._stop_id,
        trip_id:            tripId,
        stop_order:         stop.stop_order,
        scheduled_date:     stop.date ?? null,
        is_suggestion:      stop.isSuggestion ?? false,
        rarity_weight:      stop.landmark.rarity_weight ?? 0.5,
        custom_name:        stop.landmark.name,
        custom_image_url:   stop.landmark.thumbnail_url ?? null,
        custom_latitude:    stop.landmark.latitude ?? 0,
        custom_longitude:   stop.landmark.longitude ?? 0,
        custom_description: stop.landmark.description ?? null,
        landmark_id:        (stop as any).landmark_id ?? null,
      }));

      const { error } = await supabase.from('trip_stops').insert(rows);
      if (error) {
        console.error('[TripContext] addStopsBulk error:', error.message);
        // Rollback optimistic update
        const ids = new Set(withMeta.map((s) => s._stop_id).filter((id): id is string => !!id));
        setTrips((prev) =>
          prev.map((t) =>
            t.id !== tripId
              ? t
              : { ...t, stops: t.stops.filter((s) => !s._stop_id || !ids.has(s._stop_id)) },
          ),
        );
      }
    },
    [],
  );

  // ── updateTripStopsAsync — replace all stops with new ones ────────────
  // Used when applying bot-proposed edits to an existing trip.
  const updateTripStopsAsync = useCallback(
    async (tripId: string, newStops: Omit<TripStop, 'stop_order'>[]) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Delete all existing stops from database
      const { error: deleteError } = await supabase
        .from('trip_stops')
        .delete()
        .eq('trip_id', tripId);
      
      if (deleteError) {
        console.error('[TripContext] updateTripStopsAsync delete error:', deleteError.message);
        return;
      }

      // Optimistically clear stops in UI
      setTrips((prev) =>
        prev.map((t) => (t.id !== tripId ? t : { ...t, stops: [] }))
      );

      // Add new stops using bulk insert
      await addStopsBulk(tripId, newStops);
    },
    [addStopsBulk]
  );

  // ── removeStop ──────────────────────────────────────────────────────────
  const removeStop = useCallback((tripId: string, stopOrder: number) => {
    let removedStop: TripStop | undefined;
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== tripId) return t;
        removedStop = t.stops.find((s) => s.stop_order === stopOrder);
        const filtered = t.stops.filter((s) => s.stop_order !== stopOrder);
        return { ...t, stops: filtered.map((s, i) => ({ ...s, stop_order: i + 1 })) };
      }),
    );

    const stopId = removedStop?._stop_id;
    if (!stopId) return;

    supabase.rpc('remove_trip_stop', { p_trip_id: tripId, p_stop_id: stopId })
      .then(({ error }) => {
        if (!error) return;
        console.error('[TripContext] removeStop error:', error.message);
        supabase
          .from('trip_stops')
          .select('id, stop_order, scheduled_date, is_suggestion, note, rarity_weight, custom_name, custom_image_url, custom_latitude, custom_longitude, custom_description, landmark_id, landmarks(id, name, image_url, coords)')
          .eq('trip_id', tripId)
          .order('stop_order')
          .then(({ data }) => {
            if (data) setTrips((prev) =>
              prev.map((t) => t.id !== tripId ? t : { ...t, stops: (data as StopRow[]).map(rowToStop) }),
            );
          });
      });
  }, []);

  // ── reorderStops ────────────────────────────────────────────────────────
  const reorderStops = useCallback((tripId: string, newStops: TripStop[]) => {
    const renumbered = newStops.map((s, i) => ({ ...s, stop_order: i + 1 }));
    setTrips((prev) => prev.map((t) => t.id !== tripId ? t : { ...t, stops: renumbered }));

    const ids = renumbered.map((s) => s._stop_id).filter(Boolean) as string[];
    if (!ids.length) return;

    supabase.rpc('reorder_trip_stops', { p_trip_id: tripId, p_stop_ids: ids })
      .then(({ error }) => {
        if (error) console.error('[TripContext] reorderStops error:', error.message);
      });
  }, []);

  // ── updateStopDate ──────────────────────────────────────────────────────
  const updateStopDate = useCallback(
    (tripId: string, stopOrder: number, date: string | undefined) => {
      let stopId: string | undefined;
      setTrips((prev) =>
        prev.map((t) => {
          if (t.id !== tripId) return t;
          return {
            ...t,
            stops: t.stops.map((s) => {
              if (s.stop_order === stopOrder) { stopId = s._stop_id; return { ...s, date }; }
              return s;
            }),
          };
        }),
      );
      if (!stopId) return;
      supabase.from('trip_stops').update({ scheduled_date: date ?? null }).eq('id', stopId)
        .then(({ error }) => {
          if (error) console.error('[TripContext] updateStopDate error:', error.message);
        });
    },
    [],
  );

  // ── updateTrip ──────────────────────────────────────────────────────────
  const updateTrip = useCallback(
    (tripId: string, patch: Partial<Pick<Trip, 'trip_name' | 'date_range' | 'description' | 'collaborators' | 'privacy'>>) => {
      setTrips((prev) => prev.map((t) => (t.id === tripId ? { ...t, ...patch } : t)));

      supabase.from('trips').update({
        ...(patch.trip_name   !== undefined && { trip_name:   patch.trip_name }),
        ...(patch.date_range  !== undefined && { date_range:  patch.date_range }),
        ...(patch.description !== undefined && { description: patch.description ?? null }),
        ...(patch.privacy     !== undefined && { privacy:     patch.privacy }),
      }).eq('id', tripId).then(({ error }) => {
        if (error) console.error('[TripContext] updateTrip error:', error.message);
      });

      if (patch.collaborators?.length) {
        const rows = patch.collaborators.map((email) => ({
          trip_id:       tripId,
          invited_email: email,
          role:          'viewer' as const,
          status:        'pending' as const,
        }));
        supabase.from('trip_collaborators')
          .upsert(rows, { onConflict: 'trip_id,invited_email', ignoreDuplicates: true })
          .then(({ error: e }) => {
            if (e) console.error('[TripContext] collaborators upsert error:', e.message);
          });
      }
    },
    [],
  );

  // ── Culbi concierge ───────────────────────────────────────────────────────

  const applyProposal = useCallback((tripId: string, proposal: BotProposal) => {
    setTrips((prev) => {
      const trip = prev.find((t) => t.id === tripId);
      if (!trip) return prev;
      const previewStops = computePreviewStops(trip.stops, proposal.changes);
      setProposals((p) => ({
        ...p,
        [tripId]: { ...proposal, prevStops: trip.stops, previewStops },
      }));
      return prev;
    });
  }, []);

  const acceptProposal = useCallback((tripId: string) => {
    setProposals((prev) => {
      const active = prev[tripId];
      if (!active) return prev;

      setUndoBuffer((u) => ({ ...u, [tripId]: active.prevStops }));
      const committed = active.previewStops.map((s) => ({ ...s, isSuggestion: undefined }));
      setTrips((ts) => ts.map((t) => (t.id !== tripId ? t : { ...t, stops: committed })));

      // Persist newly accepted ghost stops
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.user) return;
        const rows = active.previewStops
          .filter((s) => s.isSuggestion && s._stop_id)
          .map((s) => ({
            id:                 s._stop_id!,
            trip_id:            tripId,
            stop_order:         s.stop_order,
            scheduled_date:     s.date ?? null,
            is_suggestion:      false,
            rarity_weight:      s.landmark.rarity_weight,
            custom_name:        s.landmark.name,
            custom_image_url:   s.landmark.thumbnail_url,
            custom_latitude:    s.landmark.latitude,
            custom_longitude:   s.landmark.longitude,
            custom_description: s.landmark.description ?? null,
          }));
        if (rows.length) {
          supabase.from('trip_stops').upsert(rows)
            .then(({ error }) => {
              if (error) console.error('[TripContext] acceptProposal upsert:', error.message);
            });
        }
      });

      const next = { ...prev };
      delete next[tripId];
      return next;
    });
  }, []);

  const discardProposal = useCallback((tripId: string) => {
    setProposals((prev) => { const n = { ...prev }; delete n[tripId]; return n; });
  }, []);

  const undoAccept = useCallback((tripId: string) => {
    setUndoBuffer((prev) => {
      const snap = prev[tripId];
      if (!snap) return prev;
      setTrips((ts) => ts.map((t) => (t.id !== tripId ? t : { ...t, stops: snap })));
      const ids = snap.map((s) => s._stop_id).filter(Boolean) as string[];
      if (ids.length) {
        supabase.rpc('reorder_trip_stops', { p_trip_id: tripId, p_stop_ids: ids })
          .then(({ error }) => {
            if (error) console.error('[TripContext] undoAccept reorder:', error.message);
          });
      }
      const n = { ...prev }; delete n[tripId]; return n;
    });
  }, []);

  const canUndo = useCallback((tripId: string) => Boolean(undoBuffer[tripId]), [undoBuffer]);

  const value = useMemo<TripContextValue>(
    () => ({
      trips, loading, activeTripId, setActiveTripId,
      addTrip, addTripAsync, deleteTrip, addStop, addStopsBulk, updateTripStopsAsync, removeStop, reorderStops, updateStopDate, updateTrip,
      proposals, applyProposal, acceptProposal, discardProposal, undoAccept, canUndo,
    }),
    [
      trips, loading, activeTripId,
      addTrip, addTripAsync, deleteTrip, addStop, addStopsBulk, updateTripStopsAsync, removeStop, reorderStops, updateStopDate, updateTrip,
      proposals, applyProposal, acceptProposal, discardProposal, undoAccept, canUndo,
    ],
  );

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTrips(): TripContextValue {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTrips must be used within a TripProvider');
  return ctx;
}
