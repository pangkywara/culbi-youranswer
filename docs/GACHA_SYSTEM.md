# Gacha Points System Documentation

## Overview

The gacha system provides a premium "sparking" mechanic where users have a **50/50 chance** to receive gacha points when scanning landmarks. Points accumulate toward guaranteed rewards, and a pity system ensures eventual success.

## Database Architecture

### Tables

#### 1. `gacha_banners`
Time-limited or permanent gacha events.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Banner name (e.g., "Standard Banner") |
| `description` | TEXT | Banner description |
| `featured_landmark_id` | UUID | Optional landmark tie-in |
| `start_date` | TIMESTAMPTZ | Banner start time |
| `end_date` | TIMESTAMPTZ | Banner end time |
| `is_active` | BOOLEAN | Whether banner is currently active |
| `pity_threshold` | INTEGER | Hard pity (default: 80 pulls) |
| `points_per_pull` | INTEGER | Points awarded per pull (default: 1) |
| `points_to_exchange` | INTEGER | Points needed for guaranteed exchange (default: 200) |

**Default Banner**: A "Standard Banner" is automatically created that runs for 100 years (effectively permanent).

#### 2. `gacha_points`
Tracks accumulated points (sparking currency) per user per banner.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Reference to `profiles.id` |
| `banner_id` | UUID | Reference to `gacha_banners.id` |
| `points` | INTEGER | Current spendable points |
| `accumulated_total` | INTEGER | Total points ever earned (analytics) |
| `last_pull_at` | TIMESTAMPTZ | Last time user pulled |

**Constraint**: `UNIQUE(user_id, banner_id)`

#### 3. `gacha_pity`
Tracks the pity counter to guarantee wins.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Reference to `profiles.id` |
| `pity_group` | TEXT | Pity group name (e.g., 'standard') |
| `current_pity` | INTEGER | Pulls since last SSR (0-80) |
| `is_guaranteed` | BOOLEAN | 50/50 system flag |
| `last_ssr_at` | TIMESTAMPTZ | When user last won an SSR |

**Constraint**: `UNIQUE(user_id, pity_group)`

**Reset Logic**: `current_pity` resets to 0 when user wins Secret, Mythic, or Legends rarity.

#### 4. `gacha_pull_history`
Immutable audit log of every gacha pull.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Who pulled |
| `banner_id` | UUID | Which banner |
| `landmark_id` | UUID | Which landmark was scanned (nullable) |
| `rarity` | TEXT | Secret, Mythic, Legends, Epic, Rare, Common |
| `is_pity_win` | BOOLEAN | Won due to pity threshold |
| `pity_count` | INTEGER | Pity counter at time of pull |
| `points_awarded` | INTEGER | Points given (usually 1) |
| `source` | TEXT | 'landmark_scan' or 'points_exchange' |
| `created_at` | TIMESTAMPTZ | When the pull happened |

**Important**: This table is **append-only**. No updates or deletes allowed (except by service role for CS support).

#### 5. `gacha_exchanges`
Log of direct purchases using accumulated points.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Who exchanged |
| `banner_id` | UUID | Which banner |
| `points_spent` | INTEGER | Points deducted |
| `landmark_id` | UUID | What was purchased (nullable) |
| `rarity` | TEXT | Always 'Secret' for exchanges |
| `created_at` | TIMESTAMPTZ | When the exchange happened |

## Core Functions

### 1. `process_landmark_scan_for_gacha(user_id UUID, landmark_id UUID)`

**Purpose**: Process a landmark scan with 50/50 chance to award gacha points.

**Returns**: Table with:
- `awarded` (BOOLEAN) - Did the 50/50 succeed?
- `points_given` (INTEGER) - How many points awarded (0 or 1)
- `rarity` (TEXT) - What rarity was rolled
- `is_pity_win` (BOOLEAN) - Did pity trigger?
- `current_pity` (INTEGER) - Current pity counter
- `total_points` (INTEGER) - User's total points after this pull

**Usage Example**:
```typescript
const { data, error } = await supabase
  .rpc('process_landmark_scan_for_gacha', {
    p_user_id: userId,
    p_landmark_id: landmarkId,
  });

if (data && data[0].awarded) {
  console.log(`🎉 You got ${data[0].rarity}!`);
  console.log(`Points: ${data[0].total_points}/200`);
} else {
  console.log('No gacha points this time. Try again!');
}
```

