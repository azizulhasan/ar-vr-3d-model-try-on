// components/ARSettings/ContentSection.js
import React from "react";
import AccordionIcon from "../../icons/AccordionIcon";

const ContentSection = ({
  basicSettings,
  productModel,
  handleChange,
  setBasicSettings,
  activeAccordion,
  toggleAccordion
}) => {
  return (
    <div className="art-mb-4 art-border art-border-gray-200 art-rounded">
      <button
        type="button"
        onClick={() => toggleAccordion('content')}
        className="art-w-full art-flex art-items-center art-px-3 art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50"
      >
        <span className="art-w-full art-flex art-justify-between art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50">
          Content
          <AccordionIcon status={activeAccordion.content} />
        </span>
      </button>


      <div className={activeAccordion.content ? " art-block art-px-3 art-py-2 art-bg-white art-border-t " : " art-hidden art-px-3 art-py-2 art-bg-white art-border-t "}>
        {/* AR Placement */}
        <div className="art-mb-3">
          <label className="art-font-medium art-block art-mb-2">
            AR Placements / Product Type
          </label>
          <div className="art-relative">
            <select
              name="ar_try_on_ar_placement"
              value={productModel.ar_try_on_ar_placement}
              onChange={handleChange}
              className="art-w-full art-p-2 art-border art-border-gray-300 art-rounded art-bg-white art-appearance-none art-pr-8"
            >
              <option value="floor">Floor</option>
              <option value="wall">Wall</option>
              <option value="168">Glass Pro</option>
            </select>
            <div className="art-absolute art-inset-y-0 art-right-0 art-flex art-items-center art-px-2 art-pointer-events-none">
              <svg className="art-fill-current art-h-4 art-w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"></svg>
            </div>
          </div>

          <div className="art-mt-2 art-flex art-items-center art-gap-2">
            <span className="art-text-sm art-text-gray-600">
              Selected: {productModel.ar_try_on_ar_placement === 'floor' ? 'Floor' :
                productModel.ar_try_on_ar_placement === 'wall' ? 'Wall' : 'Glass Pro'}
            </span>
          </div>
        </div>

        {/* Android Model */}
        <div className="art-border art-border-solid art-border-black art-p-4">
          <label className="art-text-xs art-font-semibold art-uppercase art-flex art-items-center art-gap-1">
            MODEL {basicSettings.android_model_source_type == 'upload' ? "File" : 'URL'} FOR ANDROID
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.523 15.3414c-.5077 0-.91-.4023-.91-.8999 0-.4976.4023-.8999.91-.8999.5077 0 .91.4023.91.8999 0 .4976-.4023.8999-.91.8999zm-11.046 0c-.5077 0-.91-.4023-.91-.8999 0-.4976.4023-.8999.91-.8999.5077 0 .91.4023.91.8999 0 .4976-.4023.8999-.91.8999zm11.405-6.02L19.76 6.394c.095-.152.043-.348-.109-.442-.15-.095-.348-.043-.442.109l-1.906 3.038C16.04 8.73 14.06 8.366 12 8.366c-2.06 0-4.04.364-5.303.733L4.791 6.061c-.095-.152-.292-.204-.442-.109-.152.095-.204.291-.109.442L6.118 9.32C3.264 10.558 1.5 12.833 1.5 15.441v1.2h21v-1.2c0-2.608-1.764-4.883-4.618-6.121z" fill="#3DDC84" />
            </svg>
          </label>
          <div className="art-flex art-mt-1 art-border art-rounded art-overflow-hidden">
            <button
              type="button"
              onClick={() => setBasicSettings(prev => ({ ...prev, android_model_source_type: 'upload' }))}
              data-name="ar_try_on_file_android"
              className={`art-cursor-pointer ar-try-on-open-media-library art-p-2 art-transition-all art-duration-200 ${basicSettings.android_model_source_type === 'upload' ? 'art-bg-black art-text-white' : 'art-bg-white art-text-black'}`}
            >
              <span data-name="ar_try_on_file_android" className="dashicons dashicons-cloud-upload"></span>
            </button>
            <button
              type="button"
              onClick={() => setBasicSettings(prev => ({ ...prev, android_model_source_type: 'url' }))}
              className={`art-p-2 art-transition-all art-cursor-pointer art-duration-200 ${basicSettings.android_model_source_type === 'url' ? 'art-bg-black art-text-white' : 'art-bg-white art-text-black'}`}
            >
              <span className="dashicons dashicons-format-image"></span>
            </button>
          </div>

          <label className="art-mt-2 art-block art-text-sm art-font-medium">MODEL URL FOR ANDROID</label>
          <input
            type="text"
            id="ar_try_on_file_android"
            name="ar_try_on_file_android"
            value={productModel.ar_try_on_file_android || ''}
            onChange={handleChange}
            className="art-w-full art-mt-1 art-p-2 art-border art-rounded"
            placeholder="Enter Android model URL"
          />
          <p className="art-text-sm art-text-gray-600 art-mt-1">The URL of the Android model file.</p>
        </div>
        <br />

        {/* iOS Model */}
        <div className="art-border art-border-solid art-border-black art-p-4">
          <label className="art-text-xs art-font-semibold art-uppercase art-flex art-items-center art-gap-1">
            MODEL {basicSettings.ios_model_source_type == 'upload' ? "File" : 'URL'} FOR IOS
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" fill="#000000" />
            </svg>
          </label>

          <div className="art-flex art-mt-1 art-border art-rounded art-overflow-hidden">
            <button
              type="button"
              onClick={() => setBasicSettings(prev => ({ ...prev, ios_model_source_type: 'upload' }))}
              data-name="ar_try_on_file_ios"
              className={`art-cursor-pointer ar-try-on-open-media-library art-p-2 art-transition-all art-duration-200 ${basicSettings.ios_model_source_type === 'upload' ? 'art-bg-black art-text-white' : 'art-bg-white art-text-black'}`}
            >
              <span data-name="ar_try_on_file_ios" className="dashicons dashicons-cloud-upload"></span>
            </button>
            <button
              type="button"
              onClick={() => setBasicSettings(prev => ({ ...prev, ios_model_source_type: 'url' }))}
              className={`art-p-2 art-transition-all art-duration-200 ${basicSettings.ios_model_source_type === 'url' ? 'art-bg-black art-text-white' : 'art-bg-white art-text-black'}`}
            >
              <span className="dashicons dashicons-format-image"></span>
            </button>
          </div>

          <label className="art-mt-2 art-block art-text-sm art-font-medium">MODEL URL FOR IOS</label>
          <input
            type="text"
            id="ar_try_on_file_ios"
            name="ar_try_on_file_ios"
            value={productModel.ar_try_on_file_ios || ''}
            onChange={handleChange}
            className="art-w-full art-mt-1 art-p-2 art-border art-rounded"
            placeholder="Enter iOS model URL"
          />
          <p className="art-text-sm art-text-gray-600 art-mt-1">The URL of the iOS model file.</p>
        </div>
        <br />

        {/* Poster Source */}
        <div className="art-border art-border-solid art-border-black art-p-4">
          <label className="art-text-xs art-font-semibold art-uppercase"> POSTER SOURCE {basicSettings.poster_source_type == 'upload' ? "File" : 'URL'}</label>
          <div className="art-flex art-mt-1 art-border art-rounded art-overflow-hidden">
            <button
              type="button"
              onClick={() => setBasicSettings(prev => ({ ...prev, poster_source_type: 'upload' }))}
              data-name="ar_try_on_file_poster"
              className={`art-p-2 ar-try-on-open-media-library art-transition-all art-duration-200 ${basicSettings.poster_source_type === 'upload' ? 'art-bg-black art-text-white' : 'art-bg-white art-text-black'}`}
            >
              <span data-name="ar_try_on_file_poster" className="dashicons dashicons-cloud-upload"></span>
            </button>
            <button
              type="button"
              onClick={() => setBasicSettings(prev => ({ ...prev, poster_source_type: 'url' }))}
              className={`art-p-2 art-transition-all art-duration-200 ${basicSettings.poster_source_type === 'url' ? 'art-bg-black art-text-white' : 'art-bg-white art-text-black'}`}
            >
              <span className="dashicons dashicons-format-image"></span>
            </button>
          </div>

          <label className="art-mt-2 art-block art-text-sm art-font-medium">POSTER</label>
          <input
            type="text"
            id="ar_try_on_file_poster"
            name="ar_try_on_file_poster"
            value={productModel.ar_try_on_file_poster}
            onChange={handleChange}
            className="art-w-full art-mt-1 art-p-2 art-border art-rounded"
            placeholder="Enter poster image URL"
          />
          <p className="art-text-sm art-text-gray-600 art-mt-1">The URL of the poster image.</p>
        </div>

        {/* Alt Text */}
        <div className="art-mb-1">
          <label
            htmlFor="ar_try_on_file_alt"
            className="art-block art-text-sm art-font-medium art-items-center art-gap-2"
          >
            <img
              src={ar_try_on.plugin_url + "admin/images/icons8-web-accessibility-18.png"}
              alt="Accessibility Icon"
              className="art-w-6 art-h-6 art-mt-4"
            />
            Alt
          </label>
          <input
            type="text"
            id="ar_try_on_file_alt"
            name="ar_try_on_file_alt"
            onChange={handleChange}
            value={productModel.ar_try_on_file_alt}
            className="art-border art-w-full art-mt-2 art-p-2 art-rounded"
          />
          <p className="art-text-sm art-text-gray-600 art-mt-2">
            Insert a text. If the text field is left empty, the name of the product is taken.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContentSection;