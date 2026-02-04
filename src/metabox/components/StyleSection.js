// components/ARSettings/StyleSection.js
import React from "react";
import { __ } from '@wordpress/i18n';
import AccordionIcon from "../../icons/AccordionIcon";




const StyleSection = ({
productModel,
handleChange,
styleAccordion,
toggleStyleAccordion
}) => {
return (
  <div className="art-bg-gray-100 art-rounded">
    {/* Canvas Accordion */}
    <div className="art-mb-4 art-border art-border-gray-200 art-rounded">
      <button
        type="button"
        onClick={() => toggleStyleAccordion('canvas')}
        className="art-w-full art-flex art-justify-between art-items-center art-px-3 art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50"
      >
        <span className="art-w-full art-flex art-justify-between art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50">
          {__('Canvas', 'ar-vr-3d-model-try-on')}
          <AccordionIcon status={styleAccordion.canvas} />
        </span>
      </button>




      {styleAccordion.canvas && (
        <div className="art-px-3 art-py-2 art-bg-white art-border-t art-space-y-4">
          {/* Alignment */}
          <div>
            <label className="art-block art-font-medium mb-2">{__('Alignment', 'ar-vr-3d-model-try-on')}</label>
            <select
              name="canvas_alignment"
              onChange={handleChange}
              className="art-w-full art-p-2 art-border art-rounded"
              value={productModel.canvas_alignment || 'center'}
            >
              <option value="left">{__('Left', 'ar-vr-3d-model-try-on')}</option>
              <option value="center">{__('Center', 'ar-vr-3d-model-try-on')}</option>
              <option value="right">{__('Right', 'ar-vr-3d-model-try-on')}</option>
            </select>
          </div>




          {/* Width */}
          <div>
            <label className="art-block art-font-medium mb-2">{__('Width', 'ar-vr-3d-model-try-on')}</label>
            <input
              type="text"
              name="canvas_width"
              onChange={handleChange}
              value={productModel.canvas_width || ''}
              className="art-w-full art-p-2 art-border art-rounded"
              placeholder={__('e.g., 600px, 50%, 10rem', 'ar-vr-3d-model-try-on')}
            />
          </div>




          {/* Height */}
          <div>
            <label className="art-block art-font-medium mb-2">{__('Height', 'ar-vr-3d-model-try-on')}</label>
            <input
              type="text"
              name="canvas_height"
              onChange={handleChange}
              value={productModel.canvas_height || ''}
              className="art-w-full art-p-2 art-border art-rounded"
              placeholder={__('e.g., 400px, auto, 30vh', 'ar-vr-3d-model-try-on')}
            />
          </div>




          {/* Margin */}
          <div>
            <label className="art-block art-font-medium mb-2">{__('Margin', 'ar-vr-3d-model-try-on')}</label>
            <input
              type="text"
              name="canvas_margin"
              onChange={handleChange}
              value={productModel.canvas_margin || ''}
              className="art-w-full art-p-2 art-border art-rounded"
              placeholder={__('e.g., 10px 20px', 'ar-vr-3d-model-try-on')}
            />
          </div>




          {/* Padding */}
          <div>
            <label className="art-block art-font-medium mb-2">{__('Padding', 'ar-vr-3d-model-try-on')}</label>
            <input
              type="text"
              name="canvas_padding"
              onChange={handleChange}
              value={productModel.canvas_padding || ''}
              className="art-w-full art-p-2 art-border art-rounded"
              placeholder={__('e.g., 1rem 2rem', 'ar-vr-3d-model-try-on')}
            />
          </div>
        </div>
      )}
      <br/>




      {/* Custom CSS Accordion */}
      <div className="art-mb-4 art-border art-border-gray-200 art-rounded">
        <button
          type="button"
          onClick={() => toggleStyleAccordion('advance')}
          className="art-w-full art-flex art-justify-between art-items-center art-px-3 art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50"
        >
          <span className="art-w-full art-flex art-justify-between art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50">
            {__('Custom CSS', 'ar-vr-3d-model-try-on')}
            <AccordionIcon status={styleAccordion.advance} />
          </span>
        </button>




        {styleAccordion.advance && (
          <div className="art-px-3 art-py-2 art-bg-white art-border-t art-space-y-4">
            <label className="art-block art-font-medium mb-2">{__('Write Custom CSS', 'ar-vr-3d-model-try-on')}</label>
            <textarea
              name="custom_css"
              onChange={handleChange}
              value={productModel.custom_css || ''}
              className="art-w-full art-min-h-[150px] art-p-2 art-border art-rounded art-font-mono art-text-sm"
              placeholder={__('e.g.\n.selector {\n    color: red;\n    font-size: 16px;\n}', 'ar-vr-3d-model-try-on')}
            />
          </div>
        )}
      </div>
    </div>
  </div>
);
};




export default StyleSection;