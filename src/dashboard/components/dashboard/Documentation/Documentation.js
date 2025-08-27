import React from "react";

export default function Documentation() {
  // Documentation questions array
  const documentationQuestions = [
    {
      id: "how-to-install-atlasar-3d-model-viewer-wordpress-plugin",
      title: "How to install the AtlasAR plugin?",
    },
    {
      id: "how-to-set-up-the-atlasar-plugin",
      title: "How to set-up the AtlasAR plugin?",
    },
    {
      id: "how-to-use-the-shortcode-in-the-atlasar-plugin",
      title: "How to use the shortcode in the AtlasAR plugin?",
    },
    {
      id: "how-to-add-a-3d-view-button-on-any-post-in-atlasar",
      title: "How to add a 3D view button on any post in AtlasAR?",
    },
    {
      id: "how-to-add-a-qr-code-in-atlasar",
      title: "How to add a QR-Code in AtlasAR?",
    },
  ];

  return (
    <div className="art-p-8 art-max-w-4xl art-mx-auto art-bg-white art-rounded-2xl art-shadow-md art-mt-4">
      {/* Intro about AtlasAR */}
      <div className="art-mb-8">
        <h1 className="art-text-2xl art-font-bold art-text-gray-800 art-mb-2">
          AtlasAR – 3D & AR Model Viewer for WordPress
        </h1>
        <p className="art-text-lg art-text-gray-600 art-leading-relaxed">
          AtlasAR is a powerful WordPress plugin that enables you to showcase{" "}
          <span className="art-font-semibold">3D models and Augmented Reality (AR)</span>{" "}
          experiences directly on your website. With support for{" "}
          <code>.glb</code>, <code>.gltf</code>, and <code>.usdz</code> formats, it allows
          visitors to interact with products in real-time, place them in their
          environment using AR, and explore every detail. Perfect for{" "}
          <span className="art-font-semibold">eCommerce stores, portfolios, architects, and designers</span>, 
          AtlasAR bridges the gap between digital and physical experiences with
          features like shortcodes, QR-code sharing, WooCommerce integration,
          and customizable AR placements etc.
        </p>
      </div>

      {/* Documentation List */}
      <h2 className="art-text-xl art-font-semibold art-mb-4">
        FAQ (Frequently Asked Questions)
      </h2>
      <ul className="art-space-y-3">
        {documentationQuestions.map((doc) => (
          <li
            key={doc.id}
            className="art-p-4 art-bg-gray-50 art-rounded-lg art-shadow-sm hover:art-bg-gray-100 art-transition"
          >
            <a
              href={`https://wpaugmentedreality.com/docs/3d-model-viewer/${doc.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="art-text-blue-600 art-font-medium hover:art-underline"
            >
              {doc.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
