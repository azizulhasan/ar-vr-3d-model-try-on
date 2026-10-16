/**
 * AR-120: the AtlasAR panel on product / post edit screens: the 3D model (from the 3D Library),
 * how it is shown, and try-on. Saved with "Save 3D settings" (REST) and also when the product is
 * updated (a hidden field the PHP save_post handler reads).
 *
 * Tabs: wp.hooks filter atlasAr.product.tabs (AtlasAR Pro adds hotspots, sizes, variations…).
 */
(function (UI, wp, boot) {
	'use strict';
	if (!UI || !boot) return;
	var el = UI.el, Fragment = UI.Fragment, useState = UI.useState, useEffect = UI.useEffect, useRef = UI.useRef, C = UI.C, __ = UI.__, D = UI.D;
	var sprintf = wp.i18n.sprintf;

	var PLACEMENT = [
		{ value: 'site', label: __('Like the site setting', D) },
		{ value: 'gallery', label: __('In the gallery, image first', D) },
		{ value: 'gallery3d', label: __('In the gallery, 3D first', D) },
		{ value: 'button', label: __('A button with a popup', D) },
		{ value: 'tab', label: __('Only in a product tab', D) },
		{ value: 'slide', label: __('As a gallery slide', D) }
	];

	function viewerOptions(item, look) {
		var m = item.model, d = item.data;
		if (!m || !m.files.glb) return {};
		var o = UI.lookOptions(look);
		if (!d.use_site) o.background = d.background;
		o.src = m.files.glb.url;
		if (m.files.usdz) o.iosSrc = m.files.usdz.url;
		if (m.files.poster) o.poster = m.files.poster.url;
		o.arPlacement = d.ar_placement;
		o.arScale = d.ar_scale;
		o.alt = item.title;
		return o;
	}

	function ModelTab(ctx) {
		var item = ctx.item, m = item.model;
		var _busy = useState(''), busy = _busy[0], setBusy = _busy[1];
		var _err = useState(''), err = _err[0], setErr = _err[1];
		var _drag = useState(false), drag = _drag[0], setDrag = _drag[1];
		var fileRef = useRef(null);

		function link(id) {
			setBusy('link'); setErr('');
			return UI.api('/products/' + item.id + '/model', { method: 'POST', data: { model_id: id } }).then(function (res) {
				setBusy(''); ctx.setItem(Object.assign({}, item, { model: res.model, data: res.product }));
			}, function (e) { setBusy(''); setErr(UI.message(e)); });
		}
		function pick() {
			window.AtlasARLibrary.pick({ title: sprintf(__('Choose a 3D model for “%s”', D), item.title), selected: m ? m.id : 0, onSelect: function (model) { link(model.id); } });
		}
		/** Upload files into the 3D Library (same name = one model) and show the first new model here. */
		function upload(files) {
			setBusy('upload'); setErr('');
			var modelId = 0;
			files.reduce(function (chain, file) {
				return chain.then(function () {
					var f = new FormData();
					if (modelId) {
						f.append('file', file, file.name);
						return wp.apiFetch({ path: '/ar_try_on/v1/library/' + modelId + '/files', method: 'POST', body: f });
					}
					f.append('files[]', file, file.name);
					return wp.apiFetch({ path: '/ar_try_on/v1/library', method: 'POST', body: f }).then(function (res) {
						var r = res.results[0];
						if (!r || r.error) throw new Error((r && r.error) || '');
						modelId = r.model_id;
					});
				});
			}, Promise.resolve()).then(function () {
				return modelId ? link(modelId) : null;
			}).then(function () { setBusy(''); }, function (e) { setBusy(''); setErr(UI.message(e)); });
		}

		return el(Fragment, null,
			m ? el('div', { className: 'atlas-ar-model-line' },
				el('strong', null, m.name),
				el('span', { className: 'atlas-ar-muted' }, ' · ' + UI.size(m.files.glb ? m.files.glb.size : 0) + (m.files.usdz ? ' · USDZ' : '') + (m.files.poster ? ' · ' + __('poster', D) : '')),
				m.large ? el('span', { className: 'atlas-ar-badge atlas-ar-badge--warn' }, __('Large file: optimise it in the 3D Library', D)) : null) : null,
			el('div', { className: 'atlas-ar-row' },
				el(C.Button, { variant: m ? 'secondary' : 'primary', isBusy: busy === 'link', disabled: !!busy, onClick: pick }, m ? __('Change model', D) : __('Choose from the 3D Library', D)),
				m ? el(C.Button, { variant: 'tertiary', isDestructive: true, disabled: !!busy, onClick: function () { link(0); } }, __('Remove from this product', D)) : null,
				m ? el('a', { className: 'button-link', href: boot.libraryUrl }, __('Open in the 3D Library', D)) : null),
			el('div', {
				className: 'atlas-ar-drop' + (drag ? ' is-over' : ''),
				onDragOver: function (e) { e.preventDefault(); setDrag(true); }, onDragLeave: function () { setDrag(false); },
				onDrop: function (e) { e.preventDefault(); setDrag(false); var fs = Array.prototype.slice.call(e.dataTransfer.files || []); if (fs.length) upload(fs); }
			},
				el('strong', null, __('Drop .glb, .gltf, .usdz files and a poster image here', D)),
				el('span', null, __('They go into your 3D Library and are linked to this product.', D)),
				el(C.Button, { variant: 'secondary', isBusy: busy === 'upload', disabled: !!busy, onClick: function () { fileRef.current.click(); } }, __('Choose files', D)),
				el('input', { ref: fileRef, type: 'file', multiple: true, hidden: true, accept: boot.accept, onChange: function (e) { var fs = Array.prototype.slice.call(e.target.files || []); e.target.value = ''; if (fs.length) upload(fs); } })),
			err ? el(C.Notice, { status: 'error', isDismissible: false }, err) : null,
			el('p', { className: 'description' }, __('Without a .usdz file, iPhones open AR from the GLB.', D)),
			el(UI.ProNote, null, __('Make a 3D model from one product photo (AtlasAR Cloud, Meshy AI or Tripo3D) with AtlasAR Pro.', D)));
	}

	function DisplayTab(ctx) {
		var d = ctx.item.data, set = ctx.setData;
		return el(Fragment, null,
			el(C.ToggleControl, { label: __('Use the site settings (Appearance)', D), checked: !!d.use_site, onChange: function (v) { set('use_site', v); } }),
			!d.use_site ? el(Fragment, null,
				el('span', { className: 'atlas-ar-label' }, __('Background', D)),
				el('input', { type: 'color', value: d.background, 'aria-label': __('Background', D), onChange: function (e) { set('background', e.target.value); } })) : null,
			el(C.SelectControl, { label: __('Show it', D), value: d.placement, options: PLACEMENT, onChange: function (v) { set('placement', v); }, __nextHasNoMarginBottom: true }),
			el(C.RadioControl, {
				label: __('In AR the product goes', D), selected: d.ar_placement, onChange: function (v) { set('ar_placement', v); },
				options: [{ value: 'floor', label: __('On the floor or a table', D) }, { value: 'wall', label: __('On a wall', D) }]
			}),
			el(C.ToggleControl, { label: __('Shoppers can change the size in AR', D), checked: d.ar_scale === 'auto', onChange: function (v) { set('ar_scale', v ? 'auto' : 'fixed'); } }));
	}

	function TryonTab(ctx) {
		var d = ctx.item.data, set = ctx.setData;
		var m = ctx.item.model;
		var _err = useState(''), err = _err[0], setErr = _err[1];
		function test() {
			var sdk = window.AtlasARViewer;
			if (!sdk || !sdk.tryon || !m || !m.files.glb) return;
			setErr('');
			sdk.tryon.open(Object.assign({ src: m.files.glb.url, tryon: d.tryon }, boot.tryon || {}), {}).catch(function (e) { setErr(UI.message(e)); });
		}
		return el(Fragment, null,
			el(UI.Choice, {
				label: __('Can shoppers try this on?', D), value: d.tryon, compact: true, onChange: function (v) { set('tryon', v); },
				options: [
					{ value: '', title: __('No', D), text: __('A normal 3D view.', D) },
					{ value: 'glasses', title: __('Glasses', D), text: __('Sunglasses and frames on the nose.', D) },
					{ value: 'hat', title: __('Cap or hat', D), text: __('On the head, above the forehead.', D) }
				]
			}),
			d.tryon ? el(Fragment, null,
				el(C.ToggleControl, { label: __('Also show the 3D view and AR button for this product', D), checked: !!d.tryon_viewer, onChange: function (v) { set('tryon_viewer', v); } }),
				!boot.tryonEnabled ? el(C.Notice, { status: 'warning', isDismissible: false }, __('Try-on is turned off in AtlasAR › Try-on, so the button does not show.', D)) : null,
				el('p', { className: 'description' }, __('The product sits on the face automatically.', D)),
				m && m.files.glb ? el(C.Button, { variant: 'secondary', onClick: test }, __('Test try-on with my camera', D)) : null,
				err ? el(C.Notice, { status: 'error', isDismissible: false }, err) : null,
				el(UI.ProNote, null, __('AtlasAR Pro lets you fine-tune the fit and shows the product in real 3D.', D))) : null);
	}

	function Panel() {
		var _item = useState(boot.item), item = _item[0], setItem = _item[1];
		var _tab = useState('model'), tab = _tab[0], setTab = _tab[1];
		var _st = useState({ busy: false, saved: false, error: '', dirty: false }), st = _st[0], setSt = _st[1];
		var hidden = useRef(document.getElementById('atlas-ar-panel-data'));
		var viewerRef = useRef(null);

		useEffect(function () {
			if (hidden.current) hidden.current.value = JSON.stringify(item.data);
		}, [item.data]);

		function setData(key, value) {
			var data = Object.assign({}, item.data); data[key] = value;
			setItem(Object.assign({}, item, { data: data }));
			setSt({ busy: false, saved: false, error: '', dirty: true });
		}
		function save() {
			setSt({ busy: true, saved: false, error: '', dirty: true });
			var data = Object.assign({}, item.data); delete data.model_id;
			UI.api('/items/' + item.id, { method: 'POST', data: { data: data } }).then(function (res) {
				setItem(res); setSt({ busy: false, saved: true, error: '', dirty: false });
			}, function (e) { setSt({ busy: false, saved: false, error: UI.message(e), dirty: true }); });
		}
		var ctx = { item: item, setItem: setItem, setData: setData, boot: boot };
		var tabs = UI.filters('atlasAr.product.tabs', [
			{ id: 'model', label: __('3D model', D), render: ModelTab },
			{ id: 'display', label: __('Display', D), render: DisplayTab },
			{ id: 'tryon', label: __('Try-on', D), render: TryonTab }
		], ctx);
		var current = tabs.filter(function (t) { return t.id === tab; })[0] || tabs[0];
		var options = viewerOptions(item, boot.look);

		return el('div', { className: 'atlas-ar-panel' },
			el('div', { className: 'atlas-ar-panel-view' },
				el(UI.Viewer, { options: Object.assign({ qr: !!boot.qr }, options), height: '340px', reloadKey: JSON.stringify(options), innerRef: viewerRef, empty: __('No 3D model yet. Add one on the right.', D) }),
				options.src ? el('div', { className: 'atlas-ar-row' },
					el(C.Button, { variant: 'secondary', onClick: function () { var h = viewerRef.current; if (h && h.requestFullscreen) h.requestFullscreen().catch(function () {}); } }, __('Full screen', D))) : null),
			el('div', { className: 'atlas-ar-panel-side' },
				el('div', { className: 'atlas-ar-tabs', role: 'tablist' }, tabs.map(function (t) {
					return el('button', { key: t.id, type: 'button', role: 'tab', 'aria-selected': t.id === current.id ? 'true' : 'false', className: 'atlas-ar-tab' + (t.id === current.id ? ' is-current' : ''), onClick: function () { setTab(t.id); } }, t.label);
				})),
				el('div', { className: 'atlas-ar-tab-body', role: 'tabpanel' }, el(current.render, ctx)),
				el(UI.SaveBar, { label: __('Save 3D settings', D), busy: st.busy, saved: st.saved, error: st.error, onSave: save }),
				el('p', { className: 'description' }, __('Also saved when you update the product.', D))));
	}

	function start() {
		var node = document.getElementById('atlas-ar-panel-root');
		if (!node) return;
		if (wp.element.createRoot) wp.element.createRoot(node).render(el(Panel));
		else wp.element.render(el(Panel), node);
	}
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
	else start();
})(window.AtlasARAdminUI, window.wp, window.atlasArProduct);
