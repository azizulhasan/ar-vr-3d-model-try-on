/**
 * AR-120: AtlasAR dashboard (Products, Appearance, Placement, Try-on, Integrations, Settings,
 * Help) and the setup wizard (?page=ar-vr-3d-model-try-on&setup=1). Plain JavaScript on
 * window.AtlasARAdminUI (atlas-ar-ui.js).
 */
(function (UI, wp) {
	'use strict';
	if (!UI) return;
	var el = UI.el, Fragment = UI.Fragment, useState = UI.useState, useEffect = UI.useEffect, C = UI.C, __ = UI.__, D = UI.D;
	var sprintf = wp.i18n.sprintf, _n = wp.i18n._n;
	var boot = UI.boot;

	/* ------------------------------------------------------------- shared */

	var PLACEMENTS = [
		{ value: 'gallery', title: __('In the gallery, image first', D), text: __('A 3D button on the main product image switches to the 3D view.', D), badge: __('Recommended', D) },
		{ value: 'gallery3d', title: __('In the gallery, 3D first', D), text: __('The 3D view replaces the main image; the image is one click away.', D) },
		{ value: 'button', title: __('A button that opens a popup', D), text: __('Keeps the gallery as it is; the 3D view opens in a window.', D) },
		{ value: 'tab', title: __('Only in a product tab', D), text: __('The 3D view sits with the description and reviews.', D) },
		{ value: 'slide', title: __('As a gallery slide', D), text: __('The 3D view is one more slide among the product images.', D) }
	];
	var BUTTON_POSITIONS = [
		{ value: 'after_cart', label: __('After the “Add to cart” button', D) },
		{ value: 'before_cart', label: __('Before the “Add to cart” button', D) },
		{ value: 'after_summary', label: __('After the product summary', D) },
		{ value: 'under_images', label: __('Under the product images', D) }
	];
	var BACKGROUNDS = ['#ffffff', '#f6f7f7', '#eef2f3', '#1d2327'];
	var COLORS = ['#0e6b5c', '#2271b1', '#1d2327', '#b32d2e', '#996800'];

	function Swatches(props) {
		return el('div', { className: 'atlas-ar-swatches', role: 'radiogroup', 'aria-label': props.label },
			props.colors.map(function (c) {
				return el('button', {
					key: c, type: 'button', role: 'radio', 'aria-checked': props.value === c ? 'true' : 'false', 'aria-label': c,
					className: 'atlas-ar-swatch' + (props.value === c ? ' is-on' : ''), style: { background: c },
					onClick: function () { props.onChange(c); }
				});
			}),
			el('label', { className: 'atlas-ar-swatch-custom' }, __('Other', D),
				el('input', { type: 'color', value: props.value || '#ffffff', onChange: function (e) { props.onChange(e.target.value); } })));
	}

	function LookFields(props) {
		var look = props.settings.look, set = function (k, v) { props.set('look', k, v); };
		return el(Fragment, null,
			el('h3', null, __('Background', D)),
			el(Swatches, { label: __('Background', D), colors: BACKGROUNDS, value: look.background, onChange: function (v) { set('background', v); } }),
			props.short ? null : el(Fragment, null,
				el(C.SelectControl, {
					label: __('Lighting', D), value: look.lighting, onChange: function (v) { set('lighting', v); }, __nextHasNoMarginBottom: true,
					options: [
						{ value: 'neutral', label: __('Neutral studio (recommended)', D) },
						{ value: 'bright', label: __('Bright', D) },
						{ value: 'custom', label: __('Custom environment image', D) }
					]
				}),
				look.lighting === 'custom' ? el(C.TextControl, { label: __('Environment image URL (.hdr, .jpg)', D), type: 'url', value: look.environment_url, onChange: function (v) { set('environment_url', v); } }) : null,
				el(C.RangeControl, { label: __('Brightness', D), value: Number(look.exposure), min: 0.5, max: 2, step: 0.1, onChange: function (v) { set('exposure', v); } }),
				el(C.RangeControl, { label: __('Shadow', D), value: Number(look.shadow), min: 0, max: 2, step: 0.1, onChange: function (v) { set('shadow', v); } }),
				el(C.ToggleControl, { label: __('Turn the model slowly until the visitor touches it', D), checked: !!look.auto_rotate, onChange: function (v) { set('auto_rotate', v); } }),
				el(C.ToggleControl, { label: __('Visitors can zoom', D), checked: !!look.zoom, onChange: function (v) { set('zoom', v); } }),
				// AR-156: the view.
				el('h3', null, __('Starting view', D)),
				el(C.SelectControl, {
					label: __('Camera', D), value: look.camera, onChange: function (v) { set('camera', v); }, __nextHasNoMarginBottom: true,
					options: [{ value: 'auto', label: __('As the model was made (recommended)', D) }, { value: 'front', label: __('From the front', D) }, { value: 'side', label: __('From the side', D) }, { value: 'top', label: __('From above', D) }]
				}),
				el(C.SelectControl, {
					label: __('Colours', D), value: look.tone, onChange: function (v) { set('tone', v); }, __nextHasNoMarginBottom: true,
					options: [{ value: 'neutral', label: __('True to life (recommended)', D) }, { value: 'aces', label: __('More contrast', D) }, { value: 'agx', label: __('Softer, for very bright products', D) }]
				}),
				look.lighting === 'custom' ? el(C.ToggleControl, { label: __('Show the environment image behind the model', D), checked: !!look.skybox, onChange: function (v) { set('skybox', v); } }) : null,
				el(C.ToggleControl, { label: __('Show a “drag to turn” hint until the visitor touches the model', D), checked: look.prompt !== false, onChange: function (v) { set('prompt', v); } }),
				// AR-156: size and frame.
				el('h3', null, __('Size and frame', D)),
				el(C.RangeControl, { label: __('Height on computers (px)', D), value: Number(look.height), min: 200, max: 1200, step: 10, onChange: function (v) { set('height', v); } }),
				el(C.RangeControl, { label: __('Height on phones (px)', D), value: Number(look.mobile_height), min: 200, max: 1200, step: 10, onChange: function (v) { set('mobile_height', v); } }),
				el(C.TextControl, { label: __('Maximum width (px)', D), type: 'number', min: 0, max: 3000, value: look.max_width, onChange: function (v) { set('max_width', v); }, help: __('0 = as wide as the space it is in.', D) }),
				Number(look.max_width) > 0 ? el(C.SelectControl, {
					label: __('Position', D), value: look.align, onChange: function (v) { set('align', v); }, __nextHasNoMarginBottom: true,
					options: [{ value: 'left', label: __('Left', D) }, { value: 'center', label: __('Centre', D) }, { value: 'right', label: __('Right', D) }]
				}) : null,
				el(C.RangeControl, { label: __('Border (px)', D), value: Number(look.border_width), min: 0, max: 10, onChange: function (v) { set('border_width', v); } }),
				Number(look.border_width) > 0 ? el(Fragment, null,
					el('span', { className: 'atlas-ar-label' }, __('Border colour', D)),
					el(Swatches, { label: __('Border colour', D), colors: ['#dcdcde', '#c3c4c7', '#1d2327', '#0e6b5c', '#2271b1'], value: look.border_color, onChange: function (v) { set('border_color', v); } })) : null,
				el(C.RangeControl, { label: __('Rounded corners (px)', D), value: Number(look.radius), min: 0, max: 40, onChange: function (v) { set('radius', v); } }),
				el(C.SelectControl, {
					label: __('Shadow around the view', D), value: look.frame_shadow, onChange: function (v) { set('frame_shadow', v); }, __nextHasNoMarginBottom: true,
					options: [{ value: 'none', label: __('None', D) }, { value: 'soft', label: __('Soft', D) }, { value: 'strong', label: __('Strong', D) }]
				})),
			el('h3', null, __('“View in your room” button (AR)', D)),
			props.short ? null : el(C.ToggleControl, { label: __('Show the button (shoppers place the product in their room)', D), checked: look.ar !== false, onChange: function (v) { set('ar', v); } }),
			props.short || look.ar === false ? null : el(C.ToggleControl, { label: __('In AR, light the model like the room (Android)', D), checked: look.xr_environment !== false, onChange: function (v) { set('xr_environment', v); } }),
			props.short ? null : el(C.RadioControl, {
				label: __('Button style', D), hideLabelFromVision: true, selected: look.ar_button, onChange: function (v) { set('ar_button', v); },
				options: [{ value: 'default', label: __('Standard', D) }, { value: 'custom', label: __('Your style', D) }]
			}),
			// AR-156: the "Your style" fields as their own spaced group under the choice.
			look.ar_button === 'custom' || props.short ? el('div', { className: 'atlas-ar-subgroup' },
				el(C.TextControl, { label: __('Button text', D), value: look.ar_text, maxLength: 60, onChange: function (v) { set('ar_text', v); } }),
				el('span', { className: 'atlas-ar-label' }, __('Button colour', D)),
				el(Swatches, { label: __('Button colour', D), colors: COLORS, value: look.ar_color, onChange: function (v) { set('ar_color', v); } }),
				props.short ? null : el(Fragment, null,
					el('span', { className: 'atlas-ar-label' }, __('Button text colour', D)),
					el(Swatches, { label: __('Button text colour', D), colors: ['#ffffff', '#1d2327'], value: look.ar_text_color, onChange: function (v) { set('ar_text_color', v); } }))) : null,
			// AR-148: its own heading, apart from the button style above.
			props.short ? null : el('h3', null, __('When the 3D view loads', D)),
			props.short ? null : el(C.RadioControl, {
				label: __('When the 3D view loads', D), hideLabelFromVision: true, selected: look.load, onChange: function (v) { set('load', v); },
				options: [
					{ value: 'scroll', label: __('When the view scrolls into sight — best for most shops', D) },
					{ value: 'click', label: __('Only after a click on “View in 3D” — fastest pages, shows the image first', D) }
				]
			}));
	}

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
		return el('div', { className: 'atlas-ar-presets', role: 'group', 'aria-label': __('Quick styles', D) },
			el('span', { className: 'atlas-ar-label' }, __('Quick styles', D)),
			el(C.Button, { variant: 'secondary', onClick: function () { apply(PRESETS.clean); } }, __('Clean', D)),
			el(C.Button, { variant: 'secondary', onClick: function () { apply(PRESETS.card); } }, __('Card', D)),
			el(C.Button, { variant: 'secondary', onClick: function () { apply(PRESETS.minimal); } }, __('Minimal', D)),
			el(C.Button, { variant: 'tertiary', onClick: reset }, __('Reset to default', D)));
	}

	function Preview(props) {
		var demo = boot.demoModel || {};
		var o = Object.assign({ src: demo.src, poster: demo.poster }, UI.lookOptions(props.settings.look));
		return el('div', { className: 'atlas-ar-preview-col' },
			el('h3', null, __('Live preview', D)),
			el(UI.Viewer, { options: o, height: props.height || (Number(props.settings.look.height) || 340) + 'px', frame: props.settings.look, reloadKey: JSON.stringify(o) }),
			el('p', { className: 'description' }, demo.name ? sprintf(__('Showing “%s”. ', D), demo.name) : '', __('The shop uses the same AtlasAR viewer, so what you see here is what shoppers get.', D)));
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
				if (!res.ok) throw new Error(__('The photo could not be loaded.', D));
				return res.blob();
			}).then(function (blob) {
				var file = new File([blob], (r.image.split('/').pop() || 'photo.jpg').split('?')[0], { type: blob.type });
				if (r.h) return { file: file, h: r.h };
				return createImageBitmap(blob).then(function (bmp) { var h = (parseFloat(r.w) * bmp.height / bmp.width).toFixed(1); bmp.close(); return { file: file, h: h }; });
			});
		}
		function runAll() {
			if (!lib || !lib.makeFlat) { setErr(__('The 3D tools could not load. Please reload the page.', D)); return; }
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
			if (r.status === 'done') return el('span', { className: 'atlas-ar-ok' }, __('Done', D));
			if (r.status === 'busy') return el('span', { className: 'atlas-ar-loading' }, el(C.Spinner, null), __('Making…', D));
			if (r.status) return el('span', { className: 'atlas-ar-error' }, r.status);
			return r.w ? null : el('span', { className: 'atlas-ar-muted' }, __('Enter its width', D));
		}
		var table = el('table', { className: 'widefat striped atlas-ar-table atlas-ar-bulk-table' },
			el('thead', null, el('tr', null,
				el('th', { scope: 'col' }, el('span', { className: 'screen-reader-text' }, __('Make', D))),
				el('th', { scope: 'col' }, __('Product', D)),
				el('th', { scope: 'col' }, __('Width (cm)', D)),
				el('th', { scope: 'col' }, __('Height (cm)', D)),
				el('th', { scope: 'col' }, __('Status', D)))),
			el('tbody', null, (rows || []).map(function (r) {
				return el('tr', { key: r.id },
					el('td', null, el('input', { type: 'checkbox', checked: r.on, disabled: running || r.status === 'done', 'aria-label': sprintf(__('Make a 3D model for “%s”', D), r.title), onChange: function (e) { set(r.id, 'on', e.target.checked); } })),
					el('td', null, el('span', { className: 'atlas-ar-product-name' }, el('img', { src: r.thumb, alt: '', width: 36, height: 36 }), r.title)),
					el('td', null, el('input', { type: 'number', min: 1, max: 1000, step: 'any', value: r.w, disabled: running, className: 'small-text', 'aria-label': __('Width (cm)', D), onChange: function (e) { set(r.id, 'w', e.target.value); if (e.target.value) set(r.id, 'on', true); } })),
					el('td', null, el('input', { type: 'number', min: 1, max: 1000, step: 'any', value: r.h, placeholder: __('from the photo', D), disabled: running, className: 'small-text', 'aria-label': __('Height (cm)', D), onChange: function (e) { set(r.id, 'h', e.target.value); } })),
					el('td', null, statusCell(r)));
			})));
		var body;
		if (rows === null) body = el('p', { className: 'atlas-ar-loading', role: 'status' }, el(C.Spinner, null), __('Loading…', D));
		else if (!rows.length) body = el('p', { className: 'atlas-ar-empty' }, __('Every product without a 3D model needs a photo (its featured image) first.', D));
		else body = table;
		return el(C.Modal, { title: __('Make 3D from product photos', D), onRequestClose: running ? function () {} : props.onClose, className: 'atlas-ar-bulk-flat', size: 'large' },
			el('p', null, __('For flat products: wall art, posters, canvas prints, framed pictures, rugs and tiles. Each product’s photo becomes a 3D model at its real size, made in this browser, saved to the 3D Library and shown on the product. Keep this window open while it runs.', D)),
			el('div', { className: 'atlas-ar-row' },
				el(C.SelectControl, { label: __('What they are', D), value: kind, disabled: running, onChange: setKind, __nextHasNoMarginBottom: true,
					options: ((lib && lib.flatKinds) || []).map(function (k) { return { value: k[0], label: k[1] }; }) })),
			err ? el(C.Notice, { status: 'error', isDismissible: false }, err) : null,
			body,
			el('div', { className: 'atlas-ar-row atlas-ar-bulk-foot' },
				el(C.Button, { variant: 'primary', isBusy: running, disabled: running || !chosen.length, onClick: runAll },
					running ? sprintf(__('Making %1$d of %2$d…', D), done + 1, done + chosen.length) : chosen.length ? sprintf(_n('Make %d 3D model', 'Make %d 3D models', chosen.length, D), chosen.length) : __('Make 3D models', D)),
				el(C.Button, { variant: 'tertiary', disabled: running, onClick: props.onClose }, __('Close', D)),
				done ? el('span', { className: 'atlas-ar-ok' }, sprintf(_n('%d made', '%d made', done, D), done)) : null));
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
				title: sprintf(__('Choose a 3D model for “%s”', D), item.title),
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
			{ key: 'place', title: __('Choose where the 3D view appears', D), text: __('In the product gallery, a button with a popup, or a tab.', D), action: __('Placement', D), go: function () { ctx.go('placement'); } },
			{ key: 'look', title: __('Make it look like your shop', D), text: __('Background, lighting and the AR button colour.', D), action: __('Appearance', D), go: function () { ctx.go('appearance'); } },
			{ key: 'model', title: __('Add your first 3D model', D), text: __('Upload your files to the 3D Library and pick a product.', D), action: __('Show products without 3D', D), go: function () { setFilter('without'); } },
			{ key: 'cloud', title: __('Connect AtlasAR Cloud (optional)', D), text: __('Smaller files at real size and fast hosting.', D), action: __('Integrations', D), go: function () { ctx.go('integrations'); }, hide: !ctx.cloud.available },
			{ key: 'tryon', title: __('Sell glasses or caps? Turn on try-on', D), text: __('Shoppers try products on with their camera.', D), action: __('Try-on', D), go: function () { ctx.go('tryon'); } }
		].filter(function (c) { return !c.hide; });
		var doneCount = checklist.filter(function (c) { return done[c.key]; }).length;
		var mig = boot.migration || {};

		return el(Fragment, null,
			el(UI.Head, { title: __('Products', D), lead: __('Your products and their 3D, AR and try-on status. Add a model right from here.', D) }),
			// AR-160: the one-time move from AtlasAR 2.x.
			mig.status === 'running' ? el(C.Notice, { status: 'info', isDismissible: false, className: 'atlas-ar-page-notice' },
				sprintf(__('Moving your 3D models from AtlasAR 2 into the 3D Library (%d so far). It runs in the background; your shop keeps working.', D), mig.moved || 0)) : null,
			mig.status === 'done' && mig.failed > 0 && mig.finished > Date.now() / 1000 - 30 * 86400 ? el(C.Notice, { status: 'warning', isDismissible: false, className: 'atlas-ar-page-notice' },
				sprintf(__('%d products from AtlasAR 2 could not be moved (their model file was missing or could not be read). Use “Without 3D” below to find them and add their model again.', D), mig.failed)) : null,
			ctx.cloud.available && !ctx.cloud.connected && !s.general.cloud_tip_off ? el('div', { className: 'atlas-ar-cloud-tip' },
				el('div', null,
					el('strong', null, __('Make your 3D product pages load faster: connect AtlasAR Cloud (free)', D)),
					el('ul', null,
						el('li', null, __('Files usually 80–95 % smaller, same look', D)),
						el('li', null, __('Each model at its real size in AR', D)),
						el('li', null, __('Big files up to 50 MB, done in the background', D)),
						el('li', null, __('20 free optimisations a month (making your models lighter); no limit with AtlasAR Pro', D)))),
				el('div', { className: 'atlas-ar-row' },
					el(C.Button, { variant: 'primary', onClick: function () { ctx.go('integrations'); } }, __('Connect, it is free', D)),
					el(C.Button, { variant: 'tertiary', onClick: function () { ctx.save({ general: { cloud_tip_off: true } }); } }, __('Not now', D)))) : null,
			// Get started is always here (design system: collapsed, never removed); the setup wizard
			// can be run again at any time.
			el(UI.Section, { className: 'atlas-ar-checklist' + (s.general.checklist_off ? ' is-folded' : '') },
				el('div', { className: 'atlas-ar-checklist-head' },
					el('h2', { className: 'atlas-ar-section-title' }, __('Get started', D)),
					el('span', { className: 'atlas-ar-progress' }, sprintf(__('%1$d of %2$d done', D), doneCount, checklist.length)),
					el('span', { className: 'atlas-ar-checklist-actions' },
						el(C.Button, { variant: 'secondary', href: ctx.wizardUrl }, __('Run the setup wizard', D)),
						el(C.Button, {
							variant: 'tertiary', 'aria-expanded': s.general.checklist_off ? 'false' : 'true',
							onClick: function () { ctx.save(Object.assign({}, s, { general: Object.assign({}, s.general, { checklist_off: !s.general.checklist_off }) })); }
						}, s.general.checklist_off ? __('Show the steps', D) : __('Fold', D)))),
				s.general.checklist_off ? null : el(Fragment, null,
					// AR-151: for beginners — what this page is and what to do first.
					doneCount < checklist.length ? el('p', { className: 'atlas-ar-lead' },
						__('New to AtlasAR? Follow these steps from top to bottom: each one takes a minute, and you can change everything later. The list below shows your products and whether they have a 3D model yet.', D)) : null,
					el('ol', null, checklist.map(function (c) {
						return el('li', { key: c.key, className: done[c.key] ? 'is-done' : '' },
							el('span', { className: 'atlas-ar-check', 'aria-hidden': 'true' }, done[c.key] ? '✓' : ''),
							el('span', { className: 'atlas-ar-check-text' }, el('strong', null, c.title), el('span', null, c.text)),
							done[c.key] ? el('span', { className: 'screen-reader-text' }, __('Done', D)) : el(C.Button, { variant: 'secondary', onClick: c.go }, c.action));
					})))),
			el(UI.Section, null,
				el('div', { className: 'atlas-ar-toolbar' },
					el('div', { className: 'atlas-ar-search' }, el(C.SearchControl, { label: __('Search products', D), value: search, onChange: function (v) { setSearch(v); setPage(1); }, __nextHasNoMarginBottom: true })),
					el('div', { className: 'atlas-ar-filters', role: 'group', 'aria-label': __('Show', D) },
						[['all', __('All', D)], ['with', __('With 3D', D)], ['without', __('Without 3D', D)], ['tryon', __('Try-on', D)]].map(function (f) {
							return el('button', { key: f[0], type: 'button', className: 'atlas-ar-filter' + (filter === f[0] ? ' is-on' : ''), 'aria-pressed': filter === f[0] ? 'true' : 'false', onClick: function () { setFilter(f[0]); setPage(1); } }, f[1]);
						})),
					window.AtlasARLibrary && window.AtlasARLibrary.makeFlat ? el(C.Button, { variant: 'secondary', onClick: function () { setBulk(true); } }, __('Make 3D from product photos', D)) : null),
				bulk ? el(BulkFlat, { onClose: function () { setBulk(false); }, onDone: load }) : null,
				loading && items !== null ? el('p', { className: 'atlas-ar-loading', role: 'status' }, el(C.Spinner, null), __('Loading…', D)) : null,
				err ? el(C.Notice, { status: 'error', isDismissible: false }, err) : null,
				items === null ? el('p', { className: 'atlas-ar-loading', role: 'status' }, el(C.Spinner, null), __('Loading…', D)) : el('div', { className: 'atlas-ar-list' + (loading ? ' is-loading' : ''), 'aria-busy': loading ? 'true' : 'false' }, items.length === 0
					? el('p', { className: 'atlas-ar-empty' }, search || filter !== 'all' ? __('No products match.', D) : __('No products yet.', D))
					: el('table', { className: 'widefat striped atlas-ar-table' },
						el('thead', null, el('tr', null,
							el('th', { scope: 'col' }, __('Product', D)), el('th', { scope: 'col' }, __('Model', D)),
							el('th', { scope: 'col' }, __('AR', D)), el('th', { scope: 'col' }, __('Try-on', D)), el('th', { scope: 'col' }, el('span', { className: 'screen-reader-text' }, __('Action', D))))),
						el('tbody', null, items.map(function (i) {
							var m = i.model;
							return el('tr', { key: i.id },
								el('td', null, el('a', { href: i.edit_url, className: 'atlas-ar-product-name' }, i.thumb ? el('img', { src: i.thumb, alt: '', width: 36, height: 36 }) : null, i.title || '#' + i.id), i.status !== 'publish' ? el('span', { className: 'atlas-ar-muted' }, ' — ' + i.status) : null),
								el('td', null, m ? el(Fragment, null, m.file || m.name, el('span', { className: 'atlas-ar-muted' }, ' · ' + UI.size(m.size)), m.large ? el('span', { className: 'atlas-ar-badge atlas-ar-badge--warn' }, __('Large file', D)) : null) : el('span', { className: 'atlas-ar-muted' }, __('No 3D model', D))),
								el('td', null, m ? (m.usdz ? __('Ready', D) : __('Ready (Android, WebXR); iPhone from the GLB', D)) : '—'),
								el('td', null, i.tryon === 'glasses' ? __('Glasses', D) : i.tryon === 'hat' ? __('Cap', D) : '—'),
								// Design system › RowActions: one aligned group — the main action as a button, View as an
								// icon button of the same height (a draft opens its preview).
								el('td', { className: 'atlas-ar-actions' }, el('span', { className: 'atlas-ar-row-actions' },
									m
										? el(C.Button, { variant: 'secondary', href: i.edit_url + '#atlas-ar-panel' }, __('Edit', D))
										: el(C.Button, { variant: 'primary', onClick: function () { addModel(i); } }, __('Add 3D', D)),
									i.view_url ? el(C.Button, {
										variant: 'secondary', className: 'atlas-ar-view', icon: 'external', href: i.view_url, target: '_blank', rel: 'noopener',
										label: sprintf(i.status === 'publish' ? __('View “%s” (opens in a new tab)', D) : __('Preview “%s” (opens in a new tab)', D), i.title || '#' + i.id),
										showTooltip: true
									}) : null)));
						})))),
				total > 20 ? el('div', { className: 'atlas-ar-pager' },
					el(C.Button, { variant: 'secondary', disabled: page <= 1, onClick: function () { setPage(page - 1); } }, __('Previous', D)),
					el('span', null, sprintf(__('Page %1$d of %2$d', D), page, Math.ceil(total / 20))),
					el(C.Button, { variant: 'secondary', disabled: page >= Math.ceil(total / 20), onClick: function () { setPage(page + 1); } }, __('Next', D))) : null),
			// AR-146: what Pro adds for these products, right where they are listed.
			el(UI.ProNote, {
				where: 'products', spot: 'products_list', items: [
					__('Make a 3D model from a product photo or a description with AI (AtlasAR Cloud, Meshy AI, Tripo3D).', D),
					__('Several models per product, and the right model for each colour or size (WooCommerce variations).', D),
					__('Hotspots with labels and the real measurements on the 3D view.', D),
					__('Optimise every large file at once, and AtlasAR Cloud Premium with no monthly limit.', D)
				]
			}, __('More for your products with AtlasAR Pro:', D)));
	}

	function AppearancePage(ctx) {
		return el(Fragment, null,
			el(UI.Head, { title: __('Appearance', D), lead: __('How every 3D view looks. A product can change these in its own AtlasAR panel.', D) }),
			// AR-156: two panes like a desktop app: the settings scroll, the live preview stays in view.
			el('div', { className: 'atlas-ar-split atlas-ar-split--preview' },
				el(UI.Section, { className: 'atlas-ar-pane-scroll' }, el(Presets, ctx), el(LookFields, { settings: ctx.settings, set: ctx.set }), ctx.saveBar,
					el(UI.ProNote, { where: 'appearance', spot: 'appearance_extras' }, __('AtlasAR Pro adds hotspots, the real measurements on the view, and several models with thumbnails to switch between.', D))),
				el(UI.Section, { className: 'atlas-ar-pane-sticky' }, el(Preview, { settings: ctx.settings }))));
	}

	function PlacementPage(ctx) {
		var p = ctx.settings.placement, set = function (k, v) { ctx.set('placement', k, v); };
		return el(Fragment, null,
			el(UI.Head, { title: __('Placement', D), lead: __('Where the 3D view appears on WooCommerce product pages.', D) }),
			!boot.woo ? el(C.Notice, { status: 'info', isDismissible: false }, __('WooCommerce is not active. Posts and pages show the 3D view with the block or the shortcode.', D)) : null,
			el(UI.Section, null,
				el(UI.Choice, { label: __('Placement', D), value: p.mode, options: PLACEMENTS, onChange: function (v) { set('mode', v); } }),
				p.mode === 'button' ? el(C.SelectControl, {
					label: __('Show the button', D), value: p.button_position, options: BUTTON_POSITIONS, __nextHasNoMarginBottom: true,
					onChange: function (v) { set('button_position', v); }
				}) : null,
				el('h3', null, __('Also', D)),
				p.mode !== 'tab' ? el(C.ToggleControl, { label: __('Add a “3D view” tab to the product tabs', D), checked: !!p.product_tab, onChange: function (v) { set('product_tab', v); } }) : null,
				el(C.ToggleControl, { label: __('On computers, show a QR code to open AR on a phone', D), checked: !!p.qr, onChange: function (v) { set('qr', v); } }),
				el('p', { className: 'description' }, __('Anywhere else (posts, pages, page builders): use the “AtlasAR 3D view” block or the shortcode [atlas_ar]. Help › Shortcode builder makes one for you.', D)),
				ctx.saveBar));
	}

	function TryonPage(ctx) {
		var t = ctx.settings.tryon, set = function (k, v) { ctx.set('tryon', k, v); };
		var _busy = useState(''), busy = _busy[0], setBusy = _busy[1];
		var _tr = useState(boot.tracker || {}), tracker = _tr[0], setTracker = _tr[1];
		var _err = useState(''), err = _err[0], setErr = _err[1];
		function files(method) {
			setBusy(method); setErr('');
			UI.api('/tracker', { method: method }).then(function (res) { setTracker(res.tracker); ctx.replace(res.settings); setBusy(''); }, function (e) { setErr(UI.message(e)); setBusy(''); });
		}
		var cats = [
			[__('Glasses', D), __('Sunglasses and frames on the nose', D), true],
			[__('Caps and hats', D), __('On the head, above the forehead', D), true],
			[__('Earrings', D), __('On the ear lobes', D), false],
			[__('Lips and make-up', D), __('Lipstick shades on the lips', D), false],
			[__('Rings and watches', D), __('On the hand and wrist', D), false]
		];
		return el(Fragment, null,
			el(UI.Head, { title: __('Virtual try-on', D), lead: __('Shoppers see your product on their own face with the camera. Everything happens on their device; no picture or video is sent anywhere.', D) }),
			el(UI.Section, null,
				el(C.ToggleControl, { label: __('Show the “Try it on” button on try-on products', D), checked: !!t.enabled, onChange: function (v) { set('enabled', v); } }),
				el('h3', null, __('Product types', D)),
				el('p', { className: 'description' }, __('Choose the type in each product’s AtlasAR panel.', D)),
				el('div', { className: 'atlas-ar-cats' }, cats.map(function (c) {
					return el('div', { key: c[0], className: 'atlas-ar-cat' + (c[2] ? ' is-on' : '') },
						el('strong', null, c[0]), el('span', { className: 'atlas-ar-badge' + (c[2] ? '' : ' atlas-ar-badge--muted') }, c[2] ? __('Included', D) : __('Coming later', D)), el('span', null, c[1]));
				})),
				el('h3', null, __('What shoppers see', D)),
				el(C.TextControl, { label: __('Button text', D), value: t.label, maxLength: 60, onChange: function (v) { set('label', v); } }),
				el(C.TextareaControl, { label: __('Camera message (shown before the camera starts)', D), value: t.consent, rows: 3, onChange: function (v) { set('consent', v); } }),
				el(C.ToggleControl, { label: __('Let shoppers save a photo of themselves wearing it', D), checked: !!t.snapshot, onChange: function (v) { set('snapshot', v); }, help: __('Saved photos show a small “Powered by AtlasAR” label.', D) }),
				el(UI.ProNote, { where: 'tryon', spot: 'tryon_hd' }, __('AtlasAR Pro removes the label, saves photos in HD and shows the product in real 3D that turns with the head.', D)),
				el('h3', null, __('Face-tracking files', D)),
				el('p', { className: 'description' }, __('About 15 MB, loaded only after the shopper allows the camera.', D)),
				el(C.RadioControl, {
					label: __('Load them', D), hideLabelFromVision: true, selected: t.tracker, onChange: function (v) { set('tracker', v); },
					options: [
						{ value: 'cdn', label: __('From the public CDN (default) — jsDelivr and Google; listed under External services in the readme', D) },
						{ value: 'self', label: __('From this site — downloaded once into your uploads folder; no third-party request', D) }
					]
				}),
				t.tracker === 'self' ? el('div', { className: 'atlas-ar-row' },
					tracker.present
						? el(Fragment, null, el('span', { className: 'atlas-ar-saved' }, sprintf(__('On this site (%s).', D), UI.size(tracker.size))),
							el(C.Button, { variant: 'secondary', isBusy: busy === 'POST', disabled: !!busy, onClick: function () { files('POST'); } }, __('Download again', D)),
							el(C.Button, { variant: 'tertiary', isDestructive: true, disabled: !!busy, onClick: function () { files('DELETE'); } }, __('Remove', D)))
						: el(Fragment, null, el(C.Button, { variant: 'secondary', isBusy: busy === 'POST', disabled: !!busy, onClick: function () { files('POST'); } }, __('Download the files to this site', D)),
							el('span', { className: 'description' }, __('Until they are here, the CDN is used.', D)))) : null,
				err ? el(C.Notice, { status: 'error', isDismissible: false }, err) : null,
				ctx.saveBar));
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
				el('strong', null, __('Pages load faster', D)),
				el('span', null, __('3D files usually become 80–95 % smaller, with the same look. Example: 17.7 MB → 0.8 MB.', D))),
			el('div', { className: 'atlas-ar-cloud-benefit' },
				el('strong', null, __('True size in AR', D)),
				el('span', null, __('Each model is scaled to the product’s real height, so a 32 cm vase looks 32 cm on the shopper’s table.', D))),
			el('div', { className: 'atlas-ar-cloud-benefit' },
				el('strong', null, __('Big files too', D)),
				el('span', null, __('Up to 50 MB: files too heavy to optimise in a browser are done on our servers.', D))),
			el('div', { className: 'atlas-ar-cloud-benefit' },
				el('strong', null, __('Nothing to wait for', D)),
				el('span', null, __('Send a model and keep working: the lighter file replaces it on your site by itself, the original is kept.', D))),
			el('p', { className: 'atlas-ar-cloud-plans' },
				el('strong', null, __('Free plan: ', D)), __('20 optimisations a month, no card needed. An optimisation makes one of your existing models lighter; it does not create a new model.', D), ' ',
				el('strong', null, __('With AtlasAR Pro: ', D)), __('Premium is included: no monthly limit on optimisations, optimise in bulk, and photo to 3D (making new 3D models with AI).', D)));
		var steps = el('div', { className: 'atlas-ar-cloud-steps' },
			el('h3', null, __('How connecting works', D)),
			el('ol', null,
				el('li', null, __('Enter your email and click "Connect this site". A new email gets a free AtlasAR Cloud account at once, no card needed.', D)),
				el('li', null, __('Already have an AtlasAR Cloud account with this email? We email you a link to approve this site. Click it, then click "Refresh" here.', D)),
				el('li', null, __('Done: "Optimise on AtlasAR Cloud" appears in the 3D Library. The key is stored encrypted on this site; only its first letters are shown.', D))),
			el('p', { className: 'atlas-ar-cloud-links' },
				link(links.connect, __('Step-by-step guide', D)), ' · ', link(links.pricing, __('Plans', D)), ' · ',
				link(links.terms, __('Terms', D)), ' · ', link(links.privacy, __('Privacy', D))));

		var body;
		if (!cloud.available) {
			// Only when the site turned it off (ATLAS_AR_CLOUD_URL empty in wp-config.php): say so, and what works already.
			body = el('div', { className: 'atlas-ar-cloud-soon' },
				el('p', null, el('span', { className: 'atlas-ar-badge atlas-ar-badge--muted' }, __('Turned off', D)), ' ',
					__('AtlasAR Cloud, our optional online service, is turned off on this site (ATLAS_AR_CLOUD_URL is empty in wp-config.php). Nothing is sent anywhere.', D)),
				el('h3', null, __('What it adds', D)),
				el('ul', null,
					el('li', null, __('Optimise big models (up to 50 MB) on our servers, made at their real size for AR.', D)),
					el('li', null, __('Free 3D models to import into your 3D Library.', D)),
					el('li', null, __('With AtlasAR Pro: no monthly limit, optimise in bulk, and photo to 3D with AI.', D))),
				el('h3', null, __('Works today, without it', D)),
				el('ul', null,
					el('li', null, __('3D, AR and try-on on your products.', D)),
					el('li', null, __('“Optimise” in the 3D Library: makes models lighter in your browser.', D)),
					el('li', null, __('“Make a 3D model from a photo” for flat products (wall art, posters, rugs, tiles).', D))),
				el('div', { className: 'atlas-ar-row' },
					el(C.Button, { variant: 'secondary', href: boot.libraryUrl }, __('Open the 3D Library', D))));
		} else if (cloud.connected) {
			var u = cloud.usage || {};
			body = el(Fragment, null,
				el('p', null, el('span', { className: 'atlas-ar-saved' }, cloud.approval === 'pending' ? __('Waiting for approval', D) : __('Connected', D)),
					cloud.email ? ' · ' + cloud.email : '', ' · ', el('code', null, cloud.key_prefix + '…')),
				cloud.approval === 'pending' ? el(C.Notice, { status: 'warning', isDismissible: false }, __('Open the email from AtlasAR Cloud and approve this site; then click Refresh.', D)) : null,
				u.units_limit !== undefined ? el('p', null, el('strong', null, __('Optimisations this month: ', D)),
					u.units_limit === null ? sprintf(__('%d (no limit)', D), u.units_used) : sprintf('%d / %d', u.units_used, u.units_limit),
					' · ', __('Plan: ', D), cloud.plan || 'free') : null,
				cloud.error ? el(C.Notice, { status: 'error', isDismissible: false }, cloud.error) : null,
				cloud.approval !== 'pending' ? el('p', { className: 'description' }, __('Next: open the 3D Library, choose a model and click "Optimise on AtlasAR Cloud".', D)) : null,
				cloud.approval !== 'pending' ? el('p', { className: 'description' }, cloud.webhook
					? __('Instant updates are on: a finished model arrives even when no AtlasAR page is open.', D)
					: sprintf(__('Instant updates are off (%s): finished models arrive the next time you open the 3D Library.', D), cloud.webhook_error || __('not set up yet', D))) : null,
				el('div', { className: 'atlas-ar-row' },
					el(C.Button, { variant: 'secondary', isBusy: busy, onClick: function () { run(UI.api('/cloud?fresh=1')); } }, __('Refresh', D)),
					links.dashboard ? el('a', { className: 'button', href: links.dashboard, target: '_blank', rel: 'noopener noreferrer' }, __('Open the AtlasAR Cloud dashboard', D)) : null,
					el(C.Button, { variant: 'tertiary', isDestructive: true, disabled: busy, onClick: function () { run(UI.api('/cloud', { method: 'DELETE' })); } }, __('Disconnect', D))));
		} else if (taken) {
			body = el(Fragment, null,
				el(C.Notice, { status: 'warning', isDismissible: false },
					taken.hint ? sprintf(__('This site is already connected to AtlasAR Cloud with another email (%s).', D), taken.hint) : __('This site is already connected to AtlasAR Cloud with another email.', D)),
				el('p', null, __('Choose one:', D)),
				el('ol', { className: 'atlas-ar-cloud-choices' },
					el('li', null, el('strong', null, __('It is your other email: ', D)), __('enter that email and click "Connect this site" again.', D), ' ',
						el(C.Button, { variant: 'link', onClick: function () { setTaken(null); setEmail(''); } }, __('Use the other email', D))),
					el('li', null, el('strong', null, __('You have that account’s API key: ', D)), __('paste it (AtlasAR Cloud dashboard › Sites › Keys).', D), ' ',
						el(C.Button, { variant: 'link', onClick: function () { setTaken(null); setMode('key'); } }, __('Paste a key', D))),
					taken.takeover ? el('li', null, el('strong', null, sprintf(__('Move this site to %s: ', D), email)),
						__('AtlasAR Cloud checks that you run this site (it reads a one-time code from the site’s public address), then moves it. The old key stops working and the old email is told. The site must be online and public.', D), ' ',
						el(C.Button, { variant: 'secondary', isBusy: busy, disabled: busy, onClick: function () { run(UI.api('/cloud/takeover', { method: 'POST', data: { email: email, consent: true } })); } }, __('Move the site to this email', D))) : null),
				el(C.Button, { variant: 'tertiary', onClick: function () { setTaken(null); } }, __('Back', D)));
		} else {
			body = el(Fragment, null, benefits,
				mode === 'new' ? el(Fragment, null,
					el(C.TextControl, { label: __('Email for your AtlasAR Cloud account', D), type: 'email', value: email, onChange: setEmail, autoComplete: 'email', name: 'atlas_ar_cloud_email' }),
					el(C.CheckboxControl, {
						checked: consent, onChange: setConsent,
						label: __('I agree that a model is sent to AtlasAR Cloud only when I click a Cloud button, and I accept the AtlasAR Cloud terms and privacy policy.', D)
					}),
					el(C.CheckboxControl, {
						checked: news, onChange: setNews,
						label: __('Optional: email me tips, new features and offers about AtlasAR. Unsubscribe any time.', D)
					}),
					el('div', { className: 'atlas-ar-row' },
						el(C.Button, { variant: 'primary', isBusy: busy, disabled: busy || !consent || !email, onClick: function () { run(UI.api('/cloud/connect', { method: 'POST', data: { email: email, consent: consent, news: news } })); } }, __('Connect this site', D)),
						el(C.Button, { variant: 'link', onClick: function () { setMode('key'); } }, __('I already have an API key', D))))
					: el(Fragment, null,
						// Not a password field: a saved password is never filled in here.
						el(C.TextControl, { label: __('AtlasAR Cloud API key', D), value: key, onChange: setKey, autoComplete: 'off', spellCheck: false, name: 'atlas_ar_cloud_api_key', 'data-1p-ignore': 'true', 'data-lpignore': 'true', help: __('In the AtlasAR Cloud dashboard: Sites › your site › Keys. It starts with ar_live_.', D) }),
						el('div', { className: 'atlas-ar-row' },
							el(C.Button, { variant: 'primary', isBusy: busy, disabled: busy || !key, onClick: function () { run(UI.api('/cloud/key', { method: 'POST', data: { key: key } })); } }, __('Save and test', D)),
							el(C.Button, { variant: 'link', onClick: function () { setMode('new'); } }, __('Make a free account instead', D)))),
				steps);
		}
		return el(UI.Section, { className: 'atlas-ar-card-cloud', title: __('AtlasAR Cloud', D), lead: __('Lighter 3D models at their real size: faster product pages and AR that looks right. Optional: everything else in AtlasAR works without it.', D) },
			body, err ? el(C.Notice, { status: 'error', isDismissible: false }, err) : null);
	}

	function IntegrationsPage(ctx) {
		var cards = UI.filters('atlasAr.integrations.cards', [
			{ id: 'cloud', render: CloudCard },
			{
				id: 'ai', render: function () {
					return el(UI.Section, { title: __('Meshy AI and Tripo3D', D), lead: __('Make 3D models from a product photo or a text, with your own Meshy or Tripo account, right in the product editor.', D) },
						el(UI.ProNote, { where: 'integrations', spot: 'photo_to_3d' }, __('Photo to 3D comes with AtlasAR Pro (AtlasAR Cloud, Meshy AI or Tripo3D).', D)),
						el('p', { className: 'description' }, __('With AtlasAR you upload your own models to the 3D Library and optimise them.', D)));
				}
			}
		], ctx);
		return el(Fragment, null,
			el(UI.Head, { title: __('Integrations', D), lead: __('Services that make, optimise and host 3D models. Nothing is sent to a service until you click its button.', D) }),
			cards.map(function (c) { return el(c.render, Object.assign({ key: c.id }, ctx)); }));
	}

	function SettingsPage(ctx) {
		var g = ctx.settings.general;
		var _msg = useState(''), msg = _msg[0], setMsg = _msg[1];
		var _confirm = useState(false), confirm = _confirm[0], setConfirm = _confirm[1];
		var fileRef = UI.useRef(null);
		function toggleType(name, on) {
			var list = (g.post_types || []).filter(function (t) { return t !== name; });
			if (on) list.push(name);
			ctx.set('general', 'post_types', list.length ? list : ['product']);
		}
		function exportSettings() {
			var blob = new Blob([JSON.stringify({ atlasar: 1, settings: ctx.settings }, null, 2)], { type: 'application/json' });
			var a = document.createElement('a');
			a.href = URL.createObjectURL(blob); a.download = 'atlasar-settings.json'; a.click();
			setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
		}
		function importSettings(file) {
			file.text().then(function (txt) {
				var data = JSON.parse(txt);
				if (!data || !data.settings) throw new Error(__('This is not an AtlasAR settings file.', D));
				return ctx.save(data.settings);
			}).then(function () { setMsg(__('Settings imported.', D)); }, function (e) { setMsg(UI.message(e)); });
		}
		return el(Fragment, null,
			el(UI.Head, { title: __('Settings', D), lead: __('Where AtlasAR works, privacy and tools.', D) }),
			el(UI.Section, { title: __('Show the AtlasAR panel on', D) },
				(boot.postTypes || []).map(function (t) {
					return el(C.CheckboxControl, { key: t.name, label: t.label, checked: (g.post_types || []).indexOf(t.name) !== -1, onChange: function (v) { toggleType(t.name, v); } });
				}),
				el(UI.ProNote, { where: 'settings', spot: 'post_types' }, __('AtlasAR Pro adds custom post types from any plugin (portfolios, listings, courses…).', D))),
			el(UI.Section, { title: __('Optimisation', D) },
				el(C.ToggleControl, {
					label: __('Optimise every new model when it is added', D), checked: !!g.auto_optimise, onChange: function (v) { ctx.set('general', 'auto_optimise', v); },
					help: __('Smaller files load faster. Runs in your browser when you upload a GLB to the 3D Library (files over 0.5 MB); the original is kept and can be restored.', D)
				}),
				// AR-162: the level Optimise uses (each model can still pick its own in the 3D Library).
				window.AtlasARLibrary && window.AtlasARLibrary.levels ? el(C.SelectControl, {
					label: __('Optimisation level', D), value: g.optimise_level || 'high', __nextHasNoMarginBottom: true,
					options: window.AtlasARLibrary.levels.map(function (l) { return { value: l.value, label: l.label }; }),
					help: (window.AtlasARLibrary.levels.filter(function (l) { return l.value === (g.optimise_level || 'high'); })[0] || {}).text,
					onChange: function (v) { ctx.set('general', 'optimise_level', v); }
				}) : null,
				ctx.cloud.connected ? el('p', { className: 'description' }, __('Big files can also be optimised on AtlasAR Cloud from the 3D Library.', D)) : null),
			el(UI.Section, { title: __('Privacy', D) },
				// AR-161: shopper analytics (Analytics page).
				el(C.ToggleControl, { label: __('Count how shoppers use the 3D view (Analytics)', D), help: __('Daily totals per product, kept on this site: 3D views, AR, try-on. No cookies and no personal data; nothing is sent to us or anyone else.', D), checked: g.stats !== false, onChange: function (v) { ctx.set('general', 'stats', v); } }),
				el(C.ToggleControl, { label: __('Share usage data with AtlasAiDev to help improve AtlasAR', D), help: __('Off unless you turn it on. Sent once a week: this site’s address and name, the admin’s name and email, the IP address, WordPress, PHP and server versions, active plugins and the theme. Never your products, files or visitors.', D), checked: !!g.telemetry, onChange: function (v) { ctx.set('general', 'telemetry', v); } }),
				el(C.ToggleControl, { label: __('Delete all AtlasAR settings, 3D Library models and product data when the plugin is deleted', D), checked: !!g.remove_data, onChange: function (v) { ctx.set('general', 'remove_data', v); } })),
			ctx.saveBar,
			el(UI.Section, { title: __('Tools', D) },
				el('div', { className: 'atlas-ar-row' },
					el('a', { className: 'button', href: ctx.wizardUrl }, __('Run the setup wizard', D)),
					el(C.Button, { variant: 'secondary', onClick: exportSettings }, __('Export settings', D)),
					el(C.Button, { variant: 'secondary', onClick: function () { fileRef.current.click(); } }, __('Import settings', D)),
					el('input', { ref: fileRef, type: 'file', accept: 'application/json,.json', hidden: true, onChange: function (e) { var f = e.target.files[0]; e.target.value = ''; if (f) importSettings(f); } }),
					!confirm ? el(C.Button, { variant: 'tertiary', isDestructive: true, onClick: function () { setConfirm(true); } }, __('Reset to defaults', D))
						: el(Fragment, null, el('span', null, __('Reset every setting?', D)),
							el(C.Button, { variant: 'primary', isDestructive: true, onClick: function () { UI.api('/config/reset', { method: 'POST' }).then(function (r) { ctx.replace(r.settings); setConfirm(false); setMsg(__('Settings reset.', D)); }); } }, __('Reset', D)),
							el(C.Button, { variant: 'tertiary', onClick: function () { setConfirm(false); } }, __('Cancel', D)))),
				msg ? el('p', { role: 'status' }, msg) : null));
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
			el(UI.Head, { title: __('Analytics', D), lead: __('How shoppers use your 3D views: counted on this site only, without cookies or personal data.', D) }),
			el('div', { className: 'atlas-ar-filters atlas-ar-range', role: 'group', 'aria-label': __('Period', D) },
				[[7, __('7 days', D)], [30, __('30 days', D)], [90, __('90 days', D)], [365, __('12 months', D)]].map(function (r) {
					return el('button', { key: r[0], type: 'button', className: 'atlas-ar-filter' + (days === r[0] ? ' is-on' : ''), 'aria-pressed': days === r[0] ? 'true' : 'false', onClick: function () { setDays(r[0]); setPage(1); } }, r[1]);
				})),
			err ? el(C.Notice, { status: 'error', isDismissible: false }, err) : null,
			data && !data.enabled ? el(C.Notice, { status: 'warning', isDismissible: false, className: 'atlas-ar-page-notice' }, __('Counting is off (Settings › Privacy). The totals below are from before.', D)) : null,
			!data && !err ? el('p', { className: 'atlas-ar-loading', role: 'status' }, el(C.Spinner, null), __('Loading…', D)) : null,
			data ? el(Fragment, null,
				el('div', { className: 'atlas-ar-stat-cards' }, main.map(function (k) {
					return el('div', { key: k, className: 'atlas-ar-stat-card' },
						el('span', { className: 'atlas-ar-stat-label' }, events[k]),
						el('strong', null, n(t[k])),
						k === 'ar' || k === 'turn' ? el('span', { className: 'atlas-ar-muted' }, sprintf(__('%s of 3D views', D), rate(t[k], t.view))) : null);
				})),
				el(UI.Section, { title: __('3D views a day', D) },
					el('div', { className: 'atlas-ar-bars', role: 'img', 'aria-label': sprintf(__('%1$s 3D views in %2$d days', D), n(t.view), data.days) },
						dayList.map(function (d) {
							var v = series[d] || 0;
							return el('span', { key: d, className: 'atlas-ar-bar', title: d + ': ' + v, style: { height: Math.max(2, Math.round(100 * v / peak)) + '%' } });
						})),
					el('div', { className: 'atlas-ar-bars-axis' }, el('span', null, dayList[0]), el('span', null, dayList[dayList.length - 1]))),
				el(UI.Section, { title: __('Products', D) },
					data.products.length === 0
						? el('p', { className: 'atlas-ar-empty' }, __('Nothing counted yet in this period. Counting starts when shoppers open a product with a 3D model.', D))
						: el('table', { className: 'widefat striped atlas-ar-table atlas-ar-stats-table' },
							el('thead', null, el('tr', null,
								el('th', { scope: 'col' }, __('Product', D)),
								cols.map(function (k) { return el('th', { key: k, scope: 'col', className: 'num' }, events[k]); }))),
							el('tbody', null, data.products.map(function (p) {
								return el('tr', { key: p.id },
									el('td', null, p.edit_url ? el('a', { href: p.edit_url }, p.title) : p.title),
									cols.map(function (k) { return el('td', { key: k, className: 'num' }, n(p.counts[k])); }));
							}))),
					pages > 1 ? el('div', { className: 'atlas-ar-pager' },
						el(C.Button, { variant: 'secondary', disabled: page <= 1, onClick: function () { setPage(page - 1); } }, __('Previous', D)),
						el('span', null, sprintf(__('Page %1$d of %2$d', D), page, pages)),
						el(C.Button, { variant: 'secondary', disabled: page >= pages, onClick: function () { setPage(page + 1); } }, __('Next', D))) : null),
				el(UI.ProNote, { where: 'analytics', spot: 'pro_events' }, __('AtlasAR Pro also counts hotspot clicks, switches to other models and variant changes.', D))) : null);
	}

	function HelpPage() {
		var _w = useState(''), width = _w[0], setWidth = _w[1];
		var _h = useState(''), height = _h[0], setHeight = _h[1];
		var _id = useState(''), id = _id[0], setId = _id[1];
		var _b = useState(false), btn = _b[0], setBtn = _b[1];
		var _copied = useState(false), copied = _copied[0], setCopied = _copied[1];
		var _checks = useState(null), checks = _checks[0], setChecks = _checks[1];
		useEffect(function () { UI.api('/check').then(setChecks, function () { setChecks([]); }); }, []);
		var code = '[atlas_ar' + (id ? ' id="' + parseInt(id, 10) + '"' : '') + (width ? ' width="' + width.replace(/["\]]/g, '') + '"' : '') + (height ? ' height="' + height.replace(/["\]]/g, '') + '"' : '') + (btn ? ' reveal="false"' : '') + ']';
		return el(Fragment, null,
			el(UI.Head, { title: __('Help', D), lead: __('Guides, a shortcode builder and a quick check of your site.', D) }),
			el('div', { className: 'atlas-ar-split' },
				el(UI.Section, { title: __('Shortcode builder', D) },
					el(C.TextControl, { label: __('Product or post ID (empty = the page it is on)', D), type: 'number', value: id, onChange: setId }),
					el('div', { className: 'atlas-ar-row' },
						el(C.TextControl, { label: __('Width', D), placeholder: '100%', value: width, onChange: setWidth }),
						el(C.TextControl, { label: __('Height', D), placeholder: '420px', value: height, onChange: setHeight })),
					el(C.ToggleControl, { label: __('Show a button instead of the 3D view', D), checked: btn, onChange: setBtn }),
					el('div', { className: 'atlas-ar-code' }, el('code', null, code),
						el(C.Button, { variant: 'secondary', onClick: function () { navigator.clipboard && navigator.clipboard.writeText(code).then(function () { setCopied(true); setTimeout(function () { setCopied(false); }, 2000); }); } }, copied ? __('Copied', D) : __('Copy', D)))),
				el(UI.Section, { title: __('Site check', D) },
					checks === null ? el(C.Spinner, null) : el('ul', { className: 'atlas-ar-checks' }, checks.map(function (c, i) {
						return el('li', { key: i, className: c.ok ? 'is-ok' : 'is-warn' }, el('span', { 'aria-hidden': 'true' }, c.ok ? '✓' : '!'), ' ', c.text);
					})))),
			el(UI.Section, { title: __('Guides', D) },
				el('ul', { className: 'atlas-ar-guides' },
					el('li', null, el('a', { href: UI.link(UI.LINKS.docs, 'help', 'help_docs'), target: '_blank', rel: 'noopener noreferrer' }, __('Getting started — from install to your first 3D product', D))),
					el('li', null, el('a', { href: UI.link(UI.LINKS.docs, 'help', 'help_docs'), target: '_blank', rel: 'noopener noreferrer' }, __('Good 3D models — size, files for iPhone and Android', D))),
					el('li', null, el('a', { href: UI.link(UI.LINKS.docs, 'help', 'help_docs'), target: '_blank', rel: 'noopener noreferrer' }, __('Try-on setup — glasses and caps that fit', D))),
					el('li', null, el('a', { href: UI.link(UI.LINKS.support, 'help', 'help_support'), target: '_blank', rel: 'noopener noreferrer' }, __('Contact support — we answer within one working day', D))))));
	}

	/* ------------------------------------------------------------- wizard */

	/** AR-158: the wizard's last screen: our other free plugins, and the Plugins page. */
	function Suggested() {
		var list = boot.suggested || [];
		if (!list.length) return null;
		return el('div', { className: 'atlas-ar-suggested' },
			el('h3', null, __('More free plugins from AtlasAiDev, the makers of AtlasAR', D)),
			el('ul', { className: 'atlas-ar-suggested-list' }, list.map(function (p) {
				return el('li', { key: p.slug, className: 'atlas-ar-suggested-card' },
					el('strong', null, p.name),
					el('p', null, p.description),
					el('div', { className: 'atlas-ar-row' },
						p.status === 'active' ? el('span', { className: 'atlas-ar-badge' }, __('Active', D))
							: p.action ? el(C.Button, {
								variant: 'secondary', href: p.action,
								className: p.status === 'none' ? 'thickbox open-plugin-details-modal' : '',
								'aria-label': sprintf(p.status === 'none' ? __('Install %s', D) : __('Activate %s', D), p.name)
							}, p.status === 'none' ? __('Install free', D) : __('Activate', D)) : null,
						p.url ? el(C.Button, { variant: 'link', href: p.url, target: '_blank', rel: 'noopener noreferrer' }, __('Learn more', D)) : null));
			})),
			boot.pluginsUrl ? el('p', null, el('a', { href: boot.pluginsUrl }, __('See all our plugins', D))) : null);
	}

	function Wizard(ctx) {
		var steps = UI.filters('atlasAr.wizard.steps', [
			{ id: 'place', label: __('Placement', D) },
			{ id: 'look', label: __('Look', D) },
			{ id: 'tryon', label: __('Try-on', D) },
			{ id: 'cloud', label: __('AtlasAR Cloud', D), hide: !ctx.cloud.available },
			{ id: 'done', label: __('Done', D) }
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
			el('h2', null, __('Where should shoppers see the 3D view?', D)),
			el('p', null, __('On your WooCommerce product pages. Posts and pages use the block or shortcode.', D)),
			el(UI.Choice, { label: __('Placement', D), value: s.placement.mode, options: PLACEMENTS.slice(0, 4), onChange: function (v) { ctx.set('placement', 'mode', v); } }));
		else if (step.id === 'look') body = el(Fragment, null,
			el('h2', null, __('Make it look like your shop', D)),
			el('p', null, __('Pick a background and the colour of the “View in your room” button.', D)),
			el('div', { className: 'atlas-ar-split' }, el('div', null, el(LookFields, { settings: s, set: ctx.set, short: true })), el(Preview, { settings: s, height: '260px' })));
		else if (step.id === 'tryon') body = el(Fragment, null,
			el('h2', null, __('Do you sell glasses or caps?', D)),
			el('p', null, __('Shoppers can try them on with their camera. It runs on their own device; no picture is sent anywhere.', D)),
			el(UI.Choice, {
				label: __('Try-on', D), value: s.tryon.enabled ? 'on' : 'off', onChange: function (v) { ctx.set('tryon', 'enabled', v === 'on'); },
				options: [
					{ value: 'on', title: __('Yes, turn on try-on', D), text: __('A “Try it on” button appears on products you mark as glasses or caps.', D) },
					{ value: 'off', title: __('Not now', D), text: __('You can turn it on later under Try-on.', D) }
				]
			}),
			s.tryon.enabled ? el(C.TextControl, { label: __('Button text', D), value: s.tryon.label, onChange: function (v) { ctx.set('tryon', 'label', v); } }) : null);
		else if (step.id === 'cloud') body = el(Fragment, null,
			el('h2', null, __('Connect AtlasAR Cloud', D), ' ', el('span', { className: 'atlas-ar-badge' }, __('Free plan — no card needed', D))),
			el('p', null, __('Your 3D models get faster and easier. Optional: you can skip this and connect later.', D)),
			el(CloudCard, ctx));
		else body = el(Fragment, null,
			el('h2', null, __('You are ready', D)),
			el('p', null, __('Now add a 3D model: upload your GLB files to the 3D Library, then pick it on a product.', D)),
			// AR-158: tracking is opt-in (wp.org Guideline 7): never ticked for the site owner.
			el('div', { className: 'atlas-ar-wizard-optin' },
				el(C.CheckboxControl, {
					label: __('Help improve AtlasAR: share usage data with AtlasAiDev', D),
					help: __('Off unless you tick it. Sent once a week: this site’s address and name, the admin’s name and email, the IP address, WordPress, PHP and server versions, active plugins and the theme. Never your products, files or visitors. You can change this any time under Settings.', D),
					checked: !!s.general.telemetry,
					// saved at once: the plugin buttons below leave this page
					onChange: function (v) { ctx.set('general', 'telemetry', v); ctx.save(Object.assign({}, s, { general: Object.assign({}, s.general, { telemetry: v }) })).catch(function () {}); },
					__nextHasNoMarginBottom: true
				})),
			el('div', { className: 'atlas-ar-row' },
				el(C.Button, { variant: 'primary', onClick: function () { finish(false); } }, __('Open the 3D Library', D)),
				el(C.Button, { variant: 'secondary', onClick: function () { finish(true); } }, __('Go to the dashboard', D))),
			el(Suggested, null));

		return el('div', { className: 'atlas-ar-wizard' },
			el('div', { className: 'atlas-ar-wizard-head' },
				el('h1', null, __('Set up AtlasAR', D)),
				el('p', null, __('About 2 minutes — you can change everything later', D)),
				el(C.Button, { variant: 'link', onClick: function () { finish(true); } }, __('Skip setup', D))),
			el('ol', { className: 'atlas-ar-steps' }, steps.map(function (st, n) {
				return el('li', { key: st.id, className: n === i ? 'is-current' : n < i ? 'is-done' : '', 'aria-current': n === i ? 'step' : undefined }, st.label);
			})),
			el(UI.Section, null, body),
			step.id !== 'done' ? el('div', { className: 'atlas-ar-wizard-nav' },
				i > 0 ? el(C.Button, { variant: 'secondary', onClick: function () { setI(i - 1); } }, __('Back', D)) : el('span'),
				el('span', { className: 'atlas-ar-muted' }, sprintf(__('Step %1$d of %2$d', D), i + 1, steps.length)),
				el(C.Button, { variant: 'primary', onClick: next }, step.id === 'cloud' && !ctx.cloud.connected ? __('Skip for now', D) : __('Continue', D))) : null);
	}

	/* -------------------------------------------------------------- app */

	function App() {
		var st = UI.useSettings(boot.settings);
		var settings = st[0], set = st[1], save = st[2], status = st[3], replace = st[4];
		var _cloud = useState(boot.cloud || {}), cloud = _cloud[0], setCloud = _cloud[1];
		var params = new URLSearchParams(window.location.search);
		var _page = useState((window.location.hash || '').replace('#', '') || 'products'), page = _page[0], setPage = _page[1];
		var wizardUrl = boot.dashboardUrl + '&setup=1';
		var ctx = {
			settings: settings, set: set, save: save, replace: replace, cloud: cloud, setCloud: setCloud,
			go: function (id) { setPage(id); window.location.hash = id; window.scrollTo(0, 0); },
			dashboardUrl: boot.dashboardUrl, wizardUrl: wizardUrl,
			saveBar: el(UI.SaveBar, {
				busy: status.busy, saved: status.saved, error: status.error, onSave: function () {
					// AR-148: saving Placement / Appearance ticks its Get started step at once.
					var flag = page === 'placement' ? 'placed' : page === 'appearance' ? 'styled' : '';
					var patch = flag && !settings.general[flag] ? Object.assign({}, settings, { general: Object.assign({}, settings.general, (function () { var g = {}; g[flag] = true; return g; })()) }) : undefined;
					save(patch).catch(function () {});
				}
			})
		};
		if (params.get('setup')) return el(Wizard, ctx);

		var pages = UI.filters('atlasAr.dashboard.pages', [
			{ id: 'products', label: __('Products', D), render: ProductsPage },
			{ id: 'appearance', label: __('Appearance', D), render: AppearancePage },
			{ id: 'placement', label: __('Placement', D), render: PlacementPage },
			{ id: 'tryon', label: __('Try-on', D), render: TryonPage },
			{ id: 'integrations', label: __('Integrations', D), render: IntegrationsPage },
			{ id: 'analytics', label: __('Analytics', D), render: AnalyticsPage },
			{ id: 'settings', label: __('Settings', D), render: SettingsPage },
			{ id: 'help', label: __('Help', D), render: HelpPage }
		], ctx);
		var current = pages.filter(function (p) { return p.id === page; })[0] || pages[0];
		useEffect(function () {
			function onHash() { var h = (window.location.hash || '').replace('#', ''); if (h) setPage(h); }
			window.addEventListener('hashchange', onHash);
			return function () { window.removeEventListener('hashchange', onHash); };
		}, []);
		useEffect(function () {
			function warn(e) { if (status.dirty) { e.preventDefault(); e.returnValue = ''; } }
			window.addEventListener('beforeunload', warn);
			return function () { window.removeEventListener('beforeunload', warn); };
		}, [status.dirty]);

		return el('div', { className: 'atlas-ar-app' },
			el('nav', { className: 'atlas-ar-nav', 'aria-label': __('AtlasAR', D) },
				el('div', { className: 'atlas-ar-brand' }, (boot.brand && boot.brand.name) || 'AtlasAR', (boot.brand && boot.brand.version) || boot.version ? el('span', null, (boot.brand && boot.brand.version) || boot.version) : null),
				pages.map(function (p) {
					return el('button', { key: p.id, type: 'button', className: 'atlas-ar-nav-item' + (p.id === current.id ? ' is-current' : ''), 'aria-current': p.id === current.id ? 'page' : undefined, onClick: function () { ctx.go(p.id); } }, p.label);
				}),
				el('a', { className: 'atlas-ar-nav-item', href: boot.libraryUrl }, __('3D Library', D))),
			el('main', { className: 'atlas-ar-main' }, el(current.render, ctx)));
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
