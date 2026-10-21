# Complete Look: architecture and implementation plan

Written Oct 15, 2026. Decisions from Praveen on Oct 15:

- Start fresh in this folder (no existing try-on repo to fork).
- The stylist agent uses Claude, pinned to `claude-sonnet-5-5`. Re-check the id in spike 6.
- Sample people, garments and accessory images will be created by us (none are rights-cleared yet).
- Focus: YouCam gets full focus now, so the "spikes only until Oct 28" default no longer applies. The timeline below replaces CLAUDE.md §8. If they disagree, `docs/progress.md` wins.

Anything marked **[spike]** is an assumption until `SPIKES.md` confirms it.

---

## 1. Architecture

```
 Phone browser (Next.js app, mobile-first)
   │  upload / pick occasion / pick outfit / toggle layers
   ▼
 Next.js route handlers on Vercel  ── all YouCam + Claude calls are server-side
   ├─ POST /api/upload          → lib/youcam.uploadFile        (File API → file_id)
   ├─ POST /api/analyze-tone    → createTask(color-tones)      → returns our jobId
   ├─ POST /api/try-on          → createTask(clothes|earrings|necklace|scarf)
   ├─ GET  /api/task/:jobId     → one YouCam status check per call; on success copy
   │                              the result to Blob, write the cache, append the Step to LookRun
   ├─ POST /api/stylist         → Claude tool-calling agent (colorMatch + catalog + try_on)
   └─ DELETE /api/session       → deletes the shopper's uploads and unsaved results
   │
   ├─ lib/youcam/   typed client: uploadFile, createTask, getTask, waitForTask (scripts only),
   │                error-code mapping, retry with backoff, unit accounting, call log
   ├─ lib/guard     per-session + global daily unit caps, per-IP rate limit
   ├─ lib/cache     key = sha256(inputImageHash, itemId, feature, layerIndex)
   ▼
 Storage
   ├─ Vercel Blob       result images (YouCam results expire, so we keep copies)
   ├─ Upstash Redis     job state, cache index, unit counters, call log
   └─ repo /public/samples/<shopper>/   replay runs: run.json + images, no DB needed
```

**Why polling works this way:** a Vercel function shouldn't sit in a long poll loop. The browser polls `/api/task/:jobId` with backoff (1s, 2s, 3s…, 90s timeout). Each request does exactly one YouCam status check and is rate-limited per job. `waitForTask` with a server-side loop exists only for scripts (recording samples, spikes).

**One data shape drives everything.** Live sessions and replays both produce a `LookRun`:

```ts
type Step = {
  key: 'photo'|'tone'|'outfit'|'earrings'|'necklace'|'dupatta';
  feature: string;            // e.g. "AI_Clothes_Virtual_Try_On"
  params: Record<string, unknown>; // what we sent, no keys
  taskId?: string; ms?: number; units?: number; cacheHit?: boolean;
  inputImage: string; outputImage?: string;
  status: 'pending'|'success'|'error'|'recovered';
  explain: string;            // plain-language line for the X-ray
};
type LookRun = { id: string; shopperLabel: string; occasion: Occasion;
                 tone?: ToneProfile; picks: CatalogItemRef[]; steps: Step[]; replay: boolean };
```

The step rail, X-ray panel, cost receipt and look card all render from `LookRun`. A replay just loads `public/samples/<id>/run.json`, which means zero YouCam calls on page load and replays that can't fail.

**Layer chaining:** outfit result → copy to Blob → re-upload through the File API → earrings → necklace → dupatta (scarf). Re-uploading always works. If spike 3 shows a result URL can be passed directly, we skip the re-upload. Every layer keeps its own image, so the layer toggles just pick which step's output to show. A failed layer falls back to the previous one, so the outfit is never lost.

**Failure → recovery (real, not staged):** what we detect depends on spike 3. Likely candidates:
(a) a rejected photo (YouCam error code) → mapped to specific guidance → retry;
(b) face drift after stacked layers → compare the face crop of layer N with the original (perceptual hash of the face box returned by tone analysis, or a pixel diff) → re-apply the accessory to the clean outfit layer instead of the stacked one.
We build whichever one actually happens.

## 2. Stack

| Piece | Choice | Why |
|---|---|---|
| App | Next.js (App Router) + TypeScript + Tailwind | Pages and API routes in one repo, one Vercel deploy |
| Host | Vercel | Server functions, Blob, Redis via Marketplace, preview URLs |
| Storage | Vercel Blob + Upstash Redis | Result copies; counters, cache and job state |
| LLM | `@anthropic-ai/sdk`, `claude-sonnet-5-5` pinned | Stylist wording + tool calls only, never colour choice |
| Tests | Vitest with recorded YouCam fixtures | No paid calls in tests or CI |
| Images | `sharp` (server) | Resize/normalise uploads to YouCam's limits, face-crop diff |

