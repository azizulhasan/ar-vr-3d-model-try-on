import { useEffect, useState } from "react";

import OverviewWrapper from "./components/dashboard/overview/OverviewWrapper";
import SettingsWrapper from "./components/dashboard/settings/SettingsWrapper";
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
import TopNavbar from "./components/TopNavbar";
import SidebarNav from "./components/SidebarNav";
import useDashboardTheme from "./useDashboardTheme";

export default function App() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [authType, setAuthType] = useState("Bearer");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, handleThemeToggle] = useDashboardTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    ar_try_on_display_button_automatically: "yes",
    ar_try_on_allowed_post_types: ["post"],
    ar_try_on_wc_hook_position: "product_image",
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
    // Virtual Try-On (face-glasses / face-hat) — same option, prefixed
    // sub-keys. See Free's AR_TRY_ON_Tryon class.
    tryon_self_host: false,
    tryon_snapshot: true,
    tryon_button_label: "Try it on",
    tryon_consent_text:
      "Allow camera access to try this product on virtually. Video stays on your device.",
  });
  const tabs = [
     { name: "Overview", href: "#", current: true, component: "Overview" },
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
      // Deep-copy the baseline so it can never share nested object
      // references with `settings` (defense-in-depth for change detection).
      setPreviousSettings(structuredClone(finalSettings));
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

    // AR-69: Free may switch the 3D-generation provider between the
    // providers whose free (text_to_model) tier we support — Tripo3D
    // and Meshy AI. Any other provider still requires Pro. image_to_model
    // stays Pro-only regardless of provider (enforced by the metabox
    // dropdown via generation_supported_modes and server-side in
    // AR_TRY_ON_Api_Routes::generate_3d_model).
    if (
      e.target.name === "ar_try_on_exclude_integration_api_name" &&
      !["tripo3d", "meshy_ai"].includes(e.target.value) &&
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
    // AR-69 fix: immutable update. The old code did
    // `updated[index][field] = value` on a SHALLOW-copied array, which
    // mutated the same header object that `previousSettings` (the
    // change-detection baseline) also references. Editing a header value
    // (e.g. the Authorization API key) therefore changed the baseline in
    // place, so Save reported "No changes detected". Building brand-new
    // header objects leaves the baseline untouched so the diff is real.
    const updated = settings.ar_try_on_exclude_integration_api_headers.map(
      (header, i) => (i === index ? { ...header, [field]: value } : header)
    );
    const next = {
      ...settings,
      ar_try_on_exclude_integration_api_headers: updated,
    };
    // Editing the Authorization value re-asserts the selected provider's
    // name + URL (preserves the original behaviour).
    if (field === "value" && updated[index]?.key === "Authorization") {
      next.ar_try_on_exclude_integration_api_name = currentApi.id;
      next.ar_try_on_exclude_integration_api_url = currentApi.url;
    }
    setSettings(next);
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
    setPreviousSettings(structuredClone(res.data));
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
      <TopNavbar
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isDarkMode={isDarkMode}
        onToggleTheme={handleThemeToggle}
      />

      {/* Layout with Sidebar + Main */}
      <div className="art-flex art-h-full">
        {/* Sidebar */}
        {isSidebarOpen && (
          <SidebarNav
            items={tabs.map((tab) => ({
              key: tab.name,
              label: tab.name,
              href: tab.href,
              active: activeTab === tab.name,
              onClick: (e) => handleTabChange(e, tab),
            }))}
          />
        )}

        {/* Main Content */}
        <div className="art-flex-1">
              {activeTab === "Overview" && <OverviewWrapper />}
          {activeTab === "Settings" && (
            <SettingsWrapper
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

          {activeTab !== "Documentation" && activeTab !== "Features" && activeTab !== "Overview" && (
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

