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
- [x] npm deps to Free `package.json`: `@tensorflow/tfjs-core`, `@tensorflow/tfjs-backend-webgl`, `@mediapipe/tasks-vision`
- [x] Pro reuses Free's runtime (no separate deps)
- [x] Webpack/Mix config for Web Worker entries (chunk path routed to `public/js/build/chunks/`)
- [x] Self-host vs CDN — **CDN default** (jsdelivr WASM + storage.googleapis.com `face_landmarker.task`); self-host opt-in via `tryon_self_host` setting

### Phase 1 — Free face try-on MVP — **SHIPPED**
- [x] `AR_TRY_ON_Tryon.php` class + `AR_TRY_ON_Tryon_Hooks.php` registry + `/tryon/snapshot` REST route (kept) — `/tryon/config` and `/tryon/settings` were dropped in favor of the existing shared `ar_try_on_settings` option and `wp_localize_script` config delivery
- [x] `face-landmarker.worker.js` (lazy MediaPipe import, ~145 KB chunk on click)
- [x] `tryon-controller.js` driving an off-screen `<model-viewer>` via **Pattern 1.5** (snapshot to sprite, draw on 2D canvas) — in-band Pattern 1 was insufficient because the on-page model-viewer is hidden behind the toggle UI
- [x] Modal UI: consent → webcam grant → live preview → snapshot
- [x] **No new button** — Try-On reuses the existing `.ar_vr_3d_model_try_on` button. Per-product opt-in via `ar_placement = face-glasses | face-hat`. Position respects `ar_try_on_wc_hook_position` ("Show Button In") setting; toggle-mode positions render the pill as an overlay next to the cube icon.
- [x] Snapshot capture + optional media-library upload (logged-in users)
- [x] Snapshot watermark for Free (filter-removable by Pro: `atlas_ar_tryon_snapshot_watermark`)
- [x] Free product cap (default 3) — `updated_post_meta` hook downgrades 4th+ face product to `floor` and surfaces an admin notice. Filter: `atlas_ar_tryon_free_product_limit`
- [x] Pipeline hook `window.atlasArTryonPipeline.adjustAnchor(anchor, ctx)` — Pro consumes for per-product calibration
- [x] readme.txt — DEFERRED to Phase 6 polish
- [ ] Settings tab in dashboard React app — DEFERRED (REST + localized config already work; UI sugar)
- [ ] iOS Safari smoke test — DEFERRED
- [ ] Mobile FPS benchmark — DEFERRED

### Phase 2 — Pro face addon real tracking — **SHIPPED**
- [x] `addons/atlasar-face-addon/addon.php` — wires Pro filters: watermark off (`atlas_ar_tryon_snapshot_watermark`), cap lift (`atlas_ar_tryon_free_product_limit` → `PHP_INT_MAX`), `num_faces=2` advertised, worker `outputFacialTransformationMatrixes=true`
- [x] **Pattern 2 — three.js depth-occluded overlay** (`tryon-pro-renderer.js` + `tryon-pro-render-glue.js`):
  - GLB rendered on a transient WebGL canvas, composited onto Free's 2D canvas (mirrored to match selfie view)
  - **Hybrid pipeline** more robust than pure facialMatrix: position+scale from landmarks in pixel space (orthographic camera), rotation from `facialTransformationMatrix.decompose()`, fallback to eye-line roll
  - **Face-oval depth mask** rebuilt per-frame from MediaPipe `FACE_LANDMARKS_FACE_OVAL` (~36 silhouette vertices, triangle fan from centroid, `colorWrite=false`, `depthWrite=true`, `renderOrder=-1`) — temple bars / hat back behind the head fail depth test and are hidden
  - three.js + GLTFLoader loaded at runtime from **esm.sh** (rewrites bare `'three'` specifier; unpkg does not — earlier silent fallback bug)
  - GLB bbox-centered on load so calibration offsets are visual, not modeled-origin
  - Anchor on eye-corner midpoint (glasses) / forehead-top (hat) — more stable than nose-bridge
