/**
 * lib/missionIconMap.ts
 *
 * Maps the `icon_name` string stored in the `missions` and `user_xp_ledger`
 * Supabase tables to the corresponding Phosphor icon React component + brand
 * colour/background tokens used throughout the app.
 */

import {
  Lightning,
  Star,
  Trophy,
  MapPin,
  ChatCircle,
  Camera,
  UsersThree,
  BookOpen,
  Globe,
  Binoculars,
  Sparkle,
  Flag,
  HandsPraying,
  Mountains,
  type Icon,
} from 'react-native-phosphor';

import { Colors } from '@/constants/style';

export interface MissionIconConfig {
  icon: Icon;
  bg: string;
  color: string;
}

const MAP: Record<string, MissionIconConfig> = {
  Lightning:    { icon: Lightning,    bg: '#F3F0FF', color: '#8E44AD'       },
  Star:         { icon: Star,         bg: '#FFF0F5', color: '#E31C5F'       },
  Trophy:       { icon: Trophy,       bg: '#FFF8E6', color: '#FFB800'       },
  MapPin:       { icon: MapPin,       bg: '#FFF8E6', color: '#FFB800'       },
  ChatCircle:   { icon: ChatCircle,   bg: '#F0FFF4', color: '#27AE60'       },
  Camera:       { icon: Camera,       bg: '#EBF3FF', color: Colors.brand    },
  UsersThree:   { icon: UsersThree,   bg: '#EBF3FF', color: Colors.brand    },
  BookOpen:     { icon: BookOpen,     bg: '#F3F0FF', color: '#8E44AD'       },
  Globe:        { icon: Globe,        bg: '#E6FFF8', color: '#16A085'       },
  Binoculars:   { icon: Binoculars,   bg: '#EBF3FF', color: Colors.brand    },
  Sparkle:      { icon: Sparkle,      bg: '#FFF0F5', color: '#E31C5F'       },
  Flag:         { icon: Flag,         bg: '#FFF8E6', color: '#FFB800'       },
  HandsPraying: { icon: HandsPraying, bg: '#F3F0FF', color: '#8E44AD'       },
  Mountains:    { icon: Mountains,    bg: '#E6FFF8', color: '#16A085'       },
};

/** Falls back to Star if the icon_name is unknown. */
export function getMissionIcon(name: string): MissionIconConfig {
  return MAP[name] ?? MAP['Star'];
}
