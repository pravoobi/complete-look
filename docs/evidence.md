# Evidence

(v0 -> v1, failure -> recovery, measured numbers, lessons. Dated.)

## Measured numbers

- **Oct 22, 2026:** tone analysis, 10.0–11.2 s end to end over 5 runs (faces a, c, d, e, h), 20 units each.
- **Oct 22, 2026:** a free local pre-check (cheek patches, sharp) ranked all 5 faces in the same lightness order as the paid analyzer. It filtered out 2 faces that would have wasted 40 units.

- **Nov 1, 2026:** clothes try-on 15.0–22.7 s (5 runs, 2 units each); earrings pair 12.1 s (2 units); necklace 12.7 s (1); lip colour 14.8 s (1). Outfit + jewellery + lip on a cached photo: about 55 s and 6 units, run in sequence.

## Lessons we paid for

- **Nov 1, 2026, scarf try-on is generative, not a layer.** AI Scarf V2 on our lehenga result replaced the outfit (white dress), added a hat and a lakeside background, and turned the dupatta into a neckerchief. The schema warned of this ("style … to control outfit and background style"). We dropped the dupatta step instead of shipping a result that loses the outfit.
- **Nov 1, 2026, makeup try-on also retouches skin.** Lip colour alone came back with visible skin smoothing and brightening. We show this as-is and mention it, since the look card shouldn't imply the shopper's skin changed.
- **Nov 1, 2026, a headshot is enough for clothes try-on.** All 5 garments (including the saree) dressed the visible neckline on a head-and-shoulders photo without touching the face.

- **Oct 22, 2026, tone analysis has no undertone field.** `AI-Facial-Color-Tones-Analyzer` returns hex colours (skin, lip, eye, eyebrow, hair) and face-quality checks, nothing more. We derive undertone and depth ourselves from `skin_color` (CIELAB hue angle and ITA).
- **Oct 22, 2026, hair colour misread.** On face-a (black hair), the analyzer returned `hair_color_name: "Blonde"` (#FAF0BE). face-c returned exactly the same value, so `#FAF0BE` looks like a fallback when hair detection fails. face-d returned it as well (3 of 3). We ignore `hair_color`.
- **Oct 22, 2026, eyebrow colour repeats across faces.** face-a and face-d, two different women, both returned eyebrow `#3e3834` exactly. Eyebrow colour is a coarse signal at best.
- **Oct 22, 2026, generated faces cluster.** Three ChatGPT "South Asian woman" portraits all read skin L 59–61, hue 58–62°. Sample shoppers need prompts that force clearly different tones, or the samples won't show tone-driven differences.
- **Oct 22, 2026, the analyzer reads depth, not undertone.** face-e was prompted with "cool, pink undertones" and our own cheek sample was clearly pink (hue 22.5°), but the API returned a golden skin colour (hue 62.6°) like every other face, only lighter. Across 4 faces the API's skin hue spans 4°, while depth (ITA) spans 13°. Colour advice has to be built on depth and contrast, which YouCam actually measures. Raw JSON is in `spikes-out/tone-face-a.json` (not committed).
