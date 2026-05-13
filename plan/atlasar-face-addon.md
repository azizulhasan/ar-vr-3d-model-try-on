# Addon: `atlasar-face-addon` — Glasses & Caps Visual Try-On

**Status:** ✅ shipped in Pro 3.0.0 (AtlasTryOn launch release).
**Purpose:** Premium visual try-on for **glasses, sunglasses, hats and caps** — depth-occluded 3D overlay with head-pose tracking, snapshots, and live calibration.
**This doc:** retroactive specification of the already-shipped addon, kept as the reference template for sibling addon docs.

---

## 1. Pitch (one paragraph)

The shopper opens a glasses or cap product page, taps "Try It On", grants webcam access, and sees the product rendered onto their face in real time. As they turn their head, the model tracks their pose so the glasses stay on the bridge of their nose / the cap stays seated on the crown. They can take a watermark-free snapshot to share. Admins can fine-tune fit per product from the front end via a live calibration panel. This is the **"how does it look on me?"** product — it does not measure fit; that's the job of `atlasar-fit-addon`.

## 2. Tech stack

| Layer | Tech | Source |
|---|---|---|
| Face detection | MediaPipe Face Landmarker (468 points) | Free plugin, shared loader |
| Renderer | three.js orthographic camera, depth-occluded skull-ellipsoid mask | Pro addon (`tryon-pro-renderer.js`) |
| Calibration UI | jQuery panel injected at runtime for admin users | Pro addon (`tryon-pro-calibrator.js`) |
| Snapshot | Canvas → PNG, client-only download (no upload) | Free plugin (with Pro removing watermark) |
| Anchor strategy | Hotspots + facial transformation matrix → 3D world position | Pro addon (`tryon-pro-render-glue.js`) |
| Bundle plan | Lazy-loaded behind "Try It On" click. ~510 KB compressed JS + ~3 MB Face Landmarker WASM (cached IndexedDB) | webpack.mix.js |

## 3. Free plugin contribution

- `public/js/tryon/tryon-bootstrap.js` — opens camera, spawns worker
- `public/js/tryon/workers/face-landmarker.worker.js` — MediaPipe inference
- `public/js/tryon/tryon-controller.js` — frame loop, emits landmark events
- `public/js/tryon/glb-anatomy.js` — auto-fit anatomical analyser
- `public/css/tryon.css` — modal + canvas + safe-area handling
- Hooks Pro listens to: `atlas_ar_tryon_pre_render`, `atlas_ar_tryon_post_render`, `atlasar_model_viewer_hotspots`, `atlasar_before_model_viewer`

## 4. Pro addon files (`addons/atlasar-face-addon/`)

```
addon.json
addon.php
tryon-pro.js                       # entry, hooks Free's events
tryon-pro.min.js
tryon-pro-renderer.js              # three.js Pattern-2 renderer
tryon-pro-renderer.min.js
tryon-pro-render-glue.js           # landmark → 3D anchor mapping
tryon-pro-render-glue.min.js
tryon-pro-calibrator.js            # admin live-calibration panel
tryon-pro-calibrator.min.js
tryon-pro-calibrator.css
```

## 5. Per-product schema (post-meta `ar_try_on_product_settings`)

| Key | Type | Purpose |
|---|---|---|
| `ar_placement` | string | `face-glasses` / `face-cap` — opt-in trigger |
| `tryon_anchor_offset` | `{x, y, z}` mm | Calibration delta from auto-fit anchor |
| `tryon_anchor_scale` | float | Frame scale factor |
| `tryon_anchor_depth_bias` | float | Depth-occlusion fine-tune |
| `tryon_glb_anatomy_cache` | object | Auto-fit GLB analyser results (cached) |

Stored by `tryon-pro-calibrator.js` via `/ar_try_on_pro/v1/tryon/calibration`.

## 6. UX flow

1. Product page renders normal product image + 3D viewer + "Try It On" button.
2. Shopper taps "Try It On" → consent modal asks for camera permission.
3. On grant: fullscreen overlay opens, camera feed visible, Face Landmarker initialises (1–3 s on first load, cached after).
4. Glasses / cap model renders on shopper's face, head-pose tracked.
5. Floating shutter button → client-side PNG snapshot download.
6. Close → camera released, modal dismissed.
7. **(Admin only)** Calibration panel appears in the modal for fine-tuning offset/scale/depth per product. Saves to product meta.

## 7. Freemius product

- **Product slug:** `atlasar-face-addon`
- **Display name:** "AtlasTryOn — Glasses & Caps"
- **Pricing:** $X/year single site, $Y/year 5 sites, $Z lifetime (TBD by product team)
- **Licence check:** `av3mto_fs()->is_features_enabled() || av3mto_fs()->is_addon_active('atlasar-face-addon')`
- **Bundle membership:** "AtlasTryOn Suite" (includes all 5 addons)

## 8. Acceptance criteria (met by 3.0.0 release)

- ✅ Webcam glasses/cap try-on works on iOS / Android / desktop Chrome / Safari / Firefox / Edge
- ✅ Head-pose tracking keeps model attached as shopper turns ±45° yaw, ±30° pitch
- ✅ Multi-face detection up to 2 faces simultaneously
- ✅ Watermark-free HD snapshot download
- ✅ Per-product calibration panel for admins (offset / scale / depth)
- ✅ Per-product auto-fit anatomical analyser caches results in post-meta
- ✅ No video / frames / face data leaves shopper's device
- ✅ Lazy-loaded — zero impact on initial page render

## 9. Known limits (acceptable for this addon's scope)

- **Visual only** — no fit feedback, no PD measurement, no sizing verdict. That's `atlasar-fit-addon`.
- **Webcam-only** — does not use iOS ARKit TrueDepth or Android ARCore. Future fit addon may.
- **One face per modal session** — second face renders but doesn't get its own calibration. Multi-shopper UX could be deeper but isn't on the roadmap.

## 10. Cross-references

- [`tensorflowjs-research.md`](tensorflowjs-research.md) — model catalogue
- [`tensorflowjs-integration-plan.md`](tensorflowjs-integration-plan.md) — v1 implementation plan that delivered this addon
- [`atlasar-fit-addon.md`](atlasar-fit-addon.md) — successor addon that adds measurement on top of this one
- [`virtual-tryon-documentation.md`](virtual-tryon-documentation.md) — customer-facing user docs
