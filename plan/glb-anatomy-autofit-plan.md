# GLB-Anatomy Live Auto-Fit — Final Plan

## Goal

Every uploaded GLB (hats, glasses, future accessories) sits correctly on every customer's face / head the first time it's opened, on every device, with **zero manual calibration for typical models**. As the customer moves (forward/back, side-to-side, tilt, rotate), the accessory follows their face anatomically in real time.

## Idea in one paragraph

The renderer needs two measurements per frame: the customer's body part (already done — live MediaPipe landmarks) and the GLB's own anatomy (where its crown opening sits, where the lens center is, etc.). Today only the customer side is measured live; the GLB side is hard-coded constants or merchant calibration. This plan extracts the GLB's anatomy **in JavaScript** at load time, caches it in the existing `ar_try_on_product_settings` post-meta, and feeds it into the renderer so both sides of the ratio are derived, not tuned. After that, every frame's live landmark math produces correct fit on every face / device.

## Data model

Extend the existing `ar_try_on_product_settings` post-meta with one new sub-key:

```php
get_post_meta( $post_id, 'ar_try_on_product_settings', true ) === array(
    // ... existing keys (ar_placement, src, etc.) ...
    'glb_anatomy' => array(
        'version'      => 1,
        'computed_at'  => 1778500000,
        'computed_by'  => 'client-v1.9.2',
        // Universal facts measured from the GLB geometry:
        'bbox_min'     => array( -0.15, -0.10, -0.08 ),
        'bbox_max'     => array(  0.15,  0.10,  0.08 ),
        'silhouette_w' => 0.31,    // tightest visible width in world units
        'silhouette_h' => 0.20,
        // Per-mode anatomy (only the relevant keys are populated):
        'hat' => array(
            'crown_opening_y' => -0.05,  // Y of brim plane (where head enters)
            'brim_depth_z'    => -0.04,  // Z extent of front brim
            'inner_radius'    => 0.10,   // approximate circumference of opening
        ),
        'glasses' => array(
            'lens_center'     => array( 0.0, 0.0, 0.0 ), // midpoint of lens loops
            'temple_span_x'   => 0.14,   // lens-to-lens width
            'bridge_z'        => 0.0,    // front-most Z (sits on nose)
        ),
    ),
);
```

All values are in the GLB's native units (typically meters). Renderer converts to canvas pixels using the same `glbBaseSize → eyeDistance` scale conversion that already exists.

## Component split

### Shared JS module (Free)

`public/js/tryon/glb-anatomy.js` — pure functions, no DOM dependencies, importable by both Free's controller and Pro's renderer.

```js
export async function computeGlbAnatomy( gltfScene, mode ) {
    // Walk visible meshes, compute bbox / silhouette / per-mode anatomy.
    // Return a plain object matching the post-meta `glb_anatomy` schema.
}
```

### Free REST endpoint

`POST /ar_try_on/v1/glb-anatomy/{post_id}` (in `api/AR_TRY_ON_Tryon_Routes.php`)
- Permission: `current_user_can('edit_post', $post_id)` — admin only.
- Body: `{ anatomy: {...} }`.
- Writes the value into `ar_try_on_product_settings.glb_anatomy`.

Pro reuses this endpoint — no separate Pro endpoint.

### PHP localization

In `AR_TRY_ON_Tryon::enqueue_assets()` and the Pro face-addon enqueue:
- Read the current product's `ar_try_on_product_settings.glb_anatomy` if present.
- Localize as `window.atlas_ar_tryon.glb_anatomy`.

### Frontend flow