## 3. Repo layout

```
app/
  page.tsx                 landing: "One photo. Your colours. The whole outfit." + samples
  try/page.tsx             live flow (Photo → Colours → Outfit → Jewellery → Dupatta)
  s/[sample]/page.tsx      replay of a sample shopper (deep link for judges)
  look/[id]/page.tsx       look card on mock product page + WhatsApp preview
  present/page.tsx         story page for the video
  api/{upload,analyze-tone,try-on,stylist,session}/route.ts, api/task/[id]/route.ts
components/  StepRail, XRayPanel, CostReceipt, BeforeAfter, LayerToggles, LookCard, PhotoGuide
lib/youcam/  client.ts, features.ts (paths/params from SPIKES.md), errors.ts, units.ts
lib/color/   colorMatch.ts, palettes.ts
lib/stylist/ agent.ts, tools.ts
lib/         cache.ts, guard.ts, store.ts, run.ts (LookRun helpers)
data/catalog.json          ~12 outfits, ~8 accessories
public/catalog/  public/samples/<shopper>/
scripts/     spike-*.ts, record-sample.ts (runs the real flow, writes replay files)
tests/       colorMatch, youcam client (fixtures), cache, guard
docs/        plan.md, progress.md, evidence.md      SPIKES.md  CHANGELOG-hackathon.md
```

## 4. Colour matching (deterministic)

**Depth and contrast, not warm/cool (decided Oct 22, from spike 4).** `AI-Facial-Color-Tones-Analyzer` returns colours only, and its `skin_color` tracks depth (ITA spread 21–34° over 4 faces) but not undertone (hue spread 4°, and a face prompted "cool, pink undertones" read as golden as the rest). So we build on what YouCam measures and never tell a shopper she is "warm" or "cool".

- **Input fields used:** `skin_color`, `lip_color`, `face_quality`. Ignored: `hair_color` (fallback `#FAF0BE` "Blonde" on every run), `eyebrow_color` (snaps to a few fixed values), `eye_color` (not needed).
- `ToneProfile = { skinHex, skinLab, ita, depth: 'light'|'medium'|'deep', lipHex, faceQuality }`. Depth comes from ITA, with provisional cut-offs light ≥ 30°, medium 10–30°, deep < 10°. Re-check them once a deep face has been measured.
- Score each item from its `dominantColors` (hex → Lab) against `skinLab`:
  - **Wash-out penalty:** a garment colour within ΔE2000 ≈ 15 of the skin colour blends in. This is the "looked great on the model, washed out on me" problem, so it gets a strong penalty.
  - **Lightness contrast:** reward a clear lightness gap from the skin. Depth sets which side wins: deep skin favours colours much lighter or much brighter than the skin, light skin favours deeper, richer colours, and medium can go either way as long as the gap is large.
  - **Chroma:** for medium and deep, prefer saturated colours (jewel tones, mustard, magenta) over muted beiges near skin lightness.
  - **Occasion filter.**
- Thresholds are styling heuristics, not science: keep them in one constants file, cover them with tests, and say so in the README.
- Returns a score and machine-readable reasons (`{ rule: 'avoids-washout', colour: '#7B1E2B', deltaE: 41 }`, `{ rule: 'lightness-contrast', ... }`). Claude turns the reasons into a sentence ("this maroon stands out clearly against your skin tone") and never invents its own.
- **Makeup layer:** start from the shopper's own `lip_color` and shift its hue toward the outfit's dominant colour, keeping lightness near the natural lip. The result goes to `lip_color` in makeup try-on as a hex.
- **Jewellery metal follows the outfit, not the skin:** gold with warm-hued garments (reds, mustard, maroon, green), silver or oxidised with cool-hued ones (blues, purples, greys).
- Guardrail: copy only ever talks about colours and how they stand out, never about skin, skin conditions or attractiveness.

## 5. Stylist agent

Tools: `get_tone_profile`, `search_catalog(occasion, maxPrice?)` (returns colorMatch-ranked items), `try_on(itemId)`, `add_accessory(kind, itemId)`, `finalize_look`.
Limits are enforced in code, not in the prompt: at most 3 proposals, try-on for the top 2 only, and accessories only on the chosen outfit.
Every tool call appends to the `LookRun` and so shows up in the X-ray.
If Claude fails, the flow still works: the top 2 from colorMatch with template wording.

