# CLAUDE.md — Complete Look (YouCam API Skin AI & eCommerce VTO Hackathon)

Project instructions for Claude Code, built on the hackathon template. Rename to `CLAUDE.md` at the root of the repo you build in. Read fully before any task.

---

## 0. Fill these in first (day 1)

- **Hackathon:** YouCam API Skin AI & eCommerce VTO Hackathon — Devpost, sponsor Perfect Corp.
- **Sponsor tech that must do real work:** YouCam API (clothes, earrings, necklace and scarf virtual try-on; makeup virtual try-on; facial colour tone analysis).
- **Track:** eCommerce VTO topic (not Skin AI). The topic text asks for beauty and fashion try-on "as one" experience ("what someone wears and how their looks are part of the same self-image"). Fashion try-on alone risks failing the stage-one theme check, so the flow ends with a makeup try-on layer (decided Oct 15).
- **Judges:** the site lists one, Wendy Yen (no title given). The rules say judges may be sponsor employees and may not all be listed. Pitch to a Perfect Corp product audience.
- **Build window:** Oct 15 → Nov 2, 2026, 11:45am ET (10:15pm IST). Submit by **Nov 1**; Nov 2 is buffer only.
- **Submission requirements:** repo URL (public with a licence, or private and shared with the organisers), text description that explains what was significantly updated during the submission period, screenshots, 1–3 minute demo video on YouTube that names the YouCam APIs used and shows the app running on its device, a working link judges can test (with login details if private), English materials. The project must be free to test "without any restriction" until judging ends (Nov 20), so samples stay fully open and any live cap is stated plainly in the description. Winners must do an exit interview and agree to be featured in a blog article. Where the Devpost overview page and the official rules differ, the rules win.
- **Judging criteria (from the official rules), and where each is proven.** Stage one is pass/fail: fits the theme and genuinely uses a YouCam API. Stage two scores these four equally:

  | Criterion | Weight | Proven by |
  |---|---|---|
  | Technological Implementation: how thoroughly and skilfully YouCam APIs are integrated; working, non-trivial code; clear consumer or eCommerce value | 25% | Five YouCam try-on features chained in one flow after tone analysis; X-ray panel (§3); feature map table in README; video 1:30–2:15 |
  | Design: a complete, coherent product experience, not a proof of concept | 25% | Three-step flow with step rail, before/after slider, layer toggles, look card on a product listing page; video 0:30–1:30 |
  | Potential Impact: a credible, specific case for a real problem for a real audience, and the demo actually addresses it | 25% | README problem section; the colour-mismatch → corrected look story; one measured number (§2) |
  | Quality of the Idea: creative, non-obvious use of YouCam APIs, and genuine understanding of the problem space | 25% | Tone-grounded outfit choice plus layered jewellery, dupatta and makeup for Indian ethnic wear; "The obvious competitor" below |

  Ties are broken on Technological Implementation first, so that row matters most.
- **Side prizes to target:** none. Women in Tech and Rising Star (student) awards don't apply. A project can win only one prize: 1st $2,500, 2nd $1,000, 3rd $500. Separately, sharing the demo video on social media earns up to 2 × 500 bonus API units (tag @YouCam API, name the APIs used, add "Received API credits for sharing", keep it public 30 days, claim through the form before the deadline; the posting account must have been created before Sep 29, 2026).
- **Required items checklist:**
  - [ ] Video 1–3 min, public on YouTube, voiceover and captions, names each YouCam API, shows the app on a phone, no copyrighted music or third-party trademarks
  - [ ] Repo public with a licence (or private and shared with the organiser address from the rules)
  - [ ] Live link that works for judges without our help
  - [ ] Text description including a "what we built during the submission period" section
  - [ ] Screenshots
  - [ ] `CHANGELOG-hackathon.md` showing every new capability dated Sep 29 or later

### The one sentence

> Other try-ons show you a dress. Complete Look shows you the whole outfit, in colours chosen for your skin tone, on you.

Every feature, README section and video beat should support this sentence. If a feature doesn't, it's out of scope.

### The obvious competitor

