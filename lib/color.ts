// sRGB <-> CIELAB (D65), LCh, ITA and CIEDE2000. Plain maths, no dependencies.

export type Lab = { L: number; a: number; b: number };

const toLinear = (v: number) => (v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92);
const fromLinear = (v: number) => (v > 0.0031308 ? 1.055 * v ** (1 / 2.4) - 0.055 : 12.92 * v);
const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
const fInv = (t: number) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787);
const deg = (r: number) => (r * 180) / Math.PI;
const rad = (d: number) => (d * Math.PI) / 180;

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error(`bad hex ${hex}`);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

export function rgbToHex(rgb: number[]): string {
  return '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

export function hexToLab(hex: string): Lab {
  const [r, g, b] = hexToRgb(hex).map((v) => toLinear(v / 255));
  const X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const Y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  return { L: 116 * f(Y) - 16, a: 500 * (f(X) - f(Y)), b: 200 * (f(Y) - f(Z)) };
}

export function labToHex({ L, a, b }: Lab): string {
  const fy = (L + 16) / 116;
  const X = fInv(fy + a / 500) * 0.95047;
  const Y = fInv(fy);
  const Z = fInv(fy - b / 200) * 1.08883;
  const r = X * 3.2406 + Y * -1.5372 + Z * -0.4986;
  const g = X * -0.9689 + Y * 1.8758 + Z * 0.0415;
  const bl = X * 0.0557 + Y * -0.204 + Z * 1.057;
  return rgbToHex([r, g, bl].map((v) => fromLinear(Math.max(0, Math.min(1, v))) * 255));
}

export const chroma = ({ a, b }: Lab) => Math.hypot(a, b);
export const hue = ({ a, b }: Lab) => (deg(Math.atan2(b, a)) + 360) % 360;
export const fromLCh = (L: number, C: number, h: number): Lab => ({ L, a: C * Math.cos(rad(h)), b: C * Math.sin(rad(h)) });

/** Individual Typology Angle: the standard skin-depth measure (higher = lighter). */
export const ita = ({ L, b }: Lab) => deg(Math.atan2(L - 50, b));

/** CIEDE2000 colour difference (Sharma et al. 2005). About 2 is just noticeable; 15+ is clearly different. */
export function deltaE2000(x: Lab, y: Lab): number {
  const C1 = chroma(x), C2 = chroma(y);
  const Cbar = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25 ** 7)));
  const a1 = x.a * (1 + G), a2 = y.a * (1 + G);
  const c1 = Math.hypot(a1, x.b), c2 = Math.hypot(a2, y.b);
  const h1 = c1 === 0 ? 0 : (deg(Math.atan2(x.b, a1)) + 360) % 360;
  const h2 = c2 === 0 ? 0 : (deg(Math.atan2(y.b, a2)) + 360) % 360;
  const dL = y.L - x.L, dC = c2 - c1;
  let dh = 0;
  if (c1 * c2 !== 0) dh = Math.abs(h2 - h1) <= 180 ? h2 - h1 : h2 - h1 > 180 ? h2 - h1 - 360 : h2 - h1 + 360;
  const dH = 2 * Math.sqrt(c1 * c2) * Math.sin(rad(dh / 2));
  const Lbar = (x.L + y.L) / 2, cbar = (c1 + c2) / 2;
  let hbar = h1 + h2;
  if (c1 * c2 !== 0) hbar = Math.abs(h1 - h2) <= 180 ? (h1 + h2) / 2 : h1 + h2 < 360 ? (h1 + h2 + 360) / 2 : (h1 + h2 - 360) / 2;
  const T = 1 - 0.17 * Math.cos(rad(hbar - 30)) + 0.24 * Math.cos(rad(2 * hbar)) + 0.32 * Math.cos(rad(3 * hbar + 6)) - 0.2 * Math.cos(rad(4 * hbar - 63));
  const SL = 1 + (0.015 * (Lbar - 50) ** 2) / Math.sqrt(20 + (Lbar - 50) ** 2);
  const SC = 1 + 0.045 * cbar, SH = 1 + 0.015 * cbar * T;
  const RT = -2 * Math.sqrt(cbar ** 7 / (cbar ** 7 + 25 ** 7)) * Math.sin(rad(60 * Math.exp(-(((hbar - 275) / 25) ** 2))));
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
}
