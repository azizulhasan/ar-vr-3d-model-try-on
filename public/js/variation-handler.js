/**
 * WooCommerce Variation Handler for AtlasAR
 * Automatically switches 3D model variants when user selects product variations
 *
 * @since 1.8.3
 */
(function($) {
    'use strict';

    // Wait for DOM ready
    $(document).ready(function() {
        initVariationHandler();
    });

    /**
     * Initialize the variation handler
     */
    function initVariationHandler() {
        const variationsForm = document.querySelector('.variations_form');
        if (!variationsForm) {
            return;
        }

        // Wait for model viewer to be ready
        waitForModelViewer(function(modelViewer) {
            setupVariationListeners(variationsForm, modelViewer);
        });
    }

    /**
     * Wait for model viewer to be available in the DOM
     * @param {Function} callback - Callback function when model viewer is found
     */
    function waitForModelViewer(callback) {
        const maxAttempts = 20;
        let attempts = 0;

        const checkInterval = setInterval(function() {
            attempts++;
            const modelViewer = document.querySelector('.atlas_ar_model_viewer');

            if (modelViewer) {
                clearInterval(checkInterval);
                callback(modelViewer);
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.log('AtlasAR: Model viewer not found for variation handling');
            }
        }, 500);
    }

    /**
     * Setup WooCommerce variation event listeners
     * @param {Element} variationsForm - The WooCommerce variations form
     * @param {Element} modelViewer - The model-viewer element
     */
    function setupVariationListeners(variationsForm, modelViewer) {
        // Store original model source for fallback
        const originalSrc = modelViewer.getAttribute('src');
        modelViewer.dataset.originalSrc = originalSrc;

        // Listen for WooCommerce variation selection
        $(variationsForm).on('found_variation', function(event, variation) {
            handleVariationChange(variation, modelViewer);
        });

        // Listen for reset (when user clears selection)
        $(variationsForm).on('reset_data', function() {
            resetToOriginalModel(modelViewer);
        });

        // Also listen for individual attribute changes
        $(variationsForm).on('change', '.variations select', function() {
            const selectedValue = $(this).val();
            if (selectedValue) {
                tryVariantSwitch(selectedValue, modelViewer);
            }
        });
    }

    /**
     * Handle WooCommerce variation change
     * @param {Object} variation - The selected variation data
     * @param {Element} modelViewer - The model-viewer element
     */
    function handleVariationChange(variation, modelViewer) {
        if (!variation || !variation.attributes) {
            return;
        }

        // Try each attribute value to find a matching variant
        const attributes = variation.attributes;
        let variantSwitched = false;

        Object.keys(attributes).forEach(function(attrKey) {
            if (variantSwitched) return;

            let attrValue = attributes[attrKey];
            if (!attrValue) return;

            // Clean up the attribute value
            // WooCommerce uses formats like "attribute_pa_color" or "attribute_color"
            attrValue = cleanAttributeValue(attrValue);

            if (tryVariantSwitch(attrValue, modelViewer)) {
                variantSwitched = true;
            }
        });
    }

    /**
     * Clean attribute value
     * @param {string} value - The attribute value
     * @returns {string} - Cleaned value
     */
    function cleanAttributeValue(value) {
        if (!value) return '';

        // Remove common prefixes
        value = value.replace(/^pa_/, '');

        // Capitalize first letter for display names
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    }

    /**
     * Try to switch to a variant
     * @param {string} variantName - The variant name to switch to
     * @param {Element} modelViewer - The model-viewer element
     * @returns {boolean} - Whether the switch was successful
     */
    function tryVariantSwitch(variantName, modelViewer) {
        // Use the global function if available
        if (window.atlasARSwitchVariant) {
            return window.atlasARSwitchVariant(modelViewer, variantName);
        }

        // Fallback: Try using AtlasAR class
        if (window.AtlasAR) {
            try {
                const atlasAR = new window.AtlasAR();
                return atlasAR.switchVariant(variantName);
            } catch (e) {
                console.warn('AtlasAR: Error switching variant', e);
            }
        }

        // Last resort: Try to switch using model-viewer's built-in variantName
        try {
            const variationSettings = JSON.parse(modelViewer.dataset.variationSettings || '{}');

            // Check if mapped to a model variant
            const mappedVariant = variationSettings.variantMapping?.[variantName];
            if (mappedVariant) {
                modelViewer.variantName = mappedVariant;
                return true;
            }

            // Check for separate model
            const separateModel = variationSettings.variants?.[variantName];
            if (separateModel) {
                modelViewer.src = separateModel;
                modelViewer.variantName = null;
                return true;
            }
        } catch (e) {
            console.warn('AtlasAR: Error in fallback variant switch', e);
        }

        return false;
    }

    /**
     * Reset model to original source
     * @param {Element} modelViewer - The model-viewer element
     */
    function resetToOriginalModel(modelViewer) {
        const originalSrc = modelViewer.dataset.originalSrc;
        if (originalSrc) {
            modelViewer.src = originalSrc;
            modelViewer.variantName = null;
        }
    }

})(jQuery);
