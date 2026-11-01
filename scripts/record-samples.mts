// Record the sample shoppers once with real YouCam calls, then replay them forever.
// Tone results are the real analyzer runs from Oct 22 (data/tones), so this spends try-on units only:
// 2 outfits (2 + 2) + earrings (2) + necklace (1) + lip (1) = 8 units per shopper, plus 2 for Ananya's v0.
// Usage: npx tsx --env-file=.env.local scripts/record-samples.mts <shopperId|all> --spend
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { accessoriesFor, explain, lipFor, rankOutfits, toneProfile } from '../lib/colorMatch';
import { outfitById, type Occasion } from '../lib/catalog';
import { runStylist } from '../lib/stylist';
import { fetchImage, resultUrl, runStep, type Feature, type Image, type StepLog } from '../lib/youcam/client';

type Shopper = { id: string; name: string; occasion: Occasion; photo: string; tone: string; v0?: string };
const SHOPPERS: Shopper[] = [
  { id: 'ananya', name: 'Ananya', occasion: 'wedding-guest', photo: 'spikes-in/face-d.png', tone: 'data/tones/ananya.json', v0: 'chikankari-beige' },
  { id: 'meera', name: 'Meera', occasion: 'diwali', photo: 'spikes-in/face-e.png', tone: 'data/tones/meera.json' },
  { id: 'kavya', name: 'Kavya', occasion: 'office-ethnic', photo: 'spikes-in/face-h.png', tone: 'data/tones/deep.json' },
];
const CATALOG_SRC: Record<string, string> = {
  'kurta-mustard': 'garment-kurta-mustard.png', 'anarkali-emerald': 'garment-anarkali-emerald.png',
  'lehenga-maroon': 'garment-ornate-maroon.png', 'saree-royal-blue': 'garment-Saree-Royal Blue.png',
  'chikankari-beige': 'garment-Chikankari Outfit-Beige.png', 'jhumka-gold': 'jewel-Jhumka-gold.png',
  'jhumka-silver': 'jewel-Jhumka-Silver.png', 'necklace-kundan-gold': 'jewel-Necklace-Gold.png',
};

const [which, flag] = process.argv.slice(2);
if (!which || flag !== '--spend') { console.error('Usage: record-samples.mts <id|all> --spend'); process.exit(1); }

const file = (path: string): Image => ({ bytes: readFileSync(path), contentType: path.endsWith('.png') ? 'image/png' : 'image/jpeg' });
const product = (id: string) => file(`spikes-in/${CATALOG_SRC[id]}`);

async function save(img: Image, dir: string, name: string) {
  await sharp(img.bytes).resize({ width: 900, withoutEnlargement: true }).jpeg({ quality: 84 }).toFile(`public/samples/${dir}/${name}.jpg`);
  return `/samples/${dir}/${name}.jpg`;
}

// Cache every paid step by hash(feature, source bytes, product bytes, options): a rerun after a
// failure costs nothing for the steps that already succeeded.
const CACHE = 'spikes-out/cache';
mkdirSync(CACHE, { recursive: true });

async function step(feature: Feature, src: Image, ref: Image | null, opts = {}) {
  const key = createHash('sha256').update(feature).update(src.bytes).update(ref?.bytes ?? '').update(JSON.stringify(opts)).digest('hex').slice(0, 24);
  if (existsSync(`${CACHE}/${key}.json`)) {
    console.log(`  ${feature} ... cached`);
    return { log: JSON.parse(readFileSync(`${CACHE}/${key}.json`, 'utf8')), img: { bytes: readFileSync(`${CACHE}/${key}.img`), contentType: 'image/jpeg' } };
  }
  process.stdout.write(`  ${feature} ... `);
  const log = await runStep(feature, src, ref, opts);
  const url = resultUrl(log.results);
  if (!url) throw new Error(`${feature}: no result image`);
  const img = await fetchImage(url);
  console.log(`${(log.ms / 1000).toFixed(1)} s, ${log.units} units`);
  const { results: _drop, ...kept } = log; // signed URLs expire; we keep our own copy of the image
  writeFileSync(`${CACHE}/${key}.img`, img.bytes);
  writeFileSync(`${CACHE}/${key}.json`, JSON.stringify(kept));
  return { log: kept as Omit<StepLog, 'results'>, img };
}

