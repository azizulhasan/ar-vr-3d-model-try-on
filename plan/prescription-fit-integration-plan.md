# Prescription-Grade Fit — Integration Plan (AR-60)

**Plugin context:** `ar-vr-3d-model-try-on` (Free, v2.0.0) + `ar-vr-3d-model-try-on-pro` (Pro, v3.0.0)
**This doc operationalises:** [`prescription-fit-research.md`](prescription-fit-research.md)
**Companion doc:** [`tensorflowjs-integration-plan.md`](tensorflowjs-integration-plan.md) — the AtlasTryOn v1 plan; this is its successor.
**Branches:** `feature/AR-60` on both plugins (already started).
**Target versions:** Free **2.1.0**, Pro **3.1.0**.

**Scope (updated 2026-05-13):** this doc covers the **shared Free foundation** (Landmarker Manager, OpenCV.js card calibration, schema, REST routes, generic measurement engine). Each product-family Pro addon has its own dedicated plan doc:

- [`atlasar-face-addon.md`](atlasar-face-addon.md) — Glasses & Caps visual try-on (already shipped 3.0.0)
- [`atlasar-fit-addon.md`](atlasar-fit-addon.md) — Glasses prescription-grade fit + PD (AR-60, this release)
- [`atlasar-watch-addon.md`](atlasar-watch-addon.md) — Wrist try-on + watch sizing
- [`atlasar-ring-addon.md`](atlasar-ring-addon.md) — Finger try-on + ring sizer
- [`atlasar-shoe-addon.md`](atlasar-shoe-addon.md) — Foot try-on + shoe sizer

Each addon ships as a **separately purchasable Freemius product**. The Free plugin alone provides visual try-on without measurement / verdict UI; addons unlock the fit-feedback layer per product family.

---

## 0. Why This Is a New Sub-System, Not a Bolt-On

AtlasTryOn v1 answered *"how does it look?"* using only normalised landmark coordinates. The fit-measurement layer answers *"will it fit?"* — that needs a **metric scale**, which v1 has no concept of.

The two pipelines share the **same Face Landmarker output** but diverge at the next step: v1 feeds landmarks into a renderer; fit-measurement feeds the same landmarks into a measurement engine with a card-derived pixels-per-mm scalar. They run side-by-side, not on top of each other.

Conceptually this is **AtlasTryOn Phase 2**. Free 2.1.0 ships the universal browser path (card calibration); Pro 3.1.0 ships the premium features (multi-metric, optician handoff, native-shim hooks).

---

## 1. Naming Conventions (existing — do not invent new)

| Element | Value |
|---|---|
| Composer namespaces | `AR_TRY_ON\Fit` (`includes/Fit/`), `ATLAS_AR_API\Fit` (`api/Fit/`) for Free; `AR_TRY_ON_Pro\Fit` for Pro |
| Function prefix | `atlas_ar_fit_` |
| Constant prefix | `ATLAS_AR_FIT_` |
| JS module prefix | `tryon-fit-` (matches existing `tryon-*`) |
| REST namespace | `ar_try_on/v1/fit/*` (Free), `ar_try_on_pro/v1/fit/*` (Pro) |
| Hook prefix | `atlas_ar_fit_*` (filters), `atlasar_fit_*` (actions, follows existing addon convention) |
| Post-meta sub-key | `ar_try_on_product_settings.fit_dimensions` |
| Settings key | `ar_try_on_settings.fit_*` |
| Tailwind prefix | `art-` (unchanged) |

No new namespaces, no new prefixes. Everything sits under existing roots.

---

## 2. Existing Architecture Recap (relevant excerpt)

- v1 face pipeline: `tryon-bootstrap.js` → lazy-imports `tryon-controller.js` → opens `getUserMedia` → spawns `face-landmarker.worker.js` (MediaPipe) → emits landmark events.
- Pro Pattern-2 renderer hooks into those landmark events to draw a 3D overlay.
- Per-product config stored in `ar_try_on_product_settings` post-meta JSON blob; admin UI is the metabox React app at `src/metabox/`.

The fit-measurement pipeline plugs into the **same getUserMedia stream + same landmark events**, adding a parallel **card-detection worker** and a **measurement engine**.

