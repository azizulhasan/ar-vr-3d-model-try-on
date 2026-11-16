/**
 * AR-180 / AR-181: unit tests for the admin map, the header search and the address parser.
 * Run: npm test (node --test tests/js). No dependencies: the real shipped files are loaded in a
 * vm context with a small fake `wp` (no React is rendered here; the browser test covers that).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..', '..');
const LINK = { id: 'licence', label: 'Licence', href: 'admin.php?page=atlas-ar-pro-licence', group: 'more', icon: 'external', keywords: 'licence key' };

/** A fresh page: the kit, the map, the search and the shell, with filters an add-on may set. */
function load(opts) {
	opts = opts || {};
	const filters = opts.filters || {};
	const sprintf = (fmt, ...args) => {
		let i = 0;
		return String(fmt).replace(/%(\d+\$)?[sd]/g, (m, pos) => String(pos ? args[parseInt(pos, 10) - 1] : args[i++]));
	};
	const wp = {
		element: { createElement: () => null, Fragment: 'Fragment', useState: (v) => [v, () => {}], useEffect: () => {}, useRef: (v) => ({ current: v }), useLayoutEffect: () => {} },
		components: {},
		i18n: { __: (s) => s, _n: (a, b, n) => (n === 1 ? a : b), sprintf },
		hooks: { applyFilters: (name, value, ctx) => (filters[name] ? filters[name](value, ctx) : value) },
		a11y: { speak: () => {} },
		compose: {},
		apiFetch: () => Promise.resolve({})
	};
	const window = {
		wp,
		atlasArAdmin: {
			schema: { look: { lighting: { options: ['neutral', 'bright', 'custom'] } } },
			shell: {
				urls: { dashboard: 'admin.php?page=ar-vr-3d-model-try-on', wizard: 'admin.php?page=ar-vr-3d-model-try-on&setup=1', library: 'admin.php?page=atlas-ar-library', plugins: 'admin.php?page=atlas-ar-other-plugins' },
				can: opts.can || { manage: true, upload: true },
				links: opts.links || [],
				brand: { name: 'AtlasAR', version: '3.1.0' },
				version: '3.1.0'
			}
		}
	};
	window.window = window;
	const context = vm.createContext({ window, navigator: { platform: 'Win32' }, document: {}, URL, console, setTimeout, clearTimeout });
	for (const f of ['atlas-ar-ui.js', 'atlas-ar-map.js', 'atlas-ar-search.js', 'atlas-ar-shell.js']) {
		vm.runInContext(fs.readFileSync(path.join(root, 'admin/js', f), 'utf8'), context, { filename: f });
	}
	return window.AtlasARAdminUI;
}

/** Objects made inside the vm have other prototypes: compare plain copies. */
function same(actual, expected, msg) {
	assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected, msg);
}

function indexFor(UI, can) {
	can = can || { manage: true, upload: true };
	const items = UI.shell.railItems();
	return UI.search.buildIndex({ items, map: UI.map, can, urls: window_urls(UI) });
}
function window_urls() {
	return { library: 'admin.php?page=atlas-ar-library', wizard: 'admin.php?page=ar-vr-3d-model-try-on&setup=1' };
}
function top(UI, index, query, kind) {
	const res = UI.search.find(index, query);
	const all = [].concat(...res.groups.map((g) => g.items));
	return kind ? all.filter((e) => e.kind === kind)[0] : all[0];
}

/* ------------------------------------------------------------------ kit and map */

test('kit version 2 keeps every version-1 member and freezes the three new parts', () => {
	const UI = load();
	['el', 'Fragment', 'useState', 'useEffect', 'useRef', 'C', '__', 'D', 'api', 'message', 'size', 'filters', 'LINKS', 'link', 'boot', 'Section', 'Head', 'Choice', 'ProNote', 'Viewer', 'SaveBar', 'lookOptions', 'useSettings']
		.forEach((k) => assert.ok(k in UI, 'missing kit member ' + k));
	assert.equal(UI.version, 2);
	assert.equal(UI.D, 'ar-vr-3d-model-try-on');
	assert.ok(Object.isFrozen(UI) && Object.isFrozen(UI.map) && Object.isFrozen(UI.search) && Object.isFrozen(UI.shell));
	['Shell', 'Pane', 'Tabs', 'SaveFooter', 'useRoute', 'railItems', 'parseHash', 'formatHash'].forEach((k) => assert.equal(typeof UI.shell[k], 'function', k));
});

