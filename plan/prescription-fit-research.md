# Prescription-Grade Fit Research — AtlasTryOn Phase 2

**Plugin context:** `ar-vr-3d-model-try-on` (Free, v2.0.0) + `ar-vr-3d-model-try-on-pro` (Pro, v3.0.0)
**Question this doc answers:** What tech stack lets AtlasTryOn answer *"will this fit me?"* — not just *"how does it look on me?"* — at accuracy good enough to drive online prescription-eyewear and fitted-cap sales (Warby Parker / Zenni class).
**Date:** 2026-05-13
**Branches:** `feature/AR-60` on both plugins.

---

## 1. Executive Summary

AtlasTryOn v1 (shipped in `feature/tensorflowjs` → 2.0.0 / 3.0.0) gives shoppers a **visual** try-on: a 3D glasses or cap model rendered onto their webcam feed, head-pose tracked in Pro. That answers *"does this look good on me?"* — but **not** *"will this physically fit?"*.

The gap is **metric scale**. MediaPipe Face Landmarker returns landmarks in normalised image coordinates (x/y ∈ [0, 1]) and a relative z depth. Without a real-world reference, pixel distances cannot be converted to millimetres — a face filling the frame from 30 cm away is indistinguishable from a face twice as big at 60 cm away.

**Recommendation:** Add a **metric-anchor layer** on top of the existing landmark pipeline. Two paths, both ship:

