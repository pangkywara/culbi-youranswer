# Gacha Key System Documentation

## Overview

The Gacha Key System allows users to earn "keys" (gacha pulls) by scanning landmarks. Each key enables one gacha pull, where users can win collectible cards with varying rarities. The actual gacha pull experience uses the existing `SkiaGyroCard` component with holographic effects.

---

## System Architecture

### User Flow

```
1. User scans landmark
   ↓
2. Complete flashcard stack
   ↓
3. 50/50 chance to earn 1 gacha key
   ↓
4. Toast notification: "🎉 Gacha Key Earned!"
   ↓
5. User navigates to Collections (Profile tab)
   ↓
6. Sees "You have X keys" badge  ↓
7. Taps "Pull Gacha" button
   ↓
8. Uses 1 key → SkiaGyroCard animation
   ↓
9. Reveals card with rarity (Common → Secret)
   ↓
10. Card added to user's collection
```

---

## Database Schema

### Tables

#### 1. `gacha_keys` - User's Available Keys

```sql
CREATE TABLE gacha_keys (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  keys_available INTEGER NOT NULL DEFAULT 0 CHECK (keys_available >= 0),
  total_keys_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_gacha_keys_user_id ON gacha_keys(user_id);

-- RLS
ALTER TABLE gacha_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY gacha_keys_select_own ON gacha_keys
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY gacha_keys_update_own ON gacha_keys
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
```

#### 2. `gacha_cards` - Card Pool

```sql
CREATE TABLE gacha_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rarity gacha_rarity NOT NULL,
  image_url TEXT, -- To be populated later
  landmark_id UUID REFERENCES landmarks(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for gacha pulls (random selection by rarity)
CREATE INDEX idx_gacha_cards_rarity ON gacha_cards(rarity) WHERE is_active = TRUE;
CREATE INDEX idx_gacha_cards_landmark ON gacha_cards(landmark_id);

-- RLS (public read, admin write)
ALTER TABLE gacha_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY gacha_cards_select_all ON gacha_cards
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE);
```

#### 3. `user_gacha_collection` - User's Card Collection

```sql
CREATE TABLE user_gacha_collection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES gacha_cards(id) ON DELETE CASCADE,
  obtained_at TIMESTAMPTZ DEFAULT NOW(),
  pull_source TEXT DEFAULT 'gacha_pull',
  -- Optional: Allow duplicates or enforce unique
  -- UNIQUE(user_id, card_id) -- Uncomment for no duplicates
  CHECK (pull_source IN ('gacha_pull', 'event', 'gift'))
);

-- Indexes
CREATE INDEX idx_user_collection_user_id ON user_gacha_collection(user_id);
CREATE INDEX idx_user_collection_card_id ON user_gacha_collection(card_id);
CREATE INDEX idx_user_collection_obtained ON user_gacha_collection(obtained_at DESC);

-- RLS
ALTER TABLE user_gacha_collection ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_collection_select_own ON user_gacha_collection
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY user_collection_insert_own ON user_gacha_collection
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
```

#### 4. `gacha_pull_history` - Audit Log

```sql
CREATE TABLE gacha_pull_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES gacha_cards(id) ON DELETE CASCADE,
  rarity gacha_rarity NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pull_history_user_id ON gacha_pull_history(user_id);
CREATE INDEX idx_pull_history_created ON gacha_pull_history(created_at DESC);

-- RLS
ALTER TABLE gacha_pull_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY pull_history_select_own ON gacha_pull_history
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
```

#### 5. Enum Type

```sql
-- Create rarity enum (6 levels)
CREATE TYPE gacha_rarity AS ENUM (
  'Common',   -- 50%
  'Rare',     -- 25%
  'Epic',     -- 15%
  'Legends',  -- 6%
  'Mythic',   -- 3%
  'Secret'    -- 1%
);
```

---

## Backend Functions

### 1. `award_gacha_key`

Awards a gacha key with 50/50 probability.

```sql
CREATE OR REPLACE FUNCTION award_gacha_key(
  p_user_id UUID,
  p_landmark_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_awarded BOOLEAN;
  v_total_keys INTEGER;
BEGIN
  -- 50/50 random chance
  v_awarded := random() < 0.5;
  
  IF NOT v_awarded THEN
    RETURN jsonb_build_object(
      'awarded', false,
      'keys_available', 0
    );
  END IF;
  
  -- Award 1 key
  INSERT INTO public.gacha_keys (user_id, keys_available, total_keys_earned)
  VALUES (p_user_id, 1, 1)
  ON CONFLICT (user_id) DO UPDATE
  SET 
    keys_available = public.gacha_keys.keys_available + 1,
    total_keys_earned = public.gacha_keys.total_keys_earned + 1,
    updated_at = NOW();
  
  -- Get total keys
  SELECT keys_available INTO v_total_keys
  FROM public.gacha_keys
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'awarded', true,
    'keys_available', v_total_keys
  );
END;
$$;
```

### 2. `perform_gacha_pull`

Performs a gacha pull using 1 key.

