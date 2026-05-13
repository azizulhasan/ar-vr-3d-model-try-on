# Addon: `atlasar-fit-addon` — Prescription-Grade Glasses Fit

**Status:** 🚧 in development on `feature/AR-60`. Target release: Pro 3.1.0 alongside Free 2.1.0.
**Purpose:** Answer *"will this frame fit me?"* and *"what's my PD?"* at accuracy good enough to drive online prescription-eyewear sales (Warby Parker / Zenni class).
**Companion docs:** [`prescription-fit-research.md`](prescription-fit-research.md) (rationale + tech catalogue), [`prescription-fit-integration-plan.md`](prescription-fit-integration-plan.md) (Free shared foundation).

---

## 1. Pitch (one paragraph)

The shopper opens a glasses product page that has fit dimensions configured. Alongside the existing "Try It On" button they see a second button: **"Measure my fit"**. They tap it, hold any credit card / ID card to their forehead, and the system calibrates pixel-to-millimetre scale from the ISO 7810 reference. It then measures their pupillary distance, face width, and bridge width — and compares those against the frame's spec sheet. The shopper sees: *"PD 64 mm · Frame width 138 mm · **Fits well**"* or *"Frame width 138 mm exceeds your face by 4 mm — may sit wide. Try our medium fit instead →"*. For prescription orders the merchant's admin sees the PD in the WooCommerce order meta and can route it through an optician-verification partner before lenses are cut.

## 2. Tech stack

| Layer | Tech | Source |
|---|---|---|
| Face detection | MediaPipe Face Landmarker | Free Landmarker Manager (shared) |
| Metric anchor | ISO 7810 ID-1 card detection via OpenCV.js (~3 MB WASM) | Free plugin |
| Card-detect algorithm | Canny + findContours → 4-vertex polygon → aspect-ratio gate 1.5858 ± 0.005 → 5-frame stability gate → homography for tilt compensation | Free `fit-card-detector.js` |
| Measurement engine | Landmarks 33/263 (eye centres), 234/454 (cheek), 168 (nose bridge), 10/152 (forehead/chin) + pixels_per_mm scalar | Free `fit-measurement-engine.js` |
| Verdict engine | Composite: PD vs frame DBL, frame_total_width vs face_width, bridge_fit | Pro addon `fit-pro-verdict.js` |
| Multi-metric (Pro) | + temple length, vertical lens centre, optical centre alignment for progressive lenses | Pro addon `fit-pro-measurement-engine.js` |
| PDF report | jsPDF, brandable per merchant | Pro addon `fit-pro-pdf-report.js` |
| Optician verification | Adapter pattern: Yepoc / Topology / manual | Pro addon `fit-pro-optician-*.js` |

## 3. Free plugin contribution (shared foundation, see integration plan)

- `public/js/tryon/fit/fit-bootstrap.js`, `fit-controller.js`, `fit-card-detector.js`, `fit-measurement-engine.js`, `fit-ui.js`
- `public/js/tryon/fit/workers/card-detector.worker.js` (OpenCV.js off main thread)
- `includes/Fit/AR_TRY_ON_Fit.php` — orchestrator
- `includes/Fit/AR_TRY_ON_Fit_Schema.php` — `fit_dimensions` reader/writer
- `includes/Fit/AR_TRY_ON_Fit_Order_Meta.php` — saves shopper measurements per WC order (Free does save; Pro adds richer fields)
- `api/Fit/AR_TRY_ON_Fit_Routes.php` — `/ar_try_on/v1/fit/*` endpoints
- `src/metabox/components/FitDimensionsSection.js` — per-product admin UI for glasses dimensions
- Filters Free exposes for this addon: `atlas_ar_fit_measurement_pipeline`, `atlas_ar_fit_verdict_rules`, `atlas_ar_fit_pdf_report`

## 4. Pro addon files (`addons/atlasar-fit-addon/`)

```
addon.json
addon.php
fit-pro.js                          # entry, registers Pro-only filters
fit-pro.min.js
fit-pro-measurement-engine.js       # multi-metric upgrade
fit-pro-verdict.js                  # advanced verdict logic
fit-pro-pdf-report.js               # jsPDF report
fit-pro-optician-yepoc.js           # partner adapter
fit-pro-optician-topology.js
fit-pro-optician-manual.js          # no-op (admin manual review)
fit-pro-admin-order-widget.js       # WC order admin metabox
fit-pro-styles.css
```

