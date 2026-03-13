/**
 * QUICK START: Gacha System Integration
 * 
 * Copy-paste this code into your landmark detection component
 * to enable the 50/50 gacha system.
 */

// ============================================================
// 1. Add these imports to your component
// ============================================================

import { useGacha } from '@/hooks/useGacha';
import { SkiaGyroCard } from '@/components/LandmarkDetection/SkiaGyroCard';
import type { GachaRarity } from '@/types/gacha';
import * as Haptics from 'expo-haptics';

// ============================================================
// 2. Add state for gacha card display
// ============================================================

const [showGachaCard, setShowGachaCard] = useState(false);
const [gachaReward, setGachaReward] = useState<{
  imageUri: string;
  rarity: GachaRarity;
} | null>(null);

// ============================================================
// 3. Get gacha hook
// ============================================================

const { processScan } = useGacha();

// ============================================================
// 4. In your landmark detection success handler, add this:
// ============================================================

const handleLandmarkDetected = async (
  landmarkId: string,
  imageUri: string,
  landmarkName: string
) => {
  // ... your existing detection logic ...

  // ✨ NEW: Process gacha (50/50 chance)
  try {
    const gachaResult = await processScan(landmarkId);
    
    if (gachaResult?.awarded) {
      // 🎉 User won gacha!
      console.log('Gacha awarded:', {
        rarity: gachaResult.rarity,
        points: gachaResult.total_points,
        pity: gachaResult.current_pity,
      });

      // Haptic feedback
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      // Show gacha card animation
      setGachaReward({
        imageUri: imageUri, // Use the captured image
        rarity: gachaResult.rarity as GachaRarity,
      });
      setShowGachaCard(true);

      // Optional: Show toast
      // showToast(`✨ You got a ${gachaResult.rarity}!`);
    } else {
      // No gacha this time (50/50 failed)
      console.log('No gacha awarded this time');
      
      // Optional: Show message
      // showToast('Keep exploring for more chances!');
    }
  } catch (error) {
    console.error('Gacha processing failed:', error);
  }
};

// ============================================================
// 5. Add this to your JSX return (after your existing UI)
// ============================================================

return (
  <View style={{ flex: 1 }}>
    {/* Your existing landmark detection UI */}
    
    {/* ✨ NEW: Gacha card overlay */}
    {showGachaCard && gachaReward && (
      <View style={StyleSheet.absoluteFill}>
        <SkiaGyroCard
          imageUri={gachaReward.imageUri}
          rarity={gachaReward.rarity}
          onDismiss={() => {
            setShowGachaCard(false);
            setGachaReward(null);
          }}
        />
      </View>
    )}
  </View>
);

// ============================================================
// 6. OPTIONAL: Add GachaProgressCard to a stats/profile screen
// ============================================================

import { GachaProgressCard } from '@/components/Gacha/GachaProgressCard';

// In your profile/stats screen:
<GachaProgressCard
  onExchangePress={async () => {
    // Handle exchange (requires useGacha hook)
    const { exchange } = useGacha();
    const result = await exchange();
    
    if (result?.success) {
      // Show success + gacha card
      console.log('Exchanged successfully!');
    }
  }}
/>

// ============================================================
// THAT'S IT! 🎉
// ============================================================

/**
 * Your gacha system is now live!
 * 
 * When users scan landmarks:
 * - 50% chance to get gacha points
 * - If awarded → See rarity (Secret, Mythic, etc.)
 * - Points accumulate toward 200 (exchange for guaranteed Secret)
 * - Pity counter tracks pulls (guaranteed Secret at 80)
 * 
 * Test it by scanning landmarks!
 */
