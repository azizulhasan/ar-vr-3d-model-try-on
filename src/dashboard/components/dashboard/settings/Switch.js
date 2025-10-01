import { useState } from "react";
import React from "react";

const Switch = ({
  label,
  defaultChecked = false,
  disabled = false,
  onChange,
  color = "blue", // Default to blue
}) => {
  const [isChecked, setIsChecked] = useState(defaultChecked);

  const handleToggle = () => {
    if (disabled) return;
    const newCheckedState = !isChecked;
    setIsChecked(newCheckedState);
    if (onChange) {
      onChange(newCheckedState);
    }
  };

  const switchColors =
    color === "blue"
      ? {
          background: isChecked
            ? "art-bg-blue-500" // ON = blue background
            : "art-bg-gray-300 dark:art-bg-gray-600", // OFF = neutral
          knob: "art-bg-white",
        }
      : {
          background: isChecked
            ? "art-bg-gray-800 dark:art-bg-white/10"
            : "art-bg-gray-300 dark:art-bg-gray-600",
          knob: "art-bg-white",
        };

  return (
    <label
      className={`art-flex art-cursor-pointer art-select-none art-items-center art-gap-3 art-text-sm art-font-medium ${
        disabled
          ? "art-text-gray-400"
          : "art-text-gray-700 dark:art-text-gray-400"
      }`}
      onClick={handleToggle}
    >
      <div className="art-relative">
        {/* Background */}
        <div
          className={`art-block art-h-6 art-w-11 art-rounded-full art-transition-colors art-duration-200 ${
            disabled
              ? "art-bg-gray-100 art-pointer-events-none dark:art-bg-gray-800"
              : switchColors.background
          }`}
        />
        {/* Knob */}
        <div
          className={`art-absolute art-top-0.5 art-left-0.5 art-h-5 art-w-5 art-rounded-full art-shadow-md art-transform art-transition-all art-duration-200 ${
            isChecked ? "art-translate-x-5" : "art-translate-x-0"
          } ${switchColors.knob}`}
        />
      </div>
      {label && <span>{label}</span>}
    </label>
  );
};

export default Switch;
