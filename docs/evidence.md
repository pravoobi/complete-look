# Evidence

(v0 -> v1, failure -> recovery, measured numbers, lessons. Dated.)

## Measured numbers

- **Oct 22, 2026:** tone analysis, 10.2 s (face-a) and 10.0 s (face-c) end to end, 20 units each.

## Lessons we paid for

- **Oct 22, 2026, tone analysis has no undertone field.** `AI-Facial-Color-Tones-Analyzer` returns hex colours (skin, lip, eye, eyebrow, hair) and face-quality checks, nothing more. We derive undertone and depth ourselves from `skin_color` (CIELAB hue angle and ITA).
- **Oct 22, 2026, hair colour misread.** On face-a (black hair), the analyzer returned `hair_color_name: "Blonde"` (#FAF0BE). face-c returned exactly the same value, so `#FAF0BE` looks like a fallback when hair detection fails. We ignore `hair_color` and use `eyebrow_color` for contrast. Raw JSON is in `spikes-out/tone-face-a.json` (not committed).
