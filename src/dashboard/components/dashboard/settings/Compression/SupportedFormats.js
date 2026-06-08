import PremiumBadge from "../../../../../context/PremiumBadge";

/**
 * Supported Formats Component
 *
 * Lists the formats AtlasAR can compress.
 *
 * Free supports GLB and GLTF. The Pro plugin adds FBX → GLB, OBJ → GLB,
 * and USDZ via its own format-converter pipeline. AR-61 §1.1 Phase 2
 * replaced the previous "🔒 PRO" clickable-but-broken rows with a single
 * `<PremiumBadge>` upsell link — no disabled controls, no faux-toast
 * about features that "would" work.
 *
 * @since   1.8.0
 * @updated AR-61 §1.1 Phase 2
 */
export default function SupportedFormats({ isProActive, onProFeatureClick }) {
    // Always-supported formats (Free + Pro).
    const freeFormats = [
        {
            name: 'GLB / GLTF',
            description: 'Standard 3D model format with Draco compression',
        },
    ];

    // Pro-only formats. When Pro is loaded, the Pro plugin can extend
    // this list through the `atlas_ar_supported_formats` filter (Phase 3
    // adds that wiring); until then we render them only when Pro
    // reports as active.
    const proFormats = [
        {
            name: 'FBX → GLB',
            description: 'Convert and compress FBX models to optimized GLB',
        },
        {
            name: 'OBJ → GLB',
            description: 'Convert and compress OBJ models to optimized GLB',
        },
        {
            name: 'USDZ',
            description: 'iOS AR format compression (experimental)',
        },
    ];

    const visibleFormats = isProActive ? freeFormats.concat(proFormats) : freeFormats;

    return (
        <div className="art-p-4 art-bg-gray-50 art-rounded-lg art-border art-border-gray-200">
            <h3 className="art-text-base art-font-semibold art-text-gray-900 art-mb-3">
                Supported Formats
            </h3>
            <p className="art-text-sm art-text-gray-600 art-mb-4">
                The following file formats can be compressed.
            </p>

            <div className="art-space-y-2">
                {visibleFormats.map((format, index) => (
                    <div
                        key={index}
                        className="art-flex art-items-start art-p-3 art-rounded-lg art-border art-bg-white art-border-gray-200"
                    >
                        <div className="art-flex-shrink-0 art-mr-3">
                            <span className="art-inline-flex art-items-center art-justify-center art-w-6 art-h-6 art-rounded-full art-text-sm art-bg-green-100 art-text-green-600">
                                ✓
                            </span>
                        </div>
                        <div className="art-flex-1 art-min-w-0">
                            <span className="art-text-sm art-font-medium art-text-gray-900">
                                {format.name}
                            </span>
                            <p className="art-text-xs art-text-gray-600 art-mt-0.5">
                                {format.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/*
             * When Pro is absent, advertise the Pro-only formats as a
             * single passive upsell link. No clickable-looking-but-
             * silently-failing controls.
             */}
            {!isProActive && (
                <div className="art-mt-3">
                    <PremiumBadge feature="multi-format-compression">
                        <strong>FBX, OBJ, and USDZ compression</strong> — automatic
                        format conversion to optimized GLB. Available in AtlasAR Pro.
                    </PremiumBadge>
                </div>
            )}

            {/* Benefits Section */}
            <div className="art-mt-4 art-p-3 art-bg-blue-50 art-border art-border-blue-200 art-rounded">
                <p className="art-text-sm art-text-gray-700">
                    <strong>💡 Why compression matters:</strong>
                </p>
                <ul className="art-text-xs art-text-gray-600 art-mt-2 art-space-y-1 art-ml-4 art-list-disc">
                    <li>50-70% smaller file sizes = faster loading</li>
                    <li>Reduced bandwidth usage = lower hosting costs</li>
                    <li>Better user experience on mobile devices</li>
                    <li>Improved SEO with faster page speeds</li>
                </ul>
            </div>
        </div>
    );
}
