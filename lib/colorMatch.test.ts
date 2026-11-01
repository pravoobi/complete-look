import { describe, expect, test } from 'vitest';
import { deltaE2000, hexToLab, labToHex } from './color';
import { explain, lipFor, metalFor, rankOutfits, toneProfile } from './colorMatch';
import { outfitById } from './catalog';
// Real YouCam Facial Color Tones Analyzer results recorded on Oct 22 (SPIKES.md, spike 4).
import ananya from '@/data/tones/ananya.json';
import meera from '@/data/tones/meera.json';
import deep from '@/data/tones/deep.json';

const ids = (t: { results: Parameters<typeof toneProfile>[0] }) => rankOutfits(toneProfile(t.results)).map((s) => s.outfit.id);

describe('colour maths', () => {
  test('CIEDE2000 matches the Sharma reference pair', () => {
    const d = deltaE2000({ L: 50, a: 2.6772, b: -79.7751 }, { L: 50, a: 0, b: -82.7485 });
    expect(d).toBeCloseTo(2.0425, 3);
  });
  test('hex -> Lab -> hex round trip', () => {
    for (const h of ['#b78565', '#141850', '#d5961b', '#ffffff']) expect(labToHex(hexToLab(h))).toBe(h);
  });
});

describe('tone profile', () => {
  test('depth bands from ITA sort the three sample shoppers', () => {
    expect(toneProfile(meera.results).depth).toBe('light');
    expect(toneProfile(ananya.results).depth).toBe('medium');
    expect(toneProfile(deep.results).depth).toBe('deep');
  });
});

describe('rankOutfits', () => {
  test('beige ranks last for the medium and light shoppers (wash-out)', () => {
    expect(ids(ananya).at(-1)).toBe('chikankari-beige');
    expect(ids(meera).at(-1)).toBe('chikankari-beige');
  });
  test('the deep shopper gets lighter, brighter colours on top', () => {
    expect(ids(deep).slice(0, 2)).toEqual(['kurta-mustard', 'chikankari-beige']);
  });
  test('the same catalog ranks differently for different depths', () => {
    expect(ids(ananya)[0]).not.toBe(ids(deep)[0]);
  });
  test('occasion filter', () => {
    const r = rankOutfits(toneProfile(ananya.results), 'office-ethnic');
    expect(r.every((s) => s.outfit.occasion.includes('office-ethnic'))).toBe(true);
  });
});

describe('explain', () => {
  test('never says warm or cool, and never comments on skin beyond contrast', () => {
    for (const t of [ananya, meera, deep])
      for (const s of rankOutfits(toneProfile(t.results))) expect(explain(s)).not.toMatch(/warm|cool|undertone|flatter|beautiful/i);
  });
  test('top pick reads as standing out; beige for Meera reads as blending in', () => {
    const [top] = rankOutfits(toneProfile(ananya.results));
    expect(explain(top)).toMatch(/stands out/);
    const beige = rankOutfits(toneProfile(meera.results)).at(-1)!;
    expect(explain(beige)).toMatch(/blend in/);
  });
});

describe('makeup and metal', () => {
  test('lip colour stays near the shopper own lip and in the red family', () => {
    const p = toneProfile(ananya.results);
    for (const id of ['saree-royal-blue', 'anarkali-emerald', 'kurta-mustard']) {
      const lip = hexToLab(lipFor(p, outfitById(id)!));
      expect(deltaE2000(lip, hexToLab(p.lipHex))).toBeLessThan(20);
      expect(lip.a).toBeGreaterThan(15);
    }
  });
  test('blue gets silver, maroon and mustard get gold', () => {
    expect(metalFor(outfitById('saree-royal-blue')!)).toBe('silver');
    expect(metalFor(outfitById('lehenga-maroon')!)).toBe('gold');
    expect(metalFor(outfitById('kurta-mustard')!)).toBe('gold');
  });
});