- [x] **Per-product calibration**: 7 fields (offsetX/Y/Z px, scale, rotationX/Y/Z deg) stored inside `ar_try_on_product_settings.tryon_calibration` (sub-key — no new post meta). Renderer reads via `window.atlasArTryonProCalibration[productId]`.
- [x] **Live front-end calibration panel** (`tryon-pro-calibrator.js` + `tryon-pro-calibrator.css`) — admin-only (`current_user_can('edit_posts')`), collapsable, pinned right edge. Drag sliders → renderer updates next frame, no save/reload cycle. Save → POST `/ar_try_on/v1/tryon/calibration/<product_id>` → writes calibration sub-key.
- [x] `tryon-pro.js` — registers `window.atlasArTryonPipeline.adjustAnchor` (Pattern 1.5 fallback path; still active when render hook unavailable)
- [x] `tryon-pro-render-glue.js` — registers `window.atlasArTryonPipeline.render`, lazy GLB load on first frame
- [x] **Skull-ellipsoid occluder** for hat back-half — sphere scaled to head proportions, parented to head pose, sits behind face-oval mask in Z. Hat crown wrapping the skull is correctly hidden when the user turns their head. Glasses unaffected (live at face-Z, never reach skull-Z).
- [ ] **Real face-mesh depth mask** (full 468-vertex MediaPipe TESSELATION) — face-oval + skull-ellipsoid covers ~95% of cases; full mesh helps at cheekbone/jaw edge transitions. Tracked as polish.
- [ ] Multi-face support runtime — `num_faces=2` is advertised; worker still hardcoded to 1, needs to read the value from config
- [ ] Snapshot HD export, branded export, GIF — Pro Phase 6 scope
- [ ] `face-blendshapes`, `face-makeup`, `face-occlusion` features in addon.json — Phase 5 scope (makeup) + this phase (occlusion)
- [x] **Old PHP calibration metabox dropped** — replaced by live front-end panel (single source of truth)

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

## 7a-table. Task completion matrix (single source of truth)

Updated each session. Phase ordering matches §5. Anything **NOT** ticked
is the work queue.

