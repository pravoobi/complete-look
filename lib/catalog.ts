// Demo catalog: every item passed the Nov 1 try-on spikes (SPIKES.md). Colours come from
// scripts/prepare-catalog.mjs (k-means on the product image), never typed by hand.
import colors from '@/data/catalog-colors.json';

export type Occasion = 'wedding-guest' | 'diwali' | 'sangeet' | 'office-ethnic';
export type DominantColor = { hex: string; share: number };

export type Outfit = {
  id: string;
  kind: 'outfit';
  name: string;
  category: 'kurta-set' | 'anarkali' | 'lehenga' | 'saree';
  colorName: string;
  dominantColors: DominantColor[];
  occasion: Occasion[];
  priceInr: number;
  image: string;
};

export type Accessory = {
  id: string;
  kind: 'earrings' | 'necklace';
  name: string;
  metal: 'gold' | 'silver';
  dominantColors: DominantColor[];
  priceInr: number;
  image: string;
};

const c = colors as Record<string, DominantColor[]>;

export const OUTFITS: Outfit[] = [
  { id: 'kurta-mustard', kind: 'outfit', name: 'Mustard block-print kurta set', category: 'kurta-set', colorName: 'mustard', dominantColors: c['kurta-mustard'], occasion: ['diwali', 'office-ethnic'], priceInr: 2499, image: '/catalog/kurta-mustard.jpg' },
  { id: 'anarkali-emerald', kind: 'outfit', name: 'Emerald georgette anarkali', category: 'anarkali', colorName: 'emerald green', dominantColors: c['anarkali-emerald'], occasion: ['wedding-guest', 'sangeet', 'diwali'], priceInr: 5999, image: '/catalog/anarkali-emerald.jpg' },
  { id: 'lehenga-maroon', kind: 'outfit', name: 'Maroon velvet zari lehenga', category: 'lehenga', colorName: 'maroon', dominantColors: c['lehenga-maroon'], occasion: ['wedding-guest', 'sangeet'], priceInr: 14999, image: '/catalog/lehenga-maroon.jpg' },
  { id: 'saree-royal-blue', kind: 'outfit', name: 'Royal blue silk saree', category: 'saree', colorName: 'royal blue', dominantColors: c['saree-royal-blue'], occasion: ['wedding-guest', 'diwali', 'sangeet'], priceInr: 8999, image: '/catalog/saree-royal-blue.jpg' },
  { id: 'chikankari-beige', kind: 'outfit', name: 'Beige chikankari kurta set', category: 'kurta-set', colorName: 'beige', dominantColors: c['chikankari-beige'], occasion: ['office-ethnic', 'diwali', 'wedding-guest'], priceInr: 3299, image: '/catalog/chikankari-beige.jpg' },
];

export const ACCESSORIES: Accessory[] = [
  { id: 'jhumka-gold', kind: 'earrings', name: 'Gold pearl jhumkas', metal: 'gold', dominantColors: c['jhumka-gold'], priceInr: 1299, image: '/catalog/jhumka-gold.jpg' },
  { id: 'jhumka-silver', kind: 'earrings', name: 'Oxidised silver jhumkas', metal: 'silver', dominantColors: c['jhumka-silver'], priceInr: 899, image: '/catalog/jhumka-silver.jpg' },
  { id: 'necklace-kundan-gold', kind: 'necklace', name: 'Gold kundan choker', metal: 'gold', dominantColors: c['necklace-kundan-gold'], priceInr: 3499, image: '/catalog/necklace-kundan-gold.jpg' },
];

export const OCCASIONS: { id: Occasion; label: string }[] = [
  { id: 'wedding-guest', label: 'Wedding guest' },
  { id: 'diwali', label: 'Diwali' },
  { id: 'sangeet', label: 'Sangeet' },
  { id: 'office-ethnic', label: 'Office ethnic' },
];

export const outfitById = (id: string) => OUTFITS.find((o) => o.id === id);
export const accessoryById = (id: string) => ACCESSORIES.find((a) => a.id === id);
