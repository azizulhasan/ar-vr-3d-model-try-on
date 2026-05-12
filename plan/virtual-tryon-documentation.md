# Virtual Try-On — Glasses & Caps

> **Live AR try-on for WooCommerce.** Let shoppers preview eyewear (glasses, sunglasses, aviators) and headwear (caps, hats, beanies) on themselves through their device's webcam — no app install, no signup, works on any modern phone, tablet or desktop.

---

## Table of Contents

1. [What is Virtual Try-On?](#what-is-virtual-try-on)
2. [Quick start (5 minutes)](#quick-start-5-minutes)
3. [What you need](#what-you-need)
4. [Free vs Pro](#free-vs-pro)
5. [Per-product configuration](#per-product-configuration)
6. [How it works under the hood](#how-it-works-under-the-hood)
7. [Privacy & data handling](#privacy--data-handling)
8. [Browser & device support](#browser--device-support)
9. [Snapshot button (customer photo)](#snapshot-button-customer-photo)
10. [Live calibration panel (Pro)](#live-calibration-panel-pro)
11. [Auto-fit (no merchant tuning for typical GLBs)](#auto-fit-no-merchant-tuning-for-typical-glbs)
12. [Theme integration](#theme-integration)
13. [Developer hooks](#developer-hooks)
14. [Troubleshooting](#troubleshooting)
15. [Frequently asked questions](#frequently-asked-questions)

---

## What is Virtual Try-On?

Virtual Try-On adds a button next to the existing 3D Viewer / AR button on a WooCommerce product page. When a shopper taps it, the plugin:

1. Asks for camera permission.
2. Opens a full-screen modal with their live webcam feed.
3. Tracks their face in real time using **MediaPipe Face Landmarker** (a 468-point face mesh running entirely in the browser).
4. Renders the product's 3D model **on** their face — depth-occluded behind the head when they turn, scaled to their actual head size, repositioned every frame as they move.
5. Lets them take a snapshot to download.

It's the same in-browser AR experience customers get on Warby Parker, L'Oréal, and Snapchat — built into your WordPress store with zero third-party SaaS dependency.

## Quick start (5 minutes)

### Step 1: Install the plugin

Install **"3D Viewer – 3D Model Viewer – Augmented Reality"** from the WordPress plugin directory (free). Optionally install **"AR Try-On — Glasses & Caps"** (the Pro addon) for the full feature set.

### Step 2: Upload a 3D model (.glb)

Edit any WooCommerce product → scroll to the AtlasAR / 3D Viewer metabox → upload a `.glb` or `.gltf` file. Free supports `.glb`; Pro adds USDZ + compression.

### Step 3: Set the AR placement to a face mode

In the same metabox, set **AR Placement** to one of:

| Value | Use for |
|---|---|
| `face-glasses` | Eyeglasses, sunglasses, aviators, reading glasses |
| `face-hat` | Caps, baseball caps, top hats, beanies, fedoras |

### Step 4: Save the product

A **Try On** button now appears next to the 3D Viewer cube on the product page. Customers tap it, grant camera permission, and the accessory snaps onto their face.

That's it. The feature auto-detects the GLB's anatomy on first load, so you don't normally need to tune anything manually.

## What you need

**For merchants:**

- WordPress 5.6+
- WooCommerce (optional but typical — the feature works on any post type that has a 3D model)
- A `.glb` file for the product (3D model). Tools for creating one: Blender, Maya, Reality Composer (Mac), or commission a 3D artist.
- HTTPS on your site (browsers require secure context for camera access)

**For shoppers:**

- A device with a front-facing webcam (any phone from the last 5 years, any laptop with a built-in camera)
- A modern browser: Chrome 90+, Safari 14+, Edge, Firefox, Samsung Internet
- No app install, no account creation, no email required

## Free vs Pro

| Capability | Free | Pro |
|---|---|---|
| Face tracking (MediaPipe 468 landmarks) | ✓ | ✓ |
| 2D sprite overlay (model-viewer snapshot) | ✓ | — |
| 3D depth-occluded GLB overlay (real three.js render) | — | ✓ |
| Head pose tracking (turn, tilt, nod) | ✓ basic | ✓ full 3D facialTransformationMatrix |
| Number of Try-On products | 3 face products max | Unlimited |
| Snapshot watermark | "Powered by AtlasAR" badge | None |
| Snapshot resolution | 1× (canvas size) | 2× (HD) |
| Live per-product calibration panel | — | ✓ admin-only floating panel with offsetX/Y/Z, scale, rotation X/Y/Z sliders |
| Multi-face detection (up to 2 faces) | — | ✓ |
| Hat back-half occlusion (skull-ellipsoid) | — | ✓ |
| Auto-fit (GLB anatomy detection at load) | ✓ | ✓ |
| WooCommerce variation handler (3D model per variant) | — | ✓ |
| GLB compression (Draco + Meshopt) | — | ✓ |
| Format converter (USDZ ↔ GLB) | — | ✓ |
| 14-day Pro free trial | — | ✓ included |

**Free is fully functional** for stores with three or fewer Try-On products. The Pro upgrade primarily matters for depth-correct rendering (the product visibly occludes behind the customer's head when they turn) and unlimited catalogue size.

## Per-product configuration

Each product's Try-On behaviour is controlled through the **AtlasAR** metabox on the product edit screen.

| Setting | Effect |
|---|---|
| **3D Model file** | The `.glb` to render. Free accepts `.glb` only; Pro adds `.gltf`, `.usdz` (via converter), and compressed formats. |
| **AR Placement** | Choose `face-glasses` or `face-hat` to opt this product into Try-On. Other placements (`floor`, `wall`, `default`) leave the existing 3D Viewer behaviour untouched. |
| **Try-On button label** | Override the default "Try it on" label on a per-product basis (Pro). Global default is set in the AtlasAR Dashboard → Settings tab. |
| **Show static 3D viewer alongside Try-On** | When ON, the 3D cube icon still appears beside the Try-On button. When OFF (default for face products), only the Try-On button shows. |

Per-product **calibration** (Pro): see [Live calibration panel](#live-calibration-panel-pro).

## How it works under the hood

For developers / merchants curious about what's running on the customer's machine:

1. **MediaPipe Face Landmarker** loads on first Try-On click (lazy-loaded, ~5 MB model cached in IndexedDB after first use). Runs in a dedicated Web Worker so the UI thread stays at 60 fps.

2. Each video frame is passed to the worker, which returns 468 face landmarks plus the head's 3D pose matrix (Pro). Output rate is typically 30 fps on mid-range mobile, 60 fps on desktop.

3. **Free path** — The product's GLB is rendered to a 2D sprite using Google's `<model-viewer>` at modal-open time. That sprite is drawn on the live preview canvas at the landmark-derived anchor every frame.

4. **Pro path** — A separate three.js canvas is composited over the camera feed. The GLB is positioned in 3D world space using the live face landmarks plus the head's 6-DOF pose matrix. A skull-shaped depth occluder hides the back half of hats when the head turns.

5. **GLB Anatomy auto-fit** (both Free and Pro) runs on the first frame. It scans the GLB geometry to detect where the crown opening / lens center / bridge sits, then caches the result as post-meta so every subsequent customer skips the analysis pass.

6. **Snapshot** is generated client-side as a data URL and triggers an `<a download>`. No image is ever sent to a server.

## Privacy & data handling

We designed Try-On to be **privacy by default** — nothing the customer sees ever leaves their device.

| Privacy guarantee | How it's enforced |
|---|---|
| Camera video stays on the device | The video stream goes directly to a Web Worker for MediaPipe inference. It's never uploaded, never transcoded server-side, never written to disk. |
| Snapshots are local | The snapshot button generates a PNG in the browser and triggers a `<a download>` — no POST to the merchant's site, no media-library row, no `wp-content/uploads/` write. |
| No customer profile | We don't store who tried what. There's no analytics ping, no fingerprint collection, no third-party SDK. |
| No third-party CDN reads the camera | MediaPipe runs locally via WebAssembly. The model file is fetched once from Google's CDN (or self-hosted — see below) and cached in the browser. |
| Self-host option | Set `Dashboard → Settings → Self-host MediaPipe weights` to ON to serve the model from your own server instead of Google's CDN. |

For GDPR / CCPA compliance: Try-On does not constitute "data processing" since no customer biometric data is ever transmitted off-device. The face mesh exists for a few milliseconds in browser memory and is discarded each frame.

## Browser & device support

| Platform | Status |
|---|---|
| Chrome / Edge (Windows, macOS, Linux, Android) | Full support, all versions ≥ 90 |
| Safari (macOS, iOS) | Full support, all versions ≥ 14 |
| Firefox (desktop) | Full support |
| Samsung Internet (Android) | Full support |
| Older browsers / no camera | Try-On button is hidden, customer sees the standard 3D Viewer |
| In-app browsers (Facebook, Instagram, Twitter) | Often blocked from camera access; we fall back gracefully |

Performance benchmarks (single-face detection at 480p):

| Device | FPS |
|---|---|
| iPhone 14 / 15 | 60 fps |
| iPhone 11 / 12 | 30–60 fps |
| Pixel 6 / 7 | 30–60 fps |
| Mid-range Android (2020+) | 24–30 fps |
| MacBook Pro / desktop with discrete GPU | 60 fps |

## Snapshot button (customer photo)

A circular shutter button floats over the live preview (iOS-camera style). Tapping it:

1. Captures the current preview canvas (face + accessory) at the canvas's native resolution.
2. For Pro, captures at 2× resolution (HD).
3. For Free, adds a small "Powered by AtlasAR" watermark in the bottom-right.
4. Triggers an immediate file download — `tryon-<product-id>-<timestamp>.png` lands in the customer's Downloads folder.

No server upload happens. The customer can then share the PNG on social media manually if they want.

You can disable snapshots entirely from the Dashboard → Settings tab.

## Live calibration panel (Pro)

For admins (any user with `edit_posts`), a small **Calibration** tab pins to the right edge of the Try-On modal. Click it to expand a slider panel:

| Slider | Range | Effect |
|---|---|---|
| Offset X | −200 to +200 px | Shift the accessory left/right |
| Offset Y | −200 to +200 px | Shift up/down |
| Offset Z | −200 to +200 px | Shift forward/back (positive = closer to camera) |
| Scale | 0.5 – 2.0 | Multiplicative scale on top of auto-fit |
| Rotation X | −90° to +90° | Pitch the accessory |
| Rotation Y | −180° to +180° | Yaw |
| Rotation Z | −180° to +180° | Roll |

Keyboard shortcuts:

- **Ctrl+K** — Toggle panel open/closed
- **Ctrl+Z / Ctrl+Shift+Z** — Undo/redo
- **Ctrl+S** — Save calibration to this product
- **Copy** — Copy current values to clipboard (JSON, paste into another product)
- **Reset** — Reset to baseline (clears all overrides)

Saved calibration is persisted to `ar_try_on_product_settings` post-meta as a `tryon_calibration` sub-key. Every customer of that product sees the same calibrated fit on every device. Non-admin shoppers don't see the panel at all.

## Auto-fit (no merchant tuning for typical GLBs)

For most uploaded models the calibration panel is **optional** — the renderer auto-detects each GLB's geometry on first load:

- **Glasses** — bridge Z, lens center, temple span are scanned from the visible mesh vertices.
- **Hats** — crown opening Y, brim depth Z, inner-band radius are estimated by slicing the bbox horizontally.

The results are cached as post-meta under `ar_try_on_product_settings.glb_anatomy` so subsequent visitors get the cached values instantly (no client-side compute cost).

The renderer combines:

- Live face measurements (temple-to-temple distance for head width, nose-bridge landmark for glasses anchor, forehead-top for hats)
- Stored GLB anatomy (where the model's "inside" actually sits)

…to compute a correct per-frame scale and position. Both sides of the ratio are measured live, so the result is consistent on any face size and any device.

If a particular GLB has unusual geometry that auto-fit can't read correctly, fall back to the live calibration panel (Pro) — that's the canonical escape hatch and the saved values override the auto-detected ones.

## Theme integration

The Try-On modal automatically matches your active WordPress theme's primary action color. On modal open, the JS samples the computed `background-color` of the most prominent button on the page (WooCommerce's "Add to cart", or the theme's `.wp-block-button__link`) and applies it to the modal's CTA buttons.

So if your theme uses:

- Black buttons → Try-On modal uses black
- Pink buttons → Try-On modal uses pink
- Twenty Twenty-Five default (deep blue) → matches that

No CSS changes needed in your theme.

For more control, set CSS custom properties on the modal root:

```css
.art-tryon-modal {
    --art-tryon-primary: #ff6600;          /* CTA button fill */
    --art-tryon-primary-contrast: #fff;     /* Text on CTA */
}
```

## Developer hooks

PHP filters and actions for theme / addon developers:

```php
// Disable Try-On entirely on certain products
add_filter( 'atlas_ar_should_load_button', function( $should, $product_id ) {
    if ( has_term( 'archived', 'product_cat', $product_id ) ) return false;
    return $should;
}, 10, 2 );

// Lift the Free-tier 3-product cap (Pro does this automatically)
add_filter( 'atlas_ar_tryon_free_product_limit', function() { return 10; } );

// Force the snapshot watermark on (e.g. for branded campaigns)
add_filter( 'atlas_ar_tryon_snapshot_watermark', '__return_true' );

// Force HD snapshots on Free
add_filter( 'atlas_ar_tryon_snapshot_hd', '__return_true' );

// Override worker options (e.g. multi-face detection)
add_filter( 'atlas_ar_tryon_worker_options', function( $opts, $pro_active ) {
    $opts['numFaces'] = 2;
    return $opts;
}, 10, 2 );

// Listen for Try-On modal opens (Pro)
add_action( 'atlas_ar_tryon_session_recorded', function( $payload ) {
    // $payload = ['product_id' => ..., 'snapshot' => url, 'user_id' => ..., 'timestamp' => ...]
});
```

REST endpoints (namespace `ar_try_on/v1`):

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `POST` | `/tryon/glb-anatomy/{id}` | `edit_post` | Persist runtime-computed GLB anatomy |
| `POST` | `/tryon/calibration/{id}` (Pro) | `edit_post` | Persist per-product calibration values |

## Troubleshooting

**Try-On button doesn't appear on the product page.**
Check that the product has a `.glb` file uploaded and that **AR Placement** is set to `face-glasses` or `face-hat`. Other placements (`floor`, `wall`, etc.) deliberately don't show the Try-On button.

**Camera permission was denied.**
Browsers remember the denial per origin. Customers can re-enable it via the address-bar lock icon → Camera → Allow.

**"Loading face model..." never completes.**
The MediaPipe Face Landmarker model is ~5 MB. On a slow connection the first load can take 10–30 seconds. Subsequent opens use the browser cache and load in < 1 second. If it never completes, check the browser console for CORS errors against `storage.googleapis.com` or your self-hosted model URL.

**The accessory is in the wrong position on a specific product.**
Open Try-On on that product, expand the **Calibration** panel (Pro), adjust the sliders, click **Save**. Values are persisted per product.

**Accessory looks the wrong size.**
First, hard-reload the product page so the auto-fit re-runs. If still off, use Pro's calibration **Scale** slider to fine-tune.

**Snapshot button is hidden / clipped.**
On older Chrome Android versions without `dvh` (dynamic viewport height) support, the snapshot button can hide behind the on-screen keyboard or nav bar. Update Chrome to 108+ to resolve.

**The customer's face looks stretched.**
This is fixed in v1.9.3+ — the canvas is dynamically sized to the actual camera resolution instead of a fixed 640×480. If you're still on an older build, update the plugin.

## Frequently asked questions

**Does the customer need to install an app?**
No. Try-On runs entirely in the browser. No app, no signup, no extension.

**Will it work in Instagram / Facebook in-app browsers?**
Most in-app browsers block camera access. The Try-On button gracefully falls back to a "Please open in your default browser" notice.

**How much bandwidth does it use?**
Initial load: ~5 MB MediaPipe model (one-time, cached). Per session: 0 — the camera stream stays on the device.

**Can I sell Try-On on virtual products (digital downloads)?**
Yes, as long as the product has a `.glb` file attached. WooCommerce Simple, Variable, External, and Grouped product types all work.

**Does it work for color variations?**
Pro includes a WooCommerce variation handler. When the customer picks a variant, the Try-On model swaps to the variation's GLB if one is attached, otherwise stays on the parent product's GLB.

**Is there a Shopify version?**
Not yet. WordPress / WooCommerce only.

**Can I customize the "Try it on" button text?**
Yes — Dashboard → Settings tab → "Button label" sets the global default. Per-product overrides via the metabox (Pro).

**Does it support glasses with prescription lenses?**
The renderer doesn't simulate prescription distortion — it just overlays the 3D model. For lens-power simulation you'd need a separate optical pipeline.

**Can I add my own face accessories (earrings, makeup, beard, masks)?**
Currently only `face-glasses` and `face-hat` modes are shipped. The universal addon framework supports earrings, makeup, beard, masks, headphones, and more — see the [roadmap doc](https://github.com/azizulhasan/ar-vr-3d-model-try-on-pro/blob/main/addons/UNIVERSAL-AUTOFIT-FRAMEWORK.md) on the Pro repo. Those will ship as separate paid addons over the next releases.

---

*Last updated: v1.9.3. For the latest changes see the plugin's `readme.txt` or the GitHub repository.*