```sql
CREATE OR REPLACE FUNCTION perform_gacha_pull(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_keys INTEGER;
  v_roll FLOAT;
  v_rarity gacha_rarity;
  v_card_id UUID;
  v_card_name TEXT;
  v_card_image TEXT;
  v_card_desc TEXT;
BEGIN
  -- Check if user has keys
  SELECT keys_available INTO v_keys
  FROM public.gacha_keys
  WHERE user_id = p_user_id;
  
  IF v_keys IS NULL OR v_keys < 1 THEN
    RAISE EXCEPTION 'No gacha keys available';
  END IF;
  
  -- Determine rarity based on probability
  v_roll := random();
  
  IF v_roll < 0.01 THEN
    v_rarity := 'Secret';      -- 1%
  ELSIF v_roll < 0.04 THEN
    v_rarity := 'Mythic';      -- 3%
  ELSIF v_roll < 0.10 THEN
    v_rarity := 'Legends';     -- 6%
  ELSIF v_roll < 0.25 THEN
    v_rarity := 'Epic';        -- 15%
  ELSIF v_roll < 0.50 THEN
    v_rarity := 'Rare';        -- 25%
  ELSE
    v_rarity := 'Common';      -- 50%
  END IF;
  
  -- Select random card of that rarity
  SELECT id, name, image_url, description
  INTO v_card_id, v_card_name, v_card_image, v_card_desc
  FROM public.gacha_cards
  WHERE rarity = v_rarity AND is_active = TRUE
  ORDER BY random()
  LIMIT 1;
  
  IF v_card_id IS NULL THEN
    RAISE EXCEPTION 'No cards available for rarity: %', v_rarity;
  END IF;
  
  -- Add to user's collection
  INSERT INTO public.user_gacha_collection (user_id, card_id, pull_source)
  VALUES (p_user_id, v_card_id, 'gacha_pull');
  
  -- Record pull history
  INSERT INTO public.gacha_pull_history (user_id, card_id, rarity)
  VALUES (p_user_id, v_card_id, v_rarity);
  
  -- Consume 1 key
  UPDATE public.gacha_keys
  SET 
    keys_available = keys_available - 1,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'card_id', v_card_id,
    'card_name', v_card_name,
    'card_description', v_card_desc,
    'image_url', v_card_image,
    'rarity', v_rarity,
    'keys_remaining', v_keys - 1
  );
END;
$$;
```

### 3. `get_user_gacha_summary`

Get user's gacha stats.

```sql
CREATE OR REPLACE FUNCTION get_user_gacha_summary(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'keys_available', COALESCE(k.keys_available, 0),
    'total_keys_earned', COALESCE(k.total_keys_earned, 0),
    'cards_collected', COALESCE(COUNT(DISTINCT c.card_id), 0),
    'total_pulls', COALESCE((SELECT COUNT(*) FROM public.gacha_pull_history WHERE user_id = p_user_id), 0),
    'secret_count', COALESCE((SELECT COUNT(*) FROM public.gacha_pull_history WHERE user_id = p_user_id AND rarity = 'Secret'), 0),
    'mythic_count', COALESCE((SELECT COUNT(*) FROM public.gacha_pull_history WHERE user_id = p_user_id AND rarity = 'Mythic'), 0)
  ) INTO v_result
  FROM public.gacha_keys k
  LEFT JOIN public.user_gacha_collection c ON c.user_id = k.user_id
  WHERE k.user_id = p_user_id
  GROUP BY k.keys_available, k.total_keys_earned;
  
  RETURN COALESCE(v_result, jsonb_build_object(
    'keys_available', 0,
    'total_keys_earned', 0,
    'cards_collected', 0,
    'total_pulls', 0,
    'secret_count', 0,
    'mythic_count', 0
  ));
END;
$$;
```

---

## Integration Points

### 1. PrintingOverlay (Landmark Scan Complete)

```typescript
// After completing flashcards
const result = await awardGachaKey(userId, landmarkId);

if (result.awarded) {
  // Show toast: "🎉 Gacha Key Earned!"
  showGachaKeyToast(result.keys_available);
}
```

### 2. Collections Screen (Profile Tab)

```typescript
// Display available keys
const summary = await getUserGachaSummary(userId);

// Show: "You have {summary.keys_available} keys"
// Button: "Pull Gacha" (disabled if keys_available === 0)
```

### 3. Gacha Pull Screen

```typescript
// User taps "Pull Gacha"
const pullResult = await performGachaPull(userId);

// Show SkiaGyroCard animation
<SkiaGyroCard
  imageUri={pullResult.image_url || placeholderImage}
  rarity={pullResult.rarity} // Common, Rare, Epic, Legends, Mythic, Secret
  onDismiss={() => {
    // Show collection or return to profile
  }}
/>
```

---

## Rarity Configuration

Matches existing `SkiaGyroCard` component:

| Rarity  | Probability | Color   | Visual Effect |
|---------|-------------|---------|---------------|
| Common  | 50%         | Silver  | Basic glow    |
| Rare    | 25%         | Blue    | Medium glow   |
| Epic    | 15%         | Purple  | Strong glow   |
| Legends | 6%          | Gold    | Prismatic     |
| Mythic  | 3%          | Violet  | High energy   |
| Secret  | 1%          | Pink    | Maximum power |

---

## Migration Checklist

- [ ] Drop old gacha tables (gacha_banners, gacha_points, gacha_pity, gacha_pull_history, gacha_exchanges)
- [ ] Create new tables (gacha_keys, gacha_cards, user_gacha_collection, gacha_pull_history)
- [ ] Create enum type (gacha_rarity)
- [ ] Set up RLS policies
- [ ] Create backend functions (award_gacha_key, perform_gacha_pull, get_user_gacha_summary)
- [ ] Seed initial gacha_cards (placeholder with landmark associations)
- [ ] Update TypeScript types
- [ ] Update service layer (lib/gacha.ts)
- [ ] Update React hooks (hooks/useGacha.ts)
- [ ] Update components (GachaToast → show "Key Earned" message)
- [ ] Integrate SkiaGyroCard into gacha pull flow

---

## Next Steps

1. User will add card images to `gacha_cards` table later
2. Consider: Allow duplicate cards or enforce unique collection
3. Consider: Add card trading/exchange system
4. Consider: Seasonal/event exclusive cards
