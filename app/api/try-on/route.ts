// POST {kind, photo?: dataURL, srcUrl?: previous YouCam result, itemId?, lipHex?} -> one real YouCam try-on.
// The browser chains layers by passing the previous result URL; the server re-uploads it to YouCam.
import { accessoryById, outfitById } from '@/lib/catalog';
import { canSpend, recordSpend, visitorKey } from '@/lib/guard';
import { cacheGet, cacheSet, decodeDataUrl, fetchResultImage, hash, productImage } from '@/lib/live';
import { FEATURES, friendlyError, resultUrl, runStep, type Feature, type Image } from '@/lib/youcam/client';

export const maxDuration = 90;

const KINDS = ['outfit', 'earrings', 'necklace', 'lip'] as const;

export async function POST(req: Request) {
  let kind: Feature, src: Image, productPath: string | null = null, lipHex: string | undefined, itemId: string | undefined;
  try {
    const body = await req.json();
    if (!KINDS.includes(body.kind)) throw new Error('unknown kind');
    kind = body.kind;
    itemId = body.itemId;
    if (kind === 'lip') {
      if (!/^#[0-9a-f]{6}$/i.test(body.lipHex ?? '')) throw new Error('lipHex must be #rrggbb');
      lipHex = body.lipHex;
    } else {
      const item = kind === 'outfit' ? outfitById(body.itemId) : accessoryById(body.itemId);
      if (!item || (kind !== 'outfit' && item.kind !== kind)) throw new Error('unknown item');
      productPath = item.image;
    }
    src = body.srcUrl ? await fetchResultImage(body.srcUrl) : decodeDataUrl(body.photo);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'bad request' }, { status: 400 });
  }

  const key = 'tryon:' + hash(kind, src.bytes, itemId ?? '', lipHex ?? '');
  const hit = cacheGet<{ image: string; step: object }>(key);
  if (hit) return Response.json({ ...hit, step: { ...hit.step, cached: true } });

  const visitor = visitorKey(req);
  const guard = canSpend(visitor, FEATURES[kind].units);
  if (!guard.ok) return Response.json({ error: guard.message, limit: guard.reason }, { status: 429 });

  try {
    const ref = productPath ? await productImage(new URL(req.url).origin, productPath) : null;
    const { results, ...step } = await runStep(kind, src, ref, { lipHex });
    recordSpend(visitor, step.units);
    const image = resultUrl(results);
    if (!image) throw new Error('no result image');
    const out = { image, step };
    cacheSet(key, out);
    return Response.json(out);
  } catch (e) {
    console.error(`[youcam] ${kind} failed`, e);
    return Response.json({ error: friendlyError(e) }, { status: 502 });
  }
}
