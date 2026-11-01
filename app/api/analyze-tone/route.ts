// POST {photo: dataURL, occasion?} -> real YouCam colour tone analysis, then deterministic ranking.
import { OCCASIONS, type Occasion } from '@/lib/catalog';
import { explain, rankOutfits, toneProfile, type YouCamTone } from '@/lib/colorMatch';
import { canSpend, recordSpend, visitorKey } from '@/lib/guard';
import { cacheGet, cacheSet, decodeDataUrl, hash } from '@/lib/live';
import { FEATURES, friendlyError, runStep } from '@/lib/youcam/client';

export const maxDuration = 60;

type ToneHit = { results: YouCamTone; taskId: string; ms: number };

export async function POST(req: Request) {
  let photo, occasion: Occasion | undefined;
  try {
    const body = await req.json();
    photo = decodeDataUrl(body.photo);
    occasion = OCCASIONS.some((o) => o.id === body.occasion) ? body.occasion : undefined;
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'bad request' }, { status: 400 });
  }

  const key = 'tone:' + hash(photo.bytes);
  let hit = cacheGet<ToneHit>(key);
  const cached = !!hit;
  if (!hit) {
    const visitor = visitorKey(req);
    const guard = canSpend(visitor, FEATURES.tone.units);
    if (!guard.ok) return Response.json({ error: guard.message, limit: guard.reason }, { status: 429 });
    try {
      const step = await runStep('tone', photo, null);
      recordSpend(visitor, step.units);
      hit = { results: step.results as YouCamTone, taskId: step.taskId, ms: step.ms };
    } catch (e) {
      console.error('[youcam] tone failed', e);
      return Response.json({ error: friendlyError(e) }, { status: 502 });
    }
    const q = hit.results.face_quality as Record<string, unknown> | undefined;
    if (q && q.has_face === false)
      return Response.json({ error: "We couldn't find a face. Use a front-facing photo in even light, with your face and shoulders in frame." }, { status: 422 });
    cacheSet(key, hit);
  }

  const profile = toneProfile(hit.results);
  const quality = hit.results.face_quality as Record<string, string> | undefined;
  const warnings = quality ? Object.entries(quality).filter(([k, v]) => k !== 'has_face' && typeof v === 'string' && v !== 'good').map(([k]) => k) : [];
  return Response.json({
    tone: { taskId: hit.taskId, ms: cached ? 0 : hit.ms, units: FEATURES.tone.units, cached },
    profile: { depth: profile.depth, ita: profile.ita, skinHex: profile.skinHex, lipHex: profile.lipHex },
    ranking: rankOutfits(profile, occasion).map((r) => ({ outfitId: r.outfit.id, score: r.score, reasons: r.reasons, text: explain(r) })),
    warnings,
  });
}
