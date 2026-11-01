'use client';
/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import { accessoryById, outfitById, OCCASIONS } from '@/lib/catalog';
import { DEPTH_LABEL, lookUnits, type Look, type StepRecord } from '@/lib/look';
import { BeforeAfter } from './BeforeAfter';
import { StepRail, type StepId } from './StepRail';

const inr = (n: number) => '₹' + n.toLocaleString('en-IN');
const secs = (ms: number) => (ms / 1000).toFixed(1) + ' s';

type Layer = 'outfit' | 'jewellery' | 'makeup';

export function LookView({ look, mode, running, slot }: { look: Look; mode: 'replay' | 'live'; running?: StepId | null; slot?: React.ReactNode }) {
  const [active, setActive] = useState(0); // which tried-on outfit
  const [layer, setLayer] = useState<Layer>('makeup');

  const top = look.outfits[0];
  const showing = look.outfits[active] ?? top;
  const earrings = look.layers.find((l) => l.kind === 'earrings');
  const necklace = look.layers.find((l) => l.kind === 'necklace');
  const lip = look.layers.find((l) => l.kind === 'lip');
  const jewelleryImage = necklace?.image ?? earrings?.image;

  // Layers exist only on the top pick (accessories go on the chosen outfit only).
  const layered = active === 0;
  const canJewellery = layered && !!jewelleryImage;
  const canMakeup = layered && !!lip;
  const effective: Layer = layer === 'makeup' && !canMakeup ? (canJewellery ? 'jewellery' : 'outfit') : layer === 'jewellery' && !canJewellery ? 'outfit' : layer;
  const afterImage = !showing ? null : effective === 'makeup' ? lip!.image : effective === 'jewellery' ? jewelleryImage! : showing.image;

  const done: StepId[] = ['photo'];
  if (look.ranking.length) done.push('colours');
  if (look.outfits.length) done.push('outfit');
  if (earrings || necklace) done.push('jewellery');
  if (lip) done.push('makeup');

  const occasion = OCCASIONS.find((o) => o.id === look.occasion)?.label;
  const units = lookUnits(look);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {mode === 'replay' ? (
            <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 font-medium text-[var(--accent)]">
              Replay of a real recorded run · no API calls
            </span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-800">Live · real YouCam calls</span>
          )}
          {look.aiGenerated && <span className="rounded-full bg-[var(--line)] px-2.5 py-1 text-[var(--muted)]">AI-generated sample person</span>}
        </div>
        <h1 className="font-display text-3xl text-[var(--ink)] sm:text-4xl">
          {look.name}
          {occasion && <span className="text-[var(--muted)]"> · {occasion}</span>}
        </h1>
        <StepRail done={done} running={running} />
      </header>

      {slot}

      <div className="grid gap-6 md:grid-cols-[1.1fr_1fr]">
        {/* Result viewer */}
        <section className="flex flex-col gap-3">
          {afterImage ? (
            <BeforeAfter before={look.photo} after={afterImage} alt={look.name} />
          ) : (
            <img src={look.photo} alt={look.name} className="w-full rounded-2xl" />
          )}
          {look.outfits.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2" role="group" aria-label="Layers">
                {(['outfit', 'jewellery', 'makeup'] as Layer[]).map((l) => {
                  const enabled = l === 'outfit' || (l === 'jewellery' ? canJewellery : canMakeup);
                  return (
                    <button
                      key={l}
                      disabled={!enabled}
                      onClick={() => setLayer(l)}
                      className={`flex-1 rounded-full border px-3 py-2 text-sm transition ${
                        effective === l ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[var(--line)] bg-[var(--card)] text-[var(--ink)]'
                      } disabled:opacity-40`}
                    >
                      {l === 'outfit' ? 'Outfit' : l === 'jewellery' ? '+ Jewellery' : '+ Lip colour'}
                    </button>
                  );
                })}
              </div>
              {look.outfits.length > 1 && (
                <div className="flex gap-2 text-sm">
                  {look.outfits.map((o, i) => (
                    <button
                      key={o.outfitId}
                      onClick={() => setActive(i)}
                      className={`flex flex-1 items-center gap-2 rounded-xl border p-1.5 text-left ${active === i ? 'border-[var(--accent)]' : 'border-[var(--line)]'} bg-[var(--card)]`}
                    >
                      <img src={o.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      <span className="leading-tight">
                        <span className="block text-[var(--muted)] text-xs">{i === 0 ? 'Top pick' : 'Second pick'}</span>
                        {outfitById(o.outfitId)?.colorName}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Colours and picks */}
        <section className="flex flex-col gap-4">
          {look.ranking.length > 0 && (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
              <h2 className="text-sm font-semibold text-[var(--ink)]">Your colours</h2>
              <p className="mt-0.5 text-xs text-[var(--muted)]">Measured by YouCam AI Facial Color Tones Analyzer</p>
              <div className="mt-3 flex gap-4">
                <Swatch hex={look.profile.skinHex} label="Skin" />
                <Swatch hex={look.profile.lipHex} label="Lips" />
                <div className="flex flex-col justify-center text-sm">
                  <span className="font-medium">{DEPTH_LABEL[look.profile.depth]} depth</span>
                  <span className="text-xs text-[var(--muted)]">ITA {look.profile.ita}°</span>
                </div>
              </div>
            </div>
          )}

          {look.ranking.length > 0 && (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
              <h2 className="text-sm font-semibold">Outfits ranked for you</h2>
              {look.stylist && !look.stylist.fallback && <p className="mt-1 text-sm text-[var(--ink)]">{look.stylist.summary}</p>}
              <ol className="mt-3 flex flex-col gap-3">
                {look.ranking.map((r, i) => {
                  const o = outfitById(r.outfitId);
                  if (!o) return null;
                  const tried = look.outfits.some((x) => x.outfitId === r.outfitId);
                  const why = look.stylist?.picks.find((p) => p.outfitId === r.outfitId)?.why ?? r.text;
                  return (
                    <li key={r.outfitId} className="flex gap-3">
                      <img src={o.image} alt={o.name} className="h-16 w-16 flex-none rounded-lg border border-[var(--line)] object-contain" />
                      <div className="min-w-0 text-sm">
                        <div className="flex flex-wrap items-center gap-x-2">
                          <span className="font-medium">
                            {i + 1}. {o.name}
                          </span>
                          {tried && <span className="rounded-full bg-[var(--accent-soft)] px-2 text-xs text-[var(--accent)]">tried on</span>}
                        </div>
                        <p className="text-[var(--muted)]">{why}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </section>
      </div>

      {look.v0 && top && (
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
          <h2 className="text-sm font-semibold">Why colour matching matters</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Same shopper, same occasion. Both are real YouCam try-ons.</p>
          <div className="mt-3 grid max-w-2xl grid-cols-2 gap-3 text-sm">
            <figure className="min-w-0">
              <img src={look.v0.image} alt="Without colour matching" className="aspect-square w-full rounded-xl object-cover object-top" />
              <figcaption className="mt-1">
                <b>Without:</b> {outfitById(look.v0.outfitId)?.colorName}, picked by category. {look.ranking.find((r) => r.outfitId === look.v0!.outfitId)?.text}
              </figcaption>
            </figure>
            <figure className="min-w-0">
              <img src={top.image} alt="With colour matching" className="aspect-square w-full rounded-xl object-cover object-top" />
              <figcaption className="mt-1">
                <b>With:</b> {outfitById(top.outfitId)?.colorName}. {look.ranking[0]?.text}
              </figcaption>
            </figure>
          </div>
        </section>
      )}

      {top && <LookCard look={look} />}
      <XRay look={look} units={units} />
    </div>
  );
}

function Swatch({ hex, label }: { hex: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-xs">
      <span className="h-12 w-12 rounded-full border border-black/10" style={{ background: hex }} />
      <span>{label}</span>
      <code className="text-[10px] text-[var(--muted)]">{hex}</code>
    </div>
  );
}

function LookCard({ look }: { look: Look }) {
  const outfit = outfitById(look.outfits[0].outfitId)!;
  const items = [outfit, ...look.layers.filter((l) => l.itemId).map((l) => accessoryById(l.itemId!)!)];
  const lip = look.layers.find((l) => l.kind === 'lip');
  const total = items.reduce((n, i) => n + i.priceInr, 0);
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl">Complete the look</h2>
        <span className="text-xs text-[var(--muted)]">Mock product page</span>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((i) => (
          <li key={i.id} className="flex flex-col gap-1 text-sm">
            <img src={i.image} alt={i.name} className="aspect-square w-full rounded-xl border border-[var(--line)] object-contain p-2" />
            <span className="leading-tight">{i.name}</span>
            <span className="font-semibold">{inr(i.priceInr)}</span>
          </li>
        ))}
        {lip && (
          <li className="flex flex-col gap-1 text-sm">
            <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-[var(--line)]">
              <span className="h-16 w-16 rounded-full" style={{ background: lip.lipHex }} />
            </div>
            <span className="leading-tight">Lip shade matched to the outfit</span>
            <code className="text-xs text-[var(--muted)]">{lip.lipHex}</code>
          </li>
        )}
      </ul>
      <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3">
        <span className="text-sm">
          {items.length} pieces · <b>{inr(total)}</b>
        </span>
        <button disabled className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white opacity-60" title="Checkout is out of scope for the demo">
          Add the look to bag
        </button>
      </div>
    </section>
  );
}

function XRay({ look, units }: { look: Look; units: ReturnType<typeof lookUnits> }) {
  const steps: (StepRecord & { label: string })[] = [
    ...look.outfits.map((o) => ({ ...o.step, label: `Outfit: ${outfitById(o.outfitId)?.name}` })),
    ...look.layers.map((l) => ({
      ...l.step,
      label: l.kind === 'lip' ? `Lip colour ${l.lipHex}` : `${l.kind === 'earrings' ? 'Earrings' : 'Necklace'}: ${accessoryById(l.itemId!)?.name}`,
    })),
  ];
  const r = look.ranking;
  const picked = look.outfits.map((o) => outfitById(o.outfitId)?.colorName).filter(Boolean);
  const skipped = r.at(-1) && /blend/.test(r.at(-1)!.text) ? outfitById(r.at(-1)!.outfitId)?.colorName : null;
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4" id="xray">
      <h2 className="font-display text-xl">X-ray: how this look was built</h2>
      {r.length > 0 && (
        <p className="mt-2 text-sm">
          YouCam colour tone analysis measured a {look.profile.depth} skin tone, <code>{look.profile.skinHex}</code>
          {picked.length > 0 && <>; we picked {picked.join(' and ')} because {picked.length > 1 ? 'they stand' : 'it stands'} out clearly against it</>}
          {skipped && <>, and skipped {skipped} because it would blend in</>}.
        </p>
      )}
      <ol className="mt-4 flex flex-col gap-2">
        <XRayRow
          n={1}
          label="Colour tone analysis"
          step={{ feature: 'tone', featureName: 'AI Facial Color Tones Analyzer', taskId: look.tone.taskId, ms: look.tone.ms, units: look.tone.units, params: { src_file_id: '<your photo>' }, cached: look.tone.cached }}
        />
        {look.stylist && (
          <li className="rounded-xl border border-[var(--line)] p-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <b>2. Stylist agent</b>
              <span className="text-[var(--muted)]">
                {look.stylist.fallback ? 'fallback: template wording' : look.stylist.model} · {look.stylist.toolCalls.length} tool calls
              </span>
            </div>
            <p className="mt-1 text-[var(--muted)]">
              Ranks with colorMatch (deterministic), then explains in words. Tools: {[...new Set(look.stylist.toolCalls.map((t) => t.name))].join(', ') || 'none'}.
            </p>
          </li>
        )}
        {steps.map((s, i) => (
          <XRayRow key={s.taskId + i} n={i + (look.stylist ? 3 : 2)} label={s.label} step={s} />
        ))}
      </ol>
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-[var(--bg)] p-3 text-center text-sm">
        <div>
          <div className="text-lg font-semibold">{units.total}</div>
          <div className="text-xs text-[var(--muted)]">units for this look</div>
        </div>
        <div>
          <div className="text-lg font-semibold">{mode(look)}</div>
          <div className="text-xs text-[var(--muted)]">units spent now</div>
        </div>
        <div>
          <div className="text-lg font-semibold">{secs(units.ms)}</div>
          <div className="text-xs text-[var(--muted)]">YouCam time, in sequence</div>
        </div>
      </div>
    </section>
  );
}

// Replays spend nothing; live looks spend what wasn't cached.
const mode = (look: Look) => (look.recordedAt ? 0 : lookUnits(look).spent);

function XRayRow({ n, label, step }: { n: number; label: string; step: StepRecord }) {
  return (
    <li className="rounded-xl border border-[var(--line)] p-3 text-sm">
      <div className="flex flex-wrap justify-between gap-2">
        <b>
          {n}. {label}
        </b>
        <span className="text-[var(--muted)]">
          {step.cached ? 'cache hit · 0 units' : `${secs(step.ms)} · ${step.units} unit${step.units === 1 ? '' : 's'}`}
        </span>
      </div>
      <div className="mt-1 text-[var(--muted)]">{step.featureName}</div>
      <details className="mt-1">
        <summary className="cursor-pointer text-xs text-[var(--accent)]">What we sent</summary>
        <pre className="mt-1 overflow-x-auto rounded-lg bg-[var(--bg)] p-2 text-[11px] leading-snug">{JSON.stringify(step.params, null, 2)}</pre>
        <div className="mt-1 truncate font-mono text-[11px] text-[var(--muted)]">task_id {step.taskId}</div>
      </details>
    </li>
  );
}