test('the map: unique ids, all 26 Appearance settings, every tab, section and "needs" exists', () => {
	const UI = load();
	const ids = UI.map.allFields().map((f) => f.id);
	assert.equal(new Set(ids).size, ids.length, 'field ids are unique');
	const look = UI.map.fieldsAt({ screen: 'appearance' });
	assert.equal(look.length, 26);
	assert.ok(look.every((f) => /^look\.[a-z_]+$/.test(f.id)));
	const screen = UI.map.screen('appearance');
	same(screen.tabs.map((t) => t.id), ['look', 'view', 'frame', 'ar']);
	look.forEach((f) => {
		assert.ok(screen.tabs.some((t) => t.id === f.tab), f.id + ' tab');
		assert.ok(UI.map.sectionsOf({ screen: 'appearance', tab: f.tab }).some((s) => s.id === (f.section || '')), f.id + ' section');
		assert.ok(f.label && f.en, f.id + ' label and English words');
		if (f.needs) assert.ok(UI.map.field(f.needs), f.id + ' needs ' + f.needs);
		if (f.showIf) assert.ok(f.needs && f.needsHint, f.id + ' says what makes it show');
	});
	const screenIds = UI.map.screens.map((s) => s.id);
	assert.equal(new Set(screenIds).size, screenIds.length, 'screen ids are unique');
	// The dashboard's screen ids (and so the old #hash links) are unchanged.
	['products', 'appearance', 'placement', 'tryon', 'integrations', 'analytics', 'settings', 'help'].forEach((id) => assert.equal(UI.map.screen(id).page, 'dashboard', id));
});

test('"on unless false" settings keep their rule (look.prompt, look.ar, look.xr_environment)', () => {
	const UI = load();
	['look.prompt', 'look.ar', 'look.xr_environment'].forEach((id) => {
		const def = UI.map.field(id);
		assert.equal(UI.valueOf(def, { look: {} }), true, id + ' unset = on');
		assert.equal(UI.valueOf(def, { look: { [id.split('.')[1]]: false } }), false, id + ' false = off');
	});
});

test('atlasAr.fields: an add-on adds a field; a broken one is dropped', () => {
	const UI = load({ filters: { 'atlasAr.fields': (list) => list.concat([
		{ id: 'pro.meshy_key', screen: 'integrations', control: 'custom', label: 'Meshy AI key', en: 'meshy key' },
		{ id: 'bad id!', screen: 'x', control: 'toggle', label: 'Broken' },
		null,
		{ id: 'no.label', screen: 'x', control: 'toggle' }
	]) } });
	const ids = UI.map.allFields().map((f) => f.id);
	assert.ok(ids.includes('pro.meshy_key'));
	assert.ok(!ids.includes('bad id!') && !ids.includes('no.label'));
});

/* ------------------------------------------------------------------ matching */

test('normalise: lower case, accents, ß, punctuation and settings paths', () => {
	const UI = load();
	assert.equal(UI.search.normalise('Größe — Bräunung!'), 'grosse braunung');
	assert.equal(UI.search.normalise('look.ar_text'), 'look ar text');
	assert.equal(UI.search.normalise('  “Your style”  '), 'your style');
	same(UI.search.tokens('Border colour'), ['border', 'colour']);
});

test('ranking: label first, English fallback, word starts, every word must match', () => {
	const UI = load();
	const index = indexFor(UI);
	assert.equal(top(UI, index, 'border color', 'setting').id, 'look.border_color', 'English "color" finds "Border colour"');
	assert.equal(top(UI, index, 'bright', 'setting').id, 'look.exposure', '"bright" finds Brightness');
	assert.equal(top(UI, index, 'radius').id, 'look.radius');
	assert.equal(top(UI, index, 'ar_text', 'setting').id, 'look.ar_text', 'the settings path works');
	assert.equal(top(UI, index, 'meshy').id, 'screen:integrations', 'Free finds Integrations for "meshy"');
	assert.equal(top(UI, index, 'qr').id, 'screen:placement');
	assert.equal(top(UI, index, 'size and frame').id, 'tab:appearance:frame');
	assert.equal(UI.search.find(index, 'border zzzz').total, 0, 'AND: one word that matches nothing = no result');
	assert.equal(UI.search.find(index, 'xyzzy').total, 0);
});

