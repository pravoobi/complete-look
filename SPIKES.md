# SPIKES

## Spike 1: repo state (Oct 15, 2026)
Fresh repo. Next.js 16 (App Router) + TypeScript + Tailwind 4, Vitest, tsx. No catalog, no try-on code yet. Deploy target: Vercel (server routes). Scripts: `npm run build`, `npm run typecheck`, `npm test`.

## Spike 6: API shapes and costs (Oct 15, 2026, read-only, 0 units spent)

**Balance** (`Get-Unit-Info`): 1,000 units (expire 2027-01-12) + 40 units (expire 2027-12). Total 1,040.

**Access**
- Key authenticates against `https://mcp-api-01.makeupar.com/mcp/{fashion,beauty}` (Streamable HTTP, `Authorization: Bearer`, needs `Accept: application/json, text/event-stream` and the `mcp-session-id` header after `initialize`). Helper: `scripts/mcp.mjs`.
- File API works on **both** `yce-api-01.makeupar.com` and `yce-api-01.perfectcorp.com` with this key. MCP responses list `perfectcorp.com` URLs. Using `makeupar.com` (India) per CLAUDE.md.
- `YOUCAM_SECRET_KEY` is unused so far: auth is Bearer API key only.

**Gotchas**
- MCP tool names use hyphens (`AI-Clothes-Virtual-Try-On`), not underscores as in CLAUDE.md.
- `Get-Upload-API-Info` echoes the request headers back, **including the Bearer key**. Never save or paste its raw output; `scripts` output is redacted and `spikes-out/` is gitignored.
- Upload URLs contain `ttl30`: uploads expire fast (likely 30 minutes; confirm on the retention page). Copy every result we keep into our own storage.
- File upload: `POST /s2s/v2.0/file/<kind>` (e.g. `cloth-v4`) with `{files:[{content_type,file_name,file_size}]}` (max 10 MB) -> `file_id` + presigned `PUT` url. Works, 0 units.

**Costs** (`Get-Feature-Cost`, full table in `spikes-out/cost-all.json`)

| Feature | Units | Task URL path |
|---|---|---|
| Facial Color Tones Analyzer V1.0 | **20** | `/s2s/v2.0/task/skin-tone-analysis` |
| Clothes Virtual Try-On V4.0 (V2/V3 also 2) | 2 | `/s2s/v2.0/task/cloth-v4` |
| Earrings V1.0 (Single / Stacked) | 1 / 2 | `/s2s/v2.0/task/2d-vto/earring` |
| Necklace V1.0 | 1 | `/s2s/v2.0/task/2d-vto/necklace` |
| Scarf V2.0 | 2 | `/s2s/v2.0/task/scarf` |
| Makeup V1.0 (lip, blush etc., explicit hex) | 1 | `/s2s/v2.0/task/makeup-vto` |
| Look V1.0 (preset templates, not planned) | 2 | `/s2s/v2.0/task/look-vto` |
| Fabric V1.0 (not planned) | 2 | `/s2s/v2.0/task/fabric` |

**Implication:** one complete look = 20 + 2 (outfit) + 1 + 1 + 2 + 1 (makeup) = **27 units**, or 29 if two outfits are tried on (tone dominates). Live budget is roughly 35 looks, not hundreds. Consequences:
- Cache tone by image hash so re-runs and later outfit tries cost 0 for tone.
- Samples are recorded once and replayed; live uploads need a tight cap (about 1 look per session; daily cap about 30 units covers about 1 look/day, so raise to about 50 or gate live mode).
- Reconsider "two outfit try-ons": +2 each, cheap, keep.

