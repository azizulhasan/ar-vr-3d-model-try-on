/**
 * PremiumBadge — shared upsell-link component
 *
 * Renders a small, clickable "Available in AtlasAR Pro" link that
 * takes the merchant to the pricing page. Returns `null` when the
 * Pro plugin is loaded, so the host site doesn't see an upsell when
 * they've already upgraded.
 *
 * This is the SINGLE place where a Pro-feature surface in Free is
 * allowed to advertise the upgrade — every locked control we used to
 * ship (disabled buttons, 🔒-prefixed selects, "Pro warning" toasts)
 * was replaced by this passive link in AR-61 §1.1 Phase 2.
 *
 * Used by both the dashboard React bundle (src/dashboard/...) and the
 * metabox React bundle (src/metabox/...), so it lives under
 * src/context/ alongside the other shared utilities.
 *
 * @since AR-61 §1.1 Phase 2
 */

import React from 'react';

const PRICING_BASE_URL = 'https://wpaugmentedreality.com/pricing/';

/**
 * Build the pricing-page URL with consistent UTM tagging so we can
 * tell which surface drove a click on the marketing analytics side.
 *
 * @param {string} feature       Short identifier for the surface — e.g.
 *                               "hotspots", "dimensions", "bulk-compression".
 * @param {string} [utmMedium]   Override the default `utm_medium=badge`.
 * @returns {string}             The full pricing URL.
 */
function buildPricingUrl(feature, utmMedium) {
  const params = new URLSearchParams({
    utm_source: 'plugin',
    utm_medium: utmMedium || 'badge',
    utm_campaign: feature || 'premium-badge',
  });
  return PRICING_BASE_URL + '?' + params.toString();
}

/**
 * Whether the Pro plugin is loaded.
 *
 * Reads the boolean that Free's PHP-side `is_pro_active()` writes into
 * the localized `ar_try_on` payload. Free guarantees this key is a
 * boolean (true / false), so a plain truthy check is safe.
 *
 * @returns {boolean}
 */
export function isProActive() {
  return Boolean(typeof ar_try_on !== 'undefined' && ar_try_on.is_pro_active);
}

/**
 * Premium upsell badge.
 *
 * Renders nothing when Pro is active. Otherwise renders a small
 * highlighted block with a headline ("Available in AtlasAR Pro" by
 * default — overridable via children) and a learn-more link.
 *
 * @example
 *   <PremiumBadge feature="hotspots">
 *     Interactive hotspots — available in AtlasAR Pro
 *   </PremiumBadge>
 *
 * @param {object}    props
 * @param {string}    props.feature   Required. Short identifier; goes
 *                                    into UTM and `data-feature` attr.
 * @param {ReactNode} [props.children] Optional override for the badge
 *                                     headline. Defaults to a generic
 *                                     "Available in AtlasAR Pro" line.
 * @param {string}    [props.linkText] Text of the trailing link.
 *                                     Defaults to "Learn more →".
 * @param {string}    [props.utmMedium] Override default `utm_medium=badge`.
 * @returns {JSX.Element|null}
 */
export default function PremiumBadge({
  feature,
  children,
  linkText,
  utmMedium,
}) {
  if (isProActive()) {
    return null;
  }

  const href = buildPricingUrl(feature, utmMedium);
  const headline = children || 'Available in AtlasAR Pro';
  const link = linkText || 'Learn more →';

  return (
    <div
      className="art-premium-badge art-border art-border-amber-200 art-bg-amber-50 art-rounded art-p-4 art-my-2 art-flex art-flex-col art-gap-2"
      data-feature={feature || ''}
    >
      <div className="art-flex art-items-start art-gap-2">
        <span aria-hidden="true" className="art-text-amber-600 art-text-lg">
          ⭐
        </span>
        <div className="art-text-sm art-text-slate-800 art-flex-1">
          {headline}
        </div>
      </div>
      <a
        className="art-self-start art-inline-flex art-items-center art-gap-1 art-text-sm art-font-medium art-text-amber-700 hover:art-text-amber-900 art-no-underline"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {link}
      </a>
    </div>
  );
}