test('limits and the empty query: screens in menu order, at most 3 actions', () => {
	const UI = load();
	const index = indexFor(UI);
	const empty = UI.search.find(index, '');
	assert.equal(empty.groups[0].id, 'screens');
	same(empty.groups[0].items.map((e) => e.id).slice(0, 3), ['screen:products', 'screen:library', 'screen:integrations']);
	const actions = empty.groups.filter((g) => g.id === 'actions')[0];
	assert.ok(actions.items.length <= 3);
	const many = UI.search.find(index, 'a');
	many.groups.forEach((g) => assert.ok(g.items.length <= { screens: 6, settings: 8, actions: 3, products: 4 }[g.id], g.id));
});

test('what the user may not open is not offered (an Author on the 3D Library page)', () => {
	const UI = load({ can: { manage: false, upload: true } });
	const items = UI.shell.railItems();
	same(items.map((i) => i.id), ['library']);
	const index = UI.search.buildIndex({ items, map: UI.map, can: { manage: false, upload: true }, urls: window_urls() });
	assert.ok(index.entries.every((e) => e.kind !== 'setting'), 'no settings');
	assert.ok(index.entries.every((e) => !/wizard|export|reset/.test(e.id)), 'no manage-only actions');
	assert.ok(index.entries.some((e) => e.id === 'action.upload'));
});

test('atlasAr.search.items: valid entries are added, broken or unsafe ones dropped (never thrown)', () => {
	const UI = load({ filters: { 'atlasAr.search.items': (list, ctx) => {
		assert.equal(ctx.can.manage, true);
		return list.concat([
			{ id: 'pro.tripo', kind: 'setting', screen: 'integrations', label: 'Tripo3D key', en: 'tripo key' },
			{ id: 'x1', label: 'Bad link', href: 'javascript:alert(1)' },
			{ id: 'x2', label: 'Data link', href: 'data:text/html,hi' },
			{ id: '', label: 'No id', screen: 'help' },
			{ id: 'x3', screen: 'help' },
			'not an object',
			{ id: 'x4', label: 'Offsite', href: '//evil.example/x' }
		]);
	} } });
	const index = indexFor(UI);
	const ids = index.entries.map((e) => e.id);
	assert.ok(ids.includes('pro.tripo'));
	['x1', 'x2', 'x3', 'x4'].forEach((id) => assert.ok(!ids.includes(id), id + ' dropped'));
	// Groups keep a fixed order (Screens, Settings, Actions): the add-on's setting leads its group.
	assert.equal(top(UI, index, 'tripo', 'setting').id, 'pro.tripo');
});

test('typed HTML is only text to the search (no match, no error)', () => {
	const UI = load();
	const index = indexFor(UI);
	assert.equal(UI.search.find(index, '<img src=x onerror=alert(1)>').total, 0);
});

test('safe links: admin pages and http(s) only', () => {
	const UI = load();
	const ok = ['admin.php?page=atlas-ar-library', 'https://wpaugmentedreality.com/docs/', '/wp-admin/admin.php?page=x', 'options-general.php'];
	const bad = ['javascript:alert(1)', ' javascript:alert(1)', 'data:text/html,x', '//evil.example', 'vbscript:x', ''];
	ok.forEach((h) => assert.equal(UI.search.safeHref(h), true, h));
	bad.forEach((h) => assert.equal(UI.search.safeHref(h), false, h));
});

