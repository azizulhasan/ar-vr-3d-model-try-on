/**
 * Lazy Load Model Viewer Script
 *
 * This script uses Intersection Observer to lazy-load the heavy model-viewer library
 * only when AR content becomes visible in the viewport. This significantly improves
 * initial page load performance.
 *
 * Performance Impact:
 * - Saves ~100-200ms on initial page load
 * - Reduces blocking JavaScript by ~956KB
 * - Model-viewer loads only when needed
 *
 * @since 1.7.9
 */

(function() {
    'use strict';

    // Check if we already loaded the model viewer
    if (window.atlasARModelViewerLoaded) {
        return;
    }

    // Configuration
    const MODEL_VIEWER_SCRIPT_URL = ar_try_on.plugin_url + 'public/js/google-model-viewer.js';
    const element = document.querySelector('[id^="atlas_ar_shortcode_"]');

    /**
     * GET shortcode id dynamically
     * @type {null}
     */
    let shortcode_id = null;
    if (element) {
        const number = element.id.replace('atlas_ar_shortcode_', '');
        console.log('Extracted number:', number);
        shortcode_id = '#atlas_ar_shortcode_'+number;
    } else {
        console.log('No matching element found');
    }
    const AR_VIEWER_SELECTORS = [
        'model-viewer',
        '.ar_vr_3d_model_try_on',
        '#atlas_ar_preview',
        '[data-atlas-ar]',
    ];
    if(shortcode_id) {
        AR_VIEWER_SELECTORS.push(shortcode_id);
    }
    console.log(AR_VIEWER_SELECTORS);
    /**
     * Load the model-viewer script dynamically
     */
    function loadModelViewerScript() {
        if (window.atlasARModelViewerLoaded) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = MODEL_VIEWER_SCRIPT_URL;
            script.type = 'module';
            script.defer = true;

            script.onload = () => {
                window.atlasARModelViewerLoaded = true;
                console.log('AtlasAR: Model Viewer loaded lazily');
                resolve();
            };

            script.onerror = () => {
                console.error('AtlasAR: Failed to load Model Viewer');
                reject(new Error('Failed to load model-viewer'));
            };

            document.head.appendChild(script);
        });
    }

    /**
     * Initialize lazy loading with Intersection Observer
     */
    function initLazyLoading() {
        // Check if Intersection Observer is supported
        if (!('IntersectionObserver' in window)) {
            // Fallback: Load immediately if no IntersectionObserver support
            loadModelViewerScript();
            return;
        }

        // Find all AR viewer elements
        const arElements = [];
        AR_VIEWER_SELECTORS.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                arElements.push(...elements);
            }
        });

        if (arElements.length === 0) {
            // No AR elements on page, don't load model-viewer
            return;
        }

        // Create intersection observer
        const observerOptions = {
            root: null, // viewport
            rootMargin: '100px', // Start loading 100px before element enters viewport
            threshold: 0.01 // Trigger when 1% visible
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Element is visible or about to be visible
                    loadModelViewerScript().then(() => {
                        // Disconnect observer after loading (only need to load once)
                        observer.disconnect();
                    });
                }
            });
        }, observerOptions);

        // Observe all AR elements
        arElements.forEach(element => {
            observer.observe(element);
        });

        console.log('AtlasAR: Lazy loading initialized for', arElements.length, 'elements');
    }

    /**
     * Initialize on DOM ready
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLazyLoading);
    } else {
        // DOM already loaded
        initLazyLoading();
    }

    // Also handle dynamically added AR elements
    if ('MutationObserver' in window) {
        const mutationObserver = new MutationObserver((mutations) => {
            let hasNewARElements = false;

            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        AR_VIEWER_SELECTORS.forEach(selector => {
                            if (node.matches && node.matches(selector)) {
                                hasNewARElements = true;
                            }
                        });
                    }
                });
            });

            if (hasNewARElements && !window.atlasARModelViewerLoaded) {
                initLazyLoading();
            }
        });

        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

})();
