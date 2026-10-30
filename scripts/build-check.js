/**
 * AR-121: `npm run production` — AtlasAR has no bundling step any more: the admin screens are
 * plain scripts on WordPress's own React (admin/js/atlas-ar-*.js), the shop uses the AtlasAR
 * viewer SDK (public/js/atlasar-sdk, copied by scripts/copy-atlasar-sdk.js from the public
 * atlasar-viewer repository) plus public/js/atlas-ar-front.js.
 *
 * This check makes sure what ships is complete and clean:
 *   - every shipped script parses (node --check),
 *   - the SDK copy has all its files,
 *   - no console.log in the plugin's own scripts (wp.org review).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const own = ['admin/js', 'public/js', 'blocks'].flatMap((dir) =>
    fs.readdirSync(path.join(root, dir)).filter((f) => f.endsWith('.js')).map((f) => path.join(dir, f)));
const sdkFiles = ['atlasar.js', 'atlasar.css', 'atlasar-tryon.js', 'tryon-worker.js', 'atlasar-tools.js', 'atlasar-flat.js', 'THIRD-PARTY-NOTICES.md', 'vendor/model-viewer.min.js', 'vendor/meshopt_decoder.js'];
let failed = 0;

for (const rel of own) {
    try {
        execFileSync(process.execPath, ['--check', path.join(root, rel)], { stdio: 'pipe' });
    } catch (err) {
        failed++;
        console.error(`✗ ${rel} does not parse:\n${String(err.stderr || err.message).trim()}`);
    }
    if (/\bconsole\.log\(/.test(fs.readFileSync(path.join(root, rel), 'utf8'))) {
        failed++;
        console.error(`✗ ${rel} has console.log`);
    }
}
for (const f of sdkFiles) {
    if (!fs.existsSync(path.join(root, 'public/js/atlasar-sdk', f))) {
        failed++;
        console.error(`✗ public/js/atlasar-sdk/${f} is missing (run scripts/copy-atlasar-sdk.js)`);
    }
}
if (failed) {
    console.error(`${failed} problem(s)`);
    process.exit(1);
}
console.log(`✓ ${own.length} scripts parse, no console.log; viewer SDK complete (${sdkFiles.length} files)`);
