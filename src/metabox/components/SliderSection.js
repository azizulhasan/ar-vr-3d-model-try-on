import { useState, useEffect } from "react";
import Switch from "../../dashboard/components/dashboard/settings/Switch";

const SliderSection = ({
  basicSettings,
  productModel,
  handleChange,
  setBasicSettings,
  handleMediaButtonClick,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [items, setItems] = useState([
    {
      id: 1,
      isExpanded: true,
      data: {
        src: "",
        ios_src: "",
        poster: "",
        alt: "",
        skybox_image: "",
        environment_image: "",
        thumbnail_image: ""
      },
    },
  ]);

  console.log({
    items: Object.assign(
      {},
      items.map((item) => ({ ...item.data }))
    ),
  });



  const [dragIndex, setDragIndex] = useState(null);

  const handleDragStart = (index) => {
    setDragIndex(index);
  };

  const handleDragEnter = (index) => {
    if (index === dragIndex) return;

    const updated = [...items];
    const draggedItem = updated[dragIndex];

    // Remove old position
    updated.splice(dragIndex, 1);

    // Insert new position
    updated.splice(index, 0, draggedItem);

    setDragIndex(index);
    setItems(updated);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const handleAddNewItem = () => {
    const newItem = {
      id: items.length + 1,
      isExpanded: true,
      data: {
        src: "",
        ios_src: "",
        poster: "",
        alt: "",
        skybox_image: "",
        environment_image: "",
        thumbnail_image: ""
      },
    };

    // Collapse all existing items and add new one
    setItems((prevItems) => [
      ...prevItems.map((item) => ({ ...item, isExpanded: false })),
      newItem,
    ]);
  };

  const handleDeleteItem = (id) => {
    if (items.length > 1) {
      setItems((prevItems) => prevItems.filter((item) => item.id !== id));
    }
  };

  const handleDuplicateItem = (id) => {
    const itemToDuplicate = items.find((item) => item.id === id);
    if (itemToDuplicate) {
      const newItem = {
        id: Math.max(...items.map((i) => i.id)) + 1,
        isExpanded: true,
        data: { ...itemToDuplicate.data },
      };

      // Collapse all existing items and add duplicated one
      setItems((prevItems) => [
        ...prevItems.map((item) => ({ ...item, isExpanded: false })),
        newItem,
      ]);
    }
  };

  const toggleItemExpansion = (id) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id
          ? { ...item, isExpanded: !item.isExpanded }
          : { ...item, isExpanded: false }
      )
    );
  };

  const handleItemChange = (itemId, fieldName, value) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId
          ? { ...item, data: { ...item.data, [fieldName]: value } }
          : item
      )
    );
  };


  return (
    <div className="art-mb-4">
      <div className="art-mb-2">
        <Switch
          label="Use Slider with multiple model?"
          defaultChecked={false}
          onChange={(checked) => setIsVisible(checked)}
        />
      </div>

      {isVisible && (
        <div className="art-mt-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="art-border art-border-solid art-border-gray-300 art-rounded art-mb-3"
              draggable={false} // prevent full card dragging
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
            >
              {/* Item Header */}
              <div
                className="art-flex art-items-center art-justify-between art-p-3 art-bg-gray-50 art-cursor-pointer hover:art-bg-gray-100 art-transition-colors"
                onClick={() => toggleItemExpansion(item.id)}
              >
                <div className="art-flex art-items-center art-gap-2">
                  <span
                    className="dashicons dashicons-menu art-text-gray-600 art-cursor-move"
                    draggable
                    onClick={(e) => e.stopPropagation()}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      handleDragStart(index);
                    }}
                  ></span>
                  <span className="art-font-medium">Item {item.id}</span>
                </div>
                <div className="art-flex art-items-center art-gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateItem(item.id);
                    }}
                    className="art-p-1 hover:art-bg-gray-200 art-rounded art-transition-colors"
                    title="Duplicate"
                  >
                    <span className="dashicons dashicons-admin-page"></span>
                  </button>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(item.id);
                      }}
                      className="art-p-1 hover:art-bg-gray-200 art-rounded art-transition-colors"
                      title="Delete"
                    >
                      <span className="dashicons dashicons-trash"></span>
                    </button>
                  )}
                </div>
              </div>

              {/* Item Content */}
              {item.isExpanded && (
                <div className="art-p-4">
                  {/* Android Model */}
                  <div className="art-border art-border-solid art-border-black art-p-4">
                    <label className="art-text-xs art-font-semibold art-uppercase art-flex art-items-center art-gap-1">
                      MODEL {basicSettings.src === "upload" ? "File" : "URL"}{" "}
                      FOR ANDROID
                    </label>
                    <div className="art-flex art-mt-1 art-border art-rounded art-overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleMediaButtonClick("src", "upload")}
                        className={`art-cursor-pointer art-p-2 art-transition-all art-duration-200 ${
                          basicSettings.src === "upload"
                            ? "art-bg-black art-text-white"
                            : "art-bg-white art-text-black"
                        }`}
                      >
                        <span className="dashicons dashicons-cloud-upload"></span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setBasicSettings((prev) => ({ ...prev, src: "url" }))
                        }
                        className={`art-p-2 art-transition-all art-duration-200 ${
                          basicSettings.src === "url"
                            ? "art-bg-black art-text-white"
                            : "art-bg-white art-text-black"
                        }`}
                      >
                        <span className="dashicons dashicons-format-image"></span>
                      </button>
                    </div>
                    <label className="art-mt-2 art-block art-text-sm art-font-medium">
                      MODEL URL FOR ANDROID
                    </label>
                    <input
                      type="text"
                      name="src"
                      value={item.data.src || ""}
                      onChange={(e) =>
                        handleItemChange(item.id, "src", e.target.value)
                      }
                      className="art-w-full art-mt-1 art-p-2 art-border art-rounded"
                      placeholder="Enter Android model URL"
                    />
                    <p className="art-text-sm art-text-gray-600 art-mt-1">
                      The URL of the Android model file.
                    </p>
                  </div>
                  <br />
                  {/* iOS Model */}
                  <div className="art-border art-border-solid art-border-black art-p-4">
                    <label className="art-text-xs art-font-semibold art-uppercase art-flex art-items-center art-gap-1 art-mt-4">
                      MODEL{" "}
                      {basicSettings.ios_src === "upload" ? "File" : "URL"} FOR
                      IOS
                    </label>
                    <div className="art-flex art-mt-1 art-border art-rounded art-overflow-hidden">
                      <button
                        type="button"
                        onClick={() =>
                          handleMediaButtonClick("ios_src", "upload")
                        }
                        className={`art-cursor-pointer art-p-2 art-transition-all art-duration-200 ${
                          basicSettings.ios_src === "upload"
                            ? "art-bg-black art-text-white"
                            : "art-bg-white art-text-black"
                        }`}
                      >
                        <span className="dashicons dashicons-cloud-upload"></span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setBasicSettings((prev) => ({
                            ...prev,
                            ios_src: "url",
                          }))
                        }
                        className={`art-p-2 art-transition-all art-duration-200 ${
                          basicSettings.ios_src === "url"
                            ? "art-bg-black art-text-white"
                            : "art-bg-white art-text-black"
                        }`}
                      >
                        <span className="dashicons dashicons-format-image"></span>
                      </button>
                    </div>
                    <label className="art-mt-2 art-block art-text-sm art-font-medium">
                      MODEL URL FOR IOS
                    </label>
                    <input
                      type="text"
                      name="ios_src"
                      value={item.data.ios_src || ""}
                      onChange={(e) =>
                        handleItemChange(item.id, "ios_src", e.target.value)
                      }
                      className="art-w-full art-mt-1 art-p-2 art-border art-rounded"
                      placeholder="Enter iOS model URL"
                    />
                    <p className="art-text-sm art-text-gray-600 art-mt-1">
                      The URL of the iOS model file.
                    </p>
                  </div>
                  <br />
                  {/* Poster Source */}
                  <div className="art-border art-border-solid art-border-black art-p-4">
                    <label className="art-text-xs art-font-semibold art-uppercase art-mt-4 art-block">
                      POSTER SOURCE{" "}
                      {basicSettings.poster === "upload" ? "File" : "URL"}
                    </label>
                    <div className="art-flex art-mt-1 art-border art-rounded art-overflow-hidden">
                      <button
                        type="button"
                        onClick={() =>
                          handleMediaButtonClick("poster", "upload")
                        }
                        className={`art-p-2 art-transition-all art-duration-200 ${
                          basicSettings.poster === "upload"
                            ? "art-bg-black art-text-white"
                            : "art-bg-white art-text-black"
                        }`}
                      >
                        <span className="dashicons dashicons-cloud-upload"></span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setBasicSettings((prev) => ({
                            ...prev,
                            poster: "url",
                          }))
                        }
                        className={`art-p-2 art-transition-all art-duration-200 ${
                          basicSettings.poster === "url"
                            ? "art-bg-black art-text-white"
                            : "art-bg-white art-text-black"
                        }`}
                      >
                        <span className="dashicons dashicons-format-image"></span>
                      </button>
                    </div>
                    <label className="art-mt-2 art-block art-text-sm art-font-medium">
                      POSTER
                    </label>
                    <input
                      type="text"
                      name="poster"
                      value={item.data.poster || ""}
                      onChange={(e) =>
                        handleItemChange(item.id, "poster", e.target.value)
                      }
                      className="art-w-full art-mt-1 art-p-2 art-border art-rounded"
                      placeholder="Enter poster image URL"
                    />
                    <p className="art-text-sm art-text-gray-600 art-mt-1">
                      The URL of the poster image.
                    </p>
                  </div>
                  <br />
                  {/* Alt */}
                  <div className="art-border art-border-solid art-border-black art-p-4">
                    <label
                      htmlFor={`alt-${item.id}`}
                      className="art-block art-text-sm art-font-medium art-items-center art-gap-2"
                    >
                      <img
                        src={
                          ar_try_on.plugin_url +
                          "admin/images/icons8-web-accessibility-18.png"
                        }
                        alt="Accessibility Icon"
                        className="art-w-6 art-h-6"
                      />
                      Alt
                    </label>
                    <input
                      type="text"
                      id={`alt-${item.id}`}
                      name="alt"
                      onChange={(e) =>
                        handleItemChange(item.id, "alt", e.target.value)
                      }
                      value={item.data.alt}
                      className="art-border art-w-full art-mt-2 art-p-2 art-rounded"
                    />
                    <p className="art-text-sm art-text-gray-600 art-mt-2">
                      Insert a text. If the text field is left empty, the name
                      of the product is taken.
                    </p>
                  </div>
                  <br />
                  {/* Skybox Source */}
                  <div className="art-border art-border-solid art-border-black art-p-4">
                    <label className="art-text-xs art-font-semibold art-uppercase art-mt-4 art-block">
                      SKYBOX SOURCE{" "}
                      {basicSettings.skybox_source_type == "upload"
                        ? "File"
                        : "URL"}
                    </label>
                    <div className="art-flex art-mt-1 art-border art-rounded art-overflow-hidden">
                      <button
                        type="button"
                        onClick={(e) =>
                          handleMediaButtonClick("skybox_image", "upload")
                        }
                        data-name="skybox_image"
                        className={`art-p-2 ar-try-on-open-media-library art-transition-all art-duration-200 ${
                          basicSettings.skybox_source_type === "upload"
                            ? "art-bg-black art-text-white"
                            : "art-bg-white art-text-black"
                        }`}
                      >
                        <span
                          data-name="skybox_image"
                          className="dashicons dashicons-cloud-upload"
                        ></span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setBasicSettings((prev) => ({
                            ...prev,
                            skybox_source_type: "url",
                          }))
                        }
                        className={`art-p-2 art-transition-all art-duration-200 ${
                          basicSettings.skybox_source_type === "url"
                            ? "art-bg-black art-text-white"
                            : "art-bg-white art-text-black"
                        }`}
                      >
                        <span className="dashicons dashicons-format-image"></span>
                      </button>
                    </div>
                    <label className="art-mt-2 art-block art-text-sm art-font-medium">
                      SKYBOX IMAGE
                    </label>
                    <input
                      type="text"
                      id={`skybox_image-${item.id}`}
                      name="skybox_image"
                      value={item.data.skybox_image}
                      onChange={(e) =>
                        handleItemChange(
                          item.id,
                          "skybox_image",
                          e.target.value
                        )
                      }
                      className="art-w-full art-mt-1 art-p-2 art-border art-rounded"
                      placeholder="Enter skybox image URL"
                    />
                    <p className="art-text-sm art-text-gray-600 art-mt-1">
                      The URL of the skybox image for the AR environment.
                    </p>
                  </div>
                  <br />
                  {/* Environment Image Source */}
                  <div className="art-border art-border-solid art-border-black art-p-4">
                    <label className="art-text-xs art-font-semibold art-uppercase art-mt-4 art-block">
                      ENVIRONMENT IMAGE SOURCE{" "}
                      {basicSettings.environment_source_type == "upload"
                        ? "File"
                        : "URL"}
                    </label>
                    <div className="art-flex art-mt-1 art-border art-rounded art-overflow-hidden">
                      <button
                        type="button"
                        onClick={(e) =>
                          handleMediaButtonClick("environment_image", "upload")
                        }
                        data-name="environment_image"
                        className={`art-p-2 ar-try-on-open-media-library art-transition-all art-duration-200 ${
                          basicSettings.environment_source_type === "upload"
                            ? "art-bg-black art-text-white"
                            : "art-bg-white art-text-black"
                        }`}
                      >
                        <span
                          data-name="environment_image"
                          className="dashicons dashicons-cloud-upload"
                        ></span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setBasicSettings((prev) => ({
                            ...prev,
                            environment_source_type: "url",
                          }))
                        }
                        className={`art-p-2 art-transition-all art-duration-200 ${
                          basicSettings.environment_source_type === "url"
                            ? "art-bg-black art-text-white"
                            : "art-bg-white art-text-black"
                        }`}
                      >
                        <span className="dashicons dashicons-format-image"></span>
                      </button>
                    </div>
                    <label className="art-mt-2 art-block art-text-sm art-font-medium">
                      ENVIRONMENT IMAGE
                    </label>
                    <input
                      type="text"
                      id={`environment_image-${item.id}`}
                      name="environment_image"
                      value={item.data.environment_image}
                      onChange={(e) =>
                        handleItemChange(
                          item.id,
                          "environment_image",
                          e.target.value
                        )
                      }
                      className="art-w-full art-mt-1 art-p-2 art-border art-rounded"
                      placeholder="Enter environment image URL"
                    />
                    <p className="art-text-sm art-text-gray-600 art-mt-1">
                      HDR image to use as the environment map.
                    </p>
                  </div>

                  <br />

                  {/* Thumbnail */}
                  <div className="art-border art-border-solid art-border-black art-p-4">
                    <label className="art-text-xs art-font-semibold art-uppercase art-flex art-items-center art-gap-1">
                      UPLOAD THUMBNAIL FOR SLIDER
                    </label>

                    <div className="art-flex art-mt-1 art-border art-rounded art-overflow-hidden">
                      <button
                        type="button"
                        onClick={() =>
                          handleMediaButtonClick("thumbnail_image", "upload")
                        }
                        data-name="thumbnail_image"
                        className="art-cursor-pointer art-p-2 art-bg-white art-text-black ar-try-on-open-media-library"
                      >
                        <span
                          data-name="thumbnail_image"
                          className="dashicons dashicons-images-alt2"
                        ></span>
                      </button>
                    </div>

                    <label className="art-mt-2 art-block art-text-sm art-font-medium">
                      THUMBNAIL IMAGE
                    </label>

                    <input
                      type="text"
                      id={`thumbnail_image-${item.id}`}
                      name="thumbnail_image"
                      value={item.data.thumbnail_image}
                      onChange={(e) =>
                        handleItemChange(
                          item.id,
                          "thumbnail_image",
                          e.target.value
                        )
                      }
                      className="art-w-full art-mt-1 art-p-2 art-border art-rounded"
                      placeholder="Enter thumbnail image URL"
                    />

                    <p className="art-text-sm art-text-gray-600 art-mt-1">
                      Upload or paste the thumbnail image URL.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add New Item Button */}
          <div className="art-flex art-w-full art-mt-4">
            <button
              type="button"
              onClick={handleAddNewItem}
              className="art-bg-blue-500 art-text-white art-w-full art-px-4 art-py-2 art-rounded hover:art-bg-blue-600 art-transition-colors"
            >
              <span className="dashicon dashicons dashicons-plus"></span> Add
              New Item
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SliderSection;
