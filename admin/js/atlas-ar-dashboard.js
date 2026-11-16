/**
 * AR-120: AtlasAR dashboard (Products, Appearance, Placement, Try-on, Integrations, Settings,
 * Help) and the setup wizard (?page=ar-vr-3d-model-try-on&setup=1). Plain JavaScript on
 * window.AtlasARAdminUI (atlas-ar-ui.js).
 *
 * AR-180: the screens are drawn inside the desktop-app frame (UI.shell, atlas-ar-shell.js). The
 * menu's names, groups and icons, and the Appearance settings, come from the map
 * (atlas-ar-map.js), the same definitions the header search reads.
 */
(function (UI, wp) {
	'use strict';
	// The frame and the map are dependencies of this script (AR_TRY_ON_Dashboard::register()).
	if (!UI || !UI.shell || !UI.shell.Shell || !UI.map || !UI.map.screen) return;
	var el = UI.el, Fragment = UI.Fragment, useState = UI.useState, useEffect = UI.useEffect, C = UI.C, __ = UI.__;
	var sprintf = wp.i18n.sprintf, _n = wp.i18n._n;
	var boot = UI.boot;

	/* ------------------------------------------------------------- shared */

	// AR-182: the placements and button positions are in the map (atlas-ar-map.js).

	/** AR-156: one-click styles for the frame, and back to the defaults (Appearance only). */
	var PRESETS = {
		clean: { border_width: 0, radius: 0, frame_shadow: 'none' },
		card: { border_width: 1, border_color: '#dcdcde', radius: 12, frame_shadow: 'soft' },
		minimal: { border_width: 0, radius: 8, frame_shadow: 'none', prompt: false }
	};
	function Presets(ctx) {
		function apply(values) { Object.keys(values).forEach(function (k) { ctx.set('look', k, values[k]); }); }
		function reset() {
			var schema = (boot.schema || {}).look || {}, d = {};
			Object.keys(schema).forEach(function (k) { if (schema[k] && 'default' in schema[k]) d[k] = schema[k].default; });
			apply(d);
		}
		return el('div', { className: 'atlas-ar-presets', role: 'group', 'aria-label': __('Quick styles', 'ar-vr-3d-model-try-on') },
			el('span', { className: 'atlas-ar-label' }, __('Quick styles', 'ar-vr-3d-model-try-on')),
			el(C.Button, { variant: 'secondary', onClick: function () { apply(PRESETS.clean); } }, __('Clean', 'ar-vr-3d-model-try-on')),
			el(C.Button, { variant: 'secondary', onClick: function () { apply(PRESETS.card); } }, __('Card', 'ar-vr-3d-model-try-on')),
			el(C.Button, { variant: 'secondary', onClick: function () { apply(PRESETS.minimal); } }, __('Minimal', 'ar-vr-3d-model-try-on')),
			el(C.Button, { variant: 'tertiary', onClick: reset }, __('Reset to default', 'ar-vr-3d-model-try-on')));
	}

	function Preview(props) {
		var demo = boot.demoModel || {};
		var o = Object.assign({ src: demo.src, poster: demo.poster }, UI.lookOptions(props.settings.look));
		return el('div', { className: 'atlas-ar-preview-col' },
			el('h3', null, __('Live preview', 'ar-vr-3d-model-try-on')),
			el(UI.Viewer, { options: o, height: props.height || (Number(props.settings.look.height) || 340) + 'px', frame: props.settings.look, reloadKey: JSON.stringify(o) }),
			el('p', { className: 'description' }, demo.name ? sprintf(__('Showing “%s”. ', 'ar-vr-3d-model-try-on'), demo.name) : '', __('The shop uses the same AtlasAR viewer, so what you see here is what shoppers get.', 'ar-vr-3d-model-try-on')));
	}

	/* -------------------------------------------------------------- pages */

	/**
	 * 3D for the whole catalogue: every product without a 3D model that has a photo, made into a flat
	 * product (wall art, poster, canvas, framed picture, rug, tile) at its real size in this browser,
	 * one after another, each saved to the 3D Library and shown on its product. The size comes from the
	 * product's WooCommerce dimensions (width x height) when it has them.
	 */
	function BulkFlat(props) {
		var _rows = useState(null), rows = _rows[0], setRows = _rows[1];
		var _kind = useState('canvas'), kind = _kind[0], setKind = _kind[1];
		var _run = useState(false), running = _run[0], setRunning = _run[1];
		var _err = useState(''), err = _err[0], setErr = _err[1];
		var lib = window.AtlasARLibrary;
		useEffect(function () {
			wp.apiFetch({ path: '/ar_try_on/v1/items?filter=without&per_page=100' }).then(function (list) {
				setRows(list.filter(function (i) { return i.image; }).map(function (i) {
					var sz = i.size_cm || {};
					return { id: i.id, title: i.title, thumb: i.thumb || i.image, image: i.image, w: sz.width ? String(sz.width) : '', h: sz.height ? String(sz.height) : '', on: !!sz.width, status: '' };
				}));
			}, function (e) { setRows([]); setErr(UI.message(e)); });
		}, []);
		function set(id, k, v) {
			setRows(function (rs) { return rs.map(function (r) { if (r.id !== id) return r; var o = Object.assign({}, r); o[k] = v; return o; }); });
		}
		function ready(r) { return r.on && parseFloat(r.w) >= 1 && parseFloat(r.w) <= 1000 && (!r.h || (parseFloat(r.h) >= 1 && parseFloat(r.h) <= 1000)); }
		var chosen = (rows || []).filter(ready);
		/** The photo as a file, and the height for the width when the product has only a width. */
		function photo(r) {
			return fetch(r.image, { credentials: 'same-origin' }).then(function (res) {
				if (!res.ok) throw new Error(__('The photo could not be loaded.', 'ar-vr-3d-model-try-on'));
				return res.blob();
			}).then(function (blob) {
				var file = new File([blob], (r.image.split('/').pop() || 'photo.jpg').split('?')[0], { type: blob.type });
				if (r.h) return { file: file, h: r.h };
				return createImageBitmap(blob).then(function (bmp) { var h = (parseFloat(r.w) * bmp.height / bmp.width).toFixed(1); bmp.close(); return { file: file, h: h }; });
			});
		}
		function runAll() {
			if (!lib || !lib.makeFlat) { setErr(__('The 3D tools could not load. Please reload the page.', 'ar-vr-3d-model-try-on')); return; }
			setRunning(true); setErr('');
			var queue = chosen.slice();
			(function next() {
				var r = queue.shift();
				if (!r) { setRunning(false); props.onDone(); return; }
				set(r.id, 'status', 'busy');
				photo(r).then(function (p) {
					return lib.makeFlat(p.file, { kind: kind, widthCm: r.w, heightCm: p.h, name: r.title });
				}).then(function (res) {
					return UI.api('/products/' + r.id + '/model', { method: 'POST', data: { model_id: res.model.id } }).then(function () {
						return UI.api('/items/' + r.id, { method: 'POST', data: { data: { ar_placement: res.placement === 'floor' ? 'floor' : 'wall' } } });
					});
				}).then(function () { set(r.id, 'status', 'done'); set(r.id, 'on', false); next(); }, function (e) { set(r.id, 'status', UI.message(e)); next(); });
			})();
		}
		var done = (rows || []).filter(function (r) { return r.status === 'done'; }).length;
		function statusCell(r) {
			if (r.status === 'done') return el('span', { className: 'atlas-ar-ok' }, __('Done', 'ar-vr-3d-model-try-on'));
			if (r.status === 'busy') return el('span', { className: 'atlas-ar-loading' }, el(C.Spinner, null), __('Making…', 'ar-vr-3d-model-try-on'));
			if (r.status) return el('span', { className: 'atlas-ar-error' }, r.status);
			return r.w ? null : el('span', { className: 'atlas-ar-muted' }, __('Enter its width', 'ar-vr-3d-model-try-on'));
		}
		var table = el('table', { className: 'widefat striped atlas-ar-table atlas-ar-bulk-table' },
			el('thead', null, el('tr', null,
				el('th', { scope: 'col' }, el('span', { className: 'screen-reader-text' }, __('Make', 'ar-vr-3d-model-try-on'))),
				el('th', { scope: 'col' }, __('Product', 'ar-vr-3d-model-try-on')),
				el('th', { scope: 'col' }, __('Width (cm)', 'ar-vr-3d-model-try-on')),
				el('th', { scope: 'col' }, __('Height (cm)', 'ar-vr-3d-model-try-on')),
				el('th', { scope: 'col' }, __('Status', 'ar-vr-3d-model-try-on')))),
			el('tbody', null, (rows || []).map(function (r) {
				return el('tr', { key: r.id },
					el('td', null, el('input', { type: 'checkbox', checked: r.on, disabled: running || r.status === 'done', 'aria-label': sprintf(__('Make a 3D model for “%s”', 'ar-vr-3d-model-try-on'), r.title), onChange: function (e) { set(r.id, 'on', e.target.checked); } })),
					el('td', null, el('span', { className: 'atlas-ar-product-name' }, el('img', { src: r.thumb, alt: '', width: 36, height: 36 }), r.title)),
					el('td', null, el('input', { type: 'number', min: 1, max: 1000, step: 'any', value: r.w, disabled: running, className: 'small-text', 'aria-label': __('Width (cm)', 'ar-vr-3d-model-try-on'), onChange: function (e) { set(r.id, 'w', e.target.value); if (e.target.value) set(r.id, 'on', true); } })),
					el('td', null, el('input', { type: 'number', min: 1, max: 1000, step: 'any', value: r.h, placeholder: __('from the photo', 'ar-vr-3d-model-try-on'), disabled: running, className: 'small-text', 'aria-label': __('Height (cm)', 'ar-vr-3d-model-try-on'), onChange: function (e) { set(r.id, 'h', e.target.value); } })),
					el('td', null, statusCell(r)));
			})));
		var body;
		if (rows === null) body = el('p', { className: 'atlas-ar-loading', role: 'status' }, el(C.Spinner, null), __('Loading…', 'ar-vr-3d-model-try-on'));
		else if (!rows.length) body = el('p', { className: 'atlas-ar-empty' }, __('Every product without a 3D model needs a photo (its featured image) first.', 'ar-vr-3d-model-try-on'));
		else body = table;
		return el(C.Modal, { title: __('Make 3D from product photos', 'ar-vr-3d-model-try-on'), onRequestClose: running ? function () {} : props.onClose, className: 'atlas-ar-bulk-flat', size: 'large' },
			el('p', null, __('For flat products: wall art, posters, canvas prints, framed pictures, rugs and tiles. Each product’s photo becomes a 3D model at its real size, made in this browser, saved to the 3D Library and shown on the product. Keep this window open while it runs.', 'ar-vr-3d-model-try-on')),
			el('div', { className: 'atlas-ar-row' },
				el(C.SelectControl, { label: __('What they are', 'ar-vr-3d-model-try-on'), value: kind, disabled: running, onChange: setKind, __nextHasNoMarginBottom: true,
					options: ((lib && lib.flatKinds) || []).map(function (k) { return { value: k[0], label: k[1] }; }) })),
			err ? el(C.Notice, { status: 'error', isDismissible: false }, err) : null,
			body,
			el('div', { className: 'atlas-ar-row atlas-ar-bulk-foot' },
				el(C.Button, { variant: 'primary', isBusy: running, disabled: running || !chosen.length, onClick: runAll },
					running ? sprintf(__('Making %1$d of %2$d…', 'ar-vr-3d-model-try-on'), done + 1, done + chosen.length) : chosen.length ? sprintf(_n('Make %d 3D model', 'Make %d 3D models', chosen.length, 'ar-vr-3d-model-try-on'), chosen.length) : __('Make 3D models', 'ar-vr-3d-model-try-on')),
				el(C.Button, { variant: 'tertiary', disabled: running, onClick: props.onClose }, __('Close', 'ar-vr-3d-model-try-on')),
				done ? el('span', { className: 'atlas-ar-ok' }, sprintf(_n('%d made', '%d made', done, 'ar-vr-3d-model-try-on'), done)) : null));
	}

	function ProductsPage(ctx) {
		var _items = useState(null), items = _items[0], setItems = _items[1];
		var _total = useState(0), total = _total[0], setTotal = _total[1];
		var _f = useState('all'), filter = _f[0], setFilter = _f[1];
		var _q = useState(''), search = _q[0], setSearch = _q[1];
		var _p = useState(1), page = _p[0], setPage = _p[1];
		var _err = useState(''), err = _err[0], setErr = _err[1];
		var s = ctx.settings;

		var _loading = useState(true), loading = _loading[0], setLoading = _loading[1];
		var _bulk = useState(false), bulk = _bulk[0], setBulk = _bulk[1];
		var req = UI.useRef(0);
		function load() {
			var mine = ++req.current; // only the newest answer is shown (quick filter clicks)
			setLoading(true);
			wp.apiFetch({ path: '/ar_try_on/v1/items?filter=' + filter + '&page=' + page + '&search=' + encodeURIComponent(search), parse: false }).then(function (res) {
				if (mine === req.current) setTotal(parseInt(res.headers.get('X-WP-Total') || '0', 10));
				return res.json();
			}).then(function (list) {
				if (mine !== req.current) return;
				setItems(list); setErr(''); setLoading(false);
			}, function (e) { if (mine !== req.current) return; setItems([]); setErr(UI.message(e)); setLoading(false); });
		}
		useEffect(function () { var t = setTimeout(load, search ? 300 : 0); return function () { clearTimeout(t); }; }, [filter, search, page]);

		function addModel(item) {
			if (!window.AtlasARLibrary) return;
			window.AtlasARLibrary.pick({
				title: sprintf(__('Choose a 3D model for “%s”', 'ar-vr-3d-model-try-on'), item.title),
				onSelect: function (m) {
					UI.api('/products/' + item.id + '/model', { method: 'POST', data: { model_id: m.id } }).then(load, function (e) { setErr(UI.message(e)); });
				}
			});
		}

		var done = {
			place: s.general.wizard_done || s.general.placed,
			look: s.general.wizard_done || s.general.styled,
			// AR-148: also a model added on this page just now (the count was read when the page loaded).
			model: (boot.counts || {}).with3d > 0 || !!(items && items.some(function (i) { return i.model; })),
			cloud: ctx.cloud.connected,
			tryon: !!s.tryon.enabled && items && items.some(function (i) { return i.tryon; })
		};
		var checklist = [
			{ key: 'place', title: __('Choose where the 3D view appears', 'ar-vr-3d-model-try-on'), text: __('In the product gallery, a button with a popup, or a tab.', 'ar-vr-3d-model-try-on'), action: __('Placement', 'ar-vr-3d-model-try-on'), go: function () { ctx.go('placement'); } },
			{ key: 'look', title: __('Make it look like your shop', 'ar-vr-3d-model-try-on'), text: __('Background, lighting and the AR button colour.', 'ar-vr-3d-model-try-on'), action: __('Appearance', 'ar-vr-3d-model-try-on'), go: function () { ctx.go('appearance'); } },
			{ key: 'model', title: __('Add your first 3D model', 'ar-vr-3d-model-try-on'), text: __('Upload your files to the 3D Library and pick a product.', 'ar-vr-3d-model-try-on'), action: __('Show products without 3D', 'ar-vr-3d-model-try-on'), go: function () { setFilter('without'); } },
			{ key: 'cloud', title: __('Connect AtlasAR Cloud (optional)', 'ar-vr-3d-model-try-on'), text: __('Smaller files at real size and fast hosting.', 'ar-vr-3d-model-try-on'), action: __('Integrations', 'ar-vr-3d-model-try-on'), go: function () { ctx.go('integrations'); }, hide: !ctx.cloud.available },
			{ key: 'tryon', title: __('Sell glasses or caps? Turn on try-on', 'ar-vr-3d-model-try-on'), text: __('Shoppers try products on with their camera.', 'ar-vr-3d-model-try-on'), action: __('Try-on', 'ar-vr-3d-model-try-on'), go: function () { ctx.go('tryon'); } }
		].filter(function (c) { return !c.hide; });
		var doneCount = checklist.filter(function (c) { return done[c.key]; }).length;
		var mig = boot.migration || {};

		// AR-182: a search pick of a per-product setting opens this screen and says where it is.
		var asked = ctx.route && ctx.route.field ? (UI.map.productFields || []).filter(function (f) { return f.id === ctx.route.field; })[0] : null;
		return el(Fragment, null,
			el(UI.Head, { lead: __('Your products and their 3D, AR and try-on status. Add a model right from here.', 'ar-vr-3d-model-try-on') }),
			asked ? el(C.Notice, { status: 'info', isDismissible: false, className: 'atlas-ar-page-notice' },
				/* translators: 1: a setting, e.g. "AR placement (floor or wall)", 2: a tab of the product's AtlasAR panel, e.g. "Display". */
				sprintf(__('“%1$s” is set for each product: open a product and look under %2$s in its AtlasAR panel.', 'ar-vr-3d-model-try-on'), asked.label, asked.panelTab)) : null,
			// AR-160: the one-time move from AtlasAR 2.x.
			mig.status === 'running' ? el(C.Notice, { status: 'info', isDismissible: false, className: 'atlas-ar-page-notice' },
				sprintf(__('Moving your 3D models from AtlasAR 2 into the 3D Library (%d so far). It runs in the background; your shop keeps working.', 'ar-vr-3d-model-try-on'), mig.moved || 0)) : null,
			mig.status === 'done' && mig.failed > 0 && mig.finished > Date.now() / 1000 - 30 * 86400 ? el(C.Notice, { status: 'warning', isDismissible: false, className: 'atlas-ar-page-notice' },
				sprintf(__('%d products from AtlasAR 2 could not be moved (their model file was missing or could not be read). Use “Without 3D” below to find them and add their model again.', 'ar-vr-3d-model-try-on'), mig.failed)) : null,
			ctx.cloud.available && !ctx.cloud.connected && !s.general.cloud_tip_off ? el('div', { className: 'atlas-ar-cloud-tip' },
				el('div', null,
					el('strong', null, __('Make your 3D product pages load faster: connect AtlasAR Cloud (free)', 'ar-vr-3d-model-try-on')),
					el('ul', null,
						el('li', null, __('Files usually 80–95 % smaller, same look', 'ar-vr-3d-model-try-on')),
						el('li', null, __('Each model at its real size in AR', 'ar-vr-3d-model-try-on')),
						el('li', null, __('Big files up to 50 MB, done in the background', 'ar-vr-3d-model-try-on')),
						el('li', null, __('20 free optimisations a month (making your models lighter); no limit with AtlasAR Pro', 'ar-vr-3d-model-try-on')))),
				el('div', { className: 'atlas-ar-row' },
					el(C.Button, { variant: 'primary', onClick: function () { ctx.go('integrations'); } }, __('Connect, it is free', 'ar-vr-3d-model-try-on')),
					el(C.Button, { variant: 'tertiary', onClick: function () { ctx.save({ general: { cloud_tip_off: true } }); } }, __('Not now', 'ar-vr-3d-model-try-on')))) : null,
			// Get started is always here (design system: collapsed, never removed); the setup wizard
			// can be run again at any time.
			el(UI.Section, { className: 'atlas-ar-checklist' + (s.general.checklist_off ? ' is-folded' : '') },
				el('div', { className: 'atlas-ar-checklist-head' },
					el('h2', { className: 'atlas-ar-section-title' }, __('Get started', 'ar-vr-3d-model-try-on')),
					el('span', { className: 'atlas-ar-progress' }, sprintf(__('%1$d of %2$d done', 'ar-vr-3d-model-try-on'), doneCount, checklist.length)),
					el('span', { className: 'atlas-ar-checklist-actions' },
						el(C.Button, { variant: 'secondary', href: ctx.wizardUrl }, __('Run the setup wizard', 'ar-vr-3d-model-try-on')),
						el(C.Button, {
							variant: 'tertiary', 'aria-expanded': s.general.checklist_off ? 'false' : 'true',
							onClick: function () { ctx.save(Object.assign({}, s, { general: Object.assign({}, s.general, { checklist_off: !s.general.checklist_off }) })); }
						}, s.general.checklist_off ? __('Show the steps', 'ar-vr-3d-model-try-on') : __('Fold', 'ar-vr-3d-model-try-on')))),
				s.general.checklist_off ? null : el(Fragment, null,
					// AR-151: for beginners — what this page is and what to do first.
					doneCount < checklist.length ? el('p', { className: 'atlas-ar-lead' },
						__('New to AtlasAR? Follow these steps from top to bottom: each one takes a minute, and you can change everything later. The list below shows your products and whether they have a 3D model yet.', 'ar-vr-3d-model-try-on')) : null,
					el('ol', null, checklist.map(function (c) {
						return el('li', { key: c.key, className: done[c.key] ? 'is-done' : '' },
							el('span', { className: 'atlas-ar-check', 'aria-hidden': 'true' }, done[c.key] ? '✓' : ''),
							el('span', { className: 'atlas-ar-check-text' }, el('strong', null, c.title), el('span', null, c.text)),
							done[c.key] ? el('span', { className: 'screen-reader-text' }, __('Done', 'ar-vr-3d-model-try-on')) : el(C.Button, { variant: 'secondary', onClick: c.go }, c.action));
					})))),
			el(UI.Section, null,
				el('div', { className: 'atlas-ar-toolbar' },
					el('div', { className: 'atlas-ar-search' }, el(C.SearchControl, { label: __('Search products', 'ar-vr-3d-model-try-on'), value: search, onChange: function (v) { setSearch(v); setPage(1); }, __nextHasNoMarginBottom: true })),
					el('div', { className: 'atlas-ar-filters', role: 'group', 'aria-label': __('Show', 'ar-vr-3d-model-try-on') },
						[['all', __('All', 'ar-vr-3d-model-try-on')], ['with', __('With 3D', 'ar-vr-3d-model-try-on')], ['without', __('Without 3D', 'ar-vr-3d-model-try-on')], ['tryon', __('Try-on', 'ar-vr-3d-model-try-on')]].map(function (f) {
							return el('button', { key: f[0], type: 'button', className: 'atlas-ar-filter' + (filter === f[0] ? ' is-on' : ''), 'aria-pressed': filter === f[0] ? 'true' : 'false', onClick: function () { setFilter(f[0]); setPage(1); } }, f[1]);
						})),
					window.AtlasARLibrary && window.AtlasARLibrary.makeFlat ? el(UI.Field, { id: 'action.flat', className: 'is-inline' }, el(C.Button, { variant: 'secondary', onClick: function () { setBulk(true); } }, __('Make 3D from product photos', 'ar-vr-3d-model-try-on'))) : null),
				bulk ? el(BulkFlat, { onClose: function () { setBulk(false); }, onDone: load }) : null,
				loading && items !== null ? el('p', { className: 'atlas-ar-loading', role: 'status' }, el(C.Spinner, null), __('Loading…', 'ar-vr-3d-model-try-on')) : null,
				err ? el(C.Notice, { status: 'error', isDismissible: false }, err) : null,
				items === null ? el('p', { className: 'atlas-ar-loading', role: 'status' }, el(C.Spinner, null), __('Loading…', 'ar-vr-3d-model-try-on')) : el('div', { className: 'atlas-ar-list' + (loading ? ' is-loading' : ''), 'aria-busy': loading ? 'true' : 'false' }, items.length === 0
					? (search || filter !== 'all'
							? el(UI.Empty, { text: __('No products match.', 'ar-vr-3d-model-try-on'), action: { label: __('Show all products', 'ar-vr-3d-model-try-on'), onClick: function () { setSearch(''); setFilter('all'); setPage(1); } } })
							: el(UI.Empty, { text: __('No products yet. Add a product, then give it a 3D model here.', 'ar-vr-3d-model-try-on') }))
					: el('table', { className: 'widefat striped atlas-ar-table' },
						el('thead', null, el('tr', null,
							el('th', { scope: 'col' }, __('Product', 'ar-vr-3d-model-try-on')), el('th', { scope: 'col' }, __('Model', 'ar-vr-3d-model-try-on')),
							el('th', { scope: 'col' }, __('AR', 'ar-vr-3d-model-try-on')), el('th', { scope: 'col' }, __('Try-on', 'ar-vr-3d-model-try-on')), el('th', { scope: 'col' }, el('span', { className: 'screen-reader-text' }, __('Action', 'ar-vr-3d-model-try-on'))))),
						el('tbody', null, items.map(function (i) {
							var m = i.model;
							return el('tr', { key: i.id },
								el('td', null, el('a', { href: i.edit_url, className: 'atlas-ar-product-name' }, i.thumb ? el('img', { src: i.thumb, alt: '', width: 36, height: 36 }) : null, i.title || '#' + i.id), i.status !== 'publish' ? el('span', { className: 'atlas-ar-muted' }, ' — ' + i.status) : null),
								el('td', null, m ? el(Fragment, null, m.file || m.name, el('span', { className: 'atlas-ar-muted' }, ' · ' + UI.size(m.size)), m.large ? el('span', { className: 'atlas-ar-badge atlas-ar-badge--warn' }, __('Large file', 'ar-vr-3d-model-try-on')) : null) : el('span', { className: 'atlas-ar-muted' }, __('No 3D model', 'ar-vr-3d-model-try-on'))),
								el('td', null, m ? (m.usdz ? __('Ready', 'ar-vr-3d-model-try-on') : __('Ready (Android, WebXR); iPhone from the GLB', 'ar-vr-3d-model-try-on')) : '—'),
								el('td', null, i.tryon === 'glasses' ? __('Glasses', 'ar-vr-3d-model-try-on') : i.tryon === 'hat' ? __('Cap', 'ar-vr-3d-model-try-on') : '—'),
								// Design system › RowActions: one aligned group — the main action as a button, View as an
								// icon button of the same height (a draft opens its preview).
								el('td', { className: 'atlas-ar-actions' }, el('span', { className: 'atlas-ar-row-actions' },
									m
										? el(C.Button, { variant: 'secondary', href: i.edit_url + '#atlas-ar-panel' }, __('Edit', 'ar-vr-3d-model-try-on'))
										: el(C.Button, { variant: 'primary', onClick: function () { addModel(i); } }, __('Add 3D', 'ar-vr-3d-model-try-on')),
									i.view_url ? el(C.Button, {
										variant: 'secondary', className: 'atlas-ar-view', icon: 'external', href: i.view_url, target: '_blank', rel: 'noopener',
										label: sprintf(i.status === 'publish' ? __('View “%s” (opens in a new tab)', 'ar-vr-3d-model-try-on') : __('Preview “%s” (opens in a new tab)', 'ar-vr-3d-model-try-on'), i.title || '#' + i.id),
										showTooltip: true
									}) : null)));
						})))),
				total > 20 ? el('div', { className: 'atlas-ar-pager' },
					el(C.Button, { variant: 'secondary', disabled: page <= 1, onClick: function () { setPage(page - 1); } }, __('Previous', 'ar-vr-3d-model-try-on')),
					el('span', null, sprintf(__('Page %1$d of %2$d', 'ar-vr-3d-model-try-on'), page, Math.ceil(total / 20))),
					el(C.Button, { variant: 'secondary', disabled: page >= Math.ceil(total / 20), onClick: function () { setPage(page + 1); } }, __('Next', 'ar-vr-3d-model-try-on'))) : null),
			// AR-146: what Pro adds for these products, right where they are listed.
			el(UI.ProNote, {
				where: 'products', spot: 'products_list', items: [
					__('Make a 3D model from a product photo or a description with AI (AtlasAR Cloud, Meshy AI, Tripo3D).', 'ar-vr-3d-model-try-on'),
					__('Several models per product, and the right model for each colour or size (WooCommerce variations).', 'ar-vr-3d-model-try-on'),
					__('Hotspots with labels and the real measurements on the 3D view.', 'ar-vr-3d-model-try-on'),
					__('Optimise every large file at once, and AtlasAR Cloud Premium with no monthly limit.', 'ar-vr-3d-model-try-on')
				]
			}, __('More for your products with AtlasAR Pro:', 'ar-vr-3d-model-try-on')));
	}

	/**
	 * AR-180: Appearance on the new design (the proof screen of AR-179): Quick styles, then four
	 * tabs drawn from the map (Look, Starting view, Size and frame, AR button), the live preview
	 * beside them, and the Save bar in the pane's footer. Save still sends every setting through
	 * POST /config and ticks Get started (general.styled), as before.
	 */
	function AppearancePage(ctx) {
		var screen = UI.map.screen('appearance');
		var tabs = screen.tabs.map(function (t) { return { name: t.id, title: t.label }; });
		return el(UI.shell.Pane, { fill: true, className: 'atlas-ar-pane--appearance', footer: el(UI.shell.SaveFooter, { status: ctx.status, onSave: ctx.saveNow }) },
			el('div', { className: 'atlas-ar-appearance' },
				el('div', { className: 'atlas-ar-appearance-main' },
					el(UI.Head, { lead: __('How every 3D view looks. A product can change these in its own AtlasAR panel.', 'ar-vr-3d-model-try-on') }),
					el(Presets, ctx),
					el(UI.shell.Tabs, {
						className: 'atlas-ar-tabs-fill', tabs: tabs, tab: ctx.tab,
						onTab: function (t) { ctx.go('appearance', t, '', { replace: true }); }
					}, function (t) {
						return el('div', { className: 'atlas-ar-tab-fields' },
							el(UI.Fields, { where: { screen: 'appearance', tab: t }, settings: ctx.settings, set: ctx.set }));
					})),
				el('div', { className: 'atlas-ar-appearance-preview' },
					el(Preview, { settings: ctx.settings }),
					el(UI.ProNote, { where: 'appearance', spot: 'appearance_extras' }, __('AtlasAR Pro adds hotspots, the real measurements on the view, and several models with thumbnails to switch between.', 'ar-vr-3d-model-try-on')))));
	}

	/** The sub-tabs of a screen in the map, as WordPress's TabPanel wants them. */
	function tabsOf(id) {
		return (UI.map.screen(id).tabs || []).map(function (t) { return { name: t.id, title: t.label }; });
	}

	/**
	 * AR-182: Placement on the new design: tabs Product page and Product cards (AR-176). Every
	 * setting comes from the map; the slot atlasAr.placement.cards stays under the card settings.
	 * Save is in the pane's footer and still ticks Get started (general.placed, AR-148).
	 */
	function PlacementPage(ctx) {
		return el(Fragment, null,
			el(UI.Head, { lead: __('Where the 3D view appears: on product pages and on the product cards of your shop.', 'ar-vr-3d-model-try-on') }),
			!boot.woo ? el(C.Notice, { status: 'info', isDismissible: false, className: 'atlas-ar-page-notice' }, __('WooCommerce is not active. Posts and pages show the 3D view with the block or the shortcode.', 'ar-vr-3d-model-try-on')) : null,
			el(UI.shell.Tabs, { tabs: tabsOf('placement'), tab: ctx.tab, onTab: function (t) { ctx.go('placement', t, '', { replace: true }); } }, function (t) {
				if (t === 'cards') {
					return el('div', { className: 'atlas-ar-tab-fields' },
						el('p', { className: 'atlas-ar-tab-lead' }, __('On the shop and category pages, related products and product blocks, for every product that has a 3D model. The product page itself is not changed.', 'ar-vr-3d-model-try-on')),
						el(UI.Fields, { where: { screen: 'placement', tab: 'cards' }, settings: ctx.settings, set: ctx.set }),
						UI.filters('atlasAr.placement.cards', [], ctx),
						el(UI.ProNote, { where: 'placement', spot: 'cards' }, __('With AtlasAR Pro each product can have its own card button, button text and card picture.', 'ar-vr-3d-model-try-on')),
						el('p', { className: 'description' }, __('For cards your theme or page builder draws itself: the shortcode [atlas_ar_button id="123"] prints the same button for product 123.', 'ar-vr-3d-model-try-on')));
				}
				return el('div', { className: 'atlas-ar-tab-fields' },
					el(UI.Fields, { where: { screen: 'placement', tab: 'page' }, settings: ctx.settings, set: ctx.set }),
					el('p', { className: 'description' }, __('Anywhere else (posts, pages, page builders): use the “AtlasAR 3D view” block or the shortcode [atlas_ar]. Help › Shortcode builder makes one for you.', 'ar-vr-3d-model-try-on')));
			}));
	}

	/** AR-182: Try-on on the new design: one pane, four groups, every setting from the map. */
	function TryonPage(ctx) {
		var t = ctx.settings.tryon;
		var _busy = useState(''), busy = _busy[0], setBusy = _busy[1];
		var _tr = useState(boot.tracker || {}), tracker = _tr[0], setTracker = _tr[1];
		var _err = useState(''), err = _err[0], setErr = _err[1];
		function files(method) {
			setBusy(method); setErr('');
			UI.api('/tracker', { method: method }).then(function (res) { setTracker(res.tracker); ctx.replace(res.settings); setBusy(''); }, function (e) { setErr(UI.message(e)); setBusy(''); });
		}
		var cats = [
			[__('Glasses', 'ar-vr-3d-model-try-on'), __('Sunglasses and frames on the nose', 'ar-vr-3d-model-try-on'), true],
			[__('Caps and hats', 'ar-vr-3d-model-try-on'), __('On the head, above the forehead', 'ar-vr-3d-model-try-on'), true],
			[__('Earrings', 'ar-vr-3d-model-try-on'), __('On the ear lobes', 'ar-vr-3d-model-try-on'), false],
			[__('Lips and make-up', 'ar-vr-3d-model-try-on'), __('Lipstick shades on the lips', 'ar-vr-3d-model-try-on'), false],
			[__('Rings and watches', 'ar-vr-3d-model-try-on'), __('On the hand and wrist', 'ar-vr-3d-model-try-on'), false]
		];
		// The face-tracking files on this site: download, again, or remove (its own REST calls, as before).
		var filesRow = t.tracker === 'self' ? el('div', { className: 'atlas-ar-row atlas-ar-files-row' },
			tracker.present
				? el(Fragment, null, el('span', { className: 'atlas-ar-saved' }, sprintf(__('On this site (%s).', 'ar-vr-3d-model-try-on'), UI.size(tracker.size))),
					el(C.Button, { variant: 'secondary', isBusy: busy === 'POST', disabled: !!busy, onClick: function () { files('POST'); } }, __('Download again', 'ar-vr-3d-model-try-on')),
					el(C.Button, { variant: 'tertiary', isDestructive: true, disabled: !!busy, onClick: function () { files('DELETE'); } }, __('Remove', 'ar-vr-3d-model-try-on')))
				: el(Fragment, null, el(C.Button, { variant: 'secondary', isBusy: busy === 'POST', disabled: !!busy, onClick: function () { files('POST'); } }, __('Download the files to this site', 'ar-vr-3d-model-try-on')),
					el('span', { className: 'description' }, __('Until they are here, the CDN is used.', 'ar-vr-3d-model-try-on')))) : null;
		return el(Fragment, null,
			el(UI.Head, { lead: __('Shoppers see your product on their own face with the camera. Everything happens on their device; no picture or video is sent anywhere.', 'ar-vr-3d-model-try-on') }),
			el(UI.Section, { className: 'atlas-ar-fields-box' },
				el(UI.Fields, {
					where: { screen: 'tryon' }, settings: ctx.settings, set: ctx.set,
					intros: {
						types: el(Fragment, null,
							el('p', { className: 'description' }, __('Choose the type in each product’s AtlasAR panel.', 'ar-vr-3d-model-try-on')),
							el('div', { className: 'atlas-ar-cats' }, cats.map(function (c) {
								return el('div', { key: c[0], className: 'atlas-ar-cat' + (c[2] ? ' is-on' : '') },
									el('strong', null, c[0]), el('span', { className: 'atlas-ar-badge' + (c[2] ? '' : ' atlas-ar-badge--muted') }, c[2] ? __('Included', 'ar-vr-3d-model-try-on') : __('Coming later', 'ar-vr-3d-model-try-on')), el('span', null, c[1]));
							}))),
						files: el('p', { className: 'description' }, __('About 15 MB, loaded only after the shopper allows the camera.', 'ar-vr-3d-model-try-on'))
					},
					after: {
						'tryon.snapshot': el(UI.ProNote, { where: 'tryon', spot: 'tryon_hd' }, __('AtlasAR Pro removes the label, saves photos in HD and shows the product in real 3D that turns with the head.', 'ar-vr-3d-model-try-on')),
						'tryon.tracker': el(Fragment, null, filesRow, err ? el(C.Notice, { status: 'error', isDismissible: false }, err) : null)
					}
				})));
	}

	function CloudCard(ctx) {
		var cloud = ctx.cloud;
		var links = cloud.links || {};
		var _email = useState(cloud.my_email || ''), email = _email[0], setEmail = _email[1];
		var _ok = useState(false), consent = _ok[0], setConsent = _ok[1];
		var _news = useState(false), news = _news[0], setNews = _news[1]; // AR-135: separate, never pre-ticked
		var _key = useState(''), key = _key[0], setKey = _key[1];
		var _mode = useState('new'), mode = _mode[0], setMode = _mode[1];
		var _busy = useState(false), busy = _busy[0], setBusy = _busy[1];
		var _err = useState(''), err = _err[0], setErr = _err[1];
		// AR-133: the site is registered with another email: { hint, takeover }.
		var _taken = useState(null), taken = _taken[0], setTaken = _taken[1];
		function run(promise) {
			setBusy(true); setErr('');
			promise.then(function (st) { setBusy(false); setTaken(null); ctx.setCloud(st); }, function (e) {
				setBusy(false);
				if (e && e.code === 'project_exists') {
					setTaken({ hint: (e.data && e.data.owner_hint) || '', takeover: !!(e.data && e.data.takeover) });
					return;
				}
				setErr(UI.message(e));
			});
		}
		function link(href, text) {
			return href ? el('a', { href: href, target: '_blank', rel: 'noopener noreferrer' }, text) : null;
		}
		// AR-138: what the shop gets, in plain words (all of it true for this plugin today).
		var benefits = el('div', { className: 'atlas-ar-cloud-benefits' },
			el('div', { className: 'atlas-ar-cloud-benefit' },
				el('strong', null, __('Pages load faster', 'ar-vr-3d-model-try-on')),
				el('span', null, __('3D files usually become 80–95 % smaller, with the same look. Example: 17.7 MB → 0.8 MB.', 'ar-vr-3d-model-try-on'))),
			el('div', { className: 'atlas-ar-cloud-benefit' },
				el('strong', null, __('True size in AR', 'ar-vr-3d-model-try-on')),
				el('span', null, __('Each model is scaled to the product’s real height, so a 32 cm vase looks 32 cm on the shopper’s table.', 'ar-vr-3d-model-try-on'))),
			el('div', { className: 'atlas-ar-cloud-benefit' },
				el('strong', null, __('Big files too', 'ar-vr-3d-model-try-on')),
				el('span', null, __('Up to 50 MB: files too heavy to optimise in a browser are done on our servers.', 'ar-vr-3d-model-try-on'))),
			el('div', { className: 'atlas-ar-cloud-benefit' },
				el('strong', null, __('Nothing to wait for', 'ar-vr-3d-model-try-on')),
				el('span', null, __('Send a model and keep working: the lighter file replaces it on your site by itself, the original is kept.', 'ar-vr-3d-model-try-on'))),
			el('p', { className: 'atlas-ar-cloud-plans' },
				el('strong', null, __('Free plan: ', 'ar-vr-3d-model-try-on')), __('20 optimisations a month, no card needed. An optimisation makes one of your existing models lighter; it does not create a new model.', 'ar-vr-3d-model-try-on'), ' ',
				el('strong', null, __('With AtlasAR Pro: ', 'ar-vr-3d-model-try-on')), __('Premium is included: no monthly limit on optimisations, optimise in bulk, and photo to 3D (making new 3D models with AI).', 'ar-vr-3d-model-try-on')));
		var steps = el('div', { className: 'atlas-ar-cloud-steps' },
			el('h3', null, __('How connecting works', 'ar-vr-3d-model-try-on')),
			el('ol', null,
				el('li', null, __('Enter your email and click "Connect this site". A new email gets a free AtlasAR Cloud account at once, no card needed.', 'ar-vr-3d-model-try-on')),
				el('li', null, __('Already have an AtlasAR Cloud account with this email? We email you a link to approve this site. Click it, then click "Refresh" here.', 'ar-vr-3d-model-try-on')),
				el('li', null, __('Done: "Optimise on AtlasAR Cloud" appears in the 3D Library. The key is stored encrypted on this site; only its first letters are shown.', 'ar-vr-3d-model-try-on'))),
			el('p', { className: 'atlas-ar-cloud-links' },
				link(links.connect, __('Step-by-step guide', 'ar-vr-3d-model-try-on')), ' · ', link(links.pricing, __('Plans', 'ar-vr-3d-model-try-on')), ' · ',
				link(links.terms, __('Terms', 'ar-vr-3d-model-try-on')), ' · ', link(links.privacy, __('Privacy', 'ar-vr-3d-model-try-on'))));

		var body;
		if (!cloud.available) {
			// Only when the site turned it off (ATLAS_AR_CLOUD_URL empty in wp-config.php): say so, and what works already.
			body = el('div', { className: 'atlas-ar-cloud-soon' },
				el('p', null, el('span', { className: 'atlas-ar-badge atlas-ar-badge--muted' }, __('Turned off', 'ar-vr-3d-model-try-on')), ' ',
					__('AtlasAR Cloud, our optional online service, is turned off on this site (ATLAS_AR_CLOUD_URL is empty in wp-config.php). Nothing is sent anywhere.', 'ar-vr-3d-model-try-on')),
				el('h3', null, __('What it adds', 'ar-vr-3d-model-try-on')),
				el('ul', null,
					el('li', null, __('Optimise big models (up to 50 MB) on our servers, made at their real size for AR.', 'ar-vr-3d-model-try-on')),
					el('li', null, __('Free 3D models to import into your 3D Library.', 'ar-vr-3d-model-try-on')),
					el('li', null, __('With AtlasAR Pro: no monthly limit, optimise in bulk, and photo to 3D with AI.', 'ar-vr-3d-model-try-on'))),
				el('h3', null, __('Works today, without it', 'ar-vr-3d-model-try-on')),
				el('ul', null,
					el('li', null, __('3D, AR and try-on on your products.', 'ar-vr-3d-model-try-on')),
					el('li', null, __('“Optimise” in the 3D Library: makes models lighter in your browser.', 'ar-vr-3d-model-try-on')),
					el('li', null, __('“Make a 3D model from a photo” for flat products (wall art, posters, rugs, tiles).', 'ar-vr-3d-model-try-on'))),
				el('div', { className: 'atlas-ar-row' },
					el(C.Button, { variant: 'secondary', href: boot.libraryUrl }, __('Open the 3D Library', 'ar-vr-3d-model-try-on'))));
		} else if (cloud.connected) {
			var u = cloud.usage || {};
			body = el(Fragment, null,
				el('p', null, el('span', { className: 'atlas-ar-saved' }, cloud.approval === 'pending' ? __('Waiting for approval', 'ar-vr-3d-model-try-on') : __('Connected', 'ar-vr-3d-model-try-on')),
					cloud.email ? ' · ' + cloud.email : '', ' · ', el('code', null, cloud.key_prefix + '…')),
				cloud.approval === 'pending' ? el(C.Notice, { status: 'warning', isDismissible: false }, __('Open the email from AtlasAR Cloud and approve this site; then click Refresh.', 'ar-vr-3d-model-try-on')) : null,
				u.units_limit !== undefined ? el('p', null, el('strong', null, __('Optimisations this month: ', 'ar-vr-3d-model-try-on')),
					u.units_limit === null ? sprintf(__('%d (no limit)', 'ar-vr-3d-model-try-on'), u.units_used) : sprintf('%d / %d', u.units_used, u.units_limit),
					' · ', __('Plan: ', 'ar-vr-3d-model-try-on'), cloud.plan || 'free') : null,
				cloud.error ? el(C.Notice, { status: 'error', isDismissible: false }, cloud.error) : null,
				cloud.approval !== 'pending' ? el('p', { className: 'description' }, __('Next: open the 3D Library, choose a model and click "Optimise on AtlasAR Cloud".', 'ar-vr-3d-model-try-on')) : null,
				cloud.approval !== 'pending' ? el('p', { className: 'description' }, cloud.webhook
					? __('Instant updates are on: a finished model arrives even when no AtlasAR page is open.', 'ar-vr-3d-model-try-on')
					: sprintf(__('Instant updates are off (%s): finished models arrive the next time you open the 3D Library.', 'ar-vr-3d-model-try-on'), cloud.webhook_error || __('not set up yet', 'ar-vr-3d-model-try-on'))) : null,
				el('div', { className: 'atlas-ar-row' },
					el(C.Button, { variant: 'secondary', isBusy: busy, onClick: function () { run(UI.api('/cloud?fresh=1')); } }, __('Refresh', 'ar-vr-3d-model-try-on')),
					links.dashboard ? el('a', { className: 'button', href: links.dashboard, target: '_blank', rel: 'noopener noreferrer' }, __('Open the AtlasAR Cloud dashboard', 'ar-vr-3d-model-try-on')) : null,
					el(C.Button, { variant: 'tertiary', isDestructive: true, disabled: busy, onClick: function () { run(UI.api('/cloud', { method: 'DELETE' })); } }, __('Disconnect', 'ar-vr-3d-model-try-on'))));
		} else if (taken) {
			body = el(Fragment, null,
				el(C.Notice, { status: 'warning', isDismissible: false },
					taken.hint ? sprintf(__('This site is already connected to AtlasAR Cloud with another email (%s).', 'ar-vr-3d-model-try-on'), taken.hint) : __('This site is already connected to AtlasAR Cloud with another email.', 'ar-vr-3d-model-try-on')),
				el('p', null, __('Choose one:', 'ar-vr-3d-model-try-on')),
				el('ol', { className: 'atlas-ar-cloud-choices' },
					el('li', null, el('strong', null, __('It is your other email: ', 'ar-vr-3d-model-try-on')), __('enter that email and click "Connect this site" again.', 'ar-vr-3d-model-try-on'), ' ',
						el(C.Button, { variant: 'link', onClick: function () { setTaken(null); setEmail(''); } }, __('Use the other email', 'ar-vr-3d-model-try-on'))),
					el('li', null, el('strong', null, __('You have that account’s API key: ', 'ar-vr-3d-model-try-on')), __('paste it (AtlasAR Cloud dashboard › Sites › Keys).', 'ar-vr-3d-model-try-on'), ' ',
						el(C.Button, { variant: 'link', onClick: function () { setTaken(null); setMode('key'); } }, __('Paste a key', 'ar-vr-3d-model-try-on'))),
					taken.takeover ? el('li', null, el('strong', null, sprintf(__('Move this site to %s: ', 'ar-vr-3d-model-try-on'), email)),
						__('AtlasAR Cloud checks that you run this site (it reads a one-time code from the site’s public address), then moves it. The old key stops working and the old email is told. The site must be online and public.', 'ar-vr-3d-model-try-on'), ' ',
						el(C.Button, { variant: 'secondary', isBusy: busy, disabled: busy, onClick: function () { run(UI.api('/cloud/takeover', { method: 'POST', data: { email: email, consent: true } })); } }, __('Move the site to this email', 'ar-vr-3d-model-try-on'))) : null),
				el(C.Button, { variant: 'tertiary', onClick: function () { setTaken(null); } }, __('Back', 'ar-vr-3d-model-try-on')));
		} else {
			body = el(Fragment, null, benefits,
				mode === 'new' ? el(Fragment, null,
					el(C.TextControl, { label: __('Email for your AtlasAR Cloud account', 'ar-vr-3d-model-try-on'), type: 'email', value: email, onChange: setEmail, autoComplete: 'email', name: 'atlas_ar_cloud_email' }),
					el(C.CheckboxControl, {
						checked: consent, onChange: setConsent,
						label: __('I agree that a model is sent to AtlasAR Cloud only when I click a Cloud button, and I accept the AtlasAR Cloud terms and privacy policy.', 'ar-vr-3d-model-try-on')
					}),
					el(C.CheckboxControl, {
						checked: news, onChange: setNews,
						label: __('Optional: email me tips, new features and offers about AtlasAR. Unsubscribe any time.', 'ar-vr-3d-model-try-on')
					}),
					el('div', { className: 'atlas-ar-row' },
						el(C.Button, { variant: 'primary', isBusy: busy, disabled: busy || !consent || !email, onClick: function () { run(UI.api('/cloud/connect', { method: 'POST', data: { email: email, consent: consent, news: news } })); } }, __('Connect this site', 'ar-vr-3d-model-try-on')),
						el(C.Button, { variant: 'link', onClick: function () { setMode('key'); } }, __('I already have an API key', 'ar-vr-3d-model-try-on'))))
					: el(Fragment, null,
						// Not a password field: a saved password is never filled in here.
						el(C.TextControl, { label: __('AtlasAR Cloud API key', 'ar-vr-3d-model-try-on'), value: key, onChange: setKey, autoComplete: 'off', spellCheck: false, name: 'atlas_ar_cloud_api_key', 'data-1p-ignore': 'true', 'data-lpignore': 'true', help: __('In the AtlasAR Cloud dashboard: Sites › your site › Keys. It starts with ar_live_.', 'ar-vr-3d-model-try-on') }),
						el('div', { className: 'atlas-ar-row' },
							el(C.Button, { variant: 'primary', isBusy: busy, disabled: busy || !key, onClick: function () { run(UI.api('/cloud/key', { method: 'POST', data: { key: key } })); } }, __('Save and test', 'ar-vr-3d-model-try-on')),
							el(C.Button, { variant: 'link', onClick: function () { setMode('new'); } }, __('Make a free account instead', 'ar-vr-3d-model-try-on')))),
				steps);
		}
		return el(UI.Section, { className: 'atlas-ar-card-cloud', title: __('AtlasAR Cloud', 'ar-vr-3d-model-try-on'), lead: __('Lighter 3D models at their real size: faster product pages and AR that looks right. Optional: everything else in AtlasAR works without it.', 'ar-vr-3d-model-try-on') },
			body, err ? el(C.Notice, { status: 'error', isDismissible: false }, err) : null);
	}

	/**
	 * AR-182: the cards stacked (880 px at most). Each card sits in UI.Field ("card.<id>"), so the
	 * search's "Connect AtlasAR Cloud" lands on it. Cards from atlasAr.integrations.cards as before.
	 */
	function IntegrationsPage(ctx) {
		var cards = UI.filters('atlasAr.integrations.cards', [
			{ id: 'cloud', render: CloudCard },
			{
				id: 'ai', render: function () {
					return el(UI.Section, { title: __('Meshy AI and Tripo3D', 'ar-vr-3d-model-try-on'), lead: __('Make 3D models from a product photo or a text, with your own Meshy or Tripo account, right in the product editor.', 'ar-vr-3d-model-try-on') },
						el(UI.ProNote, { where: 'integrations', spot: 'photo_to_3d' }, __('Photo to 3D comes with AtlasAR Pro (AtlasAR Cloud, Meshy AI or Tripo3D).', 'ar-vr-3d-model-try-on')),
						el('p', { className: 'description' }, __('With AtlasAR you upload your own models to the 3D Library and optimise them.', 'ar-vr-3d-model-try-on')));
				}
			}
		], ctx);
		return el(Fragment, null,
			el(UI.Head, { lead: __('Services that make, optimise and host 3D models. Nothing is sent to a service until you click its button.', 'ar-vr-3d-model-try-on') }),
			el('div', { className: 'atlas-ar-integrations' }, cards.map(function (c) {
				return el(UI.Field, { key: c.id, id: 'card.' + c.id, className: 'atlas-ar-card-field' }, el(c.render, ctx));
			})));
	}

	/**
	 * AR-182: Settings on the new design: tabs General, Privacy and Tools. The settings come from
	 * the map; Tools keeps export, import and reset as they were (results in a snackbar).
	 */
	function SettingsPage(ctx) {
		var _msg = useState(''), msg = _msg[0], setMsg = _msg[1];
		var _confirm = useState(false), confirm = _confirm[0], setConfirm = _confirm[1];
		var fileRef = UI.useRef(null);
		function exportSettings() {
			var blob = new Blob([JSON.stringify({ atlasar: 1, settings: ctx.settings }, null, 2)], { type: 'application/json' });
			var a = document.createElement('a');
			a.href = URL.createObjectURL(blob); a.download = 'atlasar-settings.json'; a.click();
			setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
		}
		function importSettings(file) {
			setMsg('');
			file.text().then(function (txt) {
				var data = JSON.parse(txt);
				if (!data || !data.settings) throw new Error(__('This is not an AtlasAR settings file.', 'ar-vr-3d-model-try-on'));
				return ctx.save(data.settings);
			}).then(function () { UI.shell.notify(__('Settings imported.', 'ar-vr-3d-model-try-on')); }, function (e) { setMsg(UI.message(e)); });
		}
		function reset() {
			UI.api('/config/reset', { method: 'POST' }).then(function (r) {
				ctx.replace(r.settings); setConfirm(false); UI.shell.notify(__('Settings reset.', 'ar-vr-3d-model-try-on'));
			}, function (e) { setMsg(UI.message(e)); });
		}
		return el(Fragment, null,
			el(UI.Head, { lead: __('Where AtlasAR works, privacy and tools.', 'ar-vr-3d-model-try-on') }),
			el(UI.shell.Tabs, { tabs: tabsOf('settings'), tab: ctx.tab, onTab: function (t) { ctx.go('settings', t, '', { replace: true }); } }, function (t) {
				if (t === 'tools') {
					return el('div', { className: 'atlas-ar-tab-fields atlas-ar-tools' },
						el('h3', null, __('Setup wizard', 'ar-vr-3d-model-try-on')),
						el('p', { className: 'description' }, __('Choose the placement, the look and try-on again, step by step.', 'ar-vr-3d-model-try-on')),
						el('a', { className: 'button', href: ctx.wizardUrl }, __('Run the setup wizard', 'ar-vr-3d-model-try-on')),
						el('h3', null, __('Back up or move to another site', 'ar-vr-3d-model-try-on')),
						el('p', { className: 'description' }, __('Save your AtlasAR settings in a file, or load them from one.', 'ar-vr-3d-model-try-on')),
						el('div', { className: 'atlas-ar-row' },
							el(UI.Field, { id: 'action.export', className: 'is-inline' }, el(C.Button, { variant: 'secondary', onClick: exportSettings }, __('Export settings', 'ar-vr-3d-model-try-on'))),
							el(UI.Field, { id: 'action.import', className: 'is-inline' }, el(C.Button, { variant: 'secondary', onClick: function () { fileRef.current.click(); } }, __('Import settings', 'ar-vr-3d-model-try-on'))),
							el('input', { ref: fileRef, type: 'file', accept: 'application/json,.json', hidden: true, onChange: function (e) { var f = e.target.files[0]; e.target.value = ''; if (f) importSettings(f); } })),
						el('h3', null, __('Start over', 'ar-vr-3d-model-try-on')),
						el(UI.Field, { id: 'action.reset', className: 'is-inline' },
							!confirm ? el(C.Button, { variant: 'tertiary', isDestructive: true, onClick: function () { setConfirm(true); } }, __('Reset to defaults', 'ar-vr-3d-model-try-on'))
								: el('span', { className: 'atlas-ar-row' }, el('span', null, __('Reset every setting?', 'ar-vr-3d-model-try-on')),
									el(C.Button, { variant: 'primary', isDestructive: true, onClick: reset }, __('Reset', 'ar-vr-3d-model-try-on')),
									el(C.Button, { variant: 'tertiary', onClick: function () { setConfirm(false); } }, __('Cancel', 'ar-vr-3d-model-try-on')))),
						msg ? el('p', { className: 'atlas-ar-error', role: 'alert' }, msg) : null);
				}
				return el('div', { className: 'atlas-ar-tab-fields' },
					el(UI.Fields, {
						where: { screen: 'settings', tab: t }, settings: ctx.settings, set: ctx.set,
						after: {
							'general.post_types': el(UI.ProNote, { where: 'settings', spot: 'post_types' }, __('AtlasAR Pro adds custom post types from any plugin (portfolios, listings, courses…).', 'ar-vr-3d-model-try-on')),
							'general.optimise_level': ctx.cloud.connected ? el('p', { className: 'description' }, __('Big files can also be optimised on AtlasAR Cloud from the 3D Library.', 'ar-vr-3d-model-try-on')) : null
						}
					}));
			}));
	}

	/* ---------------------------------------------------------- analytics */

	/** AR-161: what shoppers do with the 3D views (the viewer SDK counts, this site keeps the totals). */
	function AnalyticsPage() {
		var _days = useState(30), days = _days[0], setDays = _days[1];
		var _page = useState(1), page = _page[0], setPage = _page[1];
		var _data = useState(null), data = _data[0], setData = _data[1];
		var _err = useState(''), err = _err[0], setErr = _err[1];
		useEffect(function () {
			var live = true;
			setErr('');
			UI.api('/stats?days=' + days + '&page=' + page).then(function (res) { if (live) setData(res); }, function (e) { if (live) setErr(UI.message(e)); });
			return function () { live = false; };
		}, [days, page]);

		var events = data ? data.events : {};
		var keys = Object.keys(events);
		var main = ['view', 'turn', 'ar', 'tryon'].filter(function (k) { return events[k]; });
		var cols = keys.filter(function (k) { return k !== 'open' && k !== 'tryon_sample'; });
		var n = function (v) { return (v || 0).toLocaleString(); };
		var rate = function (a, b) { return b ? Math.round(100 * (a || 0) / b) + ' %' : '—'; };
		var t = data ? data.totals : {};

		// One bar a day for 3D views (no chart library: plain boxes, the total for screen readers).
		var series = data && data.series.view ? data.series.view : {};
		var dayList = [];
		if (data) {
			var start = new Date(data.from + 'T00:00:00Z');
			for (var i = 0; i < data.days; i++) dayList.push(new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10));
		}
		var peak = Math.max.apply(null, [1].concat(dayList.map(function (d) { return series[d] || 0; })));
		var pages = data ? Math.max(1, Math.ceil(data.total / 20)) : 1;

		return el(Fragment, null,
			el(UI.Head, { lead: __('How shoppers use your 3D views: counted on this site only, without cookies or personal data.', 'ar-vr-3d-model-try-on') }),
			el('div', { className: 'atlas-ar-filters atlas-ar-range', role: 'group', 'aria-label': __('Period', 'ar-vr-3d-model-try-on') },
				[[7, __('7 days', 'ar-vr-3d-model-try-on')], [30, __('30 days', 'ar-vr-3d-model-try-on')], [90, __('90 days', 'ar-vr-3d-model-try-on')], [365, __('12 months', 'ar-vr-3d-model-try-on')]].map(function (r) {
					return el('button', { key: r[0], type: 'button', className: 'atlas-ar-filter' + (days === r[0] ? ' is-on' : ''), 'aria-pressed': days === r[0] ? 'true' : 'false', onClick: function () { setDays(r[0]); setPage(1); } }, r[1]);
				})),
			err ? el(C.Notice, { status: 'error', isDismissible: false }, err) : null,
			data && !data.enabled ? el(C.Notice, { status: 'warning', isDismissible: false, className: 'atlas-ar-page-notice' }, __('Counting is off (Settings › Privacy). The totals below are from before.', 'ar-vr-3d-model-try-on')) : null,
			!data && !err ? el('p', { className: 'atlas-ar-loading', role: 'status' }, el(C.Spinner, null), __('Loading…', 'ar-vr-3d-model-try-on')) : null,
			data ? el(Fragment, null,
				el('div', { className: 'atlas-ar-stat-cards' }, main.map(function (k) {
					return el('div', { key: k, className: 'atlas-ar-stat-card' },
						el('span', { className: 'atlas-ar-stat-label' }, events[k]),
						el('strong', null, n(t[k])),
						k === 'ar' || k === 'turn' ? el('span', { className: 'atlas-ar-muted' }, sprintf(__('%s of 3D views', 'ar-vr-3d-model-try-on'), rate(t[k], t.view))) : null);
				})),
				el(UI.Section, { title: __('3D views a day', 'ar-vr-3d-model-try-on') },
					el('div', { className: 'atlas-ar-bars', role: 'img', 'aria-label': sprintf(__('%1$s 3D views in %2$d days', 'ar-vr-3d-model-try-on'), n(t.view), data.days) },
						dayList.map(function (d) {
							var v = series[d] || 0;
							return el('span', { key: d, className: 'atlas-ar-bar', title: d + ': ' + v, style: { height: Math.max(2, Math.round(100 * v / peak)) + '%' } });
						})),
					el('div', { className: 'atlas-ar-bars-axis' }, el('span', null, dayList[0]), el('span', null, dayList[dayList.length - 1]))),
				el(UI.Section, { title: __('Products', 'ar-vr-3d-model-try-on') },
					data.products.length === 0
						? el(UI.Empty, { text: __('Nothing counted yet in this period. Counting starts when shoppers open a product with a 3D model.', 'ar-vr-3d-model-try-on') })
						: el('table', { className: 'widefat striped atlas-ar-table atlas-ar-stats-table' },
							el('thead', null, el('tr', null,
								el('th', { scope: 'col' }, __('Product', 'ar-vr-3d-model-try-on')),
								cols.map(function (k) { return el('th', { key: k, scope: 'col', className: 'num' }, events[k]); }))),
							el('tbody', null, data.products.map(function (p) {
								return el('tr', { key: p.id },
									el('td', null, p.edit_url ? el('a', { href: p.edit_url }, p.title) : p.title),
									cols.map(function (k) { return el('td', { key: k, className: 'num' }, n(p.counts[k])); }));
							}))),
					pages > 1 ? el('div', { className: 'atlas-ar-pager' },
						el(C.Button, { variant: 'secondary', disabled: page <= 1, onClick: function () { setPage(page - 1); } }, __('Previous', 'ar-vr-3d-model-try-on')),
						el('span', null, sprintf(__('Page %1$d of %2$d', 'ar-vr-3d-model-try-on'), page, pages)),
						el(C.Button, { variant: 'secondary', disabled: page >= pages, onClick: function () { setPage(page + 1); } }, __('Next', 'ar-vr-3d-model-try-on'))) : null),
				el(UI.ProNote, { where: 'analytics', spot: 'pro_events' }, __('AtlasAR Pro also counts hotspot clicks, switches to other models and variant changes.', 'ar-vr-3d-model-try-on'))) : null);
	}

	/** AR-182: Help on the new design: tabs Guides, Shortcode builder and Site check. */
	function HelpPage(ctx) {
		var _w = useState(''), width = _w[0], setWidth = _w[1];
		var _h = useState(''), height = _h[0], setHeight = _h[1];
		var _id = useState(''), id = _id[0], setId = _id[1];
		var _b = useState(false), btn = _b[0], setBtn = _b[1];
		var _checks = useState(null), checks = _checks[0], setChecks = _checks[1];
		useEffect(function () { UI.api('/check').then(setChecks, function () { setChecks([]); }); }, []);
		var code = '[atlas_ar' + (id ? ' id="' + parseInt(id, 10) + '"' : '') + (width ? ' width="' + width.replace(/["\]]/g, '') + '"' : '') + (height ? ' height="' + height.replace(/["\]]/g, '') + '"' : '') + (btn ? ' reveal="false"' : '') + ']';
		function copy() {
			var failed = function () { UI.shell.notify(__('Copying did not work here: select the shortcode and copy it.', 'ar-vr-3d-model-try-on'), { type: 'error' }); };
			if (!navigator.clipboard) { failed(); return; }
			navigator.clipboard.writeText(code).then(function () { UI.shell.notify(__('Copied', 'ar-vr-3d-model-try-on')); }, failed);
		}
		var guide = function (href, text) { return el('li', null, el('a', { href: href, target: '_blank', rel: 'noopener noreferrer' }, text, el('span', { className: 'screen-reader-text' }, __('(opens in a new tab)', 'ar-vr-3d-model-try-on')))); };
		return el(Fragment, null,
			el(UI.Head, { lead: __('Guides, a shortcode builder and a quick check of your site.', 'ar-vr-3d-model-try-on') }),
			el(UI.shell.Tabs, { tabs: tabsOf('help'), tab: ctx.tab, onTab: function (t) { ctx.go('help', t, '', { replace: true }); } }, function (t) {
				if (t === 'shortcode') {
					return el('div', { className: 'atlas-ar-tab-fields' },
						el('p', { className: 'atlas-ar-tab-lead' }, __('Show a 3D view anywhere: paste the shortcode into a post, a page or a page builder.', 'ar-vr-3d-model-try-on')),
						el(UI.Field, { id: 'help.shortcode' }, el(C.TextControl, { label: __('Product or post ID (empty = the page it is on)', 'ar-vr-3d-model-try-on'), type: 'number', value: id, onChange: setId })),
						el('div', { className: 'atlas-ar-row atlas-ar-shortcode-size' },
							el(C.TextControl, { label: __('Width', 'ar-vr-3d-model-try-on'), placeholder: '100%', value: width, onChange: setWidth }),
							el(C.TextControl, { label: __('Height', 'ar-vr-3d-model-try-on'), placeholder: '420px', value: height, onChange: setHeight })),
						el(C.ToggleControl, { label: __('Show a button instead of the 3D view', 'ar-vr-3d-model-try-on'), checked: btn, onChange: setBtn }),
						el('div', { className: 'atlas-ar-code' }, el('code', null, code), el(C.Button, { variant: 'secondary', onClick: copy }, __('Copy', 'ar-vr-3d-model-try-on'))));
				}
				if (t === 'check') {
					return el('div', { className: 'atlas-ar-tab-fields' },
						el('p', { className: 'atlas-ar-tab-lead' }, __('What AtlasAR needs from this site, checked now.', 'ar-vr-3d-model-try-on')),
						checks === null ? el('p', { className: 'atlas-ar-loading', role: 'status' }, el(C.Spinner, null), __('Checking…', 'ar-vr-3d-model-try-on'))
							: checks.length ? el('ul', { className: 'atlas-ar-checks' }, checks.map(function (c, i) {
								return el('li', { key: i, className: c.ok ? 'is-ok' : 'is-warn' }, el('span', { 'aria-hidden': 'true' }, c.ok ? '✓' : '!'), ' ', el('span', { className: 'screen-reader-text' }, c.ok ? __('OK:', 'ar-vr-3d-model-try-on') : __('Check:', 'ar-vr-3d-model-try-on')), ' ', c.text);
							})) : el(UI.Empty, { text: __('The site check could not run. Reload the page to try again.', 'ar-vr-3d-model-try-on') }));
				}
				return el('div', { className: 'atlas-ar-tab-fields' },
					el('ul', { className: 'atlas-ar-guides' },
						guide(UI.link(UI.LINKS.docs, 'help', 'help_docs'), __('Getting started — from install to your first 3D product', 'ar-vr-3d-model-try-on')),
						guide(UI.link(UI.LINKS.docs, 'help', 'help_docs'), __('Good 3D models — size, files for iPhone and Android', 'ar-vr-3d-model-try-on')),
						guide(UI.link(UI.LINKS.docs, 'help', 'help_docs'), __('Try-on setup — glasses and caps that fit', 'ar-vr-3d-model-try-on')),
						guide(UI.link(UI.LINKS.support, 'help', 'help_support'), __('Contact support — we answer within one working day', 'ar-vr-3d-model-try-on'))));
			}));
	}

	/* ------------------------------------------------------------- wizard */

	/** AR-158: the wizard's last screen: our other free plugins, and the Plugins page. */
	function Suggested() {
		var list = boot.suggested || [];
		if (!list.length) return null;
		return el('div', { className: 'atlas-ar-suggested' },
			el('h3', null, __('More free plugins from AtlasAiDev, the makers of AtlasAR', 'ar-vr-3d-model-try-on')),
			el('ul', { className: 'atlas-ar-suggested-list' }, list.map(function (p) {
				return el('li', { key: p.slug, className: 'atlas-ar-suggested-card' },
					el('strong', null, p.name),
					el('p', null, p.description),
					el('div', { className: 'atlas-ar-row' },
						p.status === 'active' ? el('span', { className: 'atlas-ar-badge' }, __('Active', 'ar-vr-3d-model-try-on'))
							: p.action ? el(C.Button, {
								variant: 'secondary', href: p.action,
								className: p.status === 'none' ? 'thickbox open-plugin-details-modal' : '',
								'aria-label': sprintf(p.status === 'none' ? __('Install %s', 'ar-vr-3d-model-try-on') : __('Activate %s', 'ar-vr-3d-model-try-on'), p.name)
							}, p.status === 'none' ? __('Install free', 'ar-vr-3d-model-try-on') : __('Activate', 'ar-vr-3d-model-try-on')) : null,
						p.url ? el(C.Button, { variant: 'link', href: p.url, target: '_blank', rel: 'noopener noreferrer' }, __('Learn more', 'ar-vr-3d-model-try-on')) : null));
			})),
			boot.pluginsUrl ? el('p', null, el('a', { href: boot.pluginsUrl }, __('See all our plugins', 'ar-vr-3d-model-try-on'))) : null);
	}

	/**
	 * The setup wizard (?page=…&setup=1). AR-182: drawn inside the app frame: the steps and the
	 * step in the pane, Back / Step n of m / Continue in the pane's footer. Step ids stay (Pro
	 * inserts its step before "done" with atlasAr.wizard.steps), and so does wizard_done.
	 */
	function Wizard(ctx) {
		var steps = UI.filters('atlasAr.wizard.steps', [
			{ id: 'place', label: __('Placement', 'ar-vr-3d-model-try-on') },
			{ id: 'look', label: __('Look', 'ar-vr-3d-model-try-on') },
			{ id: 'tryon', label: __('Try-on', 'ar-vr-3d-model-try-on') },
			{ id: 'cloud', label: __('AtlasAR Cloud', 'ar-vr-3d-model-try-on'), hide: !ctx.cloud.available },
			{ id: 'done', label: __('Done', 'ar-vr-3d-model-try-on') }
		].filter(function (s) { return !s.hide; }), ctx);
		var _i = useState(0), i = _i[0], setI = _i[1];
		var step = steps[i];
		var s = ctx.settings;
		function finish(toDashboard) {
			ctx.save(Object.assign({}, s, { general: Object.assign({}, s.general, { wizard_done: true }) })).then(function () {
				window.location.href = toDashboard ? ctx.dashboardUrl : (boot.libraryUrl || ctx.dashboardUrl);
			});
		}
		function next() {
			if (i === steps.length - 2) { ctx.save(Object.assign({}, s, { general: Object.assign({}, s.general, { wizard_done: true }) })); }
			setI(Math.min(steps.length - 1, i + 1));
		}
		var body;
		if (step.render) body = el(step.render, ctx);
		else if (step.id === 'place') body = el(Fragment, null,
			el('h2', null, __('Where should shoppers see the 3D view?', 'ar-vr-3d-model-try-on')),
			el('p', null, __('On your WooCommerce product pages. Posts and pages use the block or shortcode.', 'ar-vr-3d-model-try-on')),
			el(UI.Choice, { label: __('Placement', 'ar-vr-3d-model-try-on'), value: s.placement.mode, options: UI.map.placements.slice(0, 4), onChange: function (v) { ctx.set('placement', 'mode', v); } }),
			// AR-176: the card button is a choice here, off until the merchant turns it on.
			el(UI.Fields, { ids: ['cards.button'], settings: s, set: ctx.set, always: true, labels: { 'cards.button': __('Also show a “View in 3D and AR” button on product cards (the shop and category pages)', 'ar-vr-3d-model-try-on') } }));
		else if (step.id === 'look') body = el(Fragment, null,
			el('h2', null, __('Make it look like your shop', 'ar-vr-3d-model-try-on')),
			el('p', null, __('Pick a background and the colour of the “View in your room” button.', 'ar-vr-3d-model-try-on')),
			el('div', { className: 'atlas-ar-split' },
				el('div', null, el(UI.Fields, {
					ids: ['look.background', 'look.ar_text', 'look.ar_color'], settings: s, set: ctx.set, always: true, showLabels: true,
					labels: { 'look.ar_text': __('“View in your room” button text', 'ar-vr-3d-model-try-on'), 'look.ar_color': __('“View in your room” button colour', 'ar-vr-3d-model-try-on') }
				})),
				el(Preview, { settings: s, height: '260px' })));
		else if (step.id === 'tryon') body = el(Fragment, null,
			el('h2', null, __('Do you sell glasses or caps?', 'ar-vr-3d-model-try-on')),
			el('p', null, __('Shoppers can try them on with their camera. It runs on their own device; no picture is sent anywhere.', 'ar-vr-3d-model-try-on')),
			el(UI.Choice, {
				label: __('Try-on', 'ar-vr-3d-model-try-on'), value: s.tryon.enabled ? 'on' : 'off', onChange: function (v) { ctx.set('tryon', 'enabled', v === 'on'); },
				options: [
					{ value: 'on', title: __('Yes, turn on try-on', 'ar-vr-3d-model-try-on'), text: __('A “Try it on” button appears on products you mark as glasses or caps.', 'ar-vr-3d-model-try-on') },
					{ value: 'off', title: __('Not now', 'ar-vr-3d-model-try-on'), text: __('You can turn it on later under Try-on.', 'ar-vr-3d-model-try-on') }
				]
			}),
			s.tryon.enabled ? el(C.TextControl, { label: __('Button text', 'ar-vr-3d-model-try-on'), value: s.tryon.label, onChange: function (v) { ctx.set('tryon', 'label', v); } }) : null);
		else if (step.id === 'cloud') body = el(Fragment, null,
			el('h2', null, __('Connect AtlasAR Cloud', 'ar-vr-3d-model-try-on'), ' ', el('span', { className: 'atlas-ar-badge' }, __('Free plan — no card needed', 'ar-vr-3d-model-try-on'))),
			el('p', null, __('Your 3D models get faster and easier. Optional: you can skip this and connect later.', 'ar-vr-3d-model-try-on')),
			el(CloudCard, ctx));
		else body = el(Fragment, null,
			el('h2', null, __('You are ready', 'ar-vr-3d-model-try-on')),
			el('p', null, __('Now add a 3D model: upload your GLB files to the 3D Library, then pick it on a product.', 'ar-vr-3d-model-try-on')),
			// AR-158: tracking is opt-in (wp.org Guideline 7): never ticked for the site owner.
			el('div', { className: 'atlas-ar-wizard-optin' },
				el(C.CheckboxControl, {
					label: __('Help improve AtlasAR: share usage data with AtlasAiDev', 'ar-vr-3d-model-try-on'),
					help: __('Off unless you tick it. Sent once a week: this site’s address and name, the admin’s name and email, the IP address, WordPress, PHP and server versions, active plugins and the theme. Never your products, files or visitors. You can change this any time under Settings.', 'ar-vr-3d-model-try-on'),
					checked: !!s.general.telemetry,
					// saved at once: the plugin buttons below leave this page
					onChange: function (v) { ctx.set('general', 'telemetry', v); ctx.save(Object.assign({}, s, { general: Object.assign({}, s.general, { telemetry: v }) })).catch(function () {}); },
					__nextHasNoMarginBottom: true
				})),
			el('div', { className: 'atlas-ar-row' },
				el(C.Button, { variant: 'primary', onClick: function () { finish(false); } }, __('Open the 3D Library', 'ar-vr-3d-model-try-on')),
				el(C.Button, { variant: 'secondary', onClick: function () { finish(true); } }, __('Go to the dashboard', 'ar-vr-3d-model-try-on'))),
			el(Suggested, null));

		var nav = step.id !== 'done' ? el('div', { className: 'atlas-ar-wizard-nav' },
			i > 0 ? el(C.Button, { variant: 'secondary', onClick: function () { setI(i - 1); } }, __('Back', 'ar-vr-3d-model-try-on')) : el('span'),
			el('span', { className: 'atlas-ar-muted', 'aria-live': 'polite' }, sprintf(__('Step %1$d of %2$d', 'ar-vr-3d-model-try-on'), i + 1, steps.length)),
			el(C.Button, { variant: 'primary', onClick: next }, step.id === 'cloud' && !ctx.cloud.connected ? __('Skip for now', 'ar-vr-3d-model-try-on') : __('Continue', 'ar-vr-3d-model-try-on'))) : null;
		return el(UI.shell.Pane, { footer: nav, className: 'atlas-ar-pane--wizard' },
			el('div', { className: 'atlas-ar-wizard' },
				el('div', { className: 'atlas-ar-wizard-head' },
					el('p', null, __('About 2 minutes — you can change everything later', 'ar-vr-3d-model-try-on')),
					el(C.Button, { variant: 'link', onClick: function () { finish(true); } }, __('Skip setup', 'ar-vr-3d-model-try-on'))),
				el('ol', { className: 'atlas-ar-steps' }, steps.map(function (st, n) {
					return el('li', { key: st.id, className: n === i ? 'is-current' : n < i ? 'is-done' : '', 'aria-current': n === i ? 'step' : undefined }, st.label);
				})),
				el(UI.Section, null, body)));
	}

	/* -------------------------------------------------------------- app */

	/** AR-182: the screens whose settings the Save bar saves (it shows on the others only while something is unsaved). */
	var SETTINGS_SCREENS = ['placement', 'tryon', 'settings'];

	/** AR-180: the status bar's facts, from data the page already has (no request). */
	function statusFacts(cloud) {
		var counts = boot.counts || {}, mig = boot.migration || {}, facts = [];
		var with3d = counts.with3d || 0, models = counts.models || 0;
		facts.push({ id: 'with3d', screen: 'products', text: sprintf(_n('%d product shows 3D', '%d products show 3D', with3d, 'ar-vr-3d-model-try-on'), with3d) });
		facts.push({ id: 'models', href: (boot.shell && boot.shell.urls || {}).library || boot.libraryUrl, text: sprintf(_n('%d model in the 3D Library', '%d models in the 3D Library', models, 'ar-vr-3d-model-try-on'), models) });
		if (cloud && cloud.available) {
			var u = cloud.usage || {}, text;
			if (!cloud.connected) text = __('AtlasAR Cloud: not connected', 'ar-vr-3d-model-try-on');
			else if (u.units_limit === null && u.units_used !== undefined) text = sprintf(__('AtlasAR Cloud: connected · %d optimisations this month', 'ar-vr-3d-model-try-on'), u.units_used);
			else if (u.units_limit !== undefined) text = sprintf(__('AtlasAR Cloud: connected · %1$d of %2$d optimisations this month', 'ar-vr-3d-model-try-on'), u.units_used || 0, u.units_limit);
			else text = __('AtlasAR Cloud: connected', 'ar-vr-3d-model-try-on');
			facts.push({ id: 'cloud', screen: 'integrations', text: text });
		}
		if (mig.status === 'running') facts.push({ id: 'migration', screen: 'products', text: sprintf(__('Moving models from AtlasAR 2 (%d so far)', 'ar-vr-3d-model-try-on'), mig.moved || 0) });
		return facts;
	}

	function App() {
		var st = UI.useSettings(boot.settings);
		var settings = st[0], set = st[1], save = st[2], status = st[3], replace = st[4];
		var _cloud = useState(boot.cloud || {}), cloud = _cloud[0], setCloud = _cloud[1];
		var params = new URLSearchParams(window.location.search);
		var rt = UI.shell.useRoute(), route = rt[0], go = rt[1];
		var wizardUrl = boot.dashboardUrl + '&setup=1';
		var label = function (id) { var m = UI.map.screen(id); return m ? m.label : id; };

		var current = null; // the screen on show (set below, once the screens are known)

		function saveNow() {
			// AR-148: saving Placement / Appearance ticks its Get started step at once.
			var flag = current && current.id === 'placement' ? 'placed' : current && current.id === 'appearance' ? 'styled' : '';
			var patch = flag && !settings.general[flag] ? Object.assign({}, settings, { general: Object.assign({}, settings.general, (function () { var g = {}; g[flag] = true; return g; })()) }) : undefined;
			save(patch).catch(function () {});
		}
		var ctx = {
			settings: settings, set: set, save: save, replace: replace, cloud: cloud, setCloud: setCloud,
			// go( 'integrations' ) works as before; AR-180: also go( screen, tab, field, opts ).
			go: function (id, tab, field, opts) { go(id, tab, field, opts); },
			dashboardUrl: boot.dashboardUrl, wizardUrl: wizardUrl,
			saveBar: el(UI.SaveBar, { busy: status.busy, saved: status.saved, error: status.error, onSave: saveNow }),
			// AR-180
			route: route, tab: '', status: status, saveNow: saveNow
		};

		// The screen ids and their order stay as before; names come from the map (one list).
		var pages = UI.filters('atlasAr.dashboard.pages', [
			{ id: 'products', label: label('products'), render: ProductsPage },
			{ id: 'appearance', label: label('appearance'), render: AppearancePage, ownPane: true },
			{ id: 'placement', label: label('placement'), render: PlacementPage },
			{ id: 'tryon', label: label('tryon'), render: TryonPage },
			{ id: 'integrations', label: label('integrations'), render: IntegrationsPage },
			{ id: 'analytics', label: label('analytics'), render: AnalyticsPage },
			{ id: 'settings', label: label('settings'), render: SettingsPage },
			{ id: 'help', label: label('help'), render: HelpPage }
		], ctx).filter(function (p) { return p && p.id && typeof p.render === 'function'; });
		// An unknown screen opens the first one, as before.
		current = pages.filter(function (p) { return p.id === route.screen; })[0] || pages[0];
		ctx.tab = current.id === route.screen ? route.tab : '';

		useEffect(function () {
			if (params.get('setup')) return; // the wizard saves step by step, as before
			function warn(e) { if (status.dirty) { e.preventDefault(); e.returnValue = ''; } }
			window.addEventListener('beforeunload', warn);
			return function () { window.removeEventListener('beforeunload', warn); };
		}, [status.dirty]);

		if (params.get('setup')) {
			// AR-182: the wizard in the frame. Its menu items lead back to the dashboard (no screen is drawn here).
			return el(UI.shell.Shell, {
				items: UI.shell.railItems({ settings: settings }), current: 'setup', title: __('Set up AtlasAR', 'ar-vr-3d-model-try-on'),
				facts: statusFacts(cloud), dirty: false
			}, el(Wizard, ctx));
		}

		var footer = SETTINGS_SCREENS.indexOf(current.id) !== -1 || status.dirty ? el(UI.shell.SaveFooter, { status: status, onSave: saveNow }) : null;
		return el(UI.shell.Shell, {
			items: UI.shell.railItems({ pages: pages, settings: settings }), current: current.id, title: current.label,
			onGo: go, route: route, facts: statusFacts(cloud), dirty: status.dirty
		},
			// A new key per screen: the pane starts at the top, as a new page would.
			current.ownPane ? el(current.render, Object.assign({ key: current.id }, ctx)) : el(UI.shell.Pane, { key: current.id, footer: footer }, el(current.render, ctx)));
	}

	function start() {
		var node = document.getElementById('atlas-ar-dashboard');
		if (!node) return;
		if (wp.element.createRoot) wp.element.createRoot(node).render(el(App));
		else wp.element.render(el(App), node);
	}
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
	else start();
})(window.AtlasARAdminUI, window.wp);
