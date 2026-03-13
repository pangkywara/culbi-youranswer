/**
 * hooks/useGeminiChat.ts
 * ─────────────────────
 * Manages chat between the user and the Gemini AI assistant.
 *
 * Design: LOCAL-FIRST
 *  • Sending a message NEVER waits for Supabase or auth.
 *  • Messages appear immediately (optimistic UI).
 *  • Supabase persist runs in the background when the user is signed in.
 *  • Works for both authenticated users and guests.
 */

import { BACKEND_API_KEY, GEMINI_BACKEND_URL } from '@/constants/env';
import { supabase } from '@/lib/supabase';
import type { ChatMessage } from '@/types/database';
import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UiMessage {
  id: string;
  text?: string;
  imageUri?: string;
  isUser: boolean;
  time: string;
  senderName?: string;
  isTyping?: boolean;
  sources?: { uri: string; title: string }[];
  location?: { latitude: number; longitude: number; address?: string };
  replyTo?: { text?: string; imageUri?: string; isUser: boolean };
  itinerary?: TripItinerary;
}

export interface SessionPreview {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
}

// ─── Trip Itinerary types (parsed from AI trip-plan responses) ────────────────

export interface ItineraryStop {
  name: string;
  description: string;
  foodNote?: string;
  /** UUID matching landmarks.id — present when Gemini tagged this stop with [DB:{uuid}] */
  landmark_id?: string;
  /** Google Places legacy photo_reference — enriched from landmark_context after parse */
  photo_reference?: string;
  /** Latitude from DB landmark coords or Places Text Search */
  latitude?: number;
  /** Longitude from DB landmark coords or Places Text Search */
  longitude?: number;
}

export interface ItineraryDay {
  dayNumber: number;
  title: string;
  /** ISO date "YYYY-MM-DD" parsed from the heading parenthetical, e.g. "(March 10, 2026)" */
  date?: string;
  stops: ItineraryStop[];
}

export interface TripItinerary {
  tripName: string;
  duration: string;
  days: ItineraryDay[];
}

/**
 * Detects and parses a multi-day itinerary from an AI markdown response.
 * Returns null if the text doesn't look like a trip plan.
 *
 * Handles both:
 *   **Day N: Title**          ← title inside bold (preferred format)
 *   **Day N:** Title on line  ← title after closing bold
 */