| # | Task | Plugin | Phase | Status | Commit / Notes |
|---|---|---|---|---|---|
| 1 | `feature/tensorflowjs` branch on both | both | 0 | ✅ | |
| 2 | npm deps (`@tensorflow/tfjs-core`, `…/backend-webgl`, `@mediapipe/tasks-vision`) | Free | 0 | ✅ | |
| 3 | Webpack/Mix Web Worker entry config | Free | 0 | ✅ | chunk path routed to `public/js/build/chunks/` |
| 4 | Self-host vs CDN decision | both | 0 | ✅ | CDN default, self-host opt-in (`tryon_self_host`) |
| 5 | `AR_TRY_ON_Tryon` class + `…_Hooks` registry | Free | 1 | ✅ | |
| 6 | `face-landmarker.worker.js` lazy MediaPipe | Free | 1 | ✅ | |
| 7 | `tryon-controller.js` Pattern 1.5 (sprite from `<model-viewer>`) | Free | 1 | ✅ | off-screen GLB snapshot, drawn to 2D canvas |
| 8 | Modal UI (consent → webcam → preview) | Free | 1 | ✅ | |
| 9 | Per-product opt-in via `ar_placement` (face-glasses / face-hat) | Free | 1 | ✅ | reuses existing dropdown |
| 10 | "Show static viewer alongside Try-On" toggle | Free | 1 | ✅ | |
| 11 | Conditional asset enqueue (face-* + viewer-OFF skips AtlasAR bundle) | Free | 1 | ✅ | |
| 12 | Try-On reuses existing `.ar_vr_3d_model_try_on` button | Free | 1 | ✅ | no new button |
| 13 | Position respects `ar_try_on_wc_hook_position` | Free | 1 | ✅ | toggle modes overlay next to cube |
| 14 | `/tryon/snapshot` REST + media-library upload | Free | 1 | ✅ | |
| 15 | Snapshot watermark (filter-removable) | Free | 1 | ✅ | `atlas_ar_tryon_snapshot_watermark` |
| 16 | Free product cap (default 3) + admin notice | Free | 1 | ✅ | `atlas_ar_tryon_free_product_limit` |
| 17 | Pipeline hook `window.atlasArTryonPipeline.adjustAnchor` | Free | 1 | ✅ | Pro consumes |
| 18 | Pipeline hook `window.atlasArTryonPipeline.render` | Free | 1 | ✅ | Pro consumes for Pattern 2 |
| 19 | `worker_options` localized + filterable | Free | 1 | ✅ | `atlas_ar_tryon_worker_options` |
| 20 | facialMatrix forwarded from worker → controller → render hook | Free | 1 | ✅ | |
| 21 | Settings tab in dashboard React app | Free | 1 | ✅ | `TryonSettings.js` card under Settings tab — `tryon_self_host`, `tryon_snapshot`, `tryon_button_label`, `tryon_consent_text` — wired through existing `handleChange` / `/settings` REST |
| 21a | Fix Switch wiring in TryonSettings.js | Free | 1 | ✅ | Switch component reads `defaultChecked` (not `checked`); onChange forwards `(checked)` boolean — matched the existing `ar_try_on_enable_qr_code` pattern |
| 22 | readme.txt update | Free | 1 | ⏳ later | user deferred |
| 23 | iOS Safari smoke test | both | 1 | ⏳ later | user deferred |
| 24 | Mobile FPS benchmark | both | 1 | ⏳ later | user deferred |
| 25 | Pro Addons Manager activation + init-hook timing fix | Pro | 2 | ✅ | was commented out + plugins_loaded never fired |
| 26 | Pro filters: watermark off, cap lift, multi-face advertise | Pro | 2 | ✅ | |
| 27 | Pro worker filter: `outputFacialTransformationMatrixes` on | Pro | 2 | ✅ | |
| 28 | **Pattern 2 — three.js depth-occluded overlay** | Pro | 2 | ✅ | hybrid landmark+matrix posing |
| 29 | Orthographic camera (canvas pixel == world unit) | Pro | 2 | ✅ | |
| 30 | Face-oval depth mask (36 silhouette vertices) | Pro | 2 | ✅ | |
| 31 | Skull-ellipsoid occluder (hat back-half) | Pro | 2 | ✅ | |
| 32 | Real 468-vertex face-mesh depth mask | Pro | 2 | ✅ | edge→triangle adjacency, swaps face-oval when available |
| 32a | Hide face-mesh + face-oval masks for `face-hat` mode | Pro | 2 | ✅ | hat sits ABOVE face — face occlusion would clip the brim where it overlaps face on screen |
| 32b | Skull-ellipsoid Z tracks hat localZ (always 40 px behind hat) | Pro | 2 | ✅ | so pushing offsetZ very negative no longer makes skull cut hat front |
| 32c | Skull halfDepth halved (`halfW × 0.5`) | Pro | 2 | ✅ | thinner ellipsoid — less forward-protrude into hat space |
| 32d | Calibration offsets applied in head-local space | Pro | 2 | ✅ | `glbRoot.translateX/Y/Z()` after rotation — offsets follow head yaw/pitch instead of staying screen-axis-locked |
| 32e | filemtime cache-bust on Pro JS+CSS files | Pro | 2 | ✅ | `$ver_for()` helper in addon.php; renderer surfaces `atlasArTryonProRenderer.v` for the dynamic-imported renderer URL |
| 32f | Glue uses dynamic `import('./tryon-pro-renderer.js?v=…')` | Pro | 2 | ✅ | static import couldn't carry a cache-bust query |
| 32g | Runtime debug exposed via `window.__pro_renderer_debug` | Pro | 2 | ✅ | one-object-copy/frame; useful for diagnosing mask state |
| 32h | WC tab "AtlasAR Product View" gated for face-* + viewer-OFF | Free | 1 | ✅ | fixed `AtlasAR is not a constructor` console error |
| 32i | Bootstrap + chunk filenames `?ver=filemtime` + `[contenthash:8]` | Free | 1 | ✅ | fixed `ChunkLoadError` after rebuilds |
| 33 | Per-product calibration storage (`ar_try_on_product_settings.tryon_calibration`) | Pro | 2 | ✅ | sub-key, no new post meta |
| 34 | Live front-end calibration panel (admin only) | Pro | 2 | ✅ | 7 sliders + Reset/Save |
| 35 | Calibration panel — undo/redo + keyboard shortcuts + copy-to-clipboard | Pro | 2 | ✅ | `Ctrl+K` toggle, `Ctrl+Z`/`Ctrl+Shift+Z`, `Ctrl+S` (uncommitted) |
| 36 | REST `POST /tryon/calibration/<product_id>` (admin-only) | Pro | 2 | ✅ | |
| 37 | Old PHP metabox dropped | Pro | 2 | ✅ | replaced by live panel |
| 38 | Auto-orient GLB heuristic | Pro | 2 | ❌ removed | false-triggered on real glasses GLBs (X≈Z) |
| 39 | rotationX / rotationY calibration sliders (3D pose tweak) | Pro | 2 | ✅ | |
| 40 | Anchor on eye-corner midpoint (glasses) / forehead (hat) | Pro | 2 | ✅ | |
| 41 | esm.sh CDN (rewrites bare `'three'` specifier) | Pro | 2 | ✅ | unpkg silently failed |
| 42 | Top-hat (post 63) default calibration saved to DB | content | 2 | ✅ | current values `offsetX:-67, offsetY:160, offsetZ:0, scale:0.6, rotations:0` (re-tuned after head-local offsets + skull-Z-tracks-hat fixes) |
| 43 | Worker `numFaces` runtime config (currently hardcoded to 1) | Free / Pro | 2 | ✅ | filterable via `atlas_ar_tryon_pro_num_faces` (uncommitted) |
| 44 | Snapshot HD (2× canvas, Pro-only) | Free / Pro | 6 | ✅ | filter `atlas_ar_tryon_snapshot_hd` (uncommitted) |
| 45 | Share-link UI under modal (copy button, view link) | Free | 6 | ✅ | (uncommitted) |
| 46 | Snapshot GIF | Pro | 6 | ⏳ later | user deferred (multi-frame encoding via gif.js) |
| 47 | Branded snapshot (logo overlay) | Pro | 6 | ❌ pending | not yet started |
| 48 | Multi-face render runtime (numFaces > 1) | Pro | 2/3 | ❌ pending | needs renderer to iterate over multiple landmark sets |
| 49 | Test on more GLBs (baseball cap, beanie, varied glasses) | content | 1 | ⏳ later | user deferred |
| 50 | `addons/atlasar-hand-addon/` — real hand tracking | Pro | 3 | ❌ pending | placeholder hotspot only |
| 51 | `hand-landmarker.worker.js` | Pro | 3 | ❌ pending | |
| 52 | WC category → hand-mode mapping | Pro | 3 | ❌ pending | |
| 53 | `addons/atlasar-pose-addon/` — clothing/outfit | Pro | 4 | ❌ pending | |
| 54 | `pose-landmarker.worker.js` | Pro | 4 | ❌ pending | |
| 55 | three.js Pattern 2 for clothing depth ordering | Pro | 4 | ❌ pending | |
| 56 | Mobile perf gating (auto-fall-back to lite Pose) | Pro | 4 | ❌ pending | |
| 57 | `addons/atlasar-makeup-addon/` | Pro | 5 | ❌ pending | |
| 58 | `addons/atlasar-segmentation-addon/` | Pro | 5 | ❌ pending | |
| 59 | Image Segmenter worker | Pro | 5 | ❌ pending | |
| 60 | Hair color / lipstick / eyeshadow / blush previews | Pro | 5 | ❌ pending | |
| 61 | AtlasAiDev Insights integration (try-on session metrics) | Pro | 6 | ❌ pending | |
| 62 | readme.txt + screenshots (WP.org refresh) | Free | 6 | ⏳ later | user deferred |
| 63 | Pricing-page update (atlasaidev.com) | external | 6 | ❌ pending | |
| 64 | Push to Freemius release channel | external | 6 | ❌ pending | |

