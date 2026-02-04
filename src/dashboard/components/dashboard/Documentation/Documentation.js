import React from "react";
import { __ } from '@wordpress/i18n';

export default function Documentation() {
  // Documentation questions array
  const documentationQuestions = [
    {
      id: "how-to-install-atlasar-3d-model-viewer-wordpress-plugin",
      title: __("How to install the AtlasAR plugin?", "ar-vr-3d-model-try-on"),
    },
    {
      id: "how-to-set-up-the-atlasar-plugin",
      title: __("How to set-up the AtlasAR plugin?", "ar-vr-3d-model-try-on"),
    },
    {
      id: "how-to-use-the-shortcode-in-the-atlasar-plugin",
      title: __("How to use the shortcode in the AtlasAR plugin?", "ar-vr-3d-model-try-on"),
    },
    {
      id: "how-to-add-a-3d-view-button-on-any-post-in-atlasar",
      title: __("How to add a 3D view button on any post in AtlasAR?", "ar-vr-3d-model-try-on"),
    },
    {
      id: "how-to-add-a-qr-code-in-atlasar",
      title: __("How to add a QR-Code in AtlasAR?", "ar-vr-3d-model-try-on"),
    },
  ];

  return (
    <div style={{ padding: "20px", border: "1px solid #ccc", backgroundColor: "var(--theme-bg)", color: "var(--theme-text)" }} >
      {/* Intro about AtlasAR */}
      <div className="art-mb-8">
        <h1 className="art-text-2xl art-font-bold art-mb-2" style={{color: "var(--theme-text"}}>
           {__("AtlasAR – 3D & AR Model Viewer for WordPress", "ar-vr-3d-model-try-on")}
        </h1>
                <p className="art-text-lg art-text-gray-600 art-leading-relaxed" style={{color: "var(--theme-text)"}}>
                    {__("AtlasAR is a powerful WordPress plugin that enables you to showcase", "ar-vr-3d-model-try-on")}{" "}
                    <span className="art-font-semibold">{__("3D models and Augmented Reality (AR)", "ar-vr-3d-model-try-on")}</span>{" "}
                    {__("experiences directly on your website. With support for", "ar-vr-3d-model-try-on")}{" "}
                    <code>.glb</code>, <code>.gltf</code>, {__("and", "ar-vr-3d-model-try-on")} <code>.usdz</code> {__("formats, it allows visitors to interact with products in real-time, place them in their environment using AR, and explore every detail. Perfect for", "ar-vr-3d-model-try-on")}{" "}
                    <span className="art-font-semibold">{__("eCommerce stores, portfolios, architects, and designers", "ar-vr-3d-model-try-on")}</span>, 
                    {__("AtlasAR bridges the gap between digital and physical experiences with features like shortcodes, QR-code sharing, WooCommerce integration, and customizable AR placements etc.", "ar-vr-3d-model-try-on")}
                </p>
      </div>

      {/* Documentation List */}
      <h2 className="art-text-xl art-font-semibold art-mb-4"style={{color: "var(--theme-text"}}>
           {__("FAQ (Frequently Asked Questions)", "ar-vr-3d-model-try-on")}
      </h2>
      <ul className="art-space-y-3">
        {documentationQuestions.map((doc) => (
          <li
            key={doc.id}
            className="art-p-4 art-rounded-lg art-shadow-sm  art-transition"style={{color: "var(--theme-text"}}
          >
            <a
              href={`https://wpaugmentedreality.com/docs/3d-model-viewer/${doc.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="art-text-blue-600 art-text-xl art-font-medium hover:art-underline"
            >
              {doc.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
