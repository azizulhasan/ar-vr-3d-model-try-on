# Creating the `atlasar` Skill

This document mirrors the structure of the existing `atlasvoice` skill at
`C:\Users\ASUS\.claude\skills\atlasvoice\` and lays out what to put in each
file for the new `atlasar` skill. Once filled in, drop the folder at
`C:\Users\ASUS\.claude\skills\atlasar\` and it will be auto-loaded by Claude
Code the next time it spawns.

---

## 1. Folder layout to mirror

```
C:\Users\ASUS\.claude\skills\atlasar\
├── SKILL.md                              ← frontmatter + 1-page summary
└── references\
    ├── free.md                           ← Free internals
    ├── pro.md                            ← Pro internals
    ├── bridge.md                         ← shared hooks/options/meta
    ├── model-system.md                   ← AR analogue of player-system.md
    ├── rest-and-data.md                  ← AR analogue of rest-and-analytics.md
    ├── tripo-meshy-mediapipe.md          ← AR analogue of voice-providers-mp3-gcs.md
    ├── compatibility.md                  ← caching, page-builders, theme conflicts (no multilingual here)
    ├── operation-modes.md                ← free-only vs free+pro sync
    ├── telemetry-privacy-freemius.md     ← copy + adjust from atlasvoice
    └── gotchas-and-bugs.md               ← known issues, lockstep rules, test matrix
```

Total: 1 `SKILL.md` + 10 reference files (same shape as atlasvoice). All paths
canonical under `D:\mamp\htdocs\azizulhasan\tts\wp-content\plugins\`. Cite code
by class/method/hook name, **never by line number** (drifts with development).

---

## 2. `SKILL.md` — frontmatter + 1-page summary

Use this as the literal file body; replace the bracketed bits.

```markdown
---
name: atlasar
description: >
  Architecture and cross-plugin rules for the AtlasAR augmented-reality / 3D-model-try-on
  product — the FREE plugin "3D Viewer – 3D Model Viewer – Augmented Reality – Virtual Try On"
  (slug ar-vr-3d-model-try-on) and its companion PRO plugin (slug ar-vr-3d-model-try-on-pro /
  "AtlasAR Pro"). Use whenever editing PHP, React, or build config in EITHER plugin, because
  almost every change in one affects the other — they share option/meta keys, bridge through
  ar_try_on_*/atlasar_* filters, and Pro hard-depends on Free. Covers bootstrap & class maps,
  the bridge (shared hooks/options/meta), the model + try-on system, REST (ar_try_on/v1 +
  ar_try_on_pro/v1) & post-meta layout, Tripo3D + Meshy AI + MediaPipe + <model-viewer>
  integration, GLB/USDZ/compression handling, free-only vs free+pro operation,
  telemetry/privacy/Freemius, build/release, and known bugs. Apply on
  can_user_compress(), prepare_compression(), generate_3d_model, get_route_access,
  AR_TRY_ON_Helper / AR_TRY_ON_Pro_Helper, or anything on the free/pro boundary. Pair with
  wordpress-plugin-guidelines.
---

# AtlasAR — Free + Pro Architecture

Two plugins, one product. **The cardinal rule: never change one plugin without checking the
other.** They share WordPress option/meta keys, bridge through filters, and Pro `include`s
Free's code and declares `Requires Plugins: ar-vr-3d-model-try-on`.