**Logic Flow**:
1. 50% chance check (random roll)
2. If fails → return `awarded: false`
3. If succeeds:
   - Increment pity counter
   - Check if pity >= 80 → force Secret rarity
   - Otherwise, roll for rarity:
     - 1% Secret (resets pity)
     - 3% Mythic (resets pity)
     - 6% Legends (resets pity)
     - 15% Epic
     - 25% Rare
     - 50% Common
   - Award 1 point
   - Log in pull_history
   - Return result

### 2. `exchange_points_for_item(user_id UUID, landmark_id UUID)`

**Purpose**: Spend 200 points to get a guaranteed Secret rarity item.

**Returns**: Table with:
- `success` (BOOLEAN) - Did the exchange succeed?
- `message` (TEXT) - Human-readable result
- `points_spent` (INTEGER) - How many points were deducted
- `points_remaining` (INTEGER) - Points left after exchange

**Usage Example**:
```typescript
const { data, error } = await supabase
  .rpc('exchange_points_for_item', {
    p_user_id: userId,
    p_landmark_id: null, // or specific landmark
  });

if (data && data[0].success) {
  console.log(data[0].message); // "Successfully exchanged 200 points..."
} else {
  console.log(data[0].message); // "Insufficient points..."
}
```

**Logic Flow**:
1. Check user has >= 200 points
2. If insufficient → return error message
3. Deduct 200 points
4. Log in `gacha_exchanges`
5. Log in `gacha_pull_history` with source='points_exchange'
6. Return success

### 3. `get_user_gacha_summary(user_id UUID)`

**Purpose**: Get quick overview of user's gacha progress.

**Returns**: Table with:
- `current_points` (INTEGER) - Spendable points
- `points_needed` (INTEGER) - Points required for exchange (200)
- `progress_percent` (NUMERIC) - % toward exchange
- `current_pity` (INTEGER) - Current pity counter
- `pity_threshold` (INTEGER) - Hard pity limit (80)
- `total_pulls` (BIGINT) - Total pulls ever made
- `secret_count` (BIGINT) - Total Secret rarity wins
- `can_exchange` (BOOLEAN) - Has enough points for exchange

**Usage Example**:
```typescript
const { data, error } = await supabase
  .rpc('get_user_gacha_summary', {
    p_user_id: userId,
  });

console.log(`Points: ${data[0].current_points}/200`);
console.log(`Pity: ${data[0].current_pity}/80`);
console.log(`Can exchange: ${data[0].can_exchange}`);
```

### 4. `get_pull_history(user_id UUID, limit INTEGER)`

**Purpose**: Get paginated pull history.

**Returns**: Array of pulls with:
- `id` (UUID)
- `rarity` (TEXT)
- `is_pity_win` (BOOLEAN)
- `pity_count` (INTEGER)
- `points_awarded` (INTEGER)
- `source` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `banner_name` (TEXT)

**Usage Example**:
```typescript
const { data, error } = await supabase
  .rpc('get_pull_history', {
    p_user_id: userId,
    p_limit: 50,
  });

data.forEach(pull => {
  console.log(`${pull.rarity} - ${pull.created_at}`);
});
```

## Security (RLS Policies)

All tables have Row-Level Security enabled:

### `gacha_banners`
- **SELECT**: Everyone (public banners)
- **INSERT/UPDATE/DELETE**: Service role only

### `gacha_points`
- **SELECT/INSERT/UPDATE**: Users can only access their own
- **ALL**: Service role

### `gacha_pity`
- **SELECT/INSERT/UPDATE**: Users can only access their own
- **ALL**: Service role

### `gacha_pull_history`
- **SELECT**: Users can view their own
- **INSERT**: Users can append their own
- **UPDATE/DELETE**: Blocked (immutable audit log)
- **ALL**: Service role for CS support

### `gacha_exchanges`
- **SELECT**: Users can view their own
- **INSERT**: Users can append their own
- **UPDATE/DELETE**: Blocked (immutable log)
- **ALL**: Service role

## Integration Guide

### Step 1: Add to Landmark Scan Flow

When a user successfully scans a landmark, call the gacha function:

```typescript
// In your landmark detection success handler
const handleLandmarkDetected = async (landmarkId: string) => {
  // ... existing detection logic ...
  
  // Process gacha roll
  const { data: gachaResult, error } = await supabase
    .rpc('process_landmark_scan_for_gacha', {
      p_user_id: userId,
      p_landmark_id: landmarkId,
    });
  
  if (error) {
    console.error('Gacha error:', error);
    return;
  }
  
  const result = gachaResult[0];
  
  if (result.awarded) {
    // Show gacha reveal animation
    setGachaReward({
      rarity: result.rarity,
      isPityWin: result.is_pity_win,
      currentPoints: result.total_points,
      currentPity: result.current_pity,
    });
    
    // Trigger SkiaGyroCard with rarity
    // (You already have this component!)
  } else {
    // Show "better luck next time" message
    showToast('No gacha points this time. Keep exploring!');
  }
};
```

