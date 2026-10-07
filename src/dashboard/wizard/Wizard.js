import { useMemo, useRef, useState } from "react";
import { ToastContainer } from "react-toastify";
import { __, sprintf } from "@wordpress/i18n";
import TopNavbar from "../components/TopNavbar";
import SidebarNav from "../components/SidebarNav";
import useDashboardTheme from "../useDashboardTheme";
import SpinnerModal from "../../metabox/components/SpinnerModal";
import notify from "../../context/Notify";
import { getURL } from "../../context/utilities";
import ui from "../ui";
import { itemsFor, productPayload, selectedItem } from "./model";
import StepWhere from "./steps/StepWhere";
import StepModel from "./steps/StepModel";
import StepPreview from "./steps/StepPreview";
import StepLook from "./steps/StepLook";
import StepCompression from "./steps/StepCompression";
import StepTryOn from "./steps/StepTryOn";
import "../theme.css";

// `ar_try_on_settings` keys the wizard edits (the save route only accepts these).
const SETTING_KEYS = [
  "ar_try_on_display_button_automatically",
  "ar_try_on_allowed_post_types",
  "ar_try_on_wc_hook_position",
  "ar_try_on_single_product_tabs",
  "model_load_strategy",
  "ar_try_on_ar_button",
  "ar_try_on_ar_button_text",
  "ar_try_on_ar_button_background_color",
  "ar_try_on_ar_button_text_color",
  "ar_try_on_enable_qr_code",
  "ar_try_on_interaction_prompt",
  "ar_try_on_interaction_prompt_style",
  "tryon_snapshot",
  "tryon_button_label",
];

const DEFAULTS = {
  ar_try_on_display_button_automatically: "yes",
  ar_try_on_allowed_post_types: ["post"],
  ar_try_on_wc_hook_position: "product_image",
  ar_try_on_single_product_tabs: "yes",
  model_load_strategy: "interaction",
  ar_try_on_ar_button: "deactivate",
  ar_try_on_ar_button_text: "Activate AR",
  ar_try_on_ar_button_background_color: "#3a3a3a",
  ar_try_on_ar_button_text_color: "#ffffff",
  ar_try_on_enable_qr_code: "yes",
  ar_try_on_interaction_prompt: "auto",
  ar_try_on_interaction_prompt_style: "wiggle",
  tryon_snapshot: true,
  tryon_button_label: "Try it on",
};

/** First item of a post type, preferring one that already has a model. */
const firstItem = (data, postType) => {
  const items = itemsFor(data, postType);
  return items.find((p) => p.has_model) || items[0] || null;
};

const initialState = (data) => {
  const saved = data.settings || {};
  const settings = { ...DEFAULTS };
  SETTING_KEYS.forEach((key) => {
    if (saved[key] !== undefined && saved[key] !== null && saved[key] !== "") {
      settings[key] = saved[key];
    }
  });
  // Keep the AR modes for the preview only (not edited here).
  settings.ar_try_on_ar_modes = saved.ar_try_on_ar_modes;

  // Saved values (defaults where nothing is saved). Finish compares with
  // this, so suggestions below are saved even if left as they are.
  const baseline = { ...settings };

  // A brand-new WooCommerce store almost always wants products.
  if (data.free_state === "pending" && ar_try_on.is_wc_active && data.posts && data.posts.product) {
    settings.ar_try_on_allowed_post_types = ["product"];
  }

  const postType = (settings.ar_try_on_allowed_post_types || ["post"])[0];
  const item = firstItem(data, postType);
  const compression = data.compression || {};

  return {
    settings,
    baseline,
    postType,
    productId: item ? item.id : 0,
    modelSource: item && item.has_model ? "current" : "sample",
    libraryModel: null,
    libraryError: "",
    tryonMode: "keep",
    compression: { enabled: compression.enabled !== false, quality: compression.quality || 85 },
    pro: {},
  };
};

/**
 * Setup wizard (AR-72). Rendered by the dashboard entry instead of the
 * tabs when the page is opened with `&welcome=1` or `&welcome=pro`.
 */
