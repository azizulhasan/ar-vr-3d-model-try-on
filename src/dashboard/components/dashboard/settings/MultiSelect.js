import React, { useState, useEffect } from "react";
import { __ } from '@wordpress/i18n';

const MultiSelect = ({
  id,
  name,
  options = [],
  selectedItems = [],
  onChange,
  disabled = false,
}) => {
  const [selectedOptions, setSelectedOptions] = useState(selectedItems);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setSelectedOptions(selectedItems);
  }, [selectedItems]);

  const toggleDropdown = () => {
    if (!disabled) setIsOpen((prev) => !prev);
  };

  const handleSelect = (option) => {
    const updated = selectedOptions.includes(option)
      ? selectedOptions.filter((v) => v !== option)
      : [...selectedOptions, option];
    setSelectedOptions(updated);
    if (onChange) onChange(updated);
  };

  const removeOption = (value) => {
    const updated = selectedOptions.filter((v) => v !== value);
    setSelectedOptions(updated);
    if (onChange) onChange(updated);
  };

  const isSelected = (value) => selectedOptions.includes(value);

  return (
    <div className="art-w-1/3 art-relative" id={id} name={name}>
      {/* Selected input area */}
      <div
        onClick={toggleDropdown}
        className={`art-flex art-flex-wrap art-items-center art-gap-2 art-min-h-[44px] art-rounded-lg art-border art-border-gray-300 art-px-3 art-py-2 art-cursor-pointer art-transition hover:art-border-gray-400 dark:art-border-gray-700 dark:art-bg-gray-900 dark:art-text-white`}
        style={{
          backgroundColor: "var(--theme-bg)",
          color: "var(--theme-text)",
        }}
      >
        {selectedOptions.length > 0 ? (
          selectedOptions.map((option, idx) => (
            <div
              key={idx}
              className="art-flex art-items-center art-gap-1 art-bg-blue-200 dark:art-bg-blue-600 art-rounded-full art-px-2.5 art-py-1 art-text-sm art-text-gray-800 dark:art-text-white/90"
            >
              <span>{option}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeOption(option);
                }}
                className="art-text-gray-500 hover:art-text-gray-700 dark:hover:art-text-gray-300"
              >
                ×
              </button>
            </div>
          ))
        ) : (
          <span className="art-text-gray-500 dark:art-text-gray-400 text-sm">
              {__('Select option', 'ar-vr-3d-model-try-on')}
          </span>
        )}
        <div className="art-ml-auto art-text-gray-600 dark:art-text-gray-400">
          <svg
            className={`art-w-4 art-h-4 art-transition ${
              isOpen ? "art-rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Dropdown list */}
      {isOpen && (
        <div
          className="art-absolute art-w-full art-mt-1 art-z-40 art-bg-white dark:art-bg-gray-900 art-border art-border-gray-200 dark:art-border-gray-800 art-rounded-xl art-shadow-lg art-max-h-60 art-overflow-y-auto"
          style={{
            backgroundColor: "var(--theme-bg)",
            color: "var(--theme-text)",
          }}
        >
          {options.map((option, index) => (
            <div
              key={index}
              onClick={() => handleSelect(option)}
              className={`art-py-2 art-px-4 art-cursor-pointer hover:art-bg-gray-100 dark:hover:art-bg-gray-800 ${
                isSelected(option)
                  ? "art-bg-blue-200 dark:art-bg-blue-600"
                  : ""
              }`}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiSelect;
