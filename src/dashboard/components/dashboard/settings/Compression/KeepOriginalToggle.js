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
        <div className="art-p-4 art-bg-gray-50 art-rounded-lg art-border art-border-gray-200">
            <div className="art-flex art-items-start art-justify-between">
                <div className="art-flex-1">
                    <h3 className="art-text-base art-font-semibold art-text-gray-900 art-mb-1">
                        Keep Original Files
                    </h3>
                    <p className="art-text-sm art-text-gray-600 art-mb-2">
                        Store both original and compressed versions. Useful for reverting changes
                        or comparing quality.
                    </p>
                    {isEnabled && (
                        <div className="art-mt-2 art-p-2 art-bg-orange-50 art-border art-border-orange-200 art-rounded art-text-sm art-text-orange-700">
                            ⚠️ <strong>Note:</strong> Keeping originals will use approximately 2x storage space.
                        </div>
                    )}
                    {!isEnabled && (
                        <div className="art-mt-2 art-p-2 art-bg-yellow-50 art-border art-border-yellow-200 art-rounded art-text-sm art-text-yellow-700">
                            ⚠️ <strong>Warning:</strong> Original files will be permanently deleted after compression.
                            This action cannot be undone.
                        </div>
                    )}
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

            {/* Storage Info */}
            <div className="art-mt-3 art-pt-3 art-border-t art-border-gray-200">
                <div className="art-text-xs art-text-gray-500">
                    {isEnabled ? (
                        <>
                            ✓ Original files stored in:{' '}
                            <code className="art-px-1 art-py-0.5 art-bg-gray-200 art-rounded">
                                /uploads/atlas_ar/{'{post_id}'}/original.glb
                            </code>
                        </>
                    ) : (
                        <>
                            Only compressed files will be stored in:{' '}
                            <code className="art-px-1 art-py-0.5 art-bg-gray-200 art-rounded">
                                /uploads/atlas_ar/{'{post_id}'}/compressed.glb
                            </code>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