## 5. Per-product schema (`ar_try_on_product_settings.fit_dimensions`)

```json
{
  "fit_dimensions": {
    "type": "glasses",
    "lens_width": 52,
    "bridge": 18,
    "temple_length": 145,
    "frame_total_width": 138,
    "vertical_lens_height": 38,
    "optical_centre_height": 19
  }
}
```

Admin UI is a glasses-specific tab inside the `FitDimensionsSection` React component — auto-shown when `ar_placement === 'face-glasses'`.

## 6. UX flow

1. Glasses product page with `fit_dimensions` populated → "Measure my fit" button visible next to "Try It On".
2. Tap → consent modal, camera permission grant.
3. Card-detection overlay: animated rectangle outline + instruction *"Hold any bank card to your forehead, flat against your skin."*
4. OpenCV.js scans frames; on 5-frame stable detection: freeze, lock `pixels_per_mm`, dismiss card overlay.
5. UI transitions: *"Measuring your face — please look straight at the camera for 3 seconds."*
6. Measurement engine runs landmark sampling across ~30 frames, averages, computes PD / face width / bridge.
7. Verdict shown: PD value, fit badge ("Fits well" / "Slightly narrow" / "Too wide"), optional "see similar fit" CTA.
8. Logged-in shoppers see "Save to my profile" → measurements stored against user; guest checkout stores against the cart / order.
9. Admin sees measurements in WooCommerce → Orders → individual order view (Pro widget).
10. **Optician path:** if merchant has a partner adapter configured, admin clicks "Send to optician" → adapter dispatches order + measurements + uploaded prescription → status flows back into order meta.

## 7. Freemius product

- **Product slug:** `atlasar-fit-addon`
- **Display name:** "AtlasTryOn — Prescription Fit (Glasses)"
- **Pricing:** higher than face addon ($X/year + Y) — premium positioning for opticians, eyewear merchants
- **Licence check:** `$addons_manager->is_addon_licensed('atlasar-fit-addon')`
- **Bundle:** AtlasTryOn Suite includes it

## 8. Accuracy targets

| Metric | Target | Method |
|---|---|---|
| Pupillary distance (PD) | ±1 mm | Card calibration + landmarks 33 / 263 |
| Face width temple-to-temple | ±1 mm | Card + landmarks 234 / 454 |
| Bridge fit | ±1.5 mm | Card + landmark 168 + lens-inner-edge geometry |
| Fit verdict correctness | ≥95% on test set | Composite of above |

## 9. Regulatory copy (mandatory on-screen disclaimer)

> *"AtlasTryOn provides a sizing aid based on a calibration card and your webcam. It is not a substitute for an optician's measurement. For prescription orders your optician will verify all measurements before lenses are cut."*

Wording adjustable per region in plugin settings (`fit_disclaimer_text`).

## 10. Acceptance criteria

- Card detection succeeds within 5 frames in ≥95% of test photos
- PD measurement mean error ≤ 1 mm against a 10-face reference dataset
- Fit verdict matches ground-truth on ≥95% of synthetic dataset
- Free Stable on the OpenCV.js bundle — lazy-load < 3 MB, no main-thread jank
- Yepoc sandbox round-trip works end-to-end
- GDPR consent flow blocks measurement save without explicit opt-in
- Regulatory disclaimer renders on every measurement flow start

## 11. Cross-references

- [`prescription-fit-research.md`](prescription-fit-research.md) — research dossier
- [`prescription-fit-integration-plan.md`](prescription-fit-integration-plan.md) — shared foundation plan
- [`atlasar-face-addon.md`](atlasar-face-addon.md) — predecessor addon (visual try-on)
- [`atlasar-watch-addon.md`](atlasar-watch-addon.md), [`atlasar-ring-addon.md`](atlasar-ring-addon.md), [`atlasar-shoe-addon.md`](atlasar-shoe-addon.md) — sibling addons reusing the same metric-anchor layer
