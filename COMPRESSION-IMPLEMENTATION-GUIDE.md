# Server-Side Compression Implementation Guide

## ✅ Completed Implementation

### 1. Backend (PHP) - COMPLETED
- ✅ Smart compression router (`compress_server_side()`)
- ✅ Local compression (`compress_server_side_local()`)
- ✅ API compression (`compress_server_side_api()`)
- ✅ Helper functions for Node.js and dependency checks
- ✅ Dependency installation/uninstallation functions
- ✅ REST API endpoints for dependency management

### 2. REST API Endpoints - COMPLETED
- ✅ `GET /compression/node-status` - Check Node.js availability
- ✅ `GET /compression/dependencies-status` - Check dependencies installed
- ✅ `POST /compression/install-dependencies` - Install npm packages
- ✅ `POST /compression/uninstall-dependencies` - Remove npm packages
- ✅ `POST /compression/method` - Update compression method (auto/local/api)
- ✅ `POST /compression/api-url` - Update API URL

### 3. Package Configuration - COMPLETED
- ✅ Minimal `package.json` with only required dependencies
- ✅ Located at: `includes/compression/package.json`

## 🔄 Remaining Implementation

### 4. Settings UI (WordPress Admin)

You need to add a settings page section. Here's where to add it:

**File**: Find your plugin's settings page file (likely `admin/settings.php` or similar)

**Add this HTML section:**

```php
<!-- Server-Side Compression Settings (Pro Only) -->
<?php if ( AR_TRY_ON_Compression::is_pro_active() ) : ?>
<div class="compression-settings-section">
    <h2><?php _e( 'Server-Side Compression Setup', 'ar-vr-3d-model-try-on' ); ?></h2>

    <!-- Compression Method Selection -->
    <div class="setting-row">
        <label><?php _e( 'Compression Method', 'ar-vr-3d-model-try-on' ); ?></label>
        <div class="compression-method-options">
            <label>
                <input type="radio" name="compression_method" value="auto" checked>
                <?php _e( 'Automatic (Recommended)', 'ar-vr-3d-model-try-on' ); ?>
                <p class="description"><?php _e( 'Try local compression first, fallback to API if unavailable', 'ar-vr-3d-model-try-on' ); ?></p>
            </label>
            <label>
                <input type="radio" name="compression_method" value="local">
                <?php _e( 'Local Only', 'ar-vr-3d-model-try-on' ); ?>
                <p class="description"><?php _e( 'Use only local Node.js compression', 'ar-vr-3d-model-try-on' ); ?></p>
            </label>
            <label>
                <input type="radio" name="compression_method" value="api">
                <?php _e( 'API Only', 'ar-vr-3d-model-try-on' ); ?>
                <p class="description"><?php _e( 'Use only external compression API', 'ar-vr-3d-model-try-on' ); ?></p>
            </label>
        </div>
    </div>

    <!-- Local Compression Setup -->
    <div class="setting-row">
        <h3><?php _e( 'Local Compression Setup', 'ar-vr-3d-model-try-on' ); ?></h3>

        <div id="node-status" class="status-box">
            <div class="status-item">
                <span class="label"><?php _e( 'Node.js Status:', 'ar-vr-3d-model-try-on' ); ?></span>
                <span id="node-status-value" class="status-value">Checking...</span>
            </div>
            <div class="status-item">
                <span class="label"><?php _e( 'Dependencies Status:', 'ar-vr-3d-model-try-on' ); ?></span>
                <span id="deps-status-value" class="status-value">Checking...</span>
            </div>
            <div id="deps-packages" class="packages-list" style="display:none;"></div>
        </div>

        <div class="button-group">
            <button type="button" id="install-deps-btn" class="button button-primary" disabled>
                <?php _e( 'Install Dependencies', 'ar-vr-3d-model-try-on' ); ?>
            </button>
            <button type="button" id="uninstall-deps-btn" class="button button-secondary" disabled>
                <?php _e( 'Uninstall Dependencies', 'ar-vr-3d-model-try-on' ); ?>
            </button>
        </div>

        <div id="installation-progress" style="display:none;">
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <p class="progress-message"></p>
        </div>
    </div>

    <!-- API Compression Setup -->
    <div class="setting-row">
        <h3><?php _e( 'API Compression Setup', 'ar-vr-3d-model-try-on' ); ?></h3>

        <label for="compression_api_url"><?php _e( 'API URL:', 'ar-vr-3d-model-try-on' ); ?></label>
        <input type="url" id="compression_api_url" name="compression_api_url"
               value="<?php echo esc_attr( get_option( 'ar_try_on_compression_api_url', '' ) ); ?>"
               placeholder="http://localhost:3000"
               class="regular-text">
        <button type="button" id="test-api-btn" class="button">
            <?php _e( 'Test Connection', 'ar-vr-3d-model-try-on' ); ?>
        </button>

        <p class="description">
            <?php _e( 'Note: API compression is slower than local compression. Local is recommended when available.', 'ar-vr-3d-model-try-on' ); ?>
        </p>
    </div>
</div>
<?php endif; ?>
```