Most entrants will build "upload a photo, see one garment on you", or "skin analysis, then a list of products". Judges call that a surface-level wrapper. We win on three things together: the outfit is **chosen** from a real reading of the shopper's colour tones (not guessed by an LLM), the result is **layered** (outfit, then jewellery, then dupatta, then lip and makeup colours matched to the outfit, chained through YouCam fashion, jewellery and beauty features), and it is built for **Indian ethnic wear**, where an outfit is never bought alone.

### Focus decision (§14)

This build window overlaps Amazon (Oct 23), GitLab (Oct 27) and Nebius (Oct 30). Default plan: YouCam is **not** the main bet until Oct 28. Before then, only the spikes run (they are small and decide scope). Praveen to confirm or change.

---

## 1. How judges experience this project

1. They open the README. First screen: a looping GIF of a shopper going from selfie to complete look, the live demo link, and a "Try it in a minute" box:
   1. Open sample shopper Ananya (medium skin tone, wedding guest) — full replay
   2. Open sample shopper Meera (light skin tone, Diwali) — full replay
   3. Open the X-ray view of one look
   4. Open the story page (`/present`)
   5. Try it with your own photo (live, capped)
2. They click a sample. It works with **no signup, no API keys, no units spent, no failure**: a replay of a real recorded run served from stored results.
3. They look for YouCam. The X-ray panel and step rail (§3) show each real API call behind the result.
4. They watch the video if the above interested them.

The judge path is built before the stylist agent and before polish (see §8).

---

## 2. Process rules

### Spikes first, written down (results go in `SPIKES.md`)

Each spike records: works / doesn't, latency, units spent, gotchas. Keep spending to about 40 units total.

1. **Repo state.** Framework, how the catalog is stored, how try-on works today, where it deploys (currently GitHub Pages, so no server). Write it at the top of `SPIKES.md`.
2. **Garment spike** in the API Playground (about 10 calls): `AI_Clothes_Virtual_Try_On` with a kurta set, an anarkali or dress, a lehenga and a saree from the catalog. The demo catalog contains only categories that pass. Sarees are the known hard case; if they fail, leave them out and say so in the README.
3. **Layering spike:** one good clothes result, then earrings, necklace and scarf try-on on top. Confirm one task's output can be the next task's input, and note quality loss per layer.
4. **Tone spike:** `AI_Facial_Color_Tones_Analyzer` on 3 selfies with different skin tones. Save the raw JSON; `colorMatch` is designed from these real fields.
5. **Cost table:** units per call per feature, units per complete look, and the per-session cap that follows from it.
6. **API shapes:** for each feature, read its API Reference page and call `Get_Upload_API_Info` and `Get_Feature_Cost` through the YouCam MCP server. Record exact paths, parameters and costs. Code against `SPIKES.md`, not against memory. Where the docs contradict this file, the docs win.

Pin the stylist agent's model id. No "auto" model selection.

### Core path before polish

Core path = photo → tone → one outfit try-on → one accessory layer → look card, for a real photo, committed. That is the minimum submittable product. The stylist agent, more layers and localisation come after.

### Capture evidence while building (`docs/evidence.md`)

- **v0 → v1:** the first version without tone matching (outfit picked by category only) next to the tone-matched version, same shopper. Screenshots of both.
- **Failure → recovery:** at least one shown on purpose in the demo, for example: the layering step degrades the face, the app detects it by comparing with the previous layer and retries with the accessory applied to the original photo instead; or a rejected photo gets specific guidance and succeeds on the second try. Use whichever actually happens; do not stage a fake one.
- **Measured numbers, dated:** seconds per YouCam task, seconds and units per complete look, units saved by the cache across the judging period.
- **Lessons we paid for:** YouCam quirks and limits, stated plainly (garment categories that fail, the `gender` parameter requirement, file retention).

### Commits

