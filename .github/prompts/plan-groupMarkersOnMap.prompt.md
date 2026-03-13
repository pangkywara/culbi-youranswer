# Plan: Group Markers on Discovery Map

## TL;DR

Add location-based group markers to the DiscoveryMap. Users can create groups by either (A) dragging a pin from a floating button onto the map (Google Street View pegman style) or (B) long-pressing a location. Both methods open a creation form (name, description, public/private, category, member limit). Groups appear as custom markers on the map. Each group reuses the existing `group_conversations` table with new location columns, so every group marker is also a chat room.

---

## Phase 1: Database Schema Migration

**Goal:** Extend `group_conversations` with location + metadata columns.

1. **Add columns to `group_conversations` table** via Supabase migration:
   - `latitude DOUBLE PRECISION` (nullable — legacy groups have no location)
   - `longitude DOUBLE PRECISION` (nullable)
   - `visibility TEXT DEFAULT 'public'` — values: `'public'` | `'private'`
   - `category TEXT` (nullable) — values: `'Culture'` | `'Food'` | `'Nature'` | `'History'` | `'Heritage'` | `'Religion'` | `'Landmark'` | `'General'`
   - `member_limit INTEGER` (nullable — null = unlimited)

   **CHECK constraints** (enforce valid data at DB level):

   ```sql
   ALTER TABLE public.group_conversations
     ADD CONSTRAINT chk_latitude  CHECK (latitude  BETWEEN -90  AND 90),
     ADD CONSTRAINT chk_longitude CHECK (longitude BETWEEN -180 AND 180),
     ADD CONSTRAINT chk_coords_both_or_none
       CHECK ((latitude IS NULL) = (longitude IS NULL)),
     ADD CONSTRAINT chk_visibility
       CHECK (visibility IN ('public', 'private')),
     ADD CONSTRAINT chk_category
       CHECK (category IS NULL OR category IN (
         'Culture','Food','Nature','History','Heritage','Religion','Landmark','General'
       )),
     ADD CONSTRAINT chk_member_limit
       CHECK (member_limit IS NULL OR member_limit >= 2);
   ```

2. **Create spatial index** for efficient geo-queries:

   ```sql
   CREATE INDEX idx_group_conversations_location
     ON public.group_conversations (latitude, longitude)
     WHERE latitude IS NOT NULL;
   ```

3. **Update RLS policy** — allow `SELECT` on public map-pinned groups for any authenticated user:

   The current `group_conv_select` policy restricts reads to **creator or member only**. Public groups pinned on the map must be visible to everyone. Options:
   - **Option A (chosen): `SECURITY DEFINER` RPC** — `get_nearby_groups` runs as the function owner, bypassing RLS. The function itself enforces visibility rules (public groups → all users; private groups → only members). This is cleaner because it avoids widening the RLS policy which could leak private group names in other queries (e.g., PostgREST direct table access).
   - **Option B (rejected):** Add an OR clause to `group_conv_select` for `visibility = 'public' AND latitude IS NOT NULL`. Rejected because it would expose public group rows to any `SELECT` via PostgREST, not just map queries.

