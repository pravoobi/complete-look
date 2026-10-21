# Evidence

(v0 -> v1, failure -> recovery, measured numbers, lessons. Dated.)

## Measured numbers

- **Oct 22, 2026:** tone analysis, 10.2 s (face-a), 10.0 s (face-c) and 10.6 s (face-d) end to end, 20 units each.

## Lessons we paid for

- **Oct 22, 2026, tone analysis has no undertone field.** `AI-Facial-Color-Tones-Analyzer` returns hex colours (skin, lip, eye, eyebrow, hair) and face-quality checks, nothing more. We derive undertone and depth ourselves from `skin_color` (CIELAB hue angle and ITA).
- **Oct 22, 2026, hair colour misread.** On face-a (black hair), the analyzer returned `hair_color_name: "Blonde"` (#FAF0BE). face-c returned exactly the same value, so `#FAF0BE` looks like a fallback when hair detection fails. face-d returned it as well (3 of 3). We ignore `hair_color`.
- **Oct 22, 2026, eyebrow colour repeats across faces.** face-a and face-d, two different women, both returned eyebrow `#3e3834` exactly. Eyebrow colour is a coarse signal at best.
- **Oct 22, 2026, generated faces cluster.** Three ChatGPT "South Asian woman" portraits all read skin L 59–61, hue 58–62°. Sample shoppers need prompts that force clearly different tones, or the samples won't show tone-driven differences. Raw JSON is in `spikes-out/tone-face-a.json` (not committed).
