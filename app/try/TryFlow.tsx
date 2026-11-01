'use client';
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useRef, useState } from 'react';
import { LookView } from '@/components/LookView';
import type { StepId } from '@/components/StepRail';
import { OCCASIONS, outfitById, type Occasion } from '@/lib/catalog';
import { accessoriesFor, lipFor, toneProfile } from '@/lib/colorMatch';
import type { Look, StepRecord } from '@/lib/look';

/** Resize in the browser so uploads stay small (Vercel's body limit) and fast. */
async function toJpegDataUrl(file: File, max = 1280): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.9);
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error ?? `Request failed (${res.status})`), { limit: json.limit });
  return json as T;
}

type TryOn = { image: string; step: StepRecord };

export function TryFlow() {
  const [occasion, setOccasion] = useState<Occasion>('wedding-guest');
  const [photo, setPhoto] = useState<string | null>(null);
  const [look, setLook] = useState<Look | null>(null);
  const [running, setRunning] = useState<StepId | null>(null);
  const [error, setError] = useState<{ message: string; limit?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function choose(file: File | undefined) {
    if (!file) return;
    setError(null);
    setLook(null);
    try {
      setPhoto(await toJpegDataUrl(file));
    } catch {
      setError({ message: "We couldn't read that image. Try a JPEG or PNG photo." });
    }
  }

  async function build() {
    if (!photo) return;
    setError(null);
    let current: Look = {
      id: 'live', name: 'Your look', occasion, aiGenerated: false, photo,
      tone: { taskId: '', ms: 0, units: 20 }, profile: { depth: 'medium', ita: 0, skinHex: '#000000', lipHex: '#000000' },
      ranking: [], outfits: [], layers: [],
    };
    const update = (patch: Partial<Look>) => { current = { ...current, ...patch }; setLook(current); };
    setLook(current);

    try {
      setRunning('colours');
      const tone = await post<Pick<Look, 'tone' | 'profile' | 'ranking'> & { warnings: string[] }>('/api/analyze-tone', { photo, occasion });
      update({ tone: tone.tone, profile: tone.profile, ranking: tone.ranking });

      const stylist = await post<NonNullable<Look['stylist']>>('/api/stylist', { profile: tone.profile, ranking: tone.ranking, occasion });
      update({ stylist });

      setRunning('outfit');
      const picks = stylist.picks.map((p) => p.outfitId);
      // Try on both picks in parallel; the top pick carries the layers.
      const outfits = await Promise.all(
        picks.map(async (id) => ({ outfitId: id, ...(await post<TryOn>('/api/try-on', { kind: 'outfit', photo, itemId: id })) })),
      );
      update({ outfits });

      const top = outfitById(picks[0])!;
      const layers: Look['layers'] = [];
      let src = outfits[0].image;
      setRunning('jewellery');
      for (const item of accessoriesFor(top)) {
        try {
          const r = await post<TryOn>('/api/try-on', { kind: item.kind, srcUrl: src, itemId: item.id });
          layers.push({ kind: item.kind, itemId: item.id, ...r });
          src = r.image;
          update({ layers: [...layers] });
        } catch (e) {
          // A failed accessory layer must not lose the outfit: skip it and keep building on the last good image.
          setError({ message: `${item.name} could not be added (${(e as Error).message}). The outfit is kept.` });
        }
      }

      setRunning('makeup');
      const lipHex = lipFor(toneProfile({ color: { skin_color: tone.profile.skinHex, lip_color: tone.profile.lipHex } }), top);
      const lip = await post<TryOn>('/api/try-on', { kind: 'lip', srcUrl: src, lipHex });
      layers.push({ kind: 'lip', lipHex, ...lip });
      update({ layers: [...layers] });
    } catch (e) {
      const err = e as Error & { limit?: string };
      setError({ message: err.message, limit: err.limit });
    } finally {
      setRunning(null);
    }
  }

  const busy = running !== null;

  return (
    <div className="flex flex-col gap-6">
      {!look && (
        <section className="flex flex-col gap-5 pt-4">
          <h1 className="font-display text-3xl sm:text-4xl">Try it with your photo</h1>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Occasion</span>
            <div className="flex flex-wrap gap-2">
              {OCCASIONS.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setOccasion(o.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${occasion === o.id ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[var(--line)] bg-[var(--card)]'}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Your photo</span>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex min-h-48 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-[var(--line)] bg-[var(--card)] p-4 text-sm text-[var(--muted)]"
            >
              {photo ? <img src={photo} alt="Your photo" className="max-h-72 rounded-xl" /> : <>Tap to take or choose a photo</>}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" capture="user" className="hidden" onChange={(e) => choose(e.target.files?.[0])} />
            <ul className="text-xs text-[var(--muted)]">
              <li>Face the camera, in even daylight, head and shoulders in frame, no sunglasses.</li>
              <li>
                Privacy: your photo is sent to YouCam (Perfect Corp) only to analyse colours and render the try-on. We don&apos;t store it; it stays in
                this browser tab, and YouCam&apos;s copies expire on their retention schedule.
              </li>
            </ul>
          </div>
          <button disabled={!photo} onClick={build} className="rounded-full bg-[var(--accent)] px-5 py-3 text-white disabled:opacity-40">
            Build my complete look
          </button>
          <p className="text-xs text-[var(--muted)]">
            Live mode makes real YouCam calls (about 28 units for a new photo, about a minute), so it is capped per visitor and per day. The{' '}
            <Link href="/#samples" className="underline">
              sample shoppers
            </Link>{' '}
            are always open.
          </p>
          {error && <ErrorCard error={error} />}
        </section>
      )}

      {look && (
        <LookView
          look={look}
          mode="live"
          running={running}
          slot={
            <>
              {busy && (
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3 text-sm">
                  <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
                  {running === 'colours' && 'Measuring your colours with YouCam, then the stylist is choosing outfits…'}
                  {running === 'outfit' && 'Trying the two best outfits on you (about 20 s)…'}
                  {running === 'jewellery' && 'Adding jewellery that matches the outfit…'}
                  {running === 'makeup' && 'Adding a lip shade matched to the outfit…'}
                </div>
              )}
              {error && <ErrorCard error={error} />}
              {!busy && (
                <button onClick={() => { setLook(null); setError(null); }} className="self-start text-sm text-[var(--accent)] underline">
                  Start again with another photo
                </button>
              )}
            </>
          }
        />
      )}
    </div>
  );
}

function ErrorCard({ error }: { error: { message: string; limit?: string } }) {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      {error.message}{' '}
      {error.limit && (
        <Link href="/#samples" className="font-medium underline">
          Open a sample shopper
        </Link>
      )}
    </div>
  );
}
