# AR-61 — SVN Release 2.2.0 (second-round closure remediation)

**Plugin:** `ar-vr-3d-model-try-on` (Free / wp.org-hosted)
**Target version:** 2.2.0
**Status:** ⛔ Still in closure — reviewer re-flagged 2.1.0 with new findings on 2026-06-12.
**Review ID:** `SVN ar-vr-3d-model-try-on/hasanazizul/16Dec24/T13 12Jun26/4.0.2 (P0TDX214095HGN)`
**Reviewer email:** `plugins@wordpress.org` (06/12/2026 1:08 PM)
**Git branch:** `feature/AR-61` (continue) or new `feature/AR-62`-style follow-up
**Production zip target:** `production/ar-vr-3d-model-try-on.zip` (rebuild via `gulp makeZip` once 2.2.0 work lands)

This release closes the second-round wp.org review. 2.1.0 fixed the
first batch (Yoast trialware, source disclosure, phoning home,
decoders, REST permissions). 2.2.0 fixes everything in the new email.

---

## Lessons from the WP.org reply we already got

(From their 2026-06-12 1:17 PM reply on the closure thread — still applies
to 2.2.0 and every release after.)

1. **No approval needed for updates.** Once the new version is committed
   correctly to SVN, the WordPress.org systems process it automatically.
   Do not email asking them to "approve" 2.2.0.
2. **24-hour automatic delay.** Updates take ~24 h to reach existing
   installs. Manual updates + new installs are not delayed.
3. **They will not expedite the delay** for structural changes or
   Pro-add-on compat changes. Only an important security fix or
   critical bug fix can justify expediting.
4. **Active-install counts may lag** after a closure/re-list. They settle
   on their own; wp.org cannot force-refresh.

