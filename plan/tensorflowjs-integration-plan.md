# TensorFlow.js Integration Plan — AR Try-On Plugin

**Plugins:** `ar-vr-3d-model-try-on` (free v1.9.0) + `ar-vr-3d-model-try-on-pro` (Pro v2.1.0)
**Branch:** `feature/tensorflowjs` on both
**Decision basis:** [tensorflowjs-research.md](./tensorflowjs-research.md) — recommendation is **integrate into existing plugin pair** (not build a new sibling).
**Date:** 2026-05-06

---

## 0. Why This Is an Integration, Not a New Plugin

The earlier Smart Local Vision plan (now obsolete) recommended a new sibling plugin because Smart Local AI uses Transformers.js / ONNX and adding TF.js would have caused runtime conflicts. **That logic does not apply here.** The AR try-on plugin currently uses:

- `<model-viewer>` web component (pre-built, includes own three.js)
- `three.js` only for offline / build-time compression
- No ML runtime at all

So adding TF.js + MediaPipe is greenfield — no conflicting tensor stack, no double WASM. Plus, **the Pro plugin already has a Face addon and a Hand addon** with the right hook points (`atlasar_model_viewer_hotspots`, `atlasar_before_model_viewer`). Those addons currently emit placeholder hotspots at fixed coords — they want real landmark data.

---

## 1. Naming Conventions (existing — do not invent new)

Captured from the plugin's actual code, mirroring this plan to its host plugin's conventions.

| Element | Free | Pro |
|---|---|---|
| Plugin slug | `ar-vr-3d-model-try-on` | `ar-vr-3d-model-try-on-premium` (Pro folder slug: `ar-vr-3d-model-try-on-pro`) |
| Text domain | `ar-vr-3d-model-try-on` | `ar-vr-3d-model-try-on-premium` |
| Composer namespace | `AR_TRY_ON\` (`includes`), `AR_TRY_ON_Admin\` (`admin`), `AR_TRY_ON_Public\` (`public`), `ATLAS_AR_API\` (`api`) | `AR_TRY_ON_Pro\` (`Includes`, capitalized), `AR_TRY_ON_Pro_Api\` (`Api`) |
| Function prefix | `atlas_ar_` | `atlas_ar_pro_` (or `atlasar_` for shared addon hooks) |
| Constant prefix | `ATLAS_AR_` | `ATLAS_AR_PRO_` |
| REST namespace | `ar_try_on/v1` | `ar_try_on_pro/v1` |
| Tailwind prefix | `art-` | (Pro uses Free's CSS) |
| Freemius product ID | 18159 (shared with Pro) | 18159 |
| Freemius helper | `av3mto_fs()` | `av3mto_fs()` |
| 3D viewer | `<model-viewer>` web component | (same; Pro extends via hooks) |
| Existing addon system | — | `addons/<slug>/{addon.json, addon.php}` |
| Existing addon hooks | `atlasar_model_viewer_hotspots` (filter), `atlasar_before_model_viewer` (action) | (same — used by addons) |

---

## 2. Existing Architecture Recap (relevant excerpt)

From deep mapping. Full detail in research doc §4.

- **Free `includes/`** — `AR_TRY_ON.php` (orchestrator), `AR_TRY_ON_Loader.php` (hook registry), `AR_TRY_ON_Activator.php`, `AR_TRY_ON_Helper.php`, `AR_TRY_ON_Hooks.php`, `AR_TRY_ON_Compression.php` (offline pipeline), `AR_TRY_ON_Lib_AtlasAiDev.php`.
- **Free `public/`** — `AR_TRY_ON_Public.php` enqueues, `public/js/AtlasAR.js` is the main client class (line 563 queries `<model-viewer>`), `public/js/google-model-viewer.js` (~960 KB, the web component itself), `public/js/variation-handler.js` (WC), `public/js/lazy-load-model-viewer.js`.
- **Free `api/`** — `AR_TRY_ON_Api_Routes.php`, namespace `ar_try_on/v1`, routes `/settings`, `/get_model_and_settings`, `/demo_preview`, `/generate_3d_model`. `AR_TRY_ON_Compression_Routes.php` for compression endpoints.
- **Free admin** — React dashboard under `src/dashboard/` and React metabox under `src/metabox/`, built via Laravel Mix.
- **Pro `Includes/`** — `AR_TRY_ON_Pro_Hooks.php` delegates to `AR_TRY_ON_Pro_Filters.php` (overrides `ATLAS_AR_version`, `ATLAS_AR_plugin_name`) + `AR_TRY_ON_Pro_Actions.php` (enqueues Pro scripts). `AR_TRY_ON_Pro_Addons_Manager.php` runs the addon system.
- **Pro `addons/`** — `atlasar-face-addon/` (Face Feature Addon, slug `face-feature-addon`, features `face-hotspots` + `face-mask-fit`), `atlasar-hand-addon/`. Both currently inject placeholder hotspots, no real tracking.
- **Pro `Assets/js/`** — `ar-vr-3d-model-try-on-premium.js`, `ar-try-on-face.js` (loaded as ES module per `Actions.php:40`), `addons-admin.js`.
- **Build** — Laravel Mix (`webpack.mix.js`) + Gulp (release/zip tasks). React for admin only; public is vanilla JS.

---

## 3. Implementation Plan — Free Plugin

### 3.1 New files

```
ar-vr-3d-model-try-on/
  includes/
    AR_TRY_ON_Tryon.php              # Class — settings storage, asset enqueue gate, hooks for Pro extension
    AR_TRY_ON_Tryon_Hooks.php        # Filter/action hook definitions exposed to Pro

  public/js/tryon/
    tryon-bootstrap.js               # Lazy entry — only loaded after user click "Try It On"
    tryon-controller.js              # Coordinates webcam → worker → model-viewer anchor updates
    tryon-ui.js                      # Modal UI: webcam grant, switching front/back camera, snapshot button
    tryon-anchors.js                 # Face landmark → 3D world coord mapping (glasses, hat, earrings)
    workers/
      face-landmarker.worker.js      # MediaPipe Face Landmarker in Web Worker

  public/css/
    tryon.css                        # Modal + overlay styles (Tailwind compiled, prefix art-)

  public/models/                      # Self-hosted model weights (opt-in Free, default Pro)
    face_landmarker.task             # ~3 MB
    .gitkeep

  api/
    AR_TRY_ON_Tryon_Routes.php       # REST: /tryon/config (GET), /tryon/snapshot (POST)
