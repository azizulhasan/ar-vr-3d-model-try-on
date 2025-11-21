import { useEffect, useState } from "react";

import Settings from "./components/dashboard/settings/Settings";
import { ToastContainer } from "react-toastify";
import Features from "./components/dashboard/Features/Features";
import Integration from "./components/dashboard/Integration/Integration";
import Documentation from "./components/dashboard/Documentation/Documentation";
import SpinnerModal from "../metabox/components/SpinnerModal";
import {
  getAPITypes,
  getURL,
  isDifferent,
  postWithoutImage,
} from "../context/utilities";
import toast from "../context/Notify";
import notify from "../context/Notify";
import "./theme.css";

export default function App() {
  const [activeTab, setActiveTab] = useState("Settings");
  const [authType, setAuthType] = useState("Bearer");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState("#ffffff");
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    ar_try_on_display_button_automatically: "yes",
    ar_try_on_allowed_post_types: ["post"],
    ar_try_on_wc_hook_position: "3",
    ar_try_on_single_product_tabs: "yes",
    ar_try_on_loading_type: "auto",
    ar_try_on_reveal_type: "auto",
    ar_try_on_poster_color: "rgba(78,186,79,0)",
    ar_try_on_ar: "activate",
    ar_try_on_ar_modes: ["webxr", "scene-viewer", "quick-look"],
    ar_try_on_ar_scale: "auto",
    ar_try_on_xr_environment: "activate",
    ar_try_on_ar_button: "deactivate",
    ar_try_on_ar_button_text: "Activate AR",
    ar_try_on_ar_button_background_color: "#3a3a3a",
    ar_try_on_ar_button_text_color: "#ffffff",
    ar_try_on_enable_qr_code: "yes",
    ar_try_on_clear_cache: false,
    ar_try_on_ar_demo: {},
    ar_try_on_exclude_integration_api_name: "",
    ar_try_on_exclude_integration_api_url: "",
    ar_try_on_exclude_integration_api_headers: [
      {
        key: "Authorization",
        value: "",
      },
      { key: "Content-Type", value: "application/json" },
    ],
  });
  const tabs = [
    { name: "Settings", href: "#", current: true, component: "Settings" },
    {
      name: "Integration",
      href: "#",
      current: false,
      component: "Integration",
    },
    { name: "Features", href: "#", current: false, component: "Features" },
    {
      name: "Documentation",
      href: "#",
      current: false,
      component: "Documentation",
    },
    {
      name: "Contact Us",
      href: "https://wpaugmentedreality.com/contact-us/",
      current: false,
      component: "Contact",
    },
  ];
  const [headers, setHeaders] = useState([]);
  const allApi = getAPITypes("all");
  const [currentApi, setCurrentAPI] = useState(
    getAPITypes(settings?.ar_try_on_exclude_integration_api_name || "tripo3d")
  );
  const [previousSettings, setPreviousSettings] = useState({});

  //DARK/LIGHT THEME ON DASHBOARD

  const applyTheme = (dark) => {
    if (dark) {
      document.documentElement.style.setProperty("--theme-bg", "#1e1e1e");
      document.documentElement.style.setProperty("--theme-text", "#ffffff");
      document.documentElement.style.setProperty("--theme-accent", "#333333");
    } else {
      document.documentElement.style.setProperty("--theme-bg", "#ffffff");
      document.documentElement.style.setProperty("--theme-text", "#000000");
      document.documentElement.style.setProperty("--theme-accent", "#e5e5e5");
    }
    localStorage.setItem("isDarkMode", dark ? "true" : "false");
  };


  useEffect(() => {
    const saved = localStorage.getItem("isDarkMode");
    const dark = saved === "true";
    setIsDarkMode(dark);
    applyTheme(dark);
  }, []);

  const handleThemeToggle = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    applyTheme(next);
  };

  useEffect(() => {
    /**
     * Get data from and display to table.
     */
    let formData = new FormData();
    formData.append("method", "get");
    postWithoutImage(getURL("settings"), formData).then((res) => {
      let finalSettings = { ...settings, ...res.data };
      if (!finalSettings?.ar_try_on_exclude_integration_api_name) {
        finalSettings.ar_try_on_exclude_integration_api_name = currentApi.id;
        finalSettings.ar_try_on_exclude_integration_api_url = currentApi.url;
        console.log(currentApi);
        console.log(finalSettings);
      }
      setSettings(finalSettings);
      setPreviousSettings(finalSettings);
    });
  }, []);

  const handleTabChange = (e, tab) => {
    e.preventDefault();
    if (tab.href !== "#") {
      window.open(tab.href, "_blank");
    } else {
      setActiveTab(tab.component);
    }
  };

  /**
   * handle change
   * @param {*} e
   */
  const handleChange = (e, targetName = "") => {
    let value = "";
    if (Array.isArray(e)) {
      value = e;

      if ( !ar_try_on.is_pro_active &&  targetName === "ar_try_on_allowed_post_types" && value.length > 1) {
        toast(
          "Multiple post type is only available in the pro version",
          "error"
        );
        return;
      }
      setSettings({
        ...settings,
        ...{ [targetName]: value },
      });
      return;
    } else {
      value = e.target.value;
    }

    if (targetName) {
      e.target.name = targetName;
    }

    if (e.target.name == "ar_try_on_ar_modes") {
      let status = e.target.checked;
      let clonedVal = JSON.parse(JSON.stringify(settings));
      let tempVal = clonedVal.ar_try_on_ar_modes;
      if (status) {
        tempVal.push(value);
        value = tempVal;
      } else {
        if (tempVal.includes(value)) {
          tempVal = tempVal.filter((item) => item != value);
        }
        value = tempVal;
      }
    }

    if (!e.target.name) return;

    if (

      e.target.name === "ar_try_on_exclude_integration_api_name" &&
      e.target.value !== "tripo3d" &&
      !ar_try_on.is_pro_active
    ) {
      notify("API switch is available in pro version", "warn");
      return;
    }


    console.log({ name: e.target.name, value });
    setSettings({
      ...settings,
      ...{ [e.target.name]: value },
    });
  };

  const handleHeaderChange = (index, field, value) => {
    const updated = [...settings.ar_try_on_exclude_integration_api_headers];
    updated[index][field] = value;
    if (field === "value" && updated[index]?.key === "Authorization") {
      setSettings({
        ...settings,
        ...{
          ar_try_on_exclude_integration_api_name: currentApi.id,
          ar_try_on_exclude_integration_api_url: currentApi.url,
        },
      });
    } else {
      setSettings({
        ...settings,
        ...{ ar_try_on_exclude_integration_api_headers: updated },
      });
    }
  };

  /**
   * Handle form Submit
   */
