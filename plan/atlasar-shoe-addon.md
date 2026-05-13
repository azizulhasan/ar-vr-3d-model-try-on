# Addon: `atlasar-shoe-addon` — Foot Try-On & Shoe Sizer

**Status:** 📋 planned. Target release: Pro 3.4.0. Highest commercial value, slowest to ship — different UX flow (floor paper, not face camera) and biggest landmarker (Pose).
**Purpose:** Reduce online shoe-return rates by giving shoppers a calibrated foot-length + width measurement and a fit verdict per shoe size.

---

## 1. Pitch (one paragraph)

The shopper opens a shoe product page, taps **"Find my size"**. Instead of the face/hand try-on flow they're guided through: *place an A4 / Letter sheet on the floor, stand next to it, hold your phone at chest height pointing down at your foot.* The system uses MediaPipe Pose Landmarker to detect the foot (landmarks 27–32) and the A4 sheet to set the metric scale, then measures foot length, width, and arch height. It maps that to the merchant's size chart per shoe and reports: *"Your foot is 268 mm × 102 mm — for this model size US 10 fits best. Customers with similar feet most often pick US 10 (78%) or US 10.5 (15%)."* For visual try-on a separate flow renders a 3D shoe model on the shopper's foot via webcam. This is the **online-shoe-returns killer** — Nike Fit, ASICS Foot ID, and Volumental (Adidas / Saucony) all do roughly this; we ship the same capability inside WooCommerce.

## 2. Tech stack

