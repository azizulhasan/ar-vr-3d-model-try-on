// components/ARSettings/LightEnvironmentSection.js
import React from "react";
import { __ } from '@wordpress/i18n';
import AccordionIcon from "../../icons/AccordionIcon";

const LightEnvironmentSection = ({
  basicSettings,
  productModel,
  handleChange,
  handleMediaButtonClick,
  activeAccordion,
  toggleAccordion,
  setBasicSettings
}) => {
  return (
    <div className="art-mb-4 art-border art-border-gray-200 art-rounded">
      <button
        type="button"
        onClick={() => toggleAccordion('light')}
        className="art-w-full art-flex art-justify-between art-items-center art-px-3 art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50"
      >
        <span className="art-w-full art-flex art-justify-between art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50">
          {__('Light & Environment', 'ar-vr-3d-model-try-on')}
          <AccordionIcon status={activeAccordion.light} />
        </span>
      </button>

      {activeAccordion.light && (
        <div className="art-px-3 art-py-2 art-bg-white art-border-t">
          {/* Skybox Source */}
          <div className="art-border art-border-solid art-border-black art-p-4">
            <label className="art-text-xs art-font-semibold art-uppercase">{__('SKYBOX SOURCE', 'ar-vr-3d-model-try-on')} {basicSettings.skybox_source_type == 'upload' ? __('File', 'ar-vr-3d-model-try-on') : __('URL', 'ar-vr-3d-model-try-on')}</label>
            <div className="art-flex art-mt-1 art-border art-rounded art-overflow-hidden">
              <button
                type="button"
                onClick={(e) => handleMediaButtonClick('skybox_image', 'upload')}
                data-name="skybox_image"
                className={`art-p-2 ar-try-on-open-media-library art-transition-all art-duration-200 ${basicSettings.skybox_source_type === 'upload' ? 'art-bg-black art-text-white' : 'art-bg-white art-text-black'}`}
              >
                <span data-name="skybox_image" className="dashicons dashicons-cloud-upload"></span>
              </button>
              <button
                type="button"
                onClick={() => setBasicSettings(prev => ({ ...prev, skybox_source_type: 'url' }))}
                className={`art-p-2 art-transition-all art-duration-200 ${basicSettings.skybox_source_type === 'url' ? 'art-bg-black art-text-white' : 'art-bg-white art-text-black'}`}
              >
                <span className="dashicons dashicons-format-image"></span>
              </button>
            </div>

            <label className="art-mt-2 art-block art-text-sm art-font-medium">{__('SKYBOX IMAGE', 'ar-vr-3d-model-try-on')}</label>
            <input
              type="text"
              id="skybox_image"
              name="skybox_image"
              value={productModel.skybox_image}
              onChange={handleChange}
              className="art-w-full art-mt-1 art-p-2 art-border art-rounded"
              placeholder={__('Enter skybox image URL', 'ar-vr-3d-model-try-on')}
            />
            <p className="art-text-sm art-text-gray-600 art-mt-1">{__('The URL of the skybox image for the AR environment.', 'ar-vr-3d-model-try-on')}</p>
          </div>

          <br />

          {/* Environment Image Source */}
          <div className="art-border art-border-solid art-border-black art-p-4">
            <label className="art-text-xs art-font-semibold art-uppercase">{__('ENVIRONMENT IMAGE SOURCE', 'ar-vr-3d-model-try-on')} {basicSettings.environment_source_type == 'upload' ? __('File', 'ar-vr-3d-model-try-on') : __('URL', 'ar-vr-3d-model-try-on')}</label>
            <div className="art-flex art-mt-1 art-border art-rounded art-overflow-hidden">
              <button
                type="button"
                onClick={(e) => handleMediaButtonClick('environment_image', 'upload')}
                data-name="environment_image"
                className={`art-p-2 ar-try-on-open-media-library art-transition-all art-duration-200 ${basicSettings.environment_source_type === 'upload' ? 'art-bg-black art-text-white' : 'art-bg-white art-text-black'}`}
              >
                <span data-name="environment_image" className="dashicons dashicons-cloud-upload"></span>
              </button>
              <button
                type="button"
                onClick={() => setBasicSettings(prev => ({ ...prev, environment_source_type: 'url' }))}
                className={`art-p-2 art-transition-all art-duration-200 ${basicSettings.environment_source_type === 'url' ? 'art-bg-black art-text-white' : 'art-bg-white art-text-black'}`}
              >
                <span className="dashicons dashicons-format-image"></span>
              </button>
            </div>

            <label className="art-mt-2 art-block art-text-sm art-font-medium">{__('ENVIRONMENT IMAGE', 'ar-vr-3d-model-try-on')}</label>
            <input
              type="text"
              id="environment_image"
              name="environment_image"
              value={productModel.environment_image}
              onChange={handleChange}
              className="art-w-full art-mt-1 art-p-2 art-border art-rounded"
              placeholder={__('Enter environment image URL', 'ar-vr-3d-model-try-on')}
            />
            <p className="art-text-sm art-text-gray-600 art-mt-1">{__('HDR image to use as the environment map.', 'ar-vr-3d-model-try-on')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LightEnvironmentSection;