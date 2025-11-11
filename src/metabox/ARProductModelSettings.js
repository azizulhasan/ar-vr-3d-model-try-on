import React, { useState, useEffect } from "react";
import {
  getPostID,
  getURL,
  postWithoutImage,
  copyshortcode,
  getAPITypes,
  isDifferent,
} from "../context/utilities";
import ContentSection from "./components/ContentSection.js";
import CameraSection from "./components/CameraSection.js";
import LightEnvironmentSection from "./components/LightEnvrionmentSection.js";
import StyleSection from "./components/StyleSection.js";
import IntegrationSection from "./components/IntegrationSection.js";
import DimensionsSection from "./components/DimensionsSection.js";
import HotspotsSection from "./components/HotspotsSection.js";
import notify from "../context/Notify";
import { ToastContainer } from "react-toastify";
import SliderSection from "./components/SliderSection.js";

const ARProductModelSettings = () => {
  const [basicSettings, setBasicSettings] = useState({
    src: "upload",
    poster: "upload",
    environment_source_type: "upload",
    skybox_source_type: "upload",
    ios_src: "upload",
  });
  const [productModel, setProductModel] = useState({
    src: "",
    ios_src: "",
    poster: "",
    alt: "Title",
    ar_placement: "floor",
    // light & environment settings
    skybox_image: "",
    environment_image: "",
    // Camera settings
    auto_rotate: false,
    shadow_intensity: "1",
    camera_orbit: "45deg 55deg 4m",
    disable_zoom: false,
    disable_tap: false,
    // Canvas settings
    canvas_alignment: "",
    canvas_width: "",
    canvas_height: "",
    canvas_margin: "",
    canvas_padding: "",
    custom_css: "",
    // Integration settings
    exclude_integration_api_body: [],
    exclude_integration_api_model_type: "text_to_model",
    dimensions: {
      show: true,
      unit: "cm",
      width: { value: 4, unit: "cm" },
      height: { value: 10, unit: "cm" },
      length: { value: 5, unit: "cm" },
    },
    hotspots: [],
  });

  const { dimensions = {} } = productModel;
  const {
    width = { value: 0 },
    height = { value: 0 },
    length = { value: 0 },
    unit = "cm",
    show = true,
  } = dimensions;



  const [currentValue, setCurrentValue] = useState({});
  const [isProductModelLoaded, setIsProductModelLoad] = useState(false);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  // Accordion state
  const [activeSection, setActiveSection] = useState("settings");
  const [activeAccordion, setActiveAccordion] = useState({
    content: false,
    camera: false,
    advance: false,
    dimensions: false,
    hotspots: false,
  });
  const [styleAccordion, setStyleAccordion] = useState({
    canvas: false,
    advance: false,
  });

  const [settings, setSettings] = useState({});

  const [currentApi, setCurrentAPI] = useState(getAPITypes("tripo3d"));
  const [previousProductModel, setPreviousProductModel] = useState(
    getAPITypes({})
  );

  // integration settings:
  const addIntegrationField = () => {
    setProductModel((prev) => ({
      ...prev,
      exclude_integration_api_body: [
        ...prev.exclude_integration_api_body,
        { key: "", value: "", type: "text" },
      ],
    }));
  };

  const removeIntegrationField = (index) => {
    setProductModel((prev) => ({
      ...prev,
      exclude_integration_api_body: prev.exclude_integration_api_body.filter(
        (_, i) => i !== index
      ),
    }));
  };

  const handleIntegrationChange = (index, name, value) => {
    setProductModel((prev) => {
      const updated = [...prev.exclude_integration_api_body];
      updated[index][name] = value;
      return { ...prev, exclude_integration_api_body: updated };
    });
  };

  const toggleStyleAccordion = (section) => {
    setStyleAccordion((prev) => ({
      canvas: false,
      advance: false,
      [section]: !prev[section],
    }));
  };

  const toggleAccordion = (section) => {
    setActiveAccordion((prev) => ({
      content: false,
      camera: false,
      advance: false,
      [section]: !prev[section],
    }));
  };

  const toggleSection = (e, section) => {
    e.preventDefault();
    setActiveSection(section);
  };

  const handleChange = (e) => {
    let value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    if (!e.target.name) return;

    if (
      e.target.name === "ar_try_on_ar_placement" &&
      value !== "wall" &&
      value !== "floor" &&
      !ar_try_on.is_pro_active
    ) {
      notify("This option is only available in the pro version", "warn", {
        autoClose: 5000,
      });
      return;
    }

    if (
      !ar_try_on.is_pro_active &&
      e.target.name === "exclude_integration_api_model_type" &&
      e.target.value === "image_to_model"
    ) {
      notify(
        "Image to model generation is only available in pro version!",
        "warn",
        {
          autoClose: 5000,
        }
      );
      return;
    }

    if (e.target.name === "dimensions") {
      let tempProductModel = structuredClone(productModel);
      let dimensions = tempProductModel.dimensions;
      dimensions.show = e.target.checked;
      value = dimensions;
    }
    let key = e.target.name;
    if (key === "unit") {
      let tempProductModel = structuredClone(productModel);
      let dimensions = tempProductModel.dimensions;
      dimensions.unit = e.target.value;
      value = dimensions;
      key = 'dimensions'
    }
    const productModelData = {
      ...productModel,
      [key]: value,
    };
    setProductModel(productModelData);
    wp.hooks.doAction("atlas_ar_preview_data", productModelData);
  };

  const onUpdateDimension = (key, value) => {
    setProductModel((prev) => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        [key]: value,
      },
    }));
  };

  const handleMediaButtonClick = (fieldName, value) => {
    setBasicSettings((prev) => ({ ...prev, ...{ [fieldName]: value } }));
    let inputField = document.getElementById(fieldName);
    wp.hooks.doAction("atlas_ar_select_light_and_envirement_files", {
      name: fieldName,
      field: inputField,
    });
  };

  useEffect(() => {
    if (wp?.hooks) {
      wp.hooks.addAction(
        "atlas_ar_on_select_model_file",
        "ar_try_on",
        function (val) {
          setCurrentValue(val);
        }
      );
    }
  }, [wp.hooks]);

  useEffect(() => {
    if (Object.keys(currentValue).length) {
      const productModelData = {
        ...productModel,
        [currentValue.name]: currentValue.url,
        sizes: currentValue?.sizes || [],
      };
      setProductModel(productModelData);
      wp.hooks.doAction("atlas_ar_preview_data", productModelData);
    }
  }, [currentValue]);

  useEffect(() => {
    /**
     * Get data from and display to table.
     */
    let formData = new FormData();
    formData.append("method", "get");
    postWithoutImage(getURL("settings"), formData).then((res) => {
      let tempCurrentAPI = getAPITypes(
        res.data.ar_try_on_exclude_integration_api_name || "tripo3d"
      );

      console.log({
        name: res.data.ar_try_on_exclude_integration_api_name,
        tempCurrentAPI,
      });
      setCurrentAPI(tempCurrentAPI);

      setSettings({ ...settings, ...res.data });
      setIsSettingsLoaded(true);
    });
  }, []);

  useEffect(() => {
    let InterVal = setInterval(() => {
      if (document.getElementById("atlas_ar_preview") && isSettingsLoaded) {
        clearInterval(InterVal);
        const postId = getPostID();
        let formData = new FormData();
        formData.append("post_id", postId);
        formData.append("call_from", "admin");
        postWithoutImage(getURL("get_model_and_settings"), formData).then(
          (res) => {
            const productModelData = {
              ...productModel,
              ...res.data,
            };

            if (!productModelData?.exclude_integration_api_model_type) {
              productModelData.exclude_integration_api_model_type =
                "text_to_model";
            }

            if (
              (!res.data?.exclude_integration_api_body ||
                res.data?.exclude_integration_api_body.length < 1) &&
              currentApi?.body
            ) {
              productModelData.exclude_integration_api_body =
                currentApi.body.supported_types[
                  productModelData.exclude_integration_api_model_type
                ].input;
            }
            setProductModel(productModelData);
            setIsProductModelLoad(true);
            setPreviousProductModel(productModelData);
          }
        );
      }
    }, 1000);
  }, [isSettingsLoaded]);

  useEffect(() => {
    if (isProductModelLoaded) {
      wp.hooks.doAction("atlas_ar_preview_data", productModel);
    }
  }, [isProductModelLoaded]);

  useEffect(() => {
    if (productModel.exclude_integration_api_model_type && currentApi?.body) {
      let tempProductModel = structuredClone(productModel);
      tempProductModel.exclude_integration_api_body =
        currentApi.body.supported_types[
          productModel.exclude_integration_api_model_type
        ].input;
      setProductModel(tempProductModel);
    }
  }, [productModel.exclude_integration_api_model_type]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const postId = getPostID();
    if (!postId) {
      notify(
        "Please publish the post first. Then reload the page and save.",
        "warn",
        {
          autoClose: 5000,
        }
      );
      return;
    }

    let hasValueChanged = isDifferent(previousProductModel, productModel);
    if (!hasValueChanged) {
      notify("No changes detected", "info", {
        autoClose: 5000,
      });
      return;
    }

    let formData = new FormData();
    formData.append("fields", JSON.stringify(productModel));
    formData.append("post_id", postId);
    formData.append("method", "POST");
    formData.append("has_value_changed", hasValueChanged);
    postWithoutImage(getURL("get_model_and_settings"), formData)
      .then((res) => {
        console.log(res);
        setProductModel({ ...productModel, ...res.data });
        notify("Successfully Saved Data.", "success", {
          autoClose: 5000,
        });
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const SaveButton = ({ classes = "art-w-full" }) => (
    <button
      type="button"
      onClick={handleSubmit}
      className={
        "art-mt-2 art-cursor-pointer art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded art-border art-border-sky-500 " +
        classes
      }
    >
      Save
    </button>
  );

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
      <div
        className="art-flex art-gap-6"
        style={{ display: "flex", gap: "0.25rem" }}
      >
        {/* Left Side - Settings/Style Sections */}
        <div
          className="art-w-1/2"
          style={{
            width: "50%",
            borderRight: "1px solid black",
            paddingRight: "1rem",
          }}
        >
          {/* Section Tabs */}
          <div className="art-flex art-mb-4 art-border-b">
            <button
              onClick={(e) => toggleSection(e, "settings")}
              className={`art-px-4 art-py-2 art-cursor-pointer art-font-medium art-border-b-2 ${
                activeSection === "settings"
                  ? "art-border-blue-500 art-text-blue-600"
                  : "art-border-transparent art-text-gray-600 hover:art-text-gray-800"
              }`}
            >
              Settings
            </button>
            <button
              onClick={(e) => toggleSection(e, "style")}
              className={`art-px-4 art-py-2 art-font-medium art-cursor-pointer art-border-b-2 ${
                activeSection === "style"
                  ? "art-border-blue-500 art-text-blue-600"
                  : "art-border-transparent art-text-gray-600 hover:art-text-gray-800"
              }`}
            >
              Style
            </button>
            {/*//TODO:: release integration with next release.*/}
            <button
              onClick={(e) => toggleSection(e, "integration")}
              className={`art-px-4 art-py-2 art-font-medium art-cursor-pointer art-border-b-2 ${
                activeSection === "integration"
                  ? "art-border-blue-500 art-text-blue-600"
                  : "art-border-transparent art-text-gray-600 hover:art-text-gray-800"
              }`}
            >
              Integration
            </button>
            {/*/Slider Tab*/}
            <button
              onClick={(e) => toggleSection(e, "slider")}
              className={`art-px-4 art-py-2 art-font-medium art-cursor-pointer art-border-b-2 ${
                activeSection === "slider"
                  ? "art-border-blue-500 art-text-blue-600"
                  : "art-border-transparent art-text-gray-600 hover:art-text-gray-800"
              }`}
            >
              Slider
            </button>
          </div>
          <div>
            <br />
            {/* Settings Section */}
            {activeSection === "settings" && (
              <div className="art-bg-gray-100 art-rounded">
                <ContentSection
                  basicSettings={basicSettings}
                  productModel={productModel}
                  handleChange={handleChange}
                  setBasicSettings={setBasicSettings}
                  activeAccordion={activeAccordion}
                  toggleAccordion={toggleAccordion}
                  handleMediaButtonClick={handleMediaButtonClick}
                />

                <CameraSection
                  productModel={productModel}
                  handleChange={handleChange}
                  activeAccordion={activeAccordion}
                  toggleAccordion={toggleAccordion}
                />

                <LightEnvironmentSection
                  basicSettings={basicSettings}
                  productModel={productModel}
                  handleChange={handleChange}
                  handleMediaButtonClick={handleMediaButtonClick}
                  activeAccordion={activeAccordion}
                  toggleAccordion={toggleAccordion}
                  setBasicSettings={setBasicSettings}
                />

                <DimensionsSection
                  productModel={productModel}
                  setProductModel={setProductModel}
                  onUpdateDimension={onUpdateDimension}
                  activeAccordion={activeAccordion}
                  toggleAccordion={toggleAccordion}
                  handleChange={handleChange}
                  isProductModelLoaded={isProductModelLoaded}
                />
                <HotspotsSection
                  productModel={productModel}
                  setProductModel={setProductModel}
                  activeAccordion={activeAccordion}
                  toggleAccordion={toggleAccordion}
                />
              </div>
            )}

            {/* Style Section */}
            {activeSection === "style" && (
              <StyleSection
                productModel={productModel}
                handleChange={handleChange}
                styleAccordion={styleAccordion}
                toggleStyleAccordion={toggleStyleAccordion}
              />
            )}

            {(activeSection === "settings" || activeSection === "style") && (
              <SaveButton />
            )}

            {activeSection === "integration" && isProductModelLoaded && (
              <IntegrationSection
                productModel={productModel}
                addField={addIntegrationField}
                removeField={removeIntegrationField}
                handleIntegrationChange={handleIntegrationChange}
                settings={settings}
                currentApi={currentApi}
                handleChange={handleChange}
                setProductModel={setProductModel}
              />
            )}

            {/* {Slider Section} */}
            {activeSection === "slider" && (
              <SliderSection

              />
            )}
          </div>
        </div>

        {/* Right Side - Shortcode and Preview */}
        <div
          className="art-w-1/2"
          style={{ width: "50%", paddingLeft: "1rem" }}
        >
          <div className="art-bg-white art-rounded art-shadow-sm art-flex art-gap-2">
            <input
              type="text"
              name="atlas_ar_shortcode_button"
              id="atlas_ar_shortcode_button"
              defaultValue="[atlas_ar]"
              title="Short code"
              className="art-border art-w-1/2 art-rounded art-ml-4 art-mb-4 "
            />

            <div
              type="button"
              id="atlas_ar_shortcode_button"
              style={{ cursor: "copy" }}
              onClick={copyshortcode}
              // className="art-w-1/5 art-h-1/5 art-cursor-pointer art-p-2 art-bg-blue-500 art-text-white art-rounded art-border art-border-sky-500"
              className="art-mt-2 art-mb-4 art-cursor-pointer art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded art-border art-border-sky-500 art-w-80 "
            >
              <span className="dashicons dashicons-admin-page"></span>
              Copy ShortCode
            </div>
            <SaveButton classes="art-w-96 art-mb-4" />
          </div>

          <div id="atlas_ar_preview"></div>
        </div>
        <div className="art-hidden art-w-96 art-w-1/3"></div>
      </div>
    </>
  );
};

export default ARProductModelSettings;