export function parseItinerary(text: string, userMessage?: string): TripItinerary | null {
  // ── 1. Quick probe — need at least 2 day headings ─────────────────────────
  // Handles both: **Day N: Title**  AND  **Day N (Month DD, YYYY): Title**
  // [^:]* skips over any optional "(date)" fragment between the day number and ":"
  const PROBE_RE = /\*\*Day\s+\d+[^:]*:/gi;
  const probeHits = text.match(PROBE_RE);
  if (!probeHits || probeHits.length < 2) return null;

  // ── Helper: "March 10, 2026" → "2026-03-10" ───────────────────────────────
  const parseHeadingDate = (raw: string): string | undefined => {
    if (!raw?.trim()) return undefined;
    const s = raw.trim();

    // Already ISO — pass through
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // Month-name → number table (never rely on new Date() for non-ISO strings
    // because Hermes/JSC on React Native does not guarantee parsing them).
    const MONTHS: Record<string, number> = {
      january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
      july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
      jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8,
      sep: 9, oct: 10, nov: 11, dec: 12,
    };
    const pad = (n: string | number) => String(n).padStart(2, '0');

    // "Month DD, YYYY" or "Month DD YYYY" — Gemini's primary output format
    const mdy = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})$/);
    if (mdy) {
      const mo = MONTHS[mdy[1].toLowerCase()];
      if (mo !== undefined) return `${mdy[3]}-${pad(mo)}-${pad(mdy[2])}`;
    }

    // "DD Month YYYY"
    const dmy = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (dmy) {
      const mo = MONTHS[dmy[2].toLowerCase()];
      if (mo !== undefined) return `${dmy[3]}-${pad(mo)}-${pad(dmy[1])}`;
    }

    return undefined;
  };

  // ── 2. Collect heading positions ──────────────────────────────────────────
  // Captures an optional (date) group between day number and colon.
  // Pattern A — title inside bold:  **Day N (date): Title**
  //   groups: 1=dayNum, 2=dateStr(opt), 3=title
  // Pattern B — title after closing bold:  **Day N (date):** Title
  //   groups: 4=dayNum, 5=dateStr(opt), 6=title
  const HEAD_RE =
    /\*\*Day\s+(\d+)(?:\s*\(([^)]+)\))?:\s*([^*\n]+?)\*\*|\*\*Day\s+(\d+)(?:\s*\(([^)]+)\))?:\*\*\s*([^\n]+)/gi;

  const positions: { index: number; raw: string; dayNum: number; title: string; date?: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = HEAD_RE.exec(text)) !== null) {
    const dayNum = parseInt(m[1] ?? m[4] ?? '0');
    const rawDate = (m[2] ?? m[5] ?? '').trim();
    const title = (m[3] ?? m[6] ?? '').replace(/\*\*/g, '').trim();
    if (dayNum > 0 && title.length > 0) {
      const parsed = parseHeadingDate(rawDate);
      console.log(`[parseItinerary] Day ${dayNum}: rawDate="${rawDate}" → parsed="${parsed}"`);
      positions.push({ index: m.index, raw: m[0], dayNum, title, date: parsed });
    }
  }

  if (positions.length < 2) return null;

  // ── 3. Derive trip name ───────────────────────────────────────────────────
  let tripName: string | undefined;

  // Strategy 0 (highest priority): user explicitly filled in a trip name via TripPlanFormSheet
  // The form encodes it as: The trip name is "My Name Here".
  if (userMessage) {
    const nm0 = userMessage.match(/The trip name is "([^"]{1,80})"/i);
    if (nm0) tripName = nm0[1].trim();
  }

  // Strategy 1u: destination from user's form message — "Plan a trip to X starting from …"
  // Runs before AI-text strategies because the user message is the ground truth.
  if (!tripName && userMessage) {
    const nm1u = userMessage.match(/plan\s+a\s+trip\s+to\s+([A-Za-zé,\s]{2,50}?)\s+starting/i);
    if (nm1u) {
      const place = nm1u[1].trim().replace(/\s+/g, ' ').replace(/,\s*$/, '');
      tripName = `${place} · ${positions.length} Days`;
    }
  }

  // Strategy A (AI response): "N days in/to/at/around Destination"
  if (!tripName) {
    const nmA = text.match(/\b(\d+)[- ]days?\s+(?:in|to|at|exploring?|discovering?|around)(?:\s+the)?\s+([A-Z][a-zA-Zé\s]{2,25})/i);
    if (nmA) tripName = `${nmA[2].trim().replace(/\s+/g, ' ')} · ${nmA[1]} Days`;
  }

  // Strategy B (AI response): "Destination adventure/trip/journey/itinerary"
  if (!tripName) {
    const STOPWORDS = new Set(['ini', 'itu', 'the', 'a', 'an', 'my', 'your', 'our', 'their', 'its', 'this', 'that', 'here', 'there', 'day', 'days', 'trip', 'plan', 'any', 'all']);
    const nmB = text.match(/([A-Z][a-zA-Zé]{2,20}(?:\s+[A-Z][a-zA-Zé]{2,20})?)\s+(?:adventure|trip|journey|getaway|escape|itinerary)/i);
    if (nmB) {
      const place = nmB[1].trim().split(/\s+/).filter(w => /^[A-Z]/.test(w)).join(' ');
      if (place && !STOPWORDS.has(place.toLowerCase())) tripName = `${place} · ${positions.length} Days`;
    }
  }

  // Strategy C (AI response): "X for N days"
  if (!tripName) {
    const nmC = text.match(/([A-Z][a-zA-Zé\s,()-]{2,30}?)\s+for\s+(\d+)[- ]days?/i);
    if (nmC) tripName = `${nmC[1].trim()} · ${nmC[2]} Days`;
  }

  // Final fallback: generic day-count label (never show "Culbi Trip Plan")
  if (!tripName) tripName = `${positions.length}-Day Cultural Journey`;

  // ── DB tag regex — matches [DB:{uuid}] appended by Gemini ─────────────────
  const DB_TAG_RE = /\s*\[DB:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/i;

  // ── 4. Parse each day section ─────────────────────────────────────────────
  const days: ItineraryDay[] = positions.map((pos, idx) => {
    const start = pos.index + pos.raw.length;
    const end = idx + 1 < positions.length ? positions[idx + 1].index : text.length;
    const section = text.slice(start, end);

    // Anchor bullet match to start of line in multiline mode
    const bullets = [...section.matchAll(/^\*\s+(.+)/gm)].map((bm) =>
      bm[1].replace(/\*\*/g, '').trim(),
    );

    const stops: ItineraryStop[] = [];

    for (const rawBullet of bullets) {
      // Extract and strip [DB:uuid] tag before any other processing
      const dbMatch = rawBullet.match(DB_TAG_RE);
      const landmark_id = dbMatch ? dbMatch[1] : undefined;
      const bullet = rawBullet.replace(DB_TAG_RE, '').trim();

      const isFoodLine =
        /^food\s*(nearby)?:/i.test(bullet) ||
        /^eat\s*(nearby)?:/i.test(bullet) ||
        /^dining:/i.test(bullet);

      if (isFoodLine) {
        const note = bullet.replace(/^[^:]+:\s*/i, '');
        if (stops.length > 0) stops[stops.length - 1].foodNote = note;
        else stops.push({ name: pos.title, description: bullet, foodNote: note });
        continue;
      }

      // Extract a stop name:
      // 1. Leading bold fragment: "**Bako National Park** — description" → "Bako National Park"
      // 2. "Name — description" pattern (bold already stripped above)
      // 3. Fallback: first 5 words
      let name: string;
      const boldFirst = rawBullet.match(/^\*\*([^*\n]{3,60}?)\*\*/);
      if (boldFirst) {
        name = boldFirst[1].replace(DB_TAG_RE, '').trim();
      } else {
        const dashSplit = bullet.match(/^([A-Z][^\n]{2,50}?)\s+[-–—]\s/);
        name = dashSplit
          ? dashSplit[1].trim()
          : bullet.split(/\s+/).slice(0, 5).join(' ').replace(/[,.]$/, '');
      }

      stops.push({ name, description: bullet, landmark_id });
    }

    return {
      dayNumber: pos.dayNum,
      title: pos.title,
      date: pos.date,
      stops: stops.length > 0 ? stops : [{ name: pos.title, description: pos.title }],
    };
  });

  return { tripName, duration: `${days.length} Days`, days };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function dbRowToUi(row: ChatMessage): UiMessage {
  const allSources = (row.sources as any[] | null) ?? [];
  const locItem = allSources.find((s: any) => s.type === 'location');
  const webSources = allSources.filter((s: any) => s.type !== 'location') as { uri: string; title: string }[];

  let itinerary: TripItinerary | undefined;
  if (row.role === 'assistant' && (row as any).itinerary_json) {
    try {
      const raw = (row as any).itinerary_json;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed?.days?.length >= 2) itinerary = parsed as TripItinerary;
    } catch { /* skip */ }
  }

  return {
    id: row.id,
    text: row.content,
    isUser: row.role === 'user',
    time: formatTime(row.created_at),
    senderName: row.role === 'assistant' ? 'Culbi' : undefined,
    sources: webSources.length > 0 ? webSources : undefined,
    location: locItem ? { latitude: locItem.latitude, longitude: locItem.longitude, address: locItem.address } : undefined,
    itinerary,
  };
}

