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

    // Cover an on-load <model-viewer> with a poster + "View in 3D" button,
    // WITHOUT removing it from layout (so a gallery-embedded viewer keeps its
    // slot size). The overlay is absolutely positioned over the viewer's box
    // and shows the viewer's own poster image; clicking it loads the library
    // and the underlying <model-viewer> upgrades in place.
    function attachPosterOverlay(mv) {
        if (!mv || mv.__atlasARPosterBound) {
            return;
        }
        mv.__atlasARPosterBound = true;

        var holder = mv.parentElement;
        if (!holder) {
            return;
        }
        // The viewer needs a positioned ancestor for the absolute overlay.
        if (getComputedStyle(holder).position === 'static') {
            holder.style.position = 'relative';
        }

        var poster = mv.getAttribute('poster') || mv.getAttribute('data-poster') || '';

        var ov = document.createElement('div');
        ov.className = 'atlas-ar-poster-wrap';
        ov.style.position = 'absolute';
        ov.style.left = '0';
        ov.style.top = '0';
        ov.style.right = '0';
        ov.style.bottom = '0';
        ov.style.zIndex = '5';
        ov.style.cursor = 'pointer';
        ov.style.display = 'flex';
        ov.style.alignItems = 'center';
        ov.style.justifyContent = 'center';
        if (poster) {
            ov.style.background = '#fff center/contain no-repeat url("' + poster.replace(/"/g, '%22') + '")';
        } else {
            ov.style.background = 'rgba(0,0,0,0.03)';
        }

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'atlas-ar-poster-btn';
        btn.setAttribute('aria-label', VIEW_IN_3D_LABEL);
        btn.textContent = VIEW_IN_3D_LABEL;
        btn.style.padding = '10px 18px';
        btn.style.border = '0';
        btn.style.borderRadius = '999px';
        btn.style.background = 'rgba(0,0,0,0.75)';
        btn.style.color = '#fff';
        btn.style.font = '600 14px/1.2 system-ui, sans-serif';
        btn.style.cursor = 'pointer';
        ov.appendChild(btn);

        holder.appendChild(ov);

        function reveal() {
            btn.disabled = true;
            btn.textContent = '…';
            loadModelViewerScript().then(function () {
                if (ov.parentNode) {
                    ov.parentNode.removeChild(ov);
                }
            }).catch(function () {
                btn.disabled = false;
                btn.textContent = VIEW_IN_3D_LABEL;
            });
        }

        ov.addEventListener('click', reveal);
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
        } else {
            // Auto-injected on load — defer behind a poster.
            attachPosterOverlay(mv);
        }
    }

    function removeAllPosterOverlays() {
        var ovs = document.querySelectorAll('.atlas-ar-poster-wrap');
        Array.prototype.forEach.call(ovs, function (o) {
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