4. **Create RPC function `get_nearby_groups`** (`SECURITY DEFINER`):

   ```sql
   CREATE OR REPLACE FUNCTION public.get_nearby_groups(
     p_min_lat DOUBLE PRECISION,
     p_max_lat DOUBLE PRECISION,
     p_min_lng DOUBLE PRECISION,
     p_max_lng DOUBLE PRECISION
   )
   RETURNS TABLE (
     id          UUID,
     name        TEXT,
     description TEXT,
     category    TEXT,
     visibility  TEXT,
     latitude    DOUBLE PRECISION,
     longitude   DOUBLE PRECISION,
     member_count BIGINT,
     member_limit INTEGER,
     avatar_url  TEXT,
     created_by  UUID
   )
   LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public
   AS $$
   BEGIN
     -- Validate bounding box ranges
     IF p_min_lat < -90 OR p_max_lat > 90
        OR p_min_lng < -180 OR p_max_lng > 180
        OR p_min_lat > p_max_lat
        OR p_min_lng > p_max_lng THEN
       RAISE EXCEPTION 'Invalid bounding box coordinates';
     END IF;

     RETURN QUERY
     SELECT
       gc.id,
       gc.name,
       gc.description,
       gc.category,
       gc.visibility,
       gc.latitude,
       gc.longitude,
       COUNT(gm.id)     AS member_count,
       gc.member_limit,
       gc.avatar_url,
       gc.created_by
     FROM public.group_conversations gc
     LEFT JOIN public.group_members gm ON gm.group_id = gc.id
     WHERE gc.latitude  BETWEEN p_min_lat AND p_max_lat
       AND gc.longitude BETWEEN p_min_lng AND p_max_lng
       AND (
         gc.visibility = 'public'
         OR EXISTS (
           SELECT 1 FROM public.group_members m
           WHERE m.group_id = gc.id AND m.user_id = auth.uid()
         )
       )
     GROUP BY gc.id
     ORDER BY gc.created_at DESC
     LIMIT 10;           -- Hard cap: GPU marker budget
   END;
   $$;

   -- Only authenticated users may call this function
   REVOKE ALL ON FUNCTION public.get_nearby_groups FROM PUBLIC, anon;
   GRANT EXECUTE ON FUNCTION public.get_nearby_groups TO authenticated;
   ```

   **Security notes:**
   - `SECURITY DEFINER` + explicit `SET search_path = public` prevents search-path hijacking.
   - `REVOKE ... FROM PUBLIC, anon` blocks unauthenticated callers.
   - `auth.uid()` is used inside the function (not a parameter) to prevent user-ID spoofing.
   - Bounding box inputs are validated before querying to prevent nonsensical ranges.
   - `LIMIT 10` prevents excessive result sets that could be used for resource exhaustion.

5. **Update `create_group_conversation` RPC** — replace with new version adding optional location params:

   ```sql
   CREATE OR REPLACE FUNCTION public.create_group_conversation(
     p_name        TEXT,
     p_description TEXT    DEFAULT NULL,
     p_avatar_url  TEXT    DEFAULT NULL,
     p_member_ids  UUID[]  DEFAULT '{}',
     p_latitude    DOUBLE PRECISION DEFAULT NULL,
     p_longitude   DOUBLE PRECISION DEFAULT NULL,
     p_visibility  TEXT    DEFAULT 'public',
     p_category    TEXT    DEFAULT NULL,
     p_member_limit INTEGER DEFAULT NULL
   )
   RETURNS UUID
   LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public
   AS $$
   DECLARE
     v_group_id UUID;
   BEGIN
     -- Input validation
     IF length(trim(p_name)) = 0 OR length(p_name) > 50 THEN
       RAISE EXCEPTION 'Group name must be 1–50 characters';
     END IF;
     IF p_description IS NOT NULL AND length(p_description) > 200 THEN
       RAISE EXCEPTION 'Description must be ≤ 200 characters';
     END IF;
     IF p_visibility NOT IN ('public', 'private') THEN
       RAISE EXCEPTION 'Visibility must be public or private';
     END IF;
     IF p_category IS NOT NULL AND p_category NOT IN (
       'Culture','Food','Nature','History','Heritage','Religion','Landmark','General'
     ) THEN
       RAISE EXCEPTION 'Invalid category';
     END IF;
     IF p_member_limit IS NOT NULL AND p_member_limit < 2 THEN
       RAISE EXCEPTION 'Member limit must be ≥ 2';
     END IF;
     -- Coords must be both present or both null
     IF (p_latitude IS NULL) <> (p_longitude IS NULL) THEN
       RAISE EXCEPTION 'Latitude and longitude must both be provided or both be null';
     END IF;
     IF p_latitude IS NOT NULL AND (p_latitude < -90 OR p_latitude > 90) THEN
       RAISE EXCEPTION 'Latitude must be between -90 and 90';
     END IF;
     IF p_longitude IS NOT NULL AND (p_longitude < -180 OR p_longitude > 180) THEN
       RAISE EXCEPTION 'Longitude must be between -180 and 180';
     END IF;
     -- Limit member_ids to prevent abuse (max 50 initial members)
     IF array_length(p_member_ids, 1) > 50 THEN
       RAISE EXCEPTION 'Cannot add more than 50 members at creation';
     END IF;

     -- Insert the group
     INSERT INTO public.group_conversations
       (name, description, avatar_url, created_by, latitude, longitude, visibility, category, member_limit)
     VALUES
       (trim(p_name), p_description, p_avatar_url, auth.uid(),
        p_latitude, p_longitude, p_visibility, p_category, p_member_limit)
     RETURNING id INTO v_group_id;

     -- Creator as admin
     INSERT INTO public.group_members (group_id, user_id, role)
     VALUES (v_group_id, auth.uid(), 'admin');

     -- Extra members
     IF p_member_ids IS NOT NULL AND array_length(p_member_ids, 1) > 0 THEN
       INSERT INTO public.group_members (group_id, user_id, role)
       SELECT v_group_id, unnest(p_member_ids), 'member'
       ON CONFLICT (group_id, user_id) DO NOTHING;
     END IF;

     RETURN v_group_id;
   END;
   $$;

   REVOKE ALL ON FUNCTION public.create_group_conversation FROM PUBLIC, anon;
   GRANT EXECUTE ON FUNCTION public.create_group_conversation TO authenticated;
   ```

   **Security notes:**
   - Server-side input validation mirrors client-side checks — defense in depth.
   - `trim(p_name)` prevents whitespace-only names.
   - `auth.uid()` used for `created_by` — caller cannot impersonate another user.
   - `array_length` cap prevents bulk-insert abuse.
   - CHECK constraints on the table provide a second layer of validation.

