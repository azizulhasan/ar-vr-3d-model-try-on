=== 3D Viewer – 3D Model Viewer – Augmented Reality – Virtual Try On  ===
Contributors: atlasaidev, hasanazizul
Tags: 3d model viewer, augmented reality, virtual try on, woocommerce, 3d viewer
Requires at least: 5.6
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 2.3.0
License: GPLv3 or later
License URI: https://www.gnu.org/licenses/gpl-3.0.txt

3D model viewer with WooCommerce AR and webcam virtual try-on for glasses & caps — view in 3D, place in AR on iOS & Android, no app needed.

== Description ==

A **3D model viewer for WordPress and WooCommerce** with augmented reality and a webcam **virtual try-on** for glasses and caps. Shoppers turn, zoom and inspect your products in 3D, place them in their room with their phone (Android and iPhone, no app), or see glasses and caps on their own face. Everything runs in the visitor's browser: the camera picture never leaves their device. Free, with no limit on models or products.

🎁 **14-day AtlasAR Pro trial** for hotspots, sizes, variations, AI 3D models and more. [Start your free trial →](https://wpaugmentedreality.com/pricing/?utm_source=wordpress.org&utm_medium=readme&utm_campaign=atlasar_3&utm_content=trial_cta)

= Free features =

* **3D view on every product**: turn, zoom, auto-rotate, your background, light and AR button colour. As many 3D views per page as you like.
* **AR on phones**: Android (Scene Viewer), iPhone and iPad (AR Quick Look, from a `.usdz` file or made from the GLB) and WebXR. A QR code on desktop opens the product in AR on a phone.
* **3D Library**: all your models in one place, kept apart from the Media Library: GLB, `.gltf` (single file), iPhone `.usdz` and poster images. Search, filters (used, not used, missing files, large files) and pages.
* **Make files lighter in your browser**: "Optimise" shrinks a heavy GLB (often by 80–90 %) at its real size; nothing is uploaded. OBJ and FBX files are converted to GLB in the browser.
* **Where it shows**: over the product gallery (photo or 3D first), as a gallery slide, a button with a popup, a product tab, or after the content; per product or for the whole shop.
* **Works with your editor**: the AtlasAR panel in the block editor and the classic editor, an **AtlasAR block** with a live preview, an **Elementor widget**, and the `[atlas_ar]` shortcode for any other page builder.
* **Virtual try-on for glasses and caps**: a "Try it on" button opens the webcam; the face tracking runs on the shopper's device. Tracking files from the public CDN or, with one click, from your own site.
* **WooCommerce**: simple and variable products, configurable positions on the product page, HPOS compatible.
* **For developers**: a documented REST API (ready for AI agents), WP-CLI (`wp atlas-ar …`) and hooks.
* **AtlasAR Cloud (optional, free plan)**: connect in one click to optimise big files at their real size on our servers, with the finished model coming back by itself. The free plan includes 20 optimisations a month: each one makes one of your existing models lighter (it does not create a new model).
* **Free 3D models**: with AtlasAR Cloud connected (free plan included), search a library of ready-made, optimised 3D models and download one into your 3D Library with one click, at no cost.

= AtlasAR Pro adds =

* **Hotspots**: click on the model to pin labelled points (materials, features, care).
* **Sizes**: the product's width, height and depth shown on the 3D view and in AR.
* **More models** on one product, and **variations**: each WooCommerce variation shows its own model or colour.
* **Try-on fit**: adjust how glasses or a cap sit on the face, and a more realistic 3D try-on.
* **Make 3D models with AI** from a product photo or a description, with AtlasAR Cloud, Meshy AI or Tripo3D, in the product editor or straight in the 3D Library.
* **Optimise in bulk** on AtlasAR Cloud, and **AtlasAR Cloud Premium** with your licence (no monthly limit, photo to 3D).

[Pro pricing →](https://wpaugmentedreality.com/pricing/?utm_source=wordpress.org&utm_medium=readme&utm_campaign=atlasar_3&utm_content=pricing_link) · [Live demos →](https://wpaugmentedreality.com/shop/?utm_source=wordpress.org&utm_medium=readme&utm_campaign=atlasar_3&utm_content=demo_shop) · [Video tutorials →](https://www.youtube.com/playlist?list=PLGdmFn36qCRKp58yEtIh747lhw3EM6m8K)


== How it works ==

1. **Install and activate** the plugin. A short setup asks where the 3D view should appear and how it should look (you can change everything later in **AtlasAR**).
2. **Add a model**: open a product (or post), find the **AtlasAR** panel and choose or upload a `.glb` file. Add a `.usdz` for iPhone and a poster image if you have them. Big file? Click **Optimise** in the 3D Library.
3. **Done**: the 3D view and the AR button appear where you chose. Anywhere else, use the AtlasAR block, the Elementor widget or `[atlas_ar]`.

For glasses and caps, turn on **Try-on** in AtlasAR › Try-on and choose the product type in the product's AtlasAR panel.


== Shop examples ==

* 🪑 **Furniture**: customers see the sofa or chair in their room, at its real size. [Office chair demo](https://wpaugmentedreality.com/product/office-chair-view-in-augmented-reality-3d/?utm_source=wordpress.org&utm_medium=readme&utm_campaign=atlasar_3&utm_content=demo_office_chair)
* 🖼️ **Home decor and wall art**: preview a frame or a rug before buying.
* 🕶️ **Eyewear and caps**: try them on with the webcam, right on the product page.


== Technical details ==

* **3D files**: `.glb`, single-file `.gltf`; iPhone AR `.usdz`; posters `.jpg`, `.png`, `.webp`. OBJ / FBX are converted to GLB in the browser.
* **Phones**: Android with ARCore, iPhone / iPad with ARKit (iOS 12+). Desktop shows the 3D view and a QR code.
* **WordPress** 5.6+, **PHP** 7.4+, **WooCommerce** optional (tested with current versions).
* **Performance**: the viewer loads only on pages that show a 3D view, and the model only when it scrolls into view. The try-on loads only after the shopper clicks "Try it on".
* **Privacy**: no visitor data is sent anywhere; the try-on camera picture stays on the device. See *External services* below.


== Our other plugins ==

🔥 [Text To Speech TTS Accessibility](https://wordpress.org/plugins/text-to-audio/): a listen button that reads your posts aloud.
🔥 [Smart Local AI](https://wordpress.org/plugins/smart-local-ai/)
🔥 [Atlas AI Connector](https://wordpress.org/plugins/ai-workflow-automation-ai-agent-hub/)


== External services ==

The services below are contacted only when their feature is used. Nothing is sent when a page with a 3D view loads: models, the viewer and its decoders are served from your own site.

= MediaPipe face tracking (jsDelivr and Google) =

Used by the webcam try-on (glasses, caps). Only after a visitor clicks "Try it on" and allows the camera, the visitor's browser downloads the MediaPipe runtime from `cdn.jsdelivr.net` and the face model from `storage.googleapis.com`. These are plain downloads of static files: no site, user or visitor data is sent, and the camera picture never leaves the visitor's device. An administrator can instead download these files once to the site (AtlasAR > Try-on > Face-tracking files > "From this site"); the same two addresses are contacted for that download only, and visitors' browsers then use the site's own copy.
jsDelivr - Terms: https://www.jsdelivr.com/terms Privacy: https://www.jsdelivr.com/terms/privacy-policy-jsdelivr-net
Google - Terms: https://policies.google.com/terms Privacy: https://policies.google.com/privacy

= AtlasAR Cloud (optional, by AtlasAiDev) =

Off unless the site owner connects it. When an administrator connects the site, the site address and the email they enter are sent to create the project; AtlasAR Cloud sends a welcome email to that address, and tips and offers only if the separate, unticked "email me tips" box was ticked. While connected, AtlasAR Cloud calls this site's REST address when a model is ready (signed with a secret only this site has). When an administrator then sends a model to be optimised, that model file and its title are sent, and the optimised files are downloaded back to the site. In 3D Library › Free 3D models, the search words and category are sent to search AtlasAR Cloud's free model library, and a model is downloaded to the site only when someone clicks Download. No visitor data is sent.
AtlasAiDev - Terms: https://atlasaidev.com/terms-and-conditions/ Privacy: https://atlasaidev.com/privacy-policy/

= AtlasAiDev usage data (track.atlasaidev.com, icanhazip.com) =

Opt-in, off by default, and can be turned off at any time (AtlasAR > Settings > "Share usage data with AtlasAiDev"). When it is on, the site sends, once a week: plugin, WordPress and PHP versions, site address, name and language, the number of active and inactive plugins, the administrator's name and email, and the site's public IP address (looked up through icanhazip.com). AtlasAiDev uses it to decide what to improve. No visitor or product data is sent.
AtlasAiDev - Terms: https://atlasaidev.com/terms-and-conditions/ Privacy: https://atlasaidev.com/privacy-policy/
icanhazip.com (Cloudflare) - Privacy: https://www.cloudflare.com/privacypolicy/

= AtlasAiDev plugin list (raw.githubusercontent.com, api.wordpress.org) =

Only when an administrator opens the "Other AtlasAiDev plugins" screen: the list of our plugins is read from `raw.githubusercontent.com/atlasaidev/plugins/main/plugins.json`, and their ratings and install counts from `api.wordpress.org`. Both are cached for a day. No site or user data is sent.
GitHub - Terms: https://docs.github.com/en/site-policy/github-terms/github-terms-of-service Privacy: https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement
WordPress.org - Privacy: https://wordpress.org/about/privacy/

= A model address you enter =

When an administrator adds a model to the 3D Library from a web address, the site downloads that one file from the address the administrator typed. No other data is sent.


== Source code ==

The complete, unminified source (GPLv3) is on GitHub: https://github.com/azizulhasan/ar-vr-3d-model-try-on. The git tag matching each wp.org version is the exact source used for that release ZIP. Rebuild from a clean clone with `composer install && npm install && npm run production`.


== Installation ==

1. In WordPress, go to **Plugins › Add New**, search for "3D Viewer AtlasAR", click **Install Now** and **Activate** (or upload the `ar-vr-3d-model-try-on` folder to `/wp-content/plugins/`).
2. The short setup opens: choose where the 3D view appears and how it looks. Everything can be changed later in **AtlasAR**.
3. Open a product (or a post or page), find the **AtlasAR** panel and choose or upload a `.glb` model. The 3D view and the AR button appear on the page.
4. Products are on by default; turn other post types on in **AtlasAR › Settings**.
5. **AtlasAR Pro**: install and activate it next to this plugin; its tabs appear in the same AtlasAR panel.

== Frequently Asked Questions ==

= Is it compatible with WooCommerce? =
Yes. Simple and variable products, several positions on the product page (gallery, slide, button, tab) and HPOS. It also works on posts, pages and custom post types, so you do not need a shop.

= Does it work with my editor or page builder? =
Yes: the AtlasAR panel works in the block editor and the classic editor; there is an **AtlasAR block** with a live preview and an **Elementor widget**; with any other builder (Divi, Beaver Builder, Bricks…), add the `[atlas_ar]` shortcode.

= Do my customers need an app for AR? =
No. AR opens from the browser: Scene Viewer on Android, AR Quick Look on iPhone and iPad. On a desktop, a QR code opens the product on a phone.

= Which 3D files can I use? =
`.glb` and single-file `.gltf` for the 3D view, `.usdz` for iPhone AR (optional: iPhones can also use the GLB), and a poster image. OBJ and FBX files are converted to GLB in your browser.

= My model file is big. What can I do? =
Open **AtlasAR › 3D Library**, choose the model and click **Optimise**: it is made lighter in your browser, at its real size if you enter its height, and the original is kept. Very big files can be optimised on AtlasAR Cloud (free plan); AtlasAR Pro optimises many at once.

= Is there a limit on models or products? =
No. As many models, products and 3D views per page as you like.

= How do I turn on the virtual try-on? =
In **AtlasAR › Try-on**, turn it on; then in the product's AtlasAR panel choose **Glasses** or **Cap**. A "Try it on" button appears on the product page.

= Is the shopper's camera picture sent anywhere? =
No. The face tracking runs in the shopper's browser; no video, picture or face data leaves the device.

= Will 3D views slow my site down? =
The viewer loads only on pages that show a 3D view, the model only when it comes into view, and the try-on only after a click. Lighter files load faster: use Optimise.

= What is AtlasAR Cloud? Do I need it? =
An optional service by AtlasAiDev, with a free plan of 20 optimisations a month: it makes your existing models lighter at their real size and hosts them. Making new 3D models with AI (photo to 3D) is part of AtlasAR Pro, not of the free plan. Connect it in **AtlasAR › Integrations** with your email; nothing is sent until you click a Cloud button. Everything else works without it.

= What does AtlasAR Pro add? =
Hotspots, sizes on the 3D view, more models and WooCommerce variations, the try-on fit, 3D models made with AI from a photo or a description (AtlasAR Cloud, Meshy AI, Tripo3D), bulk optimisation and AtlasAR Cloud Premium. [See Pro →](https://wpaugmentedreality.com/pricing/?utm_source=wordpress.org&utm_medium=readme&utm_campaign=atlasar_3&utm_content=faq_pro)

= How do I get the 14-day Pro trial? =
Visit [Pricing](https://wpaugmentedreality.com/pricing/?utm_source=wordpress.org&utm_medium=readme&utm_campaign=atlasar_3&utm_content=faq_trial) and click "Start free trial".

= What happens when my Pro licence expires? =
The Pro features stop; your site keeps everything the free plugin does, and your models and settings stay.

= Can I manage it with WP-CLI or an AI agent? =
Yes: `wp atlas-ar settings | library | product | cloud | tryon-files | check`, and a REST API (`ar_try_on/v1`) where every route and field is described, so tools like AtlasMCP can use it.

= Where do I report security bugs found in this plugin? =
Please report security bugs found in the source code of the 3D Viewer – 3D Model Viewer – Augmented Reality – Virtual Try On plugin through the [Patchstack Vulnerability Disclosure Program](https://patchstack.com/database/vdp/106665f5-7eed-423e-817a-9f00897ab72b). The Patchstack team will assist you with verification, CVE assignment, and notify the developers of this plugin.

== Screenshots ==

1. Settings For Wordpress
2. Settings For WooCommerce
3. Upload 3D Model By Metabox
4. Demo Product In Frontend
5. Plugin Features
6. Pro Features - Dimensions Display
7. Pro Features - Hotspots
8. Pro Features - Compression Settings

== Changelog ==

= 2.3.0 ( 8 October 2026 ) =
* New: A setup guide walks you through where 3D appears, adding your first model, previewing it in 3D and AR, page speed, the AR button, compression and virtual try-on. It opens once on new sites and can be run again from the Overview tab.
* New: Sites that were already using the plugin see a one-time notice offering the guide instead of being redirected. The guide starts from your current settings and only saves what you change.
* Fix: Deactivating and re-activating the plugin no longer resets your settings to the defaults.
* Fix: Compressing a 3D model in your browser no longer fails to load one of its helper files, so compression completes without errors.

= 2.2.8 ( 18 September 2026 ) =
* Fix: The plugin no longer loads the block editor's files on other WordPress admin screens. This also clears a browser error that some other plugins ran into on those screens.
* Fix: Opening a product or post with a 3D model no longer records a harmless "not found" error in the browser console when the model has not been compressed yet.

= 2.2.7 ( 6 September 2026 ) =
* Maintenance: Tested and confirmed working with the latest WordPress release.
* Fix: Upgrade prompts — the "Buy Now" button, the 14-day free-trial card and the Pricing tab — no longer appear on the dashboard for sites that already have Pro installed.

= 2.2.6 ( 6 September 2026 ) =
* Improvement: New installs now load the 3D viewer only when a shopper opens a model, so pages load faster. Already-running sites can switch to this with a one-click prompt in the dashboard.
* Performance: Trimmed per-request memory use so the plugin is lighter on your server.
* Fix: Updated the AtlasAR block to the latest WordPress block format, clearing a compatibility notice on recent WordPress versions.
* Improvement: Removed leftover debug messages from the browser console on the front end and admin.
* New: Added a "Need help?" link (Contact us, Report an issue, Suggest a feature) inside the AtlasAR box, so you can reach us right where you set up your models.

= 2.2.5 ( 25 July 2026 ) =
* New: You can now choose Meshy AI as your 3D-model generator on the free version too, not just Tripo3D — pick whichever provider you prefer and generate models from a written description.
* Fix: Changing a value on the Integration settings screen (for example pasting a new API key) now saves correctly instead of reporting "No changes detected".
* Fix: The same "No changes detected" issue when updating a product's 3D settings has been resolved, so your edits save reliably.
* Fix: Cleaned up an unused internal scheduled task so it no longer writes a harmless notice to your site's error log on WordPress 6.7 and newer.

= 2.2.4 ( 8 July 2026 ) =
* New: You can now create 3D models with Meshy AI, right from the AtlasAR box — generate a model from a written description or from a product image, the same easy way as the existing Tripo3D option.
* Improvement: A newly generated model now appears straight away, without needing to refresh the page.
* Fix: Your saved 3D-generation API key now stays visible on the Integration settings screen instead of showing up blank.

= 2.2.3 ( 30 June 2026 ) =
* New: A friendly, dismissible review reminder for site admins — shown only after you've added your own 3D model and used the plugin for a couple of weeks. It includes "Remind me later", "I already did" and "Never ask again" options, and never appears for Pro users.
* Maintenance: Refreshed the plugin description, search tags and FAQ so it is clearer at a glance what the plugin does — 3D model viewing, augmented reality, and webcam virtual try-on for glasses and caps.

= 2.2.1 ( 21 June 2026 ) =
* New: "Model Loading Behavior" setting — choose whether the ~1 MB 3D viewer library loads with the page (Automatic) or only when the shopper clicks "View in 3D" (On interaction). Includes a per-product override in the product's AR settings. Improves initial page load and reduces server and bandwidth use.
* Performance: Reduced per-request database work — memoized repeated supported-post-type checks, removed a redundant option read, and stopped the cached-ID list from growing unbounded.
* Performance: Combined the front-end stylesheets into a single request.
* Fix: Pro-registered post types are no longer dropped from the cached supported-post-types list.
* Maintenance: Restored the usage-tracking interval to its intended weekly schedule, clarified the "Loading Type" setting descriptions, and made admin script bundles cache-bust on rebuild. Default behavior is unchanged.

= 2.2.0 ( 18 June 2026 ) =
* Security: Per-product Custom CSS is now sanitized when saved and rendered safely, closing a stored-content injection vector.
* Security: Downloaded 3D model files are now written only inside the uploads/atlas_ar directory, with hardened path checks.
* Improvement: Reworked front-end output (3D viewer, Try-On buttons, QR code, gallery toggle) to fully escape markup and load all scripts and styles as proper assets.
* Maintenance: Refreshed external-service links and tightened input handling across the plugin.

= 2.1.0 ( 2 June 2026 ) =
* Improvement: Hotspots, Dimensions, Sliders, bulk compression, analytics and multi-post-type now show a clear Pro badge instead of locked controls.
* Improvement: Server-side compression for files over 10 MB is provided by the separately installed Pro plugin; Free's client-side compression up to 10 MB is unchanged.
* Improvement: New filter and action hooks let Pro and add-ons extend the dashboard, metabox sections, supported formats and compression method without touching Free code.
* Fix: 3D-model compression assets now load correctly on WordPress installs that are not at the root of their domain.
* Maintenance: Restructured the Free build to remove premium-only code paths, per WordPress.org guidelines.

= 2.0.3 ( 25 May 2026 ) =
* Security: Fix CVE-2026-8682 — `POST /wp-json/ar_try_on/v1/settings` no longer accepts requests from non-administrators. The shared `get_route_access()` permission callback never enforced a capability check, so any authenticated user (Subscriber and above) could overwrite the `ar_try_on_settings` option. Replaced with per-route `current_user_can( 'manage_options' )` checks on `/settings`, `/demo_preview`, and `/generate_3d_model`, and a per-post `current_user_can( 'edit_post', $post_id )` check on `/get_model_and_settings` writes. Credit to Legion Hunter via Wordfence.
* Security: Tightened `/get_model_and_settings` so non-admin POSTs can no longer write to arbitrary post meta — the same authorization bypass applied to this endpoint and is now closed.
* Security: Tightened `/generate_3d_model` so only administrators can trigger Tripo3D / Meshy AI API calls and upload model files.
* Maintenance: Plugin no longer mis-loads WordPress core files (`wp-admin/includes/plugin.php`, `wp-includes/vars.php`) — every remaining `require_once` now uses a function from the included file immediately afterward.
* Maintenance: `libs/AtlasAiDev/Client.php` now uses `get_theme_root()` + `wp_normalize_path()` instead of a hardcoded `WP_CONTENT_DIR . '/themes/'`, so the theme/plugin detection honours custom theme roots.
* Maintenance: Replaced anonymous closures passed to `remove_filter( 'upload_dir', … )` with a named instance callback so the filter actually unregisters after a compressed-file upload.
* Maintenance: All 50 i18n strings inside `libs/AtlasAiDev/` now use the `ar-vr-3d-model-try-on` text domain (was `atlasaidev`), so translations served by WordPress.org reach them.
* Maintenance: Admin top-level menu moved from position `20` (which collided with WordPress core's Pages slot) to `'58.5'`, placing AtlasAR alongside other plugin menus.

= 2.0.2 ( 18 May 2026 ) =
* New: Rename the "View in AR" button store-wide, per product, or per shortcode — "See it in 3D", "Try a 360° view" or any text that fits your store
* New: Built-in 360° rotation hint — a gentle wiggle (or simple hand-pointer) prompts shoppers to drag the model after a few seconds of inactivity, configurable globally and per product (Mode / Style / Idle Delay)
* New: AtlasAR Gutenberg block adds a "Button label" field and the shortcode now accepts `button_label="…"` for one-off CTA overrides
* Improvement: Neutral studio lighting for 3D models by default — fixes the pink/orange sheen that previously appeared on reflective white surfaces and keeps product colours true to the source file
* Fix: 3D modal no longer opens empty when shoppers navigate between products in the same session — model now loads correctly on every product
* Fix: `[atlas_ar reveal="false"]` shortcode on non-WooCommerce posts now renders the View in AR button at the shortcode location instead of falling silent

= 2.0.1 ( 13 May 2026 ) =
* New: AtlasAR block now has a "Reveal model by default" toggle plus width, height, aspect ratio, padding and margin controls — choose between an inline 3D viewer or a clean Try-On / View in AR button pair
* New: AtlasTryOn and the 3D viewer now work on regular WordPress posts and pages, not just WooCommerce products
* Improvement: Try-On, View in AR, and 3D viewer buttons now automatically match the colors and style of your active theme — works with any block theme or classic theme
* Improvement: QR code now appears on every page where you've enabled the 3D viewer
* Improvement: Cleaner, more polished QR card with a tidier close button and a discreet AtlasAR brand stamp
* Improvement: Buttons and the 3D viewer now line up with the rest of your post content instead of floating to the side
* Fix: Tapping the 3D toggle on a product image no longer shows two Try-On buttons
* Fix: View in AR button colour and alignment now look right on all themes

= 2.0.0 ( 12 May 2026 ) =
* New: AtlasTryOn — virtual try-on for glasses & caps using your webcam, no app required
* New: Works on iOS, Android and desktop browsers
* New: Snapshot button so shoppers can save and share their look
* New: Faster, smoother mobile fullscreen experience
* New: Free 14-day Pro trial banner on the dashboard
* Improvement: Cleaner, more responsive plugin dashboard

= 1.9.2 (10 Apr 2026) =
* New: Plugins page now fetches data remotely with 24-hour caching
* New: WP.org star ratings and active install counts on plugin cards
* New: Plugin icons, NEW/PRO/RECOMMENDED/YOU'RE HERE badges
* New: Go Pro button and Configure button for active plugins
* New: Top banner showing current plugin context
* New: Google Analytics UTM parameters on all outbound links
* New: Priority-based card ordering with recommendations first
* Improvement: Tested up to WordPress 7.0

= 1.9.0 ( 21 February 2026 )   =
Added : Per variation preview added.
Added : Per variation added (Pro)
Added : Plugins menu added.


= 1.8.2 ( 6 February 2026 )   =
fixed : file upload issue solved



= 1.8.1 ( 2 February 2026 )   =
Added : Overview section added



= 1.8.0 ( 25 January 2026 )   =
Added : `.glb` file compression feature added (Pro).
Added : `Dimensions` feature added (Pro) - Display product measurements in AR.
Added : `Hotspots` feature added (Pro) - Interactive information points on 3D models.
Added : `Slider` feature added (Pro) - Product configurators for customization.
Added : Pro version released - Professional features for WooCommerce stores.
Improved : Plugin performance improved.
Improved : README updated with comprehensive Pro feature documentation.
Improved : FAQ expanded with Pro-specific questions.

= 1.7.8 ( 28 December 2025 )   =
Updated : documentation updated


= 1.7.6 ( 26 November 2025 )   =
Introduced : gutenbarg block added for shortcode `[atlas_ar]`.
Fixed :  normal post page 3d render issue fixed when woocommerce is not active.

= 1.7.5 ( 21 November 2025 )   =
Improved : Fatal error fixed


= 1.7.4 ( 21 November 2025 )   =
Improved : Spinner added during saving.
Improved : Modal UI improved.
Fixed : Modal title special character issue fixed.
Fixed : Modal title special character issue fixed.
Improved : Dashboard UI improved.

= 1.7.3 ( 19 November 2025 )   =
Improved : Settings buttons primary color set.
Improved : Integration buttons color matched to settings page.
Fixed :  3d model hide after scroll down in metabox,  issue fixed.


= 1.7.2 ( 25 October 2025 )   =
Added: `woocommerce_product_thumbnails` woocommerce product thumbnail action hook added for Showing 3D file.


= 1.7.1 ( 17 October 2025 )   =
Improved: Dashboard UI improved.

= 1.7.0 ( 13 October 2025 )  =
Improved: UI improved.
Introduced: Dark Mode and Light Mode feature added.


= 1.6.1 ( 26 September 2025 )  =
Introduced: New modal added for 3d model display.
Improved: 3d Model loading time improved.

= 1.6.0 ( 04 September 2025 )  =
Introduced: model generation UI.
Introduced: User can generate model from post edit page.
integrated with [Tripo3D API ](https://www.tripo3d.ai/)


= 1.5.4 ( 31 August 2025 )  =
Fixed: model upload issue fixed.
Fixed: multiple model load issue fixed.
Fixed: Cache issue not working issue fixed.
Fixed: QR code , post types settings not working issue fixed.


= 1.5.3 ( 31 August 2025 )  =
Introduced: Documentation menu added'
Changed: Plugin menu and tab and metabox name changed.
Fixed: minor bug fixed.

= 1.5.2 ( 14 August 2025 )  =
Fixed: Default model loading issue solved when current post have any model.

= 1.5.1 ( 13 August 2025 )  =
Fixed: Reload issue onClick on tab fixed.

= 1.5.0 ( 13 August 2025 )  =
Added: auto retate option added.
Added: skybox image option added.
Added: environment image option added.
Added: disable tap option added.
Added: disable zoom option added.
Added: shadow intesity option added.
Added: alignment, margin, padding, width, height option added.
Improved: Metabox UI improved.
Added: Default model value added.
Improved: performance of model loading improved.
Added: Custom css option added.



= 1.4.8 ( 07 August 2025 )  =
Fixed: 3D view button not showing up is fixed.

= 1.4.7 ( 04 August 2025 )  =
Improved: QR code will only load for Desktop.
Changed: AR button Name changed.
Updated: Documentation updated.


= 1.4.6 ( 24 July 2025 )  =
Fixed: UI related bug fixed.


= 1.4.5 ( 20 July 2025 )  =
Fixed: QR Code issue fixed.

= 1.4.4 ( 20 July 2025 )  =
Fixed: Major bug fixed.

= 1.4.3 ( 14 July 2025 )  =
Introduced: QR code feature added.

= 1.4.2 ( 11 July 2025 )  =
Fixed: Activation issue fixed.


= 1.4.1 ( 03 July 2025 )  =
Minor change.

= 1.4. ( 19 June 2025 )  =
Added: ShortCode "[atlas_ar]" introduced.
Added: Option for adding AR button automatically.
Improved: Code structure improved.
Fixed: Minor bug fixed.

= 1.3.4 ( 17 June 2025 )  =
Added: Model preview added to woocommerce tab in front end.

= 1.3.3 ( 15 June 2025 )  =
Changed: Contact Us page link changed.
Added: Link added to preview demo page.
Updated: Feature list updated.


= 1.3.2 ( 12 May 2025 )  =
Added: Documentation, youtube video link added.
Added: Real application of the plugin demo added

= 1.3.1 ( 08 May 2025 )  =
Added: Readme.txt updated.

= 1.3.0 ( 21 April 2025 )  =
Added: Preview added in admin metabox.


= 1.2.0 ( 16 April 2025 )  =
Added: tracker added.

= 1.1.2 ( 08 April 2025 )  =
Added: Compatible with wordpress 6.8.0
Added: Screenshots added of the plugin.

= 1.1.1 ( 25 Mar 2025 )  =
Added: Initial setup video added.



= 1.1.0 ( 09 Mar 2025 )  =
Freemius integrated.

= 1.0.12 ( 10 Feb 2025 )  =
Title changed.

= 1.0.11 ( 09 Feb 2025 )  =
Fixed bug on helper file.

= 1.0.10 ( 09 Feb 2025 )  =
* Fixed: Unnecessary button load issue solved.
* Fixed: Unnecessary tab adding in woocommerce solved.

= 1.0.9 ( 28 Jan 2025 )  =
* Improved: Minor changes.
* Improved: Documentation improved.


= 1.0.8 ( 20 Jan 2025 )  =
* Improved: UI improved.
* Contact information added.
* Feature added to dashboard


= 1.0.7 ( 14 Jan 2025 )  =
* Fixed: Settings save issue fixed.
* Moved: AR placement moved to model settings metabox.
* improved: Model settings make dynamic.
* GLTF file support added.

= 1.0.6 ( 10 Jan 2025 )  =
* Fixed: demo error fixed.

= 1.0.5 ( 09 Jan 2025 )  =
* Fixed: preview url issue fixed.

= 1.0.4 ( 09 Jan 2025 )  =
* added: Demo preview system added.

= 1.0.3 ( 09 Jan 2025 )  =
* added: Woocommerce tab added.

= 1.0.2 ( 07 Jan 2025 )  =
* added: prefix added to css class.

= 1.0.1 ( 5 Jan 2025 )  =
* Short description issue fixed.
* Unnecessary code removed.

= 1.0.0  =
* Initial release

== Upgrade Notice ==

= 2.3.0 =
Adds a setup guide for new and existing sites, and fixes settings being reset when the plugin is re-activated. Your current settings stay as they are. Safe to update.

= 2.2.8 =
Housekeeping update: the block editor's files are no longer loaded on other admin screens (which could upset other plugins there), and a harmless console error on models that have not been compressed yet is gone. Safe to update.

= 2.2.7 =
Tested and confirmed working with the latest WordPress release. Also stops upgrade and free-trial prompts from being shown on sites that already have Pro. Safe to update.

= 2.2.6 =
Faster page loads (new installs load the 3D viewer on demand; existing sites get a one-click switch), lighter server use, a WordPress block-compatibility fix, a cleaner browser console, and a new in-editor "Contact us" link. Safe to update.

= 2.2.5 =
Lets you pick Meshy AI as your 3D generator on the free version (alongside Tripo3D), and fixes a bug where editing the Integration settings or a product's 3D options could wrongly report "No changes detected" on save. Safe to update.

= 2.2.4 =
Adds Meshy AI as a second way to generate 3D models — from a written description or a product image — alongside Tripo3D. Newly generated models now show up right away, and your saved API key stays visible on the settings screen. Safe to update.

= 2.2.3 =
Adds a polite, dismissible review reminder for admins (shown only after real use, never to Pro users) plus a refreshed description, tags and FAQ. Safe to update.

= 2.2.1 =
Performance release addressing high server/database load. Adds a "Model Loading Behavior" option to defer the 3D viewer library until a shopper clicks "View in 3D" (global setting plus per-product override), trims per-request database work, and combines front-end styles. Default behavior is unchanged. Safe to update.

= 2.2.0 =
Security and hardening release: per-product Custom CSS is sanitized, model-file writes are locked to the uploads folder, and front-end output is fully escaped. Recommended for all sites. Safe to update.

= 2.1.0 =
Cleaner Free and Pro experience. Hotspots, Dimensions, Sliders and bulk compression now appear with a clear Pro badge instead of locked controls. Server-side compression for large files moves to Pro; client-side compression up to 10 MB stays in Free. Safe to update.

= 2.0.3 =
Security release. Fixes a Subscriber-level authorization bypass on plugin settings and related endpoints. All sites should update immediately.

= 2.0.2 =
Polish + bugfix release: rename the "View in AR" button without code, add a built-in 360° rotation hint, fix the pink/orange tint on reflective white 3D models, and resolve the empty-modal issue when navigating between products. Safe to update.