```

### 3.2 Modified files

```
ar-vr-3d-model-try-on.php
  + add 'use AR_TRY_ON\AR_TRY_ON_Tryon'
  + register in main loader after Compression init

includes/AR_TRY_ON.php
  + new $tryon = new AR_TRY_ON_Tryon($loader); registered in run()

includes/AR_TRY_ON_Helper.php
  + atlas_ar_tryon_default_settings() static
  + atlas_ar_tryon_is_supported() — checks browser + secure context

webpack.mix.js
  + entry public/js/tryon/tryon-bootstrap.js → public/js/build/tryon-bootstrap.dist.js
  + entry public/js/tryon/workers/face-landmarker.worker.js → workers/face-landmarker.worker.dist.js (worker target)

src/tailwind.css → compiled to public/css/tryon.css
  + new component styles for try-on modal (.art-tryon-* classes)

src/dashboard/   (React)
  + new tab "Try-On" with toggles: enable/disable, default mode (face/auto), snapshot enabled
  + reuse existing settings REST API; add atlas_ar_tryon_settings option

admin/AR_TRY_ON_Admin.php
  + enqueue dashboard React build (no change — existing dashboard handles new tab via React)

readme.txt
  + new feature section "Virtual Try-On"
  + bumped tested-up-to + version

api/AR_TRY_ON_Api_Routes.php
  + register AR_TRY_ON_Tryon_Routes in rest_api_init
