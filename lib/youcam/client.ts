// One typed client for every YouCam call (SPIKES.md has the verified shapes). Server-side only:
// it reads YOUCAM_API_KEY, which must never reach the browser.

export type Feature = 'tone' | 'outfit' | 'earrings' | 'necklace' | 'lip';

export const FEATURES: Record<Feature, { path: string; name: string; units: number }> = {
  tone: { path: 'skin-tone-analysis', name: 'AI Facial Color Tones Analyzer', units: 20 },
  outfit: { path: 'cloth-v4', name: 'AI Clothes Virtual Try-On', units: 2 },
  earrings: { path: '2d-vto/earring', name: 'AI Earrings Virtual Try-On', units: 2 }, // a pair: one object per ear
  necklace: { path: '2d-vto/necklace', name: 'AI Necklace Virtual Try-On', units: 1 },
  lip: { path: 'makeup-vto', name: 'AI Makeup Virtual Try-On', units: 1 },
};

export class YouCamError extends Error {
  constructor(message: string, readonly code: string, readonly status?: number) {
    super(message);
  }
}

/** Friendly messages for the shopper; the raw code stays in the log. */
export function friendlyError(e: unknown): string {
  const code = e instanceof YouCamError ? e.code : '';
  if (/face|detect/i.test(code)) return "We couldn't find a clear face. Try a front-facing photo in even light, with your face filling about a third of the frame.";
  if (/size|resolution|format/i.test(code)) return 'That photo is too large or in an unsupported format. Use a JPEG or PNG under 10 MB.';
  if (/timeout/i.test(code)) return 'YouCam took too long to answer. Please try again in a minute.';
  if (/unit|credit|quota/i.test(code)) return 'The demo has used its try-on budget for now. The sample shoppers still work.';
  return 'Something went wrong on this step. Your earlier steps are kept, so you can try again.';
}

const base = () => process.env.YOUCAM_API_BASE ?? 'https://yce-api-01.makeupar.com';
function auth() {
  const key = process.env.YOUCAM_API_KEY;
  if (!key) throw new YouCamError('YOUCAM_API_KEY is not set', 'config');
  return { Authorization: `Bearer ${key}` };
}

async function json(url: string, init: RequestInit, label: string) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, init);
    const text = await res.text();
    let body: any;
    try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 300) }; }
    if (res.ok) return body;
    // Retry once on rate limits and server errors; never on 4xx request errors.
    if (attempt === 0 && (res.status === 429 || res.status >= 500)) { await sleep(1500); continue; }
    throw new YouCamError(`${label} failed (${res.status})`, String(body?.error_code ?? body?.error ?? body?.message ?? res.status), res.status);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function uploadFile(feature: Feature, bytes: Uint8Array, contentType: string, fileName = 'photo.jpg'): Promise<string> {
  const body = await json(`${base()}/s2s/v2.0/file/${FEATURES[feature].path}`, {
    method: 'POST',
    headers: { ...auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: [{ content_type: contentType, file_name: fileName, file_size: bytes.byteLength }] }),
  }, 'file');
  const { file_id, requests } = body.data.files[0];
  const put = requests[0];
  const up = await fetch(put.url, { method: put.method, headers: put.headers, body: bytes as BodyInit });
  if (!up.ok) throw new YouCamError(`upload failed (${up.status})`, 'upload', up.status);
  return file_id;
}

