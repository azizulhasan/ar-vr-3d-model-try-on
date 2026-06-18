=== 3D Viewer – 3D Model Viewer – Augmented Reality – Virtual Try On  ===
Contributors: atlasaidev, hasanazizul
Tags: 3d viewer, 3d model viewer, Try On, augmented reality, virtual try on
Requires at least: 5.6
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 2.1.0
License: GPLv3 or later
License URI: https://www.gnu.org/licenses/gpl-3.0.txt

3D Viewer & WordPress AR Plugin lets you upload and display 3D models with built-in AR on iOS & Android—no extra apps needed.

== Description ==

Showcase your 3D models with browser-based AR — no apps, no coding. Let shoppers rotate and zoom .glb/.gltf models, place products in their real-world space on Android and iOS, or try on glasses and caps with the built-in **AtlasTryOn** webcam viewer. All free, with unlimited model uploads.

🚀 **AtlasTryOn — Virtual Try-On for Glasses & Caps**, built into the free plugin. Shoppers see how eyewear or headwear looks on them right from the product page — no app downloads, no extra setup.

🎁 **14-day Pro free trial included** for the full AtlasTryOn Pro experience — head-pose tracking, HD watermark-free snapshots, multi-face detection, live calibration. [Start your free trial →](https://wpaugmentedreality.com/pricing/?utm_source=wordpress.org&utm_medium=readme&utm_campaign=atlastryon_launch&utm_content=trial_cta)

#### **Core features (Free):**

* **Rotate / zoom 3D models** on every product page
* **Mobile AR**: floor + wall placement via Scene Viewer (Android) and AR Quick Look (iOS)
* **Unlimited model uploads** — no caps on file count or size
* **WooCommerce native**: automatic "View in AR" button, simple + variable products
* **Shortcode** `[atlas_ar]` + Gutenberg block for posts/pages
* **QR code** card for cross-device scanning
* **AtlasTryOn** webcam try-on for glasses, sunglasses, caps — unlimited products
* **Tripo3D and Meshy AI integration** to generate 3D models from a text prompt (admin-only; bring your own API key)
* **Privacy by design** — the camera feed stays on the shopper's device; nothing is uploaded

#### **Pro adds (separately installed plugin):**

* Server-side compression for large model files (~80% size reduction)
* Interactive hotspots, real-world dimensions, image/model sliders in the metabox
* HD watermark-free try-on snapshots, head-pose tracking, multi-face detection, live calibration
* Bulk compression, analytics dashboard, multi-post-type AR, format conversion (FBX/OBJ/USDZ)

[Pro pricing →](https://wpaugmentedreality.com/pricing/?utm_source=wordpress.org&utm_medium=readme&utm_campaign=atlastryon_launch&utm_content=pricing_link) · [Live demos →](https://wpaugmentedreality.com/shop/?utm_source=wordpress.org&utm_medium=readme&utm_campaign=atlastryon_launch&utm_content=demo_shop) · [Video tutorials →](https://www.youtube.com/playlist?list=PLGdmFn36qCRKp58yEtIh747lhw3EM6m8K)


== 3D Model Generation ==

= How to Generate 3D Models with Tripo3D API =

1. Generate your API key from the [Tripo3D API](https://www.tripo3d.ai/api).
2. Copy the API key.
3. Go to the **AtlasAR metabox** in the post edit screen.
4. Click on the **Integration** tab.
5. Paste your API key in the Integration settings and save.
6. Now, go back to the **Edit Post** page.
7. In the AtlasAR metabox, enter your prompt for the 3D model.
8. Click on the **Generate Model** button.
   - A `task_id` will be generated.
   - Wait a few seconds while the model is being processed.
9. Once the model is generated, a 3D preview will appear on the right side.
10. Click on the **Save This Model** button to save the generated model and update the post data.
11. After saving, you can view the generated 3D model on the front end of your site.


== How It Works - 3 Simple Steps ==

1.  **Install & Activate**:
    * In your WordPress admin panel, go to Plugins → Add New.
    * Search for "AR VR 3D Model Try On".
    * Click "Install Now" and then "Activate."
    * Find the "AtlasAR" menu.
    * Setup you basic settings.
2.  **Upload Models**:
    * Navigate to a WordPress post eiditing screen
    * Find the "AtlasAR" Metabox.
    * Select the place where you want to display the 3D Model like Floor/Wall etc.
    * Upload your Android Model: `.glb/.gltf` file.
    * Upload your iOS Model: `.usdz` file.
    * Optionally, add a Poster Image (thumbnail) for the 3D model viewer.
    * If your site is WooCommerce Store then first go to settings page of the plugin. And Look "Enable AR For Post Types" by default If would be `post' change it to `product' and save.
3.  **Display 3D Model Viewer**:
    * The "View in AR " button is automatically placed on your WordPress Posts/WooCommerce product pages.
    * For manual placement in other locations, you can use the shortcode: `[atlas_ar]`.
    * **Pro Users**: Enable dimensions, hotspots, and sliders from the AtlasAR metabox settings.

== Real-World 3D Viewer Applications ==

* 🪑 **Furniture Stores**: "Customers visualize sofas in their living rooms before buying."  [Office Chair Demo](https://wpaugmentedreality.com/product/office-chair-view-in-augmented-reality-3d/?utm_source=wordpress.org&utm_medium=readme&utm_campaign=atlastryon_launch&utm_content=demo_office_chair)
* 🖼️ **Home Decor**: "Preview wall art placement through phone camera." [Dining Armchair Demo](https://wpaugmentedreality.com/product/office-chair-view-in-augmented-reality-3d/?utm_source=wordpress.org&utm_medium=readme&utm_campaign=atlastryon_launch&utm_content=demo_office_chair)
* 🛋️ **Pro Feature - Dimensions**: Show exact measurements in AR to answer "will it fit?" questions
* 🎨 **Pro Feature - Configurators**: Let customers customize furniture colors and materials before purchase

== Competitive Advantages ==

**Free Model Limits**
- Our Plugin: **Unlimited** ⭐
- Others: Often 1–10 models

**iOS AR Support**
- Our Plugin: **Full native .USDZ compatibility** ⭐
- Others: Android-only or limited iOS support

**WooCommerce Integration**
- Our Plugin: **Native, seamless implementation** ⭐
- Others: May require add-ons or hacks

**Model Compression**
- Our Plugin: **Automatic compression up to 70% savings** ⭐
- Others: Manual compression required

**Product Dimensions**
- Our Plugin: **Real-world size display in AR (Pro)** ⭐
- Others: No dimension features


== Pro Version Features ==

🎯 **Upgrade to Pro and unlock powerful features that boost conversions and reduce returns!**
👉 [See Pro Pricing Plans](https://wpaugmentedreality.com/pricing/?utm_source=wordpress.org&utm_medium=readme&utm_campaign=atlastryon_launch&utm_content=pricing_link)

### **Available Now in Pro:**

⭐ **Dimensions Display**:
* Show product measurements (length, width, height) directly in AR view
* Help customers answer "will it fit?" before buying
* Reduce returns caused by size mismatches
* Perfect for furniture, appliances, home decor

⭐ **Interactive Hotspots**:
* Add clickable information points on your 3D models
* Educate customers about product features, materials, care instructions
* Increase customer confidence and reduce support questions
* Perfect for complex products like furniture, electronics, jewelry

⭐ **Product Configurators (Sliders)**:
* Let customers customize colors, materials, finishes, and options
* Increase engagement and time spent viewing products
* Higher average order value through personalization
* Perfect for furniture, fashion, custom products

⭐ **Automatic Model Compression**:
* Reduce 3D file sizes by up to 70% automatically
* Faster loading times = better user experience
* Uses industry-standard Draco geometry compression
* Basis Universal texture compression for optimal quality
* Keeps original files for backup

### **Coming Soon in Pro:**

🚀 **Advanced Analytics Dashboard** (Q1 2026):
* Track AR engagement, device types, placement attempts
* See which products perform best in AR
* Prove ROI with conversion tracking
* Integration with Google Analytics

🚀 **Per-Variation 3D Models** (Q1 2026):
* Upload different 3D models for each product variation (color, size, style)
* Critical for WooCommerce stores with variable products
* Automatic model switching when customers select variations

🚀 **Background Processing & Bulk Compression** (Q2 2026):
* Compress large files in background (no upload delays)
* Bulk compress your entire product catalog with one click
* Queue system for processing multiple models

🚀 **Glass Mode Virtual Try-On** (Q2 2026):
* Enable realistic virtual try-ons for eyewear and jewelry
* Face tracking for accurate placement
* Unique feature - no other AR plugin has this!

🚀 **Desktop WebAR** (Q3 2026):
* AR experiences on desktop browsers (no phone needed)
* Broader accessibility for all users

🚀 **Multi-Model Scenes** (Q3 2026):
* Display multiple products together in AR
* Room planning and outfit builders
* Advanced configurators

### **Pro Support & Updates:**
* Priority email support (24-hour response time)
* Regular feature updates
* Early access to beta features
* Dedicated documentation

👉 **[Upgrade to Pro Now](https://wpaugmentedreality.com/pricing/?utm_source=wordpress.org&utm_medium=readme&utm_campaign=atlastryon_launch&utm_content=pricing_link)**
💰 **Starter Plan: Only $49.99/year** - All Pro features for 1 site


== Technical Specifications ==

* **Supported 3D Formats**: `.glb`, `.gltf` (for Android/Web 3D), `.usdz` (for iOS AR Quick Look).
* **Mobile Device Requirements**: Android 9.0+ with ARCore support, iOS 12+ with ARKit support.
* **WooCommerce Compatibility**: Version 3.0 and above.
* **WordPress Compatibility**: Version 5.0 and above.
* **Performance**: Models load asynchronously. Lazy loading implemented for archive pages to minimize performance impact. Optimized for mobile 3D rendering.
* **Pro Compression**: Draco geometry compression + Basis Universal texture compression for up to 70% file size reduction.


== Start Your AR Journey Today ==

1.  **Install the Free Version**: Get started with unlimited 3D model uploads, no credit card needed.
2.  **Upload Your First Model**: Add a `.glb/.gltf` file for Android/Web and a `.usdz` file for iOS to a product.
3.  **Watch Engagement Soar**: Provide interactive AR experiences.
4.  **Upgrade to Pro**: Unlock dimensions, hotspots, compression, and configurators to maximize conversions.

👉 **[See What Pro Can Do For You](https://wpaugmentedreality.com/pricing/?utm_source=wordpress.org&utm_medium=readme&utm_campaign=atlastryon_launch&utm_content=pricing_link)**


### CHECK OUT OUR OTHER ADDONS 👑:
🔥 [Text To Speech TTS Accessibility](https://wordpress.org/plugins/text-to-audio/) – Text To Speech TTS Accessibility is the most user-friendly Text-to-Speech tts plugin. Just install and automatically add a text to audio player to your WordPress site!.



== External services ==

The third-party services below may be contacted. Each is used only when its feature is used. No visitor or product data is sent unless noted.

= MediaPipe face tracking (Google / jsDelivr) =

Powers the webcam Try-On feature. Only after a visitor clicks "Try It On", the browser downloads the MediaPipe WASM runtime from `cdn.jsdelivr.net` and the face-landmark model from `storage.googleapis.com`, then caches them. A plain HTTPS GET for static assets — no site, user, or visitor data is sent. The camera feed stays on the visitor's device.
jsDelivr — Terms: https://www.jsdelivr.com/terms Privacy: https://www.jsdelivr.com/terms/privacy-policy-jsdelivr-net
Google — Terms: https://policies.google.com/terms Privacy: https://policies.google.com/privacy

= 3D model generation (Tripo3D / Meshy AI) =

Admin-only. Only after an administrator enters their own API key and clicks "Generate 3D Model" is a request sent — to `api.tripo3d.ai` or `api.meshy.ai` — containing the admin's text prompt or image plus their API key. No site visitor data is sent.
- Tripo3D — API keys: https://platform.tripo3d.ai/api-keys, Terms: https://www.tripo3d.ai/terms, Privacy: https://www.tripo3d.ai/privacy
- Meshy AI — API keys: https://www.meshy.ai/settings/api, Terms: https://www.meshy.ai/terms-of-use, Privacy: https://www.meshy.ai/privacy-policy

= AtlasAiDev tracker (track.atlasaidev.com, icanhazip.com) =

**Opt-in, off by default** (revocable anytime). When enabled, sends usage telemetry — plugin/WordPress/PHP versions, site URL/name/language, active+inactive plugin counts, admin name and email, and the site's outbound public IP (resolved via icanhazip.com) — so AtlasAiDev can prioritise improvements. No visitor or product data is sent.
AtlasAiDev — Terms: https://atlasaidev.com/terms-and-conditions/ Privacy: https://atlasaidev.com/privacy-policy/
icanhazip.com (Cloudflare) — Privacy: https://www.cloudflare.com/privacypolicy/

= AtlasAiDev plugin catalog (raw.githubusercontent.com) =

Fetches `https://raw.githubusercontent.com/atlasaidev/plugins/main/plugins.json` only when an admin opens the "Other AtlasAiDev Plugins" screen (cached 24h). No site or user data is sent beyond standard HTTP headers.
GitHub, Inc. — Terms: https://docs.github.com/en/site-policy/github-terms/github-terms-of-service Privacy: https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement

= Bundled decoders (not an external service) =

The DRACO, KTX2/Basis, and three.js Lottie decoders that `<model-viewer>` needs are bundled under `public/js/vendor/decoders/` and served from your own site, so the plugin never fetches them from `gstatic.com` or `cdn.jsdelivr.net`.


== Source code ==

The complete, unminified source (GPLv3) is on GitHub: https://github.com/azizulhasan/ar-vr-3d-model-try-on. The git tag matching each wp.org version is the exact source used for that release ZIP. Rebuild from a clean clone with `composer install && npm install && npm run production`.


== Installation ==

1. Upload the plugin folder (`ar-vr-3d-model-try-on`) to the `/wp-content/plugins/` directory via FTP, OR
2. Install directly through the WordPress plugins screen: Go to 'Plugins' > 'Add New', search for "3D Model Viewer & AR for Wordpress & WooCommerce" by `Azizul Hasan` , and click 'Install Now'.
3. Activate the plugin through the 'Plugins' menu in WordPress.
4. Navigate to a WordPress Post, post metabox section, and find the "AtlasAR" metabox to upload your 3D models.
5. Navigate to a WooCommerce product, go to the product metabox section, and find the "AtlasAR" metabox to upload your 3D models.
6. The "View in AR " button will automatically appear on product pages. You can also use the shortcode `[atlas_ar]` for manual placement.
7. If your site is WooCommerce Store then first go to settings page of the plugin. And Look "Enable AR For Post Types" by default If would be `post' change it to `product' and save.
8. **For Pro Features**: After upgrading to Pro, enable dimensions, hotspots, and compression from the AtlasAR metabox settings.

== Frequently Asked Questions ==

= Q: What is AtlasTryOn? =
A: AtlasTryOn is a virtual try-on feature, built right into this plugin, that lets your shoppers see how glasses or caps look on them using their webcam. No app downloads or external services — it runs in the browser.

= Q: How do I enable AtlasTryOn on a product? =
A: Open the WooCommerce product (or any post) you want to enable try-on for, scroll to the **AtlasAR** metabox, and switch the placement to **Face — Glasses** or **Face — Cap**. Save, and the "Try It On" button appears on the product page.

= Q: Which devices and browsers does AtlasTryOn support? =
A: Any modern browser with webcam support — Chrome, Edge, Firefox, Safari — on iOS, Android, Windows, macOS and Linux. Shoppers are asked for camera permission the first time they tap "Try It On".

= Q: Is shopper video sent to a server? =
A: No. The camera feed stays on the shopper's device. No video, frames, or face data ever leaves the browser.

= Q: What's the difference between Free and Pro AtlasTryOn? =
A: Free covers the core try-on flow on unlimited products — webcam-based glasses & caps try-on with snapshots. Pro adds head-pose-tracked 3D overlay (more realistic fit as the shopper turns), HD watermark-free snapshots, multi-face detection (up to 2 faces), and a live per-product calibration panel. [Compare plans →](https://wpaugmentedreality.com/pricing/?utm_source=wordpress.org&utm_medium=readme&utm_campaign=atlastryon_launch&utm_content=faq_compare)

= Q: How do I get the 14-day Pro trial? =
A: A trial banner appears in the plugin dashboard after activation. Or visit [Pricing](https://wpaugmentedreality.com/pricing/?utm_source=wordpress.org&utm_medium=readme&utm_campaign=atlastryon_launch&utm_content=faq_trial) and click "Start free trial". A valid credit card is required to activate the trial; you won't be charged during the 14-day window and can cancel anytime before it ends.

= Q: What's included in the Free version vs Pro version? =
A: **Free version** includes unlimited 3D model uploads, full iOS + Android AR support, WooCommerce integration, QR codes, and Tripo3D AI generation. **Pro version** adds dimensions display, interactive hotspots, product configurators, automatic compression, and upcoming features like analytics and per-variation models. [Compare plans here](https://wpaugmentedreality.com/pricing/?utm_source=wordpress.org&utm_medium=readme&utm_campaign=atlastryon_launch&utm_content=pricing_link).

= Q: How does the Pro compression feature work? =
A: Pro version automatically compresses your .glb and .gltf files using industry-standard Draco geometry compression and Basis Universal texture compression. This reduces file sizes by up to 70% while maintaining visual quality, resulting in faster loading times and better user experience. The original files are kept as backup.

= Q: Can I try Pro features before buying? =
A: Yes! We offer a 14-day money-back guarantee on all Pro plans. If you're not satisfied with the Pro features, you can request a full refund within 14 days of purchase.

= Q: What are dimensions and how do they help? =
A: The dimensions feature (Pro only) displays real-world measurements (length, width, height) directly in the AR view. This helps customers answer "will it fit?" questions before buying, significantly reducing returns caused by size mismatches. Perfect for furniture, appliances, and home decor products.

= Q: What are hotspots and why should I use them? =
A: Hotspots (Pro only) are clickable information points you can add to your 3D models. They let you educate customers about specific features, materials, care instructions, or benefits. This increases customer confidence, reduces support questions, and helps sell complex products.

= Q: What is the product configurator (slider) feature? =
A: The slider/configurator feature (Pro only) lets customers customize product options like colors, materials, finishes, and styles directly in the 3D viewer. This increases engagement, time on page, and often leads to higher average order values through personalization.

= Q: Can I display 3D Models with custom post types? =
A: Yes, By default it enabled with post type post. If you want to enabled for any other post then go to settings page of the plugin. And Look "Enable AR For Post Types". Change it to `you_custom_post_type' and save.

= Q: Which 3D file formats are supported? =
A: You can upload `.glb` and `.gltf` files for Android and desktop viewers, and `.usdz` files to enable native iOS AR Quick Look functionality.

= Q: Do my customers need to install an app to use AR? =
A: No— AtlasAR launch directly in mobile browsers on both Android (via Scene Viewer) and iOS (via Quick Look), with no extra app downloads required.

= Q: How do I display the 3D/AR viewer on my product pages? =
A: Once the plugin is active, "View in AR " buttons are automatically added to all WooCommerce product pages where models are assigned. For Pro users, dimensions, hotspots, and configurators appear automatically when enabled.

= Q: Is there a limit on how many models I can upload with the free version? =
A: No. The free version supports unlimited `.glb`/`.gltf` model uploads—no size or quantity caps. This is a major advantage over competitors who limit free users to 1-5 models.

= Q: Will loading 3D models slow down my site? =
A: We've optimized the plugin for performance. Models load asynchronously (typically taking 0.3–0.7 seconds on a stable 4G connection) and utilize lazy loading on archive/shop pages to minimize any impact on your site's speed. Pro compression makes files even smaller for faster loading.

= Q: Which WooCommerce versions and themes are supported? =
A: The plugin is compatible with WooCommerce 3.0 and above. It is designed to work seamlessly with all standard WooCommerce themes and major page builders (like Elementor, WPBakery, Beaver Builder, etc.).

= Q: How do I upgrade to Pro? =
A: Visit our [pricing page](https://wpaugmentedreality.com/pricing/?utm_source=wordpress.org&utm_medium=readme&utm_campaign=atlastryon_launch&utm_content=pricing_link) to choose a plan. After purchase, you'll receive a license key to activate Pro features. We offer plans starting at $39/year for single sites.

= Q: What happens when my Pro subscription expires? =
A: If your Pro subscription expires, the Pro features (dimensions, hotspots, compression, configurators) will be disabled, but your site will continue to work with all the free features. Your existing compressed models will continue to work. You can renew anytime to regain Pro features.

= Q: Can I use Pro on multiple sites? =
A: Yes! We offer multi-site plans. The Professional plan ($99/year) covers 3 sites, and the Business plan ($199/year) covers 10 sites. [See all plans](https://wpaugmentedreality.com/pricing/?utm_source=wordpress.org&utm_medium=readme&utm_campaign=atlastryon_launch&utm_content=pricing_link).

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

= 2.1.0 =
Cleaner Free and Pro experience. Hotspots, Dimensions, Sliders and bulk compression now appear with a clear Pro badge instead of locked controls. Server-side compression for large files moves to Pro; client-side compression up to 10 MB stays in Free. Safe to update.

= 2.0.3 =
Security release. Fixes a Subscriber-level authorization bypass on plugin settings and related endpoints. All sites should update immediately.

= 2.0.2 =
Polish + bugfix release: rename the "View in AR" button without code, add a built-in 360° rotation hint, fix the pink/orange tint on reflective white 3D models, and resolve the empty-modal issue when navigating between products. Safe to update.

