# TensorFlow.js Research — AR Try-On Integration

**Plugin context:** `ar-vr-3d-model-try-on` (free, v1.9.0) + `ar-vr-3d-model-try-on-pro` (Pro, v2.1.0)
**Question this doc answers:** Which TensorFlow.js / MediaPipe models fit a 3D-AR-try-on plugin, what they cost, and how they integrate with the existing `<model-viewer>`–based stack.
**Date:** 2026-05-06
**Branches:** `feature/tensorflowjs` on both plugins.

---

## 1. Executive Summary

The plugin currently displays static 3D models via Google `<model-viewer>` and supports AR via the WebXR / Quick Look paths model-viewer already provides. The Pro plugin already has an **addon scaffold for Face and Hand** features (`addons/atlasar-face-addon/`, `addons/atlasar-hand-addon/`) — but those addons currently inject **static hotspots at fixed 3D coordinates** (`'0 1.7 0'`), not anything tracked.

TensorFlow.js + MediaPipe Tasks fills the obvious gap: **real-time landmark tracking of face / hand / body** so 3D models can be anchored to the user's actual features through their webcam. This is the conventional definition of "virtual try-on" (glasses, makeup, hats, jewelry, watches, rings, clothing).

**Recommendation:** Integrate TF.js + MediaPipe Tasks into the **existing plugin pair** rather than building a new plugin. Reasons:

1. Existing Pro addon system (`addons/<name>/addon.json` + `addon.php`) is the natural extension point. The `Face` and `Hand` addons are pre-wired with the right hooks (`atlasar_model_viewer_hotspots`, `atlasar_before_model_viewer`) — they just need real tracking data instead of placeholders.
2. The existing 3D pipeline already handles `.glb` upload, compression, WooCommerce product binding, shortcodes, blocks. TF.js doesn't replace any of that — it adds a webcam input layer and a landmark→3D-anchor mapping.
3. Bundle isolation is achievable: Free plugin keeps the foundation small (Face Landmarker only, ~3 MB model). Heavier models (Hand, Pose, blendshapes) ship in Pro.
4. No runtime conflict with existing `three.js` (used for compression only, server-side or in offline pipeline) since TF.js will run in dedicated Web Workers in the public-facing AR view.

**Scope of this doc:** the *useful subset* of TF.js for AR try-on. Models that are not relevant (NSFWJS moderation, YAMNet audio, Magenta music) are explicitly out of scope and removed from earlier drafts of this research.

---

## 2. Relevant TensorFlow.js / MediaPipe Models

| Model | Category | Approx. weight | What it does | License | Maintenance |
|---|---|---|---|---|---|
| **MediaPipe Face Landmarker** (FaceMesh successor) | Face | ~3–11 MB | 468 3D facial landmarks per face, optional 52 ARKit-compatible blendshapes for animation, transformation matrix output | Apache 2.0 | Active — Google's recommended path |
| **MediaPipe Face Detector** | Face | ~0.4–2 MB | Face bounding-box, 6-keypoint detector (eyes, ears, nose, mouth) — lighter than landmarker | Apache 2.0 | Active |
| **MediaPipe Hand Landmarker** | Hand | ~6 MB (full) | 21 3D landmarks per hand, up to 2 hands, handedness (left/right) | Apache 2.0 | Active |
| **MediaPipe Pose Landmarker** (BlazePose) | Body | ~6 MB lite / ~10 MB full / ~26 MB heavy | 33 keypoints (face + hands + feet), 3D via GHUM body model | Apache 2.0 | Active |
| **MediaPipe Selfie Segmentation** | Segmentation | ~0.25–1 MB | Person foreground mask (background blur / replacement) | Apache 2.0 | Active |
| **MediaPipe Image Segmenter** | Segmentation | ~1–10 MB | Multi-class semantic segmentation (hair, skin, clothes) | Apache 2.0 | Active |
| **MediaPipe Gesture Recognizer** | Hand-gesture | ~8 MB | 8 built-in static gestures (thumbs up/down, OK, etc.), custom training supported | Apache 2.0 | Active |
| **MoveNet** (Lightning / Thunder) | Body | ~5 / ~12 MB | 17 keypoints, 50+ FPS — faster but less detailed than BlazePose | Apache 2.0 | Maintained, "default" recommendation in tfjs-models |
| **DepthAnything (TF.js port)** | Depth | varies | Per-pixel monocular depth, useful for occlusion | MIT | Community |
| **face-api.js** | Face | ~6–35 MB | Detection + landmarks + face descriptors + age/gender/expression — older, ensemble of TF.js models | MIT | Original repo low-activity; many active forks |

Models intentionally **omitted** (not relevant to 3D try-on): NSFWJS, YAMNet, Speech Commands, Magenta, MobileBERT, Toxicity, Universal Sentence Encoder, MobileNet classifier, Coco-SSD.

