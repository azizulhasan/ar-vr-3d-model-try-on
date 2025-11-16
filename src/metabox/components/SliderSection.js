const SliderSection = ({}) => {
  return (
    <div className="art-mb-4 art-border art-border-gray-200 art-rounded">
      <div className="art-border art-border-solid art-border-black art-p-4 art-mt-3">
        <label className="art-text-xs art-font-semibold art-uppercase art-flex art-items-center art-gap-1">
          GLB MODEL File FOR SLIDER
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          ></svg>
        </label>

        <div className="art-flex art-mt-1 art-border art-rounded art-overflow-hidden">
          <button
            type="button"
            className="art-cursor-pointer art-p-2 art-bg-white art-text-black"
          >
            <span className="dashicons dashicons-cloud-upload"></span>
          </button>
          <button type="button" className="art-p-2 art-bg-white art-text-black">
            <span className="dashicons dashicons-format-image"></span>
          </button>
        </div>

        <label className="art-mt-2 art-block art-text-sm art-font-medium">
          MODEL URL FOR SLIDER
        </label>
        <input
          type="text"
          className="art-w-full art-mt-1 art-p-2 art-border art-rounded"
          placeholder="Enter model URL"
        />

        <p className="art-text-sm art-text-gray-600 art-mt-1">
          The URL of the slider model file.
        </p>

        <label className="art-text-xs art-font-semibold art-uppercase art-flex art-items-center art-gap-1">
          UPLOAD THUMBNAIL FOR SLIDER
        </label>

        <div className="art-flex art-mt-1 art-border art-rounded art-overflow-hidden">
          <button
            type="button"
            className="art-cursor-pointer art-p-2 art-bg-white art-text-black"
          >
            <span class="dashicons dashicons-images-alt2"></span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SliderSection;