6. **Update TypeScript types** in `types/database.ts`:
   - Add new columns to `group_conversations` Row/Insert/Update types
   - Add `get_nearby_groups` function signature (no `p_user_id` arg — uses `auth.uid()` internally)
   - Update `create_group_conversation` Args with new optional params

**Relevant files:**

- `types/database.ts` — `group_conversations` table type (line ~566), `create_group_conversation` RPC (line ~692)

---

## Phase 2: Data Hook — `useMapGroups`

**Goal:** Hook that fetches/manages group markers for the current map region.

7. **Create `hooks/useMapGroups.ts`**:
   - `fetchGroups(region: Region)` — calls `get_nearby_groups` RPC with region bounding box
   - `createMapGroup(params)` — calls updated `create_group_conversation` RPC with location fields
   - Returns: `groups: MapGroup[]`, `loading`, `fetchGroups`, `createMapGroup`
   - Type `MapGroup`: `{ id, name, description, category, visibility, latitude, longitude, memberCount, memberLimit, avatarUrl, createdBy }`
   - Debounce pattern: reuse the same debounce approach as `usePlacesSearch` (1000ms)
   - **Client-side validation** before RPC call (mirrors server-side checks):
     - Name: 1–50 chars, trimmed, not empty after trim
     - Description: ≤ 200 chars
     - Visibility: must be `'public'` or `'private'`
     - Category: must be one of the allowed values or null
     - Member limit: ≥ 2 or null
     - Coordinates: both present (valid range) or both null
   - **Error handling:** catch specific Supabase `PostgrestError` codes, surface user-friendly messages

**Reference pattern:**

- `hooks/usePlacesSearch.ts` — region-based fetching with debounce
- `hooks/useGroupManagement.ts` — existing group CRUD patterns

---

## Phase 3: Group Marker Component

**Goal:** Custom map marker for groups, visually distinct from place markers.

8. **Create `components/Maps/Marker/GroupMarker.tsx`**:
   - Circular marker with `UsersThree` icon (from phosphor, already used in `CreateGroupSheet`)
   - Color-coded by category (Culture=purple, Food=orange, Nature=green, etc.) or a single brand color
   - Shows group name below the marker
   - Privacy badge: small lock icon overlay for private groups
   - `React.memo` wrapped (same pattern as `CultureMarker`)
   - `shouldRasterizeIOS` + `renderToHardwareTextureAndroid` for GPU optimization
   - Size: ~40px circle (consistent with `PlaceMarker` PIN_SIZE)

**Reference pattern:**

