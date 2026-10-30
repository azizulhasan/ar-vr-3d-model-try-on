/**
 * AR-114: copy the AtlasAR viewer SDK (Free core) into the plugin: public/js/atlasar-sdk/.
 *   node scripts/copy-atlasar-sdk.js [path to an atlasar-viewer checkout or its dist/]
 * Source: github.com/atlasaidev/atlasar-viewer (GPL-2.0-or-later), the same code the plugin ships;
 * the human-readable source is in that repository (wp.org guideline 4). Only the Free core is
 * copied — the Premium modules ship in AtlasAR Pro.
 */
const fs = require('fs');
const path = require('path');

const arg = process.argv[2] || process.env.ATLASAR_SDK_DIR || '';
if (!arg) {
    console.error('Usage: node scripts/copy-atlasar-sdk.js <atlasar-viewer checkout or its dist/>');
    process.exit(1);
}
const dist = fs.existsSync(path.join(arg, 'dist', 'atlasar.js')) ? path.join(arg, 'dist') : arg;
const out = path.join(__dirname, '..', 'public', 'js', 'atlasar-sdk');
const FILES = ['atlasar.js', 'atlasar.css', 'atlasar-tryon.js', 'tryon-worker.js', 'atlasar-tools.js', 'atlasar-flat.js', 'THIRD-PARTY-NOTICES.md', 'vendor', 'media']; // media: AR-156 sample face

for (const f of FILES) {
    if (!fs.existsSync(path.join(dist, f))) {
        console.error(`missing in ${dist}: ${f}`);
        process.exit(1);
    }
}
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of FILES) fs.cpSync(path.join(dist, f), path.join(out, f), { recursive: true });
const version = (fs.readFileSync(path.join(out, 'atlasar.js'), 'utf8').match(/VERSION:"([^"]+)"|"(\d+\.\d+\.\d+)"/) || [])[1] || '?';
fs.writeFileSync(path.join(out, 'README.md'), `# AtlasAR viewer SDK (bundled)\n\nCopied from https://github.com/atlasaidev/atlasar-viewer (dist/) by scripts/copy-atlasar-sdk.js.\nSource code: that repository (src/). Licence: GPL-2.0-or-later; third-party notices in THIRD-PARTY-NOTICES.md.\nDo not edit these files here: change the SDK and copy it again.\n`);
console.log(`[atlasar-sdk] copied ${FILES.length} items into public/js/atlasar-sdk (from ${dist})`);