/** Maximum number of past turns sent to the backend for context. */
const MAX_HISTORY_TURNS = 20;

const WELCOME: UiMessage = {
  id: 'welcome',
  text: "Hi! I'm Culbi, your cultural guide for Borneo. Ask me anything about West Kalimantan or Sarawak – food, traditions, travel tips and more. 🌿",
  isUser: false,
  time: formatTime(new Date().toISOString()),
  senderName: 'Culbi',
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGeminiChat(tripId?: string) {
  const [messages, setMessages] = useState<UiMessage[]>([WELCOME]);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionPreview[]>([]);
  const [pendingEdit, setPendingEdit] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const sessionRef = useRef<string | null>(null);
  const tripIdRef = useRef<string | null>(tripId ?? null);
  const userIdRef = useRef<string | null>(null);
  const userProfileRef = useRef<{ full_name: string | null; region: string | null } | null>(null);
  const localHistoryRef = useRef<{ role: string; content: string }[]>([]);
  const editingIdRef = useRef<string | null>(null);
  const editDeleteIdsRef = useRef<string[]>([]);  // Supabase IDs to delete on edit-send

  // ── Background: resolve auth + load data ────────────────────────────
  // Two-pronged approach required for React Native:
  //   1. getSession()       → handles the case where the user navigated to this
  //                           screen AFTER auth has already restored (normal flow).
  //                           The INITIAL_SESSION event would have already fired
  //                           before the subscription below was set up.
  //   2. onAuthStateChange  → handles SIGNED_IN and the INITIAL_SESSION event
  //                           when the screen mounts before auth finishes restoring.
  useEffect(() => {
    let cancelled = false;

    const init = async (userId: string) => {
      if (cancelled) return;
      if (userIdRef.current === userId) return; // already initialised for this user
      userIdRef.current = userId;

      console.log('[useGeminiChat] init() → userId:', userId);

      // Fetch user profile for Culbi personalisation (non-blocking, best-effort)
      supabase
        .from('profiles')
        .select('full_name, region')
        .eq('id', userId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) userProfileRef.current = { full_name: data.full_name, region: data.region };
        });

      // Use maybeSingle() so 0-row result is not treated as an error
      let query = supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', userId);

      if (tripIdRef.current) {
        query = query.eq('trip_id', tripIdRef.current);
      }

      const { data: existing, error: fetchErr } = await query
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchErr) {
        // If SELECT fails due to RLS/JWT timing, abort completely.
        // DO NOT fall through to the else-create branch — that would create
        // a phantom session on every mount, burying the real chat history.
        console.warn('[useGeminiChat] fetch session error — aborting init:', fetchErr.message, fetchErr.code);
        userIdRef.current = null; // allow retry on next auth event
        return;
      }

      let sessionId: string;
      if (existing) {
        console.log('[useGeminiChat] found existing session:', existing.id);
        sessionId = existing.id;
      } else {
        // SELECT returned null with no error → user genuinely has no sessions yet
        console.log('[useGeminiChat] no session found — creating first session');
        const insertData: any = {
          user_id: userId,
          title: tripIdRef.current ? 'Trip Planning Chat' : 'Chat with Culbi'
        };
        if (tripIdRef.current) {
          insertData.trip_id = tripIdRef.current;
        }
        const { data: created, error: createErr } = await supabase
          .from('chat_sessions')
          .insert(insertData)
          .select('id')
          .single();
        if (createErr || !created || cancelled) {
          console.warn('[useGeminiChat] create session failed:', createErr?.message);
          userIdRef.current = null; // allow retry
          return;
        }
        sessionId = created.id;
        console.log('[useGeminiChat] created session:', sessionId);
      }

      sessionRef.current = sessionId;
      setCurrentSessionId(sessionId);

      if (!cancelled) {
        await _loadMessages(sessionId);
        // Show the current session immediately so the drawer is never empty
        setSessions([{
          id: sessionId,
          title: 'Chat with Culbi',
          lastMessage: '…',
          updatedAt: new Date().toISOString(),
        }]);
        await _refreshSessions(userId);
      }
    };

    // Prong 1: session already available right now (most common path when navigating
    // to this screen after the app has already booted and auth has restored)
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) console.warn('[useGeminiChat] getSession error:', error.message);
      console.log('[useGeminiChat] getSession → user:', session?.user?.id ?? 'null');
      if (session?.user) init(session.user.id);
    });

    // Prong 2: fires for INITIAL_SESSION (first app boot) and SIGNED_IN events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[useGeminiChat] onAuthStateChange event:', event, '→ user:', session?.user?.id ?? 'null');
        if (session?.user) init(session.user.id);
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // ── Internal: load messages for a session ─────────────────────────────
  const _loadMessages = async (sessionId: string) => {
    const { data: rawRows } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    const rows = (rawRows ?? []) as ChatMessage[];
    if (rows.length > 0) {
      setMessages(rows.map(dbRowToUi));
      localHistoryRef.current = rows.map(r => ({
        role: r.role === 'assistant' ? 'model' : 'user',
        content: r.content,
      }));
    } else {
      setMessages([WELCOME]);
      localHistoryRef.current = [];
    }
  };

  // ── Internal: refresh session preview list ────────────────────────────
  const _refreshSessions = async (userId: string) => {
    console.log('[useGeminiChat] _refreshSessions → userId:', userId);

    const { data: sessionsData, error: sErr } = await supabase
      .from('chat_sessions')
      .select('id, title, updated_at, created_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (sErr) {
      console.warn('[useGeminiChat] _refreshSessions sessions query error:', sErr.message, sErr.code);
      // Do NOT clear sessions on a DB error — keep stale data rather than wiping the list
      return;
    }

    if (!sessionsData || sessionsData.length === 0) {
      console.log('[useGeminiChat] _refreshSessions → 0 sessions returned');
      setSessions([]);
      return;
    }

    console.log('[useGeminiChat] _refreshSessions → found', sessionsData.length, 'sessions');

    // Fetch the last message for each session individually.
    // This is simple, predictable, and works regardless of PostgREST join config.
    const previews: SessionPreview[] = await Promise.all(
      sessionsData.map(async (s) => {
        const { data: last, error: msgErr } = await supabase
          .from('chat_messages')
          .select('content, created_at')
          .eq('session_id', s.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (msgErr) {
          console.warn('[useGeminiChat] last-message query error for session', s.id, ':', msgErr.message);
        }
        return {
          id: s.id,
          title: s.title ?? 'Chat with Culbi',
          lastMessage: last?.content ? last.content.slice(0, 80) : '…',
          updatedAt: (s as any).updated_at ?? last?.created_at ?? s.created_at,
        };
      })
    );

    console.log('[useGeminiChat] setSessions with', previews.length, 'previews');
    setSessions(previews);
  };

  // ── Switch to a different session ─────────────────────────────────────
  const switchSession = useCallback(async (sessionId: string) => {
    sessionRef.current = sessionId;
    setCurrentSessionId(sessionId);
    setError(null);
    await _loadMessages(sessionId);
  }, []);

  // ── Start a brand-new session ─────────────────────────────────────────
  const newSession = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId) {
      // Guest: just clear local state
      sessionRef.current = null;
      localHistoryRef.current = [];
      setMessages([WELCOME]);
      return;
    }
    const { data: created, error: err } = await supabase
      .from('chat_sessions')
      .insert({ user_id: userId, title: 'Chat with Culbi' })
      .select('id')
      .single();
    if (err || !created) return;
    sessionRef.current = created.id;
    setCurrentSessionId(created.id);
    localHistoryRef.current = [];
    setMessages([WELCOME]);
    await _refreshSessions(userId);
  }, []);

  // ── Edit last user message ─────────────────────────────────────────────
  // Records the editing message + all following messages so they can be
  // stripped and re-requested when the user submits the edit.
  const editLastMessage = useCallback(() => {
    setMessages(prev => {
      let lastUserIdx = -1;
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].isUser) { lastUserIdx = i; break; }
      }
      if (lastUserIdx === -1) return prev;

      const editMsg = prev[lastUserIdx];
      // Collect real (persisted) IDs from the edited message + all bot replies after it
      const toDelete = prev
        .slice(lastUserIdx)
        .map(m => m.id)
        .filter(id => !id.startsWith('tmp-') && !id.startsWith('bot-'));

      editingIdRef.current = editMsg.id;
      editDeleteIdsRef.current = toDelete;
      setPendingEdit(editMsg.text ?? '');
      setIsEditing(true);
      return prev; // keep full list visible while user composes the edit
    });
  }, []);

  const clearPendingEdit = useCallback(() => setPendingEdit(null), []);

  const cancelEdit = useCallback(() => {
    editingIdRef.current = null;
    editDeleteIdsRef.current = [];
    setIsEditing(false);
    setPendingEdit(null);
  }, []);

  // ── Send a message ────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (
    text: string,
    replyTo?: { text?: string; imageUri?: string; isUser: boolean } | null,
    tripData?: { id: string; trip_name: string; stops: any[] } | null,
  ) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    // ── Edit mode: strip old messages, resend to LLM ───────────────────────
    if (editingIdRef.current) {
      const editId = editingIdRef.current;
      const deleteIds = [...editDeleteIdsRef.current];
      editingIdRef.current = null;
      editDeleteIdsRef.current = [];
      setIsEditing(false);

      // Remove the original user message + all bot replies after it from state
      let cutIdx = -1;
      setMessages(prev => {
        cutIdx = prev.findIndex(m => m.id === editId);
        if (cutIdx === -1) return prev;
        // Rebuild history without the trimmed messages
        const kept = prev.slice(0, cutIdx);
        const userMsgsBefore = kept.filter(m => m.isUser).length;
        localHistoryRef.current = localHistoryRef.current.slice(0, userMsgsBefore * 2);
        return kept;
      });

      // Background: delete old messages from Supabase
      if (deleteIds.length > 0) {
        supabase.from('chat_messages').delete().in('id', deleteIds).then();
      }

      // Fall through to the normal send path below
      // (editingIdRef is now null so it won't loop)
    }

    setIsSending(true);
    setError(null);

    const tempUserId = `tmp-user-${Date.now()}`;
    const nowIso = new Date().toISOString();

    setMessages(prev => [
      ...prev,
      { id: tempUserId, text: trimmed, isUser: true, time: formatTime(nowIso), replyTo: replyTo ?? undefined },
    ]);
    setIsTyping(true);

    const historySnapshot = [...localHistoryRef.current];
    localHistoryRef.current = [...historySnapshot, { role: 'user', content: trimmed }];

    try {
      const res = await fetch(`${GEMINI_BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': BACKEND_API_KEY },
        body: JSON.stringify({
          message: trimmed,
          history: historySnapshot.slice(-MAX_HISTORY_TURNS),
          use_search: true,
          user_name: userProfileRef.current?.full_name ?? undefined,
          user_region: userProfileRef.current?.region ?? undefined,
          trip_edit_mode: tripData ? true : false,
          trip_data: tripData ?? undefined,
        }),
      });

      if (!res.ok) throw new Error(`Backend ${res.status}: ${await res.text()}`);

      const reply: {
        text: string;
        sources: { uri: string; title: string }[];
        search_queries: string[];
        tool_used: string | null;
        location: { latitude: number; longitude: number; address?: string } | null;
        landmark_context: { id: string; name: string; category: string; region: string; image_url: string | null; photo_reference: string | null; latitude: number | null; longitude: number | null }[];
      } = await res.json();

      localHistoryRef.current = [
        ...localHistoryRef.current,
        { role: 'model', content: reply.text },
      ];

      const botId = `bot-${Date.now()}`;
      const botNow = new Date().toISOString();
      const itinerary = parseItinerary(reply.text, trimmed) ?? undefined;

      // Enrich itinerary stops with photo_reference from landmark_context.
      // Strategy 1 (primary): match by [DB:uuid] tag embedded by the bot.
      // Strategy 2 (fallback): match by exact landmark name when the bot
      //   skipped the [DB:uuid] tag — this is common with Search grounding.
      if (itinerary && reply.landmark_context?.length > 0) {
        const lcById = new Map(reply.landmark_context.map((lc) => [lc.id, lc]));
        const lcByName = new Map(reply.landmark_context.map((lc) => [lc.name.toLowerCase(), lc]));

        for (const day of itinerary.days) {
          for (const stop of day.stops) {
            // Strategy 1 — UUID tag was present
            if (stop.landmark_id) {
              const lc = lcById.get(stop.landmark_id);
              if (lc) {
                if (!stop.photo_reference) stop.photo_reference = lc.photo_reference ?? lc.image_url ?? undefined;
                if (lc.latitude != null) stop.latitude = lc.latitude;
                if (lc.longitude != null) stop.longitude = lc.longitude;
              }
              continue;
            }
            // Strategy 2 — name-based fallback
            const lc = lcByName.get(stop.name.toLowerCase());
            if (lc) {
              stop.landmark_id = lc.id;
              stop.photo_reference = lc.photo_reference ?? lc.image_url ?? undefined;
              if (lc.latitude != null) stop.latitude = lc.latitude;
              if (lc.longitude != null) stop.longitude = lc.longitude;
            }
          }
        }
      }

      // Filter sources: skip entries without a real URI to prevent RN Image warnings
      const cleanSources = (reply.sources ?? []).filter(
        (s: { uri: string; title: string }) => s.uri?.trim().length > 0
      );

      setMessages(prev => [
        ...prev,
        {
          id: botId,
          text: reply.text,
          isUser: false,
          time: formatTime(botNow),
          senderName: 'Culbi',
          sources: cleanSources.length > 0 ? cleanSources : undefined,
          location: reply.location ?? undefined,
          itinerary,
        },
      ]);

      persistToSupabase(trimmed, reply, tempUserId, botId, botNow, itinerary);

    } catch (err: any) {
      console.error('[useGeminiChat]', err);
      setError('Could not reach the AI. Is the backend running?');
      setMessages(prev => prev.filter(m => m.id !== tempUserId));
      localHistoryRef.current = historySnapshot;
    } finally {
      setIsTyping(false);
      setIsSending(false);
    }
  }, [isSending]);

  // ── Background Supabase persist (sequential inserts) ─────────────────────
  const persistToSupabase = async (
    userText: string,
    reply: {
      text: string;
      sources: { uri: string; title: string }[];
      tool_used: string | null;
      location: { latitude: number; longitude: number; address?: string } | null;
    },
    tempUserId: string,
    botId: string,
    botNow: string,
    itinerary?: TripItinerary,
  ) => {
    const userId = userIdRef.current;
    const sessionId = sessionRef.current;
    if (!userId || !sessionId) return;

    try {
      const { data: savedUser } = await supabase
        .from('chat_messages')
        .insert({ session_id: sessionId, user_id: userId, role: 'user', content: userText })
        .select('id, created_at')
        .single();

      const combinedSources: any[] = [
        ...(reply.sources ?? []).filter((s) => s.uri?.trim()),
        ...(reply.location ? [{ type: 'location', ...reply.location }] : []),
      ];

      const { data: savedBot } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          user_id: userId,
          role: 'assistant',
          content: reply.text,
          tool_used: reply.tool_used ?? null,
          sources: combinedSources.length > 0 ? combinedSources : null,
          itinerary_json: itinerary ?? null,
        })
        .select('id, created_at')
        .single();

      setMessages(prev => prev.map(m => {
        if (m.id === tempUserId && savedUser)
          return { ...m, id: savedUser.id, time: formatTime(savedUser.created_at) };
        if (m.id === botId && savedBot)
          return { ...m, id: savedBot.id, time: formatTime(savedBot.created_at) };
        return m;
      }));

      await _refreshSessions(userId);
    } catch (e) {
      console.warn('[useGeminiChat] Supabase persist failed (non-critical)', e);
    }
  };

  // ── Persist only the user turn (trip plan responses skip bot storage) ──────
  const persistUserOnly = async (userText: string, tempUserId: string) => {
    const userId = userIdRef.current;
    const sessionId = sessionRef.current;
    if (!userId || !sessionId) return;
    try {
      const { data: saved } = await supabase
        .from('chat_messages')
        .insert({ session_id: sessionId, user_id: userId, role: 'user', content: userText })
        .select('id, created_at')
        .single();
      if (saved) {
        setMessages(prev =>
          prev.map(m =>
            m.id === tempUserId
              ? { ...m, id: saved.id, time: formatTime(saved.created_at) }
              : m,
          ),
        );
      }
      await _refreshSessions(userId);
    } catch (e) {
      console.warn('[useGeminiChat] persistUserOnly failed (non-critical)', e);
    }
  };

  return {
    messages,
    isTyping,
    isSending,
    error,
    sendMessage,
    sessions,
    switchSession,
    newSession,
    currentSessionId,
    editLastMessage,
    pendingEdit,
    clearPendingEdit,
    isEditing,
    cancelEdit,
  };
}
