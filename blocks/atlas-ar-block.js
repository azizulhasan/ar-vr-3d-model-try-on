(function (blocks, element, i18n, blockEditor, components) {
    'use strict';

    var registerBlockType = blocks.registerBlockType;
    var el = element.createElement;
    var Fragment = element.Fragment;
    var __ = i18n.__;

    // Older WP uses wp.editor instead of wp.blockEditor.
    var editorMod = blockEditor || (window.wp && window.wp.editor) || {};
    var useBlockProps = editorMod.useBlockProps || function (p) { return p; };
    var InspectorControls = editorMod.InspectorControls;

    var PanelBody = components.PanelBody;
    var ToggleControl = components.ToggleControl;
    var TextControl = components.TextControl;

    /**
     * Serialize the block's attributes into the `[atlas_ar ...]`
     * shortcode that the post body will store. Each attribute has a
     * default in PHP (`AR_TRY_ON_Helper::create_shortcode`), so we omit
     * any attribute that equals its default to keep the saved
     * shortcode terse.
     */
    function buildShortcode(a) {
        var parts = ['atlas_ar'];
        // reveal: block default is false (lighter UX for new posts).
        // The shortcode default is true, so we always emit reveal=false
        // explicitly. When the merchant flips reveal=on, we emit
        // reveal=true explicitly too — being explicit makes the saved
        // shortcode self-describing.
        parts.push('reveal="' + (a.reveal ? 'true' : 'false') + '"');
        if (a.reveal) {
            if (a.height && a.height !== '400px') parts.push('height="' + a.height + '"');
            if (a.width && a.width !== '500px') parts.push('width="' + a.width + '"');
            if (a.padding && a.padding !== '0') parts.push('padding="' + a.padding + '"');
            if (a.margin && a.margin !== '0') parts.push('margin="' + a.margin + '"');
            if (a.aspectRatio) parts.push('aspect_ratio="' + a.aspectRatio + '"');
        }
        return '[' + parts.join(' ') + ']';
    }

    registerBlockType('atlas/ar-shortcode', {
        title: __('AtlasAR – 3D Model Viewer', 'ar-vr-3d-model-try-on'),
        description: __('Inserts the [atlas_ar] shortcode automatically.', 'ar-vr-3d-model-try-on'),
        icon: 'visibility',
        category: 'widgets',
        keywords: ['atlas', 'atlasar', '3d', 'ar', 'model', '3d viewer', 'model viewer', '3d model', 'augmented reality'],

        // Each attribute has a safe default so the shortcode never
        // breaks even when freshly inserted with no edits.
        attributes: {
            // Block default: hide model on initial render (lighter UX).
            // The PHP shortcode default is `true` for backwards-compat
            // with manually-typed `[atlas_ar]` shortcodes that predate
            // this attribute.
            reveal:      { type: 'boolean', default: false },
            height:      { type: 'string',  default: '400px' },
            width:       { type: 'string',  default: '500px' },
            padding:     { type: 'string',  default: '0' },
            margin:      { type: 'string',  default: '0' },
            aspectRatio: { type: 'string',  default: '' },
        },

        edit: function (props) {
            var attributes = props.attributes;
            var setAttributes = props.setAttributes;
            var blockProps = useBlockProps({ className: 'atlas-ar-shortcode-block' });

            var inspector = InspectorControls
                ? el(InspectorControls, null,
                    el(PanelBody, {
                        title: __('AtlasAR Settings', 'ar-vr-3d-model-try-on'),
                        initialOpen: true,
                    },
                        el(ToggleControl, {
                            label: __('Reveal model by default', 'ar-vr-3d-model-try-on'),
                            help: attributes.reveal
                                ? __('The 3D model loads inline. On face products the Try-On button overlays the model.', 'ar-vr-3d-model-try-on')
                                : __('Only buttons appear. Visitors click "View in AR" or "Try On" to load the model.', 'ar-vr-3d-model-try-on'),
                            checked: !!attributes.reveal,
                            onChange: function (v) { setAttributes({ reveal: !!v }); },
                        }),
                        attributes.reveal && el(TextControl, {
                            label: __('Width', 'ar-vr-3d-model-try-on'),
                            help: __('Any CSS length (e.g. 500px, 100%, 30rem).', 'ar-vr-3d-model-try-on'),
                            value: attributes.width || '',
                            onChange: function (v) { setAttributes({ width: v || '500px' }); },
                        }),
                        attributes.reveal && el(TextControl, {
                            label: __('Height', 'ar-vr-3d-model-try-on'),
                            help: __('Ignored when Aspect ratio is set.', 'ar-vr-3d-model-try-on'),
                            value: attributes.height || '',
                            onChange: function (v) { setAttributes({ height: v || '400px' }); },
                        }),
                        attributes.reveal && el(TextControl, {
                            label: __('Aspect ratio', 'ar-vr-3d-model-try-on'),
                            help: __('Optional. e.g. 1/1, 16/9, 4/3. Overrides Height for a responsive box.', 'ar-vr-3d-model-try-on'),
                            value: attributes.aspectRatio || '',
                            onChange: function (v) { setAttributes({ aspectRatio: v || '' }); },
                        }),
                        attributes.reveal && el(TextControl, {
                            label: __('Padding', 'ar-vr-3d-model-try-on'),
                            help: __('Any CSS value, e.g. 0, 20px, 1rem 2rem.', 'ar-vr-3d-model-try-on'),
                            value: attributes.padding || '',
                            onChange: function (v) { setAttributes({ padding: v || '0' }); },
                        }),
                        attributes.reveal && el(TextControl, {
                            label: __('Margin', 'ar-vr-3d-model-try-on'),
                            help: __('Any CSS value, e.g. 0, 20px auto, 1rem 0.', 'ar-vr-3d-model-try-on'),
                            value: attributes.margin || '',
                            onChange: function (v) { setAttributes({ margin: v || '0' }); },
                        })
                    )
                )
                : null;

            // Editor placeholder: shows what the saved shortcode will
            // look like, so the merchant can see their config without
            // a preview round-trip.
            var summary = attributes.reveal
                ? (attributes.aspectRatio
                    ? __('Reveal: ON · ', 'ar-vr-3d-model-try-on') + (attributes.width || '500px') + ' / ' + attributes.aspectRatio
                    : __('Reveal: ON · ', 'ar-vr-3d-model-try-on') + (attributes.width || '500px') + ' × ' + (attributes.height || '400px'))
                : __('Reveal: OFF · Buttons only (Try-On + View in AR)', 'ar-vr-3d-model-try-on');

            return el(Fragment, null,
                inspector,
                el('div', blockProps,
                    el('strong', null, buildShortcode(attributes)),
                    el('p', { style: { marginTop: '8px', opacity: 0.75, fontSize: '13px' } }, summary)
                )
            );
        },

        save: function (props) {
            // Save the bare shortcode — no `<p>` wrapper. WordPress
            // runs `wpautop` then `shortcode_unautop`, and the latter
            // strips any `<p>` it added around a stand-alone shortcode.
            // Keeping the saved HTML wrapper-free is critical when the
            // shortcode expands to a block-level element (our viewer
            // wrapper) — a `<p>...<div>...</div>...</p>` is invalid
            // HTML and browsers auto-close the `<p>` early, leaving
            // empty paragraphs with default margins above and below
            // the viewer. That looked like "extra gap" on tall
            // aspect_ratio settings.
            return el(Fragment, null, buildShortcode(props.attributes));
        },

        // Backward-compat: posts saved by earlier versions of this
        // block contain either a bare `<p>[atlas_ar]</p>` (legacy) or
        // a `<p>[atlas_ar reveal="..."]</p>` (current). Without
        // deprecated entries, Gutenberg would flag those as invalid the
        // moment the merchant reopens the post. Each entry's `save`
        // must match the exact output its version produced.
        deprecated: [
            // v3: previous version that wrapped the shortcode in <p>.
            {
                attributes: {
                    reveal:      { type: 'boolean', default: false },
                    height:      { type: 'string',  default: '400px' },
                    width:       { type: 'string',  default: '500px' },
                    padding:     { type: 'string',  default: '0' },
                    margin:      { type: 'string',  default: '0' },
                    aspectRatio: { type: 'string',  default: '' },
                },
                save: function (props) {
                    return el('p', null, buildShortcode(props.attributes));
                },
                migrate: function (attributes) { return attributes; },
            },
            // v1: original block — bare `[atlas_ar]` with no attributes.
            {
                attributes: {},
                save: function () {
                    return el('p', null, '[atlas_ar]');
                },
                migrate: function () {
                    return {
                        reveal:      true,
                        height:      '400px',
                        width:       '500px',
                        padding:     '0',
                        margin:      '0',
                        aspectRatio: '',
                    };
                },
            },
        ],
    });

})(
    window.wp.blocks,
    window.wp.element,
    window.wp.i18n,
    window.wp.blockEditor,
    window.wp.components
);
