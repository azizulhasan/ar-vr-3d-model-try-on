import React from "react";

const SpinnerModalIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="40"
    height="40"
    viewBox="0 0 20 20"
    className="art-animate-spin"
    fill="currentColor"
  >
    <path d="M10 2c-4.4 0-8 3.6-8 8H0l3 3 3-3H4c0-3.3 2.7-6 6-6 1.7 0 3.2.7 4.3 1.8l1.4-1.4C14.5 2.8 12.4 2 10 2zm7 5l-3 3h2c0 3.3-2.7 6-6 6-1.7 0-3.2-.7-4.3-1.8L3.3 15.6C5.5 17.2 7.7 18 10 18c4.4 0 8-3.6 8-8h2l-3-3z" />
  </svg>
);

const SpinnerModal = ({ isVisible, message = "Saving… Please wait" }) => {
  if (!isVisible) return null;

  return (
    <div
      className="art-fixed art-inset-0 art-bg-black art-bg-opacity-50 art-flex art-items-center art-justify-center art-z-[9999]"
      style={{ backdropFilter: "blur(2px)" }}
    >
      <div className="art-bg-gray-900 art-text-white art-p-10 art-rounded-xl art-flex art-flex-col art-items-center art-justify-center art-space-y-4 art-shadow-2xl">
        <SpinnerModalIcon />
        <p className="art-text-lg art-font-medium">{message}</p>
      </div>
    </div>
  );
};

export default SpinnerModal;