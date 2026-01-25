import { useState } from 'react';

/**
 * Quality Slider Component
 *
 * Slider to adjust compression quality (0-100).
 *
 * @since 1.8.0
 */
export default function QualitySlider({ quality, onChange }) {
    const [currentQuality, setCurrentQuality] = useState(quality);

    const handleChange = (e) => {
        const value = parseInt(e.target.value);
        setCurrentQuality(value);
        onChange(value);
    };

    const getQualityLabel = (value) => {
        if (value >= 90) return 'Maximum Quality (Larger file)';
        if (value >= 75) return 'High Quality (Recommended)';
        if (value >= 60) return 'Balanced (Good quality, smaller file)';
        if (value >= 40) return 'Low Quality (Smaller file)';
        return 'Minimum Quality (Smallest file)';
    };

    const getQualityColor = (value) => {
        if (value >= 75) return 'text-green-600';
        if (value >= 50) return 'text-blue-600';
        return 'text-orange-600';
    };

    return (
        <div className="art-p-4 art-bg-gray-50 art-rounded-lg art-border art-border-gray-200">
            <div className="art-mb-4">
                <div className="art-flex art-items-center art-justify-between art-mb-2">
                    <h3 className="art-text-base art-font-semibold art-text-gray-900">
                        Compression Quality
                    </h3>
                    <div className="art-flex art-items-center">
                        <span className={`art-text-2xl art-font-bold ${getQualityColor(currentQuality)}`}>
                            {currentQuality}%
                        </span>
                    </div>
                </div>
                <p className="art-text-sm art-text-gray-600 art-mb-3">
                    {getQualityLabel(currentQuality)}
                </p>
            </div>

            {/* Slider */}
            <div className="art-mb-3">
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={currentQuality}
                    onChange={handleChange}
                    className="slider art-w-full art-h-2 art-bg-gray-300 art-rounded-lg art-appearance-none art-cursor-pointer"
                    style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${currentQuality}%, #d1d5db ${currentQuality}%, #d1d5db 100%)`,
                    }}
                />
            </div>

            {/* Quality Guide */}
            <div className="art-flex art-items-center art-justify-between art-text-xs art-text-gray-500">
                <span>0% (Smallest)</span>
                <span>50% (Balanced)</span>
                <span>100% (Best)</span>
            </div>

            {/* Quality Description */}
            <div className="art-mt-4 art-p-3 art-bg-blue-50 art-border art-border-blue-200 art-rounded art-text-sm art-text-gray-700">
                <strong>💡 Tip:</strong> For most models, 75-85% quality provides excellent results
                with 50-70% file size reduction. Higher quality = better visuals but larger files.
            </div>
        </div>
    );
}
