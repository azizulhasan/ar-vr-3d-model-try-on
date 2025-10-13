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


export default function Features() {
    return (
        <div style={{ padding: "20px", border: "1px solid #ccc", backgroundColor: "var(--theme-bg)", color: "var(--theme-text)" }} >
        <ul className="art-list-disc art-list-inside">
            <li className="art-text-sm">
                ✅ <strong>Inspect 3D models from every angle</strong> (rotate/zoom) <a href={'https://wpaugmentedreality.com/product/dining-armchair-view-in-augmented-reality-3d/'} target={'_blank'}>Dining Armchair Demo </a>.
            </li>
            <li className="art-text-sm">
                ✅ <strong>Place products in real spaces </strong> using smartphone AR (floor/wall) <a href={'https://wpaugmentedreality.com/product/office-chair-view-in-augmented-reality-3d/'} target={'_blank'}>Office Chair Demo </a>.
            </li>

            <li className="art-text-sm">
                ✅ <strong>Wall Augmented Reality (AR) </strong> Let users preview wall art, mirrors, and décor directly on their walls <a href={'https://wpaugmentedreality.com/product/sun-painting-on-wall-view-in-augmented-reality-3d/'} target={'_blank'}>Sun Painting Demo    </a>.
            </li>
            <li className="art-text-sm">
                ✅  <strong>Unlimited 3D Uploads:</strong> Free version supports unlimited .glb/.gltf files.
            </li>
            <li className="art-text-sm">
                ✅  <strong>True Mobile AR:</strong> Android (GLB) + iOS (USDZ) compatibility.
            </li>
            <li className="art-text-sm">
                ✅  <strong>WooCommerce Native:</strong> Automatic integration with product pages.
            </li>
            <li className="art-text-sm">
                ✅  <strong>Zero Coding:</strong> Automatic AR button placement on product pages – no coding required.
            </li>
            <li className="art-text-sm">
                ✅  <a href={'https://wordpress.org/plugins/ar-vr-3d-model-try-on/'} target={'_blank'}>Learn more</a>
            </li>
        </ul>
        </div>


)
}