---

## 3. Implementation Plan — Free Plugin (2.1.0)

### 3.1 New files

```
public/js/tryon/fit/
├── fit-bootstrap.js               # entry; mirrors tryon-bootstrap.js pattern
├── fit-controller.js              # orchestrates card-detect → measure → verdict
├── fit-card-detector.js           # OpenCV.js wrapper; ISO 7810 detection
├── fit-measurement-engine.js      # landmarks + pixels_per_mm → PD / face_width / etc.
├── fit-ui.js                      # overlay UI (card guide, verdict card)
└── workers/
    └── card-detector.worker.js    # OpenCV.js runs off the main thread

includes/Fit/
├── AR_TRY_ON_Fit.php              # bootstrapper, registers hooks + REST
├── AR_TRY_ON_Fit_Schema.php       # fit_dimensions sub-key reader/writer
├── AR_TRY_ON_Fit_Settings.php     # global settings (enabled / disabled, partner)
└── AR_TRY_ON_Fit_Order_Meta.php   # store PD / verdict against WooCommerce order

api/Fit/
└── AR_TRY_ON_Fit_Routes.php       # /ar_try_on/v1/fit/* endpoints

src/metabox/components/
└── FitDimensionsSection.js        # admin UI for per-product fit_dimensions input

src/dashboard/components/dashboard/settings/
└── FitSettings.js                 # admin UI for global fit_* settings
```

### 3.2 Modified files

| File | Change |
|---|---|
| `ar-vr-3d-model-try-on.php` | Boot `AR_TRY_ON_Fit::instance()` after existing `AR_TRY_ON_Tryon` boot |
| `includes/AR_TRY_ON.php` | Register fit-related hooks via loader |
| `public/AR_TRY_ON_Public.php` | Enqueue `fit-bootstrap.js` when shortcode/block has `fit-enabled` attribute |
| `public/js/tryon/tryon-ui.js` | Add a secondary "Measure my fit" button next to the existing "Try It On" — only when product has `fit_dimensions` populated |
| `webpack.mix.js` | New entry for `fit-bootstrap.js` → `public/js/build/fit-bootstrap.dist.js` |
| `gulpfile.js` | Exclude `public/js/tryon/fit/**/*.js` (source) from production zip; ship only built output |
| `src/metabox/components/ContentSection.js` | Inject `<FitDimensionsSection>` after the existing placement section |
| `includes/AR_TRY_ON_Helper.php` | Add `get_fit_dimensions($post_id)` and `has_fit_dimensions($post_id)` helpers |
| `readme.txt` | New "Fit Measurement (NEW)" section in description + new FAQ |

### 3.3 New filter / action hooks Free MUST expose for Pro extension

| Hook | Type | Args | Purpose |
|---|---|---|---|
| `atlas_ar_fit_enabled_for_product` | filter | `$enabled, $post_id` | Pro can force-enable / force-disable per product or by capability |
| `atlas_ar_fit_calibration_strategy` | filter | `$strategy, $post_id` | Free returns `'iso_7810_card'`; Pro can override to `'arkit_anchor'` / `'arcore_face'` |
| `atlas_ar_fit_measurement_pipeline` | filter | `$pipeline_class, $post_id` | Pro replaces the Free measurement engine with the multi-metric Pro engine |
| `atlas_ar_fit_verdict_rules` | filter | `$rules, $post_id, $measurements` | Pro injects more sophisticated verdict logic (lens optical centre alignment etc.) |
| `atlas_ar_fit_pdf_report` | filter | `$pdf_class, $order_id` | Pro renders an optician-grade PDF report |
| `atlasar_fit_measurement_recorded` | action | `$post_id, $measurements, $session_id` | Pro logs to optician partner / WooCommerce order meta |
| `atlasar_fit_verdict_shown` | action | `$post_id, $verdict, $shopper_meta` | Analytics hook |
| `atlasar_before_fit_ui` | action | — | Pro injects calibration-mode toggle (card vs ARKit) |
| `atlasar_after_fit_ui` | action | — | Pro injects "Save measurements to my profile" button for logged-in shoppers |

These mirror the existing `atlas_ar_tryon_*` and `atlasar_*` hook patterns from v1.

