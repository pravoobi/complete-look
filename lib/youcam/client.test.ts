import { describe, expect, test } from 'vitest';
import { buildPayload, redactIds, resultUrl } from './client';

describe('youcam client (no network)', () => {
  test('earrings payload places a pair, one object per ear', () => {
    const p = buildPayload('earrings', 'SRC', 'REF') as any;
    expect(p.object_infos.map((o: any) => o.parameter.earring_is_right_ear)).toEqual([true, false]);
    expect(p.source_info.name).toBe('SRC');
    expect(p.ref_file_ids).toEqual(['REF']);
  });
  test('lip payload carries the chosen hex', () => {
    const p = buildPayload('lip', 'SRC', null, { lipHex: '#9a2b3c' }) as any;
    expect(p.effects[0].palettes[0].color).toBe('#9a2b3c');
    expect(p.src_file_id).toBe('SRC'); // missing once: YouCam answers 400 InvalidParameters
  });
  test('outfit payload is full_body', () => {
    expect(buildPayload('outfit', 'S', 'R')).toEqual({ src_file_id: 'S', ref_file_id: 'R', garment_category: 'full_body' });
  });
  test('redactIds hides file ids in what the X-ray shows', () => {
    const shown = JSON.stringify(redactIds(buildPayload('necklace', 'SRC123', 'REF456')));
    expect(shown).not.toMatch(/SRC123|REF456/);
    expect(shown).toMatch(/your photo/);
    expect(shown).toMatch(/product image/);
  });
  test('resultUrl finds the image URL in a recorded result', () => {
    expect(resultUrl({ url: 'https://x/y.jpg' })).toBe('https://x/y.jpg');
    expect(resultUrl([{ data: { url: 'https://a/b' } }])).toBe('https://a/b');
    expect(resultUrl({ color: { skin_color: '#fff' } })).toBeNull();
  });
});