export default function Wizard() {
  const data = ar_try_on.wizard;
  const mode = data.mode; // "full" | "pro"
  const [isDarkMode, toggleTheme] = useDashboardTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [state, setState] = useState(() => initialState(data));
  // Saved values at start; Finish writes only what differs from them.
  const startSettings = useRef(state.baseline);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(false);

  const update = (patch) => setState((prev) => ({ ...prev, ...patch }));

  const setSetting = (key, value) =>
    setState((prev) => {
      const next = { ...prev, settings: { ...prev.settings, [key]: value } };
      // Changing the post type changes which items step 2 offers.
      if (key === "ar_try_on_allowed_post_types") {
        const postType = (value && value[0]) || prev.postType;
        if (postType !== prev.postType) {
          const item = firstItem(data, postType);
          next.postType = postType;
          next.productId = item ? item.id : 0;
          next.modelSource = item && item.has_model ? "current" : "sample";
          next.tryonMode = "keep";
        }
      }
      return next;
    });

  const setPro = (patch) => setState((prev) => ({ ...prev, pro: { ...prev.pro, ...patch } }));

  const steps = useMemo(() => {
    const core = [
      { id: "where", label: __("Where to show", "ar-vr-3d-model-try-on"), intro: __("Choose where AR and 3D appear. These are the same settings as Settings → General.", "ar-vr-3d-model-try-on"), Component: StepWhere },
      { id: "model", label: __("First 3D model", "ar-vr-3d-model-try-on"), intro: __("One model is enough to see AtlasAR working.", "ar-vr-3d-model-try-on"), Component: StepModel },
      { id: "preview", label: __("Preview & AR", "ar-vr-3d-model-try-on"), intro: __("This is what shoppers get.", "ar-vr-3d-model-try-on"), Component: StepPreview },
      { id: "look", label: __("Loading & AR button", "ar-vr-3d-model-try-on"), intro: __("Page speed and the AR button. Each item can still override these.", "ar-vr-3d-model-try-on"), Component: StepLook },
      { id: "compression", label: __("Compression", "ar-vr-3d-model-try-on"), intro: __("Smaller model files load faster for shoppers.", "ar-vr-3d-model-try-on"), Component: StepCompression },
      { id: "tryon", label: __("Virtual Try-On", "ar-vr-3d-model-try-on"), intro: __("Optional. For stores that sell glasses or hats.", "ar-vr-3d-model-try-on"), Component: StepTryOn },
    ];

    /**
     * Filter: atlasAr.wizard.steps
     *
     * Add steps to the setup wizard. Each step is
     * { id, label, intro, pro, after, Component }, where Component
     * receives { state, update, setSetting, setPro, data, ui } and is
     * built with the `ui` kit (this plugin's components and React).
     * `after` places the step after the step with that id.
     */
    const filtered = window.wp && wp.hooks
      ? wp.hooks.applyFilters("atlasAr.wizard.steps", core, ui, { mode })
      : core;

    const ordered = [];
    filtered.forEach((s) => {
      if (!s.after) {
        ordered.push(s);
      }
    });
    filtered.forEach((s) => {
      if (s.after) {
        const at = ordered.findIndex((o) => o.id === s.after);
        at === -1 ? ordered.push(s) : ordered.splice(at + 1, 0, s);
      }
    });

    return mode === "pro" ? ordered.filter((s) => s.pro) : ordered;
  }, [mode]);

  const save = async (status) => {
    const body = { mode, status };
    if (status === "done") {
      if (mode === "full") {
        // Only what the merchant changed, so values they never touched
        // are not written (existing sites keep exactly what they had).
        const start = startSettings.current;
        const settings = {};
        SETTING_KEYS.forEach((key) => {
          if (JSON.stringify(state.settings[key]) !== JSON.stringify(start[key])) {
            settings[key] = state.settings[key];
          }
        });
        body.settings = settings;
        body.compression = state.compression;
        const product = productPayload(state, data);
        if (product) {
          body.product = product;
        }
      }
      body.pro = state.pro;
    }

    const response = await fetch(getURL("wizard"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-WP-Nonce": ar_try_on.rest_nonce,
      },
      body: JSON.stringify(body),
    });
    const json = await response.json();
    if (!response.ok || !json || !json.status) {
      throw new Error((json && json.message) || "Save failed");
    }
    return json;
  };

  const finish = async () => {
    setSaving(true);
    try {
      await save("done");
      setFinished(true);
      window.scrollTo(0, 0);
    } catch (e) {
      notify(__("Your setup could not be saved. Please try again.", "ar-vr-3d-model-try-on"), "error");
    } finally {
      setSaving(false);
    }
  };

  const skip = async () => {
    try {
      await save("skipped");
    } catch (e) {
      // Leaving the wizard matters more than the flag.
    }
    window.location.href = data.dashboard_url;
  };

  const total = steps.length;
  const current = steps[step];
  const isLast = step === total - 1;
  const item = selectedItem(state, data);

  const navItems = steps.map((s, i) => ({
    key: s.id,
    label: (
      <>
        <span className="art-inline-flex art-justify-center art-mr-2" style={{ width: "1.25rem" }}>
          {i < step || finished ? "✓" : i + 1}
        </span>
        {s.label}
      </>
    ),
    active: !finished && i === step,
    onClick: (e) => {
      e.preventDefault();
      if (!finished && i <= step) {
        setStep(i);
      }
    },
  }));

  return (
    <>
      <ToastContainer position="top-right" autoClose={5000} />

      <TopNavbar
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        actions={
          !finished && (
            <button
              type="button"
              onClick={skip}
              className="art-bg-transparent art-border-none art-underline art-cursor-pointer art-text-sm"
              style={{ color: "var(--theme-text)" }}
            >
              {__("Skip setup", "ar-vr-3d-model-try-on")}
            </button>
          )
        }
      />

      <div className="art-flex art-h-full">
        {isSidebarOpen && total > 0 && <SidebarNav items={navItems} />}

        <div className="art-flex-1">
          {/* Step header — same look as the Settings subtabs */}
          <div
            className="art-border-b art-border-gray-200 art-mb-6"
            style={{ backgroundColor: "var(--theme-bg)", borderBottom: "1px solid var(--theme-accent)" }}
          >
            <nav className="art-flex art-items-center art-justify-between art-px-6">
              <span
                className="art-py-4 art-px-1 art-border-b-2 art-font-medium art-text-sm"
                style={{ color: "rgb(59,130,246)", borderBottomColor: "rgb(59,130,246)" }}
              >
                {mode === "pro" ? __("AtlasAR Pro setup", "ar-vr-3d-model-try-on") : __("Setup", "ar-vr-3d-model-try-on")}
              </span>
              <span className="art-text-sm" style={{ color: "var(--theme-text)" }}>
                {finished
                  ? __("Setup complete", "ar-vr-3d-model-try-on")
                  : total
                  ? sprintf(/* translators: 1: step number, 2: number of steps */ __("Step %1$d of %2$d", "ar-vr-3d-model-try-on"), step + 1, total)
                  : ""}
              </span>
            </nav>
          </div>

          <div className="art-px-6 art-pb-6" style={{ paddingBottom: finished ? undefined : "90px" }}>
            <div
              className="art-p-4 art-bg-gray-100 art-space-y-6"
              style={{ backgroundColor: "var(--theme-bg)", color: "var(--theme-text)", border: "1px solid #ccc" }}
            >
              {finished ? (
                <Finish mode={mode} item={item} data={data} />
              ) : !current ? (
                <p className="art-text-base">
                  {__("There is nothing to set up here yet.", "ar-vr-3d-model-try-on")}{" "}
                  <a href={data.dashboard_url}>{__("Go to the dashboard", "ar-vr-3d-model-try-on")}</a>
                </p>
              ) : (
                <>
                  {step === 0 && data.free_state === "legacy" && mode === "full" && (
                    <p className="art-text-sm art-rounded art-p-3 art-bg-blue-50 art-text-gray-700">
                      {__("We filled this in from your current settings. Nothing changes on your site until you press Finish setup.", "ar-vr-3d-model-try-on")}
                    </p>
                  )}
                  {step === 0 && mode === "pro" && (
                    <div className="art-border art-border-amber-200 art-bg-amber-50 art-rounded art-p-4 art-text-sm art-text-slate-800">
                      {__("Thanks for upgrading. Your free setup is already done, so this only covers what AtlasAR Pro adds.", "ar-vr-3d-model-try-on")}
                    </div>
                  )}
                  <div>
                    <h3 className="art-text-xl art-font-semibold art-flex art-items-center art-gap-2" style={{ color: "var(--theme-text)" }}>
                      {current.label}
                    </h3>
                    {current.intro && <p className="art-text-sm art-text-gray-500">{current.intro}</p>}
                  </div>
                  <current.Component
                    state={state}
                    update={update}
                    setSetting={setSetting}
                    setPro={setPro}
                    data={data}
                    ui={ui}
                  />
                </>
              )}
            </div>
          </div>

          {!finished && total > 0 && (
            <div
              className={`art-border-t art-shadow-lg art-z-50 art-transition-all art-duration-300 art-fixed art-bottom-0 art-right-0 art-flex ${
                isSidebarOpen ? "art-left-[415px]" : "art-left-0"
              }`}
              style={{ backgroundColor: "var(--theme-bg)" }}
            >
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="art-w-48 art-bg-gray-300 art-text-gray-700 art-p-3 art-border-none art-font-medium art-cursor-pointer hover:art-opacity-90"
                >
                  ← {__("Back", "ar-vr-3d-model-try-on")}
                </button>
              )}
              <button
                type="button"
                disabled={saving}
                onClick={() => (isLast ? finish() : setStep(step + 1))}
                className={`art-w-full art-bg-blue-500 art-text-white art-p-3 art-border-none art-rounded art-font-medium art-transition-colors hover:art-opacity-90 art-cursor-pointer ${
                  saving ? "art-opacity-70 art-cursor-not-allowed" : ""
                }`}
              >
                {saving ? (
                  <div className="art-flex art-items-center art-justify-center art-gap-2">
                    <SpinnerModal />
                    <span>{__("Saving...", "ar-vr-3d-model-try-on")}</span>
                  </div>
                ) : isLast ? (
                  __("Finish setup", "ar-vr-3d-model-try-on")
                ) : (
                  sprintf(/* translators: %s: next step name */ __("Next: %s", "ar-vr-3d-model-try-on"), steps[step + 1].label) + " →"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * Last screen, same look as Overview → Welcome.
 */
function Finish({ mode, item, data }) {
  return (
    <div className="art-space-y-6">
      <div>
        <h2 className="art-text-4xl art-font-bold art-mb-4" style={{ color: "var(--theme-text)" }}>
          {mode === "pro"
            ? __("AtlasAR Pro is ready", "ar-vr-3d-model-try-on")
            : __("You're all set", "ar-vr-3d-model-try-on")}
        </h2>
        <p className="art-text-base art-leading-relaxed" style={{ color: "var(--theme-text)" }}>
          {mode === "pro"
            ? __("Your existing settings stayed as they were. Only the Pro choices you made were added.", "ar-vr-3d-model-try-on")
            : __("Your settings are saved. You can change any of them later in Settings, or run this setup again from the Overview tab.", "ar-vr-3d-model-try-on")}
        </p>
      </div>
      <div className="art-flex art-gap-4 art-flex-wrap">
        {item && item.view_url && (
          <a
            href={item.view_url}
            target="_blank"
            rel="noopener noreferrer"
            className="art-px-6 art-py-3 art-rounded-md art-font-medium art-text-white art-bg-orange-500 hover:art-bg-orange-600 hover:art-text-white art-transition-colors art-no-underline art-cursor-pointer"
          >
            {sprintf(/* translators: %s: item title */ __("View %s", "ar-vr-3d-model-try-on"), item.title)} ↗
          </a>
        )}
        <a
          href={data.dashboard_url}
          className="art-px-6 art-py-3 art-rounded-md art-font-medium art-text-white art-bg-blue-500 hover:art-bg-blue-600 hover:art-text-white art-transition-colors art-no-underline art-cursor-pointer"
        >
          {__("Go to dashboard", "ar-vr-3d-model-try-on")}
        </a>
      </div>
    </div>
  );
}