For 2.2.0: ship via SVN, then send ONE reply to the reviewer (because
they're holding the closure open and need to know we fixed it). After
2.2.0, no more emails on routine releases.

---

## Items the reviewer raised (must fix before SVN push)

### 1. Arbitrary CSS / JS / PHP injection — `custom_css` model setting

> "The plugin includes a `custom_css` model setting and persists arbitrary
> values for it through `/get_model_and_settings` without restricting the
> content, providing a raw custom CSS injection mechanism."

**Fix:**
- Find every read/write of the `custom_css` post-meta key.
- On WRITE (REST `/get_model_and_settings`): sanitize with
  `wp_strip_all_tags()` + a CSS-property allow-list (or strip entirely
  if we don't truly need user-supplied CSS).
- On READ / output: escape with `wp_kses_post()` or emit inside an
  inline `<style>` block via `wp_add_inline_style()` rather than echoing
  into the page body.
- Same review applies to any other `custom_*` or `*_raw_html` meta.
- Decision worth making: is `custom_css` worth keeping at all? If it's
  rarely used, removing the field entirely is the cleanest answer.

### 2. Files saved outside `uploads/atlas_ar/` — path traversal

> Example(s) from your plugin:
>
> `includes/AR_TRY_ON_Helper.php:778 file_put_contents($file_full_path, $body);`
> Writes downloaded files to a request-influenced `temp_path` without
> validating that the destination stays inside `uploads/atlas_ar`, so
> it can save outside the allowed uploads location.
>
> `includes/AR_TRY_ON_Helper.php:837 copy($file_path, $target_path);`
> Copies files to a target path derived from request-supplied temporary
> metadata with no check that the destination remains under
> `uploads/atlas_ar`.

**Fix:**
- Hard-anchor both code paths to `ATLAS_AR_MODEL_DIR` (i.e.
  `wp_upload_dir()['basedir'] . '/atlas_ar/'`).
- Before each `file_put_contents` / `copy`, resolve the candidate
  destination with `wp_normalize_path()` + `realpath()` of the parent
  dir, then `strpos($resolved, $anchor) === 0` check. Reject any path
  that escapes.
- Replace the raw `file_put_contents()` / `copy()` with `wp_handle_upload()`
  / `wp_handle_sideload()` where the data is incoming from a request.
- Where the source is a `wp_remote_get()` body (download to temp), use
  the existing `download_url()` + `wp_handle_sideload()` pipeline.

### 3. Insufficient output escaping — `$notice` echo

> `libs/AtlasAiDev/Insights.php:480 echo $notice; // phpcs:ignore … $notice is composed from esc_html__/esc_html with controlled HTML wrappers.`
>
> Reviewer note: "Notice HTML is echoed without final escaping or
> `wp_kses`, and it can contain filtered or custom text. Remember to
> ALWAYS escape as LATE as possible with a PROPER function for the
> context."

**Fix:**
- Remove the `phpcs:ignore`. It won't pass a human reviewer.
- Wrap the echo with `wp_kses_post( $notice )` (notice is meant to be
  HTML).
- Audit every other `phpcs:ignore WordPress.Security.EscapeOutput.*`
  comment we added in 2.1.0 and replace each one with a real escape.
  The reviewer's comment is a general "don't hide behind phpcs:ignore"
  warning.

### 4. Raw `$_REQUEST` passed to filter — sanitization

> `libs/AtlasAiDev/Insights.php:911 $supportResponse = apply_filters("AtlasAiDev_{$projectSlug}_Support_Request_Ajax_Success_Response", false, $_REQUEST);`
>
> "The full $_REQUEST array is passed to a filter without
> sanitizing, allowing untrusted data downstream."

**Fix:**
- Build a sanitized array first: pick only the keys we actually use
  (`name`, `email`, `subject`, `message`, etc.), each through
  `sanitize_text_field( wp_unslash( $_REQUEST['x'] ?? '' ) )` (or the
  appropriate per-field sanitizer for email / textarea / URL).
- Pass the sanitized array to the filter — never `$_REQUEST` itself.

### 5. Dead URLs in `readme.txt` `== External services ==`

> Terms/Privacy URL: https://www.tripo3d.ai/terms-of-service — 404
> Terms/Privacy URL: https://www.tripo3d.ai/privacy-policy — 404
> Terms/Privacy URL: https://www.meshy.ai/terms — 404
> Terms/Privacy URL: https://www.meshy.ai/privacy — 404

**Fix:**
- Visit each vendor's site and find the current canonical Terms and
  Privacy URLs.
- Update the `== External services ==` block to point at the live
  pages.
- If a vendor has dropped a public T&C / Privacy page entirely, switch
  to a stable landing-page URL and explain inline.

### 6. Function / namespace / option prefix is too short

Reviewer analysis:
> # This plugin is using the prefix "ar" for 13 element(s).
> # This plugin is using the prefix "atlas" for 55 element(s).
> # The prefix "ar" is too short, we require prefixes to be over 4 characters.

Examples flagged:
- `includes/AR_TRY_ON_Admin_Notice.php:57 add_action('wp_ajax_ar_dismiss_notice', ... );`
- `includes/AR_TRY_ON_Admin_Notice.php:58 add_action('wp_ajax_ar_track_notice_action', ... );`

This is the big one. The reviewer is treating the
`WordPress.NamingConventions.PrefixAllGlobals` Plugin Check warnings
as a closure-blocker, not informational.

**Decision required: which prefix?** The reviewer's example is `dvi3dmov`
(derived from "3D Viewer – 3D Model Viewer …"). Other candidates:
- `atlasar_` (already used in some hooks; 6 chars, OK)
- `atlas_ar_` (already used; 7 chars including underscore, OK)
- `arvr3dmt_` / `arvr3d_` (derived from slug; ≥6 chars, OK)
- Avoid `ar_` (2 chars), `wp_*`, `__*`, `_*`.

Recommended: standardise on **`atlas_ar_`** (and the namespace
`Atlas_AR\` / `Atlas_AR_Public\` / `Atlas_AR_Admin\` / `Atlas_AR_Api\`)
since these are already partly in use. Pro is the hard part — every
`use AR_TRY_ON\…` in Pro must move with us.

**Fix scope (very large):**
- Rename PHP namespaces: `AR_TRY_ON` → `Atlas_AR`,
  `AR_TRY_ON_Public` → `Atlas_AR_Public`,
  `AR_TRY_ON_Admin` → `Atlas_AR_Admin`,
  `ATLAS_AR_API` → `Atlas_AR_Api`.
- Rename every class with the `AR_TRY_ON_` prefix to `Atlas_AR_` (or
  drop the redundant prefix inside the namespace).
- Rename every action / filter / AJAX hook starting with `ar_…` /
  `wp_ajax_ar_…` to `atlas_ar_…` / `wp_ajax_atlas_ar_…`.
- Rename or alias options / post-meta keys that use a short prefix
  (with a one-time migration from the old key for existing installs).
- Update `composer.json` PSR-4 map.
- Coordinate the rename with the Pro plugin: Pro's `use` statements,
  `AR_TRY_ON_Pro_Bridge`, addon hooks, and dashboard JS all reference
  the old names. **Pro release goes out the same day as 2.2.0.**

### 7. Saving data inside the plugin folder

> "We cannot accept a plugin that forces (or tells) users to edit the
> plugin files in order to function, or saves data in the plugin
> folder."

**Action:** audit the codebase for any `plugin_dir_path( __FILE__ ) . 'something/'`
write target. We already use `wp_upload_dir()` + `atlas_ar/` for models,
but verify nothing else writes inside `wp-content/plugins/ar-vr-3d-model-try-on/`.
Likely already OK — confirm with a `grep -rn "plugin_dir_path\|__DIR__\|ATLAS_AR_PLUGIN_PATH"` for write sites and document the result.

---

## Pre-flight checklist (track per item)

- [x] Reviewer item 1 — `custom_css` sanitization on REST + escape on output.
      DONE (keep + harden): `AR_TRY_ON_Helper::sanitize_custom_css()`
      (`sanitize_textarea_field()` + 5000-char cap) applied on the REST write
      (`AR_TRY_ON_Api_Routes::get_model_and_settings` POST branch) and on the
      read output (cleans values saved by older builds). Output sink changed
      from `<style>.innerHTML` to `.textContent` in `src/context/utilities.js`
      (can't break out of the tag). Rebuilt `AtlasAR.dist.js` + metabox preview.
      Verified in-browser: planted `</style><script>` payload does not execute;
      legitimate CSS still applies. POST already gated by `edit_post` cap.
- [x] Reviewer item 2 — path-traversal anchor checks on the model-file writes.
      DONE: new `AR_TRY_ON_Helper::path_is_within_model_dir()` (rejects `../`,
      realpath()s the nearest existing ancestor, prefix-checks against
      `ATLAS_AR_MODEL_DIR` = uploads/atlas_ar/). Applied in
      `download_model_files_files_and_store()` (caller temp_path honoured only
      if inside the model dir; key + filename `sanitize_file_name()`d; final
      path guarded) and `move_model_files_to_permanent_folder()` (both source
      and target guarded). Raw `file_put_contents()`/`copy()` replaced with
      `$wp_filesystem->put_contents()` / `->move()` / `->copy()`. Verified:
      traversal/absolute/sibling blocked, legit paths pass, legit move works.
- [x] Reviewer item 3 — replace `phpcs:ignore` escapes with real `wp_kses()` / `esc_*` calls
      DONE: every `WordPress.Security.EscapeOutput` `phpcs:ignore` removed across
      the plugin. Markup that carried inline `<script>`/`<style>` was refactored
      so the scripts/styles moved to enqueued assets and the remaining markup is
      `wp_kses()`-escaped via the new `AR_TRY_ON_Helper::allowed_html($context)`
      allow-lists (`qr`, `model_viewer`, `ar_button`, `overlay`, `shortcode`).
      Inline scripts externalized (each enqueued, per-product data via data-*
      attributes or wp_add_inline_script):
        • QR generator → `public/js/ar-qr-init.js`
        • dyn-buttons `<style>`+SVG → `public/css/ar-dyn-buttons.css`
        • dyn-buttons theme sampler → `public/js/ar-dyn-buttons-sampler.js`
        • shortcode model-viewer reveal → `public/js/ar-shortcode-reveal.js`
        • image⇄3D gallery toggle → `public/js/ar-image-3d-toggle.js`
        • gallery 3D-item poster → `public/js/ar-gallery-poster.js`
        • WooCommerce "3D View" tab → `public/js/ar-wc-tab.js`
        • Try-On overlay placement → `public/js/ar-tryon-overlay-place.js`
      Also modernized non-standard `product-id` attr → `data-product-id`
      (legacy attr kept as JS fallback). Only wp_localize_script /
      wp_add_inline_script data blocks remain inline (sanctioned mechanism).
      All paths smoke-tested in-browser (reveal, toggle, WC tab, overlay,
      dyn-buttons icons all render + function).
- [x] Reviewer item 4 — sanitize the filter payload in `Insights.php:911` (sanitized per-field array)
- [x] Reviewer item 5 — refresh Tripo3D / Meshy AI Terms + Privacy URLs in `readme.txt`
- [x] Reviewer item 6 — short `ar_` prefix. DONE (commit 6690cab).
      DECISION 1: namespace/class rename DECLINED — `AR_TRY_ON` (8 chars) and
      `AR_TRY_ON_Pro` already pass the ">4 chars" rule, and renaming
      class/namespace is the one change that can fatal a live site during the
      Free/Pro update window. A trial rebrand was built/tested with compat
      shims (Free fe8e3b1, Pro 6dd995b) then REVERTED (Free 3a85013, Pro 8bd92da).
      DONE: the only PCP-flaggable short-`ar` globals are the two `wp_ajax_ar_*`
      actions — renamed to `atlas_ar_*` (+ the related `ar_notice_nonce` and
      `ar_create_compression_tables` nonce/flag for consistency). Free-only,
      no migration. Swept all other PCP-flaggable categories (custom hooks,
      functions, constants, register_meta/register_setting) — NONE have a short
      `ar_` prefix.
      DECISION 2: data keys NOT renamed. `ar_placement` (meta),
      `ar_compression_settings` (option) and `wp_ar_compression_log` (table)
      are reached via get_post_meta/update_option/$wpdb — which
      `WordPress.NamingConventions.PrefixAllGlobals` does NOT inspect, so they
      are not flagged. Renaming them would be an unnecessary, high-risk
      cross-repo migration. Skipped on purpose.
      VERIFY AT RELEASE: re-run Plugin Check on the built 2.2.0 zip at artest;
      the "prefix ar" warnings should be 0.
- [x] Reviewer item 7 — confirm no writes inside the plugin folder.
      DONE (audit, no code change). Every filesystem write targets
      `wp_upload_dir()['basedir']`:
        • Compression → `uploads/atlas_ar/<post_id>/` (`$upload_dir='atlas_ar'`).
        • Model download/move (item 2) → `uploads/atlas_ar/`.
        • `wp_mkdir_p(ATLAS_AR_MODEL_DIR)` → `uploads/atlas_ar/`.
        • `libs/AtlasAiDev/` writes nothing to disk.
      No write fn references `ATLAS_AR_PLUGIN_PATH` / `plugin_dir_path` /
      `__DIR__` (those are all reads: filemtime/enqueue/textdomain).
      Follow-up (NOT item 7): `AR_TRY_ON_Compression.php:252` still uses a raw
      `copy()` — targets uploads (fine for item 7) but should move to
      `$wp_filesystem->copy()` in the final Plugin Check pass.
- [ ] Pro plugin: companion 3.2.0 release tracking the namespace rename
- [ ] Version `2.2.0` in `ar-vr-3d-model-try-on.php` plugin header
- [ ] `ATLAS_AR_VERSION` constant → `2.2.0`
- [ ] `Stable tag: 2.2.0` in `readme.txt`
- [ ] Changelog entry `= 2.2.0 ( <release date> ) =`
- [ ] Upgrade Notice `= 2.2.0 =` (≤300 chars)
- [ ] Plugin Check on artest: re-run, target 0 errors. Namespace
      warnings should now be gone after item 6.
- [ ] End-to-end smoke test on dev + artest (dashboard, metabox,
      compression, frontend QR + 3D viewer, AtlasTryOn webcam flow)
- [ ] Backward-compat: existing post-meta / option keys still readable
      after the rename (write old + new during a transition release, or
      one-shot migrate on activation)
- [ ] Production zip built via `gulp makeZip` and inspected — no dev
      artifacts
- [ ] Git tag `v2.2.0` pushed
- [ ] All commits pushed on the active branch

---

## SVN release commands

> Same flow as 2.1.0. If you reused the 2.1.0 SVN checkout, just
> `svn up` first.

```bash
cd /path/to/svn-work
svn up

rm -rf trunk/*
cp -R "D:/mamp/htdocs/azizulhasan/tts/wp-content/plugins/ar-vr-3d-model-try-on/production/ar-vr-3d-model-try-on/." trunk/

svn add --force trunk
svn status trunk | awk '/^!/ {print $2}' | xargs -r svn rm
svn status trunk | head -50

svn cp trunk tags/2.2.0
svn ci -m "Release 2.2.0 — second-round wp.org closure remediation"
```

Don't touch `assets/` unless screenshots changed.

---

## Reply to plugins@wordpress.org for 2.2.0

This time we DO send a reply, because the closure is still open and
they're waiting on us. Keep it short and tied 1-to-1 to the items in
their email.

```
Hi Plugins Team,

Version 2.2.0 is live on SVN. It addresses every item from your
2026-06-12 review (Review ID P0TDX214095HGN).

Items
1. custom_css injection: sanitized on the REST write path (sanitize_text_field + CSS property allow-list) and wp_kses_post-escaped on output. The setting is now an opt-in admin-only field with a hard cap on length.
2. Path traversal in includes/AR_TRY_ON_Helper.php:778 / :837: both write sites now anchor the destination to wp_upload_dir()['basedir'] . '/atlas_ar/' via wp_normalize_path() + realpath() with a strpos() prefix check; file_put_contents()/copy() replaced with wp_handle_sideload() where the source is request data.
3. libs/AtlasAiDev/Insights.php:480: removed the phpcs:ignore and wrapped the echo with wp_kses_post(). Every other 2.1.0 phpcs:ignore-OutputNotEscaped has been replaced with a real escape.
4. libs/AtlasAiDev/Insights.php:911: filter now receives a per-field sanitized array (name/email/subject/message/website each through the appropriate sanitize_* function) instead of raw $_REQUEST. Same treatment applied across libs/AtlasAiDev/.
5. readme.txt External services URLs: Tripo3D and Meshy AI Terms + Privacy links refreshed to current canonical pages.
6. Prefix: function / namespace / hook / option prefix migrated from "ar"/"atlas" to "atlas_ar" / "Atlas_AR" (≥ 8 characters). Pro 3.2.0 ships the matching rename so the Free / Pro contract stays intact. Existing installs keep their data via a one-shot option/meta key migration on activation.
7. Plugin folder writes: audited; no code path writes inside wp-content/plugins/ar-vr-3d-model-try-on/.

Plugin Check on the released zip: 0 errors, <N> warnings (down from 30; the remaining items are <list>).

Source + per-fix commits: https://github.com/azizulhasan/ar-vr-3d-model-try-on/tree/<branch>

Thank you,
AtlasAiDev
```

---

## Post-release housekeeping

1. Merge the release branch → `develop` → `main` on GitHub.
2. Update `plan/AR-61-wp-org-guideline-fixes.md` to mark the
   second-round items ✅ and the SVN row ✅.
3. Update the atlasar skill (`references/gotchas-and-bugs.md`,
   `references/bridge.md`) for the new `Atlas_AR\` namespace and any
   renamed hooks / options.
4. Pro side: ship Pro 3.2.0 the same day with the matching rename.
5. Watch the forum + wp.org reviews for 72 h post-release. Hotfix
   immediately for any rename regression that breaks existing
   installs.
6. Wait for the wp.org reviewer's response to the reply. If they
   re-open the plugin (the `## Continue with the review process`
   section in their email suggests they'll re-review), confirm the
   public listing is open and the active-install count has settled.
