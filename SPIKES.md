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
- **No undertone, season or depth field.** The API returns colours only, so `colorMatch` derives them. Skin #b08568 is CIELAB L 59.0, a 12.6, b 22.0: hue angle 60.2°, ITA 22.2° ("intermediate" depth band). Undertone comes from the hue angle (higher is more golden, so warmer), depth from ITA, and contrast from skin L against eyebrow L.
- **Hair colour is wrong:** it returned Blonde #FAF0BE for clearly black hair. Don't use `hair_color`. Use `eyebrow_color` (#3e3834, correct) as the dark-feature reference for contrast.
- `face_quality` gives a verdict per check (area, frontal, lighting, faceangle). Map these to the photo-guidance messages.
- Output is JSON only, with no image, so the JSON is all we store.

**Run 2, face-b** (Gemini image, similar medium tone): not run yet, waiting for the go-ahead (20 units).

## Spikes 2, 3, 5
Blocked on garment and accessory images.

**Units spent:** 20. **Balance (Oct 22):** 980 + 40.
