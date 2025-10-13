
const Radio = ({
  id,
  name,
  value,
  checked,
  label,
  onChange,
  className = "",
  disabled = false,
}) => {
  return (
    <label
      htmlFor={id}
      className={`art-relative art-flex art-cursor-pointer art-select-none art-items-center art-gap-3 art-text-sm art-font-medium ${
        disabled
          ? "art-text-gray-300 art-dark:text-gray-600 art-cursor-not-allowed"
          : "art-text-gray-700 art-dark:text-gray-400"
      } ${className}`} 
      style={{ color: "var(--theme-text)" }}
    >
      <input
        id={id}
        name={name}
        type="radio"
        value={value}
        checked={checked}
        onChange={onChange} // pass full event for handleSettingsChange
        className="art-sr-only"
        disabled={disabled}
        style={{ backgroundColor: "var(--theme-accent)", color: "var(--theme-text)" }}
        
      />
      <span
        className={`art-flex art-h-5 art-w-5 art-items-center art-justify-center art-rounded-full art-border-[1.25px]  ${
          checked
            ? "art-border-brand-500 art-bg-brand-500" 
            : "art-bg-transparent art-border-gray-300 art-dark:border-gray-700"
        } ${
          disabled
            ? "art-bg-gray-100 art-dark:bg-gray-700 art-border-gray-200 art-dark:border-gray-700"
            : ""
        }`} style={{ backgroundColor: "var(--theme-accent)", color: "var(--theme-text)" }}
      >
<span
  className={`art-relative art-inline-flex art-items-center art-justify-center ${
    checked ? "art-block" : "art-hidden"
  } art-h-4 art-w-4`}
>
  {/* Outer blue circle */}
  <span className="art-absolute art-h-full art-w-full art-rounded-full art-bg-blue-500"></span>
  
  {/* Inner white dot */}
  <span className="art-h-2 art-w-2 art-rounded-full art-bg-white"></span>
</span>

      </span>
      {label}
    </label>
  );
};

export default Radio;