test('speed: 300 entries build in under 5 ms and a search takes under 2 ms (averages)', () => {
	const extra = [];
	for (let i = 0; i < 280; i++) extra.push({ id: 'extra.' + i, kind: 'setting', screen: 'settings', label: 'Extra setting number ' + i, en: 'extra filler words ' + i, help: 'Some help text for the setting.' });
	const UI = load({ filters: { 'atlasAr.search.items': (list) => list.concat(extra) } });
	let index;
	for (let i = 0; i < 5; i++) index = indexFor(UI); // warm up
	assert.ok(index.items.length >= 300);
	let t = process.hrtime.bigint();
	for (let i = 0; i < 20; i++) index = indexFor(UI);
	const build = Number(process.hrtime.bigint() - t) / 1e6 / 20;
	const queries = ['border colour', 'bright', 'qr', 'extra 12', 'size and frame', 'zz'];
	t = process.hrtime.bigint();
	for (let i = 0; i < 20; i++) queries.forEach((q) => UI.search.find(index, q));
	const search = Number(process.hrtime.bigint() - t) / 1e6 / (20 * queries.length);
	assert.ok(build < 5, `build ${build.toFixed(2)} ms`);
	assert.ok(search < 2, `search ${search.toFixed(3)} ms`);
});

/* ------------------------------------------------------------------ addresses and the side menu */

test('addresses: old hashes still work; screen:tab/field is read; anything odd is dropped', () => {
	const UI = load();
	const p = UI.shell.parseHash;
	same(p('#integrations'), { screen: 'integrations', tab: '', field: '' });
	same(p('#appearance:frame/look.radius'), { screen: 'appearance', tab: 'frame', field: 'look.radius' });
	same(p('#appearance/look.radius'), { screen: 'appearance', tab: '', field: 'look.radius' });
	same(p(''), { screen: '', tab: '', field: '' });
	same(p('#<img src=x onerror=alert(1)>'), { screen: '', tab: '', field: '' });
	same(p('#appearance:frame/look.radius"]),body'), { screen: 'appearance', tab: 'frame', field: '' });
	same(p('#%E0%A4%A'), { screen: '', tab: '', field: '' }, 'a broken escape does not throw');
	assert.equal(UI.shell.formatHash({ screen: 'appearance', tab: 'frame', field: 'look.radius' }), '#appearance:frame/look.radius');
	assert.equal(UI.shell.formatHash({ screen: 'help' }), '#help');
});

test('the side menu: groups from the map, Setup only while the wizard is not done, add-on screens and links', () => {
	const UI = load({ links: [LINK] });
	const pages = ['products', 'appearance', 'placement', 'tryon', 'integrations', 'settings', 'help'].map((id) => ({ id, label: id }))
		.concat([{ id: 'pro-extra', label: 'Extra', render: () => null }]); // analytics removed by a filter
	const notDone = UI.shell.railItems({ pages, settings: { general: { wizard_done: false } } });
	const ids = notDone.map((i) => i.id);
	assert.ok(ids.includes('setup'));
	assert.ok(!ids.includes('analytics'), 'a screen removed with atlasAr.dashboard.pages is not listed');
	assert.equal(notDone.filter((i) => i.id === 'pro-extra')[0].group, 'more');
	assert.equal(notDone.filter((i) => i.id === 'link-licence')[0].href, LINK.href);
	assert.ok(notDone.filter((i) => i.id === 'appearance')[0].local);
	assert.equal(notDone.filter((i) => i.id === 'library')[0].href, 'admin.php?page=atlas-ar-library');
	const done = UI.shell.railItems({ pages, settings: { general: { wizard_done: true } } });
	assert.ok(!done.some((i) => i.id === 'setup'));
	// On the 3D Library page the dashboard's screens are links back to it.
	const onLibrary = UI.shell.railItems();
	assert.equal(onLibrary.filter((i) => i.id === 'appearance')[0].href, 'admin.php?page=ar-vr-3d-model-try-on#appearance');
});

/* ------------------------------------------------------------------ AR-182: every screen on the map */

