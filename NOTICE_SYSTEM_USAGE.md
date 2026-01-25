# Reusable Admin Notice System - Usage Guide

## Overview

The notice system is now fully reusable! You can create unlimited admin notices by just calling `register_notice()` with your configuration.

---

## Quick Start

```php
// Get notice instance
$notice_system = AR_TRY_ON_Admin_Notice::instance();

// Register a new notice
$notice_system->register_notice( array(
    'id'      => 'my_notice',
    'title'   => 'My Awesome Notice',
    'message' => 'This is a simple notice!',
    'buttons' => array(
        array(
            'text' => 'Click Me',
            'url'  => 'https://example.com',
        ),
    ),
) );
```

---

## Parameters

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Unique notice ID (e.g., 'black_friday_sale') |
| `title` | string | Notice title/heading |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `message` | string | '' | Notice message content (HTML allowed) |
| `type` | string | 'info' | Notice type: 'info', 'success', 'warning', 'error' |
| `icon` | string | '🎉' | Emoji icon (48px) |
| `dismissible` | bool | true | Can users dismiss this notice? |
| `show_once` | bool | false | Show only once per user? |
| `condition` | callable | null | Function that returns true/false to show notice |
| `screens` | array | [] | Specific admin screens to show on (empty = all) |
| `buttons` | array | [] | Array of button configurations |
| `footer_text` | string | '' | Small text at bottom (HTML allowed) |
| `track_clicks` | bool | false | Track how many users clicked? |
| `max_clicks` | int | 0 | Max clicks allowed (0 = unlimited) |
| `click_action` | callable | null | Custom function when button clicked |

---

## Examples

### Example 1: Simple Info Notice

```php
AR_TRY_ON_Admin_Notice::instance()->register_notice( array(
    'id'      => 'welcome_notice',
    'title'   => '👋 Welcome to AtlasAR!',
    'message' => 'Thank you for installing our plugin. Check out the getting started guide.',
    'type'    => 'success',
    'buttons' => array(
        array(
            'text' => 'Get Started',
            'url'  => admin_url( 'admin.php?page=ar-vr-3d-model-try-on' ),
            'type' => 'primary',
            'icon' => 'book',
        ),
    ),
    'show_once' => true, // Only show once per user
) );
```

### Example 2: Warning Notice with Condition

```php
AR_TRY_ON_Admin_Notice::instance()->register_notice( array(
    'id'        => 'php_version_warning',
    'title'     => '⚠️ PHP Version Notice',
    'message'   => 'Your PHP version is outdated. Please upgrade to PHP 8.0 or higher.',
    'type'      => 'warning',
    'icon'      => '⚠️',
    'condition' => function() {
        return version_compare( PHP_VERSION, '8.0', '<' );
    },
    'buttons' => array(
        array(
            'text' => 'Learn How to Upgrade',
            'url'  => 'https://wordpress.org/support/update-php/',
            'type' => 'primary',
        ),
    ),
) );
```

### Example 3: Limited Offer with Click Tracking

```php
AR_TRY_ON_Admin_Notice::instance()->register_notice( array(
    'id'           => 'black_friday_2026',
    'title'        => '🔥 Black Friday Sale - 50% OFF!',
    'message'      => 'Limited time offer! Get 50% off AtlasAR Pro this Black Friday.',
    'type'         => 'info',
    'icon'         => '🎁',
    'track_clicks' => true,
    'max_clicks'   => 100, // First 100 users only
    'buttons'      => array(
        array(
            'text'   => 'Claim 50% OFF',
            'type'   => 'primary',
            'icon'   => 'cart',
            'action' => 'claim_black_friday', // AJAX action
            'track'  => true,
        ),
    ),
    'footer_text'  => 'Offer valid until Dec 1, 2026. Limited to first 100 users.',
    'click_action' => function( $notice_id, $action, $user ) {
        if ( $action === 'claim_black_friday' ) {
            // Send email, create coupon, etc.
            return array(
                'redirect_url' => 'https://yoursite.com/pricing/',
                'coupon_code'  => 'BLACKFRIDAY50',
            );
        }
        return array();
    },
) );
```

### Example 4: Review Request (Conditional)

```php
AR_TRY_ON_Admin_Notice::instance()->register_notice( array(
    'id'        => 'review_request',
    'title'     => '⭐ Enjoying AtlasAR?',
    'message'   => 'If you love our plugin, please consider leaving a 5-star review!',
    'type'      => 'success',
    'icon'      => '😊',
    'condition' => function() {
        // Only show after plugin installed for 7+ days
        $installed = get_option( 'ar_try_on_installed_date' );
        if ( ! $installed ) {
            return false;
        }
        $days = ( time() - $installed ) / DAY_IN_SECONDS;
        return $days >= 7;
    },
    'buttons' => array(
        array(
            'text' => 'Leave a Review',
            'url'  => 'https://wordpress.org/support/plugin/ar-vr-3d-model-try-on/reviews/',
            'type' => 'primary',
            'icon' => 'star-filled',
        ),
        array(
            'text' => 'Maybe Later',
            'url'  => '#',
            'type' => 'secondary',
        ),
    ),
    'show_once' => true,
) );
```

### Example 5: Update Available

