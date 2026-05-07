# Auto-Fit Roadmap — Snapchat-style "click and it just fits"

**Goal:** when a shopper clicks "Try it on", the accessory snaps onto
their face / head with zero manual calibration — like Snapchat's
lens library.

**Why we don't have it today:** Snap controls authoring end-to-end via
Lens Studio. Every lens is exported in MediaPipe's canonical face-mesh
coordinate space (origin, axes, scale standardized at author time).
We let merchants upload arbitrary GLBs from Sketchfab / poly.pizza /
suppliers — each with random origin, axis convention, and unit scale.
Without canonical reference, we can't deterministically map a GLB
feature to a face landmark.

This document is a phased path from "manual calibration sliders" to
"auto-fit on first paint" — without owning the whole authoring
pipeline.

---

## Phase A — Auto-bbox normalize on GLB upload (recommended first)

**Cost:** ~150 LOC across 3 files (PHP upload hook, metabox subtype
select, renderer preset table). 1 day.

**What it does:** at metabox save time (or first front-end render),
analyse the GLB:
1. Compute bounding-box center → translate origin to bbox center
2. Detect dominant axis (X widest = "Y-up face-forward" assumption,
   else flag for manual rotate)
3. Scale to a known reference (glasses ≈ 14 cm wide, hat ≈ 18 cm wide)
4. Persist resulting transform into `ar_try_on_product_settings`
5. Renderer reads the persisted transform; calibration sliders
   become a fine-tune layer on top of an already-close starting point

**Win:** ~70 % of stock GLBs now look acceptable without any slider
tweaking. Calibration sliders go from "mandatory" to "occasional".

**Files:**
- `includes/AR_TRY_ON_Tryon.php` — new `analyse_glb()` static (call on
  metabox save / GLB attachment change)
- `addons/atlasar-face-addon/tryon-pro-renderer.js` — read persisted
  transform, apply before calibration overrides
- React metabox — show analysis result + "re-analyse" button

---

## Phase B — Category sub-type dropdown + preset table

**Cost:** ~80 LOC, half a day.

**What it does:** add a "Style" dropdown next to the `ar_placement`
field. For glasses: `aviator | wayfarer | round | rectangular`. For
hats: `top-hat | baseball-cap | beanie | bucket-hat`. Each preset
ships with a hard-coded calibration offset / scale / rotation that
fits the average GLB of that style.

**Win:** merchant picks the style — values seed automatically. With
Phase A already running, picking the right style usually is enough.

**Files:**
- `src/metabox/components/ContentSection.js` — new dropdown
- `addons/atlasar-face-addon/tryon-pro-renderer.js` — preset lookup
- `includes/AR_TRY_ON_Tryon.php` — preset constants

---

## Phase C — Synthetic-head auto-fit at upload time (NEW headline phase)

**Cost:** ~250–300 LOC, 2–3 days.

This is the **"render-against-static-image-and-measure-fitness"** idea.
Replaces the older runtime "auto-calibrate button" plan — it's the
SAME optimisation, just done **once at GLB upload** instead of on every
shopper's webcam, so shopper-side cost is zero and results cache
forever in post meta.

**What it does:**
1. Ship a small set of **synthetic head reference images** under
   `public/img/auto-fit/` — front-facing canonical face renders with
   pre-computed MediaPipe landmarks for each (one for `face`, one for
   `face-hat`, more if needed). Bundled, no network fetch.
2. On GLB upload (or admin "auto-fit" trigger), the Pro renderer:
   - Loads the GLB into the off-screen WebGL renderer
   - Loads the synthetic head image as a background plane
   - Picks initial calibration from Phase A (bbox-normalize) + Phase B
     (style preset)
   - Computes a **fitness score** = sum of squared distances between:
       * GLB feature anchor (e.g., topmost vertex of front face = bridge)
       * Target landmark on the synthetic head (landmark 168 etc)
       * Plus auxiliary matches: outer eye corners ↔ frame outer
         corners, etc. (per-style detectors from Phase B)
   - Iterates calibration values (offsetX/Y/Z, scale, rotationY/X)
     in a small gradient / grid search until the fitness score plateaus
     (~50–100 iterations, ~300 ms total)
   - Saves the final calibration into
     `ar_try_on_product_settings.tryon_calibration`