test('AR-182: all 47 settings with a control are on the map, each in an existing tab and section', () => {
	const UI = load();
	const all = UI.map.allFields();
	assert.equal(all.length, 47);
	const groups = {};
	all.forEach((f) => { const g = f.id.split('.')[0]; groups[g] = (groups[g] || 0) + 1; });
	same(groups, { look: 26, placement: 4, cards: 6, tryon: 5, general: 6 });
	all.forEach((f) => {
		const screen = UI.map.screen(f.screen);
		assert.ok(screen, f.id + ' screen');
		if (screen.tabs) assert.ok(screen.tabs.some((t) => t.id === f.tab), f.id + ' tab ' + f.tab);
		const where = screen.tabs ? { screen: f.screen, tab: f.tab } : { screen: f.screen };
		const sections = UI.map.sectionsOf(where).map((x) => x.id);
		assert.ok(sections.includes(f.section || ''), f.id + ' section');
		if (f.needs) assert.ok(UI.map.field(f.needs), f.id + ' needs');
	});
	// The flags without a control stay off the map (set by Skip, Fold, Save, "Not now").
	['general.wizard_done', 'general.checklist_off', 'general.placed', 'general.styled', 'general.cloud_tip_off'].forEach((id) => assert.equal(UI.map.field(id), null, id));
});

test('AR-182: the search finds every screen\'s settings, per-product settings and action targets', () => {
	const UI = load();
	const index = indexFor(UI);
	assert.equal(top(UI, index, 'qr', 'setting').id, 'placement.qr');
	assert.equal(top(UI, index, 'telemetry', 'setting').id, 'general.telemetry');
	assert.equal(top(UI, index, 'card button text', 'setting').id, 'cards.button_text');
	assert.equal(top(UI, index, 'camera message', 'setting').id, 'tryon.consent');
	assert.equal(top(UI, index, 'jsdelivr', 'setting').id, 'tryon.tracker');
	const wall = top(UI, index, 'wall', 'product');
	assert.equal(wall.id, 'product.ar_placement');
	assert.equal(wall.screen, 'products');
	assert.match(wall.where, /Display/);
	const exp = top(UI, index, 'export', 'action');
	assert.equal(exp.field, 'action.export');
	assert.equal(exp.tab, 'tools');
	assert.equal(top(UI, index, 'connect cloud', 'action').field, 'card.cloud');
	// Options and help that are functions are not read as text.
	assert.equal(UI.search.find(index, 'return').total, 0);
});

test('AR-182: the placements are one list (Placement, the wizard and the search read it)', () => {
	const UI = load();
	same(UI.map.placements.map((p) => p.value), ['gallery', 'gallery3d', 'button', 'tab', 'slide']);
	assert.equal(UI.map.field('placement.mode').options, UI.map.placements);
});

/* ------------------------------------------------------------------ AR-183: an add-on (AtlasAR Pro) through the hooks */

test('AR-183: an add-on\'s settings, actions and per-product tabs join the search through the filters', () => {
	const pro = {
		items: [
			{ id: 'pro.meshy_key', kind: 'setting', cap: 'manage', screen: 'integrations', field: 'pro.meshy_key', where: 'Integrations', label: 'Meshy AI API key', en: 'meshy ai api key' },
			{ id: 'pro.make_ai', kind: 'action', cap: 'upload', href: 'http://localhost/tts/wp-admin/admin.php?page=atlas-ar-library', label: 'Make a 3D model with AI', en: 'make with ai generate' }
		],
		productFields: [{ id: 'product.pro_hotspots', kind: 'product', screen: 'products', control: 'none', panelTab: 'Hotspots', label: 'Hotspots with labels on a product’s 3D view', en: 'hotspots labels', where: 'Each product › AtlasAR panel › Hotspots' }]
	};
	const UI = load({ filters: {
		'atlasAr.search.items': (items) => items.concat(pro.items),
		'atlasAr.fields': (fields) => fields.concat(pro.productFields)
	} });
	const index = indexFor(UI);
	const meshy = top(UI, index, 'meshy', 'setting');
	assert.equal(meshy.id, 'pro.meshy_key');
	assert.equal(meshy.field, 'pro.meshy_key');
	assert.equal(top(UI, index, 'make with ai', 'action').href, pro.items[1].href);
	const hot = top(UI, index, 'hotspots', 'product');
	assert.equal(hot.id, 'product.pro_hotspots');
	assert.equal(hot.where, 'Each product › AtlasAR panel › Hotspots');
	// Never drawn on a screen, and the screens' settings are unchanged.
	assert.equal(UI.map.fieldsAt({ screen: 'appearance' }).length, 26);
	assert.equal(UI.map.allFields().filter((f) => f.kind !== 'product').length, 47);
});
