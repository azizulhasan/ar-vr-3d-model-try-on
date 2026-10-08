/**
 * Top bar of the dashboard screens: sidebar toggle, plugin name and
 * version, and the dark/light toggle. Shared by the dashboard (App) and
 * the setup wizard (AR-72). `children` goes after the version, `actions`
 * before the theme toggle.
 */
export default function TopNavbar({
  onToggleSidebar,
  isDarkMode,
  onToggleTheme,
  children,
  actions,
}) {
  return (
    <div
      className="art-w-full art-h-[10vh] art-flex art-justify-between art-items-center art-px-5 art-border-b art-sticky art-top-5 art-z-50 "
      style={{
        backgroundColor: "var(--theme-bg)",
        color: "var(--theme-text)",
      }}
    >
      <div className="art-flex art-items-center art-space-x-4">
        {/* Hamburger Button */}
        <button
          onClick={onToggleSidebar}
          className="art-p-2 art-rounded-md art-text-gray-600 art-bg-gray-300 hover:art-bg-gray-100 art-focus:outline-none art-cursor-pointer"
        >
          <svg
            className="art-h-4 art-w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <h1 style={{ color: "var(--theme-text)" }}>{ar_try_on.plugin_name}</h1>

        <span className="art-text-center">Version: {ar_try_on.VERSION}</span>
        {children}
      </div>
      <div className="art-flex art-items-center art-gap-4">
        {actions}
        {/* 🌗 Dark/Light Mode Toggle */}
        <button
          onClick={onToggleTheme}
          className="art-w-12 art-h-12 art-m-10 art-rounded-full art-flex art-items-center art-justify-center
 art-border-gray-100 art-transition-colors art-duration-300 hover:art-bg-gray-100 dark:hover:art-bg-gray-700 art-cursor-pointer"
          style={{
            backgroundColor: "transparent",
            color: "var(--theme-text)",
          }}
        >
          {isDarkMode ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="art-h-6 art-w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v1m0 16v1m8.66-12.66l-.7.7M4.05 19.95l-.7.7M21 12h1M2 12H1m16.95 7.95l-.7-.7M4.05 4.05l-.7-.7"
              />
              <circle cx="12" cy="12" r="4" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="art-h-6 art-w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