**Legend**: ✅ shipped • ⏳ later (user-deferred) • ❌ pending (queued, not started) • removed = scrapped

---

## 7a. Implementation status (as of 2026-05-06)

### Free — shipped
- TF.js + MediaPipe Face Landmarker pipeline (lazy-loaded chunks)
- `face-glasses`, `face-hat` placements via existing `ar_placement` dropdown
- Per-product opt-in toggle "Show static viewer alongside Try-On" → controls whether AtlasAR.js is enqueued and whether the cube toggle renders alongside the Try-On overlay
- Conditional asset enqueue on product pages (face-* + viewer-OFF skips the AtlasAR bundle entirely)
- Modal UI + webcam consent + snapshot
- Watermark on Free snapshots (Pro filter strips it)
- Free product cap = 3 face-* products (Pro filter lifts to unlimited)
- 10 hook contracts (`atlas_ar_tryon_*`) live and consumed by Pro
- Pipeline hook `window.atlasArTryonPipeline.adjustAnchor` for Pro calibration overrides

### Free — known limits (acceptable for v1, see §7b)
- 2D pipeline only: no depth occlusion (temples/hat back render on top of face)
- Sprite is rendered from a neutral HDRI, lighting won't match the webcam scene
- Default anchor scales (glasses 2.0× eye-distance, hat 2.4× eye-distance) are GLB-agnostic — fit accuracy depends on the source GLB; per-product calibration is Pro-only

