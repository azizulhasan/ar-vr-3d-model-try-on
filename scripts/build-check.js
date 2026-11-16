/**
 * AR-121: `npm run production` — AtlasAR has no bundling step any more: the admin screens are
 * plain scripts on WordPress's own React (admin/js/atlas-ar-*.js), the shop uses the AtlasAR
 * viewer SDK (public/js/atlasar-sdk, copied by scripts/copy-atlasar-sdk.js from the public
 * atlasar-viewer repository) plus public/js/atlas-ar-front.js.
 *
 * This check makes sure what ships is complete and clean:
 *   - every shipped script parses (node --check),
 *   - the SDK copy has all its files,
 *   - no console.log in the plugin's own scripts (wp.org review),
 *   - AR-180: the admin scripts pass the text domain as a literal ('ar-vr-3d-model-try-on'), not
 *     as the old variable D: `wp i18n make-pot` skips strings whose domain is a variable,
 *   - AR-180: no file under admin/ asks whether AtlasAR Pro is active (wp.org guideline 5: the
 *     free plugin reads filters only; Pro adds its parts through them).
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
// AR-180: __( 'Text', D ) and the like: the old variable text domain.
const listJs = (dir) => fs.readdirSync(path.join(root, dir)).filter((n) => n.endsWith('.js')).map((n) => `${dir}/${n}`);
for (const rel of listJs('admin/js')) {
    fs.readFileSync(path.join(root, rel), 'utf8').split(/\r?\n/).forEach((line, i) => {
        if (/,\s*D\s*\)/.test(line)) {
            failed++;
            console.error(`✗ ${rel}:${i + 1} passes the text domain as a variable; write 'ar-vr-3d-model-try-on'`);
        }
    });
}

// AR-180: the free plugin never checks for Pro. atlas-plugins.js is exempt: it is the shared
// "our plugins" page of every AtlasAiDev plugin and reads whether the Pro add-ons of OTHER
// products are installed to label their cards; it gates nothing in AtlasAR.
const proWords = /\b(is_pro\w*|isPro\w*|\w*PRO_VERSION)\b/;
const proExempt = ['admin/js/atlas-plugins.js'];
const adminFiles = fs.readdirSync(path.join(root, 'admin')).filter((n) => n.endsWith('.php')).map((n) => `admin/${n}`).concat(listJs('admin/js'));
for (const rel of adminFiles.filter((r) => !proExempt.includes(r))) {
    fs.readFileSync(path.join(root, rel), 'utf8').split(/\r?\n/).forEach((line, i) => {
        const hit = line.match(proWords);
        if (hit) {
            failed++;
            console.error(`✗ ${rel}:${i + 1} checks for AtlasAR Pro (${hit[0]}); read a filter instead`);
        }
    });
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
