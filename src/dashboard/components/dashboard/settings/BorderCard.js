const BorderCard = ({ title, children, className = "" }) => {
  return (
    <div
      className={`art-p-4 art-rounded-2xl art-bg-white art-shadow-sm art-transition-all art-duration-200 hover:art-shadow-md art-space-y-3 ${className}`}
      style={{
        backgroundColor: "var(--theme-bg)",
        color: "var(--theme-text)",
        border: "1.5px solid var(--theme-border, rgba(100, 116, 139, 0.4))",
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      {title && (
        <h3 className="art-text-base art-font-semibold art-mb-2">{title}</h3>
      )}
      {children}
    </div>
  );
};

export default BorderCard;
