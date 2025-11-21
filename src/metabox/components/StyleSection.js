// components/ARSettings/StyleSection.js
import React from "react";
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
          Canvas
          <AccordionIcon status={styleAccordion.canvas} />
        </span>
      </button>




      {styleAccordion.canvas && (
        <div className="art-px-3 art-py-2 art-bg-white art-border-t art-space-y-4">
          {/* Alignment */}
          <div>
            <label className="art-block art-font-medium mb-2">Alignment</label>
            <select
              name="canvas_alignment"
              onChange={handleChange}
              className="art-w-full art-p-2 art-border art-rounded"
              value={productModel.canvas_alignment || 'center'}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>




          {/* Width */}
          <div>
            <label className="art-block art-font-medium mb-2">Width</label>
            <input
              type="text"
              name="canvas_width"
              onChange={handleChange}
              value={productModel.canvas_width || ''}
              className="art-w-full art-p-2 art-border art-rounded"
              placeholder="e.g., 600px, 50%, 10rem"
            />
          </div>




          {/* Height */}
          <div>
            <label className="art-block art-font-medium mb-2">Height</label>
            <input
              type="text"
              name="canvas_height"
              onChange={handleChange}
              value={productModel.canvas_height || ''}
              className="art-w-full art-p-2 art-border art-rounded"
              placeholder="e.g., 400px, auto, 30vh"
            />
          </div>




          {/* Margin */}
          <div>
            <label className="art-block art-font-medium mb-2">Margin</label>
            <input
              type="text"
              name="canvas_margin"
              onChange={handleChange}
              value={productModel.canvas_margin || ''}
              className="art-w-full art-p-2 art-border art-rounded"
              placeholder="e.g., 10px 20px"
            />
          </div>




          {/* Padding */}
          <div>
            <label className="art-block art-font-medium mb-2">Padding</label>
            <input
              type="text"
              name="canvas_padding"
              onChange={handleChange}
              value={productModel.canvas_padding || ''}
              className="art-w-full art-p-2 art-border art-rounded"
              placeholder="e.g., 1rem 2rem"
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
            Custom CSS
            <AccordionIcon status={styleAccordion.advance} />
          </span>
        </button>




        {styleAccordion.advance && (
          <div className="art-px-3 art-py-2 art-bg-white art-border-t art-space-y-4">
            <label className="art-block art-font-medium mb-2">Write Custom CSS</label>
            <textarea
              name="custom_css"
              onChange={handleChange}
              value={productModel.custom_css || ''}
              className="art-w-full art-min-h-[150px] art-p-2 art-border art-rounded art-font-mono art-text-sm"
              placeholder={`e.g.\n.selector {\n    color: red;\n    font-size: 16px;\n}`}
            />
          </div>
        )}
      </div>
    </div>
  </div>
);
};




export default StyleSection;





