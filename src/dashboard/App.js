import { useEffect, useState } from "react";

import Settings from "./components/dashboard/settings/Settings";
import { ToastContainer } from "react-toastify";
import Features from "./components/dashboard/Features/Features";
import Integration from "./components/dashboard/Integration/Integration";
import Documentation from "./components/dashboard/Documentation/Documentation";
import { getAPITypes, getURL, postWithoutImage } from "../context/utilities";
import toast from '../context/Notify';
import notify from "../context/Notify";

export default function App() {
  const [activeTab, setActiveTab] = useState('Settings');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [authType, setAuthType] = useState("Bearer");
  const [settings, setSettings] = useState({
    ar_try_on_display_button_automatically: 'yes',
    ar_try_on_allowed_post_types: ['post'],
    ar_try_on_wc_hook_position: "3",
    ar_try_on_single_product_tabs: "yes",
    ar_try_on_loading_type: "auto",
    ar_try_on_reveal_type: "auto",
    ar_try_on_poster_color: "rgba(78,186,79,0)",
    ar_try_on_ar: "activate",
    ar_try_on_ar_modes: ["webxr", 'scene-viewer', "quick-look"],
    ar_try_on_ar_scale: "auto",
    ar_try_on_xr_environment: "activate",
    ar_try_on_ar_button: "deactivate",
    ar_try_on_ar_button_text: "Activate AR",
    ar_try_on_ar_button_background_color: "#3a3a3a",
    ar_try_on_ar_button_text_color: "#ffffff",
    ar_try_on_enable_qr_code: 'yes',
    ar_try_on_clear_cache: false,
    ar_try_on_ar_demo: {},
    ar_try_on_exclude_integration_api_name: '',
    ar_try_on_exclude_integration_api_url: '',
    ar_try_on_exclude_integration_api_headers: [
      {
        key: "Authorization",
        value: ""
      },
      { key: 'Content-Type', value: 'application/json' },
    ],
  });
  const tabs = [
    { name: 'Settings', href: '#', current: true, component: 'Settings' },
    { name: 'Integration', href: '#', current: false, component: 'Integration' },
    { name: 'Features', href: '#', current: false, component: 'Features' },
    { name: 'Documentation', href: '#', current: false, component: 'Documentation' },
    { name: 'Contact Us', href: 'https://wpaugmentedreality.com/contact-us/', current: false, component: 'Contact' },
  ]
  const [headers, setHeaders] = useState([]);
  const allApi = getAPITypes('all');
  const [currentApi, setCurrentAPI] = useState(getAPITypes(settings?.ar_try_on_exclude_integration_api_name || 'tripo3d'))

  useEffect(() => {
    let formData = new FormData();
    formData.append('method', 'get');
    postWithoutImage(getURL('settings'), formData).then(
      (res) => {
        let finalSettings = { ...settings, ...res.data };
        if (!finalSettings?.ar_try_on_exclude_integration_api_name) {
          finalSettings.ar_try_on_exclude_integration_api_name = currentApi.id
          finalSettings.ar_try_on_exclude_integration_api_url = currentApi.url
        }
        setSettings(finalSettings);
      });
  }, []);

  function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
  }

  const handleTabChange = (e, tab) => {
    e.preventDefault();
    if (tab.href !== '#') {
      window.open(tab.href, '_blank')
    } else {
      setActiveTab(tab.component)
    }
  }

  const handleChange = (e, targetName = '') => {
    let value = '';
    if (Array.isArray(e)) {
      value = e;
      if (targetName === 'ar_try_on_allowed_post_types' && value.length > 1) {
        toast('Multiple post type is only available in the pro version', 'error')
        return;
      }
      setSettings({
        ...settings,
        ...{ [targetName]: value },
      });
      return;
    } else {
      value = e.target.value
    }

    if (targetName) {
      e.target.name = targetName;
    }

    if (e.target.name == 'ar_try_on_ar_modes') {
      let status = e.target.checked
      let clonedVal = JSON.parse(JSON.stringify(settings));
      let tempVal = clonedVal.ar_try_on_ar_modes
      if (status) {
        tempVal.push(value)
        value = tempVal
      } else {
        if (tempVal.includes(value)) {
          tempVal = tempVal.filter(item => item != value);
        }
        value = tempVal
      }
    }

    if (!e.target.name) return;

    if (e.target.name === 'ar_try_on_exclude_integration_api_name' && e.target.value !== 'tripo3d') {
      notify('API switch is available in pro version', 'warn')
      return;
    }

    setSettings({
      ...settings,
      ...{ [e.target.name]: value },
    });
  };

  const handleHeaderChange = (index, field, value) => {
    const updated = [...settings.ar_try_on_exclude_integration_api_headers];
    updated[index][field] = value;
    if (field === 'value' && updated[index]?.key === 'Authorization') {
      setSettings({
        ...settings, ...{
          ar_try_on_exclude_integration_api_name: currentApi.id,
          ar_try_on_exclude_integration_api_url: currentApi.url
        }
      })
    } else {
      setSettings({ ...settings, ...{ ar_try_on_exclude_integration_api_headers: updated } })
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let tempSettings = structuredClone(settings);

    if (tempSettings?.ar_try_on_exclude_integration_api_name && tempSettings?.ar_try_on_exclude_integration_api_url) {
      tempSettings.ar_try_on_exclude_integration_api_headers.forEach((header, index) => {
        if (header.key === '' && header.value === '') {
          alert('Please fill all of the API headers with proper value');
          return;
        }

        if (header.key === 'Authorization' && header.value === '') {
          tempSettings.ar_try_on_exclude_integration_api_name = '';
          tempSettings.ar_try_on_exclude_integration_api_url = '';
        } else if (header.value === '') {
          tempSettings.ar_try_on_exclude_integration_api_headers.splice(index, 1);
        }
      });
    }

    let formData = new FormData();
    formData.append('fields', JSON.stringify(tempSettings));
    formData.append('method', 'post');
    postWithoutImage(getURL('settings'), formData)
      .then((res) => {
        setSettings(res.data);
        toast('Successfully Saved.', 'info')
      })
      .catch((err) => {
        console.log(err);
      });
  };

  return (
    <div className="art-flex art-h-screen art-bg-white">
      {/* Inline CSS for the triangle indicator */}
      <style>{`
        /* Container class for targeting */
        .art-sidenav { overflow: visible; }

        /* anchor nav link basics (we also use tailwind-like 'art-' classes on them) */
        .art-sidenav .art-nav-link {
          position: relative;
          display: flex;
          align-items: center;
          text-decoration: none;
          color: inherit;
        }

        /* active background (kept in sync with inline tailwind classes) */
        .art-sidenav .art-nav-link.active {
          background: #1E4D4F;
          font-weight: 700;
        }

        /* Only show the arrow when sidebar is open (we add art-sidenav-open to the container) */
        .art-sidenav.art-sidenav-open .art-nav-link.active::after {
          content: "";
          position: absolute;
          right: -22px; /* push into the main content */
          top: 50%;
          transform: translateY(-50%);
          width: 0;
          height: 0;
          border-top: 18px solid transparent;
          border-bottom: 18px solid transparent;

          z-index: 10;
          /* small shadow to match the “elevated” look */
          filter: drop-shadow(0 1px 0 rgba(0,0,0,0.06));
        }

        /* smaller overlay triangle (sidebar-colored) to create the corner/cut look */
        .art-sidenav.art-sidenav-open .art-nav-link.active::before {
          content: "";
          position: absolute;
          right: -13px; /* slightly left so it sits on top of the white triangle */
          top: 50%;
          transform: translateY(-50%);
          width: 0;
          height: 0;
          border-top: 13px solid transparent;
          border-bottom: 13px solid transparent;
          border-left: 13px solid #1E4D4F; /* same as active sidebar bg */
          z-index: 11;
        }

        /* hide the triangle when sidebar is collapsed */
        .art-sidenav:not(.art-sidenav-open) .art-nav-link.active::after,
        .art-sidenav:not(.art-sidenav-open) .art-nav-link.active::before {
          display: none;
        }
      `}</style>

      {/* Sidebar */}
      <div
        className={`art-bg-[#005e63] art-text-white art-h-full art-transition-all art-sidenav ${isSidebarOpen ? "art-w-64 art-sidenav-open" : "art-w-14"}`}
        style={{ overflow: "visible" /* ensure the arrow can overflow to the right */ }}
      >
        {/* Hamburger */}
        <div
          className="art-flex art-items-center art-justify-between art-p-4 art-cursor-pointer"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <button className="art-font-bold art-bg-[#005e63] art-text-white art-border-blue-200">☰</button>
        </div>

        {/* Tabs */}
        <nav className="art-mt-4">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.component;
            return (
              <a
                key={tab.name}
                href={tab.href}
                onClick={(e) => handleTabChange(e, tab)}
                className={`art-nav-link ${isActive ? "active" : ""} art-flex art-items-center art-px-4 art-py-3 art-cursor-pointer ${isActive ? "art-bg-[#1E4D4F] art-font-bold" : "art-hover:bg-[#1E4D4F]"}`}
                aria-current={isActive ? "page" : undefined}
              >
                {isSidebarOpen ? (
                  <span className="art-flex-1">{tab.name}</span>
                ) : (
                  // when collapsed, you can show the first letter or an icon if you have one
                  <span className="art-block art-w-full art-text-center" title={tab.name}>
                    {tab.name.charAt(0)}
                  </span>
                )}
              </a>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="art-flex-1 art-flex art-flex-col">
        {/* Top Bar */}
        <div className="art-bg-[#005e63] art-text-white art-flex art-justify-between art-items-center art-p-6">
          <div>AtlasAR Version: 1.6.0</div>

        </div>

        {/* Content */}
        <div className="art-p-6 art-overflow-auto art-flex-1">
          {activeTab === "Settings" && (
            <Settings setHeaders={setHeaders} settings={settings} />
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
            />
          )}
          {activeTab === "Documentation" && <Documentation />}
        </div>

        {/* Save button */}
        {activeTab !== "Documentation" && (
          <div className="art-p-4">
            <button
              onClick={handleSubmit}
              className="art-w-full art-p-2 art-rounded art-bg-blue-500 art-text-white"
            >
              Save
            </button>
          </div>
        )}
      </div>

      <ToastContainer />
    </div>
  );
}
