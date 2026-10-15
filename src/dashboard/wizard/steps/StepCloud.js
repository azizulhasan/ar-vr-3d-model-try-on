import { __ } from "@wordpress/i18n";
import CloudConnect from "../../components/dashboard/Integration/CloudConnect";

/**
 * AR-105: optional "AtlasAR Cloud" step. The same connect card as AtlasAR → Integration (email
 * sign-up or an API key). It connects at once through its own routes — Finish setup does not
 * change it — and pressing Next skips it. The wizard only shows this step when the site has an
 * AtlasAR Cloud address.
 */
export default function StepCloud() {
  return (
    <>
      <ul style={{ color: "var(--theme-text)", fontSize: "14px", lineHeight: 1.6, margin: 0, paddingLeft: "22px", listStyle: "disc" }}>
        <li>{__("Optimize: smaller GLB files at the real product size, for faster pages and true-size AR.", "ar-vr-3d-model-try-on")}</li>
        <li>{__("Photo to 3D: turn a product photo into a 3D model (AtlasAR Pro).", "ar-vr-3d-model-try-on")}</li>
        <li>{__("The Flat product tool (wall art, rugs, tiles) works without connecting.", "ar-vr-3d-model-try-on")}</li>
      </ul>
      <CloudConnect embedded />
      <p className="art-text-sm art-text-gray-500 art-m-0">
        {__("Optional. You can connect later in AtlasAR → Integration. Press Next to skip.", "ar-vr-3d-model-try-on")}
      </p>
    </>
  );
}