### Pro — shipped
- Watermark removal filter
- Free cap removal filter (face-* product limit lifted)
- `outputFacialTransformationMatrixes` enabled in worker (Pro filter)
- **Pattern 2 — three.js depth-occluded overlay** (`tryon-pro-renderer.js` + `tryon-pro-render-glue.js`)
  - Hybrid: position+scale from landmarks, rotation from facialMatrix
  - Orthographic camera mapping 1 world unit == 1 canvas pixel (no webcam-intrinsic dependency)
  - **Two-layer depth mask**:
    - Face-oval (~36 silhouette vertices, triangle fan) — hides glasses temples behind face
    - **Skull ellipsoid** (sphere scaled to head proportions, parented to head pose) — hides hat crown back-half behind skull volume
  - three.js + GLTFLoader loaded from esm.sh (rewrites bare specifiers)
  - GLB bbox-centered on load
  - Anchor on eye-corner midpoint (glasses) / forehead (hat)
- **Live front-end calibration panel** (admin only) — replaces the old PHP metabox. 7 sliders, drag → live update, Save → REST → post meta sub-key
- Calibration storage: `ar_try_on_product_settings.tryon_calibration` sub-key (no new post meta)
- REST `POST /ar_try_on/v1/tryon/calibration/<product_id>` (gated to `edit_post`)
- Multi-face announce (`num_faces = 2`) — runtime worker still uses 1

### Pro — pending (next iteration)
1. Real **468-vertex face-mesh** depth mask (face-oval + skull ellipsoid covers ~95%; full mesh helps at cheekbone/jaw edge cases)
2. Worker config: `numFaces` driven by localized config (currently hardcoded to 1)
3. Snapshot HD / GIF / share-link
4. Pro hand / pose / makeup / segmentation addons (Phases 3-5)
5. Calibration panel — keyboard-shortcut to toggle, undo/redo, copy-to-other-products
6. iOS Safari WebGL fallback path verification

---

## 7b. Pattern 2 implementation — **SHIPPED**

Status as of 2026-05-06: Pattern 2 is live in Pro. Notes on what
landed vs the original plan:

| Original plan | Actually shipped |
|---|---|
| GLB posed via 4×4 `facialTransformationMatrix` | **Hybrid**: position+scale from landmarks (in canvas pixel space), rotation only from `facialTransformationMatrix.decompose()`. Pure-matrix posing was unreliable across webcam intrinsics. |
| Camera intrinsics from MediaPipe / unit perspective | **Orthographic camera** matching canvas pixels — no intrinsics needed |
| 468-vertex face-mesh depth mask | **36-vertex face-oval** silhouette (triangle fan from centroid). Covers 90% of cases. Full mesh tracked as polish. |
| three.js bundled via Pro webpack | **Loaded from esm.sh** at runtime (rewrites bare `'three'` specifier; no Pro build pipeline change). unpkg silently failed. |
| GLB cached by URL | Same |
| Hook `window.atlasArTryonPipeline.render` returns false to fallback | Same — used heavily during init / GLB load to gate rendering until ready |

Single goal: replace the 2D `ctx.drawImage(sprite, ...)` path with a parallel WebGL canvas that renders the actual GLB and applies a face-mesh-driven depth mask.

### New files (Pro)

```
ar-vr-3d-model-try-on-pro/
  addons/atlasar-face-addon/
    tryon-pro-renderer.js          # three.js renderer + GLB loader + depth mask
    tryon-pro-render-glue.js       # Wires `window.atlasArTryonPipeline.render` →
                                   # forwards landmarks + facial-transform-matrix
                                   # to the renderer per frame
```

### Modified files

- **Free** `public/js/tryon/tryon-controller.js`
  - When `window.atlasArTryonPipeline.render` exists, **skip** the 2D `ctx.drawImage` path; controller still draws the mirrored video to ctx, then delegates to the render hook with `(ctx, video, landmarks, facialMatrix, anchor, sprite, productId, mode)`
  - Pass `facialMatrix` from worker results to the hook (currently dropped after extraction)

