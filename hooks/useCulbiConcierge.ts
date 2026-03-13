/**
 * hooks/useCulbiConcierge.ts
 * ───────────────────────────
 * Sends a natural-language trip request to the Culbi AI Concierge backend
 * (/trip-concierge) and returns the structured BotProposal.
 *
 * Keeps all HTTP lifecycle boilerplate out of the screen component.
 */

import type { TripStop } from '@/components/PastTrips/TripStopRow';
import { BACKEND_API_KEY, GEMINI_BACKEND_URL } from '@/constants/env';
import type { BotProposal, ChangeSet } from '@/context/TripContext';
import { useCallback, useState } from 'react';

interface AskParams {
  message: string;
  tripId: string;
  tripName: string;
  stops: TripStop[];
  /** auth.uid() — enforces identity lock on the backend */
  userId?: string;
}

interface ConciergeState {
  loading: boolean;
  error: string | null;
}

export interface ConciergeResult extends BotProposal {
  action_type: 'PROPOSE_CHANGES' | 'CHAT';
}

export function useCulbiConcierge() {
  const [state, setState] = useState<ConciergeState>({
    loading: false,
    error: null,
  });

  const ask = useCallback(
    async (params: AskParams): Promise<ConciergeResult | null> => {
      setState({ loading: true, error: null });
      try {
        const body = {
          message: params.message,
          trip_id: params.tripId,
          trip_name: params.tripName,
          stops: params.stops.map((s) => ({
            stop_order: s.stop_order,
            date: s.date,
            landmark: {
              name: s.landmark.name,
              thumbnail_url: s.landmark.thumbnail_url,
              latitude: s.landmark.latitude,
              longitude: s.landmark.longitude,
              rarity_weight: s.landmark.rarity_weight,
              sign_count: s.landmark.sign_count,
            },
          })),
          user_id: params.userId ?? 'anonymous',
        };

        const resp = await fetch(`${GEMINI_BACKEND_URL}/trip-concierge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': BACKEND_API_KEY },
          body: JSON.stringify(body),
        });

        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`Backend error (${resp.status}): ${text}`);
        }

        const data = await resp.json();

        const result: ConciergeResult = {
          action_type: data.action_type ?? 'CHAT',
          proposal_id: data.proposal_id ?? null,
          summary: data.summary ?? '',
          changes: (data.changes as ChangeSet) ?? {
            additions: [],
            reorders: [],
            deletions: [],
          },
        };

        setState({ loading: false, error: null });
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setState({ loading: false, error: message });
        return null;
      }
    },
    [],
  );

  return {
    ask,
    loading: state.loading,
    error: state.error,
  };
}