**Request shapes (from MCP schemas)**
- Clothes: `{src_file_id|src_file_url, ref_file_id|ref_file_url, garment_category: full_body|lower_body|upper_body|shoes|auto|outer, change_shoes?, filter_multi_person?: off|normal|strict}`.
- Earrings / Necklace: `{source_info:{name}, object_infos:[{name, parameter:{...}}], src_file_url, ref_file_urls}`; earring params include `earring_is_right_ear`, `earring_scale` (cm), `earring_need_remove_background`; necklace params include anchor/location points, shadow and ambient intensity. Earrings are one ear per object, so a pair needs two objects (confirm in the paid spike).
- Scarf: `{gender (required: female|male), src_file_*, ref_file_*, style?}`.
- Tone: `{src_file_id|src_file_url, face_angle_strictness_level?: strict|high|medium|low|flexible}`.
- Polling: `GET` the task URL with `/{task_id}`; `task_status` is `success` or `error`; result URL in `results.url` (confirm in the first paid call).

**Still unknown (needs images / paid calls):** exact polling path and result JSON, tone JSON fields, image requirements (size, framing), whether sarees work, whether a result URL can feed the next task directly.

## Spike 4: tone (Oct 22, 2026)

**Run 1, face-a** (AI-generated studio portrait, medium tone, black hair). Works: **20 units**, **10.2 s** end to end. The File API took 1.0 s and task creation 0.3 s, then 3 polls (running, running, success).

- Poll path confirmed: `GET /s2s/v2.0/task/skin-tone-analysis/{task_id}` returns `data.task_status` (`running` | `success` | `error`), `data.results` and `data.error`.
- Request body that works: `{"src_file_id": "..."}` (no strictness level set, so the default `high` applies).
- Result, all fields:
  ```json
  { "color": { "skin_color": "#b08568", "lip_color": "#b56d6e", "eye_color": "#2a1d1b", "eye_color_name": "Brown",
               "eyebrow_color": "#3e3834", "hair_color": "#FAF0BE", "hair_color_name": "Blonde" },
    "face_quality": { "has_face": true, "area": "good", "frontal": "good", "lighting": "good", "faceangle": "good" } }
  ```
- **No undertone, season or depth field.** The API returns colours only, so `colorMatch` derives them. Skin #b08568 is CIELAB L 59.0, a 12.6, b 22.0: hue angle 60.2°, ITA 22.2° ("tan" band in the standard ITA scale: >55 very light, 41–55 light, 28–41 intermediate, 10–28 tan, -30–10 brown, < -30 dark). Undertone comes from the hue angle (higher is more golden, so warmer), depth from ITA, and contrast from skin L against eyebrow L.
- **Hair colour is wrong:** it returned Blonde #FAF0BE for clearly black hair. Don't use `hair_color`. Use `eyebrow_color` (#3e3834, correct) as the dark-feature reference for contrast.
- `face_quality` gives a verdict per check (area, frontal, lighting, faceangle). Map these to the photo-guidance messages.
- Output is JSON only, with no image, so the JSON is all we store.

**Run 2, face-c** (ChatGPT image, Oct 22). It's visibly the same generated woman as face-a, a little lighter. **20 units, 10.0 s**, same 3-poll pattern.

| | skin | L | a | b | hue | ITA | eyebrow L | lip |
|---|---|---|---|---|---|---|---|---|
| face-a | #b08568 | 59.0 | 12.6 | 22.0 | 60.2° | 22.2° (tan) | 24.0 | #b56d6e |
| face-c | #b48c6f | 61.3 | 11.2 | 21.3 | 62.3° | 28.0° (tan/intermediate edge) | 37.4 | #c77979 |
| face-d | #b78565 | 59.7 | 15.2 | 24.8 | 58.5° | 21.4° (tan) | 24.0 | #b86165 |
| face-e | #b59177 | 62.8 | 9.8 | 18.9 | 62.6° | 34.2° (intermediate) | 37.4 | #c7757b |
| face-h | #704f38 | 36.6 | 10.8 | 19.0 | 60.4° | -35.1° (dark) | 24.0 | #673b38 |