1. GLB loads (Free's `<model-viewer>` → snapshot path **or** Pro's GLTFLoader path).
2. If `glb_anatomy` is already localized from post-meta → use it directly.
3. Else compute via `glb-anatomy.js` (~50–100 ms once per GLB).
4. If user `is_admin` → POST result to the REST endpoint (admin-only persistence so non-admin visitors can't write garbage). Otherwise just use it locally for this session.
5. Renderer uses the anatomy values for first-render placement; live landmark math runs every frame on top.

## Per-frame math (unchanged, just with correct constants)

```
headWidthPx        = MediaPipe templeR ↔ templeL distance       (live)
targetWidthPx      = anatomy.silhouette_w → glb-canvas px       (now derived)
baseScale          = targetWidthPx / glbBaseSize × calScale     (existing)
anchor.y           = forehead landmark Y                        (live)
hatOffsetY         = anatomy.hat.crown_opening_y × baseScale    (now derived)
hatOffsetZ         = anatomy.hat.brim_depth_z × baseScale       (now derived)
```

`calScale` etc. stay as the Pro live-calibration override merchants can use for the rare GLB the auto-anatomy can't handle perfectly.

## Implementation files (~400 LOC total)

| File | LOC | Purpose |
|---|---|---|
| `public/js/tryon/glb-anatomy.js` (NEW) | ~150 | Pure analysis functions |
| `api/AR_TRY_ON_Tryon_Routes.php` | +50 | New REST endpoint |
| `includes/AR_TRY_ON_Tryon.php` | +20 | Localize cached anatomy |
| `public/js/tryon/tryon-controller.js` | +30 | Compute / persist / pass to renderer |
| `public/js/tryon/tryon-anchors.js` | +30 | Use anatomy for placement |
| `addons/atlasar-face-addon/tryon-pro-renderer.js` (Pro) | +60 | Use anatomy as baseline, persist |
| `addons/atlasar-face-addon/addon.php` (Pro) | +10 | Read same post-meta if present |

## Expected behaviour after shipping

**First admin opens a product page:**
- GLB loads, anatomy computed in browser (~50–100 ms).
- Auto-POST to REST endpoint → saved as `ar_try_on_product_settings.glb_anatomy`.
- Try-On opens, hat sits correctly on the admin's head with no manual adjustment.

**Every subsequent customer (any device):**
- PHP localizes the cached anatomy at page render → JS has it before the camera even starts.
- Try-On opens, hat sits correctly on their head with no compute cost.

**Live tracking (every frame):**
- MediaPipe FaceLandmarker reports new landmark positions.
- Renderer applies anatomy offsets (in world units → canvas pixels via the live scale).
- Hat / glasses follow the customer's face: closer-to-camera = bigger; turning = rotated; tilting = tilted; back-and-forth = scaled per `eyeDistPx`.
- Existing `facialTransformationMatrix` continues to drive head rotation in Pro.

**Edge cases:**
- GLB with unusual geometry that anatomy detection mis-reads → merchant overrides via the existing live calibration panel (Pro). Calibration is applied on top of anatomy, so it's still the canonical fix when needed.
- Non-admin customer visits a brand-new product before any admin has → anatomy computed once per session in their browser; not persisted; works just as well, just no caching for next time.

## What this replaces vs preserves

| Replaces | With |
|---|---|
| Hardcoded `bodyMul` constants in BASELINE | Per-GLB anatomy from post-meta |
| Merchant calibrating Scale/OffsetZ on every product | Auto-derived; calibration becomes optional |
| Cheekbone × constant for hat width | Anatomy `inner_radius` × live face scale |

| Preserves | Why |
|---|---|
| Live MediaPipe landmark tracking | Drives per-frame positioning |
| Pro live calibration panel | Override for edge-case GLBs |
| Silhouette-measured `glbBaseSize` in Pro | Independent measurement, complementary |
| `ar_try_on_product_settings` post-meta key | User requested it be the single store; matches existing schema |

## Non-goals

- Selfie segmentation (reverted; not needed for accessory placement).
- Server-side GLB parsing (frontend is sufficient).
- New post-meta key (we extend the existing one).
- Universal Hand/Pose framework (separate doc; this plan covers face accessories).
