import { useState } from 'react';

/**
 * Compression Toggle Component
 *
 * Enable/Disable auto-compression toggle.
 *
 * @since 1.8.0
 */
export default function CompressionToggle({ enabled, onChange }) {
    const [isEnabled, setIsEnabled] = useState(enabled);

    const handleToggle = () => {
        const newValue = !isEnabled;
        setIsEnabled(newValue);
        onChange(newValue);
    };

    return (
        <div className="art-flex art-items-center art-justify-between art-p-4 art-bg-gray-50 art-rounded-lg art-border art-border-gray-200">
            <div className="art-flex-1">
                <h3 className="art-text-base art-font-semibold art-text-gray-900 art-mb-1">
                    Enable Auto-Compression
                </h3>
                <p className="art-text-sm art-text-gray-600">
                    Automatically compress 3D models when uploaded to reduce file sizes.
                    This improves loading speed and reduces bandwidth usage.
                </p>
            </div>
            <div className="art-ml-4">
                <button
                    onClick={handleToggle}
                    className={`art-relative art-inline-flex art-h-6 art-w-11 art-items-center art-rounded-full art-transition-colors focus:art-outline-none focus:art-ring-2 focus:art-ring-blue-500 focus:art-ring-offset-2 ${
                        isEnabled ? 'art-bg-blue-600' : 'art-bg-gray-300'
                    }`}
                    role="switch"
                    aria-checked={isEnabled}
                >
                    <span
                        className={`art-inline-block art-h-4 art-w-4 art-transform art-rounded-full art-bg-white art-transition-transform ${
                            isEnabled ? 'art-translate-x-6' : 'art-translate-x-1'
                        }`}
                    />
                </button>
            </div>
        </div>
    );
}
