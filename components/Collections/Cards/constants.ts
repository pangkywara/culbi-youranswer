export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legends' | 'Mythic' | 'Secret';

export function getRarityConfig(rarity: Rarity) {
  switch (rarity) {
    case 'Secret':  
      return { mode: 5, label: 'Secret', badgeColor: '#E63946', bgColors: ['#f2f2f2', '#e0e0e0', '#d0d0d0'], glowColor: '#E63946' };
    case 'Mythic':  
      return { mode: 4, label: 'Mythic', badgeColor: '#FFB703', bgColors: ['#1a140a', '#1e180e', '#140e06'], glowColor: '#FFB703' };
    case 'Legends': 
      return { mode: 3, label: 'Legendary', badgeColor: '#00B4D8', bgColors: ['#1a0e0e', '#0e1a14', '#0e0e1a'], glowColor: '#00B4D8' };
    case 'Epic':    
      return { mode: 2, label: 'Epic', badgeColor: '#8338EC', bgColors: ['#0e1530', '#0a1028', '#08101e'], glowColor: '#8338EC' };
    case 'Rare':    
      return { mode: 1, label: 'Rare', badgeColor: '#2A9D8F', bgColors: ['#0a1a12', '#0e1e16', '#081410'], glowColor: '#2A9D8F' };
    default:        
      return { mode: 0, label: 'Common', badgeColor: '#6C757D', bgColors: ['#d0d0d0', '#e8e8e8', '#f2f2f2'], glowColor: '#ffffff' };
  }
}