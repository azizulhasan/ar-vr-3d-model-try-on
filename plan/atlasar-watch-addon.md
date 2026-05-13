# Addon: `atlasar-watch-addon` — Wrist Try-On & Watch Sizing

**Status:** 📋 planned. Not yet on a feature branch. Target release: Pro 3.2.0 (after AR-60 / Fit addon ships).
**Purpose:** Let shoppers see a watch worn on their own wrist via webcam + size verdict (will the strap fit?).

---

## 1. Pitch (one paragraph)

The shopper opens a watch product page, taps **"Try it on my wrist"**, holds their hand up to the webcam. The system tracks 21 hand-landmark points in real time and renders the watch model on their wrist, oriented and scaled to the actual wrist size. For sizing accuracy they hold a card to the back of their hand — the system measures wrist circumference in mm and reports whether the strap (with the configured min/max range) will fit. Comparable to Hublot's AR try-on, Daniel Wellington's app, Casio G-Shock's online tool.

## 2. Tech stack

| Layer | Tech | Source |
|---|---|---|
| Hand detection | **MediaPipe Hand Landmarker** (21 points × 2 hands, ~6 MB model) | Free Landmarker Manager (`$loader->require('hand')`) |
| Metric anchor | ISO 7810 card calibration (shared with Fit addon) | Free `fit-card-detector.js` |
| Wrist measurement | Landmarks 0 (wrist), 1 (thumb CMC), 17 (pinky MCP) + pixels_per_mm → wrist width + estimated circumference | Pro addon `watch-pro-measurement-engine.js` |
| Renderer | three.js orthographic overlay (Pattern 2, reuses face addon's renderer with hand-anchor strategy) | Pro addon `watch-pro-renderer.js` |
| Anchor strategy | Hand landmark 0 + wrist-axis vector from 0→9 + roll angle from 5↔17 | Pro addon `watch-pro-anchor.js` |
| Bundle plan | Lazy-loaded behind "Try it on my wrist" click |  |

## 3. Free plugin contribution

The Free plugin's contribution is **already in place after AR-60** — the Landmarker Manager, OpenCV.js card calibration, schema, measurement REST routes are all there. This addon adds:
- New Free addition: `'hand'` registered as a model type in `AR_TRY_ON_Landmarker_Manager` (one-time addition; future Ring addon reuses it).
- New `ar_placement` option: `'hand-watch'`.
- New schema key: `fit_dimensions.type = 'watch'` with `wrist_circumference_min / max`, `case_diameter`, `case_thickness`, `lug_to_lug`.
- New `FitDimensionsSection.js` tab for watch dimensions in the admin metabox.

## 4. Pro addon files (`addons/atlasar-watch-addon/`)

```
addon.json
addon.php
watch-pro.js                       # entry
watch-pro.min.js
watch-pro-renderer.js              # three.js overlay on hand
watch-pro-anchor.js                # landmark → 3D wrist anchor
watch-pro-measurement-engine.js    # wrist width + circumference estimate
watch-pro-verdict.js               # "Fits / Too tight / Too loose"
watch-pro-calibrator.js            # admin per-product calibration
watch-pro-styles.css
```

## 5. Per-product schema (`ar_try_on_product_settings.fit_dimensions`)

```json
{
  "fit_dimensions": {
    "type": "watch",
    "wrist_circumference_min": 150,
    "wrist_circumference_max": 220,
    "case_diameter": 42,
    "case_thickness": 11,
    "lug_to_lug": 48,
    "strap_width": 22
  }
}
```

## 6. UX flow

1. Watch product page → **"Try it on my wrist"** button.
2. Camera grant, fullscreen modal.
3. Instruction overlay: *"Hold your wrist flat to the camera, palm down."*
4. Hand Landmarker detects hand; watch model renders on wrist anchor.
5. Shopper rotates wrist — model tracks via landmark roll angle.
6. Snapshot button → PNG download (Free includes watermark, addon-paid version is watermark-free).
7. **Sizing path:** "Check if it fits" → card-calibration sub-flow (hold card to back of hand) → measure wrist width pixels → derive circumference → verdict.
8. Logged-in shopper can save wrist size to profile for one-tap fit checks on future products.

## 7. Freemius product

- **Product slug:** `atlasar-watch-addon`
- **Display name:** "AtlasTryOn — Wrist & Watches"
- **Pricing:** mid-tier between face addon and fit addon
- **Bundle:** AtlasTryOn Suite includes it

## 8. Accuracy targets

| Metric | Target | Method |
|---|---|---|
| Wrist width | ±2 mm | Card-anchored landmarks 0–17 |
| Estimated wrist circumference | ±5 mm | Width × 1.3 (anatomical constant), refined per-shopper if profile saved |
| Sizing verdict (strap fits) | ≥90% correct | Composite against `wrist_circumference_min/max` |
| Visual try-on placement | < 5 mm misalignment over 95% of frames | Hand-landmark accuracy from MediaPipe |

Lower bound than Fit addon (which targets ±1 mm) because wrist circumference is a single-view estimate, not a direct measurement.

## 9. Commercial parallels

- **Hublot** — AR Try-On (mobile web, ARCore-based)
- **Daniel Wellington** — iOS app, ARKit hand tracking
- **Casio G-Shock** — Web try-on, MediaPipe-style
- **TAG Heuer** — Connected app, BLE + AR
- **Apple Watch** "Try on" in Apple Store app

The web-based ones all use Hand Landmarker or equivalent. We're feature-comparable.

## 10. Acceptance criteria

- Hand-only try-on flow works on iOS / Android / desktop
- Visual placement: watch face stays attached as wrist rotates ±60°
- Wrist sizing accuracy ±5 mm against reference set
- Verdict correctness ≥90% on test orders
- No tracking when hand leaves frame
- GDPR consent + disclaimer copy

## 11. Open questions

1. **Two hands shown — which gets the watch?** Default to dominant-hand pose (closer to camera); shopper can tap to switch.
2. **Snapshot watermarking policy on Free vs paid addon** — confirm with product team.
3. **Coupling with Ring addon** — both use Hand Landmarker. Should we render watch + ring simultaneously if both are active? Probably yes, but defer decision until Ring addon ships.

## 12. Cross-references

- [`prescription-fit-research.md`](prescription-fit-research.md), [`prescription-fit-integration-plan.md`](prescription-fit-integration-plan.md) — shared foundation
- [`atlasar-fit-addon.md`](atlasar-fit-addon.md) — same measurement layer, different product family
- [`atlasar-ring-addon.md`](atlasar-ring-addon.md) — sister addon, same Hand Landmarker
- [`tensorflowjs-research.md`](tensorflowjs-research.md) — Hand Landmarker model details
