// Extract each catalog item's dominant colours from its product image (no hand-typed hex),
// and write a web-sized copy to public/catalog/. Free, local only.
// Usage: node scripts/prepare-catalog.mjs
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const ITEMS = {
  'kurta-mustard': 'garment-kurta-mustard.png',
  'anarkali-emerald': 'garment-anarkali-emerald.png',
  'lehenga-maroon': 'garment-ornate-maroon.png',
  'saree-royal-blue': 'garment-Saree-Royal Blue.png',
  'chikankari-beige': 'garment-Chikankari Outfit-Beige.png',
  'jhumka-gold': 'jewel-Jhumka-gold.png',
  'jhumka-silver': 'jewel-Jhumka-Silver.png',
  'necklace-kundan-gold': 'jewel-Necklace-Gold.png',
};
const K = 5;

function kmeans(px, k) {
  let centres = Array.from({ length: k }, (_, i) => px[Math.floor(((i + 0.5) * px.length) / k)]);
  let groups = [];
  for (let iter = 0; iter < 20; iter++) {
    groups = centres.map(() => []);
    for (const p of px) {
      let best = 0, bd = Infinity;
      centres.forEach((c, i) => { const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (d < bd) { bd = d; best = i; } });
      groups[best].push(p);
    }
    centres = groups.map((g, i) => (g.length ? [0, 1, 2].map((j) => g.reduce((s, p) => s + p[j], 0) / g.length) : centres[i]));
  }
  return centres.map((c, i) => ({ c, share: groups[i].length / px.length })).sort((a, b) => b.share - a.share);
}

// Merge clusters that are shades of the same colour (folds, shadows), so the fabric colour
// comes out as one entry instead of being split. Distance is Euclidean in CIELAB.
function lab([r, g, b]) {
  const lin = [r, g, b].map((v) => v / 255).map((v) => (v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92));
  const X = (lin[0] * 0.4124 + lin[1] * 0.3576 + lin[2] * 0.1805) / 0.95047;
  const Y = lin[0] * 0.2126 + lin[1] * 0.7152 + lin[2] * 0.0722;
  const Z = (lin[0] * 0.0193 + lin[1] * 0.1192 + lin[2] * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
function merge(clusters, maxDist = 26) {
  const cs = clusters.map((x) => ({ ...x }));
  for (let changed = true; changed; ) {
    changed = false;
    outer: for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
      const [a, b] = [lab(cs[i].c), lab(cs[j].c)];
      if (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < maxDist) {
        const s = cs[i].share + cs[j].share;
        cs[i] = { c: cs[i].c.map((v, k) => (v * cs[i].share + cs[j].c[k] * cs[j].share) / s), share: s };
        cs.splice(j, 1);
        changed = true;
        break outer;
      }
    }
  }
  return cs.sort((a, b) => b.share - a.share);
}

const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
mkdirSync('public/catalog', { recursive: true });
const out = {};
for (const [id, file] of Object.entries(ITEMS)) {
  const src = `spikes-in/${file}`;
  const { data } = await sharp(src).removeAlpha().resize(96, 96, { fit: 'inside' }).raw().toBuffer({ resolveWithObject: true });
  const px = [];
  for (let i = 0; i < data.length; i += 3) {
    const p = [data[i], data[i + 1], data[i + 2]];
    if (Math.min(...p) < 235) px.push(p); // drop the white studio background
  }
  out[id] = merge(kmeans(px, K)).filter((x) => x.share >= 0.08).map((x) => ({ hex: hex(x.c), share: +x.share.toFixed(2) }));
  await sharp(src).resize(800, 800, { fit: 'inside' }).flatten({ background: '#ffffff' }).jpeg({ quality: 82 }).toFile(`public/catalog/${id}.jpg`);
}
writeFileSync('data/catalog-colors.json', JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 1));