- Small, frequent commits with clear messages. All hackathon work is dated Sep 29 or later; `CHANGELOG-hackathon.md` lists each new capability with its commit.
- `npm run build && npx tsc --noEmit` must pass before pushing to `main` (adjust to the repo's real scripts after spike 1).
- No new dependency without a one-line justification in the commit message.

---

## 3. Make the sponsor tech visible

Build all three; they are cheap here and Technological Implementation breaks ties.

- **Step rail:** Photo → Colours → Outfit → Jewellery → Dupatta → Makeup. Each step lights up only when its real YouCam task returns.
- **X-ray panel ("how this look was built"):** for each step, the YouCam feature name, the parameters sent (no keys), task id, time taken and units spent, in plain language ("Colour tone analysis measured a medium skin tone, #b78565; we picked maroon and mustard because they stand out clearly against it, and skipped the beige set because it would blend in").
- **Cost receipt:** units for this look, and units saved by cache hits.

README:
- **Feature map table:** `# | YouCam capability | Exactly what we send | Code link`. Every row does real work; mark anything set up but unused.
- **Architecture diagram** near the top.

### YouCam API facts (verified from the docs on Oct 8, 2026; spike 6 on Oct 15 updated them, and `SPIKES.md` has the detail)

- **India region uses the makeupar.com hosts.** Console: https://yce.makeupar.com/api-console/en/api-keys/ . Docs: https://docs.makeupar.com/develop/introduction (global mirror: https://docs.perfectcorp.com).
- **API server:** `https://yce-api-01.makeupar.com`. **Auth:** `Authorization: Bearer <API_KEY>`.
- **Async pattern for every feature:** File API for an upload URL and `file_id` → upload → `POST /s2s/v2.0/task/<feature>` returns `task_id` → poll until `task_status` is `success` or `error` → download URL for the result.
- **MCP servers** (fastest way to learn exact shapes and costs during development):
  - Tool names use hyphens, not underscores. Helper: `scripts/mcp.mjs`.
  - `https://mcp-api-01.makeupar.com/mcp/fashion`: `AI-Clothes-Virtual-Try-On`, `AI-Scarf-Virtual-Try-On`, `AI-Earrings-Virtual-Try-On`, `AI-Necklace-Virtual-Try-On`, `AI-Bracelet-Virtual-Try-On`, `AI-Bag-Virtual-Try-On`, `Get-Upload-API-Info`, `Get-Feature-Cost`, `Get-Running-Task-Status`, `Get-Unit-Info`.
  - `https://mcp-api-01.makeupar.com/mcp/beauty`: `AI-Facial-Color-Tones-Analyzer`, `AI-Makeup-Virtual-Try-On`, `AI-Makeup-Virtual-Try-On-Pattern-Name`, `AI-Look-Virtual-Try-On`, `AI-Skin-Analysis`, `AI-Fitzpatrick-Skin-Type-Analysis`.
  - Scarf, hat, shoes and bag try-on need an explicit `gender` parameter.
  - `Get-Upload-API-Info` echoes request headers back, including the Bearer key. Never save or paste its raw output.
- **Costs per result image (from `Get-Feature-Cost`, Oct 15):** Facial Color Tones Analyzer **20**; Clothes 2; Earrings 1 (single) or 2 (stacked); Necklace 1; Scarf 2; Makeup 1; Look (preset template) 2. A complete look is about 27 units, and tone analysis is most of it, so cache tone results by image hash.
- **Makeup try-on** (`/s2s/v2.0/task/makeup-vto`, 1 unit): takes `effects[]` with explicit hex colours per category (`lip_color`, `blush`, `eye_shadow`, `eye_liner`, and others). This suits deterministic matching: `colorMatch` picks the lip and blush hex from the tone result and the outfit colours. Pattern names come from `AI-Makeup-Virtual-Try-On-Pattern-Name`.
- **Budget:** 1,000 free units from the hackathon redeem code (expire 2027-01-12) plus 40 more, plus the social sharing bonus.
- Uploads and results expire (File Retention Period page): copy every result we keep into our own storage.

---

## 4. Demo and presentation surfaces

- **Seeded samples:** 3 sample shoppers (different tones and occasions), fully pre-processed with real YouCam results. Sample people must be images we have rights to; label any AI-generated sample person honestly.
- **Replay mode:** samples replay stored results; zero YouCam calls on page load.
- **Outputs in context:** the look card shown on a mock marketplace product page ("Complete the look" with each piece and its ₹ price) and as a WhatsApp share preview. Not a grid of images.
- **Localisation:** occasions named the way shoppers say them (Wedding guest, Diwali, Sangeet, Office ethnic), prices in ₹. Hindi/Telugu labels only if time allows.
- **Story page:** `/present`, chapter by chapter: the problem, one shopper's flow, the X-ray, the number. Record the video from it.
- **Share preview:** OG image for the live URL and the repo.
- **Test suite visible:** tests for `colorMatch`, the YouCam client (against recorded fixtures), cache and unit guard. Test count in the README, passing run screenshot in the gallery.
- **README GIF:** recorded from the live site, looping, first thing on the page.

### Product and design requirements

- First screen states the value: "One photo. Your colours. The whole outfit."
- Before/after slider on the try-on result; layer toggles for jewellery, dupatta and makeup.
- Mobile-first; camera capture on phones.
- Privacy line next to the upload control: photos go to YouCam for processing and are deleted after the session unless the shopper saves a look. Implement that deletion.
- Photo guidance (lighting, framing) from the API's image requirements, with a specific, friendly message when a photo is rejected.

---

## 5. Cost and reliability rules

- Generate once, store the result, serve the stored result. Never call YouCam on render.
- **Cache** key = hash(user image, item id, feature, layer order). Identical requests are lookups.
- **Unit guard:** per-session cap, a global daily cap from an env var, and a visible "demo limit reached" state that points to the samples. Live uploads are capped; samples are always open.
- The stylist agent proposes at most 3 outfits and tries on only the top 2; accessories are applied only to the outfit the shopper picks.
- Every YouCam call is logged, errors are caught, and a readable failure is shown. A failed accessory layer must not lose the outfit result.
- Poll server-side with backoff and a timeout; the browser polls our route, not YouCam.
- Free units are limited: record the balance in `SPIKES.md` after each spending session.

### Architecture

- **Frontend:** keep the try-on UI stack. If the repo is a static GitHub Pages site, deploy the hackathon build to a host with server functions (Vercel by default) and leave the original Pages deployment untouched.
- **Server routes:** `POST /api/upload`, `POST /api/analyze-tone`, `POST /api/try-on` (clothes, earrings, necklace, scarf or makeup), `GET /api/task/:id`, `POST /api/stylist`.
- **`lib/youcam/`:** one typed client: `uploadFile`, `createTask(feature, payload)`, `waitForTask(taskId)`, with retry, error-code mapping and unit accounting. Everything goes through it.
- **Catalog:** about 12 outfits and 8 accessories that passed the spikes. Fields: `category`, `dominantColors` (hex), `occasion[]`, `tryOnType`, `priceInr`, and for accessories `kind`.

### The stylist agent

Tool-calling agent on the server (reuse the WebMCP stylist tool contracts where they fit): `get_tone_profile`, `search_catalog`, `try_on`, `add_accessory`, `finalize_look`.

- Colour matching is deterministic and built on **depth and contrast**, the things YouCam actually measures: `colorMatch` scores items from `skin_color` and `lip_color` and each item's `dominantColors` (wash-out penalty when a colour sits close to the skin, lightness contrast set by depth, chroma). The model only words the explanation. Details in `docs/plan.md` §4.
- Never call a shopper "warm" or "cool": spike 4 showed the analyzer doesn't measure undertone, so that claim would be ours, not YouCam's. Ignore `hair_color` and `eyebrow_color` (unreliable, see `SPIKES.md`).
- Never comment on skin conditions or attractiveness. Tone is used only to suggest colours ("this shade tends to stand out against your tone").
- Every tool call feeds the X-ray panel.

---

## 6. Security

- Zero credentials in the repo. `.env.local` never committed; `.env.example` always current (`YOUCAM_API_KEY`, model key, cap values).
- Only public values reach the browser; the YouCam key stays server-side.
- Rate-limit every route that spends units.
- Before finishing any task: `git diff --cached | grep -iE "secret|api_key|token"` returns nothing outside `.env.example`.
- Do not call paid YouCam endpoints in automated tests or CI; use recorded fixtures. Ask before running anything that spends more than about 20 units.
- Only images we have rights to: no scraped product photos, no celebrity images.

---

## 7. README structure

1. Complete Look + the one sentence + looping GIF
2. Links: live demo · sample shopper · story page · video · how it's built
3. "Try it in a minute" box (§1)
4. The problem: a concrete shopper scene (the outfit looked great on the model, washed out on her, came back). Use a sourced statistic only if one is found and cited.
5. What it does: step table (step / what happens / which YouCam feature)
6. How it's built: architecture diagram, feature map table
7. The one interesting technical idea: chaining fashion, jewellery and beauty YouCam tasks, each result feeding the next, with tone-grounded selection. Explain with one real example from the X-ray.
8. Evidence: v0 → v1, failure → recovery, measured numbers
9. Cost engineering: units per look, cache savings, how judging stays within budget
10. What was built during the submission period (links to `CHANGELOG-hackathon.md`) · How judges can test · Run locally · Security and privacy · Limitations (e.g. sarees, if they failed) and roadmap
11. How it was built with Claude Code

---

## 8. Timeline

Dates assume work starts Oct 15. If `docs/progress.md` shows otherwise, it wins.

| Phase | Dates | Done when |
|---|---|---|
| Spikes + setup | Oct 15–17 (fit around other entries) | All spikes in `SPIKES.md`; garment categories decided; cost table and caps set |
| Core path | Oct 28–29 | Photo → tone → outfit → one accessory → look card working on a real photo and committed (minimum submittable) |
| Judge path | Oct 29 | 3 seeded samples, replay mode, deep links, step rail, X-ray panel |
| Depth | Oct 30 | Stylist agent, full layering, failure → recovery behaviour, evidence captured |
| Presentation | Oct 31 | Look card in context, `/present`, OG image, README GIF, README draft, screenshots |
| Video + submit | Nov 1 | Video recorded from `/present` and the live app; description, changelog, links tested in incognito; submitted. Social share for bonus units. |
| Buffer | Nov 2 | Nothing planned |

The window from Oct 28 is tight because of the other deadlines. The stylist agent is never dropped (Praveen, Oct 16): the sponsor asks for agentic workflows. If time runs short, cut in this order instead: Hindi/Telugu labels, WhatsApp share preview, blush (keep lip colour), OG image polish, the second outfit try-on. The colorMatch + template-text path stays only as the runtime fallback when a Claude call fails.

Update `docs/progress.md` at the end of each session: shipped, blocked, next.

---

## 9. When working on a task

1. Read `docs/progress.md`, `SPIKES.md` and `docs/evidence.md` first.
2. Say which timeline phase the task belongs to. If it's ahead of the current phase, ask before starting.
3. Don't start depth or polish work until the core path is committed.
4. When something fails in an interesting way, add it to `docs/evidence.md` before fixing it.
5. When you measure something, record the number and the date.
6. Run the security check (§6) before finishing.
7. If a spike shows an idea doesn't work with the API as it is, say so and propose the smaller version. Never mock a YouCam result and present it as real.
8. Before submission, go through §10 "What usually loses" and the criteria table in §0 as a checklist, and fix every miss.

---

## 10. Patterns from winning entries

Drawn from recent winners (Snap2Shelf at Cloudinary/HackIndia 2026; LORE, GraphDev, Time-Traveler, stregent and others at the GitLab AI Hackathon 2026; Solo.io MCP Agents 2026; UiPath AgentHack 2026) and judges' published notes.

### What the idea looks like
- **A specific user with a specific, felt pain.** Here: a shopper buying a wedding-guest outfit online who can't tell if the colour will suit her or what to wear with it.
- **AI multiplies a workflow; it isn't the whole product.** Here: replace "order three, try at home, return two" end to end.
- **Aligned with the sponsor's roadmap.** Perfect Corp is pushing agentic workflows and combined beauty + fashion VTO; the hackathon text asks for both. Read their recent changelog and blog before finalising the feature list.
- **Meet users where they already are.** Mobile-first, WhatsApp share, ₹ prices, Indian occasions.

### What the build looks like
- **Feels like a product, not a hackathon project.** Named product, tagline, onboarding copy, real tests, roadmap.
- **Real infrastructure and real data where possible.** Every result shown is a real YouCam result. Say clearly which samples are replays.
- **Show the AI catching its own mistakes.** The failure → recovery moment in §2.
- **Document sponsor-platform limits and your workaround.** Garment categories, layering quality, `gender` requirement.
- **One concrete before/after number.** For example units and seconds per complete look, or how many tries a shopper needs.

### What usually loses
- A strong project with a confusing demo, against a simpler one judges understood.
- Five half-features instead of one flow that works end to end.
- Skipping the problem statement because it "seems obvious".
- Talking around a missing feature instead of saying it isn't built yet.
- Over-engineering code quality at the expense of a working demo.
- Two repos or unclear links. One repo, one live URL.
- Only a GitHub link: judges need a live link and a video.
- A video with no audio or subtitles.

---

## 11. Demo video script (aim for 2:45; hard limit 3:00)

| Time | Beat |
|---|---|
| 0:00–0:20 | A shopper with a cousin's wedding next week, scrolling lehengas, unsure if mustard works on her and what jewellery goes with it. |
| 0:20–0:30 | The one sentence. |
| 0:30–1:30 | One complete flow on a phone: photo → colours → two outfit suggestions with reasons → on her → jewellery → dupatta → lip colour matched to the outfit → look card on the product page. Something working on screen by 0:45. |
| 1:30–2:15 | The failure → recovery moment, then the X-ray panel naming each YouCam API (Facial Color Tones Analyzer, Clothes, Earrings/Necklace, Scarf, Makeup Virtual Try-On) and the units per look. |
| 2:15–2:45 | The before/after number and who it helps: shoppers, and sellers who lose sales to hesitation and returns. |
| 2:45–3:00 | What's not built yet (honestly) and the live link. |

Rules: voiceover plus burned-in captions; no copyrighted music or third-party logos; pre-warm or replay slow calls so no spinners on camera; script, time and rehearse out loud; record from `/present` and the live app on a phone, not localhost; upload unlisted early, watch on a phone, re-cut.

---

## 12. Devpost submission structure

Keep the platform's template headings.

- **Title + tagline:** Complete Look + the one sentence.
- **Thumbnail:** before (selfie) / after (complete look), readable at small size.
- **Video** at the top.
- **Inspiration:** one specific moment (a real returned outfit, if Praveen has one to tell).
- **What it does:** table of shopper situation → what Complete Look does.
- **How we built it:** architecture diagram, components table, each YouCam API and why.
- **What we built during the submission period:** required by the rules for existing projects.
- **Challenges:** real problems and fixes (layering quality, garment categories, async tasks).
- **Accomplishments:** the measured numbers.
- **What we learned / What's next:** includes YouCam limits hit.
- **Built with:** exact names: YouCam AI Clothes Virtual Try-On, AI Earrings Virtual Try-On, AI Necklace Virtual Try-On, AI Scarf Virtual Try-On, AI Makeup Virtual Try-On, AI Facial Color Tones Analyzer, plus the stack.
- **Try it out:** live demo, then the repo, then the video.
- **Gallery:** captioned screenshots: each step, X-ray panel, architecture, passing tests.

Keep counts and numbers consistent everywhere.

---

## 13. After submitting

- Post the demo video (LinkedIn, X) with the bonus-unit requirements met, and claim the bonus through the form before Nov 2.
- Keep the live demo up and within the unit budget until judging ends (Nov 20). Check it daily; the daily cap protects it.
- Be ready for the exit interview if chosen.

---

## 14. Focus rule

One hackathon at a time gets full depth. See "Focus decision" in §0: until Oct 28 this entry gets only its spikes.

## Out of scope

- User accounts, saved wardrobes, payments, checkout
- Real retailer integration (the product page is a mock)
- Skin analysis or skincare advice of any kind
- Makeup beyond one outfit-matched layer (lip colour, optionally blush), and preset Look templates
- Video try-on

## Open questions for Praveen

- Build in the try-on repo on a branch, or in a fork kept separate from the portfolio version?
- Which model provider for the stylist agent?
- Are there rights-cleared accessory images (earrings, necklace, dupatta) and sample-person photos, or do these need to be created?
