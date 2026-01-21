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
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                    Enable Auto-Compression
                </h3>
                <p className="text-sm text-gray-600">
                    Automatically compress 3D models when uploaded to reduce file sizes.
                    This improves loading speed and reduces bandwidth usage.
                </p>
            </div>
            <div className="ml-4">
                <button
                    onClick={handleToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        isEnabled ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                    role="switch"
                    aria-checked={isEnabled}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                </button>
            </div>
        </div>
    );
}
