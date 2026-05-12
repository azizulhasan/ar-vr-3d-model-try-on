# Auto-Fit Retrospective — what we tried, what worked, what didn't

**Date:** 2026-05-11
**Session goal:** make Try-On accessories fit any face / any device / any GLB without merchant calibration.
**Outcome:** partial. We removed the "wrong axis / hidden mesh" sources of error, but **per-GLB anatomy** (where the model's origin sits relative to the body part it wears on) cannot be auto-derived at runtime — that genuinely requires either upload-time GLB normalization (Phase A) or merchant calibration.

This doc captures every approach tried in chronological order, the symptom it addressed, why it fell short, and what code stayed vs reverted. Use it as the starting point for the next attempt.

---

## What stays in the codebase after this session

| Fix | Where | Why it earned a permanent spot |
|---|---|---|
| Nose-bridge anchor for glasses (Pro) | `tryon-pro-renderer.js` | Anatomically correct; eliminates Y-drift on glasses across face sizes. |
| Proportional offsets (`offsetYRatio` etc.) on Pro baseline | `tryon-pro-renderer.js` | Hat lift / glasses fine-tune now scales with face size — same placement on 320 px phone and 1080 p desktop. |
| Skull-mask gated to `face-hat` only | `tryon-pro-renderer.js` | Glasses temple arms were being clipped by the skull occluder; gating fixed that without regressing hats. |
| DPR-aware composite `drawImage(canvas, 0, 0, w, h)` | `tryon-pro-renderer.js` | Mobile (DPR ≥ 2) was rendering only the top-left quadrant of the three.js buffer. Explicit destination size fixes it. |
| Offscreen-silhouette `measureSilhouetteWidth` for `glbBaseSize` | `tryon-pro-renderer.js → loadGLB` | Replaces `bbox.x` (which inflates with temple flares / brim depth) with the true on-camera silhouette width. Materially better for non-standard GLB axes. |
| Visible-mesh bbox traversal in `loadGLB` | `tryon-pro-renderer.js` | Hidden / zero-vertex meshes no longer inflate the centering bbox. |
| Cheekbone × `bodyMul` width reference for hats | `tryon-pro-renderer.js` | Sensible default first-render; merchant fine-tunes via calibration. |
| Per-mode `bodyMul` (glasses 1.0, hat ~1.30) | `BASELINE` | Cheekbone-to-skull-width estimate is the right starting point on average. |

## What got reverted at the end and why

| Attempt | Why reverted |
|---|---|
| `max(X, Y, Z)` glbBaseSize | Picked the wrong axis for accessories where Z (depth) ≠ X (lateral). |
| Hardcoded `widthMul` tweaks (1.5, 1.8, 2.4) | Tuning constants per-product = exactly the calibration burden we were trying to avoid. |
| Free sprite alpha-trim | Worked, but coupled with the new widthMul made caps unpredictable across products; reverted to give merchants one canonical place to tune. |
| `widthMul` resolution chain (post-meta → settings → filter → default) | Merchants don't need a *second* tuning surface alongside the existing Pro live-calibration panel; over-engineered. |
| `skullRight/skullLeft` (lm 21/251) as size reference | These landmarks sit at the brow level which is **narrower** than the cheekbone span — caused hats to shrink instead of grow. |
| Selfie-segmenter worker (`selfie-segmenter.worker.js`) | Worked technically (correctly measured live head silhouette in pixels), but didn't solve the real problem: even with the right head width, the GLB's own crown-Z, brim-depth, and origin offset still need merchant calibration. Added 142 KB of model and a second worker for marginal gain. |
| Per-frame `headSilhouettePx` in drawCtx | Same reason — measurement was right, but the GLB side of the equation can't be auto-derived. |

---

## Why segmenter-driven auto-fit fell short

The plan was: measure the customer's actual head width in pixels per frame, divide by the GLB's silhouette width, get a correct scale on every face. The math IS right when both sides are pure widths. But for a top-hat to look correct, you also need:

- **offsetZ** of around `-86` so the brim sits behind the forehead, not in front of it (depends on the GLB's modeled brim depth).
- **offsetY** matching the GLB's crown-opening Y (some GLBs center on the brim, others on the crown apex).
- **scale tweak** of ~1.5× on top of the head-width measurement, because the GLB's silhouette extends past its inner band (where the head actually goes).

These are **per-GLB geometric facts**, not per-customer. They can only come from:

1. **Looking at the GLB at upload time** and detecting "this hat's crown opening is at Y=0.4 of bbox height, depth=0.6" → store as post-meta. (Phase A proper.)
2. **Merchant calibrating once** through the live panel and saving — the values then apply universally to every customer of that product.

No amount of runtime measurement of the customer can solve this, because the customer's head doesn't tell us where the GLB's crown opening is.

---

## The recommended path forward

### Short term (this is what the codebase is set up for now)

- Pro merchants use the existing live-calibration panel to set `{scale, offsetX, offsetY, offsetZ, rotationX/Y/Z}` once per product.
- The renderer applies that calibration on top of the cheekbone-width baseline.
- Every customer of that product sees the calibrated fit on every device.

### Phase A (true upload-time auto-fit) — when ready to invest 1–2 days

Pseudocode for the upload-side normalizer:

```
on GLB upload:
    parse GLB binary (PHP or Node side via @gltf-transform/core)
    compute bbox of visible geometry
    detect accessory type from ar_placement (face-hat, face-glasses, hand-watch …)

    for face-hat:
        find the LOWEST Y plane in bbox (= brim line)
        find the LOWEST opening in geometry (= crown opening)
        store crown_opening_y = (opening_y - bbox_center_y) / bbox_height
        store crown_depth_z   = (opening_z - bbox_front_z) / bbox_depth

    for face-glasses:
        find center of lens loops (XY plane)
        store lens_center_offset = …

    write {crown_y, crown_z, lens_center, …} to _atlas_ar_tryon_glb_geometry post-meta

at runtime:
    if post has _atlas_ar_tryon_glb_geometry:
        use those offsets as the per-product baseline
    else:
        fall back to live calibration panel
```

This pre-computes the per-GLB constants the merchant currently has to enter by hand, and it generalizes to future accessories (rings, watches, etc.) because each accessory type has its own well-defined geometric anchor.

---

## Files touched this session

- `ar-vr-3d-model-try-on/includes/AR_TRY_ON_Tryon.php` — reverted segmenter model URL
- `ar-vr-3d-model-try-on/public/js/tryon/tryon-controller.js` — reverted segmenter worker spin-up + fanout + helper
- `ar-vr-3d-model-try-on/public/js/tryon/tryon-anchors.js` — reverted to original signature, hat width back to `2.4 × eyeDist`
- `ar-vr-3d-model-try-on/public/js/tryon/workers/selfie-segmenter.worker.js` — **deleted**
- `ar-vr-3d-model-try-on-pro/addons/atlasar-face-addon/tryon-pro-renderer.js` — kept silhouette `glbBaseSize` + cheekbone × bodyMul + DPR composite + skull gate; reverted segmenter consumption, skull landmarks, headWidthMul.

## What NOT to try again

- Don't add MediaPipe ImageSegmenter for accessory sizing alone — the measurement isn't the bottleneck. (Segmenter IS still useful if/when we ship clothing or background-replacement features; revisit then.)
- Don't add new `widthMul` tuning constants for individual products — that's what the calibration panel is for, and one source of truth is better than two.
- Don't try to derive "where the crown opening is" from face landmarks. The face mesh stops at the hairline. The skull above and behind is invisible to MediaPipe Face Landmarker.

## Open: Phase A scope when ready

Estimated **~150 LOC** for face accessories (hat + glasses):
- `~60 LOC` GLB parser (Node-side preferred, `@gltf-transform/core` already in package.json)
- `~30 LOC` PHP wrapper to invoke Node script on upload + write post-meta
- `~20 LOC` Pro renderer reads post-meta and applies as baseline before live-calibration
- `~20 LOC` Free side: same post-meta drives sprite framing
- `~20 LOC` admin notice if normalization fails / model lacks expected geometry

Estimated **~150 LOC more** for hand / pose accessories (rings, watches, shoes, clothing) — when those product types actually exist.
