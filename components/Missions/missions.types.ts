import { Icon } from 'react-native-phosphor';

export type MissionCategory = 'All' | 'Daily' | 'Milestones' | 'Social';

export interface Mission {
  id: string;
  title: string;
  description: string;
  /** Human-readable progress string, e.g. "2/5" or "Lv. 2/5" */
  progress: string;
  /** Raw numeric progress count (for progress bar in drawer) */
  currentCount: number;
  /** Raw target count (for progress bar in drawer) */
  targetCount: number;
  reward: string;
  category: MissionCategory;
  /** True when is_completed = true */
  isCompleted: boolean;
  /** True when current_count > 0 and not yet completed */
  isOngoing: boolean;
  /** True when the badge/XP reward has been claimed */
  rewardClaimed: boolean;
  icon: Icon;
}