- **Free** — `wp-content/plugins/ar-vr-3d-model-try-on` — slug `ar-vr-3d-model-try-on`,
  namespace `AR_TRY_ON\`, wp.org-hosted. Ships the basic 3D viewer + try-on UI. Must obey
  wp.org guidelines.
- **Pro** — `wp-content/plugins/ar-vr-3d-model-try-on-pro` — slug `ar-vr-3d-model-try-on-pro`,
  namespace `AR_TRY_ON_Pro\`, sold off-wp.org. Adds model compression, Tripo3D / Meshy AI
  generation, bulk processing, and the premium parts of the dashboard.

> Canonical paths under `D:\mamp\htdocs\azizulhasan\tts\wp-content\plugins\`. **Cite code by
> class/method/hook name, never line numbers** — line numbers drift as development continues.

## Before you change code — the checklist

1. **Does this symbol exist in both plugins?** `AR_TRY_ON_Helper`↔`AR_TRY_ON_Pro_Helper`,
   `AR_TRY_ON_Cache`↔`AR_TRY_ON_Pro_Cache`, plus duplicated `Libs/AtlasAiDev/` and
   `freemius/`.
2. **Does it read/write a shared option or post-meta key?** (`ar_try_on_settings`,
   `ar_try_on_model_data`, plus any per-post meta listed in `references/bridge.md`). Schema
   changes land in BOTH plugins, same release.
3. **Does it touch a bridge filter/action?** (`ar_try_on_*` / `atlasar_*` — see `bridge.md`).
4. **Will Free still work with Pro INACTIVE *and* ACTIVE?** Free must be fully functional
   alone. wp.org's Guideline-5 closure (AR-61) was triggered by premium-feature code living
   in Free.
5. **Did a JS/React bundle change?** Rebuild the affected webpack target.
6. **wp.org compliance for the free plugin?** Pair with the `wordpress-plugin-guidelines`
   skill. AR-61 closure plan is at
   `plan/AR-61-wp-org-guideline-fixes.md` — that's the source of truth for what must NOT
   re-enter the free build.

## The model / try-on system (the trialware-sensitive core)

[ Fill in equivalent table to atlasvoice's player table:
- model types (GLB / USDZ / generated)
- try-on modes (face filter / surface AR / scene)
- which features ship in Free vs Pro
- gate function names + the location of the wp.org-flagged trialware lock
  (currently `can_user_compress()` / `prepare_compression()` 5-model cap) ]

## Reference index

- [`references/free.md`](references/free.md) — Free internals: bootstrap, class map,
  options/meta, shortcodes, build, i18n, activation/reset.
- [`references/pro.md`](references/pro.md) — Pro internals: bootstrap, class map, Pro-only
  REST routes, constants, coupling to Free.
- [`references/bridge.md`](references/bridge.md) — every shared filter/action, shared
  option/meta keys, build coupling, duplicated classes.
- [`references/model-system.md`](references/model-system.md) — model upload pipeline,
  GLB/USDZ handling, compression flow, try-on mode selection.
- [`references/rest-and-data.md`](references/rest-and-data.md) — `ar_try_on/v1` +
  `ar_try_on_pro/v1` routes, permission policy, post-meta layout, file storage.
- [`references/tripo-meshy-mediapipe.md`](references/tripo-meshy-mediapipe.md) — Tripo3D
  generation, Meshy AI generation, MediaPipe face landmarker, `<model-viewer>` + DRACO/KTX2
  decoders.
- [`references/compatibility.md`](references/compatibility.md) — caching exclusions,
  page-builder shortcodes, theme/iframe quirks.
- [`references/operation-modes.md`](references/operation-modes.md) — free-only vs free+pro
  sync, ownership, failure modes.
- [`references/telemetry-privacy-freemius.md`](references/telemetry-privacy-freemius.md) —
  AtlasAiDev telemetry, opt-in, privacy, external endpoints, Freemius status.
- [`references/gotchas-and-bugs.md`](references/gotchas-and-bugs.md) — known bugs, lockstep
  rules, test matrix, release conventions.

## Known gotchas (verified [DATE])

- **Trialware lock** in Free `can_user_compress()` / `prepare_compression()` (Guideline-5;
  AR-61 closure). The fix is to MOVE the compression flow + REST out of Free entirely; do
  not re-introduce it behind a Pro-version guard (wp.org will re-flag).
- **`raw.githubusercontent.com` unconsented marketing fetch** in
  `admin/AR_TRY_ON_Admin.php` — Guideline 7. Remove from Free.
- **Hardcoded MediaPipe + Google `<model-viewer>` decoder URLs** in
  `includes/AR_TRY_ON_Tryon.php` and `public/js/google-model-viewer.js` — Guideline 6.
  Either bundle locally or disclose as service in readme.
- **Text-domain mismatch** — ~50 strings use `'atlasaidev'` instead of slug
  `'ar-vr-3d-model-try-on'`.
- **Admin menu position 20** collides with WordPress core items. Move under Settings or
  pick a non-conflicting slot.
- **Anonymous closure passed to `remove_filter`** in
  `api/AR_TRY_ON_Compression_Routes.php` — can never actually remove the filter.
- Always verify names against current code — line numbers drift.
```

---

## 3. Per-reference file recipes