**Add this JavaScript** (in a separate file or inline):

```javascript
jQuery(document).ready(function($) {
    const apiBase = '<?php echo rest_url( 'ar_try_on/v1' ); ?>';
    const nonce = '<?php echo wp_create_nonce( 'wp_rest' ); ?>';

    // Check Node.js status
    function checkNodeStatus() {
        $.ajax({
            url: apiBase + '/compression/node-status',
            headers: { 'X-WP-Nonce': nonce },
            success: function(response) {
                const data = response.data;
                const status = data.available ?
                    `<span class="status-success">✅ ${data.message}</span>` :
                    `<span class="status-error">❌ ${data.message}</span>`;
                $('#node-status-value').html(status);

                if (!data.available) {
                    $('#install-deps-btn').prop('disabled', true);
                    showNodeInstallationHelp();
                }
            }
        });
    }

    // Check dependencies status
    function checkDepsStatus() {
        $.ajax({
            url: apiBase + '/compression/dependencies-status',
            headers: { 'X-WP-Nonce': nonce },
            success: function(response) {
                const data = response.data;
                const status = data.installed ?
                    `<span class="status-success">✅ ${data.message}</span>` :
                    `<span class="status-warning">⚠️ ${data.message}</span>`;
                $('#deps-status-value').html(status);

                if (data.installed) {
                    $('#install-deps-btn').text('Reinstall Dependencies').prop('disabled', false);
                    $('#uninstall-deps-btn').prop('disabled', false);
                    showPackagesList(data.packages);
                } else {
                    $('#install-deps-btn').text('Install Dependencies').prop('disabled', false);
                    $('#uninstall-deps-btn').prop('disabled', true);
                }
            }
        });
    }

    // Show packages list
    function showPackagesList(packages) {
        if (packages.length === 0) return;

        let html = '<ul class="packages">';
        packages.forEach(pkg => {
            html += `<li>${pkg.name} <span class="version">v${pkg.version}</span></li>`;
        });
        html += '</ul>';

        $('#deps-packages').html(html).show();
    }

    // Show Node.js installation help
    function showNodeInstallationHelp() {
        const help = `
            <div class="notice notice-warning inline">
                <p><strong>Node.js is required for local compression.</strong></p>
                <p>To install Node.js:</p>
                <ol>
                    <li>Visit <a href="https://nodejs.org" target="_blank">nodejs.org</a></li>
                    <li>Download and install the LTS version</li>
                    <li>Refresh this page after installation</li>
                </ol>
                <p>Alternative: Use API-based compression instead (configure API URL below)</p>
            </div>
        `;
        $('#node-status').after(help);
    }

    // Install dependencies
    $('#install-deps-btn').on('click', function() {
        if (!confirm('Install compression dependencies? This may take several minutes and require ~200MB disk space.')) {
            return;
        }

        const $btn = $(this);
        $btn.prop('disabled', true).text('Installing...');
        $('#installation-progress').show();
        $('.progress-message').text('Installing npm packages...');

        $.ajax({
            url: apiBase + '/compression/install-dependencies',
            method: 'POST',
            headers: { 'X-WP-Nonce': nonce },
            timeout: 300000, // 5 minutes
            success: function(response) {
                $('.progress-fill').css('width', '100%');
                $('.progress-message').text(response.message);

                setTimeout(function() {
                    $('#installation-progress').fadeOut();
                    checkDepsStatus();
                    alert('✅ ' + response.message);
                }, 2000);
            },
            error: function(xhr) {
                const error = xhr.responseJSON || {};
                alert('❌ Installation failed: ' + (error.message || 'Unknown error'));
                $('#installation-progress').hide();
                $btn.prop('disabled', false).text('Install Dependencies');
            }
        });
    });

    // Uninstall dependencies
    $('#uninstall-deps-btn').on('click', function() {
        if (!confirm('Uninstall compression dependencies? You can reinstall them later.')) {
            return;
        }

        const $btn = $(this);
        $btn.prop('disabled', true).text('Uninstalling...');

        $.ajax({
            url: apiBase + '/compression/uninstall-dependencies',
            method: 'POST',
            headers: { 'X-WP-Nonce': nonce },
            success: function(response) {
                alert('✅ ' + response.message);
                checkDepsStatus();
            },
            error: function(xhr) {
                const error = xhr.responseJSON || {};
                alert('❌ Uninstallation failed: ' + (error.message || 'Unknown error'));
                $btn.prop('disabled', false).text('Uninstall Dependencies');
            }
        });
    });

    // Update compression method
    $('input[name="compression_method"]').on('change', function() {
        const method = $(this).val();

        $.ajax({
            url: apiBase + '/compression/method',
            method: 'POST',
            headers: { 'X-WP-Nonce': nonce },
            data: { method: method },
            success: function(response) {
                // Visual feedback
                $('.compression-method-options label').removeClass('active');
                $('input[value="' + method + '"]').closest('label').addClass('active');
            }
        });
    });

    // Update API URL
    $('#compression_api_url').on('blur', function() {
        const url = $(this).val();
        if (!url) return;

        $.ajax({
            url: apiBase + '/compression/api-url',
            method: 'POST',
            headers: { 'X-WP-Nonce': nonce },
            data: { url: url }
        });
    });

    // Initialize
    checkNodeStatus();
    checkDepsStatus();

    // Set current compression method
    const currentMethod = '<?php echo AR_TRY_ON_Compression::get_compression_method(); ?>';
    $('input[value="' + currentMethod + '"]').prop('checked', true);
});
```

