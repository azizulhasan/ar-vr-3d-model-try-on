/**
 * Lazy Load Model Viewer Script
 *
 * Loads the heavy (~956 KB) Google <model-viewer> library on demand instead of
 * with the rest of the page bundle. Two strategies, chosen per-product by the
 * server (AR_TRY_ON_Helper::get_model_load_strategy → ar_try_on.model_load_strategy):
 *
 *   'auto'        — (default, historical behavior) an IntersectionObserver loads
 *                   the library as the viewer nears the viewport. For an
 *                   above-the-fold product viewer this is effectively "on load".
 *
 *   'interaction' — poster-first. The library is NOT loaded up front. Any
 *                   <model-viewer> already on the page at load is replaced with a
 *                   lightweight poster + "View in 3D" button; the 956 KB loads
 *                   only when the shopper clicks it (or any other AR trigger that
 *                   injects/reveals a viewer). This is the real performance win.
 *
 * Both strategies expose a single loader, window.atlasARLoadModelViewer(), and
 * dispatch a document-level `atlasar:viewer-ready` event once the library is
 * defined — Free's own scripts and the Pro add-ons (hotspots, try-on,
 * variation-handler) initialise off that event so deferred loading never leaves
 * a Pro feature dangling.
 *
 * @since 1.7.9
 * @updated AR-67 — interaction strategy + viewer-ready event.
 */