export async function createTask(feature: Feature, payload: object): Promise<string> {
  const body = await json(`${base()}/s2s/v2.0/task/${FEATURES[feature].path}`, {
    method: 'POST',
    headers: { ...auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, 'task');
  const id = body?.data?.task_id;
  if (!id) throw new YouCamError('no task_id in response', 'task');
  return id;
}

/** Poll server-side with backoff (1 s, 2 s ... 5 s) until success, error or timeout. */
export async function waitForTask(feature: Feature, taskId: string, timeoutMs = 120_000): Promise<any> {
  const started = Date.now();
  let delay = 1000;
  while (Date.now() - started < timeoutMs) {
    await sleep(delay);
    const body = await json(`${base()}/s2s/v2.0/task/${FEATURES[feature].path}/${encodeURIComponent(taskId)}`, { headers: auth() }, 'poll');
    const status = body?.data?.task_status;
    if (status === 'success') return body.data.results;
    if (status === 'error') throw new YouCamError('task failed', String(body.data.error ?? 'task_error'));
    delay = Math.min(delay + 1000, 5000);
  }
  throw new YouCamError('task timed out', 'timeout');
}

/** First http(s) URL in a result: try-on results hold one image URL. */
export function resultUrl(results: unknown): string | null {
  if (typeof results === 'string') return /^https?:\/\//.test(results) ? results : null;
  if (results && typeof results === 'object') for (const v of Object.values(results)) { const u = resultUrl(v); if (u) return u; }
  return null;
}

export type Image = { bytes: Uint8Array; contentType: string };

/** Request body per feature. Only ids and plain options go in; the X-ray shows exactly this. */
export function buildPayload(feature: Feature, srcId: string, refId: string | null, opts: { lipHex?: string } = {}): object {
  switch (feature) {
    case 'tone': return { src_file_id: srcId };
    case 'outfit': return { src_file_id: srcId, ref_file_id: refId, garment_category: 'full_body' };
    case 'earrings': return {
      source_info: { name: srcId },
      object_infos: [true, false].map((right) => ({ name: refId, parameter: { earring_is_right_ear: right } })),
      src_file_id: srcId, ref_file_ids: [refId],
    };
    case 'necklace': return { source_info: { name: srcId }, object_infos: [{ name: refId }], src_file_id: srcId, ref_file_ids: [refId] };
    case 'lip': return {
      src_file_id: srcId,
      version: '1.0',
      effects: [{
        category: 'lip_color', shape: { name: 'original' }, style: { type: 'full' }, morphology: { fullness: 0, wrinkless: 0 },
        palettes: [{ color: opts.lipHex, colorIntensity: 60, texture: 'matte' }],
      }],
    };
  }
}

export type StepLog = {
  feature: Feature;
  featureName: string;
  taskId: string;
  ms: number;
  units: number;
  params: object;
  results: unknown;
};

/** Upload, create, wait: one complete YouCam step, timed and accounted. */
export async function runStep(feature: Feature, src: Image, ref: Image | null, opts: { lipHex?: string } = {}): Promise<StepLog> {
  const t0 = Date.now();
  const srcId = await uploadFile(feature, src.bytes, src.contentType);
  const refId = ref ? await uploadFile(feature, ref.bytes, ref.contentType, 'product.jpg') : null;
  const payload = buildPayload(feature, srcId, refId, opts);
  const taskId = await createTask(feature, payload);
  const results = await waitForTask(feature, taskId);
  return {
    feature, featureName: FEATURES[feature].name, taskId, ms: Date.now() - t0, units: FEATURES[feature].units,
    params: redactIds(payload), results,
  };
}

/** File ids are opaque and short-lived; show them as placeholders in the X-ray. */
export function redactIds(p: object): object {
  const s = JSON.stringify(p);
  const ids = new Map<string, string>();
  const walk = (v: any, key = ''): void => {
    if (typeof v === 'string' && /file_id$|^name$/.test(key)) ids.set(v, key.startsWith('src') ? '<your photo>' : '<product image>');
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, Array.isArray(v) ? key.replace(/s$/, '') : k);
  };
  walk(p);
  // source_info.name is the photo, object_infos[].name the product; fix the photo id's label.
  const src = (p as any).src_file_id;
  if (src) ids.set(src, '<your photo>');
  let out = s;
  for (const [id, label] of ids) out = out.split(JSON.stringify(id)).join(JSON.stringify(label));
  return JSON.parse(out);
}

export async function fetchImage(url: string): Promise<Image> {
  const res = await fetch(url);
  if (!res.ok) throw new YouCamError(`result download failed (${res.status})`, 'download', res.status);
  return { bytes: new Uint8Array(await res.arrayBuffer()), contentType: res.headers.get('content-type') ?? 'image/jpeg' };
}