- `components/Maps/Marker/CultureMarker.tsx` — memo wrapper
- `components/Maps/Marker/PlaceMarker.tsx` — GPU optimizations, sizing
- `components/Maps/Marker/ClusterMarker.tsx` — circular marker style

---

## Phase 4: Drag-to-Place Interaction (Pegman Style)

**Goal:** Floating button that user can drag onto the map to place a group pin.

9. **Create `components/Maps/GroupPlacement/GroupPlacementButton.tsx`**:
   - Floating button positioned on the left side of the map (to avoid collision with existing right-side buttons)
   - Icon: `UsersThree` + `Plus` in a circular FAB
   - **Drag behavior** using `Gesture.Pan()` from react-native-gesture-handler + Reanimated:
     - Rest state: button sits at its default position
     - On drag start: scale up slightly (1.1x), add shadow/glow indicating "placement mode"
     - During drag: the button follows the finger as an animated overlay across the map
     - On drop (gesture end): convert screen coordinates to map coordinates using `mapRef.current.coordinateForPoint({ x, y })`
     - After drop: animate button back to rest position, open creation form with the dropped coordinates
     - Cancel: if dropped back near the original button position, cancel placement

10. **Create `components/Maps/GroupPlacement/PlacementGhostPin.tsx`** _(parallel with step 9)_:

- Semi-transparent group marker that follows the drag position
- Provides visual feedback of where the group will be placed
- Animated drop shadow that grows as the pin "lifts" during drag
- Uses `useAnimatedStyle` for smooth position tracking

**Reference pattern:**

- `MapSettingsPanel` Pan gesture (damping: 22, stiffness: 220) — `components/Maps/Settings/MapSettingsPanel.tsx`
- `StopRow` drag activation — `components/Edit/Itinerary/StopRow.tsx`

---

## Phase 5: Long-Press Placement

**Goal:** Alternative placement via long-press on map.

11. **Add `onLongPress` handler to MapView** in `DiscoveryMap.tsx`:
    - `react-native-maps` MapView supports `onLongPress` prop natively — provides `{ nativeEvent: { coordinate: { latitude, longitude } } }`
    - On long press: haptic feedback (expo-haptics), then open creation form with the long-pressed coordinates
    - Only active when not in settings panel or POI detail view
    - **Guard:** Require user to be authenticated (`useAuth()`) before opening the form — redirect to login if not

**Relevant files:**

- `components/Maps/DiscoveryMaps/DiscoveryMap.tsx` — MapView props (line ~236)

---

## Phase 6: Group Creation Bottom Sheet

**Goal:** Form sheet for entering group details after placement.

12. **Create `components/Maps/GroupPlacement/CreateMapGroupSheet.tsx`**:
    - Reanimated bottom sheet (same spring animation pattern as `CreateGroupSheet`)
    - Props: `visible`, `coordinate: { latitude, longitude }`, `onClose`, `onGroupCreated`
    - **Form fields:**
      - Group name (TextInput, max 50 chars, required)
      - Description (TextInput, max 200 chars, optional)
      - Visibility toggle: Public / Private (segmented control or toggle)
      - Category picker: horizontal scrollable chips (Culture, Food, Nature, History, Heritage, Religion, Landmark, General)
      - Member limit: optional numeric input (null = unlimited)
    - **Submit:** calls `useMapGroups.createMapGroup()` → on success, refetch groups, navigate to `/groupchat/[id]`
    - Pan-to-dismiss gesture (same pattern as other sheets)
    - Shows a mini-map preview or coordinate text at the top
    - **Client-side input sanitization:**
      - Trim whitespace from name/description before submit
      - Validate name length (1–50), description length (≤200)
      - Disable submit button while `loading` or if validation fails
      - Show inline validation errors (not just alerts)
      - Prevent double-submit via `submitting` state guard

**Reference pattern:**

- `components/Messages/Bridge/CreateGroupSheet.tsx` — two-step sheet, spring animations, RPC call pattern
- `components/PlanTrips/NewTripModal.tsx` — simpler form modal pattern

---

## Phase 7: Integration into DiscoveryMap

**Goal:** Wire everything together in the DiscoveryMap component.

