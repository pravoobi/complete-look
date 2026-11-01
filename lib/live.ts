// Server helpers for live mode: input validation, result caching and safe image fetching.
import { createHash } from 'node:crypto';
import { fetchImage, type Image } from './youcam/client';

export const MAX_BYTES = 4 * 1024 * 1024; // the browser resizes to about 1280 px first; Vercel's body limit is 4.5 MB

export const hash = (...parts: (Uint8Array | string)[]) => {
  const h = createHash('sha256');
  for (const p of parts) h.update(p);
  return h.digest('hex').slice(0, 32);
};

/** In-memory cache of successful results (per server instance). Identical requests are lookups, not calls. */
const cache = new Map<string, unknown>();
export const cacheGet = <T>(key: string) => cache.get(key) as T | undefined;
export const cacheSet = (key: string, value: unknown) => {
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  cache.set(key, value);
};

/** Previous-layer images must come from YouCam's result storage; nothing else is fetched (no SSRF). */
const RESULT_HOSTS = [/\.amazonaws\.com$/, /(^|\.)makeupar\.com$/, /(^|\.)perfectcorp\.com$/];
export async function fetchResultImage(url: string): Promise<Image> {
  const u = new URL(url);
  if (u.protocol !== 'https:' || !RESULT_HOSTS.some((r) => r.test(u.hostname))) throw new Error('src must be a YouCam result URL');
  return fetchImage(url);
}

export function decodeDataUrl(dataUrl: string): Image {
  const m = /^data:(image\/(?:jpeg|png));base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error('photo must be a JPEG or PNG data URL');
  const bytes = new Uint8Array(Buffer.from(m[2], 'base64'));
  if (bytes.byteLength > MAX_BYTES) throw new Error('photo too large');
  return { bytes, contentType: m[1] };
}

/** Product images are our own static catalog files, fetched from this deployment. */
export async function productImage(origin: string, path: string): Promise<Image> {
  if (!/^\/catalog\/[a-z0-9-]+\.jpg$/.test(path)) throw new Error('bad product path');
  const res = await fetch(new URL(path, origin));
  if (!res.ok) throw new Error(`product image ${res.status}`);
  return { bytes: new Uint8Array(await res.arrayBuffer()), contentType: 'image/jpeg' };
}
