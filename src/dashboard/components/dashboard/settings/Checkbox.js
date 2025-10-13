import clsx from "clsx";

const Checkbox = ({
  label,
  checked,
  id,
  onChange = () => {},
  className = "",
  disabled = false,
  ...props
}) => {
  return (
    <label
      className={clsx(
        "art-flex art-items-center art-space-x-3 art-cursor-pointer art-text-gray-800 art-dark:text-gray-200",
        { "art-cursor-not-allowed art-opacity-50": disabled }
      )}
    >
      <div className="art-relative art-inline-flex art-shrink-0">
        <input
          id={id}
          type="checkbox"
          className={clsx(
            "art-peer art-appearance-none art-w-5 art-h-5 art-rounded art-border-2 art-border-gray-300 art-bg-white art-cursor-pointer",
            "art-transition-all art-duration-200 art-ease-in-out",
            "art-focus:ring-2 art-focus:ring-blue-500 art-focus:ring-offset-0 art-focus:outline-none",
            "art-dark:bg-gray-700 art-dark:border-gray-600",
            "checked:art-bg-blue-600 checked:art-border-blue-600 checked:art-dark:bg-blue-600",
            disabled && "art-cursor-not-allowed",
            className
          )}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          {...props}
        />
        
        <svg
          className={clsx(
            "art-absolute art-w-6 art-h-6 art-pointer-events-none art-left-0 art-top-[-1px]",
            "art-transition-opacity art-duration-200",
            checked ? "art-opacity-100" : "art-opacity-0"
          )}
          viewBox="0 0 19 25"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
           d="M9.6666 1.5L5.24992 8.91667L2.33325 6"
            stroke="white"
            strokeWidth="1.94437"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {label && <span className="art-text-sm art-font-medium">{label}</span>}
    </label>
  );
};

export default Checkbox;