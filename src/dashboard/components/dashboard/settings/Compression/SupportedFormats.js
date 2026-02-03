import { __, sprintf } from '@wordpress/i18n';

/**
 * Supported Formats Component
 *
 * Display supported file formats for compression.
 * Shows Pro features with lock icons.
 *
 * @since 1.8.0
 */
export default function SupportedFormats({ isProActive, onProFeatureClick }) {
    const formats = [
        {
            name: __('GLB / GLTF', 'ar-vr-3d-model-try-on'),
            description: __('Standard 3D model format with Draco compression', 'ar-vr-3d-model-try-on'),
            supported: true,
            pro: false,
            icon: '✓',
        },
        {
            name: __('FBX → GLB', 'ar-vr-3d-model-try-on'),
            description: __('Convert and compress FBX models to optimized GLB', 'ar-vr-3d-model-try-on'),
            supported: isProActive,
            pro: true,
            icon: isProActive ? '✓' : '🔒',
        },
        {
            name: __('OBJ → GLB', 'ar-vr-3d-model-try-on'),
            description: __('Convert and compress OBJ models to optimized GLB', 'ar-vr-3d-model-try-on'),
            supported: isProActive,
            pro: true,
            icon: isProActive ? '✓' : '🔒',
        },
        {
            name: __('USDZ', 'ar-vr-3d-model-try-on'),
            description: __('iOS AR format compression (experimental)', 'ar-vr-3d-model-try-on'),
            supported: isProActive,
            pro: true,
            icon: isProActive ? '✓' : '🔒',
        },
    ];

    return (
        <div className="art-p-4 art-bg-gray-50 art-rounded-lg art-border art-border-gray-200">
            <h3 className="art-text-base art-font-semibold art-text-gray-900 art-mb-3">
                {__('Supported Formats', 'ar-vr-3d-model-try-on')}
            </h3>
            <p className="art-text-sm art-text-gray-600 art-mb-4">
                {__('The following file formats can be compressed. Pro features include automatic format conversion and additional format support.', 'ar-vr-3d-model-try-on')}
            </p>

            <div className="art-space-y-2">
                {formats.map((format, index) => (
                    <div
                        key={index}
                        onClick={() => {
                            if (format.pro && !isProActive) {
                                onProFeatureClick(sprintf(__('%s Compression', 'ar-vr-3d-model-try-on'), format.name));
                            }
                        }}
                        className={`art-flex art-items-start art-p-3 art-rounded-lg art-border ${
                            format.supported
                                ? 'art-bg-white art-border-gray-200'
                                : 'art-bg-gray-100 art-border-gray-300 art-cursor-pointer hover:art-bg-gray-200'
                        }`}
                    >
                        <div className="art-flex-shrink-0 art-mr-3">
                            <span
                                className={`art-inline-flex art-items-center art-justify-center art-w-6 art-h-6 art-rounded-full art-text-sm ${
                                    format.supported
                                        ? 'art-bg-green-100 art-text-green-600'
                                        : 'art-bg-gray-200 art-text-gray-600'
                                }`}
                            >
                                {format.icon}
                            </span>
                        </div>
                        <div className="art-flex-1 art-min-w-0">
                            <div className="art-flex art-items-center">
                                <span className="art-text-sm art-font-medium art-text-gray-900">
                                    {format.name}
                                </span>
                                {format.pro && (
                                    <span className="art-ml-2 art-px-2 art-py-0.5 art-text-xs art-font-medium art-bg-yellow-100 art-text-yellow-800 art-rounded">
                                         {__('PRO', 'ar-vr-3d-model-try-on')}
                                    </span>
                                )}
                            </div>
                            <p className="art-text-xs art-text-gray-600 art-mt-0.5">
                                {format.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Benefits Section */}
            <div className="art-mt-4 art-p-3 art-bg-blue-50 art-border art-border-blue-200 art-rounded">
                <p className="art-text-sm art-text-gray-700">
                    <strong>{__('💡 Why compression matters:', 'ar-vr-3d-model-try-on')}</strong>
                </p>
                <ul className="art-text-xs art-text-gray-600 art-mt-2 art-space-y-1 art-ml-4 art-list-disc">
                    <li>{__('50-70% smaller file sizes = faster loading', 'ar-vr-3d-model-try-on')}</li>
                    <li>{__('Reduced bandwidth usage = lower hosting costs', 'ar-vr-3d-model-try-on')}</li>
                    <li>{__('Better user experience on mobile devices', 'ar-vr-3d-model-try-on')}</li>
                    <li>{__('Improved SEO with faster page speeds', 'ar-vr-3d-model-try-on')}</li>
                </ul>
            </div>
        </div>
    );
}
