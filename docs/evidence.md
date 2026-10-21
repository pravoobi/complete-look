# Evidence

(v0 -> v1, failure -> recovery, measured numbers, lessons. Dated.)

## Measured numbers

- **Oct 22, 2026:** tone analysis, 10.2 s end to end, 20 units (face-a).

## Lessons we paid for

- **Oct 22, 2026, tone analysis has no undertone field.** `AI-Facial-Color-Tones-Analyzer` returns hex colours (skin, lip, eye, eyebrow, hair) and face-quality checks, nothing more. We derive undertone and depth ourselves from `skin_color` (CIELAB hue angle and ITA).
- **Oct 22, 2026, hair colour misread.** On face-a (black hair), the analyzer returned `hair_color_name: "Blonde"` (#FAF0BE). We ignore `hair_color` and use `eyebrow_color` for contrast. Raw JSON is in `spikes-out/tone-face-a.json` (not committed).