for (const s of SHOPPERS.filter((x) => which === 'all' || x.id === which)) {
  console.log(`== ${s.name}`);
  mkdirSync(`public/samples/${s.id}`, { recursive: true });
  const tone = JSON.parse(readFileSync(s.tone, 'utf8'));
  const profile = toneProfile(tone.results);
  const ranking = rankOutfits(profile, s.occasion);
  const photo = file(s.photo);
  const photoUrl = await save(photo, s.id, 'photo');

  // The stylist agent (Claude over colorMatch) picks the 2 outfits to try, same as live mode.
  const rankingOut = ranking.map((r) => ({ outfitId: r.outfit.id, score: r.score, reasons: r.reasons, text: explain(r) }));
  const profileOut = { depth: profile.depth, ita: profile.ita, skinHex: profile.skinHex, lipHex: profile.lipHex };
  const stylist = await runStylist({ profile: profileOut, ranking: rankingOut, occasion: s.occasion });
  console.log(`  stylist (${stylist.model}${stylist.fallback ? ', fallback' : ''}): ${stylist.picks.map((p) => p.outfitId).join(', ')}`);

  const outfits = [];
  const fullRes: Image[] = []; // chain layers from the full-resolution result, not the 900 px copy
  for (const { outfitId } of stylist.picks) {
    const r = await step('outfit', photo, product(outfitId));
    outfits.push({ outfitId, image: await save(r.img, s.id, `outfit-${outfitId}`), step: r.log });
    fullRes.push(r.img);
  }

  // Accessories go on the top pick only (CLAUDE.md §5).
  const top = outfitById(stylist.picks[0].outfitId)!;
  const metal = accessoriesFor(top);
  const earrings = metal.find((a) => a.kind === 'earrings')!;
  const necklace = metal.find((a) => a.kind === 'necklace');
  const lipHex = lipFor(profile, top);
  const layers = [];
  let current = fullRes[0];
  for (const [feature, item] of [['earrings', earrings], ['necklace', necklace]] as const) {
    if (!item) continue;
    const r = await step(feature, current, product(item.id));
    layers.push({ kind: feature, itemId: item.id, image: await save(r.img, s.id, `layer-${feature}`), step: r.log });
    current = r.img;
  }
  const lip = await step('lip', current, null, { lipHex });
  layers.push({ kind: 'lip', lipHex, image: await save(lip.img, s.id, 'layer-lip'), step: lip.log });

  let v0;
  if (s.v0) {
    const r = await step('outfit', photo, product(s.v0));
    v0 = { outfitId: s.v0, image: await save(r.img, s.id, `outfit-${s.v0}`), step: r.log, note: 'Picked by category only (wedding-guest kurta set), no tone matching' };
  }

  const steps = [...outfits.map((o) => o.step), ...layers.map((l) => l.step), ...(v0 ? [v0.step] : [])];
  const sample = {
    id: s.id, name: s.name, occasion: s.occasion, aiGenerated: true, photo: photoUrl,
    recordedAt: new Date().toISOString(),
    tone: { taskId: tone.taskId, ms: tone.ms, units: tone.units, recordedAt: tone.source, results: tone.results },
    profile: profileOut,
    ranking: rankingOut,
    stylist,
    outfits, layers, v0,
    totals: { units: tone.units + steps.reduce((n, x) => n + x.units, 0), tryOnUnits: steps.reduce((n, x) => n + x.units, 0) },
  };
  mkdirSync('data/samples', { recursive: true });
  writeFileSync(`data/samples/${s.id}.json`, JSON.stringify(sample, null, 2) + '\n');
  console.log(`  saved data/samples/${s.id}.json (${sample.totals.tryOnUnits} try-on units)`);
}