```php
AR_TRY_ON_Admin_Notice::instance()->register_notice( array(
    'id'       => 'pro_update_available',
    'title'    => '🚀 New Pro Features Available!',
    'message'  => 'AtlasAR Pro 2.0 is now available with Glass Mode Virtual Try-On and Analytics Dashboard.',
    'type'     => 'info',
    'icon'     => '🎉',
    'screens'  => array( 'plugins', 'dashboard' ), // Only show on these screens
    'buttons'  => array(
        array(
            'text' => 'View What\'s New',
            'url'  => 'https://wpaugmentedreality.com/changelog/',
            'type' => 'primary',
            'icon' => 'external',
        ),
        array(
            'text' => 'Upgrade Now',
            'url'  => admin_url( 'update-core.php' ),
            'type' => 'secondary',
        ),
    ),
) );
```

### Example 6: Survey/Feedback Request

```php
AR_TRY_ON_Admin_Notice::instance()->register_notice( array(
    'id'           => 'user_survey_2026',
    'title'        => '📊 Help Us Improve!',
    'message'      => 'Take our 2-minute survey and help shape the future of AtlasAR.',
    'type'         => 'info',
    'icon'         => '💬',
    'track_clicks' => true,
    'max_clicks'   => 50, // First 50 respondents
    'buttons'      => array(
        array(
            'text'   => 'Take Survey',
            'action' => 'start_survey',
            'type'   => 'primary',
            'icon'   => 'clipboard',
            'track'  => true,
        ),
    ),
    'footer_text'  => 'Your feedback helps us build better features!',
    'click_action' => function( $notice_id, $action, $user ) {
        return array(
            'redirect_url' => 'https://forms.gle/yoursurvey',
        );
    },
) );
```

---

## Button Configuration

Each button in the `buttons` array can have:

```php
array(
    'text'   => 'Button Text',         // Required
    'type'   => 'primary',              // 'primary' or 'secondary'
    'icon'   => 'cart',                 // Dashicon name (without 'dashicons-')
    'url'    => 'https://example.com',  // For regular links
    'action' => 'my_action_name',       // For AJAX buttons
    'track'  => true,                   // Track this specific button?
)
```

**Regular Link Button:**
- Use `url` parameter
- Opens link when clicked
- No tracking

**AJAX Action Button:**
- Use `action` parameter (instead of `url`)
- Calls `click_action` function
- Can track clicks
- Can redirect after action

---

## Click Action Handler

If you use `action` buttons, define a `click_action` handler:

```php
'click_action' => function( $notice_id, $action, $user ) {
    // $notice_id: The notice ID
    // $action: The button action name
    // $user: WP_User object

    if ( $action === 'my_action' ) {
        // Do something...
        // Send email, create coupon, log data, etc.

        // Return array with optional redirect
        return array(
            'redirect_url' => 'https://example.com',
            'custom_data'  => 'anything you want',
        );
    }

    return array(); // Default: no redirect
},
```

---

## Condition Function

Use `condition` to control when notice shows:

```php
'condition' => function() {
    // Return true to show, false to hide

    // Example: Only show to admins
    if ( ! current_user_can( 'manage_options' ) ) {
        return false;
    }

    // Example: Only show if Pro is not active
    if ( class_exists( 'AR_TRY_ON_Pro' ) ) {
        return false;
    }

    // Example: Only show between dates
    $now = time();
    $start = strtotime( '2026-11-25' );
    $end = strtotime( '2026-12-01' );
    return $now >= $start && $now <= $end;

    return true;
},
```

---

## Screen Targeting

Limit notice to specific admin screens:

```php
'screens' => array(
    'dashboard',                              // Dashboard
    'plugins',                                // Plugins page
    'toplevel_page_ar-vr-3d-model-try-on',   // Your plugin page
    'edit-post',                              // Post editor
    'edit-product',                           // WooCommerce products
),
```

**Get current screen ID:**
```php
add_action( 'admin_footer', function() {
    $screen = get_current_screen();
    echo '<!-- Screen ID: ' . $screen->id . ' -->';
} );
```

---

## User Meta Storage

The system automatically stores:

- `ar_try_on_dismiss_{notice_id}` - User dismissed notice
- `ar_try_on_shown_{notice_id}` - Notice was shown (for show_once)
- `ar_try_on_clicked_{notice_id}` - User clicked action button

## Options Storage

If `track_clicks` is enabled:

- `ar_try_on_clicks_{notice_id}` - Total click count

---

## Best Practices

1. **Use unique IDs**: `black_friday_2026`, not `sale`
2. **Be concise**: Keep titles under 60 chars
3. **Provide value**: Don't spam users with notices
4. **Set conditions**: Only show when relevant
5. **Track wisely**: Only track important actions
6. **Test thoroughly**: Check dismissal, conditions, click tracking

---

## Removing/Updating Notices

Notices are registered on each page load. To remove a notice, just stop calling `register_notice()` for that ID.

To update a notice, call `register_notice()` again with the same ID and new parameters.

---

## WordPress.org Compliance

✅ **DO:**
- Give coupons/offers to users who contact you
- Ask for optional feedback
- Mention reviews are appreciated

❌ **DON'T:**
- Require reviews for benefits
- Incentivize positive reviews
- Penalize negative reviews

---

## Support

Questions? Check:
- Main documentation: `PROMO_SYSTEM_GUIDE.md`
- Class file: `includes/AR_TRY_ON_Admin_Notice.php`

---

## Changelog

### Version 1.8.0
- Initial reusable notice system
- Support for conditions, screen targeting, click tracking
- AJAX button actions
- Per-user dismissal and show-once
