import React, {useEffect, useState} from 'react';
import { __ } from '@wordpress/i18n';
import './MultiSelect.css'; // Add styles here or use inline styles

const MultiSelect = ({options, onChange, selectedItems, id, name}) => {
    const [selectedOptions, setSelectedOptions] = useState(selectedItems);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Toggle dropdown visibility
    const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

    // Handle option selection
    const handleOptionClick = (option) => {
        const isSelected = selectedOptions.includes(option);
        const updatedOptions = isSelected
            ? selectedOptions.filter((item) => item !== option)
            : [...selectedOptions, option];

        setSelectedOptions(updatedOptions);
        onChange(updatedOptions); // Notify parent of changes
    };
    useEffect(() => {
        setSelectedOptions(selectedItems)
    }, [selectedItems]);

    // Check if an option is selected
    const isSelected = (option) => selectedOptions.includes(option);

    return (
        <div className="multi-select">
            {/* Trigger button */}
            <div className="multi-select-trigger" onClick={toggleDropdown} style={{ backgroundColor: "var(--theme-bg)", color: "var(--theme-text)" }}>
               {selectedOptions.length > 0 ? selectedOptions.join(', ') : __('Select...', 'ar-vr-3d-model-try-on')}
            </div>

            {/* Dropdown menu */}
            {isDropdownOpen && (
                <div className="multi-select-dropdown" style={{ backgroundColor: "var(--theme-bg)", color: "var(--theme-text)" }}>
                    {options.map((option) => (
                        <div
                            key={option}
                            id={id}
                            className={`multi-select-option ${
                                isSelected(option) ? 'selected' : ''
                            }`} style={{ backgroundColor: "var(--theme-bg)", color: "var(--theme-text)" }}
                            onClick={() => handleOptionClick(option)}
                        >
                            <input
                                type="checkbox"
                                checked={isSelected(option)}
                                readOnly
                            />
                            {option}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MultiSelect;
