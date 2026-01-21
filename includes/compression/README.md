# AR Try On - 3D Model Compression

Server-side compression scripts for compressing large 3D models (GLB/GLTF) using Node.js.

## Features

- **Draco Geometry Compression**: Reduces mesh data size by up to 90%
- **Texture Compression**: Optimizes textures while maintaining quality
- **Format Conversion**: Converts FBX/OBJ to compressed GLB format (Pro only)
- **Background Processing**: Queue-based processing for bulk operations (Pro only)

## Requirements

- Node.js 16+ (with npm)
- PHP 7.4+
- WordPress 5.6+

## Installation

### 1. Install Node.js Dependencies

Navigate to the compression directory and install dependencies:

```bash
cd wp-content/plugins/ar-vr-3d-model-try-on/includes/compression
npm install
```

This will install:
- `@gltf-transform/core` - Core GLTF transformation library
- `@gltf-transform/extensions` - GLTF extensions support
- `draco3dgltf` - Draco compression library
- `sharp` - Image processing library

### 2. Verify Node.js Installation

Make sure Node.js is accessible from your server's command line:

```bash
node --version
# Should output: v16.0.0 or higher
```

### 3. Initialize Database Tables

The database tables are automatically created when you activate the plugin. If they're missing, you can manually trigger creation by visiting:

```
/wp-admin/?ar_create_compression_tables=1
```

Or deactivate and reactivate the plugin.

## Usage

### Client-Side Compression (Free)

For files < 5MB, compression happens in the browser using WebAssembly:
- Automatic compression when uploading models
- No server requirements
- Works for all users

### Server-Side Compression (Pro)

For files > 5MB, compression happens on the server:
- Requires Node.js installed on the server
- Better performance for large files
- Pro version only

### API Endpoints

- `GET  /wp-json/ar_try_on/v1/compression/settings` - Get compression settings
- `POST /wp-json/ar_try_on/v1/compression/settings` - Update settings
- `POST /wp-json/ar_try_on/v1/compression/prepare` - Prepare compression
- `POST /wp-json/ar_try_on/v1/compression/complete` - Mark compression complete
- `GET  /wp-json/ar_try_on/v1/compression/status/:post_id` - Get compression status
- `GET  /wp-json/ar_try_on/v1/compression/stats` - Get statistics
- `GET  /wp-json/ar_try_on/v1/compression/can-compress` - Check user limits
- `GET  /wp-json/ar_try_on/v1/compression/models` - List compressed models
- `DELETE /wp-json/ar_try_on/v1/compression/delete/:post_id` - Delete compressed model

### Pro-Only Endpoints

- `POST /wp-json/ar_try_on/v1/compression/bulk-compress` - Bulk compress models
- `POST /wp-json/ar_try_on/v1/compression/server-compress` - Server-side compression
- `POST /wp-json/ar_try_on/v1/compression/convert-format` - Convert FBX/OBJ to GLB

## Command Line Usage

### Compress a Model

```bash
node server-compress.js input.glb output.glb 85
```

Parameters:
- `input.glb` - Path to input GLB/GLTF file
- `output.glb` - Path to output compressed file
- `85` - Quality (1-100, higher = better quality, larger file)

### Convert Format

```bash
node format-converter.js input.fbx output.glb 85
```

## Compression Settings

Settings can be configured in **WordPress Admin > AR Try On > Settings > Compression**:

- **Enable Compression**: Toggle compression feature on/off
- **Quality**: Compression quality (1-100)
- **Keep Original Files**: Keep original files after compression
- **Auto Compress**: Automatically compress on upload

## Free vs Pro

### Free Version

- Client-side compression (< 5MB files)
- Up to 5 compressed models
- GLB/GLTF formats only
- Manual compression

### Pro Version

- Server-side compression (all file sizes)
- Unlimited compressed models
- FBX/OBJ format conversion
- Bulk compression
- Background queue processing
- Advanced analytics

## Troubleshooting

### "Node.js not found" Error

Make sure Node.js is installed and accessible:

```bash
which node
# Should output: /usr/bin/node or similar
```

Add Node.js to your system PATH if needed.

### "Module not found" Error

Install dependencies:

```bash
cd includes/compression
npm install
```

### Database Tables Missing

Visit: `/wp-admin/?ar_create_compression_tables=1`

Or check the error log for SQL errors.

### Compression Failed

Check WordPress debug log for detailed error messages:

```php
// In wp-config.php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

## Performance Tips

1. **Quality Settings**: Use 75-85 for best balance of quality and file size
2. **Keep Original**: Disable if disk space is limited
3. **Bulk Compression**: Use during off-peak hours (Pro only)
4. **Cron Schedule**: Runs every 5 minutes for queue processing (Pro only)

## File Structure

```
includes/compression/
├── server-compress.js    # Main compression script
├── format-converter.js   # Format conversion script
├── package.json          # Node.js dependencies
└── README.md            # This file
```

## Support

For issues or questions:
- GitHub: https://github.com/atlasaidev/ar-try-on
- Email: support@atlasaidev.com
- Docs: https://wpaugmentedreality.com/docs/