## 6. Cost, cache, guard

- Cost per look ≈ tone + 2 outfits + 3 accessory layers = 6 tasks **[spike: units per task]**.
- Budget: 1,000 units. Planned split: spikes ~40, building/debugging ~200, recording 3 samples ~60, then a judging reserve of ~600 at a daily cap of ~30 units (`YOUCAM_DAILY_UNIT_CAP`) from submission to Nov 20. The session cap (`YOUCAM_SESSION_UNIT_CAP`) is one complete look. Final numbers come after spike 5.
- When the cap is hit: a "demo limit reached" card pointing to the samples, which are always open.

## 7. Creating the images (needed before spike 2)

All images are AI-generated by us with ChatGPT image generation (decided Oct 22; OpenAI's terms assign output rights to the user), and labelled "AI-generated sample" in the UI and README. No real people, brands or logos in prompts.

- **3 sample shoppers:** front-facing, even light, neutral background, clearly different **depths** (measured, not just prompted):
  - Meera: light, Diwali (face-e, ITA 34.2°)
  - Ananya: medium, wedding guest (face-d, ITA 21.4°)
  - a third, deep, sangeet or office ethnic (face-h, ITA -35.1°, measured Oct 22; name to be chosen)
  Run `scripts/skin-precheck.mjs` (free) before any 20-unit tone run. "South Asian woman" prompts cluster around ITA 20–30°, so the deep shopper needs an explicit prompt. If generated faces can't reach a deep reading, we need at least one consenting real person.
- **Garments (~12 for the catalog, ~5 for the spike):** shot exactly as YouCam's garment input requirements say (flat lay or on a model) **[spike 6 first]**. Kurta set, anarkali, lehenga, saree; each with recorded `dominantColors`.
- **Accessories (~8):** jhumkas, studs, kundan/temple necklace, oxidised silver necklace, 2–3 dupattas. Same rule: match the input format the docs require.
- Hex colours are extracted from each image with a script, not typed by hand.

## 8. Timeline (full focus)

| Phase | Dates | Done when |
|---|---|---|
| Setup + spike 6 (API shapes, input requirements) | Oct 15 | Repo, Next.js skeleton on Vercel, `SPIKES.md` with exact paths/params/costs |
| Image creation | Oct 15–16 | Sample shoppers + spike garments/accessories ready |
| Spikes 2–5 | Oct 16–17 | Garment categories decided, layering confirmed, tone JSON saved, cost table + caps |
| Core path | Oct 18–20 | Photo → tone → outfit → one accessory → look card on a real photo, committed, deployed. **v0 (no tone match) screenshots captured first.** |
| Judge path | Oct 21–22 | `record-sample` script, 3 replays, deep links, step rail, X-ray, cost receipt |
| Depth | Oct 23–25 | Stylist agent, full layering + toggles, failure → recovery, guard/cache hardening, session deletion, tests |
| Presentation | Oct 26–28 | Product-page look card, WhatsApp preview, `/present`, OG image, README + GIF, screenshots |
| Video | Oct 29–30 | Script, rehearse, record on phone, captions, upload unlisted, re-cut |
| Submit | Oct 31 | Incognito link check, §10 checklist, submit; social post for bonus units |
| Buffer | Nov 1–2 | Nothing planned |

Cut line: the stylist agent stays, whatever happens (Praveen, Oct 16). If the core path isn't committed by end of Oct 20, cut in this order: Hindi/Telugu labels, WhatsApp share preview, blush (keep lip colour), OG image polish, the second outfit try-on. colorMatch + template text remains only as the runtime fallback when a Claude call fails.

## 9. First steps when we start building

1. `git init`, Next.js + TS + Tailwind scaffold, `.env.example`, `.gitignore`, licence (MIT), `docs/progress.md`, `docs/evidence.md`, `SPIKES.md`, `CHANGELOG-hackathon.md`.
2. Connect the YouCam MCP servers (fashion + beauty) to Claude Code. Run spike 6: `Get_Upload_API_Info` and `Get_Feature_Cost` for the 5 features, plus the API Reference pages and image requirements. This needs your YouCam API key and the redeemed code.
3. Create the spike images, then run spikes 2–5 (~40 units). Ask before any run over ~20 units.

## Needed from Praveen

- YouCam API key (India console) with the hackathon code redeemed. It goes in `.env.local` only.
- Anthropic API key for the stylist.
- A Vercel account linked to GitHub, plus the repo name (public, MIT).
- Which image generator to use for samples/garments, and confirmation that its licence allows this.
