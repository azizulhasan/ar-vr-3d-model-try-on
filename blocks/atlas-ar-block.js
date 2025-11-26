(function (blocks, element, i18n, blockEditor) {
    const { registerBlockType } = blocks;
    const { createElement: el } = element;
    const { __ } = i18n;

    // Older WP uses wp.editor instead of wp.blockEditor
    const { useBlockProps } = blockEditor || wp.editor;

    registerBlockType('atlas/ar-shortcode', {
        title: __('AtlasAR – 3D Model Viewer', 'ar-vr-3d-model-try-on'),
        description: __('Inserts the [atlas_ar] shortcode automatically.', 'ar-vr-3d-model-try-on'),
        icon: 'visibility', // You can change icon if you like
        category: 'widgets', // Or 'embed', or a custom category if you have one
        keywords: ['atlas', 'atlasar', '3d', 'ar', 'model', '3d viewer', 'model viewer', '3d model', 'augmented reality'],

        edit: function () {
            const blockProps = useBlockProps({
                className: 'atlas-ar-shortcode-block',
            });

            return el(
                'div',
                blockProps,
                el('strong', null, '[atlas_ar]'),
                el(
                    'p',
                    { style: { marginTop: '8px' } },
                    __('AtlasAR 3D Model Viewer will be rendered here on the frontend.', 'ar-vr-3d-model-try-on')
                )
            );
        },

        /**
         * Save: output the shortcode directly in the content.
         * WordPress will execute [atlas_ar] when rendering the post.
         */
        save: function () {
            // return null;
            return el(
                'p',
                null,
                '[atlas_ar]'
            );
        },
    });

})(
    window.wp.blocks,
    window.wp.element,
    window.wp.i18n,
    window.wp.blockEditor
);
