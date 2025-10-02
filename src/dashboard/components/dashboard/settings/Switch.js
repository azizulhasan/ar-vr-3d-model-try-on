import { useState, useEffect } from "react";
import React from "react";

const Switch = ({
  label,
  defaultChecked = false,
  disabled = false,
  onChange,
  color = "blue",
}) => {
  const [isChecked, setIsChecked] = useState(defaultChecked);

    useEffect(() => {
    setIsChecked(defaultChecked);
  }, [defaultChecked]);

  const handleToggle = (e) => {
    e.preventDefault();
    if (disabled) return;
    
    const newCheckedState = !isChecked;
    setIsChecked(newCheckedState);
    
    if (onChange) {
      onChange(newCheckedState);
    }
  };

  // Get background classes
  const getBackgroundClass = () => {
    if (disabled) return "art-bg-gray-100 dark:art-bg-gray-800";
    if (color === "blue") {
      return isChecked ? "art-bg-blue-500" : "art-bg-gray-300 dark:art-bg-gray-600";
    }
    return isChecked ? "art-bg-gray-800 dark:art-bg-white/10" : "art-bg-gray-300 dark:art-bg-gray-600";
  };

  return (
    <label
      className={`art-flex art-cursor-pointer art-select-none art-items-center art-gap-3 art-text-sm art-font-medium ${
        disabled
          ? "art-text-gray-400"
          : "art-text-gray-700 dark:art-text-gray-400"
      }`}
    >
      <div className="art-relative" onClick={handleToggle}>
        {/* Background */}
        <div
          className={`art-block art-h-6 art-w-11 art-rounded-full art-transition-colors art-duration-200 ${
            disabled ? "art-pointer-events-none" : ""
          } ${getBackgroundClass()}`}
        />
        {/* Knob */}
        <div
        className={`art-absolute art-left-0.5 art-top-0.5 art-h-5 art-w-5 art-rounded-full art-bg-white art-shadow-md art-transition-all art-duration-200 art-ease-in-out`}
        style={{
            transform: isChecked ? 'translateX(1.25rem)' : 'translateX(0)',
            transition: 'transform 200ms ease-in-out'
        }}
        />
      </div>
      {label && <span>{label}</span>}
    </label>
  );
};

export default Switch;