const handleSubmit = async (e) => {
  e.preventDefault();
  setIsSaving(true);

  try {
    let tempSettings = structuredClone(settings);

    if (
      tempSettings?.ar_try_on_exclude_integration_api_name &&
      tempSettings?.ar_try_on_exclude_integration_api_url
    ) {
      tempSettings.ar_try_on_exclude_integration_api_headers.forEach(
        (header, index) => {
          if (header.key === "" && header.value === "") {
            alert("Please fill all of the API headers with proper value");
            setIsSaving(false); 
            return;
          }

          if (header.key === "Authorization" && header.value === "") {
            tempSettings.ar_try_on_exclude_integration_api_name = "";
            tempSettings.ar_try_on_exclude_integration_api_url = "";
          } else if (header.value === "") {
            tempSettings.ar_try_on_exclude_integration_api_headers.splice(
              index,
              1
            );
          }
        }
      );
    }

    let hasValueChanged = isDifferent(previousSettings, tempSettings);
    if (!hasValueChanged) {
      notify("No changes detected", "info", {
        autoClose: 5000,
      });
      setIsSaving(false); 
      return;
    }

    let formData = new FormData();
    formData.append("fields", JSON.stringify(tempSettings));
    formData.append("method", "post");
    formData.append("has_value_changed", hasValueChanged);

    const res = await postWithoutImage(getURL("settings"), formData);

    setSettings(res.data);
    setPreviousSettings(res.data);
    toast("Successfully Saved.", "info");
  } catch (err) {
    console.log(err);
  } finally {
    setIsSaving(false);
  }
};

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />


      {/* Top Navbar */}
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
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="art-p-2 art-rounded-md art-text-gray-600 art-bg-gray-300 hover:art-bg-gray-100 art-focus:outline-none art-cursor-pointer"
          >
            {/* Hamburger Icon */}
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
          <h1 style={{ color: "var(--theme-text)" }}>AtlasAR</h1>

          <span className="art-text-center">Version: {ar_try_on.VERSION}</span>
        </div>
        <div></div>
        {/* 🌗 Dark/Light Mode Toggle */}
        <button
          onClick={handleThemeToggle}
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

      {/* Layout with Sidebar + Main */}
      <div className="art-flex art-h-full">
        {/* Sidebar */}
        {isSidebarOpen && (
          <div
            className="art-w-60 art-border-r art-sticky art-top-[10vh] art-h-[90vh] art-overflow-y-auto"
            style={{
              backgroundColor: "var(--theme-bg)",
              color: "var(--theme-text)",
            }}
          >
            <nav className="art-flex art-flex-col art-space-y-0 art-p-4">
              {tabs.map((tab) => (
                <a
                  key={tab.name}
                  href={tab.href}
                  onClick={(e) => handleTabChange(e, tab)}
                  aria-current={activeTab === tab.name ? "page" : undefined}
                  className={`art-whitespace-nowrap art-px-4 art-py-4 art-text-sm art-font-medium art-relative art-flex art-items-center art-no-underline art-transition-all art-duration-200 ${
                    activeTab === tab.name
                      ? "art-text-white"
                      : "art-text-gray-300 hover:art-text-white hover:art-bg-black hover:art-bg-opacity-10"
                  }`}
                  style={{
                    backgroundColor:
                      activeTab === tab.name
                        ? "rgb(59,130,246)"
                        : "transparent",
                    color: activeTab === tab.name ? "#ffffff" : "inherit",
                    border: "none",
                    outline: "none",
                  }}
                >
                  {tab.name}
                </a>
              ))}
            </nav>
          </div>
        )}

        {/* Main Content */}
        <div className="art-flex-1">
          {activeTab === "Settings" && (
            <Settings
              setHeaders={setHeaders}
              settings={settings}
              handleChange={handleChange}
            />
          )}
          {activeTab === "Features" && <Features />}
          {activeTab === "Integration" && (
            <Integration
              setCurrentAPI={setCurrentAPI}
              currentApi={currentApi}
              allApi={allApi}
              setSettings={setSettings}
              settings={settings}
              authType={authType}
              setAuthType={setAuthType}
              handleChange={handleChange}
              handleHeaderChange={handleHeaderChange}
            />
          )}
          {activeTab === "Documentation" && <Documentation />}

          {/* Submit Button */}
          {/* {activeTab !== "Documentation" && activeTab !== "Features" && (
      
       <button
       onClick={handleSubmit}
       className="art-block art-cursor-pointer art-w-full art-p-2 "
       style={{
           backgroundColor: "var(--theme-accent)",
           color: "var(--theme-text)",
           border: "1px solid var(--theme-accent)"
       }}
       >
       Save
       </button>


       )} */}

          {activeTab !== "Documentation" && activeTab !== "Features" && (
            <div
              className={`art-border-t art-shadow-lg art-z-50 art-transition-all art-duration-300 ${
                activeTab === "Integration"
                  ? "art-relative"
                  : `art-fixed art-bottom-0 art-right-0 ${
                      isSidebarOpen ? "art-left-[415px]" : "art-left-0"
                    }`
              }`}
              style={{
                backgroundColor: "var(--theme-bg)",
              }}
            >
<button
  onClick={handleSubmit}
  disabled={isSaving}
  className={`art-w-full art-bg-blue-500 art-text-white art-p-3 art-border-none art-rounded art-font-medium art-transition-colors hover:art-opacity-90 art-cursor-pointer ${
    isSaving ? "art-opacity-70 art-cursor-not-allowed" : ""
  }`}
>
  {isSaving ? (
    <div className="art-flex art-items-center art-justify-center art-gap-2">
      <SpinnerModal />
      <span>Saving...</span>
    </div>
  ) : (
    "Save"
  )}
</button>


            </div>
          )}
        </div>
      </div>
    </>
  );
}

