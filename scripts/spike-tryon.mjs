// Spikes 2 and 3: one try-on task (clothes, scarf, earrings, necklace, makeup). Spends units.
// Usage: node --env-file=.env.local scripts/spike-tryon.mjs <feature> <src.png> <ref.png|-> '<extra json>' <out-name> --spend
//   feature: cloth-v4 | scarf | 2d-vto/earring | 2d-vto/necklace | makeup-vto
// Uploads src (and ref) via the File API, creates the task with {src_file_id, ref_file_id, ...extra},
// polls, and saves the raw log plus the result image to spikes-out/ (gitignored: signed URLs).
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { basename, extname } from 'node:path';

const BASE = process.env.YOUCAM_API_BASE ?? 'https://yce-api-01.makeupar.com';
const auth = { Authorization: `Bearer ${process.env.YOUCAM_API_KEY}` };
const [feature, src, ref, extraJson = '{}', name, flag] = process.argv.slice(2);
if (!feature || !src || !name || flag !== '--spend') {
  console.error("Usage: spike-tryon.mjs <feature> <src> <ref|-> '<extra json>' <out-name> --spend");
  process.exit(1);
}

const log = { feature, src: basename(src), ref: ref === '-' ? null : basename(ref), startedAt: new Date().toISOString(), steps: [] };
const t0 = Date.now();

async function call(label, url, init) {
  const started = Date.now();
  const res = await fetch(url, init);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  log.steps.push({ label, status: res.status, ms: Date.now() - started, body });
  if (!res.ok) throw new Error(`${label} failed: ${res.status} ${text.slice(0, 300)}`);
  return body;
}

async function upload(path) {
  const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' }[extname(path).toLowerCase()];
  if (!mime) throw new Error('JPEG or PNG only');
  const file = await call('file', `${BASE}/s2s/v2.0/file/${feature}`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: [{ content_type: mime, file_name: basename(path).replace(/\s+/g, '-'), file_size: statSync(path).size }] }),
  });
  const { file_id, requests } = file.data.files[0];
  const put = requests[0];
  const up = await fetch(put.url, { method: put.method, headers: put.headers, body: readFileSync(path) });
  log.steps.push({ label: 'upload', status: up.status });
  if (!up.ok) throw new Error(`upload failed: ${up.status}`);
  return file_id;
}

// First http(s) URL anywhere in the result, so we don't have to know the result shape yet.
function findUrl(v) {
  if (typeof v === 'string') return /^https?:\/\//.test(v) ? v : null;
  if (v && typeof v === 'object') for (const x of Object.values(v)) { const u = findUrl(x); if (u) return u; }
  return null;
}

try {
  const srcId = await upload(src);
  const refId = ref === '-' ? null : await upload(ref);
  const extra = JSON.parse(extraJson);
  let payload;
  if (feature.startsWith('2d-vto/')) {
    // Jewellery: one object per placement; extra.objects holds each object's parameter block.
    const objects = extra.objects ?? [{}];
    payload = {
      source_info: { name: srcId },
      object_infos: objects.map((parameter) => ({ name: refId, parameter })),
      src_file_id: srcId,
      ref_file_ids: [refId],
    };
  } else {
    payload = { src_file_id: srcId, ...extra };
    if (refId) payload.ref_file_id = refId;
  }
  log.payload = payload;
  const task = await call('task', `${BASE}/s2s/v2.0/task/${feature}`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const taskId = task.data?.task_id;
  if (!taskId) throw new Error('no task_id in response');

  let delay = 1000, result;
  while (Date.now() - t0 < 180_000) {
    await new Promise((r) => setTimeout(r, delay));
    const poll = await call('poll', `${BASE}/s2s/v2.0/task/${feature}/${encodeURIComponent(taskId)}`, { headers: auth });
    const status = poll.data?.task_status;
    if (status === 'success' || status === 'error') { result = poll; break; }
    delay = Math.min(delay + 1000, 5000);
  }
  log.totalMs = Date.now() - t0;
  log.result = result ?? 'timeout';
  console.log('status:', result?.data?.task_status ?? 'timeout', '| total ms:', log.totalMs);
  if (result?.data?.task_status === 'error') console.log('error:', JSON.stringify(result.data.error));
  const url = result?.data?.task_status === 'success' && findUrl(result.data.results);
  if (url) {
    const img = await fetch(url);
    const ext = (img.headers.get('content-type') ?? '').includes('png') ? 'png' : 'jpg';
    writeFileSync(`spikes-out/${name}.${ext}`, Buffer.from(await img.arrayBuffer()));
    console.log('image', `spikes-out/${name}.${ext}`);
  }
} catch (e) {
  log.error = String(e);
  console.error(e.message);
} finally {
  writeFileSync(`spikes-out/${name}.json`, JSON.stringify(log, null, 2));
  console.log('saved', `spikes-out/${name}.json`);
}
