/**
 * Left navigation of the dashboard screens. Used for the dashboard tabs
 * (App) and the setup wizard steps (AR-72).
 *
 * @param {Array}  items    [{ key, label, href, active, onClick }]
 */
export default function SidebarNav({ items }) {
  return (
    <div
      className="art-w-60 art-border-r art-sticky art-top-[10vh] art-h-[90vh] art-overflow-y-auto"
      style={{
        backgroundColor: "var(--theme-bg)",
        color: "var(--theme-text)",
      }}
    >
      <nav className="art-flex art-flex-col art-space-y-0 art-p-4">
        {items.map((item) => (
          <a
            key={item.key}
            href={item.href || "#"}
            onClick={item.onClick}
            aria-current={item.active ? "page" : undefined}
            className={`art-whitespace-nowrap art-px-4 art-py-4 art-text-sm art-font-medium art-relative art-flex art-items-center art-no-underline art-transition-all art-duration-200 ${
              item.active
                ? "art-text-white"
                : "art-text-gray-300 hover:art-text-white hover:art-bg-black hover:art-bg-opacity-10"
            }`}
            style={{
              backgroundColor: item.active ? "rgb(59,130,246)" : "transparent",
              color: item.active ? "#ffffff" : "inherit",
              border: "none",
              outline: "none",
            }}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
