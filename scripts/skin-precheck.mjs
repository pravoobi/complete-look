// Free pre-check before a 20-unit tone run: average two cheek patches and print CIELAB.
// Assumes a centred, front-facing head-and-shoulders portrait (like our sample shoppers).
// Usage: node scripts/skin-precheck.mjs <img> [<img>...]
import sharp from 'sharp';

const PATCHES = [[0.40, 0.47], [0.60, 0.47]]; // left and right cheek, as fractions of width/height
const SIZE = 0.03; // patch side, as a fraction of width

function lab([r, g, b]) {
  const lin = [r, g, b].map((v) => v / 255).map((v) => (v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92));
  const X = (lin[0] * 0.4124 + lin[1] * 0.3576 + lin[2] * 0.1805) / 0.95047;
  const Y = lin[0] * 0.2126 + lin[1] * 0.7152 + lin[2] * 0.0722;
  const Z = (lin[0] * 0.0193 + lin[1] * 0.1192 + lin[2] * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const L = 116 * f(Y) - 16, a = 500 * (f(X) - f(Y)), bb = 200 * (f(Y) - f(Z));
  const deg = (x) => (x * 180) / Math.PI;
  return { L: +L.toFixed(1), a: +a.toFixed(1), b: +bb.toFixed(1), hue: +deg(Math.atan2(bb, a)).toFixed(1), ITA: +deg(Math.atan((L - 50) / bb)).toFixed(1) };
}

for (const file of process.argv.slice(2)) {
  const img = sharp(file).removeAlpha();
  const { width, height } = await img.metadata();
  const side = Math.round(width * SIZE);
  const sums = [0, 0, 0];
  let n = 0;
  for (const [fx, fy] of PATCHES) {
    const { data } = await sharp(file).removeAlpha()
      .extract({ left: Math.round(width * fx - side / 2), top: Math.round(height * fy - side / 2), width: side, height: side })
      .raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 3) { sums[0] += data[i]; sums[1] += data[i + 1]; sums[2] += data[i + 2]; n++; }
  }
  const rgb = sums.map((s) => Math.round(s / n));
  const hex = '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
  console.log(file, hex, JSON.stringify(lab(rgb)));
}