3. Merchant sees a one-shot "Auto-fit running…" toast, then the
   calibration sliders move to the optimised values. Manual tweaks
   still possible afterwards.

**Why upload-time and not runtime:**
- Runs once per GLB, not per shopper session — cheaper at scale
- Deterministic — every shopper gets the same (calibrated) experience
- Doesn't depend on the shopper's webcam quality / lighting / head shape
- Results live in post meta — survive cache flushes / CDN swaps

**Why per-style feature extractor (depends on Phase B):**
- "Bridge of glasses" = GLB-shape-specific landmark
- For aviators we know the bridge is between the two lenses
- For wayfarers same; for round it's narrower
- For top-hat the brim front is the anchor; for baseball cap it's the
  visor bottom-front
- Cleanest is a per-style "feature locator" function — runs over the
  GLB once, returns the 3D point that should map to the named face
  landmark

**Coverage estimate (combined with Phase A + B):**
- Phase A only: ~70 % acceptable on first paint
- Phase A + B: ~85 %
- Phase A + B + C: ~95 % — Snap-like for the vast majority of GLBs

**Files (new):**
- `public/img/auto-fit/face-front.png` + `.json` (landmarks)
- `public/img/auto-fit/face-front-hat.png` + `.json`
- `addons/atlasar-face-addon/tryon-pro-autofit.js` — fitness loop
- `addons/atlasar-face-addon/tryon-pro-feature-locators.js` — per-style
  "find-the-bridge / find-the-brim" functions

**Files (modified):**
- `addons/atlasar-face-addon/addon.php` — REST endpoint that triggers
  auto-fit and writes the result into post meta
- `addons/atlasar-face-addon/tryon-pro-calibrator.js` — "Auto-fit"
  button next to "Save"

**Limitations:**
- Synthetic head ≠ real face (lighting, skin tone, head shape variation)
  — so accurate to ~90 % not 100 %; merchant fine-tunes the rest with
  the calibration panel for outliers
- Per-style locators must exist for each subtype — adding a new style
  requires a small JS edit (or community-contributed locator)

---

## Phase D — Blender / glTF authoring template (parallel, low cost)

**Cost:** ~1 day artist time + a docs page.

**What it does:** provide a Blender file with the canonical MediaPipe
face mesh imported and visible. Artists / merchants drop their
accessory in, align by eye, export. The exported GLB is calibration-
ready and Phase A / B / C all converge to identity transform on it.

**Win:** opt-in path for merchants who do their own 3D. Output is
zero-config from day one.

---

## Phase E — Curated catalog (revenue stream)

**Cost:** product / business decision. Engineering effort modest
(catalog hosting, license check). Time-to-market depends on artist
/ asset acquisition, not code.

**What it does:** ship / sell a library of pre-calibrated GLBs. Each
asset shipped with a `tryon_calibration` stub baked in by us (using
the same Phase C pipeline run by us, not the merchant). Merchant
selects from catalog UI, accessory works zero-tune. Optional Pro tier
or per-asset purchase.

**Win:** Snap-style experience for the subset of products from the
catalog. Margin opportunity. Reduces merchant support load.

---

## Phase A + B combined — implementation plan (review before coding)

Ship together as one feature: GLB analysis runs at save, style dropdown
seeds the calibration. ~230 LOC, 1.5 days.

### UI changes (merchant — Edit Product page → AtlasAR metabox)

Existing layout today:
```
AR Placements / Product Type:  [ Floor / Wall / Face — Glasses / Face — Hat ]
[ ] Also show static 3D viewer on the product page
[ Upload 3D Model: pick .glb file ]
```

After A + B (additions in **bold**, existing rows kept):
```
AR Placements / Product Type:  [ Floor / Wall / Face — Glasses / Face — Hat ]
**Style (subtype):              [ — / Aviator / Wayfarer / Round / Rectangular  for glasses ]**
**                              [ — / Top hat / Baseball cap / Beanie / Bucket hat for hats ]**
[ ] Also show static 3D viewer on the product page
[ Upload 3D Model: pick .glb file ]
**────────────────────────────────────────**
**Auto-fit analysis           [ ✓ Analysed ]   [ Re-analyse ]**
**  GLB bbox center:          ( -0.012, 0.041, 0.003 )**
**  Detected axis convention: Y-up face-forward**
**  Suggested base scale:     1.0  (target width 14 cm)**
**  Style preset applied:     Aviator → offsetY -0.02 / scale 1.05**
```

