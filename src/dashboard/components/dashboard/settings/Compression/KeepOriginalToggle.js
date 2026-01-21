import { useState } from 'react';

/**
 * Keep Original Files Toggle Component
 *
 * Toggle to keep or delete original files after compression.
 *
 * @since 1.8.0
 */
export default function KeepOriginalToggle({ keepOriginal, onChange }) {
    const [isEnabled, setIsEnabled] = useState(keepOriginal);

    const handleToggle = () => {
        const newValue = !isEnabled;
        setIsEnabled(newValue);
        onChange(newValue);
    };

    return (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                        Keep Original Files
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                        Store both original and compressed versions. Useful for reverting changes
                        or comparing quality.
                    </p>
                    {isEnabled && (
                        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-700">
                            ⚠️ <strong>Note:</strong> Keeping originals will use approximately 2x storage space.
                        </div>
                    )}
                    {!isEnabled && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                            ⚠️ <strong>Warning:</strong> Original files will be permanently deleted after compression.
                            This action cannot be undone.
                        </div>
                    )}
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

            {/* Storage Info */}
            <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                    {isEnabled ? (
                        <>
                            ✓ Original files stored in:{' '}
                            <code className="px-1 py-0.5 bg-gray-200 rounded">
                                /uploads/atlas_ar/{'{post_id}'}/original.glb
                            </code>
                        </>
                    ) : (
                        <>
                            Only compressed files will be stored in:{' '}
                            <code className="px-1 py-0.5 bg-gray-200 rounded">
                                /uploads/atlas_ar/{'{post_id}'}/compressed.glb
                            </code>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
