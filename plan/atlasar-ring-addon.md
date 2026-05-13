# Addon: `atlasar-ring-addon` — Finger Try-On & Ring Sizer

**Status:** 📋 planned. Target release: Pro 3.3.0 (after Watch addon, since both share the Hand Landmarker).
**Purpose:** Let shoppers see a ring on their own finger via webcam + accurate ring-size verdict.

---

## 1. Pitch (one paragraph)

The shopper opens a ring product page, taps **"Try it on my finger"**, and selects which finger (default: ring finger). They hold their hand to the webcam and the ring is rendered on the selected finger, scaled to that finger's width. For sizing, they hold a card next to their hand — the system measures finger circumference at the second knuckle and reports the ring size (US / EU / UK). Comparable to James Allen, Blue Nile, Mejuri, Cartier's online ring sizer.

## 2. Tech stack

| Layer | Tech | Source |
|---|---|---|
| Hand detection | MediaPipe Hand Landmarker | Free Landmarker Manager (shared with Watch addon) |
| Metric anchor | ISO 7810 card calibration | Free (shared) |
| Finger measurement | Per-finger pairs of landmarks: ring finger = 13, 14, 15 + thumb-side knuckle 13a → diameter in mm at second knuckle | Pro addon `ring-pro-measurement-engine.js` |
| Renderer | three.js overlay anchored to selected finger joint | Pro addon `ring-pro-renderer.js` |
| Ring-size conversion | Standard tables (US ↔ EU ↔ UK ↔ JP ↔ mm) | Pro addon `ring-pro-size-tables.js` |

## 3. Free plugin contribution

After AR-60 + Watch addon ship, the Free plugin already has:
- Hand Landmarker via shared loader
- Card calibration
- `fit_dimensions` schema

This addon adds:
- New `ar_placement` option: `'hand-ring'`
- New schema key: `fit_dimensions.type = 'ring'` with `inner_diameter_mm`, `ring_size_us / eu / uk`, `band_width`
- New `FitDimensionsSection.js` tab for ring dimensions
- Optional shopper-side finger profile: saved finger sizes per logged-in user

## 4. Pro addon files (`addons/atlasar-ring-addon/`)

```
addon.json
addon.php
ring-pro.js                        # entry
ring-pro.min.js
ring-pro-renderer.js               # ring on finger overlay
ring-pro-anchor.js                 # finger landmark → 3D anchor
ring-pro-measurement-engine.js     # finger diameter at second knuckle
ring-pro-size-tables.js            # US/EU/UK/JP conversion
ring-pro-finger-picker.js          # UI to pick which finger
ring-pro-styles.css
```

## 5. Per-product schema

```json
{
  "fit_dimensions": {
    "type": "ring",
    "inner_diameter_mm": 17.3,
    "ring_size_us": 7,
    "ring_size_eu": 54,
    "ring_size_uk": "N",
    "band_width": 4,
    "is_resizable": true
  }
}
```

## 6. UX flow

1. Ring product page → **"Try it on my finger"** button.
2. Finger picker: thumbnail showing ring-finger / middle / index / pinky.
3. Camera grant, fullscreen modal.
4. Instruction: *"Hold your hand flat to the camera with your fingers spread."*
5. Hand Landmarker locks onto hand; ring renders on selected finger.
6. Shopper rotates hand — ring tracks.
7. **Sizing path:** "Get my exact size" → card calibration sub-flow → measure finger diameter at second knuckle → output ring size in user's preferred system (auto-detected from store locale).
8. Verdict: "Your size is US 7 — this ring is US 7 · **Perfect fit**", or "Your size is US 7 — this ring is US 6, **half a size too small**".

## 7. Freemius product

- **Product slug:** `atlasar-ring-addon`
- **Display name:** "AtlasTryOn — Rings"
- **Pricing:** mid-tier (similar to Watch)
- **Bundle:** AtlasTryOn Suite

## 8. Accuracy targets

| Metric | Target | Method |
|---|---|---|
| Finger diameter at second knuckle | ±0.3 mm | Card-anchored landmarks 13–15 (or selected finger triplet) |
| Ring-size verdict | ±0.5 size | Diameter → standard ring-size tables |
| Visual placement | < 3 mm misalignment | Hand-landmark accuracy |

±0.5 size matches the industry standard for online ring-sizing tools. Higher accuracy needs a physical ring sizer.

## 9. Commercial parallels

- **James Allen** — "Find Your Ring Size" (printable sizer + AR)
- **Blue Nile** — Ring sizer AR
- **Mejuri** — App + AR ring try-on
- **Cartier** — Online ring sizer (no AR but uses webcam-card calibration)
- **Tiffany** — In-app ring try-on (iOS / Android)

## 10. Acceptance criteria

- Finger picker works (defaults to ring finger; user can change)
- Ring renders on selected finger across all 4 main fingers
- Sizing verdict within ±0.5 ring size on reference set
- Locale-aware size system (US / EU / UK / JP auto-detected, manually changeable)
- Co-existence with Watch addon: if both active, both render on the same hand simultaneously

## 11. Open questions

1. **Multiple rings stacked** — does the renderer support 2+ rings on different fingers? Phase 2.
2. **Resizable rings** — flag `is_resizable: true` shows softer verdict copy ("can be resized half a size"). Confirm with jewellery merchants.
3. **Engagement-ring specific UX** — many sites have a separate "size both partners" flow. Out of scope for v1.

## 12. Cross-references

- [`atlasar-watch-addon.md`](atlasar-watch-addon.md) — sister addon, same Hand Landmarker
- [`atlasar-fit-addon.md`](atlasar-fit-addon.md) — same metric-anchor layer
- [`prescription-fit-research.md`](prescription-fit-research.md) — research foundation
- [`tensorflowjs-research.md`](tensorflowjs-research.md) — Hand Landmarker model details