13. **Update `DiscoveryMap.tsx`** — add new props and integrate:
    - New prop: `hideGroupButton?: boolean` (default false)
    - Import and use `useMapGroups` hook — call `fetchGroups` alongside `fetchPlaces` in `handleRegionChangeComplete`
    - Render group markers alongside landmark markers (separate `useMemo` for group marker elements)
    - Render `GroupPlacementButton` (left side, conditionally via `hideGroupButton`)
    - Render `CreateMapGroupSheet` (controlled by state: `groupPlacementCoords`)
    - Add `onLongPress` to MapView
    - Tapping a group marker: navigate to `/groupchat/[id]` (or open a group info preview)
    - **Auth guard:** Only show `GroupPlacementButton` and enable `onLongPress` when user is authenticated

14. **Update `ExploreScreen.tsx`** _(parallel with step 13)_:
    - Pass through `hideGroupButton` when in picker mode (`tripId` is set)

**Relevant files:**

- `components/Maps/DiscoveryMaps/DiscoveryMap.tsx` — main integration point
- `components/Explore/ExploreScreen.tsx` — ExploreScreen wrapper

---

## Phase 8: Group Marker Tap Detail (Optional Enhancement)

15. **Create `components/Maps/GroupPlacement/GroupPreviewSheet.tsx`** _(optional, can defer)_:
    - When tapping a group marker on the map, show a preview bottom sheet (similar to `POIDetailSheet`)
    - Shows: group name, description, category, member count / limit, visibility
    - Action buttons: "Join Group" (if not member) / "Open Chat" (if member)
    - For private groups: "Request to Join" disabled state or invite-only message

---

## Relevant Files Summary

| File                                                      | Action                                                    |
| --------------------------------------------------------- | --------------------------------------------------------- |
| `types/database.ts`                                       | Add location columns to group types, update RPC signature |
| `hooks/useMapGroups.ts`                                   | **NEW** — fetch/create location-based groups              |
| `components/Maps/Marker/GroupMarker.tsx`                  | **NEW** — custom group pin component                      |
| `components/Maps/GroupPlacement/GroupPlacementButton.tsx` | **NEW** — draggable FAB for pegman-style placement        |
| `components/Maps/GroupPlacement/PlacementGhostPin.tsx`    | **NEW** — drag shadow/preview marker                      |
| `components/Maps/GroupPlacement/CreateMapGroupSheet.tsx`  | **NEW** — group creation form sheet                       |
| `components/Maps/DiscoveryMaps/DiscoveryMap.tsx`          | Add group markers, placement button, long-press handler   |
| `components/Explore/ExploreScreen.tsx`                    | Pass through group button visibility                      |
| Supabase migration SQL                                    | Add columns, index, update/create RPCs                    |

---

## Verification

1. **Schema:** Run migration, verify columns exist via Supabase dashboard, test `get_nearby_groups` RPC returns correct results for public/private visibility
2. **Drag placement:** Verify `coordinateForPoint` returns correct lat/lng on both iOS & Android; verify the pin snaps back on cancel
3. **Long press:** Verify `onLongPress` fires with correct coordinates; verify haptic feedback
4. **Form submission:** Create a group via the sheet, verify it appears in `group_conversations` with location data, verify it also appears in Bridge inbox
5. **Marker rendering:** Pan the map, verify group markers load/unload with debounce; verify `tracksViewChanges=false` is set; verify no FPS drops with 15+ combined markers
6. **Privacy:** Verify private groups only show to members on the map; verify public groups show to all
7. **Navigation:** Tap group marker → opens group chat at `/groupchat/[id]`
8. **Edge cases:** Test creating a group with no member limit, test cancelling placement mid-drag, test creating near existing markers

---

## Decisions

- **Reuse `group_conversations`** — no new table; add nullable `latitude`/`longitude` columns so legacy groups remain unaffected
- **Both placement methods** (drag + long-press) share the same `CreateMapGroupSheet` form
- **Group markers are separate from place markers** — different visual style (circular vs pin), separate useMemo, separate hook
- **15-marker cap applies to places only** — groups have their own render budget (consider capping at ~10 to keep total GPU layers under ~25)
- **Phase 8 (GroupPreviewSheet) is optional** — can ship with direct navigation to groupchat on tap, add preview later