### 2.1 Concrete try-on use cases per model

| Use case | Primary model | Why |
|---|---|---|
| Glasses / sunglasses try-on | Face Landmarker | Eye + nose-bridge landmarks (face_oval + L/R eye + nose tip) → world coords for glasses anchor |
| Hats / caps / headwear | Face Landmarker | Forehead landmark (mid-forehead at index 10) + face transformation matrix for tilt |
| Earrings | Face Landmarker | Left/right ear landmarks (#234, #454) |
| Makeup (lipstick, blush, eyeshadow) | Face Landmarker + Image Segmenter | Lip + cheek + eyelid mesh regions for color blending |
| Necklaces | Face Landmarker + Pose Landmarker | Chin landmark + neck region from pose (shoulders ridge) |
| Hair color / hair style preview | Image Segmenter (hair class) | Hair mask for recoloring; full hair-style swap is harder and not primary v1 |
| Watches | Hand Landmarker | Wrist landmark (#0) + handedness for orientation |
| Rings | Hand Landmarker | Per-finger PIP / DIP landmarks (e.g., #6, #10, #14, #18 for index–pinky base) |
| Bracelets | Hand Landmarker | Wrist + palm-base landmarks |
| Nail polish | Hand Landmarker + Image Segmenter | Fingertip landmarks + nail region segmentation |
| Shirts / tops | Pose Landmarker | Shoulder + hip landmarks |
| Pants / shorts | Pose Landmarker | Hip + knee + ankle landmarks |
| Full-body outfit | Pose Landmarker | All 33 keypoints |
| Shoes | Pose Landmarker | Ankle + foot landmarks (#27–32) |

### 2.2 Performance budget (browser, mid-range laptop, single user)

Approximate FPS expectations on Chrome with WebGL backend, 720p webcam, single subject:

| Model | Inference time | Realistic FPS budget |
|---|---|---|
| Face Landmarker (1 face) | ~10–20 ms | 30–50 FPS |
| Hand Landmarker (1 hand) | ~15–25 ms | 25–40 FPS |
| Hand Landmarker (2 hands) | ~30–45 ms | 15–25 FPS |
| Pose Landmarker (lite) | ~25–40 ms | 20–30 FPS |
| Pose Landmarker (full) | ~50–80 ms | 10–15 FPS |
| Selfie Segmentation | ~5–10 ms | 60+ FPS (cheap, runs alongside others) |

WebGPU backend (Chrome 113+) gives 1.5–3× speedups on supported hardware. Mobile is slower — Pose Landmarker full is borderline on mid-tier Android.

**Implication:** Free plugin should default to Face Landmarker + Selfie Segmentation only. Pose tracking is Pro-tier territory (more demanding to support across devices, also clothing try-on is the harder revenue-justifying SKU).

---

## 3. TF.js / MediaPipe vs Existing 3D Stack

The plugin already uses:

- **Google `<model-viewer>`** — web component, ~960 KB minified, built on three.js internally. Renders `.glb` / `.gltf` with native AR support (WebXR + Apple Quick Look + Scene Viewer).
- **three.js `^0.182.0`** — npm dep, used only for compression utilities in `@gltf-transform/*` pipeline. NOT used for runtime rendering.
- **`@gltf-transform/*`, `draco3dgltf`, `obj2gltf`, `sharp`** — model optimization pipeline.

### 3.1 How TF.js fits in (zero-conflict integration)

```
  Webcam <video>
        │
        ▼
  Web Worker [TF.js + MediaPipe Face/Hand/Pose Landmarker]
        │  ─────  postMessage(landmarks: 468×{x,y,z})  ─────►
        ▼                                                    │
  AR Try-On Controller (main thread, public/js/AtlasAR.js extension)
        │                                                    │
        │  computes anchor pose from landmarks               │
        │                                                    │
        ▼                                                    │
  <model-viewer>           OR        <canvas WebGL overlay>
   .cameraOrbit / pose                aligned to <video>
   .modelViewerInternals             with three.js renderer
   (limited control)                 (full control)
```

Two integration patterns, both viable:

1. **Drive `<model-viewer>` directly** — set `<model-viewer>` `camera-orbit`, `field-of-view`, and per-hotspot `position` from landmark data. Simpler. Loses some control over occlusion / depth ordering. Works for static accessories (glasses, watch) where the model just sits at a 3D anchor.

2. **Overlay a parallel three.js canvas** — render the 3D model on a WebGL canvas positioned over the video element. Project landmarks into the same camera space. Full control over occlusion via Selfie Segmentation mask. Required for makeup / hair / clothing where the 3D model must visually integrate with the body. Technically heavier (loads three.js for runtime, not just compression).

Recommendation: **start with pattern (1)** for glasses / watches / hats (Free). Add pattern (2) in Pro for makeup / clothing.

### 3.2 Why not Transformers.js / ONNX

Already covered in earlier draft of this doc — Transformers.js's strength is text/embedding/captioning models. There are no ONNX equivalents of MediaPipe Face/Hand/Pose Landmarker that match the same browser performance and stability. For this plugin, TF.js is the only sensible runtime.

The plugin currently uses **neither** runtime, so this is a greenfield ML decision — no coexistence problem to solve.

### 3.3 Bundle impact

| Component | Compressed JS | Notes |
|---|---|---|
| `@tensorflow/tfjs-core` | ~110 KB | required base |
| `@tensorflow/tfjs-backend-webgl` | ~150 KB | broadly supported |
| `@tensorflow/tfjs-backend-webgpu` | ~250 KB | optional, Chrome 113+ |
| `@mediapipe/tasks-vision` | ~250 KB | wraps Face / Hand / Pose / Segmenter |
| Face Landmarker model | ~3 MB | downloaded once, cached in IndexedDB |
| Hand Landmarker model | ~6 MB | Pro |
| Pose Landmarker model (lite) | ~6 MB | Pro |

Free plugin runtime addition (Face Landmarker only): **~3.5 MB JS + 3 MB model = 6.5 MB on first use, 0 MB thereafter** (IndexedDB cached). Acceptable for a feature gated behind explicit user webcam grant.

---

## 4. Existing Plugin Architecture (relevant excerpt)

Captured from deep code mapping. See [session-summary]-style detail in `tensorflowjs-integration-plan.md` §2. Top-level facts that drive integration choices:

- **3D renderer:** `<model-viewer>` web component (`public/js/google-model-viewer.js`), launched via `[atlas_ar]` shortcode and Gutenberg block `atlas/ar-shortcode`.
- **Pro addon system:** `addons/<slug>/addon.json` + `addon.php`. Already has `atlasar-face-addon` and `atlasar-hand-addon` with hotspot hooks (currently static placeholder data).
- **Hooks Pro emits:** `atlasar_model_viewer_hotspots` (filter), `atlasar_before_model_viewer` (action). These are exactly the right hooks to wire real landmark data into.
- **REST namespaces:** `ar_try_on/v1` (Free), `ar_try_on_pro/v1` (Pro).
- **Naming conventions:** function prefix `atlas_ar_`, constant prefix `ATLAS_AR_`, namespace `AR_TRY_ON\`, Tailwind prefix `art-`, Freemius product ID `18159`, Freemius helper `av3mto_fs()`.
- **WooCommerce integration:** configurable hook positions (before/after summary, gallery, tabs).
- **Build:** Laravel Mix + Gulp. React for admin dashboard + metabox. Public side is vanilla JS (`AtlasAR.js`) plus model-viewer.

Integration ramifications: TF.js belongs in a **new public-side module** `public/js/ar-tracking/` (Free) and a parallel module in `Assets/js/ar-tracking-pro/` (Pro). Webpack/Mix entry points get added; nothing in admin React or REST API needs to change for v1 (settings UI gets new toggles in existing dashboard).

---

## 5. Decision: Free vs Pro Split

| Capability | Free | Pro |
|---|---|---|
| Face Landmarker (468 pts) | ✅ basic mode | ✅ + blendshape stream + transformation matrix |
| Glasses / sunglasses try-on | ✅ | ✅ |
| Hats / caps try-on | ✅ | ✅ |
| Earrings try-on | — | ✅ |
| Makeup (lipstick, eyeshadow, blush) | — | ✅ |
| Hair recolor | — | ✅ (uses Image Segmenter) |
| Hand Landmarker (21 pts × 2) | — | ✅ |
| Watches / bracelets try-on | — | ✅ |
| Rings try-on | — | ✅ |
| Nail polish preview | — | ✅ |
| Pose Landmarker (33 pts) | — | ✅ |
| Shirts / pants / full outfit | — | ✅ |
| Shoes try-on | — | ✅ |
| Selfie Segmentation (occlusion / bg replace) | basic | full |
| Snapshot capture (download try-on photo) | ✅ | ✅ + branded watermark + GIF |
| Multi-user (2 faces / 2 hands) | — | ✅ |
| WebGPU backend | ✅ when available | ✅ |
| Custom anchor calibration UI | — | ✅ (per-product fine-tune) |
| WooCommerce variation-aware try-on | basic | per-variation custom anchors |
| Analytics (session count, conversion) | — | ✅ via existing AtlasAiDev Insights |

Pricing implication: keep Pro pricing model the same as today (Freemius product 18159). The TF.js try-on layer becomes the most marketable Pro feature, justifying current price tiers without raising them.

---

## 6. Risks & Open Questions

| Risk | Mitigation |
|---|---|
| Webcam permission UX in WP admin / public — must be user-gesture initiated, secure context (HTTPS) | Always require an explicit "Try It On" click before requesting camera. Never auto-prompt on page load. Document HTTPS-only requirement in readme. |
| iOS Safari quirks — no WebGPU yet (as of early 2026), some MediaPipe builds had Safari regressions | Test against Safari 17 + 18 explicitly. Fall back to WebGL backend. Defer Pose Landmarker on iOS until verified. |
| FPS variance across devices | Adaptive model selection: lite vs full Pose, single-hand vs dual-hand by detected device perf. |
| Bundle bloat on plugin update | Lazy-load TF.js + model files only when user clicks "Try It On". Never load on initial page render. |
| Cross-origin model file CDN (jsdelivr) | Either pin a known-good CDN URL or self-host model weights inside plugin (size budget allows: Face 3 MB, Hand 6 MB, Pose 6 MB ≈ 15 MB total). Self-hosting avoids CDN-blocking corporate networks. |
| Privacy / GDPR — webcam stream is sensitive | All inference local. No video frames leave the browser. Document this prominently. Mirror the privacy posture already established by other AtlasAiDev plugins. |
| Existing `three.js@^0.182.0` dep is for compression — adding runtime three.js (Pattern 2 from §3.1) doubles potential | Use `three` as a single shared dependency; tree-shake server vs client builds. Or stick to Pattern 1 (drive model-viewer) for v1 to avoid the issue. |
| Pro Face/Hand addon hooks (`atlasar_model_viewer_hotspots`, `atlasar_before_model_viewer`) currently inject placeholder static data — production usage must replace placeholders cleanly | Treat existing addon files as scaffolds. Replace addon.php contents with real landmark→hotspot wiring in Phase 1. |
| `<model-viewer>` is opinionated about its own AR launch flow (WebXR / Quick Look) — TF.js try-on is a *third* AR mode | Render TF.js try-on in a parallel UI element (modal) rather than hijacking model-viewer's AR button. User chooses: "View in your room" (existing AR) or "Try on yourself" (new TF.js mode). |
| Variation handler (`variation-handler.js`) already swaps models on WC variation change — TF.js try-on must respect same | Hook into same variation event; reload the active model in the try-on overlay. |

Open questions to resolve before Phase 1:
1. Self-host MediaPipe model weights or load from `cdn.jsdelivr.net`? Recommendation: bundle them in Pro, optional opt-in self-host in Free.
2. Snapshot share flow (saved to media library? direct download? Twitter/IG share button?)
3. Per-product anchor calibration UI — does the merchant calibrate in the metabox (Pro)? Needed for products where the default anchor doesn't fit (e.g., earrings on a face with non-standard ear positions, oversized hats).
4. Confidence threshold for "no face detected" state — show fallback message? Hide try-on button entirely?
5. Should WooCommerce product type drive default tracking mode? E.g., a product tagged "eyewear" auto-uses Face Landmarker, "watch" auto-uses Hand Landmarker. Suggested category-to-mode mapping shipped in Pro.

---

## 7. Sources

- [TensorFlow.js Pre-made Models](https://www.tensorflow.org/js/guide/premade_models)
- [tfjs-models GitHub](https://github.com/tensorflow/tfjs-models)
- [MediaPipe Tasks JS](https://developers.google.com/mediapipe/solutions/vision/face_landmarker/web_js)
- [MediaPipe Face Landmarker](https://developers.google.com/mediapipe/solutions/vision/face_landmarker)
- [MediaPipe Hand Landmarker](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker)
- [MediaPipe Pose Landmarker](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker)
- [`<model-viewer>` docs](https://modelviewer.dev/)
- [`@mediapipe/tasks-vision` npm](https://www.npmjs.com/package/@mediapipe/tasks-vision)
- [TF.js size-optimized bundles](https://www.tensorflow.org/js/tutorials/deployment/size_optimized_bundles)

---

## 8. Cross-references

- Implementation plan (sibling doc): [tensorflowjs-integration-plan.md](./tensorflowjs-integration-plan.md)
- Existing feature analysis: [FEATURE-ANALYSIS.md](./FEATURE-ANALYSIS.md)
- Pro feature roadmap: [PRO-FEATURES-COMPLETE.md](./PRO-FEATURES-COMPLETE.md)
- **Successor / Phase 2 — fit measurement:** [prescription-fit-research.md](./prescription-fit-research.md) — adds the metric-scale layer (ISO 7810 card calibration, ARKit/ARCore paths) so the same Face Landmarker output can answer *"will it fit?"* in addition to *"how does it look?"*.
- **Successor / Phase 2 — implementation:** [prescription-fit-integration-plan.md](./prescription-fit-integration-plan.md).
