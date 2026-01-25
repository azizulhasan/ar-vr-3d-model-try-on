# AtlasAR Pro Early Access Notice System

## Overview

Simple admin notice system for promoting AtlasAR Pro with an 80% off early access offer limited to 20 users.

## Features

✅ **User-specific dismissal** - Each admin can dismiss independently
✅ **Simple counter** - Tracks total clicks (up to 20)
✅ **Social proof** - Shows "X users already claimed"
✅ **Urgency** - Shows "Y spots left!"
✅ **Free users only** - Automatically hidden when Pro is active
✅ **WordPress.org compliant** - No review incentivization

---

## How It Works

### User Flow

```
User sees notice on dashboard/plugin pages
    ↓
Clicks "Get 80% OFF Coupon Code"
    ↓
System increments counter (max 20)
    ↓
Alert shows: "Fill contact form → Get coupon within 24h"
    ↓
Redirects to contact page
    ↓
User submits contact form
    ↓
You send EARLYACCESS80 coupon code immediately
    ↓
User purchases Pro with 80% discount
```

---

## WordPress.org Compliance

✅ **Compliant:** Give coupon codes to early adopters
✅ **Compliant:** Mention reviews are appreciated (after purchase)
✅ **Compliant:** Ask satisfied customers for feedback

❌ **NOT Compliant:** Require reviews for coupon codes
❌ **NOT Compliant:** Incentivize reviews in any way

**Our approach:** Send coupon immediately → After purchase, gently ask for optional review

---

## Files

```
includes/
  └── AR_TRY_ON_Admin_Notice.php    # Main notice system

admin/js/
  └── admin-notice.js               # AJAX handling

ar-vr-3d-model-try-on.php          # Initialization
```

---

## Data Storage

### WordPress Options
- `ar_try_on_promo_total_claims` - Simple counter (0-20)

### User Meta
- `ar_try_on_promo_clicked` - User already clicked (boolean)
- `ar_try_on_dismiss_promo_notice` - User dismissed notice (boolean)

**Note:** No detailed tracking. Just a counter for display purposes.

---

## Usage

### When User Contacts You

1. **Receive contact form** with subject: "Request 80% Off Coupon - Early Access"

2. **Send this email immediately:**

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
3. Apply coupon: EARLYACCESS80
4. Enjoy 80% OFF!

Features included:
✅ Dimensions Display
✅ Interactive Hotspots
✅ Product Configurators
✅ Automatic Compression
✅ Priority Support

Valid for 7 days.

Thanks for being an early adopter!

Best regards,
AtlasAR Team
```

3. **(Optional, after purchase)** Send follow-up asking for feedback:

```
Hi [Name],

Hope you're enjoying AtlasAR Pro!

We'd love to hear your feedback. If you have a moment,
please consider leaving a review (completely optional):
https://wordpress.org/support/plugin/ar-vr-3d-model-try-on/reviews/

Thanks!
```

---

## Freemius Coupon Setup

1. Go to Freemius Dashboard
2. **Pricing → Coupons**
3. Create coupon:
   - Code: `EARLYACCESS80`
   - Discount: 80%
   - Duration: First year only
   - Uses: 20 maximum
   - Expiration: 30-60 days (optional)

---

## Testing

### See the Notice
1. Deactivate Pro plugin
2. Visit Dashboard or AtlasAR menu
3. Notice appears at top

### Test Click
1. Click "Get 80% OFF Coupon Code"
2. Alert shows instructions
3. Redirects to contact page
4. Check counter incremented (visit dashboard again - should show "You've requested this offer!")

### After 20 Clicks
- Notice stops showing to all users
- Returns error: "Sorry, all spots have been claimed!"

---

## Customization

### Change Maximum Spots

Edit `AR_TRY_ON_Admin_Notice.php` line ~133:
```php
$max_claims = 20; // Change number here
```

Also update line ~247:
```php
if ( $total_claims >= 20 ) { // Change number here
```

### Change Discount Percentage

Edit notice text in `display_promo_notice()`:
```php
Get <strong>80% OFF</strong> // Change percentage
```

### Change Contact URL

Edit `ajax_track_promo_click()`:
```php
$contact_url = 'https://wpaugmentedreality.com/contact-us/';
```

---

## FAQ

**Q: Does this track who actually purchased?**
A: No. It only tracks button clicks. Check Freemius dashboard for actual purchases.

**Q: Can I reset the counter?**
A: Yes, manually via database:
```sql
DELETE FROM wp_options WHERE option_name = 'ar_try_on_promo_total_claims';
DELETE FROM wp_usermeta WHERE meta_key IN ('ar_try_on_promo_clicked', 'ar_try_on_dismiss_promo_notice');
```

**Q: Is this WordPress.org compliant?**
A: Yes! We send coupons immediately, no review required.

**Q: What if contact page shows 403?**
A: Fixed! We removed URL parameters to avoid security plugin blocks.

---

## Changelog

### Version 1.8.0 (2026-01-25)
- Simple notice system with 20-user limit
- WordPress.org compliant (no review incentives)
- Clean URL redirect (no parameters)
- Per-user dismissal
- Simple counter display
