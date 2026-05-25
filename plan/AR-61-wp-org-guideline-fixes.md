# AR-61 — WP.org Plugin Closure Fixes

**Jira:** [AR-61](https://atlasaidev.atlassian.net/browse/AR-61)
**Help Scout:** #292
**WP.org Review ID:** `GUIDELINES ❗LIC-SRC ar-vr-3d-model-try-on/hasanazizul/19May26/T1 19May26/4.0.1B2`
**Branch (free):** `feature/AR-61` off `develop`
**Branch (pro):** `feature/AR-61` off `develop`
**Deadline:** 60 days from 2026-05-20 (≈ 2026-07-19) before public guideline-violation tag goes live.

---

## Status legend

| Symbol | Meaning |
|---|---|
| ⬜ | Not started |
| 🟨 | In progress |
| 🟦 | In review / awaiting verification |
| ✅ | Done |
| ⛔ | Blocked |
| 🚫 | Won't fix / N/A |

---

## 1. Primary violations (blockers for re-opening)

| # | Issue | File(s) | Fix | Status | Owner | Notes |
|---|---|---|---|---|---|---|
| 1.1 | Guideline 5 — Trialware: 5-model compression cap | `includes/` (`can_user_compress()`, `prepare_compression()`); REST in `api/AR_TRY_ON_Compression_Routes.php` | Pick one: (a) remove cap entirely from free, or (b) strip the compression flow + REST endpoints out of free and host only in Pro | ⬜ | | Decide a/b before coding. Option (b) is cleaner — matches CLAUDE.md "pro-only" boundary. |
| 1.2 | Guideline 4 — No public source for minified JS | `public/js/build/chunks/tryon-face-worker.*.js`, `admin/js/build/ar-compression-client.min.js`, `public/js/build/chunks/tryon-controller.*.js` | Add public GitHub repo URL to `readme.txt`, AND/OR ship un-minified `src/` for these chunks. Document build steps. | ⬜ | | Repo link in readme is the lowest-friction path. |

---

## 2. Privacy / phoning-home

| # | Issue | File(s) / Line | Fix | Status | Owner | Notes |
|---|---|---|---|---|---|---|
| 2.1 | Unconsented marketing fetch on admin Plugins page | `admin/AR_TRY_ON_Admin.php` (`get_atlas_plugins()` / `ajax_refresh_plugins()`) | Removed. `get_atlas_plugins()` now returns the hardcoded `get_fallback_plugins()` list directly; the remote-URL constant + transient are deleted. AJAX refresh still works — it now only refreshes the api.wordpress.org info cache (a core service). | ✅ | |
| 2.2 | `icanhazip.com` IP lookup without disclosure | `libs/AtlasAiDev/Insights.php` (`__get_user_ip_address()`) | Method now returns `''` unconditionally in Free. The tracker payload still carries an `ip_address` key for backend schema compatibility, but Free no longer makes the external call. Pro keeps its own copy. | ✅ | |
| 2.3 | GitHub gist promotions fetch | `includes/AR_TRY_ON_Lib_AtlasAiDev.php` `init()` | Removed both `$this->promotion->set_source(<gist URL>)` and `$this->promotion->init()`. The promotion object is still instantiated so no consumer breaks, but no remote fetch happens. | ✅ | |

---

## 3. Remote file loading (must be local or disclosed as service)

| # | Issue | File / Line | Fix | Status | Owner | Notes |
|---|---|---|---|---|---|---|
| 3.1 | MediaPipe WASM from jsDelivr | `includes/AR_TRY_ON_Tryon.php:35` (`CDN_WASM_BASE`) | Bundle WASM locally under `public/js/vendor/mediapipe/` OR add full `== External services ==` disclosure | ⬜ | | Bundling adds ~3 MB; disclosure is easier. |
| 3.2 | MediaPipe Face model from `storage.googleapis.com` | `includes/AR_TRY_ON_Tryon.php:36` (`CDN_FACE_MODEL`) | Same — local or disclose with Google ToS link | ⬜ | | Model ~3 MB; cache to IndexedDB is fine but first fetch is remote. |
| 3.3 | DRACO + KTX2 + Lottie loaders from gstatic / jsDelivr | `public/js/google-model-viewer.js:1092` | These come from Google's `<model-viewer>` web component. Self-host the decoders under `public/js/vendor/` and set `*DecoderLocation` overrides | ⬜ | | Plugin already enqueues `<model-viewer>`; just point decoders at local copies. |

---

## 4. Undocumented external services — readme disclosure

| # | Service | Used by | Status | Notes |
|---|---|---|---|---|
| 4.1 | `track.atlasaidev.com` | `libs/AtlasAiDev/Client.php` | ✅ | Disclosed in `README.txt` §6. Opt-in only, default OFF. |
| 4.2 | `icanhazip.com` | (removed in §2.2) | ✅ | No longer called; nothing to disclose. |
| 4.3 | `gist.githubusercontent.com/.../text-to-speech-pro.json` | (removed in §2.3) | ✅ | No longer called; nothing to disclose. |
| 4.4 | `storage.googleapis.com/mediapipe-models/...` | `includes/AR_TRY_ON_Tryon.php` | ✅ | Disclosed in `README.txt` §2. Triggered only by visitor clicking "Try It On". |
| 4.5 | `cdn.jsdelivr.net/npm/@mediapipe/tasks-vision` | `includes/AR_TRY_ON_Tryon.php` | ✅ | Disclosed in `README.txt` §1. Same trigger as §4.4. |
| 4.6 | `gstatic.com` (DRACO/KTX2) + `cdn.jsdelivr.net/three` (Lottie) | `public/js/google-model-viewer.js` | ✅ | Disclosed in `README.txt` §3. Only fires when an uploaded GLB uses Draco/KTX2/Lottie. |
| 4.7 | `api.tripo3d.ai` | `generate_3d_model` REST + admin dashboard | ✅ | Disclosed in `README.txt` §4. Admin-only, requires user-supplied API key, requires explicit "Generate" click. |
| 4.8 | `api.meshy.ai` | Same as 4.7 | ✅ | Disclosed in `README.txt` §5. Same trigger as §4.7. |
| 4.9 | `raw.githubusercontent.com/atlasaidev/plugins/main/plugins.json` | (removed in §2.1) | ✅ | No longer called; nothing to disclose. |
| 4.10 | MediaPipe `holistic_landmarker.proto` identifier in bundled worker | `public/js/build/chunks/tryon-face-worker.*.js` | ✅ | False positive (see §10.1). Dead code inside `@mediapipe/tasks-vision`. Will be raised with the reviewer if mentioned. |

Goal: a single readme block like:

```
== External services ==
This plugin connects to the following third-party services...
```

---

## 5. WordPress core / API misuse

| # | Issue | File / Line | Fix | Status | Owner | Notes |
|---|---|---|---|---|---|---|
| 5.1 | Loads `wp-admin/includes/plugin.php` inside `admin_enqueue_scripts` without using it after | `admin/AR_TRY_ON_Admin.php` `enqueue_scripts()` | Removed the redundant `require_once` (constructor already conditionally loads it; WP core loads it in admin context). | ✅ | | |
| 5.2 | Plain `include` of `wp-admin/includes/plugin.php` (must be `require_once` + used right after) | `libs/AtlasAiDev/Insights.php` `__get_all_plugins()` | Switched to `require_once`; also fixed the leading-slash typo. `get_plugins()` is called on the next line. | ✅ | | AtlasAiDev lib lives only in Free (verified — Pro does NOT carry a duplicate). Coordinate with `text-to-speech` if shared. |
| 5.3 | Unnecessary `require_once ABSPATH . 'wp-includes/vars.php'` in constructor | `admin/AR_TRY_ON_Admin.php` constructor | Deleted. `wp_is_mobile()` is used in `AR_TRY_ON_Helper`, not in this constructor; WP core loads `vars.php` during normal page lifecycle. | ✅ | | |
| 5.4 | Hardcoded `WP_CONTENT_DIR . '/themes/'` | `libs/AtlasAiDev/Client.php` `set_basename_and_slug()` | Now uses `wp_normalize_path( get_theme_root() )` + `trailingslashit` for both the strpos check and the `str_replace` strip. | ✅ | | |

---

## 6. REST API security

All four used the bypassable `get_route_access`. That helper had two bugs: (1) its outer `!isset($_SERVER['HTTP_X_WP_NONCE'])` was inverted, so the actual `wp_verify_nonce()` was unreachable — any nonce header value passed; (2) no `current_user_can()` gate at all. Replaced with two purpose-built callbacks; the legacy `ATLAS_AR_rest_route_access` filter is preserved as a final override (with `WP_REST_Request` added as a 2nd arg).

| # | Route | Callback | Required cap | Status |
|---|---|---|---|---|
| 6.1 | `/settings` | `check_admin_access()` | `manage_options` | ✅ |
| 6.2 | `/demo_preview` | `check_admin_access()` | `manage_options` | ✅ |
| 6.3 | `/get_model_and_settings` | `check_model_settings_access()` | POST → `edit_post` (per `post_id`); admin GET → `manage_options`; frontend GET → public (callback already strips sensitive props via `exclude_sensitive_properties`) | ✅ |
| 6.4 | `/generate_3d_model` | `check_admin_access()` | `manage_options` (fires Tripo3D / Meshy AI API calls + writes uploads) | ✅ |

Old broken `get_route_access()` deleted. Failing checks now return `WP_Error( 'rest_forbidden', ... )` with `401` for anonymous and `403` for logged-in-but-unauthorized.

---

## 7. Code quality / hygiene

| # | Issue | File / Line | Fix | Status | Notes |
|---|---|---|---|---|---|
| 7.1 | Anonymous closure passed to `remove_filter('upload_dir', ...)` — cannot remove | `api/AR_TRY_ON_Compression_Routes.php` `upload_compressed_file()` | Replaced both closures with the new named instance method `filter_upload_dir_target()`. Target path now lives in `$this->upload_target_path`, set before `add_filter` and cleared after `remove_filter`. | ✅ | |
| 7.2 | Text domain mismatch — 50 strings use `'atlasaidev'`, slug is `'ar-vr-3d-model-try-on'` | `libs/AtlasAiDev/Insights.php` (46), `libs/AtlasAiDev/Promotions.php` (4) | Replaced all 50 `'atlasaidev'` text-domain literals with `'ar-vr-3d-model-try-on'`. No non-i18n usages of the literal were found. `.pot` regeneration is part of the §8 release step. | ✅ | Library is duplicated from `text-to-speech`'s copy — TTS keeps its own slug. |
| 7.3 | Admin menu position 20 collides with core | `admin/AR_TRY_ON_Admin.php` `atlas_ar_menu()` | Changed position from `20` (collides with WP core Pages) to the string float `'58.5'` — places AtlasAR in the secondary-band slot used by plugins like Yoast, between Comments (25) and Appearance (60). | ✅ | |

---

## 8. Release workflow

| # | Step | Status | Notes |
|---|---|---|---|
| 8.1 | Land all fixes on `feature/AR-61` (free) | ⬜ | |
| 8.2 | Land Pro-side changes on `feature/AR-61` (pro) | ⬜ | Mostly mirror text-domain + AtlasAiDev lib fixes. |
| 8.3 | `git flow feature finish AR-61` → merge into `develop` | ⬜ | |
| 8.4 | Run Plugin Check on free build | ⬜ | https://wordpress.org/plugins/plugin-check/ |
| 8.5 | Run PHPCS + WPCS on full repo | ⬜ | |
| 8.6 | Test on clean WP install with `WP_DEBUG=true` | ⬜ | |
| 8.7 | Bump `Version:` header (free `2.0.0` → `2.0.1`?) | ⬜ | Confirm version policy. |
| 8.8 | Bump `Stable tag:` in `readme.txt` to match | ⬜ | |
| 8.9 | Commit to SVN `trunk/` | ⬜ | |
| 8.10 | Create matching `tags/<version>/` entry | ⬜ | |
| 8.11 | Reply to `plugins@wordpress.org` (concise) | ⬜ | Reference Review ID. |
| 8.12 | Close AR-61 | ⬜ | |

---

## Decisions to lock in before coding

1. **Compression in free: remove gate or remove feature?** → recommendation: **remove from free entirely**, leave in Pro.
2. **MediaPipe assets: self-host or disclose as service?** → recommendation: **disclose as service** (smaller plugin zip, models cache to IndexedDB anyway).
3. **AtlasAiDev cross-promo on admin Plugins page: remove or opt-in?** → recommendation: **remove from free**, keep in Pro behind opt-in.
4. **Text-domain migration: `atlasaidev` → `ar-vr-3d-model-try-on`** affects translations contributors. Coordinate with translation team if any.

---

## Open questions

- Pro plugin (`ar-vr-3d-model-try-on-pro`) appears free of most of these violations (it's not on WP.org), but inherits `libs/AtlasAiDev/*` fixes — confirm via diff.
- Sibling plugin `text-to-speech` shares `libs/AtlasAiDev/` and the same gist URL — should AR-61 also patch it, or open a separate ticket?

---

## 9. AtlasVoice lessons applied (carried over from TTS-247 closure remediation)

The sibling plugin Text To Speech TTS Accessibility (AtlasVoice) went through the same closure cycle in May 2026 (HelpScout #293 / TTS-247). The patterns below were learned the hard way during that fix — they apply 1:1 to AR-61 and override anything else in this plan when they conflict.

### 9.1 Move premium code, don't gate it

The §1.1 wording "remove cap entirely from free" understates the reviewer's expectation. wp.org flagged AtlasVoice for keeping the premium analytics handlers in the free build *as dead code* even though no free code path called them — the existence of the methods alone was the violation.

For AR-61 compression this means:

- Delete `prepare_compression()` and `can_user_compress()` from free entirely.
- Delete `api/AR_TRY_ON_Compression_Routes.php` from free entirely.
- Delete any private helpers, REST routes, settings keys, dashboard React tabs and admin-screen sections that exist *only* to support the compression workflow.
- Do **not** leave behind `// @deprecated 2.x.x` shims that return `"requires Pro"` JSON — those are still flagged.
- After the prune, grep the free repo for `compress`, `can_user_compress`, `prepare_compression`, the route paths, and any related option keys. Every hit must be either removed or have a legitimate Free-tier reason to exist.

| Action | Status | Notes |
|---|---|---|
| 9.1.a Delete `can_user_compress()` + `prepare_compression()` from free | ⬜ | |
| 9.1.b Delete `api/AR_TRY_ON_Compression_Routes.php` from free | ⬜ | |
| 9.1.c Delete compression-only dashboard React components from free | ⬜ | Likely `src/dashboard/components/.../compression/*` |
| 9.1.d Delete compression-only admin-screen sections from free | ⬜ | |
| 9.1.e Grep audit: `compress|compression` returns only legitimate Free-tier matches | ⬜ | |

### 9.2 Free CANNOT carry a back-compat shim for old Pro

When AtlasVoice 2.2.0 shipped, the natural instinct was: "let free re-register the moved routes / re-define the deleted helpers when an older Pro is detected, so existing Pro 3.2.x sites don't break." That shim was implemented, then immediately reverted — wp.org would have re-flagged the exact same trialware/dead-code patterns it had just closed the plugin for.

**Rule:** once code is removed from the wp.org free build to satisfy a closure, it stays removed. The free build is reviewed *as-is*; conditional re-introduction is not a defense.

For AR-61 specifically:

- Do NOT write `if (defined('AR_TRY_ON_PRO_VERSION') && version_compare(...)) { /* re-register compression routes */ }` inside the free plugin.
- Do NOT keep "deprecated 2.x.x — kept for back-compat" stubs of removed functions.
- The right place for back-compat is in NEW Pro — it can ship its own copy of every moved function and route, and old Pro upgrades will catch up via the Pro update channel.

### 9.3 Pro-side mirror tasks (expand §8.2)

Every "remove from free" item needs a corresponding "host in Pro" item. §8.2 is currently a single line; it should be a per-feature table tracked alongside §1-7.

| # | Feature removed from free | Where it lives in new Pro | Pro status | Notes |
|---|---|---|---|---|
| 9.3.a | `prepare_compression()` + `can_user_compress()` | `Includes/AR_TRY_ON_Pro_Compression.php` (new) | ⬜ | Composes free's helpers for any cross-tier utilities the way AtlasVoice's `TTA_Pro_AtlasVoice_Analytics` composes the free analytics class for `calculate_date_range` / `aggregate_analytics_data` |
| 9.3.b | `api/AR_TRY_ON_Compression_Routes.php` routes | `Api/AR_TRY_ON_Pro_Compression_Routes.php` (new) under namespace `ar_try_on_pro/v1` | ⬜ | Mirror Pro routes 1:1; existing Pro 3.x React dashboard JS will need to switch from `ar_try_on/v1/compress` to `ar_try_on_pro/v1/compress` |
| 9.3.c | Compression dashboard React tab | Ship from Pro instead of free | ⬜ | If the React build is in free, Pro can either ship its own bundle OR free's bundle conditionally renders the tab when `is_pro_active()` (the tab itself is fine in free as a locked upsell card — see §9.1 vs §9.10 below) |
| 9.3.d | Composer autoload classmap regeneration in Pro | `composer dump-autoload --optimize` after adding the new Pro classes | ⬜ | |

### 9.4 Version-gate Pro's replacement registrations

Pro's new route registrations should run only when free is new enough that the old routes are gone from free. Otherwise the dashboard JS calls the old free routes (still present in old free) and Pro's new ones are dead weight.

In `Api/AR_TRY_ON_Pro_Compression_Routes.php`:

```php
$free_has_moved_compression = defined( 'AR_TRY_ON_VERSION' )
    && version_compare( AR_TRY_ON_VERSION, '<new-free-version>', '>=' );

if ( $free_has_moved_compression && class_exists( '\\AR_TRY_ON_Pro_Api\\AR_TRY_ON_Pro_Compression' ) ) {
    // register the routes
}
```

Pick the gate version once free is tagged. For AtlasVoice it was `2.2.0`.

### 9.5 Release ordering

The dangerous combo is **new Free + old Pro** — wp.org auto-updates push free to users within hours, but Pro updates run on Freemius's prompt channel which can lag by days. The safest sequence:

1. Tag **new Pro** first → push to Freemius.
2. Email Pro customers ("Update AtlasAR Pro to X.Y.Z before WordPress updates AtlasAR").
3. Wait 24-48 h for the Pro update to propagate.
4. **Then** push new free to SVN trunk + tag. wp.org's manual re-review queue adds another buffer day or two.
5. By the time auto-update fires for free, ~90 %+ of Pro sites are already on new Pro.

The wp.org manual-review delay is a feature here — don't rush it.

| # | Step | Status | Notes |
|---|---|---|---|
| 9.5.a | Tag Pro `<new-version>` + Freemius upload | ⬜ | |
| 9.5.b | Email Pro customers — "Update Pro before WP updates Free" | ⬜ | One-paragraph template; reference both version numbers |
| 9.5.c | Wait 24-48 h | ⬜ | |
| 9.5.d | Push free to SVN trunk + tag `<new-version>` | ⬜ | |
| 9.5.e | Reply to wp.org closure thread referencing the new free version | ⬜ | See §10 reply template |

### 9.6 Coordinated readme upgrade notices

Both readmes must point at the other so users coordinate the update:

- **Free `readme.txt` `== Upgrade Notice ==`**: "Pro users: update AtlasAR Pro to `<pro-version>` before or simultaneously with this update."
- **Pro `readme.txt` `== Upgrade Notice ==`** (or Freemius changelog): "Pairs with AtlasAR (free) `<free-version>`+. Please update AtlasAR too."

Keep each notice ≤300 chars per wp.org spec.

### 9.7 Free-only smoke test (new §8 item)

After deleting compression code from free, exercise the free plugin on a clean WordPress install with Pro NOT present. This catches "free code path still calls into removed compression class" fatal errors that Plugin Check doesn't always surface.

Add to §8:

| # | Step | Status | Notes |
|---|---|---|---|
| 8.13 | Clean WP install + AR-61 free only (no Pro folder present) | ⬜ | Activate, walk every admin tab, every dashboard page, every front-end behavior. `WP_DEBUG=true`. |
| 8.14 | `tail -f wp-content/debug.log` during the walk-through | ⬜ | Zero fatals, zero "Call to undefined" notices |

### 9.8 Freemius / vendor-SDK audit on free

If AR-61's free build bundles Freemius SDK (or any other paid-distribution SDK), wp.org has been increasingly strict about it. Check:

- `freemius/` directory in free root → if present, remove from the wp.org build.
- Pro should bundle its own copy of any such SDK.
- Free continues to detect Pro via `is_pro_plugin_exists()`-style filesystem check (same pattern AtlasVoice uses) — no SDK runtime needed.

| # | Step | Status | Notes |
|---|---|---|---|
| 9.8.a | Audit free for `freemius/`, `edd-software-licensing/`, or similar paid SDKs | ⬜ | |
| 9.8.b | Remove any found from free's gulp/grunt/composer production excludes | ⬜ | |
| 9.8.c | Verify Pro continues to handle its own licensing init | ⬜ | |

### 9.9 Maintain a free-pro contract doc

AtlasVoice keeps `plan/tickets/free-pro-architecture-pattern.md` listing the shared filters, options, REST namespaces, JS globals (`tta_obj`, `ttsObjPro`), and meta keys that the two plugins exchange. When a refactor moves a feature across the boundary, the contract doc is updated in the same PR.

| # | Step | Status | Notes |
|---|---|---|---|
| 9.9.a | Create `plan/free-pro-architecture-pattern.md` | ⬜ | Port the AtlasVoice file as a starting structure; replace TTS-specifics with AR-specifics |
| 9.9.b | List every shared hook/filter/option/REST namespace AR-61 uses | ⬜ | |
| 9.9.c | Update contract doc in the same commit as any cross-boundary move | ⬜ | |

### 9.10 Locked-upsell cards are OK; locked-actual-features are not

A subtle distinction wp.org accepts: an integrations / settings tab that visibly says *"Compression — available in Pro. [Upgrade button]"* with **no underlying functional code** in free is fine — it's marketing UI, not trialware. What's NOT fine is a tab whose form fields and Save button exist in free but throw a `"requires Pro"` error on submit.

For AR-61 compression: if you want to keep an upsell card on the free dashboard, render it as a static React component pointing at the Pro purchase URL — no form state, no AJAX endpoints, no save handlers, no settings keys persisted from it.

### 9.11 Reply email — additions to the §10 template

After AtlasVoice's first reply, two extra lines proved useful:

- State the **published version numbers** of both free and pro explicitly (so the reviewer can spot-check the SVN tag).
- Acknowledge wp.org's "we re-review the entire plugin, not just the diff" warning — say you've done a full Plugin Check + manual walk-through, not just patched the cited lines.

Add to the bottom of the §10 template, just before "Best,":

```
For your re-review:

  - Free (this submission): AR-VR 3D Model Try On <new-version>
    SVN trunk + tags/<new-version>
  - Pro (off-wp.org): AtlasAR Pro <pro-version>, distributed via Freemius

We've run Plugin Check on the full build (not just the changed files)
and walked every admin tab + front-end behavior on a clean WordPress
install with WP_DEBUG = true; zero new notices.
```

### 9.12 Don't fight false positives you'd fix anyway

(Reinforces §10.) AtlasVoice contested two flags initially; reviewer's response was "even if technically dead, please remove it." Net effect: the contest cost a review cycle. The plan's §10.1-10.5 categorization is already correct — push back **only** on §10.1 (holistic_landmarker proto) and §10.3 (decoder URL configuration question), drop everything else into the fix bucket.

---



The closure email explicitly invites pushback:

> *"Note that there may be false positives - we are humans and make mistakes, we apologize if there is anything we have gotten wrong. If you have doubts you can ask us for clarification, when asking us please be clear, concise, direct and include an example."*

The following flags are worth challenging **only if** the underlying fix isn't already free. Don't argue points that we'd have to fix anyway.

| # | Flag | Why it may be a false positive | Action |
|---|---|---|---|
| 10.1 | `tryon-face-worker.*.js` cited as using MediaPipe **holistic_landmarker** | The string `mediapipe.tasks.vision.holistic_landmarker.proto` is bundled inside `@mediapipe/tasks-vision`. We only call **face_landmarker** at runtime — holistic is dead code. | Mention in reply with a concrete pointer: *"the plugin only invokes `FaceLandmarker`; the holistic-landmarker proto identifier appears inside the third-party `@mediapipe/tasks-vision` bundle and is never executed."* |
| 10.2 | `raw.githubusercontent.com/atlasaidev/plugins/main/plugins.json` listed under "Phoning Home / collecting user data" | The request is a static `wp_remote_get` with no body and sends no user data. It's still an unconsented external call (so we'll remove/disclose it), but it isn't tracking. | Don't argue — just fix per 2.1. |
| 10.3 | `public/js/google-model-viewer.js:1092` DRACO/KTX2/Lottie loader URLs | These are defaults inside Google's `<model-viewer>` web component. They only fetch decoders when the user-loaded GLB uses Draco compression / KTX2 textures. Most uploaded GLBs don't trigger them. | Ask clarification: *"is configuring local decoder URLs in JS sufficient, or must the decoder asset files also ship in the plugin?"* — but plan for shipping them locally (see 3.3). |
| 10.4 | `api.tripo3d.ai` + `api.meshy.ai` listed as undocumented services | These are 100% user-initiated — fires only when an admin clicks "Generate 3D" after entering their own API key. Not background phoning-home. | Don't argue — add the `== External services ==` block per 4.7 / 4.8. |
| 10.5 | "Phoning Home" section conflates marketing fetch and tracker | The tracker (`track.atlasaidev.com`) **is** opt-in (the email even acknowledges this); only the GitHub manifest fetch is unconsented. | Reply can clarify the separation — but fix both per 2.1 + 4.1 regardless. |

**Reply template (concise):**

```
Hi WP.org Plugins Team,

Thank you for the detailed review. We've addressed every cited issue
on a working branch and will upload a new version to SVN shortly.

Two clarification questions, both with concrete examples:

1. tryon-face-worker.*.js - holistic_landmarker.proto identifier:
   The plugin only instantiates FaceLandmarker (see
   includes/AR_TRY_ON_Tryon.php where CDN_FACE_MODEL is loaded).
   The holistic_landmarker.proto string appears inside the bundled
   third-party @mediapipe/tasks-vision library and is dead code.
   No remote holistic-landmarker service is contacted. Could you
   confirm this is acknowledged before re-review?

2. <model-viewer> DRACO/KTX2/Lottie loader URLs:
   These default URLs are inside Google's <model-viewer> web
   component and only fire when a user-uploaded GLB uses Draco
   compression or KTX2 textures. We will set
   DRACODecoderLocation / KTX2TranscoderLocation to local paths
   in the plugin - is configuring them in JS sufficient, or
   must the decoder asset files also ship inside the plugin zip?

We will not contest the other flags - they are valid and will be
fixed in the next SVN upload.

Best,
AtlasAiDev team
Review ID: GUIDELINES LIC-SRC ar-vr-3d-model-try-on/hasanazizul/19May26/T1 19May26/4.0.1B2
```

---

## 11. Literal reviewer checklist (must be acknowledged in reply)

The email requires we tick every item. Track here:

| # | Item | Status |
|---|---|---|
| 11.1 | ✔️ I understand and have completed the necessary corrections indicated. | ⬜ |
| 11.2 | ✔️ I conducted a full security and standards review (Plugin Check, PHPCS + WPCS). | ⬜ |
| 11.3 | ✔️ I tested my updated plugin on a clean WP install with `WP_DEBUG = true`. | ⬜ |
| 11.4 | ✔️ I acknowledge that volunteers won't continue reviewing if I overlook issues or fail to test. | ⬜ |
| 11.5 | ✔️ I created a new version and uploaded it to SVN. | ⬜ |
| 11.6 | ✔️ I replied to the email — concise, with clarifications. | ⬜ |