```

### 3.3 New filter / action hooks Free MUST expose for Pro extension

Mirror of how `atlasar_model_viewer_hotspots` works today, but for the tracking layer:

| Hook | Type | Purpose |
|---|---|---|
| `atlas_ar_tryon_modes` | filter | Pro adds `hand`, `pose`, `makeup` modes to the default `face` mode |
| `atlas_ar_tryon_models` | filter | Pro registers Hand / Pose model URLs |
| `atlas_ar_tryon_anchor_strategy` | filter | Pro provides per-product anchor calibration overrides |
| `atlas_ar_tryon_pre_render` | action | Pro injects extra UI (calibration handles, blendshape overlays) |
| `atlas_ar_tryon_post_render` | action | Pro adds analytics beacon, snapshot watermark |
| `atlas_ar_tryon_woocommerce_mode_for_product` | filter | Pro maps WC product category → tracking mode |
| `atlas_ar_tryon_landmark_pipeline` | filter | Pro can swap default mapping for custom (e.g., earrings layout) |
| `atlas_ar_tryon_segmentation_enabled` | filter | Pro enables Selfie Segmentation overlay |
| `atlas_ar_tryon_export_formats` | filter | Pro adds GIF + branded watermark |
| `atlas_ar_tryon_session_recorded` | action | Pro pipes session metadata into AtlasAiDev Insights for analytics |

### 3.4 Free settings (added to existing `atlas_ar_settings` option)

```php
$defaults = array(
  'tryon_enabled'       => true,
  'tryon_mode'          => 'face',          // face | auto (Pro: hand, pose, makeup)
  'tryon_self_host'     => false,           // self-host MediaPipe weights
  'tryon_snapshot'      => true,
  'tryon_button_label'  => 'Try It On',
  'tryon_consent_text'  => 'Allow camera access to try this on virtually...',
);
```

### 3.5 v1 free capability (face only)

- Glasses / sunglasses anchored to nose-bridge + eye landmarks
- Hats / caps anchored to forehead + head transformation matrix
- Single-face tracking
- Front-camera only
- Snapshot capture (PNG download)
- WebGL backend with WebGPU upgrade when supported

---

## 4. Implementation Plan — Pro Plugin

### 4.1 Replace placeholders in existing addons

The Pro plugin already has scaffolded Face and Hand addons. Replace the placeholder hotspot data with real MediaPipe landmark wiring.

```
ar-vr-3d-model-try-on-pro/
  addons/
    atlasar-face-addon/
      addon.json               # add features: face-blendshapes, face-makeup, face-occlusion
      addon.php                # REWRITE — wire to atlas_ar_tryon_landmark_pipeline filter
    atlasar-hand-addon/
      addon.json               # add features: hand-tracking, ring-fitting, watch-fitting
      addon.php                # REWRITE — register hand mode via atlas_ar_tryon_modes
```

### 4.2 New addons (post-v1)

```
addons/
  atlasar-pose-addon/          # NEW — clothing try-on
    addon.json
    addon.php
  atlasar-makeup-addon/        # NEW — lipstick / eyeshadow / blush
    addon.json
    addon.php
  atlasar-segmentation-addon/  # NEW — background replace, hair recolor
    addon.json
    addon.php
```

### 4.3 New Pro public assets

```
ar-vr-3d-model-try-on-pro/
  Assets/js/tryon-pro/
    pro-bootstrap.js                   # Loaded after Free's tryon-bootstrap, augments controller
    pro-anchors-hand.js                # Hand landmark → ring/watch anchor logic
    pro-anchors-pose.js                # Pose landmark → outfit anchor logic
    pro-makeup-renderer.js             # Image-segmenter-driven makeup overlay
    pro-segmentation.js                # Selfie Segmentation occlusion mask
    workers/
      hand-landmarker.worker.js
      pose-landmarker.worker.js
      image-segmenter.worker.js

  Assets/css/
    tryon-pro.css                      # additional Pro UI styles
    tryon-calibration.css              # Per-product anchor calibration UI

  Assets/models/
    hand_landmarker.task               # ~6 MB
    pose_landmarker_lite.task          # ~6 MB
    selfie_segmenter.tflite            # ~1 MB

  Includes/
    AR_TRY_ON_Pro_Tryon.php            # Pro extension class — registers all new addons + hooks Free filters
    AR_TRY_ON_Pro_Tryon_Calibration.php # Per-product calibration storage + REST
```

### 4.4 Pro hooks Free's filters

```php
// Inside AR_TRY_ON_Pro_Tryon::__construct()

add_filter('atlas_ar_tryon_modes', function($modes) {
  $modes[] = 'hand';
  $modes[] = 'pose';
  $modes[] = 'makeup';
  return $modes;
});

