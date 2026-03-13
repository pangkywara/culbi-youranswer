import { ExploreCategory, CulturalExperience } from '../../types';

export const CATEGORIES: ExploreCategory[] = [
  { id: '1', name: 'All', icon: 'sparkle' },
  { id: '2', name: 'Traditions', icon: 'fire' },
  { id: '3', name: 'Culinary', icon: 'forkknife' },
  { id: '4', name: 'Workshops', icon: 'paintbrush' },
  { id: '5', name: 'Festivals', icon: 'maskhappy' },
  { id: '6', name: 'Community', icon: 'users' },
];

export const MOCK_EXPERIENCES: CulturalExperience[] = [
  {
    id: '1',
    title: 'Gawai Dayak Festival',
    imageUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop',
    distance: '12 km away',
    bridgeRating: 4.8,
    category: 'Traditions',
    location: { latitude: -0.0435, longitude: 109.3245 },
  },
  {
    id: '2',
    title: 'Traditional Dayak Cooking Class',
    imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&auto=format&fit=crop',
    distance: '8 km away',
    bridgeRating: 4.9,
    category: 'Culinary',
    location: { latitude: -0.0335, longitude: 109.3145 },
  },
  {
    id: '3',
    title: 'Batik Art Workshop',
    imageUrl: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=800&auto=format&fit=crop',
    distance: '15 km away',
    bridgeRating: 4.7,
    category: 'Workshops',
    location: { latitude: -0.0535, longitude: 109.3345 },
  },
  {
    id: '4',
    title: 'Cap Go Meh Celebration',
    imageUrl: 'https://images.unsplash.com/photo-1528756514091-dee5ecaa3278?w=800&auto=format&fit=crop',
    distance: '5 km away',
    bridgeRating: 5.0,
    category: 'Festivals',
    location: { latitude: -0.0235, longitude: 109.3425 },
  },
  {
    id: '5',
    title: 'Rumah Radakng Longhouse Visit',
    imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop',
    distance: '18 km away',
    bridgeRating: 4.6,
    category: 'Community',
    location: { latitude: -0.0635, longitude: 109.3545 },
  },
];