## Security & Production Readiness

### Database Layer

| Control                     | Implementation                                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Input validation**        | CHECK constraints on all new columns (`chk_latitude`, `chk_longitude`, `chk_coords_both_or_none`, `chk_visibility`, `chk_category`, `chk_member_limit`)                  |
| **RLS isolation**           | Existing `group_conv_select` policy unchanged — private groups stay invisible via direct table access. Public group discovery only via `get_nearby_groups` RPC           |
| **SECURITY DEFINER safety** | `SET search_path = public` on all SECURITY DEFINER functions to prevent search-path hijacking                                                                            |
| **Auth enforcement**        | `REVOKE ... FROM PUBLIC, anon` on both RPCs — only `authenticated` role can call them                                                                                    |
| **No user-ID spoofing**     | Both RPCs use `auth.uid()` internally — caller cannot pass another user's ID                                                                                             |
| **Server-side validation**  | `create_group_conversation` validates name length, description length, coordinate ranges, visibility enum, category enum, member limit ≥ 2, member_ids array length ≤ 50 |
| **Result set cap**          | `get_nearby_groups` returns `LIMIT 10` to prevent resource exhaustion                                                                                                    |
| **Bounding box validation** | `get_nearby_groups` rejects invalid lat/lng ranges with `RAISE EXCEPTION`                                                                                                |

### Client Layer

| Control                      | Implementation                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------- |
| **Defense in depth**         | Client validates all inputs before RPC call (mirrors server checks)             |
| **Double-submit prevention** | `submitting` state guard disables button during async operation                 |
| **Auth gate**                | Group creation UI only rendered for authenticated users (`useAuth()`)           |
| **Input trimming**           | `trim()` applied to name/description before submission                          |
| **TextInput maxLength**      | Native `maxLength` prop enforced on name (50) and description (200) inputs      |
| **Error surfacing**          | Supabase `PostgrestError` caught and displayed as user-friendly inline messages |
| **No raw SQL exposure**      | All DB access via typed Supabase RPC — no raw query strings in client           |

### Existing RLS Policies (unchanged)

| Policy              | Command | Rule                      | Impact                                                                          |
| ------------------- | ------- | ------------------------- | ------------------------------------------------------------------------------- |
| `group_conv_select` | SELECT  | Creator OR member         | Private groups stay invisible via direct table queries                          |
| `group_conv_insert` | INSERT  | `auth.uid() = created_by` | Only the authenticated caller can insert (but creation goes through RPC anyway) |
| `group_conv_update` | UPDATE  | Creator OR admin member   | Only admins can edit group metadata                                             |

### Infrastructure Considerations

- **Rate limiting:** Supabase's built-in rate limiting applies to all RPC calls. For additional protection, consider adding `pg_net` or application-level throttling if group creation abuse is observed.
- **Realtime subscriptions:** Group markers loaded via RPC on region change — no Realtime channel needed for map markers (avoids connection proliferation).
- **Migration rollback:** All schema changes are additive (new nullable columns, new function, new index). Rollback = `DROP FUNCTION`, `DROP INDEX`, `ALTER TABLE DROP COLUMN`. No data loss risk.

---

## Further Considerations

1. **Marker tap behavior:** Should tapping a group marker go directly to `/groupchat/[id]`, or show a preview sheet first? _Recommendation: start with direct navigation, add preview sheet as a fast follow._
2. **Group marker cap:** The 15-place-marker cap exists for GPU reasons. With groups added, the total marker count increases. _Recommendation: cap group markers at 10, keeping total ≤ 25._ Enforced by `LIMIT 10` in the `get_nearby_groups` RPC.
3. **`coordinateForPoint` availability:** This method is available on `react-native-maps` MapView ref but behavior differs slightly between Google Maps and Apple Maps providers. Need to test on both platforms.
4. **Content moderation:** Group names and descriptions are user-generated content. Consider adding a profanity filter or moderation queue in a future iteration.
5. **Abuse prevention:** A malicious user could spam many groups. Consider adding a per-user group creation rate limit (e.g., max 5 groups per hour) via a Postgres trigger or application-level check.
