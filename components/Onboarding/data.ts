import { Colors } from '@/constants/style';
import { AVPlaybackSource } from 'expo-av';

export interface SlideData {
  id: string;
  videoSource: AVPlaybackSource; // Updated type for expo-av
  gradient: [string, string];
  accent: string;
  tag: string;
  title: string;
  body: string;
}

export const SLIDES: SlideData[] = [
  {
    id: 'welcome',
    videoSource: require('@/assets/onboarding/island.mp4'),
    gradient: ['#FAFAFA', '#F0EDE8'],
    accent: Colors.brand,
    tag: 'Cultural Bridge',
    title: 'Bridge the\nBorneo Gap.',
    body: 'Explore the unique traditions and shared heritage between West Kalimantan and Sarawak.',
  },
  {
    id: 'signin',
    videoSource: require('@/assets/onboarding/peoples.mp4'),
    gradient: ['#FAFAFA', '#F0EDE8'],
    accent: Colors.brand,
    tag: 'Join for free',
    title: 'Join the Community\nwith One Tap',
    body: 'Sign in to save discoveries, earn stamps, and connect with fellow explorers.',
  },
  {
    id: 'promise',
    videoSource: require('@/assets/onboarding/explore.mp4'),
    gradient: ['#FAFAFA', '#F0EDE8'],
    accent: Colors.brand,
    tag: 'Ready to explore',
    title: 'Your AI Liaison\nIs Ready',
    body: "Navigate cultural nuances between Borneo’s two proud regions. Your journey starts now.",
  },
];