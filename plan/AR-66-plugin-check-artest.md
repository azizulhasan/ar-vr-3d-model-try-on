# Plugin Check — Free plugin @ artest (AR-66, 2.2.0 candidate)

Run: artest → Tools → Plugin Check → "3D Viewer … Virtual Try On" (Free only).
Categories: General, Plugin Repo, Security, Performance, Accessibility. Types: Error + Warning.

**Initial run: 2 ERROR, 30 WARNING. After fix → re-run: 0 ERROR, 30 WARNING. ✅**

> The 2 errors were fixed (commit below) and a re-run confirms 0 errors. The 30
> warnings are unchanged and are all expected (see analysis).

---

## ERRORS (2) — FIXED ✅ (re-run shows 0 errors)
Fixed in the orphan-temp sweep: `@unlink()` → `wp_delete_file()`,
`@rmdir()` → `$wp_filesystem->rmdir()` (WP_Filesystem init added). Verified the
sweep still removes old files + empty dirs and keeps fresh files; artest re-run
reports 0 errors.

| File | Line | Sniff | Message |
|---|---|---|---|
| `includes/AR_TRY_ON_Helper.php` | 1585 | `WordPress.WP.AlternativeFunctions.unlink_unlink` | `unlink()` is discouraged. Use `wp_delete_file()`. |
| `includes/AR_TRY_ON_Helper.php` | 1591 | `WordPress.WP.AlternativeFunctions.file_system_operations_rmdir` | File ops should use WP_Filesystem; found `rmdir()`. |

Both are in the orphan-temp-file sweep (not in the AR-66 changes). Real, easy
fixes (`wp_delete_file()` + `$wp_filesystem->rmdir()`), same class as the
item-2 work. **These are the items most worth fixing before the SVN push** —
they're the only ERROR-level findings.

---

## WARNINGS (30)

### A. Namespace prefix — 16 warnings (`PrefixAllGlobals.NonPrefixedNamespaceFound`)
PCP wants the namespace to start with the detected plugin prefix; `AR_TRY_ON*`
doesn't. **Expected** — the `AR_TRY_ON → ATLAS_AR` rename was deliberately
DECLINED/reverted (warning-level, pre-existing in 2.1.0, and renaming risks a
fatal during the Free/Pro update window).

```
admin/AR_TRY_ON_Admin.php:3            "AR_TRY_ON_Admin"
public/AR_TRY_ON_Public.php:3          "AR_TRY_ON_Public"
includes/AR_TRY_ON.php:3               "AR_TRY_ON"
includes/AR_TRY_ON_Activator.php:3     "AR_TRY_ON"
includes/AR_TRY_ON_Admin_Notice.php:2  "AR_TRY_ON"
includes/AR_TRY_ON_Cache.php:3         "AR_TRY_ON"
includes/AR_TRY_ON_Compression.php:2   "AR_TRY_ON"
includes/AR_TRY_ON_Compression_DB.php:3 "AR_TRY_ON"
includes/AR_TRY_ON_Constants.php:3     "AR_TRY_ON"
includes/AR_TRY_ON_Deactivate.php:2    "AR_TRY_ON"
includes/AR_TRY_ON_Helper.php:3        "AR_TRY_ON"
includes/AR_TRY_ON_Hooks.php:3         "AR_TRY_ON"
includes/AR_TRY_ON_Lib_AtlasAiDev.php:3 "AR_TRY_ON"
includes/AR_TRY_ON_Loader.php:2        "AR_TRY_ON"
includes/AR_TRY_ON_Tryon.php:3         "AR_TRY_ON"
includes/AR_TRY_ON_Tryon_Hooks.php:3   "AR_TRY_ON"
```

### B. Non-prefixed hook name — 1 warning (`PrefixAllGlobals.NonPrefixedHooknameFound`)
```
includes/AR_TRY_ON.php:272   "woocommerce_gallery_thumbnail_size"
```
**False positive** — this is `apply_filters('woocommerce_gallery_thumbnail_size', …)`,
i.e. applying WooCommerce's OWN documented filter, not declaring a plugin hook.