### Step 2: Show Gacha Progress UI

Create a gacha progress component:

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function GachaProgress({ userId }: { userId: string }) {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase
        .rpc('get_user_gacha_summary', { p_user_id: userId });
      
      if (data && data[0]) {
        setStats(data[0]);
      }
    };
    
    fetchStats();
  }, [userId]);
  
  if (!stats) return null;
  
  return (
    <View>
      <Text>Points: {stats.current_points}/200</Text>
      <ProgressBar value={stats.progress_percent} />
      
      <Text>Pity: {stats.current_pity}/80</Text>
      <ProgressBar value={(stats.current_pity / 80) * 100} />
      
      {stats.can_exchange && (
        <Button onPress={handleExchange}>
          Exchange for Guaranteed Secret!
        </Button>
      )}
    </View>
  );
}
```

### Step 3: Exchange Handler

```typescript
const handleExchange = async () => {
  const { data, error } = await supabase
    .rpc('exchange_points_for_item', {
      p_user_id: userId,
      p_landmark_id: null,
    });
  
  if (data && data[0].success) {
    // Show SkiaGyroCard with Secret rarity
    setGachaReward({
      rarity: 'Secret',
      isPityWin: false,
      isExchange: true,
    });
  } else {
    showToast(data[0].message);
  }
};
```

## Rarity Rates

| Rarity | % Chance | Resets Pity? |
|--------|----------|--------------|
| Secret | 1% | ✅ Yes |
| Mythic | 3% | ✅ Yes |
| Legends | 6% | ✅ Yes |
| Epic | 15% | ❌ No |
| Rare | 25% | ❌ No |
| Common | 50% | ❌ No |

**Hard Pity**: At 80 pulls, next pull is guaranteed Secret (100%).

## Best Practices

1. **Always handle errors**: The RPC calls can fail
2. **Show feedback**: Even if 50/50 fails, show something to the user
3. **Animate rewards**: Use SkiaGyroCard for visual impact
4. **Track analytics**: Use `accumulated_total` for insights
5. **Rate limiting**: Consider adding cooldowns to prevent spam scanning

## Testing

Use the Supabase SQL editor to test:

```sql
-- Simulate a pull for user
SELECT * FROM process_landmark_scan_for_gacha(
  'your-user-uuid', 
  'some-landmark-uuid'
);

-- Check user stats
SELECT * FROM get_user_gacha_summary('your-user-uuid');

-- View pull history
SELECT * FROM get_pull_history('your-user-uuid', 10);
```

## Database Maintenance

### Monthly Cleanup (Optional)

Convert expired banner points to permanent currency:

```sql
-- This would be a cron job
-- When a banner ends, convert points to a "stardust" currency
-- For now, points persist indefinitely
```

### Analytics Queries

```sql
-- Average pulls before Secret win
SELECT AVG(pity_count) 
FROM gacha_pull_history 
WHERE rarity = 'Secret' AND source = 'landmark_scan';

-- Most active users
SELECT user_id, COUNT(*) as total_pulls
FROM gacha_pull_history
GROUP BY user_id
ORDER BY total_pulls DESC
LIMIT 10;

-- Rarity distribution
SELECT rarity, COUNT(*) as count
FROM gacha_pull_history
GROUP BY rarity
ORDER BY count DESC;
```

## Troubleshooting

**Q: Function not found error**  
A: Run `GRANT EXECUTE ON FUNCTION ... TO authenticated;` for all functions.

**Q: RLS blocking queries**  
A: Check that policies match `auth.uid() = user_id`.

**Q: Banner not found**  
A: Ensure default banner exists or call `get_active_banner()` first.

**Q: Points not incrementing**  
A: Check the 50/50 roll succeeded (`awarded = true`).

## Future Enhancements

- [ ] Time-limited event banners
- [ ] Rate-up mechanics (increased % for specific landmarks)
- [ ] Guaranteed featured item on exchange
- [ ] Pity carry-over between similar banners
- [ ] Wish history sharing
- [ ] Constellation/duplicate system
- [ ] Banner history archive
- [ ] Soft pity (increased rates at 70+ pulls)
