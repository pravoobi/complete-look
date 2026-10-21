// Spike 4: Facial Color Tones Analyzer on one photo. Spends 20 units per run.
// Usage: node --env-file=.env.local scripts/spike-tone.mjs <photo.jpg> --spend
// Writes every raw response to spikes-out/tone-<name>.json (gitignored: may hold signed URLs).
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { basename, extname } from 'node:path';

const BASE = process.env.YOUCAM_API_BASE ?? 'https://yce-api-01.makeupar.com';
const FEATURE = 'skin-tone-analysis';
const auth = { Authorization: `Bearer ${process.env.YOUCAM_API_KEY}` };
const [photo, flag] = process.argv.slice(2);
if (!photo || flag !== '--spend') {
  console.error('Usage: spike-tone.mjs <photo> --spend   (costs 20 units)');
  process.exit(1);
}

const log = { photo: basename(photo), startedAt: new Date().toISOString(), steps: [] };
const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' }[extname(photo).toLowerCase()];
if (!mime) throw new Error('JPEG or PNG only');
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

try {
  // 1. File API -> file_id + presigned PUT
  const size = statSync(photo).size;
  const file = await call('file', `${BASE}/s2s/v2.0/file/${FEATURE}`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: [{ content_type: mime, file_name: basename(photo), file_size: size }] }),
  });
  const { file_id, requests } = file.data.files[0];
  const put = requests[0];
  const up = await fetch(put.url, { method: put.method, headers: put.headers, body: readFileSync(photo) });
  log.steps.push({ label: 'upload', status: up.status });
  if (!up.ok) throw new Error(`upload failed: ${up.status}`);

  // 2. Create task
  const task = await call('task', `${BASE}/s2s/v2.0/task/${FEATURE}`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ src_file_id: file_id }),
  });
  const taskId = task.data?.task_id;
  if (!taskId) throw new Error('no task_id in response');

  // 3. Poll with backoff, 120 s timeout
  let delay = 1000, result;
  while (Date.now() - t0 < 120_000) {
    await new Promise((r) => setTimeout(r, delay));
    const poll = await call('poll', `${BASE}/s2s/v2.0/task/${FEATURE}/${encodeURIComponent(taskId)}`, { headers: auth });
    const status = poll.data?.task_status;
    if (status === 'success' || status === 'error') { result = poll; break; }
    delay = Math.min(delay + 1000, 5000);
  }
  log.totalMs = Date.now() - t0;
  log.result = result ?? 'timeout';
  console.log('status:', result?.data?.task_status ?? 'timeout', '| total ms:', log.totalMs);
} catch (e) {
  log.error = String(e);
  console.error(e.message);
} finally {
  const out = `spikes-out/tone-${basename(photo, extname(photo))}.json`;
  writeFileSync(out, JSON.stringify(log, null, 2));
  console.log('saved', out);
}