### 3.4 Free settings (added to existing `ar_try_on_settings` option)

```php
[
  'fit_enabled'             => true,          // global on/off
  'fit_calibration_method'  => 'iso_7810',    // future: 'arkit' | 'arcore' (Pro)
  'fit_show_pd'             => true,          // surface PD number in verdict UI
  'fit_show_verdict_badge'  => true,          // "Fits / Tight / Loose" badge
  'fit_save_to_order_meta'  => true,          // store measurements per WC order
  'fit_disclaimer_text'     => '…',           // mandatory regulatory disclaimer
]
```

Surfaced in the dashboard React app under Settings → Fit.

### 3.5 Per-product schema (post-meta `ar_try_on_product_settings.fit_dimensions`)

```json
{
  "fit_dimensions": {
    "type": "glasses",
    "lens_width": 52,
    "bridge": 18,
    "temple_length": 145,
    "frame_total_width": 138,
    "vertical_lens_height": 38,
    "optical_centre_height": 19
  }
}
```

Or for caps:

```json
{
  "fit_dimensions": {
    "type": "cap",
    "head_circumference_min": 540,
    "head_circumference_max": 580,
    "peak_height": 65,
    "brim_width": 70
  }
}
```

Reader: `AR_TRY_ON_Fit_Schema::get($post_id)` returns the normalised array or `null`.
Writer: `AR_TRY_ON_Fit_Schema::set($post_id, $data)` validates units (mm), ranges (5–500 mm for any single dimension), and persists.

### 3.6 v1 free capability (face only, no head circumference)

Free 2.1.0 ships:
- Card calibration (ISO 7810 via OpenCV.js)
- PD measurement
- Face width measurement
- "Fits / Tight / Loose" verdict for **glasses-only** products
- Admin UI for entering glasses dimensions
- No cap fit (deferred to Pro)
- No optician-partner integration

This is intentional — narrows the regulatory and engineering surface area. Caps come in Free 2.2.0.

---

## 4. Implementation Plan — Pro Plugin (3.1.0)

**Updated 2026-05-13.** The Pro side is no longer a single block of "Fit Pro features." Each product family is its own purchasable addon, with its own dedicated plan doc — see the list at the top of this file. This section covers only the **glasses fit addon** (`atlasar-fit-addon`) which is the AR-60 deliverable; Watch / Ring / Shoe are planned separately.

For non-fit-addon work see:
- Already-shipped: [`atlasar-face-addon.md`](atlasar-face-addon.md) (Glasses & Caps visual try-on)
- Planned: [`atlasar-watch-addon.md`](atlasar-watch-addon.md), [`atlasar-ring-addon.md`](atlasar-ring-addon.md), [`atlasar-shoe-addon.md`](atlasar-shoe-addon.md)

### 4.1 New addons

```
addons/atlasar-fit-addon/
├── addon.json                     # display: "AtlasTryOn — Fit Measurement Pro"
├── addon.php                      # boot, register Pro hooks
├── fit-pro-renderer.js            # extended verdict UI (mm-precise overlay)
├── fit-pro-measurement-engine.js  # bridge + temple + optical-centre logic
├── fit-pro-arkit-shim-hooks.js    # placeholder shim hook for ARKit (no native code shipped)
└── fit-pro-pdf-report.js          # browser-side PDF generation (jsPDF)
```

### 4.2 Pro hooks Free's filters

| Free hook | Pro behaviour |
|---|---|
| `atlas_ar_fit_calibration_strategy` | Add `arkit` / `arcore` options to UI (gated by JS feature-detect) |
| `atlas_ar_fit_measurement_pipeline` | Replace Free pipeline with Pro multi-metric pipeline |
| `atlas_ar_fit_verdict_rules` | Add: optical-centre alignment, bridge-fit, multi-criterion verdict |
| `atlas_ar_fit_pdf_report` | Generate signed PDF for prescription orders |
| `atlasar_fit_measurement_recorded` | Push to optician partner API (see 4.4) |

### 4.3 New Pro REST endpoints (`ar_try_on_pro/v1`)

