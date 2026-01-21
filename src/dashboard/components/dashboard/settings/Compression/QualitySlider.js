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
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-semibold text-gray-900">
                        Compression Quality
                    </h3>
                    <div className="flex items-center">
                        <span className={`text-2xl font-bold ${getQualityColor(currentQuality)}`}>
                            {currentQuality}%
                        </span>
                    </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                    {getQualityLabel(currentQuality)}
                </p>
            </div>

            {/* Slider */}
            <div className="mb-3">
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={currentQuality}
                    onChange={handleChange}
                    className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${currentQuality}%, #d1d5db ${currentQuality}%, #d1d5db 100%)`,
                    }}
                />
            </div>

            {/* Quality Guide */}
            <div className="flex items-center justify-between text-xs text-gray-500">
                <span>0% (Smallest)</span>
                <span>50% (Balanced)</span>
                <span>100% (Best)</span>
            </div>

            {/* Quality Description */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-gray-700">
                <strong>💡 Tip:</strong> For most models, 75-85% quality provides excellent results
                with 50-70% file size reduction. Higher quality = better visuals but larger files.
            </div>
        </div>
    );
}