### C. Dynamic hook names in the bundled AtlasAiDev tracker lib — 13 warnings (`PrefixAllGlobals.DynamicHooknameFound`)
The opt-in telemetry library builds hook names from `$this->slug` / `getSlug()`,
which PCP can't statically verify. Pre-existing, third-party-style lib code.
```
libs/AtlasAiDev/Client.php:193   $this->slug . '_request_route'
libs/AtlasAiDev/Client.php:200   $this->slug . '_AtlasAiDev_API_EndPoint'
libs/AtlasAiDev/Client.php:215   $this->slug . '_AtlasAiDev_API_URL'
libs/AtlasAiDev/Client.php:285   $this->getSlug() . '_before_request'
libs/AtlasAiDev/Client.php:296   $this->getSlug() . '_before_request_' . $route
libs/AtlasAiDev/Client.php:305   $this->getSlug() . '_request_blocking_mode'
libs/AtlasAiDev/Client.php:339   $this->getSlug() . '_after_request'
libs/AtlasAiDev/Client.php:348   $this->getSlug() . '_after_request_' . $route
libs/AtlasAiDev/Insights.php:266 $this->client->getSlug() . '_tracking_interval'
libs/AtlasAiDev/Insights.php:324 $this->client->getSlug() . '_tracker_data'
libs/AtlasAiDev/Insights.php:345 $this->client->getSlug() . '_what_tracked'
libs/AtlasAiDev/Insights.php:467 $this->client->getSlug() . '_extra_uninstall_reasons'
libs/AtlasAiDev/Insights.php:(1 more) $this->client->getSlug() . '_…'
```

---

## Read on the AR-66 changes
- **Zero NEW errors/warnings from the AR-66 escaping / wp_kses / inline-script
  moves / custom_css / path-traversal work** — none of those files show up
  except the 2 pre-existing `unlink`/`rmdir` errors in Helper.
- The reviewer's flagged short `wp_ajax_ar_*` prefix items: **GONE** from the
  report (now `atlas_ar_*`).
- The namespace warnings are the expected, accepted trade-off of keeping
  `AR_TRY_ON`.

## Suggested action (for later, NOT done here)
1. Fix the 2 ERRORS (`unlink`→`wp_delete_file`, `rmdir`→`$wp_filesystem->rmdir`).
2. Leave A/B/C warnings as-is (pre-existing, warning-level, declined-rename /
   false-positive / bundled-lib). 2.1.0 carried the same warnings.

---

## Smoke test on artest (deployed Free 2.2.0 candidate)

Content available: product #85 `shirt-green` (non-face, has model); post #1
`hello-world` (`[atlas_ar]`, but 'post' isn't an AR-supported type so it renders
nothing — expected). No face products / toggle-mode / extra shortcode posts on
artest, so those paths were verified on the tts dev site with the identical build.

Verified PASS on artest (product #85, browser):
- All renamed assets load: `ar-tryon-buttons.css`, `ar-tryon-buttons-sampler.js`,
  `ar-shortcode-reveal.js`, `ar-image-3d-toggle.js`, `ar-qr-init.js`. No 404s.
- No inline plugin `<script>` (0 `getModelSkeleton`/`initToggle`/`getPoster`),
  no critical error, no console errors (only model-viewer's benign
  "AbortError: Transition was skipped").
- QR: placeholder div renders (kses'd, data-atlas-qr-url/brand) and `ar-qr-init.js`
  generates the QR into it (img/canvas present).
- Dyn buttons block: "View in AR" button renders with the CSS-mask icon
  (white, currentColor) and `data-product-id="85"` (modernized attr).
- View-in-AR click → AtlasAR modal opens with `<model-viewer id=…__85>` (built
  from the freshly-deployed `AtlasAR.dist.js?ver=filemtime`). data-product-id is
  read correctly (no "Product ID is missing").
- custom_css (item 1): planted `</style><script>window.__ARTEST_XSS=…</script>
  .atlas_ar_model_viewer{outline:5px solid magenta}` on #85 → opened modal →
  `__ARTEST_XSS` undefined (no execution), `<style>` content is the sanitized
  rule (no `<script>`), and the magenta outline applied (rgb(255,0,255)).
  Stored payload then cleaned.
- Admin-notice AJAX rename (item 6): deployed PHP hooks + admin-notice.js actions
  are `atlas_ar_dismiss_notice` / `atlas_ar_track_notice_action` /
  `atlas_ar_notice_nonce`; zero old `ar_*` variants remain.

Verified on tts dev (identical build) earlier: shortcode model-viewer reveal,
image⇄3D gallery toggle, WC "3D View" tab lazy-load, Try-On overlay placement,
dyn-buttons theme sampler, path-traversal guard (probe).
