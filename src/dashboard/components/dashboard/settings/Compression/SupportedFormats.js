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
            name: 'GLB / GLTF',
            description: 'Standard 3D model format with Draco compression',
            supported: true,
            pro: false,
            icon: '✓',
        },
        {
            name: 'FBX → GLB',
            description: 'Convert and compress FBX models to optimized GLB',
            supported: isProActive,
            pro: true,
            icon: isProActive ? '✓' : '🔒',
        },
        {
            name: 'OBJ → GLB',
            description: 'Convert and compress OBJ models to optimized GLB',
            supported: isProActive,
            pro: true,
            icon: isProActive ? '✓' : '🔒',
        },
        {
            name: 'USDZ',
            description: 'iOS AR format compression (experimental)',
            supported: isProActive,
            pro: true,
            icon: isProActive ? '✓' : '🔒',
        },
    ];

    return (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-base font-semibold text-gray-900 mb-3">
                Supported Formats
            </h3>
            <p className="text-sm text-gray-600 mb-4">
                The following file formats can be compressed. Pro features include automatic
                format conversion and additional format support.
            </p>

            <div className="space-y-2">
                {formats.map((format, index) => (
                    <div
                        key={index}
                        onClick={() => {
                            if (format.pro && !isProActive) {
                                onProFeatureClick(`${format.name} Compression`);
                            }
                        }}
                        className={`flex items-start p-3 rounded-lg border ${
                            format.supported
                                ? 'bg-white border-gray-200'
                                : 'bg-gray-100 border-gray-300 cursor-pointer hover:bg-gray-200'
                        }`}
                    >
                        <div className="flex-shrink-0 mr-3">
                            <span
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm ${
                                    format.supported
                                        ? 'bg-green-100 text-green-600'
                                        : 'bg-gray-200 text-gray-600'
                                }`}
                            >
                                {format.icon}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center">
                                <span className="text-sm font-medium text-gray-900">
                                    {format.name}
                                </span>
                                {format.pro && (
                                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                                        PRO
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-600 mt-0.5">
                                {format.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Benefits Section */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-gray-700">
                    <strong>💡 Why compression matters:</strong>
                </p>
                <ul className="text-xs text-gray-600 mt-2 space-y-1 ml-4 list-disc">
                    <li>50-70% smaller file sizes = faster loading</li>
                    <li>Reduced bandwidth usage = lower hosting costs</li>
                    <li>Better user experience on mobile devices</li>
                    <li>Improved SEO with faster page speeds</li>
                </ul>
            </div>
        </div>
    );
}
