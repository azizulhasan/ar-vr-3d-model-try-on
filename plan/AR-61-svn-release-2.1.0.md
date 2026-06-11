# AR-61 — SVN Release 2.1.0 Command Sheet

**Plugin:** `ar-vr-3d-model-try-on` (Free / wp.org-hosted)
**Version:** 2.1.0
**Jira:** AR-61
**Git tag:** `v2.1.0` (commit `90a4d89` on `feature/AR-61`)
**Production zip:** `production/ar-vr-3d-model-try-on.zip` (1.4 MB, 86 files)

This is the wp.org SVN release for the AR-61 closure remediation. Pro is
shipped off-wp.org and does **not** go to SVN — only the Free plugin.

---

## Pre-flight checklist (already done)

- [x] Version `2.1.0` in plugin header (`ar-vr-3d-model-try-on.php`)
- [x] Version `2.1.0` in `ATLAS_AR_VERSION` constant
- [x] `Stable tag: 2.1.0` in `readme.txt`
- [x] Changelog entry for `= 2.1.0 ( 2 June 2026 ) =`
- [x] Upgrade Notice `= 2.1.0 =` (≤300 chars)
- [x] Plugin Check on artest: **0 errors / 30 warnings** (all
      `WordPress.NamingConventions.PrefixAllGlobals` informational)
- [x] End-to-end smoke test on dev + artest (dashboard, metabox,
      compression, frontend QR + 3D viewer)
- [x] Production zip built via `gulp makeZip` and inspected — no
      `node_modules`, `src/`, `plan/`, dev configs
- [x] Git tag `v2.1.0` pushed to `origin`
- [x] All commits pushed on `feature/AR-61`

---

## SVN release commands

> Replace `/path/to/svn-work` with wherever you want to check out the SVN
> tree on your machine. Use a directory **outside** the MAMP `wp-content/plugins`
> tree to avoid WordPress trying to load the SVN-managed copy.

### 1. Check out the wp.org SVN repository (one-time)

```bash
svn co https://plugins.svn.wordpress.org/ar-vr-3d-model-try-on /path/to/svn-work
cd /path/to/svn-work
```

You'll see:
```
ar-vr-3d-model-try-on/
├── assets/         ← banner, icon, screenshots (do NOT replace from build)
├── branches/       ← unused; leave alone
├── tags/           ← previous releases (2.0.0, 2.0.1, …, 2.0.3)
└── trunk/          ← current shipping code
```

### 2. Sync `trunk/` from the freshly built production zip

```bash
# From /path/to/svn-work :
rm -rf trunk/*
cp -R "D:/mamp/htdocs/azizulhasan/tts/wp-content/plugins/ar-vr-3d-model-try-on/production/ar-vr-3d-model-try-on/." trunk/

# Tell SVN about new files + missing files.
svn add --force trunk
svn status trunk | awk '/^!/ {print $2}' | xargs -r svn rm
svn status trunk | head -50          # sanity-check the diff
```

The `assets/` folder at the SVN root holds the banner / icon / screenshots
shown on the wp.org listing — **do not** touch it from `trunk/`. If
screenshots changed, update `assets/screenshot-*.png` separately.

### 3. Create the `tags/2.1.0/` copy

```bash
svn cp trunk tags/2.1.0
```

### 4. Commit

```bash
svn ci -m "Release 2.1.0 — AR-61 wp.org guideline remediation"
```

You'll be prompted for your wp.org credentials.

### 5. Verify on wp.org

After the commit, wait ~15 minutes for the wp.org cache to refresh, then:

- <https://wordpress.org/plugins/ar-vr-3d-model-try-on/> — should show
  version 2.1.0 in the sidebar
- <https://wordpress.org/plugins/ar-vr-3d-model-try-on/advanced/> — should
  list `tags/2.1.0` and the new `readme.txt`-parsed changelog entry

---

## Reply to plugins@wordpress.org

Once SVN is updated, reply to the original closure thread
(Review ID `GUIDELINES ❗LIC-SRC ar-vr-3d-model-try-on/hasanazizul/19May26/T1 19May26/4.0.1B2`).

Template:

```
Hi Plugins Team,

Version 2.1.0 is live on SVN. Every flagged item is resolved, plus
extra hygiene we caught while in there.

Flagged items
1. G5 Trialware: 5-model cap, 3-face cap, and four WP_Error('pro_only') stubs removed; Pro adds the premium path via the atlas_ar_compression_method filter.
2. G14 Source: readme links the public GitHub mirror with unminified sources + rebuild steps.
3. G7 Phoning home: AtlasAiDev tracker OFF by default, opt-in only; icanhazip + raw.githubusercontent gated; all endpoints disclosed under == External services ==.
4. Decoders: DRACO / KTX2 / Lottie bundled locally; MediaPipe (Try-On only, after user click) disclosed.
5. Core misuse: dropped wp-admin/includes/plugin.php and wp-includes/vars.php includes; theme path now uses get_theme_root().
6. REST permissions: per-route manage_options on /settings, /demo_preview, /generate_3d_model; edit_post on /get_model_and_settings writes (shipped 2.0.3, CVE-2026-8682).

Extra fixes
1. Text-domain: all libs/AtlasAiDev/ strings use the literal 'ar-vr-3d-model-try-on'; stray 'woocommerce' on a WC tab fixed.
2. Escaping: every dynamic echo uses esc_html/esc_attr/esc_url/esc_js/wp_kses_post.
3. Inline scripts mutated via str_replace on the loader tag (no NonEnqueuedScript warning).
4. File ops: unlink/rmdir/mkdir/is_writable/parse_url/rename/date → wp_delete_file / WP_Filesystem / wp_mkdir_p / wp_is_writable / wp_parse_url / WP_Filesystem::move / gmdate.
5. $wpdb: custom-table queries prepared, ORDER BY whitelisted, phpcs:disable only where the table comes from $wpdb->prefix.
6. $_REQUEST/$_SERVER: 18 reads wrapped with wp_unslash() + sanitize_text_field().
7. wp_redirect → wp_safe_redirect on the manual admin action, with nonce + cap check.
8. Anonymous closure on remove_filter('upload_dir') replaced by a named method (now actually unregisters).
9. Admin menu position 20 → '80.5' (no Pages collision).
10. Bootstrap-scope $file/$url/$site_url renamed to $atlas_ar_*.
11. Removed: stray localhost URL, error_log/print_r debug, Freemius SDK from Free bootstrap.
12. readme: Description ≤ 2500 chars, 2.0.3 upgrade notice ≤ 300 chars.
13. ABSPATH guards added to includes/AR_TRY_ON_Constants.php and Hooks.php.

Plugin Check: 0 errors, 30 warnings (all NamingConventions informational; renaming the AR_TRY_ON namespace would break the Pro extension contract — happy to schedule for a major version).

Source + per-fix commits: https://github.com/azizulhasan/ar-vr-3d-model-try-on/tree/feature/AR-61

Thank you,
AtlasAiDev
```

---

## Post-release housekeeping

After SVN goes through:

1. Merge `feature/AR-61` → `develop` → `main` on GitHub (separate task —
   keeps long-term branches in sync with what's actually shipped).
2. Update `plan/AR-61-wp-org-guideline-fixes.md` §8 to mark the SVN
   release row as ✅.
3. Update the atlasar skill's `references/gotchas-and-bugs.md` §"Closure
   remediation" to reflect the released-on-wp.org state.
4. Pro side: separate release (no SVN; ship the `production/...zip` from
   the Pro repo wherever Pro is distributed).