- **Free** `public/js/tryon/workers/face-landmarker.worker.js`
  - Add `outputFacialTransformationMatrixes` flag, controlled by an init message option (default false in Free; Pro sets true)
  - Forward `result.facialTransformationMatrixes[0]` alongside landmarks

### Renderer behavior (Pattern 2)

1. On first call, lazy-load three.js + GLTFLoader (already in npm deps)
2. Create a transparent WebGL canvas overlaying the existing 2D canvas (same z-index family, sibling of `ui.canvas`)
3. Load the product GLB once (cached by URL)
4. Per frame:
   - Build a face-mesh geometry (468 vertices via MediaPipe indices) and write it to depth/stencil only — NOT to color
   - Pose the GLB via `facialTransformationMatrix` (4×4) so it follows head orientation
   - Render the GLB with depth-test enabled — fragments behind the face mesh fail the depth test → temples correctly hidden
5. Camera intrinsics approximated from MediaPipe (or fall-back to a unit perspective)

### Hook contract (already shipped on Free)

```
window.atlasArTryonPipeline = {
  adjustAnchor: (anchor, ctx) => anchor,   // already used by Pro for calibration
  render:       (drawCtx) => boolean,      // NEW — when defined, controller skips 2D draw
};
```

`drawCtx` shape:
```
{
  ctx,            // 2D canvas context (video already drawn, mirrored)
  canvas,         // canvas element (so renderer can size its WebGL sibling)
  video,          // HTMLVideoElement
  landmarks,      // Array<{x,y,z}>
  facialMatrix,   // Float32Array(16) | null
  anchor,         // 2D anchor {x,y,width,rotation} (post adjustAnchor)
  sprite,         // ImageBitmap (kept as fallback)
  productId,
  mode,           // 'face-glasses' | 'face-hat'
  glbSrc,         // direct GLB URL
}
```

### Performance budget

- Renderer setup: < 250 ms cold (GLB load + three.js init)
- Per-frame: < 8 ms (60fps headroom on desktop, ~30fps mobile)
- WASM SIMD already in MediaPipe path; three.js stays on main thread (acceptable at GLB ≤ 2 MB)

### Risks

- iOS Safari WebGL extension support — fall back to 2D pipeline if three.js init throws
- GLB without proper origin/scale will pose wrong; per-product calibration (already shipped) covers this
- Depth-mask seam at face silhouette — feather edge by 1-2 px to hide z-fighting

### Acceptance test

- Glasses product: rotate head ~45° each direction; temple bar correctly disappears behind ear region
- Hat product: tilt head back; back-of-hat band correctly hidden behind head silhouette
- Snapshot: WebGL composite captured into the same `ui.canvas` snapshot pipeline (read pixels from WebGL, draw to 2D, then `toBlob`)

---

## 7c. Auto-fit roadmap

Separate file: [auto-fit-roadmap.md](./auto-fit-roadmap.md). Phased path
from "manual calibration sliders" to "Snapchat-style click-and-fits"
(A: bbox normalize, B: category presets, C: synthetic-head fit at
upload time, D: authoring template, E: curated catalog). User chose
to land **A + B together** as a single feature later. Plan in that
file is review-ready, not yet started in code.

---

## 8. Cross-references

- Auto-fit roadmap: [auto-fit-roadmap.md](./auto-fit-roadmap.md)
- Research dossier: [tensorflowjs-research.md](./tensorflowjs-research.md)
- Existing v1.7.9+ feature analysis: [FEATURE-ANALYSIS.md](./FEATURE-ANALYSIS.md)
- Pro features roadmap: [PRO-FEATURES-COMPLETE.md](./PRO-FEATURES-COMPLETE.md)
- Existing free plugin readme: [../README.md](../README.md)
- **Successor (AtlasTryOn Phase 2 — fit measurement):** [prescription-fit-research.md](./prescription-fit-research.md) + [prescription-fit-integration-plan.md](./prescription-fit-integration-plan.md). Adds a metric-scale layer (ISO 7810 card calibration, optional ARKit/ARCore) on top of this v1 pipeline so the plugin can answer *"will it fit?"* — Warby Parker / Zenni-class measurement accuracy. Target releases: Free 2.1.0, Pro 3.1.0.