| Layer | Tech | Source |
|---|---|---|
| Foot detection | **MediaPipe Pose Landmarker** (33 points incl. feet 27–32, ~10 MB model) | Free Landmarker Manager (`$loader->require('pose')`) |
| Metric anchor | **A4 / Letter paper** (210 × 297 mm or 8.5 × 11") on floor — distinct from card-anchor flow because shoe sizing needs floor reference, not handheld | Pro addon `shoe-pro-paper-detector.js` (extends Free OpenCV.js layer with A4 aspect ratio) |
| Foot measurement | Landmarks 31 (right foot index), 29 (right heel) → length; ankle-to-toe vector + outer-edge segmentation → width | Pro addon `shoe-pro-measurement-engine.js` |
| Visual try-on | three.js shoe model overlaid on foot via Pose Landmarker foot landmarks | Pro addon `shoe-pro-renderer.js` |
| Size mapping | Merchant-supplied size chart per shoe (length range mm → size label) | Stored in `fit_dimensions.size_chart` |
| Crowd intel (Phase 2) | Aggregate "shoppers with feet 268×102 picked size X" — opt-in | Pro server-side, anonymised |

## 3. Free plugin contribution

This addon **adds Pose Landmarker** to the shared loader — a one-time Free-side addition. Plus:
- New `ar_placement` option: `'foot-shoe'`
- New schema: `fit_dimensions.type = 'shoe'` with per-size length+width ranges, brand size system (US / EU / UK / JP / cm)
- New `FitDimensionsSection.js` tab for shoe size charts
- New REST: `/ar_try_on/v1/fit/shoe-size-chart` for per-product chart CRUD

## 4. Pro addon files (`addons/atlasar-shoe-addon/`)

```
addon.json
addon.php
shoe-pro.js                        # entry
shoe-pro.min.js
shoe-pro-paper-detector.js         # A4/Letter detection on floor
shoe-pro-measurement-engine.js     # foot length/width/arch from pose + scale
shoe-pro-renderer.js               # shoe model on foot
shoe-pro-anchor.js                 # foot landmark → 3D anchor
shoe-pro-size-mapper.js            # foot mm → shoe size lookup
shoe-pro-instruction-overlay.js    # guided photo-capture UI
shoe-pro-styles.css
```

## 5. Per-product schema

```json
{
  "fit_dimensions": {
    "type": "shoe",
    "size_system": "US",
    "is_wide_fit": false,
    "size_chart": [
      { "label": "US 8",   "length_min": 248, "length_max": 254, "width_min": 95,  "width_max": 100 },
      { "label": "US 8.5", "length_min": 254, "length_max": 260, "width_min": 96,  "width_max": 101 },
      { "label": "US 9",   "length_min": 260, "length_max": 266, "width_min": 98,  "width_max": 103 },
      ...
    ]
  }
}
```

## 6. UX flow — sizing

1. Shoe product page → **"Find my size"** button.
2. Instruction screen with animated illustration: *"Place an A4 sheet or letter-size paper on a hard floor. Stand next to it (don't step on it). Hold your phone at chest height, camera pointed down at the floor."*
3. Camera grant (rear camera preferred on mobile).
4. Real-time Pose Landmarker + paper detection. UI shows green outline when both foot and paper are detected.
5. Auto-capture after 3 stable frames OR manual shutter.
6. Frozen frame: foot length / width drawn as labelled measurements.
7. Verdict: "Your foot is 268 mm × 102 mm — **US 10 is your best fit.** US 10.5 also works if you prefer roomier."
8. CTA: "Add US 10 to cart" or "Show me wide-fit alternatives".

## 6.1. UX flow — visual try-on (optional)

Separate "Try them on" button → webcam face-up at foot → shoe rendered on foot (same Pose pipeline, different anchor strategy). Lower priority than sizing because shoe visual try-on is a known-hard problem (rendering occlusion is rough); sizing is the commercial win.

## 7. Freemius product

- **Product slug:** `atlasar-shoe-addon`
- **Display name:** "AtlasTryOn — Shoes & Footwear"
- **Pricing:** highest tier — footwear has biggest ROI per merchant (30% returns avoided)
- **Bundle:** AtlasTryOn Suite

## 8. Accuracy targets

| Metric | Target | Method |
|---|---|---|
| Foot length | ±3 mm | A4-anchored pose landmarks 29 / 31 |
| Foot width | ±5 mm | Outer-edge contour + scale |
| Size verdict | ≥90% match against in-store fitting | Composite |
| Multi-shopper consistency | Same foot measures within 5 mm across 10 captures | Stability gate |

Looser than the Fit addon's ±1 mm because feet are bigger, captured from further away, and shoe sizes themselves have ±5 mm tolerance per size step.

## 9. Commercial parallels

- **Nike Fit** — iOS / Android app, ARKit + ARCore foot scan
- **ASICS Foot ID** — In-store kiosk + mobile flow
- **Volumental** — Powers Adidas, Saucony, New Balance online sizing
- **Brannock device** — Physical analog gauge, the historic standard
- **Aetrex Albert** — In-store 3D foot scanner

Web-based parallels are rarer because the UX is harder (need floor reference) — Volumental's web SDK is the closest analog to what this addon ships.

## 10. Acceptance criteria

- A4 / Letter paper detection in ≥95% of test photos
- Foot length accuracy ±3 mm against reference set
- Size verdict ≥90% match against known correct sizes
- Works on rear cameras of common iOS / Android phones
- Per-product size chart admin UI is usable for non-technical merchants
- Visual try-on (if shipped) renders shoe model with < 8 mm misalignment

## 11. Open questions

1. **A4 vs Letter** — auto-detect by locale or let user pick? Default to locale; allow override.
2. **Crowd-sourced size intel** — opt-in, anonymised, but adds significant value. Needs GDPR-compliant data flow.
3. **Wide-fit / narrow-fit alternatives** — should the addon recommend other products if their `is_wide_fit` matches the shopper's width? Probably yes, Phase 2.
4. **Visual try-on quality** — shoe rendering with proper occlusion (ankle, sock) is hard. Acceptable to ship sizing-only first?
5. **Brannock equivalence** — should we calibrate against a Brannock measurement for credibility? Useful marketing claim.
6. **Children's shoes** — pose landmarker accuracy on small feet is lower. Confirm before launch.

## 12. Cross-references

- [`atlasar-fit-addon.md`](atlasar-fit-addon.md), [`atlasar-watch-addon.md`](atlasar-watch-addon.md), [`atlasar-ring-addon.md`](atlasar-ring-addon.md) — sibling addons
- [`prescription-fit-research.md`](prescription-fit-research.md) — research foundation
- [`tensorflowjs-research.md`](tensorflowjs-research.md) — Pose Landmarker model details
