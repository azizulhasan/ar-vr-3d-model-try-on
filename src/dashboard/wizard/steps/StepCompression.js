import { __ } from "@wordpress/i18n";
import CompressionToggle from "../../components/dashboard/settings/Compression/CompressionToggle";
import QualitySlider from "../../components/dashboard/settings/Compression/QualitySlider";
import PremiumBadge from "../../../context/PremiumBadge";

/**
 * Step 5 — compression of uploaded models. Same components as
 * Settings → Compression.
 */
export default function StepCompression({ state, update }) {
  const c = state.compression;
  const setCompression = (patch) => update({ compression: { ...c, ...patch } });

  return (
    <>
      <CompressionToggle enabled={!!c.enabled} onChange={(enabled) => setCompression({ enabled })} />
      {c.enabled && (
        <QualitySlider quality={parseInt(c.quality, 10) || 85} onChange={(quality) => setCompression({ quality })} />
      )}
      <PremiumBadge feature="wizard-compression">
        {__("Files over 10 MB are compressed on your server, and existing models can be compressed in bulk, in AtlasAR Pro.", "ar-vr-3d-model-try-on")}
      </PremiumBadge>
    </>
  );
}