Each reference is ~100-300 lines. Start by copying the same-named file from
`C:\Users\ASUS\.claude\skills\atlasvoice\references\` and rewriting under
"find/replace" plus the AR-specific notes below.

### `free.md`
Free plugin internals.
- **Bootstrap order**: plugin header → `ar-vr-3d-model-try-on.php` autoload → Composer →
  `plugins_loaded:9999` → main class `AR_TRY_ON_Init` (or whatever it's named) → loader
  → init priority 9999 → REST routes + admin notices + library bridges.
- **Class map**: PSR-4 namespaces (`AR_TRY_ON\` → `includes/`, `AR_TRY_ON_Admin\` → `admin/`,
  `AR_TRY_ON_Public\` → `public/`, `AR_TRY_ON_Api\` → `api/`, `AtlasAiDev\AppService\` →
  `libs/AtlasAiDev/`).
- **Settings storage**: `ar_try_on_settings`, `ar_try_on_model_data`, plus any options
  registered in the React dashboard's Settings tab.
- **Shortcodes / blocks**: list the public-facing shortcodes (e.g. `[ar_viewer]`) and
  Gutenberg blocks the free plugin ships.
- **Build commands**: webpack / gulp targets, where the React dashboard source lives, the
  ZIP / production pipeline.
- **Activation / reset**: `AR_TRY_ON_Activator::activate()`, any first-run setup wizard,
  uninstall.php behavior.

### `pro.md`
Pro plugin internals (sibling of `free.md`).
- Bootstrap order: declares `Requires Plugins: ar-vr-3d-model-try-on`, autoloads, hooks at
  `plugins_loaded:9999`.
- Class map: `AR_TRY_ON_Pro\` namespace, `Includes/` folder layout, `Api/` Pro routes,
  `Libs/` (mirror of Free's `libs/AtlasAiDev/`).
- Pro-only constants (e.g. `AR_TRY_ON_PRO_VERSION`, `AR_TRY_ON_PRO_PLUGIN_PATH`).
- Coupling points to Free (which Free classes Pro composes for shared helpers — analogous
  to AtlasVoice Pro's `new \TTA_Api\AtlasVoice_Analytics()` for `calculate_date_range`).
- Freemius init (Pro keeps Freemius even after Free removes it).

### `bridge.md`
The contract between Free and Pro. Critical file.
- **Shared filters** — list every `ar_try_on_*` and `atlasar_*` filter that one plugin
  fires and the other listens for (or vice versa). Format: `filter_name | fired by |
  consumed by | purpose | added in version`.
- **Shared actions** — same table for `do_action()` / `add_action()`.
- **Shared option keys** — `ar_try_on_settings`, etc., with schema (sub-keys + types).
- **Shared post-meta keys** — list every meta key both plugins read/write (e.g.
  `ar_try_on_model_url`, `ar_try_on_compression_status`).
- **Shared JS globals** — what gets localized on `wp_localize_script` for each plugin and
  what the React dashboard expects (e.g. `arTryOnObj`, `arTryOnObjPro`).
- **Duplicated classes** — `AR_TRY_ON_Helper` ↔ `AR_TRY_ON_Pro_Helper`, etc. — when you
  change one, change the other.
- **REST namespaces** — `ar_try_on/v1` (Free) vs `ar_try_on_pro/v1` (Pro). Which routes
  live where; what the dashboard JS calls.

### `model-system.md`
The AR equivalent of atlasvoice's `player-system.md`.
- **Try-on modes** — surface AR, face filter, scene placement, etc. Which are free vs pro.
- **Model types** — GLB, USDZ, generated-via-Tripo3D, generated-via-Meshy. Free vs Pro
  capability matrix.
- **The trialware-sensitive gate** — `can_user_compress()` 5-model cap. Document exactly
  where it lives and the wp.org-mandated fix: removal (not just gate disable).
- **Model storage layout** — `wp-content/uploads/ar-try-on/...` folder structure.

### `rest-and-data.md`
- Every REST route in Free (`ar_try_on/v1/...`) — method, callback, permission_callback,
  args, what it returns.
- Every REST route in Pro (`ar_try_on_pro/v1/...`) — same shape.
- Per-route permission policy (admin-only vs frontend-nonce vs public). Flag the routes
  that AR-61 closure called out for using bypassable `get_route_access`.
- Post-meta layout — what gets written by each route.
- File storage paths.

### `tripo-meshy-mediapipe.md`
The AR equivalent of atlasvoice's `voice-providers-mp3-gcs.md`.
- **Tripo3D** — API base URL, auth header pattern, the `generate_3d_model` REST flow,
  where user API key is stored, retry/error handling. Note: Guideline 6 requires
  documenting this in readme's `== External services ==`.
- **Meshy AI** — same shape.
- **MediaPipe face landmarker** — WASM bundle source (`cdn.jsdelivr.net` flagged by
  wp.org), face model source (`storage.googleapis.com` flagged), how the try-on worker
  uses it.
- **Google `<model-viewer>` component** — DRACO + KTX2 + Lottie loaders, default external
  URLs, how to override to local-bundled decoders.

### `compatibility.md`
- Caching plugins — JS exclusion filters (LiteSpeed, WP Rocket, Autoptimize, W3TC, SG
  Optimizer, WP-Optimize). Which file paths must be excluded.
- Page builders — Elementor, Divi, WPBakery, Bricks. Any known shortcode-rendering
  quirks.
- Theme conflicts — full-width / boxed layout impact on the AR viewport.
- iframe / cross-origin behavior — model-viewer in iframes, COOP/COEP headers.
- No multilingual section needed (AR plugin is product-images / 3D — content language
  doesn't apply the way it does to TTS).

### `operation-modes.md`
Free-only vs Free+Pro sync.
- What runs in Free-only mode (basic viewer, basic try-on).
- What runs only when Pro is active (compression, AI generation, bulk processing).
- The dangerous combo: **new Free + old Pro** (analogous to TTS-247 scenario) — what
  breaks, why, and the release-ordering rule (Pro first, then Free — see AR-61 plan §9.5).
- The other dangerous combo: **new Pro + old Free** — usually safer, but verify.
- Failure modes: Pro deactivated mid-use, license expired, etc.

### `telemetry-privacy-freemius.md`
Mostly copy from atlasvoice — the `libs/AtlasAiDev/` library is identical.
- AtlasAiDev telemetry — what it sends, where (`track.atlasaidev.com`), opt-in toggle key.
- `icanhazip.com` geolocation — also opt-in.
- Freemius status — active in Pro, removed from Free for wp.org compliance.
- The unconsented external calls AR-61 closure flagged
  (`raw.githubusercontent.com/atlasaidev/plugins/main/plugins.json`) — must be removed
  from Free.

### `gotchas-and-bugs.md`
Living document — append as bugs are discovered.
- Known bugs (with reproduction + workaround + ticket link).
- Lockstep rules — symbol/file pairs that must be edited together (Helper / Pro Helper,
  Cache / Pro Cache, the bridge filters in both directions).
- Test matrix — what to verify on every release (Free-only smoke, Free+Pro smoke,
  Free+Pro on a clean WP install with `WP_DEBUG=true`, caching plugin combo, page-builder
  combo, mobile browser AR test).
- Release conventions — commit message prefix (`AR-{ticket}:`), version-bump-only
  release commits, branch naming (`feature/AR-XX`).

---

## 4. What's the same vs different vs atlasvoice

| Aspect | atlasvoice | atlasar |
|---|---|---|
| Two-plugin architecture | ✓ | ✓ (same pattern) |
| `Requires Plugins:` header | ✓ | ✓ |
| Pro composes Free helpers | ✓ | ✓ |
| Shared AtlasAiDev telemetry library | ✓ | ✓ (same code) |
| Freemius in Pro only (post-closure) | ✓ | ✓ (after AR-61 fix) |
| wp.org Guideline-5 trialware history | ✓ (player clamp) | ✓ (compression cap) |
| Multilingual handling | core feature | N/A — skip the section |
| Premium feature gate | `get_player_id()` | `can_user_compress()` / `prepare_compression()` |
| REST namespace split | `tta/v1` + `tta_pro/v1` | `ar_try_on/v1` + `ar_try_on_pro/v1` |
| External services | gtts, GCTTS, ChatGPT, ElevenLabs | Tripo3D, Meshy AI, MediaPipe, `<model-viewer>` decoders |
| Storage | MP3 files + GCS backup | GLB/USDZ files + (optional) compression artifacts |
| Browser-side runtime | Web Speech API, Plyr | MediaPipe WASM, `<model-viewer>`, WebGL/WebXR |

---

## 5. Drop-in checklist

1. `mkdir -p C:\Users\ASUS\.claude\skills\atlasar\references`
2. Create `SKILL.md` using the template in section 2 above; fill in the bracketed parts.
3. For each of the 10 reference files, copy the corresponding atlasvoice file as a
   starting point, then rewrite per the recipes in section 3.
4. Verify the skill loads — open a new Claude Code session in any AtlasAR file; the
   `atlasar` skill should appear in the active-skills list.
5. Test the trigger by editing `can_user_compress()` or anything in `Api/` or `Includes/`
   of either plugin — Claude should auto-apply `atlasar`.
6. Keep `gotchas-and-bugs.md` updated as bugs surface; treat it as a living document.

---

## 6. Maintenance

- Pair every refactor that crosses the free/pro boundary with a bridge.md update in the
  same commit.
- When wp.org review concludes (AR-61), record the final fix shape in `gotchas-and-bugs.md`
  under a "Closure remediation 2026-05" subsection, the way AtlasVoice records TTS-247.
- Re-verify all "verified [DATE]" claims in `SKILL.md` and `gotchas-and-bugs.md` every
  major release; flag stale ones.
