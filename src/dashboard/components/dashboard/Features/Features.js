// <ul className="art-list-disc art-list-inside art-mt-4 art-space-y-2">
//     <li className="art-text-sm art-text-gray-700">
//         <strong>Augmented Reality (AR):</strong> Enable customers to explore products in their real-world environment
//         using AR.
//     </li>
//     <li className="art-text-sm art-text-gray-700">
//         <strong>3D Model Integration:</strong> Showcase .glb, .gltf files effortlessly.
//     </li>
//     <li className="art-text-sm art-text-gray-700">
//         <strong>WordPress Compatibility:</strong> Built to integrate seamlessly with WordPress.
//     </li>
//     <li className="art-text-sm art-text-gray-700">
//         <strong>WooCommerce Support:</strong> Fully compatible with WooCommerce for a complete eCommerce solution.
//     </li>
//     <li className="art-text-sm art-text-gray-700">
//         <strong>External 3D File Support:</strong> Import 3D models from services like Sketchfab and other sources.
//     </li>
// </ul>

import { __ } from '@wordpress/i18n';


export default function Features() {
    return (
        <div style={{ padding: "32px", border: "1px solid #ccc", backgroundColor: "var(--theme-bg)", color: "var(--theme-text)" }} >
            <ul className="art-list-disc art-list-inside">
                <li className="art-text-sm">
                    ✅ <strong>{__('Inspect 3D models from every angle', 'ar-vr-3d-model-try-on')}</strong> {__('(rotate/zoom)', 'ar-vr-3d-model-try-on')} <a href={'https://wpaugmentedreality.com/product/dining-armchair-view-in-augmented-reality-3d/'} target={'_blank'}>{__('Dining Armchair Demo', 'ar-vr-3d-model-try-on')}</a>.
                </li>
                <li className="art-text-sm">
                    ✅ <strong>{__('Place products in real spaces', 'ar-vr-3d-model-try-on')}</strong> {__('using smartphone AR (floor/wall)', 'ar-vr-3d-model-try-on')} <a href={'https://wpaugmentedreality.com/product/office-chair-view-in-augmented-reality-3d/'} target={'_blank'}>{__('Office Chair Demo', 'ar-vr-3d-model-try-on')}</a>.
                </li>
                <li className="art-text-sm">
                    ✅ <strong>{__('Wall Augmented Reality (AR)', 'ar-vr-3d-model-try-on')}</strong> {__('Let users preview wall art, mirrors, and décor directly on their walls', 'ar-vr-3d-model-try-on')} <a href={'https://wpaugmentedreality.com/product/sun-painting-on-wall-view-in-augmented-reality-3d/'} target={'_blank'}>{__('Sun Painting Demo', 'ar-vr-3d-model-try-on')}</a>.
                </li>
                <li className="art-text-sm">
                    ✅ <strong>{__('Unlimited 3D Uploads:', 'ar-vr-3d-model-try-on')}</strong> {__('Free version supports unlimited .glb/.gltf files.', 'ar-vr-3d-model-try-on')}
                </li>
                <li className="art-text-sm">
                    ✅ <strong>{__('True Mobile AR:', 'ar-vr-3d-model-try-on')}</strong> {__('Android (GLB) + iOS (USDZ) compatibility.', 'ar-vr-3d-model-try-on')}
                </li>
                <li className="art-text-sm">
                    ✅ <strong>{__('WooCommerce Native:', 'ar-vr-3d-model-try-on')}</strong> {__('Automatic integration with product pages.', 'ar-vr-3d-model-try-on')}
                </li>
                <li className="art-text-sm">
                    ✅ <strong>{__('Zero Coding:', 'ar-vr-3d-model-try-on')}</strong> {__('Automatic AR button placement on product pages – no coding required.', 'ar-vr-3d-model-try-on')}
                </li>
                <li className="art-text-sm">
                    ✅ <a href={'https://wordpress.org/plugins/ar-vr-3d-model-try-on/'} target={'_blank'}>{__('Learn more', 'ar-vr-3d-model-try-on')}</a>
                </li>
            </ul>
        </div>
    )
}