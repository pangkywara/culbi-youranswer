import { Lightning, Star, Trophy } from 'react-native-phosphor';
import { Mission } from './missions.types';

export const CATEGORIES = ['All', 'Daily', 'Milestones', 'Social'];

export const MISSIONS_DATA: Mission[] = [
  {
    id: '1',
    title: 'Cultural Explorer',
    description: 'Visit 2 local landmarks today.',
    progress: '1/2',
    reward: '50 XP',
    category: 'Daily',
    isCompleted: false,
    icon: Lightning,
  },
  {
    id: '2',
    title: 'The Bridge',
    description: 'Send 3 messages to new connections.',
    progress: '3/3',
    reward: '20 XP',
    category: 'Social',
    isCompleted: true,
    icon: Star,
  },
  {
    id: '3',
    title: 'Passport Stamper',
    description: 'Reach level 5 cultural competence.',
    progress: 'Lv. 1/5',
    reward: 'Exclusive Badge',
    category: 'Milestones',
    isCompleted: false,
    icon: Trophy,
  },
];