```
POST /ar_try_on_pro/v1/fit/measurements        # save shopper measurements per order
GET  /ar_try_on_pro/v1/fit/order/{id}/report   # download optician PDF report
POST /ar_try_on_pro/v1/fit/optician/dispatch   # send to partner verification API
```

All gated by `edit_shop_orders` or shopper-scoped session capability.

### 4.4 Optician-verification partner adapter

Pro ships a **base class** + **partner adapters**. Merchants pick one in settings.

```php
abstract class AR_TRY_ON_Pro_Fit_Optician_Adapter {
    abstract public function dispatch(array $measurements, array $prescription, int $order_id): string; // returns partner job id
    abstract public function status(string $job_id): array;
    abstract public function complete_callback(): void;
}
```

Initial concrete adapters:
- `AR_TRY_ON_Pro_Fit_Yepoc_Adapter`
- `AR_TRY_ON_Pro_Fit_Topology_Adapter`
- `AR_TRY_ON_Pro_Fit_Manual_Adapter` (no-op — merchant reviews manually)

### 4.5 Per-order admin UI (WooCommerce)

New order-edit screen widget showing:
- PD (mm)
- Face width (mm)
- Verdict (fits / tight / loose)
- Optician-verification status (if partner configured)
- Download PDF report button

Implemented as a WooCommerce order admin metabox via `woocommerce_admin_order_data_after_order_details` action.

### 4.6 Native-shim hooks (documented, not shipped)

The plan documents how a merchant **could** wire ARKit / ARCore in a companion app:

- `atlas_ar_fit_calibration_strategy` filter set to `'arkit'`
- Companion iOS app posts `{ipd_mm, face_geometry_mm}` via `window.postMessage` to the embedded WP site
- A new `fit-arkit-bridge.js` (loaded by addon) listens for that message and bypasses card calibration

We ship the **bridge JS** and the **hook**, but **not** the native iOS / Android app. That's a merchant-side or partnership project. Doc explicitly: *"Pro doesn't ship a native companion app. Card calibration is the production feature; native shim is an extension point for advanced merchants."*

---

## 5. Roadmap

### Phase 0 — Branches + scaffolding (week 1)
- ✅ `feature/AR-60` started on Free + Pro (done — both repos)
- Write skeleton classes (`AR_TRY_ON_Fit`, `AR_TRY_ON_Fit_Schema`)
- Add empty hook stubs so Pro can start wiring against them
- Add `webpack.mix.js` entry for `fit-bootstrap.dist.js`

### Phase 1 — Free card-calibration MVP (weeks 2–3)
- OpenCV.js integration + card-detector worker
- Card detection stability gate
- PD + face_width measurement from existing Face Landmarker landmarks + card scale
- Glasses-only verdict logic
- Metabox UI: `FitDimensionsSection` for glasses
- Public UI: "Measure my fit" button + overlay flow
- Settings page: enable/disable, disclaimer text
- REST endpoint: save measurements to order meta
- E2E test: synthetic card image → expected pixels-per-mm

**Acceptance:** A merchant can enter `52 / 18 / 145 / 138` for a frame, a shopper can hold a credit card up, the system reports PD in mm and a verdict, accuracy verified against a known reference (±1 mm).

### Phase 2 — Pro multi-metric + admin (weeks 4–5)
- Pro addon `atlasar-fit-addon`
- Bridge + temple + optical-centre metrics
- WooCommerce order admin widget showing measurements
- PDF report generation (jsPDF)
- Manual optician adapter (no-op)
- Cap fit (head circumference single-view estimate)

**Acceptance:** Pro merchant sees full measurement set on every order; can download a PDF.

### Phase 3 — Optician partner adapter (weeks 6–7)
- Yepoc adapter + sandbox testing
- Topology adapter
- Partner-API REST callback handling
- Settings UI for partner credentials

**Acceptance:** Test order routes through partner sandbox; status flows back into order meta.