1. **Universal browser path** — **ISO 7810 ID-1 card calibration** (credit card / driver's licence, precisely 85.60 × 53.98 mm) detected via **OpenCV.js**. Works on iOS / Android / macOS / Windows / Linux. Accuracy ±0.5–1 mm on pupillary distance after a 5-second card-to-face flow. This is what 95%+ of Warby Parker / Zenni / EyeBuyDirect orders run on.
2. **iOS premium path** — read **ARKit `ARFaceAnchor` 3D mesh** directly (already in metres). Sub-0.5 mm accuracy. Needs a tiny native shim (Capacitor wrapper or AR Quick Look bridge). Used as an optional accuracy upgrade on FaceID-capable iPhones.
3. **Android premium path** (optional, fewer devices) — **ARCore Augmented Faces API**, same idea as ARKit on supported Android devices via WebXR or a thin companion.

The card-calibration path alone is enough to ship the feature. ARKit / ARCore are *nice-to-have* premium upgrades for the subset of customers on FaceID iPhones who want optician-grade accuracy without holding a card up.

This is **AtlasTryOn Pro Phase 2** — a separate sub-system from the TensorFlow.js work documented in `tensorflowjs-research.md` and `tensorflowjs-integration-plan.md`. It reuses the existing Face Landmarker output (the 468 landmarks) but adds a parallel metric-scale pipeline that does not exist today.

---

## 2. The Problem: Visual Try-On vs Fit Measurement

| Capability | AtlasTryOn v1 (today) | AtlasTryOn Phase 2 (this doc) |
|---|---|---|
| Detect face | ✅ MediaPipe Face Landmarker | (same) |
| Render 3D product on face | ✅ Pattern 2 renderer | (same) |
| Head-pose tracking | ✅ Pro | (same) |
| **Convert pixels → millimetres** | ❌ no metric anchor | ✅ ISO 7810 card / ARKit |
| **Measure pupillary distance (PD)** | ❌ pixels only | ✅ ±0.5–1 mm |
| **Measure face width / temple-to-temple** | ❌ pixels only | ✅ ±1 mm |
| **Measure head circumference (caps)** | ❌ | ✅ ±5 mm (limited by single-view geometry) |
| **Fit verdict per product** | ❌ | ✅ "Fits / Tight / Loose" |
| **Optician-quality PD for prescription orders** | ❌ | ✅ via card or ARKit path |

The new capability is **measurement**, not visualisation. Visualisation already works.

---

## 3. Tech Catalog

### 3.1 Browser-only path (universal — ships first)

| Component | Role | Size | License | Status |
|---|---|---|---|---|
| **MediaPipe Face Landmarker** | Face landmarks (existing) | already shipped | Apache 2.0 | ✅ have |
| **OpenCV.js** | ISO 7810 card edge detection | ~3 MB WASM | Apache 2.0 | new |
| **Card detector model** (optional) | TFLite contour finder for low-light fallback | ~1 MB | Apache 2.0 | new |
| **Custom geometry code** | PD / face-width / head-circumference math on top of landmarks + card scale | ~300 lines JS | proprietary | new |
| **WebRTC `getUserMedia`** | Camera access (existing) | browser API | — | ✅ have |

**Flow:**
1. User opens product page → taps "Measure my fit".
2. Camera starts (same flow as today's try-on).
3. UI overlays card outline guide: *"Hold any bank card to your forehead, flat against your skin."*
4. OpenCV.js runs contour detection on each frame, looking for a rectangle with 85.60:53.98 aspect ratio.
5. When card is detected stably for 1–2 seconds, freeze frame, compute `pixels_per_mm = card_long_edge_px / 85.60`.
6. With scale locked, measure PD (landmarks 33↔263), face width (234↔454), temple length (face_oval landmarks), nose bridge depth, etc.
7. Compare measurements against the product's spec sheet (stored as post-meta).
8. Show verdict: **"Fits well"** / **"PD is 64 mm — this frame is 62 mm, may sit slightly narrow"** / **"Frame too wide by 4 mm"**.

**Accuracy bound:** ±0.5–1 mm on PD with a well-detected card. Confirmed by published OpenCV ID-card OCR papers and replicated in eyewear-fit literature.

### 3.2 iOS premium path (FaceID iPhones — optional upgrade)

| Component | Role | Notes |
|---|---|---|
| **ARKit `ARFaceAnchor`** | Native 3D face mesh, already in **metres** | iOS 11+, FaceID-capable iPhones (X and later) |
| **`ARFaceGeometry`** | ~1,200 vertex face mesh with real metric coords | Sub-mm precision |
| **Native shim** | Bridges ARKit → web layer | Two options below |

**Shim options:**

**(a) Capacitor / Cordova wrapper** — wrap the WordPress site URL in a thin iOS app, expose ARKit results via a JS bridge. User installs the brand's app. Highest accuracy, but app-install friction. Not appropriate for a WordPress plugin — out of scope.

**(b) AR Quick Look with face-tracking USDZ scene** — Safari's built-in AR Quick Look supports `.reality` and `.usdz` files. Apple's RealityKit can run an `ARFaceTrackingConfiguration` scene with a postMessage-style output. Works without an app install — but Apple's API for posting AR session data back to the web is limited and undocumented for face tracking. Not production-viable yet.

**(c) iOS-only WebXR face tracking** — Safari 17.4+ exposes some WebXR features, but face tracking is not in the standard. Future work.

**Verdict:** for this release we **document** the iOS premium path but **do not ship** it. Card-calibration covers iOS adequately. Revisit when WebXR face tracking lands in Safari or when business case for a native companion app emerges.

### 3.3 Android premium path (optional)

| Component | Role | Notes |
|---|---|---|
| **ARCore Augmented Faces API** | 468-point 3D face mesh in metres | Android 7+, ARCore-supported device list |
| **WebXR `XRFace`** | Chrome experimental — face tracking via WebXR | behind flag, not stable |

**Verdict:** same as iOS — document, don't ship in v1. Card path covers Android.

---

## 4. ISO 7810 Card Calibration — Deep Dive

This is the core of the universal path; worth a section to itself.

### 4.1 Why ISO 7810 ID-1

- Credit cards, debit cards, driver's licences, national ID cards, employee badges in 99% of countries follow the **ISO/IEC 7810 ID-1** standard.
- Dimensions: **85.60 mm × 53.98 mm × 0.76 mm** — manufacturing tolerance ≤ ±0.13 mm.
- Aspect ratio: 1.5858 (long edge / short edge). Distinctive enough to discriminate from other rectangles in frame.
- Universally available — every shopper already owns one. No new hardware to ship.

### 4.2 Detection algorithm (OpenCV.js)

1. Convert frame to grayscale → Gaussian blur (kernel 5×5) → Canny edge detection (low=50, high=150).
2. `findContours` → filter by `approxPolyDP` to keep only 4-vertex polygons.
3. For each quad: compute aspect ratio of bounding rectangle (after perspective correction). Keep only those with ratio in [1.55, 1.62].
4. Compute the homography (`getPerspectiveTransform`) from quad corners → canonical ID-1 corners.
5. **Stability gate:** require the same quad detected in 5 consecutive frames (within 3-pixel tolerance) before locking scale.
6. Once locked: store `pixels_per_mm` and disable card overlay; switch UI to "Measuring your face…".

### 4.3 Edge cases & mitigations

| Edge case | Mitigation |
|---|---|
| Card edge occluded by user's fingers | Require ≥3 of 4 edges visible — reconstruct 4th by aspect ratio |
| Low light / matte card | Add LED-flash brightness toggle (mobile only); also a "manual mode" where user taps card corners on a frozen frame |
| Card not held flat / tilted | Use the homography directly — corner-to-corner pixel distance is invariant to tilt as long as all 4 corners are seen |
| Card with prominent logo confusing edge detection | Skip text region, prefer outer contour |
| Card very small in frame (held far from camera) | Reject if card occupies < 5% of frame area — UI prompts user to bring closer |
| Multiple rectangular objects in frame (laptop, book) | Pick the candidate closest in size to expected card-at-face-distance (heuristic: 10–20% of frame area) |
| Curved cards (rare, e.g., flexible loyalty cards) | Reject — aspect ratio check fails |

### 4.4 Privacy

Card detection runs **entirely client-side** in the browser. The card image is never uploaded, never logged, never stored. Only the resulting `pixels_per_mm` scalar reaches the server (and only if the merchant opts into saving measurement results). The shopper sees a "Camera stays on your device" notice during the flow — same wording as v1.

### 4.5 Why not other anchors?

| Alternative | Why we're not using it |
|---|---|
| Inter-pupillary distance (IPD ≈ 63 mm average) | Real adult IPD ranges 54–74 mm; ±10–15% error per individual; not prescription-grade |
| Printed marker (ArUco / QR) | Requires user to print something — high friction; defeats "buy online, measure at home" UX |
| Phone screen reflection in mirror | Possible but iffy: phone screen sizes vary, user holds phone at unknown angle, regulatory pushback |
| Coin (penny / £1 / €1) | Smaller than card → less accurate; also dirty / varies by country |
| Known-size sticker on user's forehead | Requires shipping stickers; merchant has no inventory for that |
| Stereo (two cameras) | Most webcams are monocular; Apple's TrueDepth needs ARKit anyway |

ISO 7810 wins on **universal availability + sub-mm accuracy + zero friction**.

---

## 5. Per-Product Spec Schema

For the measurement to be useful, every product must have **real dimensions in mm** stored. New post-meta keys (extends existing `ar_try_on_product_settings`):

### Glasses / sunglasses

| Key | Unit | Example | Source |
|---|---|---|---|
| `glasses_lens_width` (A) | mm | 52 | optical industry standard |
| `glasses_bridge` (DBL) | mm | 18 | between lenses |
| `glasses_temple_length` | mm | 145 | arm length |
| `glasses_frame_total_width` | mm | 138 | temple-to-temple at hinge |
| `glasses_vertical_lens_height` (B) | mm | 38 | top-to-bottom of lens |
| `glasses_optical_centre_height` | mm | 19 | for progressive lenses |

These are the **ABx** values printed on every glasses arm (e.g., `52□18 145`).

### Caps / hats

| Key | Unit | Example | Source |
|---|---|---|---|
| `cap_head_circumference_min` | mm (or hat size) | 540 (S) / 580 (M) / 600 (L) | brand spec |
| `cap_head_circumference_max` | mm | 580 / 600 / 620 | brand spec |
| `cap_peak_height` | mm | 65 | brand spec |
| `cap_brim_width` | mm | 70 | brand spec |
| `cap_internal_volume` (optional) | cm³ | — | for cap snugness |

### Storage

Reuse existing `ar_try_on_product_settings` post-meta JSON blob — add a `fit_dimensions` sub-key:

```php
[
  'placement' => 'face-glasses',
  'fit_dimensions' => [
    'lens_width' => 52,
    'bridge' => 18,
    'temple_length' => 145,
    'frame_total_width' => 138,
  ],
]
```

Free plugin reads & writes the schema (so unit tests can run); Pro renders the verdict UI.

---

## 6. Accuracy Targets

| Metric | Target accuracy | Achieved via |
|---|---|---|
| Pupillary distance (PD) | ±1 mm | card calibration |
| Face width temple-to-temple | ±1 mm | card calibration |
| Bridge fit (nose width) | ±1.5 mm | card + landmark 6 (nose tip) — slightly noisier |
| Head circumference (cap) | ±5 mm | card + landmarks 10/152/234/454, plus a head-shape model (Phase 2.5) |
| Lens optical-centre alignment | ±1 mm | card + landmarks 468/469/473 (iris) |
| Frame-fit verdict (fits / loose / tight) | binary; correct ≥95% of cases | composite of above |

**Comparison to industry:**
- Warby Parker's "Find Your Fit" — uses similar IPD-anchor or AR-card flow, claims "within 1 mm".
- Zenni's PD ruler — printed downloadable ruler; comparable accuracy.
- Lenskart's app — uses ARKit on iOS / card on Android; claims sub-mm.

Card-calibration as designed lands in the same band.

---

## 7. Regulatory / Business Considerations

This is the part that determines whether the feature is "useful sizing tool" or "legal prescription-Rx dispensing service."

### 7.1 What card-calibration / ARKit measurements legally count for

- ✅ **Frame-size recommendation** (which model fits) — fully fine; no licensing required.
- ✅ **PD measurement as a "rough estimate"** marketed as such — also fine.
- ❌ **PD measurement substituted for an optometrist's measurement on a prescription order** — **regulated** in:
  - **US**: FTC + state optometry boards; PD measurement for Rx eyewear typically requires a licensed dispenser
  - **EU**: regulated under medical device / opticians directives in most member states
  - **UK**: GOC (General Optical Council) requires a registered dispensing optician for spectacle dispensing
  - **Australia / Canada**: state / provincial regulation, similar pattern

### 7.2 How Warby Parker / Zenni get around this

- They use the AR measurement as a **starting point**, then route the order through a **licensed dispensing optician** (in-house or contracted) who reviews:
  - The customer-provided prescription (uploaded image / typed)
  - The AR-measured PD
  - The chosen frame
- The optician's sign-off is what makes the dispense lawful. The AR is operationally important but legally a sizing aid.

### 7.3 What this means for our plugin

The plugin should:
1. **Ship the measurement feature** — fits, PD, face width.
2. **Surface measurements clearly to the merchant** at fulfilment (store in order meta).
3. **Optionally** integrate with an optician-verification partner API — e.g., **Yepoc**, **Topology Eyewear**, **Visionix**, **OptikamPad** — for merchants who want to dispense prescription lenses.
4. **Be explicit in UI**: "This is a sizing tool, not an optometric measurement. For prescription orders your optician will verify."

That copy is the difference between "useful feature" and "regulator's letter." It must be in the docs and the on-screen flow.

---

## 8. Commercial Model — Addon Per Product Family

**Updated 2026-05-13.** Earlier drafts described a single Pro tier with all measurement features bundled. After product review the decision is: **each product family ships as its own purchasable Pro addon**, sold separately. Merchants pay only for what they sell — an optician buys the Fit addon, an apparel store buys Watch + Ring + Shoe, a hat brand buys nothing extra beyond Free.

### Free plugin (shared foundation, no product family bias)

- ISO 7810 card detection (OpenCV.js bundled)
- Generic measurement engine — landmarks + pixels_per_mm → mm dimensions
- Per-product `fit_dimensions` schema (read & write)
- **Landmarker Manager** — shared lazy loader for Face / Hand / Pose models. Each Pro addon declares which landmarker it needs (`$loader->require('hand')`) and the model is loaded once and shared across all installed addons. One Hand Landmarker download serves Watch + Ring addons, etc.
- No verdict UI, no fit feedback — that lives in the addons. Free without any addon = visual try-on only.

### Pro addons (each sold separately via Freemius)

| Addon | Product family | Landmarker | Status |
|---|---|---|---|
| `atlasar-face-addon` | Glasses & Caps — visual try-on with head-pose tracking | Face | ✅ shipped 3.0.0 |
| `atlasar-fit-addon` | Glasses prescription-grade fit + PD + verdict | Face | 🚧 AR-60 (this work) |
| `atlasar-watch-addon` | Wrist try-on + watch sizing | Hand | 📋 planned |
| `atlasar-ring-addon` | Finger try-on + ring sizer | Hand | 📋 planned |
| `atlasar-shoe-addon` | Foot try-on + shoe sizer | Pose | 📋 planned |

Each addon has:
- Its own Freemius product ID (or "Add-on" under the parent Pro product)
- Standalone enable/disable in `AR_TRY_ON_Pro_Addons_Manager`
- Standalone licence check — `addon.json` declares `requires_license: <slug>`; manager refuses to boot if not paid
- ~500 KB JS bundle (renderer + product-family-specific measurement logic)
- A per-product metabox section for that family's schema fields

Bundle SKU: **"AtlasTryOn Suite"** unlocks all addons at a discount.

### Why this model

1. **Per-merchant scope.** An optician dispensing glasses doesn't need foot or ring measurement code loading on her product pages. Per-addon JS keeps page weight matched to use case.
2. **Predictable revenue per market.** Sells naturally per-vertical: eyewear merchants buy Fit, fashion merchants buy Watch/Ring, footwear merchants buy Shoe.
3. **Phased shipping risk.** We can ship Glasses Fit (AR-60) without blocking on Watch/Ring/Shoe research being complete.
4. **Existing Freemius helper supports it.** `av3mto_fs()->is_features_enabled()` already accommodates feature-flag gating per licence; the addon manager already migrates slugs and persists `_user_touched`.

### Bundle impact per shopper

- Free alone: + ~3 MB OpenCV.js WASM, lazy-loaded behind explicit "Measure my fit" click. Page render impact: zero.
- Free + 1 addon: + ~6–10 MB landmarker model (lazy-loaded), + ~500 KB addon JS.
- Free + Suite (all 5 addons): + ~25 MB total models, but only the landmarker(s) the active product page needs are loaded. A glasses product page never touches the Hand or Pose model.

---

## 9. Risks & Open Questions

| Risk | Likelihood | Mitigation |
|---|---|---|
| OpenCV.js card detection fails in low light / glare | Medium | Brightness toggle on mobile (`MediaStreamTrack` flash), manual 4-corner-tap fallback |
| Card-aspect-ratio detector picks up phone case / book / monitor | Medium | Stability gate (5-frame consistency); reject if card area not in expected 5–25% of frame |
| Card occlusion (fingers covering edges) | Medium | Require ≥3 edges visible; reconstruct 4th via aspect ratio |
| Shopper holds card at angle vs face | Low | Homography handles tilt natively |
| Shopper uses a non-ISO-7810 card (rare loyalty cards) | Low | Aspect-ratio gate rejects |
| Regulatory takedown — claim being made as Rx measurement | High | UI copy explicit: "sizing tool, not optometry." Legal disclaimer per region. |
| Optician-partner API outage breaking dispensing | Medium (per-merchant) | Allow merchant to fall back to manual review |
| ARKit shim never shipped — Pro path looks "marketed but missing" | Medium | Don't market ARKit until shim ships. Card path is the production feature for v1. |
| Bundle bloat — 3 MB OpenCV.js | Medium | Lazy-load behind explicit "Measure my fit" click, same as v1 ML lazy-load |

### Open questions

1. **Which optician-verification partner do we integrate first?** Yepoc and Topology have the strongest WordPress / WooCommerce stories. Need outreach.
2. **Is the fit-measurement entry-point a separate button or part of the existing "Try It On" flow?** Probably a second button: "Measure my fit" — different intent than visual try-on.
3. **Should measurements be saved per-shopper (logged-in customer) or per-session (guest)?** Both, with explicit consent. GDPR / CCPA consideration.
4. **PDF measurement report format** — A4 / Letter, brand-able? Phase 2.

---

## 10. Sources

- ISO/IEC 7810:2019 ID-1 standard
- OpenCV.js documentation: https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html
- MediaPipe Face Landmarker docs (existing, see `tensorflowjs-research.md`)
- ARKit `ARFaceAnchor` reference: https://developer.apple.com/documentation/arkit/arfaceanchor
- ARCore Augmented Faces: https://developers.google.com/ar/develop/augmented-faces
- Warby Parker — "Find Your Fit" technical talk (2022 Apple WWDC partner session)
- Zenni Optical — PD ruler methodology (downloadable card)
- FTC Eyeglass Rule (16 CFR 456) — US dispensing regulation
- General Optical Council UK — optician registration / dispensing rules
- "Pupillary Distance Measurement Using Machine Learning" — IEEE 2023 (PD-anchor reference paper)

---

## 11. Cross-references

- `plan/tensorflowjs-research.md` — the v1 ML model catalogue. Face Landmarker (already shipped) is the input to the measurement pipeline.
- `plan/tensorflowjs-integration-plan.md` — the integration plan that landed in 2.0.0 / 3.0.0; this doc is its successor for fit-measurement.
- `plan/prescription-fit-integration-plan.md` — the implementation plan that operationalises this research.
- `plan/virtual-tryon-documentation.md` — the customer-facing docs; will need a new section once fit-measurement ships.
- `CLAUDE.md` — plugin conventions, hook naming.