(function () {
    'use strict';

    var AR = (typeof ar_try_on !== 'undefined') ? ar_try_on : {};
    var STRATEGY = (AR && AR.model_load_strategy === 'interaction') ? 'interaction' : 'auto';
    var MODEL_VIEWER_SCRIPT_URL = (AR.plugin_url || '') + 'public/js/google-model-viewer.js';
    var VIEW_IN_3D_LABEL = (AR && AR.view_in_3d_label) ? AR.view_in_3d_label : 'View in 3D';

    var AR_VIEWER_SELECTORS = [
        'model-viewer',
        '.ar_vr_3d_model_try_on',
        '#atlas_ar_preview',
        '[data-atlas-ar]',
        '#atlas_ar-3d-viewer-overlay',
        '.atlas-ar-toggle-container'
    ];
    // Legacy shortcode-id selector (kept for parity with the old loader).
    (function () {
        var element = document.querySelector('[id^="atlas_ar_shortcode_"]');
        if (element) {
            AR_VIEWER_SELECTORS.push('#' + element.id);
        }
    })();

    /**
     * Point <model-viewer> at the locally-bundled DRACO / KTX2 / Lottie decoders
     * (wp.org Guideline 6 — no gstatic/jsdelivr fallback). Must run before the
     * module script is appended, since the component reads
     * window.ModelViewerElement on init.
     */
    function configureLocalDecoders() {
        var pluginUrl = AR.plugin_url || '';
        if (!pluginUrl) {
            return;
        }
        var base = pluginUrl + 'public/js/vendor/decoders/';
        window.ModelViewerElement = Object.assign(window.ModelViewerElement || {}, {
            dracoDecoderLocation: base + 'draco/',
            ktx2TranscoderLocation: base + 'basis/',
            lottieLoaderLocation: base + 'lottie/LottieLoader.js'
        });
    }

    /**
     * Idempotent loader. Returns a Promise that resolves once <model-viewer> is
     * defined. Safe to call from any trigger script.
     */
    var _loadingPromise = null;
    function loadModelViewerScript() {
        if (window.atlasARModelViewerLoaded) {
            return Promise.resolve();
        }
        if (_loadingPromise) {
            return _loadingPromise;
        }

        configureLocalDecoders();

        _loadingPromise = new Promise(function (resolve, reject) {
            var script = document.createElement('script');
            script.src = MODEL_VIEWER_SCRIPT_URL;
            script.type = 'module';
            script.defer = true;
            // Keep optimization/caching plugins (WP Rocket, LiteSpeed,
            // Autoptimize, Perfmatters, Cloudflare Rocket Loader, WP Meteor)
            // from combining this into the main bundle or delaying it again —
            // either would defeat the lazy load or double-gate it.
            script.setAttribute('data-no-optimize', '1');
            script.setAttribute('data-no-minify', '1');
            script.setAttribute('data-no-defer', '1');
            script.setAttribute('data-cfasync', 'false');
            script.setAttribute('data-wpmeteor-nooptimize', 'true');

            script.onload = function () {
                window.atlasARModelViewerLoaded = true;
                try {
                    document.dispatchEvent(new CustomEvent('atlasar:viewer-ready'));
                } catch (e) {
                    // Very old browsers: fall back to a plain event.
                    var ev = document.createEvent('Event');
                    ev.initEvent('atlasar:viewer-ready', true, true);
                    document.dispatchEvent(ev);
                }
                resolve();
            };

            script.onerror = function () {
                _loadingPromise = null;
                // eslint-disable-next-line no-console
                console.error('AtlasAR: Failed to load Model Viewer');
                reject(new Error('Failed to load model-viewer'));
            };

            document.head.appendChild(script);
        });

        return _loadingPromise;
    }

    // Expose for every trigger script (WC 3D tab, image⇄3D toggle, AR button,
    // shortcode reveal) and for Pro.
    window.atlasARLoadModelViewer = loadModelViewerScript;

    /* ------------------------------------------------------------------ *
     *  AUTO strategy — historical IntersectionObserver behavior, intact.  *
     * ------------------------------------------------------------------ */
    function collectArElements() {
        var arElements = [];
        AR_VIEWER_SELECTORS.forEach(function (selector) {
            var els = document.querySelectorAll(selector);
            if (els.length > 0) {
                arElements.push.apply(arElements, els);
            }
        });
        return arElements;
    }

    function initAuto() {
        if (!('IntersectionObserver' in window)) {
            loadModelViewerScript();
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    loadModelViewerScript().then(function () {
                        observer.disconnect();
                    });
                }
            });
        }, { root: null, rootMargin: '100px', threshold: 0.01 });

        function observeAll() {
            collectArElements().forEach(function (el) {
                if (!el.__atlasARObserved) {
                    el.__atlasARObserved = true;
                    observer.observe(el);
                }
            });
        }

        observeAll();

        // AR viewers are frequently injected after DOMContentLoaded (shortcode
        // reveal, gallery image⇄3D toggle, WC 3D tab). Re-scan when the DOM
        // changes so those late viewers are observed too — without this the
        // above-the-fold viewer that arrives a tick later never loads.
        if ('MutationObserver' in window) {
            var mo = new MutationObserver(function () {
                if (window.atlasARModelViewerLoaded) {
                    mo.disconnect();
                    return;
                }
                observeAll();
            });
            mo.observe(document.body, { childList: true, subtree: true });
        }
    }

    /* ------------------------------------------------------------------ *
     *  INTERACTION strategy — poster-first, load on user gesture.         *
     * ------------------------------------------------------------------ */

    // Defer an on-load <model-viewer> behind a poster, by injecting the poster
    // as a `slot="poster"` CHILD of the viewer itself (not a sibling overlay).
    //
    // Why a child: the WooCommerce gallery (flexslider) clones and re-inserts
    // its slides; a sibling overlay gets detached and races the clone, but a
    // child travels WITH the <model-viewer> wherever flexslider moves it.
    // <model-viewer> also natively renders a slot="poster" child before the
    // model is revealed, so once the library loads the same element is reused
    // and the poster auto-hides when the 3D scene appears.
    function injectPosterChild(mv) {
        if (!mv || mv.__atlasARPosterBound) {
            return;
        }
        mv.__atlasARPosterBound = true;
        if (mv.querySelector('.atlas-ar-poster-slot')) {
            return;
        }

        var poster = mv.getAttribute('poster') || mv.getAttribute('data-poster') || '';

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('slot', 'poster');
        btn.className = 'atlas-ar-poster-slot';
        btn.setAttribute('aria-label', VIEW_IN_3D_LABEL);
        btn.style.cssText =
            'width:100%;height:100%;min-height:180px;display:flex;align-items:center;' +
            'justify-content:center;border:0;cursor:pointer;' +
            (poster
                ? 'background:#fff center/contain no-repeat url("' + poster.replace(/"/g, '%22') + '");'
                : 'background:rgba(0,0,0,0.03);');

        var label = document.createElement('span');
        label.className = 'atlas-ar-poster-label';
        label.textContent = VIEW_IN_3D_LABEL;
        label.style.cssText =
            'padding:10px 18px;border-radius:999px;background:rgba(0,0,0,0.75);' +
            'color:#fff;font:600 14px/1.2 system-ui,sans-serif;';
        btn.appendChild(label);

        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            label.textContent = '…';
            loadModelViewerScript().catch(function () {
                label.textContent = VIEW_IN_3D_LABEL;
            });
        });

        // If the poster URL is set slightly later (setModelAttributes after the
        // REST fetch), pick it up so the placeholder shows the product render.
        if (!poster && 'MutationObserver' in window) {
            var attrObs = new MutationObserver(function () {
                var late = mv.getAttribute('poster');
                if (late) {
                    btn.style.background = '#fff center/contain no-repeat url("' + late.replace(/"/g, '%22') + '")';
                    attrObs.disconnect();
                }
            });
            attrObs.observe(mv, { attributes: true, attributeFilter: ['poster'] });
        }

        mv.appendChild(btn);
    }

    // Distinguish a viewer injected by a real user gesture (WC 3D tab, image⇄3D
    // toggle, AR button — the user already opted in, so just load) from one
    // injected programmatically on page load (the inline viewer the shortcode
    // reveal drops in — that's what we want to defer behind a poster).
    var _lastGesture = 0;
    function markGesture() {
        _lastGesture = Date.now();
    }
    function injectedByGesture() {
        return (Date.now() - _lastGesture) < 1500;
    }

    function handleInteractionViewer(mv) {
        if (window.atlasARModelViewerLoaded || !mv || mv.__atlasARHandled) {
            return;
        }
        mv.__atlasARHandled = true;

        if (injectedByGesture()) {
            // User already clicked a trigger that produced this viewer — load now.
            loadModelViewerScript();
            return;
        }

        // A viewer embedded in the WooCommerce gallery is managed by the
        // image⇄3D toggle (ar-image-3d-toggle.js), which in interaction mode
        // defaults to the product image and loads the library on its own
        // "View in 3D" button. Don't touch it — the gallery's flexslider clones
        // slides, which detaches any listener/overlay we'd attach here.
        if (mv.closest && mv.closest('.woocommerce-product-gallery, #atlas_ar-toggle-3d-container, #atlas_ar-3d-viewer-overlay, .atlas-ar-3d-viewer-overlay, .atlas-ar-fullscreen-viewer')) {
            return;
        }

        // Standalone viewer (e.g. an inline [atlas_ar] shortcode) — not inside
        // the gallery, so a poster child is safe and not subject to cloning.
        injectPosterChild(mv);
    }

    function removeAllPosterOverlays() {
        // Once the library is loaded, <model-viewer> manages its own poster
        // slot (it hides when the model reveals), but strip any of our injected
        // poster children that belong to viewers which never reveal (e.g. a
        // hidden duplicate) so no stale "View in 3D" label lingers.
        var ovs = document.querySelectorAll('.atlas-ar-poster-slot');
        Array.prototype.forEach.call(ovs, function (o) {
            var mv = o.closest && o.closest('model-viewer');
            // Keep the poster on the viewer the user is actively revealing;
            // model-viewer will hide it automatically when the scene loads.
            if (mv && mv.loaded) {
                return;
            }
            if (o.parentNode) {
                o.parentNode.removeChild(o);
            }
        });
    }

    function initInteraction() {
        ['pointerdown', 'touchstart', 'keydown', 'click'].forEach(function (ev) {
            document.addEventListener(ev, markGesture, true);
        });

        // Once the library is loaded (by any trigger), every poster is obsolete —
        // the <model-viewer> elements upgrade and render in place.
        document.addEventListener('atlasar:viewer-ready', removeAllPosterOverlays);

        // 1. Any <model-viewer> already in the DOM at load → poster-first.
        Array.prototype.forEach.call(document.querySelectorAll('model-viewer'), handleInteractionViewer);

        // 2. Viewers injected later: poster-first if auto-injected, load-now if
        //    the injection followed a user gesture.
        if ('MutationObserver' in window) {
            var mo = new MutationObserver(function (mutations) {
                if (window.atlasARModelViewerLoaded) {
                    mo.disconnect();
                    return;
                }
                for (var i = 0; i < mutations.length; i++) {
                    var added = mutations[i].addedNodes;
                    for (var j = 0; j < added.length; j++) {
                        var node = added[j];
                        if (node.nodeType !== 1) {
                            continue;
                        }
                        if (node.tagName === 'MODEL-VIEWER') {
                            handleInteractionViewer(node);
                        } else if (node.querySelector) {
                            var inner = node.querySelector('model-viewer');
                            if (inner) {
                                handleInteractionViewer(inner);
                            }
                        }
                    }
                }
            });
            mo.observe(document.body, { childList: true, subtree: true });
        }

        // 3. AR triggers that don't inject a viewer themselves (e.g. "View in
        //    AR", which hands off to the native AR session) still need the lib.
        document.addEventListener('click', function (e) {
            if (window.atlasARModelViewerLoaded) {
                return;
            }
            var t = e.target;
            if (t && t.closest && t.closest('[data-product-id], [data-atlas-ar-trigger], .atlas-ar-tryon-buttons button, #atlas_ar-toggle-3d-container')) {
                loadModelViewerScript();
            }
        }, true);
    }

    /* ------------------------------------------------------------------ */
    function init() {
        if (window.atlasARModelViewerLoaded) {
            return;
        }
        if (STRATEGY === 'interaction') {
            initInteraction();
        } else {
            initAuto();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