add_filter('atlas_ar_tryon_models', function($models) {
  $models['hand']  = ATLAS_AR_PRO_URL . 'Assets/models/hand_landmarker.task';
  $models['pose']  = ATLAS_AR_PRO_URL . 'Assets/models/pose_landmarker_lite.task';
  $models['segmenter'] = ATLAS_AR_PRO_URL . 'Assets/models/selfie_segmenter.tflite';
  return $models;
});

add_filter('atlas_ar_tryon_woocommerce_mode_for_product', function($mode, $product_id) {
  $cats = wp_get_post_terms($product_id, 'product_cat', array('fields' => 'slugs'));
  if (array_intersect($cats, ['eyewear', 'sunglasses', 'glasses'])) return 'face';
  if (array_intersect($cats, ['watches', 'rings', 'bracelets', 'jewelry-hand'])) return 'hand';
  if (array_intersect($cats, ['shirts', 'pants', 'dresses', 'apparel'])) return 'pose';
  if (array_intersect($cats, ['lipstick', 'cosmetics', 'makeup'])) return 'makeup';
  return $mode;
}, 10, 2);

add_action('atlas_ar_tryon_pre_render', function($product_id, $mode) {
  // Inject calibration handles for merchant-configured anchors
});
```

### 4.5 New Pro REST endpoints (`ar_try_on_pro/v1`)

| Path | Method | Purpose |
|---|---|---|
| `/tryon/calibration/<product_id>` | GET, POST | Read/write per-product anchor offsets |
| `/tryon/analytics/session` | POST | Beacon for try-on session start/end (used by Insights) |
| `/tryon/snapshot/branded` | POST | Generate watermarked snapshot |
| `/tryon/share` | POST | Build shareable link (saved to media library, returns URL) |

### 4.6 Per-product calibration UI (Pro)

In the existing product metabox (Pro extends Free's metabox via `atlas_ar_before_metabox_content` action):

- New "Try-On Calibration" tab inside metabox
- Live preview using the merchant's webcam
- Drag-to-adjust handles for the 3D model anchor on a sample face/hand/pose
- Saves to `_atlas_ar_tryon_calibration_<product_id>` post meta (consumed by `atlas_ar_tryon_anchor_strategy` filter)

---

## 5. Roadmap

### Phase 0 — Branches + scaffolding (week 1)
- [x] `feature/tensorflowjs` on both plugins
- [ ] Add npm deps to Free `package.json`: `@tensorflow/tfjs-core`, `@tensorflow/tfjs-backend-webgl`, `@mediapipe/tasks-vision`
- [ ] Add npm deps to Pro `package.json`: same as Free + nothing extra (Pro reuses Free's runtime)
- [ ] Webpack/Mix config for Web Worker entries
- [ ] Decide self-host vs CDN for model weights (recommendation: bundle in Pro, opt-in Free)

### Phase 1 — Free face try-on MVP (weeks 2–3)
- [ ] `AR_TRY_ON_Tryon.php` class + REST routes
- [ ] `face-landmarker.worker.js` + IndexedDB cache
- [ ] `tryon-controller.js` driving `<model-viewer>` via Pattern 1 from research §3.1
- [ ] Modal UI: consent → webcam grant → live preview → "Try It On" button on product page
- [ ] WooCommerce integration: render button conditionally per atlas_ar_should_load_button filter
- [ ] Snapshot capture
- [ ] Settings tab in dashboard React app
- [ ] readme.txt update

### Phase 2 — Pro face addon real tracking (weeks 4–5)
- [ ] Rewrite `addons/atlasar-face-addon/addon.php` — replace placeholder hotspots with real landmark-driven anchors
- [ ] Add `face-blendshapes`, `face-makeup`, `face-occlusion` to addon.json features
- [ ] Per-product calibration UI in metabox
- [ ] Snapshot watermark
- [ ] Multi-face support (up to 2)

### Phase 3 — Pro hand try-on (weeks 6–7)
- [ ] Rewrite `addons/atlasar-hand-addon/addon.php`
- [ ] `hand-landmarker.worker.js`
- [ ] `pro-anchors-hand.js` — ring / watch / bracelet anchors
- [ ] WC category → mode mapping (jewelry-hand, watches, etc.)
- [ ] Two-hand mode

### Phase 4 — Pro pose / clothing (weeks 8–10)
- [ ] New `addons/atlasar-pose-addon/`
- [ ] `pose-landmarker.worker.js`
- [ ] `pro-anchors-pose.js` — shirt / pant / outfit anchors
- [ ] Pattern 2 from research §3.1 — overlay three.js canvas for clothing depth ordering
- [ ] Mobile performance gating (auto-fall-back to lite model)

### Phase 5 — Pro makeup + segmentation (weeks 11–12)
- [ ] New `addons/atlasar-makeup-addon/`
- [ ] New `addons/atlasar-segmentation-addon/`
- [ ] Image Segmenter worker
- [ ] Hair color preview, lipstick / eyeshadow / blush

### Phase 6 — Polish + analytics + WP.org refresh (week 13)
- [ ] Insights integration (existing AtlasAiDev library) for try-on session metrics
- [ ] readme.txt + screenshots
- [ ] Pro pricing page update (atlasaidev.com)
- [ ] Push to Freemius release channel

---

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| iOS Safari MediaPipe stability | Test against Safari 17 + 18 explicitly; fall back to Face Detector (lighter) on Safari if Face Landmarker fails to init. |
| Webcam permission denied flow | Graceful fallback to existing static AR mode + clear "Why we need camera" copy. |
| Bundle bloat | Lazy-load TF.js bundle behind explicit user click. Never ship in primary public bundle. |
| Per-device perf variance | Detect device via `navigator.deviceMemory` + `hardwareConcurrency`; auto-pick lite vs full Pose. |
| Existing static-hotspot addons in production | Existing `atlasar_model_viewer_hotspots` filter still callable for users who installed Pro before TF.js feature lands. Don't remove the hook; the new tracking-driven path is additive. |
| `<model-viewer>` doesn't expose enough internal state to drive in real time | If Pattern 1 hits limits, escalate to Pattern 2 (parallel three.js canvas overlay). Documented in research §3.1. |
| Self-hosted model weights bloat plugin zip | Make self-hosting opt-in via `tryon_self_host` setting. Default to CDN (`cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm/...`). |
| Variation handler + try-on combinations | Hook into existing `variation-handler.js` event bus; reload model in try-on overlay when WC variation changes. |
| Privacy / GDPR | All inference local. Update privacy policy template. Make the camera-icon UI obvious; never start camera silently. |
| Conflicts with three.js compression dep | Keep compression three.js server-side / build-time only. If Pattern 2 escalates, reuse same `three` npm dep, tree-shake per build target. |
| Pro requires Free already (existing constraint) | Do NOT change. Just continue: Pro's TF.js layer registers via Free's new `atlas_ar_tryon_*` hooks. |

---

## 7. Open Questions Before Phase 1

1. **Self-host vs CDN for MediaPipe weights** — bundle ~3 MB Face model in Free (zip grows by 3 MB) or load from jsdelivr (faster zip, but 3rd-party CDN dependency)?
2. **Snapshot share flow** — direct download only, or also save to WP media library + provide shareable URL?
3. **Should the snapshot include the product image / brand logo?** Default off in Free, default on in Pro?
4. **Should there be a "Compare" UI** showing before/after (without try-on / with try-on)?
5. **Per-product calibration UI** — Pro-only, or simpler version in Free?
6. **Try-on entry point UX** — separate "Try It On" button, or merge with existing "View in AR" button via a dropdown ("View in your room" / "Try on yourself")?
7. **Default to face-only or auto-detect mode based on WC category?** Auto-detect makes it more magical but introduces wrong-mode failure case.
8. **Multi-language consent text** — does the existing i18n setup auto-cover new strings? Check `languages/` dir.

---

## 8. Cross-references

- Research dossier: [tensorflowjs-research.md](./tensorflowjs-research.md)
- Existing v1.7.9+ feature analysis: [FEATURE-ANALYSIS.md](./FEATURE-ANALYSIS.md)
- Pro features roadmap: [PRO-FEATURES-COMPLETE.md](./PRO-FEATURES-COMPLETE.md)
- Existing free plugin readme: [../README.md](../README.md)
