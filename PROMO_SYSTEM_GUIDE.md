# AtlasAR Pro Early Access Promotion System

## Overview

A simple admin notice system for promoting AtlasAR Pro with an 80% off early access offer limited to 20 users.

## ⚠️ WordPress.org Compliance

**IMPORTANT:** This system is designed to be WordPress.org guidelines compliant:

✅ **What we DO:**
- Give coupon codes to early adopters who contact us
- Track how many users clicked to prevent abuse
- Show urgency ("X spots left")
- Mention reviews are welcome (but optional)

❌ **What we DON'T do:**
- Require reviews for coupons (VIOLATION)
- Incentivize reviews in any way (VIOLATION)
- Track actual coupon usage (not reliable anyway)

---

## Features

✅ **User-specific dismissal** - Each admin can dismiss independently
✅ **Click tracking** - Tracks total clicks (up to 20)
✅ **Social proof** - Shows "X users already claimed"
✅ **Free users only** - Hidden when Pro is active
✅ **AJAX-powered** - Smooth user experience
✅ **Simple** - No complex admin dashboards

---

## How It Works

### User Flow

```
User sees notice on dashboard
    ↓
Clicks "Get 80% OFF Coupon Code"
    ↓
System tracks click (increments counter)
    ↓
Shows popup with instructions
    ↓
Redirects to contact page
    ↓
User submits contact form
    ↓
You receive email → Send EARLYACCESS80 coupon immediately
    ↓
User purchases Pro with 80% discount
```

### Technical Flow

**Frontend (JavaScript):**
- User clicks button
- AJAX request to `ar_track_promo_click`
- Shows instructions popup
- Redirects to contact page

**Backend (PHP):**
- Checks claim limit (20 max)
- Increments counter
- Stores basic user data
- Returns redirect URL

---

## File Structure

```
ar-vr-3d-model-try-on/
├── includes/
│   └── AR_TRY_ON_Admin_Notice.php       # Main notice system class
├── admin/
│   └── js/
│       └── admin-notice.js              # JavaScript for AJAX
└── PROMO_SYSTEM_GUIDE.md                # This file
```

---

## Usage Guide

### Processing Requests

When you receive a contact form submission:

1. **Send coupon immediately** (no review requirement):

```
Hi [Name],

Thank you for your interest in AtlasAR Pro! 🎉

Here's your exclusive 80% OFF Early Access coupon code:

━━━━━━━━━━━━━━━━━━━━
   EARLYACCESS80
━━━━━━━━━━━━━━━━━━━━

To redeem:
1. Visit: https://wpaugmentedreality.com/3d-viewer-3d-model-viewer-augmented-reality-atlasar-pricing/
2. Select your plan
3. Apply coupon code: EARLYACCESS80
4. Enjoy 80% OFF your first year!

Features you'll get:
✅ Dimensions Display
✅ Interactive Hotspots
✅ Product Configurators
✅ Automatic Compression
✅ Priority Support

This offer is valid for 7 days from today.

As an early adopter, we'd love to hear your feedback! If you enjoy AtlasAR Pro,
please consider leaving a review on WordPress.org (completely optional):
https://wordpress.org/support/plugin/ar-vr-3d-model-try-on/reviews/

Best regards,
AtlasAR Team
```

2. **Follow up later** (optional, after they've used the plugin):
   - Wait 2-3 weeks
   - Ask how they're enjoying the Pro features
   - Mention reviews are appreciated (but never required)

---

## Database Storage

### WordPress Options

- `ar_try_on_promo_total_claims` - Total number of clicks (integer, max 20)
- `ar_try_on_promo_claim_data` - Array of basic claim info (email, timestamp, site URL)

### User Meta

- `ar_try_on_promo_clicked` - Whether user clicked button (boolean)
- `ar_try_on_dismiss_promo_notice` - Whether user dismissed notice (boolean)

---

## Customization

### Change Maximum Claims

Edit `AR_TRY_ON_Admin_Notice.php`:
```php
$max_claims = 20; // Change to desired number
```

### Change Discount Percentage

Edit notice text in `display_promo_notice()` method:
```php
Get <strong>80% OFF</strong>
```

### Change Contact URL

Edit `ajax_track_promo_click()` method:
```php
$contact_url = 'https://wpaugmentedreality.com/contact-us/';
```

---

## Freemius Coupon Setup

1. Go to Freemius Dashboard
2. Navigate to **Pricing → Coupons**
3. Create new coupon:
   - Code: `EARLYACCESS80`
   - Discount: 80%
   - Duration: First year only
   - Limit: 20-30 uses (add buffer for legitimate duplicate requests)
   - Expiration: Optional (e.g., 30 days)

---

## Testing

### Test the Notice

1. Deactivate Pro plugin (if active)
2. Go to **Dashboard** or **AtlasAR** menu
3. Notice should appear at top

### Test Click Tracking

1. Click "Get 80% OFF Coupon Code" button
2. Check database option `ar_try_on_promo_total_claims` (should be 1)
3. Refresh dashboard - notice should show "You've requested this offer!"

### Reset for Testing

Run in database or via code:
```php
delete_option( 'ar_try_on_promo_total_claims' );
delete_option( 'ar_try_on_promo_claim_data' );
delete_metadata( 'user', 0, 'ar_try_on_promo_clicked', '', true );
delete_metadata( 'user', 0, 'ar_try_on_dismiss_promo_notice', '', true );
```

---

## FAQ

**Q: Why no admin dashboard for tracking?**
A: Simpler is better. You'll receive contact form emails anyway. No need for complex tracking that doesn't reflect actual purchases.

**Q: Can users claim multiple times?**
A: No, the system tracks per-user clicks. Same user can't increment counter twice.

**Q: What happens after 20 claims?**
A: Notice automatically stops showing to all users.

**Q: Does this work with multiple admins?**
A: Yes, each admin can dismiss the notice independently.

**Q: How do I track who actually purchased?**
A: Check your Freemius dashboard for coupon usage. That's the actual source of truth.

**Q: Is this WordPress.org compliant?**
A: Yes! We give coupons to anyone who contacts us. Reviews are mentioned as optional feedback, never required.

---

## WordPress.org Guidelines Compliance

**Reference:** [WordPress Plugin Guideline #9](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/#9-developers-and-their-plugins-must-not-do-anything-illegal-dishonest-or-morally-offensive)

✅ **Compliant:**
- Offering discount to early adopters
- Asking for optional feedback
- Mentioning reviews are appreciated

❌ **Non-Compliant (DO NOT DO):**
- "Leave a review to get coupon"
- "Get coupon after reviewing"
- Any review requirement or incentive

Our system gives coupons immediately upon request, making reviews completely voluntary.

---

## Support

For questions or issues:
- Email: atlasaidev@gmail.com
- Plugin: https://wpaugmentedreality.com

---

## Changelog

### Version 1.8.0 (2026-01-25)
- Initial release of promo system
- 20-user early access promotion
- Simple click tracking
- Per-user dismissal
- WordPress.org compliant (no review incentives)
