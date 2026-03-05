# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AtlasAR — a WordPress plugin for AR/VR 3D model viewing with WooCommerce integration. Uses Freemius for licensing (free + Pro). Built with PHP 7.4+ on the backend and React 18 on the frontend.

## Build Commands

```bash
npm run production        # Laravel Mix: compile all JS (main build command)
npm run dev               # Laravel Mix: development build
npm run watch             # Laravel Mix: watch mode for development
npm run tailwind          # Build Tailwind CSS with watch
npm run build             # Full build: production + tailwind + compile + gulp copyPro
npm run block:build       # Build Gutenberg blocks via wp-scripts
npm run block:start       # Dev server for Gutenberg blocks
npm run makeZip           # Create distribution zip via Gulp
```

There are no automated tests (no Jest/PHPUnit configured).

## Architecture

### PHP — PSR-4 Autoloading

| Namespace | Directory | Purpose |
|---|---|---|
| `AR_TRY_ON\` | `includes/` | Core plugin logic |
| `AR_TRY_ON_Admin\` | `admin/` | Admin panel |
| `AR_TRY_ON_Public\` | `public/` | Frontend rendering |
| `ATLAS_AR_API\` | `api/` | REST API (namespace `ar_try_on/v1`) |

**Plugin boot sequence:** `ar-vr-3d-model-try-on.php` → Composer autoload → Freemius init → constants → `atlas_ar_run()` on `init` hook → `AR_TRY_ON` main class → `AR_TRY_ON_Loader` registers all hooks → admin/public classes initialized.

**Hook registration pattern:** All hooks go through `AR_TRY_ON_Loader` (`add_action`/`add_filter` with component + callback), executed via `$this->loader->run()`.

### Key PHP Classes

- `AR_TRY_ON` (`includes/AR_TRY_ON.php`) — Main plugin orchestrator
- `AR_TRY_ON_Helper` (`includes/AR_TRY_ON_Helper.php`) — Utility functions
- `AR_TRY_ON_Compression` (`includes/AR_TRY_ON_Compression.php`) — 3D model compression (Draco + Basis Universal)
- `AR_TRY_ON_Admin` (`admin/AR_TRY_ON_Admin.php`) — Admin hooks, enqueue scripts, MIME types
- `AR_TRY_ON_Public` (`public/AR_TRY_ON_Public.php`) — Frontend rendering, shortcode output

### React Frontend (src/)

Two independent React 18 apps compiled via Laravel Mix (webpack.mix.js):

| Entry point | Compiled output | Mount target |
|---|---|---|
| `src/dashboard/index.js` | `admin/js/build/ar-try-on-dashboard-ui.min.js` | `#ar_try_on_dashboard_ui` |
| `src/metabox/index.js` | `admin/js/build/ar-try-on-metabox-ui.min.js` | `#atlas_ar_product_model_settings` |

Both use React 18's `createRoot()` API. Shared utilities live in `src/context/`.

**Dashboard app** (`src/dashboard/components/dashboard/`) — Plugin settings page with tabs: overview, settings, compression analytics, documentation, features, integration.

**Metabox app** (`src/metabox/components/`) — Product editor sidebar with sections: content, settings, camera, style, light/environment, dimensions (Pro), hotspots (Pro), sliders (Pro), Tripo3D integration, compression.

### Public-Facing JavaScript (public/js/)

- `AtlasAR.js` → `AtlasAR.dist.js` — Main 3D viewer module
- `google-model-viewer.js` — Google's `<model-viewer>` web component (bundled)
- `variation-handler.js` — WooCommerce variation ↔ 3D model switching
- `lazy-load-model-viewer.js` — Intersection Observer lazy loading
- `single-product.js` — WooCommerce single product page integration

### Webpack Build (webpack.mix.js)

Laravel Mix handles React JSX compilation. Key outputs:

```
src/dashboard/index.js          → admin/js/build/ar-try-on-dashboard-ui.min.js
src/metabox/index.js            → admin/js/build/ar-try-on-metabox-ui.min.js
admin/js/ar-try-on-media-library.js → admin/js/build/ar-try-on-media-library.min.js
admin/js/ar-compression-client.js → admin/js/build/ar-compression-client.min.js
public/js/ar-vr-3d-model-try-on-public.js → public/js/ar-vr-3d-model-try-on-public-dist.js
public/js/AtlasAR.js            → public/js/AtlasAR.dist.js
```

The build auto-removes unwanted chunk files after compilation.

### Tailwind CSS

Prefix: `art-` (all utility classes are `art-*` to avoid conflicts with WordPress). Config in `tailwind.config.js`, with a separate `tailwind.config.modal.js` for modal styles.

## Global Constants (PHP)

```
ATLAS_AR_NONCE, ATLAS_AR_TEXT_DOMAIN, ATLAS_AR_ROOT_FILE,
ATLAS_AR_PLUGIN_URL, ATLAS_AR_PLUGIN_PATH, ATLAS_AR_VERSION,
ATLAS_AR_PLUGIN_NAME, ATLAS_AR_DEBUG_MODE
```

## Frontend Data Bridge

Both admin and public JS receive data via `wp_localize_script()` on the `ar_try_on` object:
```javascript
ar_try_on.api_url        // REST API base
ar_try_on.rest_nonce     // WP nonce for authentication
ar_try_on.is_pro_active  // Pro license status
ar_try_on.VERSION        // Plugin version
```

## Known Pitfalls

- **WooCommerce variation image swap:** WooCommerce fires `found_variation`/`show_variation` events that replace the product image, overriding the 3D viewer. The fix in `switchModelVariant()` and `preventWooCommerceImageSwap()` uses setTimeout to re-show the viewer after WooCommerce acts. Use case-insensitive matching for variant names (slugs vs display names).
- **MIME types:** `mime_types()` in `AR_TRY_ON_Admin` must use `array_merge($mimes, ...)` to *add* 3D file types, not replace the entire mime array.
- **Chunk cleanup:** The webpack build produces chunk files that aren't needed — `webpack.mix.js` has a `Mix.listen('afterCompile')` hook that deletes them automatically.

## CI/CD

GitHub Actions deploys to a testing server via FTP on push to `main` or `develop` (`.github/workflows/deploy.yml`).

## Shortcode

`[atlas_ar]` — Renders the 3D model viewer on the frontend. Also available as a Gutenberg block.