- The analyzer picks up a small lightness shift on the same face (ITA +5.8°), so readings aren't just noise. Both read warm (hue about 60°), so we still haven't seen a cool or deep result.
- **Hair is `#FAF0BE` "Blonde" again, byte for byte.** It looks like a fallback value when hair detection fails, not a reading. Treat `#FAF0BE` as "unknown".
- Eyebrow colour moved more than skin (L 24 to 37): don't lean hard on it for contrast scoring.

**Run 3, face-d** (ChatGPT image, a different woman, Oct 22): **20 units, 10.6 s**. Slightly redder and more saturated than face-a (hue 58.5°, chroma 29), same depth band.

- All three ChatGPT faces sit in one narrow band: L 59–61, hue 58–62°, ITA 21–28°. Prompts like "South Asian woman" produce nearly the same skin tone every time, so three samples would get near-identical colour suggestions.
- **Eyebrow is `#3e3834` on two different faces** (a and d), exactly. Eyebrow colour seems to snap to a small set of values. Keep it out of scoring, or use it only as a coarse light/dark flag.
- Hair `#FAF0BE` "Blonde" on 3 of 3 runs, so it's a fallback value.

**Free pre-check** (`scripts/skin-precheck.mjs`, 0 units): it averages two cheek patches with sharp and converts to Lab. It reads brighter and redder than the API (cheek highlight and flush), but it **ranked face-a, c and d in the same order as the API** on both lightness and hue, so it works as a filter before spending 20 units.

**Run 4, face-e** (ChatGPT, prompted "fair, cool-toned skin with pink undertones, rosy cheeks", Oct 22): **20 units, 10.0 s**.

- The pre-check read her cheeks as clearly pink (hue 22.5° against 43–56° for the others). **The API did not:** skin hue 62.6°, as golden as the rest. It only registered her as lighter (ITA 34.2°, intermediate).
- Across 4 faces the API's skin hue spans only 58.5–62.6°, while ITA spans 21.4–34.2°. **`skin_color` carries depth, not undertone.** A warm/cool split built on it would be invented by us, not read by YouCam.
- Eyebrow `#5b575a` again (faces c and e), so eyebrow values come from a small fixed set. Hair `#FAF0BE` on 4 of 4 runs.

**face-f** (prompted "deep, dark brown skin"): not run. The pre-check read the same lightness as face-a (L 70.3 for both), so it would likely land in the same band. Regenerate it darker before spending 20 units.

**face-g** (ChatGPT, deep-tone prompt): not run. Pre-check L 62.1, so it would likely read as low-medium.

**Run 5, face-h** (face-g regenerated with "make her skin noticeably darker", Oct 22). Pre-check L 42.0. **20 units, 11.2 s**.

- The API reads her as clearly deep: L 36.6, ITA -35.1° ("dark" band), 69° of ITA below face-e. Hue 60.4° again, so undertone is still flat across all 5 faces (58.5–62.6°), which confirms the depth-and-contrast decision.
- Lip `#673b38` is a real reading (it tracks skin depth). Eyebrow `#3e3834` again, hair fallback again (5 of 5).
- Pre-check against API lightness over 5 faces: 70.3→59.0, 76.5→61.3, 73.3→59.7, 78.9→62.8, 42.0→36.6. Same order every time, so the pre-check is a reliable filter.

**Sample shopper set (all measured):** Meera, light (face-e, ITA 34.2°) · Ananya, medium (face-d, 21.4°) · deep shopper (face-h, -35.1°). The provisional depth cut-offs (light ≥ 30°, medium 10–30°, deep < 10°) sort these three correctly.

**face-b** (Gemini image): not run, and no longer needed. Next tone runs should use a clearly cool face and a clearly deep face, so we can check that `colorMatch` separates shoppers.

## Spikes 2, 3, 5
Blocked on garment and accessory images.

**Units spent:** 100 (5 tone runs). **Balance (Oct 22):** 900 + 40.