### Phase 4 — Documentation + regulatory (week 8)
- Update `plan/virtual-tryon-documentation.md` with fit-measurement section
- Add regulatory disclaimer copy templates (US, EU, UK, AU, CA)
- Update readme.txt for Free 2.1.0 / Pro 3.1.0
- Marketing copy review (no claims that exceed what's legal)

### Phase 5 — Native-shim docs (week 9)
- Document `atlas_ar_fit_calibration_strategy` filter for ARKit / ARCore
- Sample iOS Capacitor wrapper repo (separate GitHub repo, not in plugin)
- Sample Android Capacitor wrapper repo

### Phase 6 — Release (week 10)
- `git flow release start 2.1.0` (Free) / `3.1.0` (Pro)
- `npm run production`
- Versions, changelog, upgrade notice
- Release finish → push → tags

---

## 6. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| OpenCV.js bundle ≥ 3 MB hurts mobile shoppers' page weight | High | Medium | Lazy-load behind "Measure my fit" click — page-render impact: zero |
| Card detection fails in low light | Medium | Medium | Brightness toggle (Mobile MediaStreamTrack.applyConstraints), manual 4-tap fallback |
| Shopper holds card at angle | Low | Low | Homography handles it; explicit UI prompt for "hold flat against forehead" |
| Regulator letter — "this is medical advice" | Medium | High | Disclaimer copy front and centre; legal review per region before launch |
| Optician partner API change breaks dispense flow | Medium (per partner) | High | Wrap each adapter in its own class; degrade to manual adapter on failure |
| ARKit / ARCore "marketed but missing" | Medium | Low | Don't market either in copy. The hook system exists for merchants to wire, but card path is the production feature. |
| Fit-measurement noise drops verdict accuracy below 95% | Medium | High | Pre-launch validation against a reference dataset; tune thresholds; ship in beta first |
| WooCommerce order meta bloat | Low | Low | Store only the 5 most relevant numbers; PDF is generated on-demand from those |
| GDPR / CCPA — measurements are biometric | Medium | High | Default OFF; explicit consent UI; "do not store" option |

---

## 7. Open Questions Before Phase 1

1. **Card-detection library choice:** OpenCV.js (3 MB, mature) vs a custom Canny+contour TFLite model (~500 KB, less robust). Recommendation: ship OpenCV.js — accuracy beats bundle size for this feature.
2. **Stability threshold:** how many consecutive frames before we accept the card? 5 is reasonable. Tune in beta.
3. **UI for "card not detected":** countdown timer, retry prompt, manual mode after N seconds?
4. **Caps in Free or Pro?** Plan above says Pro — confirm.
5. **Optician partner — which first?** Yepoc has cleanest API docs; need merchant outreach to decide.
6. **PDF report — branded per merchant?** Custom logo upload + merchant address fields in settings.
7. **Measurement saved per logged-in shopper across visits?** Phase 2 — needs explicit consent.
8. **Regulatory disclaimer copy** — who owns the legal review? Likely external counsel per region.

---

## 8. Acceptance Tests

Each phase has a measurable acceptance test. Aggregating:

| Test | Target | Phase |
|---|---|---|
| Card detection on still image of a card | success within 5 frames in 95% of test images | Phase 1 |
| PD accuracy on reference set (10 faces, known PDs) | mean error ≤ 1 mm, max error ≤ 2 mm | Phase 1 |
| Verdict correctness on synthetic dataset | ≥95% match against ground truth | Phase 1 |
| Pro PDF report renders correctly | A4 + Letter, all fields populated | Phase 2 |
| Yepoc sandbox round-trip | order → measurement → optician → confirm | Phase 3 |
| GDPR consent flow | no measurement saved without explicit consent | Phase 4 |

---

## 9. Cross-references

- [`prescription-fit-research.md`](prescription-fit-research.md) — research/rationale doc this plan operationalises.
- [`tensorflowjs-research.md`](tensorflowjs-research.md) — the v1 ML research; Face Landmarker (already integrated) feeds the measurement engine.
- [`tensorflowjs-integration-plan.md`](tensorflowjs-integration-plan.md) — the v1 integration plan; this is its successor for Phase 2 fit-measurement.
- [`virtual-tryon-documentation.md`](virtual-tryon-documentation.md) — customer-facing docs; will get a new "Fit Measurement" section in Phase 4.
- [`auto-fit-roadmap.md`](auto-fit-roadmap.md) — earlier auto-fit work; this plan picks up where that left off.
- `CLAUDE.md` — plugin conventions, namespaces, hook prefixes.
