// Deterministic colour matching built on depth and contrast: the things YouCam's
// Facial Color Tones Analyzer actually measures (SPIKES.md, spike 4). No warm/cool claims.
// Thresholds are styling heuristics, not science; they live here and are covered by tests.
import { chroma, deltaE2000, fromLCh, hexToLab, hue, ita, labToHex, type Lab } from './color';
import { ACCESSORIES, OUTFITS, type Accessory, type Occasion, type Outfit } from './catalog';

export const RULES = {
  /** ITA cut-offs for depth bands (light >= 30, medium 10..30, deep < 10). */
  depthLightMinIta: 30,
  depthMediumMinIta: 10,
  /** CIEDE2000 below this: the colour blends into the skin ("washed out"). */
  washoutDeltaE: 15,
  /** Between washout and this: a softer "low contrast" penalty. */
  lowContrastDeltaE: 25,
  /** Colours below this share of the garment are trim, not the garment colour. */
  minShare: 0.15,
} as const;

export type Depth = 'light' | 'medium' | 'deep';

/** Raw `data.results.color` / `face_quality` from AI-Facial-Color-Tones-Analyzer. */
export type YouCamTone = {
  color: { skin_color: string; lip_color: string; [k: string]: string };
  face_quality?: Record<string, unknown>;
};

export type ToneProfile = {
  skinHex: string;
  lipHex: string;
  skinLab: Lab;
  ita: number;
  depth: Depth;
};

export type Reason =
  | { rule: 'washes-out'; colour: string; deltaE: number }
  | { rule: 'low-contrast'; colour: string; deltaE: number }
  | { rule: 'stands-out'; colour: string; deltaE: number; lightness: 'lighter' | 'deeper' }
  | { rule: 'rich-colour'; colour: string; chroma: number };

export type ScoredOutfit = { outfit: Outfit; score: number; reasons: Reason[] };

export function toneProfile(tone: YouCamTone): ToneProfile {
  const skinHex = tone.color.skin_color, lipHex = tone.color.lip_color;
  const skinLab = hexToLab(skinHex);
  const angle = ita(skinLab);
  const depth: Depth = angle >= RULES.depthLightMinIta ? 'light' : angle >= RULES.depthMediumMinIta ? 'medium' : 'deep';
  return { skinHex, lipHex, skinLab, ita: +angle.toFixed(1), depth };
}

function scoreColour(hex: string, p: ToneProfile): { score: number; reasons: Reason[] } {
  const lab = hexToLab(hex);
  const dE = +deltaE2000(lab, p.skinLab).toFixed(1);
  const dL = lab.L - p.skinLab.L;
  const C = chroma(lab);
  if (dE < RULES.washoutDeltaE) return { score: -1, reasons: [{ rule: 'washes-out', colour: hex, deltaE: dE }] };

  const reasons: Reason[] = [];
  let score = 0;
  // Lightness contrast: light skin is set off by deeper colours, deep skin by lighter or brighter ones,
  // medium by a clear gap either way.
  const gap = p.depth === 'light' ? Math.max(0, -dL) : p.depth === 'deep' ? Math.max(0, dL) : Math.abs(dL);
  score += Math.min(gap, 40) / 40;
  if (dE < RULES.lowContrastDeltaE) {
    score -= 0.5;
    reasons.push({ rule: 'low-contrast', colour: hex, deltaE: dE });
  } else {
    reasons.push({ rule: 'stands-out', colour: hex, deltaE: dE, lightness: dL > 0 ? 'lighter' : 'deeper' });
  }
  // Chroma: saturated colours carry medium and deep skin; light skin gets a smaller bonus.
  const chromaWeight = p.depth === 'light' ? 0.3 : 0.6;
  score += chromaWeight * Math.min(C, 60) / 60;
  if (C >= 35) reasons.push({ rule: 'rich-colour', colour: hex, chroma: Math.round(C) });
  return { score, reasons };
}

export function scoreOutfit(outfit: Outfit, p: ToneProfile): ScoredOutfit {
  const main = outfit.dominantColors.filter((d) => d.share >= RULES.minShare);
  const total = main.reduce((s, d) => s + d.share, 0);
  let score = 0;
  const reasons: Reason[] = [];
  for (const d of main) {
    const r = scoreColour(d.hex, p);
    score += (d.share / total) * r.score;
    reasons.push(...r.reasons);
  }
  return { outfit, score: +score.toFixed(3), reasons };
}

export function rankOutfits(p: ToneProfile, occasion?: Occasion, outfits: Outfit[] = OUTFITS): ScoredOutfit[] {
  return outfits
    .filter((o) => !occasion || o.occasion.includes(occasion))
    .map((o) => scoreOutfit(o, p))
    .sort((a, b) => b.score - a.score);
}

/** Lip colour for the makeup layer: the shopper's own lip, hue nudged toward a shade that suits the outfit. */
export function lipFor(p: ToneProfile, outfit: Outfit): string {
  const lip = hexToLab(p.lipHex);
  const main = hexToLab(outfit.dominantColors[0].hex);
  const h = hue(main);
  // Keep lips in the red family: cool outfits (blue/purple) get a berry, greens a classic red,
  // warm outfits a brick/coral that echoes the garment.
  const target = h >= 200 && h < 340 ? 355 : h >= 100 && h < 200 ? 15 : Math.min(Math.max(h, 10), 40);
  const lh = hue(lip);
  const diff = ((target - lh + 540) % 360) - 180;
  const newHue = (lh + 0.6 * diff + 360) % 360;
  const newChroma = Math.max(chroma(lip), 38);
  return labToHex(fromLCh(Math.max(lip.L - 6, 20), newChroma, newHue));
}

/** Jewellery metal follows the outfit, not the skin: gold with warm hues and greens, silver with blues and purples. */
export function metalFor(outfit: Outfit): 'gold' | 'silver' {
  const h = hue(hexToLab(outfit.dominantColors[0].hex));
  return h >= 200 && h < 330 ? 'silver' : 'gold';
}

export function accessoriesFor(outfit: Outfit): Accessory[] {
  const metal = metalFor(outfit);
  return ACCESSORIES.filter((a) => a.metal === metal);
}

/** Template wording, used when the stylist agent is unavailable. Talks about colours only. */
export function explain(s: ScoredOutfit): string {
  // Word it from the main fabric colour; trim colours only nudge the score.
  const main = s.outfit.dominantColors[0].hex;
  const mine = s.reasons.filter((r) => r.colour === main);
  const bad = mine.find((r) => r.rule === 'washes-out' || r.rule === 'low-contrast');
  if (bad) return `The ${s.outfit.colorName} sits close to your skin tone, so it may blend in rather than stand out.`;
  const out = mine.find((r) => r.rule === 'stands-out');
  const rich = mine.some((r) => r.rule === 'rich-colour');
  const side = out && out.rule === 'stands-out' ? (out.lightness === 'deeper' ? 'deeper than' : 'lighter than') : 'different from';
  return `The ${s.outfit.colorName} is clearly ${side} your skin tone${rich ? ' and richly coloured' : ''}, so it stands out against it.`;
}
