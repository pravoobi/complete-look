// One shape for a look, whether replayed from a recorded sample or built live.
import type { Occasion } from './catalog';
import type { Depth, Reason } from './colorMatch';
import type { Feature } from './youcam/client';

export type StepRecord = {
  feature: Feature;
  featureName: string;
  taskId: string;
  ms: number;
  units: number;
  params: object;
  cached?: boolean;
};

export type RankedOutfit = { outfitId: string; score: number; reasons: Reason[]; text: string };

export type Stylist = {
  model: string;
  summary: string;
  picks: { outfitId: string; why: string }[];
  toolCalls: { name: string; input: unknown; ms: number }[];
  fallback?: boolean;
};

export type Look = {
  id: string;
  name: string;
  occasion: Occasion;
  aiGenerated: boolean;
  photo: string;
  recordedAt?: string;
  tone: { taskId: string; ms: number; units: number; cached?: boolean };
  profile: { depth: Depth; ita: number; skinHex: string; lipHex: string };
  ranking: RankedOutfit[];
  stylist?: Stylist;
  outfits: { outfitId: string; image: string; step: StepRecord }[];
  layers: { kind: 'earrings' | 'necklace' | 'lip'; itemId?: string; lipHex?: string; image: string; step: StepRecord }[];
  v0?: { outfitId: string; image: string; step: StepRecord; note: string };
};

export const DEPTH_LABEL: Record<Depth, string> = { light: 'Light', medium: 'Medium', deep: 'Deep' };

export function lookUnits(l: Look) {
  const steps = [...l.outfits.map((o) => o.step), ...l.layers.map((x) => x.step)];
  const spent = steps.filter((s) => !s.cached).reduce((n, s) => n + s.units, 0) + (l.tone.cached ? 0 : l.tone.units);
  const saved = steps.filter((s) => s.cached).reduce((n, s) => n + s.units, 0) + (l.tone.cached ? l.tone.units : 0);
  const ms = steps.reduce((n, s) => n + s.ms, 0) + l.tone.ms;
  return { spent, saved, total: spent + saved, ms };
}
