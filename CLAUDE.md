# CLAUDE.md — ar-vr-3d-model-try-on (Free)

## Plugin

- **Name:** 3D Viewer – 3D Model Viewer – Augmented Reality
- **Version:** 1.9.0
- **Author:** AtlasAiDev
- **Pro counterpart:** `../ar-vr-3d-model-try-on-pro` (v2.1.0, premium-only)

## Conventions (DO NOT INVENT NEW PREFIXES)

| Element | Value |
|---|---|
| Composer namespaces | `AR_TRY_ON\` (`includes/`), `AR_TRY_ON_Admin\` (`admin/`), `AR_TRY_ON_Public\` (`public/`), `ATLAS_AR_API\` (`api/`) |
| Function prefix | `atlas_ar_` |
| Constant prefix | `ATLAS_AR_` |
| REST namespace | `ar_try_on/v1` |
| Tailwind prefix | `art-` (config: `tailwind.config.js`) |
| Freemius product ID | 18159 |
| Freemius helper | `av3mto_fs()` |
| Text domain | `ar-vr-3d-model-try-on` |

## Architecture

- **3D renderer:** Google `<model-viewer>` web component (`public/js/google-model-viewer.js`, ~960 KB). NOT three.js / Babylon at runtime.
- **`three.js@^0.182.0`** in deps = compression-only via `@gltf-transform/*` + `draco3dgltf`. Do not assume runtime three.js.
- **Public client:** `public/js/AtlasAR.js` (queries `<model-viewer>` line ~563).
- **Entry points:** shortcode `[atlas_ar]`, Gutenberg block `atlas/ar-shortcode`.
- **WC integration:** configurable hook positions (before/after summary, gallery, tabs). Variation handler at `public/js/variation-handler.js`.
- **Build:** Laravel Mix (`webpack.mix.js`) + Gulp (`gulpfile.js`). React only in `src/dashboard/` + `src/metabox/`. Public side vanilla JS.
- **DB tables:** `wp_ar_compression_log` (free).

## Hooks Free Exposes (for Pro)

`atlas_ar_get_post_types`, `atlas_ar_should_load_button`, `atlas_ar_model_dir`, `atlas_ar_model_dir_url`, `atlas_ar_current_model_dir`, `atlas_ar_is_pro_active`, `ATLAS_AR_rest_route_access`, `ATLAS_AR_version`, `ATLAS_AR_plugin_name`, `atlas_ar_enqueue_pro_dashboard_scripts`, `atlas_ar_menu`, `atlas_ar_before_metabox_content`, `ATLAS_AR_after_free_metabox_settings`, `atlas_ar_after_metabox_content`. Pro existing addons use: `atlasar_model_viewer_hotspots`, `atlasar_before_model_viewer`.

## Active Feature Work — TensorFlow.js + MediaPipe

**Branch:** `feature/tensorflowjs` (off `develop`).

**Goal:** add real-time virtual try-on via webcam — Face Landmarker (glasses, hats, earrings, makeup), Hand Landmarker (watches, rings, bracelets), Pose Landmarker (clothing). Extends existing `<model-viewer>` pipeline; does NOT replace it.

**Key decision:** integrate into existing plugin pair (Free + Pro), NOT build a new sibling plugin. Reasons:
- Pro already has Face / Hand addon scaffolds (`addons/atlasar-face-addon/`, `addons/atlasar-hand-addon/`) emitting placeholder hotspots — replace placeholders with real MediaPipe landmarks.
- No runtime ML conflict (plugin uses zero ML today).
- Existing addon hook system + `<model-viewer>` integration points fit cleanly.

**Free v1 scope:** Face Landmarker only — glasses + hats. Single face. WebGL backend, WebGPU upgrade when supported. Snapshot capture. Lazy-loaded behind explicit "Try It On" click.

**Pro phases:** real face addon (blendshapes/makeup/occlusion) → hand (rings/watches) → pose (clothing) → makeup + segmentation. Per-product anchor calibration UI in metabox.

**New filter/action hooks Free will expose:** `atlas_ar_tryon_modes`, `atlas_ar_tryon_models`, `atlas_ar_tryon_anchor_strategy`, `atlas_ar_tryon_pre_render`, `atlas_ar_tryon_post_render`, `atlas_ar_tryon_woocommerce_mode_for_product`, `atlas_ar_tryon_landmark_pipeline`, `atlas_ar_tryon_segmentation_enabled`, `atlas_ar_tryon_export_formats`, `atlas_ar_tryon_session_recorded`.

**Bundle plan:** `@tensorflow/tfjs-core` + `@tensorflow/tfjs-backend-webgl` + `@mediapipe/tasks-vision` (~510 KB compressed JS). Face Landmarker model ~3 MB, cached IndexedDB. Self-host opt-in Free / default Pro. NEVER load on initial page render.

**Integration pattern:** drive `<model-viewer>` hotspots from landmark data (Pattern 1). Escalate to parallel three.js canvas overlay (Pattern 2) only for makeup / clothing in Pro.

## Plan Documents (read these for full detail)

- [`plan/tensorflowjs-research.md`](plan/tensorflowjs-research.md) — model catalog, performance budgets, model→use-case mapping, free/pro split, risks
- [`plan/tensorflowjs-integration-plan.md`](plan/tensorflowjs-integration-plan.md) — file lists, hook contracts, roadmap (6 phases), open questions
- [`plan/FEATURE-ANALYSIS.md`](plan/FEATURE-ANALYSIS.md) — pre-existing v1.7.9+ feature analysis
- [`plan/PRO-FEATURES-COMPLETE.md`](plan/PRO-FEATURES-COMPLETE.md) — pre-existing Pro feature roadmap

## Working Notes for Future Sessions

- Existing untracked working-tree edit: `public/css/ar-try-on.css` (predates TF.js work). Carry across branch switches via stash.
- `develop` ahead of `origin/develop` — push state needs review before next release.
- Build zip pipeline uses Gulp; verify single-folder structure (avoid double-nesting bug previously seen on sibling plugins).
- HPOS-compatible (declared in `ar-vr-3d-model-try-on.php`).
- Webcam permission flow: always require explicit user gesture, secure context (HTTPS), graceful fallback to existing static AR mode.