### 5. Uninstall Hook

**File**: `includes/AR_TRY_ON_Activator.php` or create `uninstall.php` in plugin root

**Add this code:**

```php
/**
 * Plugin uninstall handler
 *
 * @since 1.8.0
 */
function ar_try_on_uninstall() {
    // Clean up compression dependencies
    $plugin_dir = dirname( __FILE__ );
    $node_modules_dir = $plugin_dir . '/includes/compression/node_modules';

    if ( is_dir( $node_modules_dir ) ) {
        ar_try_on_delete_directory_recursive( $node_modules_dir );
    }

    // Clean up database options
    delete_option( 'ar_try_on_compression_method' );
    delete_option( 'ar_try_on_compression_api_url' );
}

/**
 * Recursively delete directory
 */
function ar_try_on_delete_directory_recursive( $dir ) {
    if ( ! is_dir( $dir ) ) {
        return false;
    }

    $files = array_diff( scandir( $dir ), array( '.', '..' ) );

    foreach ( $files as $file ) {
        $path = $dir . '/' . $file;

        if ( is_dir( $path ) ) {
            ar_try_on_delete_directory_recursive( $path );
        } else {
            unlink( $path );
        }
    }

    return rmdir( $dir );
}

register_uninstall_hook( __FILE__, 'ar_try_on_uninstall' );
```

## Testing Checklist

### Local Compression
- [ ] Check Node.js detection works
- [ ] Install dependencies via UI
- [ ] Compress a model using local method
- [ ] Verify compressed file created
- [ ] Check compression stats in database
- [ ] Uninstall dependencies via UI

### API Compression
- [ ] Configure API URL
- [ ] Test API connection
- [ ] Compress model using API method
- [ ] Verify fallback from local to API works

### Automatic Mode
- [ ] Set to automatic mode
- [ ] Verify tries local first
- [ ] Verify fallbacks to API
- [ ] Check error handling when neither available

### Cleanup
- [ ] Deactivate plugin
- [ ] Verify node_modules still exist
- [ ] Uninstall plugin
- [ ] Verify node_modules deleted
- [ ] Verify database options cleaned

## File Structure

```
ar-vr-3d-model-try-on/
├── includes/
│   ├── AR_TRY_ON_Compression.php (✅ Updated with smart router)
│   └── compression/
│       ├── package.json (✅ Minimal dependencies)
│       ├── server-compress.js (✅ Existing)
│       ├── node_modules/ (Created by npm install)
│       └── README.md
├── api/
│   └── AR_TRY_ON_Compression_Routes.php (✅ Updated with new endpoints)
└── admin/
    └── settings-compression.php (❌ TO BE CREATED - Settings UI)
```

## Database Options

```php
ar_try_on_compression_method: 'auto' | 'local' | 'api'  (default: 'auto')
ar_try_on_compression_api_url: 'http://...' (default: '')
```

## Next Steps

1. Create the settings UI in your admin settings page
2. Add the JavaScript for UI interactions
3. Create/update the uninstall hook
4. Test the complete workflow
5. Add user documentation

## Support & Troubleshooting

### Node.js not detected
- Ensure Node.js is installed: `node --version`
- Check PATH environment variable
- Restart web server after Node.js installation

### npm install fails
- Check disk space (requires ~200MB)
- Check internet connection
- Try manual install: `cd includes/compression && npm install`
- Check file permissions

### Compression fails
- Check error logs: WordPress Debug Log
- Verify file paths are correct
- Check Node.js can execute scripts
- Verify dependencies installed correctly

---

**Implementation Status**: 80% Complete
**Remaining**: Settings UI, Uninstall Hook
**Est. Time**: 30-60 minutes for completion