The "Auto-fit analysis" block is read-only — merchant sees that the
plugin understood the GLB. "Re-analyse" button re-runs the analysis
(useful after replacing the GLB).

### UI changes (front-end live calibration panel — Pro)

No layout change. The 7 existing sliders still work. They now START
with the values seeded by Phase A (bbox-normalized) + Phase B (style
preset). Merchant who's happy with the auto-fit doesn't need to drag
anything; merchant who wants to tweak does so as before.

### Existing code changes

#### Free plugin

| File | Change |
|---|---|
| `includes/AR_TRY_ON_Tryon.php` | New `analyse_glb_at_url($url)` static. Loads the .glb server-side via guzzle / wp_remote_get, parses the binary glTF chunk to read accessor mins/maxes (no full geometry load — just bbox), returns `{center, size, axis_dominant, suggested_scale}`. ~80 LOC. |
| `includes/AR_TRY_ON_Tryon.php` | New `get_subtype_preset($placement, $subtype)` static. Lookup table → calibration sub-key. ~40 LOC. |
| `includes/AR_TRY_ON_Tryon.php` | New `compute_initial_calibration($post_id)` static. Combines A's `analyse_glb_at_url` output with B's preset. Writes into `ar_try_on_product_settings.tryon_calibration` if currently empty (doesn't overwrite a merchant's manual tweaks). ~30 LOC. |
| `api/AR_TRY_ON_Api_Routes.php` | Existing `/get_model_and_settings` POST handler (which writes `ar_try_on_product_settings`) — call `compute_initial_calibration()` after save when placement is face-* and `tryon_calibration` is unset. ~5 LOC. |
| `src/metabox/components/ContentSection.js` | Add Style dropdown (visible only when `ar_placement` starts with `face-`). On change → updates `productModel.tryon_subtype`, persists via existing save. ~30 LOC. |
| `src/metabox/components/ContentSection.js` | Add Auto-fit analysis read-only card with Re-analyse button. Re-analyse fires REST `/tryon/auto-fit` (POST, admin only). ~40 LOC. |

#### Pro plugin

No required Pro change for A+B. Phase C will need Pro work; A+B live
entirely in Free.

### Storage

- `ar_try_on_product_settings.tryon_subtype` (NEW string sub-key, e.g.
  `"aviator"`)
- `ar_try_on_product_settings.tryon_calibration` (existing — seeded
  if empty, untouched if merchant has tuned it)
- `ar_try_on_product_settings.tryon_glb_analysis` (NEW small array:
  bbox center / size / axis / detected-at timestamp — for the
  read-only metabox card)

### Backward compatibility

- Existing products keep working. If `tryon_subtype` is unset → renderer
  falls back to current generic baseline (no preset).
- Existing `tryon_calibration` values are NEVER overwritten by the
  Phase A+B auto-seed — only seeded when calibration is empty.
- No new post meta keys outside `ar_try_on_product_settings`.

### Acceptance test

1. Upload a NEW Aviator GLB to a glasses product → save
2. Front-end: open Try-On → glasses appear roughly on eyes without any
   calibration sliders touched
3. Manual nudge via panel still works
4. Pre-existing products unchanged (tryon_calibration not overwritten)

---

## Recommended order

1. **Phase A** — auto-bbox normalize. Biggest UX uplift per LOC.
   Helps every GLB the merchant uploads tomorrow without forcing them
   to do anything new. **1 day.**
2. **Phase B** — category preset dropdown. Stacks on A. Merchant picks
   "Aviator" → values are right. **0.5 day.**
3. **Phase C** — synthetic-head auto-fit at upload time. The headline
   feature. Stacks on A+B (uses bbox-normalize as init, uses category
   preset to pick the feature locator). **2–3 days.**
4. **Phase D** — authoring template. Parallel; cheap; nice-to-have.
   **1 day.**
5. **Phase E** — curated catalog. Only when business case justifies.
   Multi-week non-engineering work.

**Start: Phase A.** Without it, Phase C's optimiser starts from a
random transform and may fail to converge. Phase A gives a solid
initial point so C just polishes the last 10–20 %.

**Combined A + B + C target:** ~95 % of merchant GLBs require zero
manual calibration. The remaining 5 % stay tunable via the existing
front-end calibration panel (already shipped).
