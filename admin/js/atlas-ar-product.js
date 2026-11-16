/**
 * AR-120: the AtlasAR panel on product / post edit screens: the 3D model (from the 3D Library),
 * how it is shown, and try-on. Saved with "Save 3D settings" (REST) and also when the product is
 * updated (a hidden field the PHP save_post handler reads).
 *
 * Tabs: wp.hooks filter atlasAr.product.tabs (AtlasAR Pro adds hotspots, sizes, variations…).
 *
 * AR-182: on the new design, inside the editor (no app frame here): status chips (3D, AR,
 * Try-on), WordPress's TabPanel for the tabs (same ids; tabs from the filter as before), an
 * empty state with one action, settings in UI.Field wrappers. Fits a wide meta box (preview
 * beside the tabs) and a narrow column (one column) by a container query on the panel.
 * Address: #atlas-ar-panel:<tab>/<setting> opens that tab and marks the setting (the dashboard's
 * search and its Products list link here). What is saved and how is unchanged.
 */
(function (UI, wp, boot) {
	'use strict';
	if (!UI || !boot) return;
	var el = UI.el, Fragment = UI.Fragment, useState = UI.useState, useEffect = UI.useEffect, useRef = UI.useRef, C = UI.C, __ = UI.__;
	var sprintf = wp.i18n.sprintf;

	var PLACEMENT = [
		{ value: 'site', label: __('Like the site setting', 'ar-vr-3d-model-try-on') },
		{ value: 'gallery', label: __('In the gallery, image first', 'ar-vr-3d-model-try-on') },
		{ value: 'gallery3d', label: __('In the gallery, 3D first', 'ar-vr-3d-model-try-on') },
		{ value: 'button', label: __('A button with a popup', 'ar-vr-3d-model-try-on') },
		{ value: 'tab', label: __('Only in a product tab', 'ar-vr-3d-model-try-on') },
		{ value: 'slide', label: __('As a gallery slide', 'ar-vr-3d-model-try-on') }
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
		if (d.ar_text) o.arButtonText = d.ar_text; // AR-156: this product only
		o.alt = item.title;
		return o;
	}

	function ModelTab(ctx) {
		var item = ctx.item, m = item.model;
		var _busy = useState(''), busy = _busy[0], setBusy = _busy[1];
		var _err = useState(''), err = _err[0], setErr = _err[1];
		var _drag = useState(false), drag = _drag[0], setDrag = _drag[1];
		var fileRef = useRef(null);

		/** extra: settings to change with it (kept in the panel, saved with the product). */
		function link(id, extra) {
			setBusy('link'); setErr('');
			return UI.api('/products/' + item.id + '/model', { method: 'POST', data: { model_id: id } }).then(function (res) {
				setBusy(''); ctx.setItem(Object.assign({}, item, { model: res.model, data: Object.assign({}, res.product, extra || {}) }));
			}, function (e) { setBusy(''); setErr(UI.message(e)); });
		}
		function pick() {
			window.AtlasARLibrary.pick({ title: sprintf(__('Choose a 3D model for “%s”', 'ar-vr-3d-model-try-on'), item.title), selected: m ? m.id : 0, onSelect: function (model) { link(model.id); } });
		}
		/**
		 * AR-167: the product's featured image as it is in the editor now (also one set a moment ago in
		 * the block editor), else the one saved; null when there is none.
		 */
		function featuredPhoto() {
			var data = wp.data;
			var editor = data && data.select('core/editor');
			var id = editor && editor.getEditedPostAttribute ? editor.getEditedPostAttribute('featured_media') : 0;
			if (id && (!boot.photo || boot.photo.id !== id)) {
				var media = data.select('core').getMedia(id);
				var sizes = media && media.media_details && media.media_details.sizes;
				if (media && /^image\/(jpeg|png|webp)$/.test(media.mime_type || '')) {
					return { id: id, url: sizes && sizes.large ? sizes.large.source_url : media.source_url, name: (media.title && media.title.rendered) || '' };
				}
			}
			if (editor && editor.getEditedPostAttribute && editor.getEditedPostAttribute('featured_media') === 0) return null; // removed just now
			return boot.photo || null;
		}
		/** AR-159: a flat product (wall art, poster, rug…) from one photo, linked to this product. */
		function fromPhoto(e) {
			var btn = e && e.currentTarget;
			window.AtlasARLibrary.flat({
				name: item.title, returnFocus: btn, photo: featuredPhoto(),
				onDone: function (info) {
					// Wall art goes on a wall in AR, rugs and tiles on the floor.
					link(info.model.id, { ar_placement: info.kind === 'rug' || info.kind === 'tile' ? 'floor' : 'wall' });
				}
			});
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

		return el(UI.Field, { id: 'product.model', className: 'atlas-ar-panel-group' },
			m ? el('div', { className: 'atlas-ar-model-line' },
				el('strong', null, m.name),
				el('span', { className: 'atlas-ar-muted' }, ' · ' + UI.size(m.files.glb ? m.files.glb.size : 0) + (m.files.usdz ? ' · USDZ' : '') + (m.files.poster ? ' · ' + __('poster', 'ar-vr-3d-model-try-on') : '')),
				m.large ? el('span', { className: 'atlas-ar-badge atlas-ar-badge--warn' }, __('Large file: optimise it in the 3D Library', 'ar-vr-3d-model-try-on')) : null) : null,
			m ? el('div', { className: 'atlas-ar-row' },
				el(C.Button, { variant: 'secondary', isBusy: busy === 'link', disabled: !!busy, onClick: pick }, __('Change model', 'ar-vr-3d-model-try-on')),
				window.AtlasARLibrary.flat ? el(C.Button, { variant: 'secondary', disabled: !!busy, onClick: fromPhoto }, __('Make a 3D model from a photo', 'ar-vr-3d-model-try-on')) : null,
				el(C.Button, { variant: 'tertiary', isDestructive: true, disabled: !!busy, onClick: function () { link(0); } }, __('Remove from this product', 'ar-vr-3d-model-try-on')),
				el('a', { className: 'button-link', href: boot.libraryUrl }, __('Open in the 3D Library', 'ar-vr-3d-model-try-on')))
				// AR-182: no model yet: one sentence and one main action; the other ways stay below it.
				: el(UI.Empty, {
					className: 'atlas-ar-panel-empty', title: __('No 3D model yet', 'ar-vr-3d-model-try-on'),
					text: __('Choose a model from your 3D Library, or add files below.', 'ar-vr-3d-model-try-on'),
					action: { primary: true, label: __('Choose from the 3D Library', 'ar-vr-3d-model-try-on'), onClick: pick, busy: busy === 'link', disabled: !!busy }
				}, window.AtlasARLibrary.flat ? el(C.Button, { variant: 'link', disabled: !!busy, onClick: fromPhoto }, __('Or make one from a photo (wall art, posters, rugs)', 'ar-vr-3d-model-try-on')) : null),
			el('div', {
				className: 'atlas-ar-drop' + (drag ? ' is-over' : ''),
				onDragOver: function (e) { e.preventDefault(); setDrag(true); }, onDragLeave: function () { setDrag(false); },
				onDrop: function (e) { e.preventDefault(); setDrag(false); var fs = Array.prototype.slice.call(e.dataTransfer.files || []); if (fs.length) upload(fs); }
			},
				el('strong', null, __('Drop .glb, .gltf, .usdz files and a poster image here', 'ar-vr-3d-model-try-on')),
				el('span', null, __('They go into your 3D Library and are linked to this product.', 'ar-vr-3d-model-try-on')),
				el(C.Button, { variant: 'secondary', isBusy: busy === 'upload', disabled: !!busy, onClick: function () { fileRef.current.click(); } }, __('Choose files', 'ar-vr-3d-model-try-on')),
				el('input', { ref: fileRef, type: 'file', multiple: true, hidden: true, accept: boot.accept, onChange: function (e) { var fs = Array.prototype.slice.call(e.target.files || []); e.target.value = ''; if (fs.length) upload(fs); } })),
			err ? el(C.Notice, { status: 'error', isDismissible: false }, err) : null,
			el('p', { className: 'description' }, __('Without a .usdz file, iPhones open AR from the GLB. “Make a 3D model from a photo” is for flat products: wall art, posters, canvas, rugs and tiles.', 'ar-vr-3d-model-try-on')),
			el(UI.ProNote, { where: 'product_panel', spot: 'make_3d' }, __('Make a 3D model from one product photo (AtlasAR Cloud, Meshy AI or Tripo3D) with AtlasAR Pro.', 'ar-vr-3d-model-try-on')));
	}

	function DisplayTab(ctx) {
		var d = ctx.item.data, set = ctx.setData;
		var F = function (id, child) { return el(UI.Field, { id: 'product.' + id }, child); };
		return el(Fragment, null,
			el('h3', { className: 'atlas-ar-panel-heading' }, __('Look', 'ar-vr-3d-model-try-on')),
			F('use_site', el(C.ToggleControl, { label: __('Use the site settings (Appearance)', 'ar-vr-3d-model-try-on'), checked: !!d.use_site, onChange: function (v) { set('use_site', v); } })),
			!d.use_site ? F('background', el(Fragment, null,
				el('span', { className: 'atlas-ar-label', 'aria-hidden': 'true' }, __('Background', 'ar-vr-3d-model-try-on')),
				el(UI.Swatches, { label: __('Background', 'ar-vr-3d-model-try-on'), colors: ['#ffffff', '#f6f7f7', '#1d2327'], value: d.background, onChange: function (v) { set('background', v); } }))) : null,
			el('h3', { className: 'atlas-ar-panel-heading' }, __('Where it shows', 'ar-vr-3d-model-try-on')),
			F('placement', el(C.SelectControl, { label: __('Show it', 'ar-vr-3d-model-try-on'), value: d.placement, options: PLACEMENT, onChange: function (v) { set('placement', v); }, __nextHasNoMarginBottom: true })),
			el('h3', { className: 'atlas-ar-panel-heading' }, __('In AR', 'ar-vr-3d-model-try-on')),
			F('ar_placement', el(C.RadioControl, {
				label: __('In AR the product goes', 'ar-vr-3d-model-try-on'), selected: d.ar_placement, onChange: function (v) { set('ar_placement', v); },
				options: [{ value: 'floor', label: __('On the floor or a table', 'ar-vr-3d-model-try-on') }, { value: 'wall', label: __('On a wall', 'ar-vr-3d-model-try-on') }]
			})),
			F('ar_scale', el(C.ToggleControl, { label: __('Shoppers can change the size in AR', 'ar-vr-3d-model-try-on'), checked: d.ar_scale === 'auto', onChange: function (v) { set('ar_scale', v ? 'auto' : 'fixed'); } })),
			// AR-156: for this product only; empty = the site's Appearance setting.
			el('h3', { className: 'atlas-ar-panel-heading' }, __('Only for this product', 'ar-vr-3d-model-try-on')),
			F('height', el(C.TextControl, { label: __('Height of the 3D view (px)', 'ar-vr-3d-model-try-on'), type: 'number', min: 0, max: 1200, value: d.height || '', placeholder: __('site setting', 'ar-vr-3d-model-try-on'), onChange: function (v) { set('height', parseInt(v, 10) || 0); }, help: __('Empty = the height set in Appearance.', 'ar-vr-3d-model-try-on') })),
			F('ar_text', el(C.TextControl, { label: __('AR button text', 'ar-vr-3d-model-try-on'), value: d.ar_text, maxLength: 60, placeholder: __('site setting', 'ar-vr-3d-model-try-on'), onChange: function (v) { set('ar_text', v); } })),
			F('load', el(C.SelectControl, {
				label: __('When the 3D view loads', 'ar-vr-3d-model-try-on'), value: d.load, onChange: function (v) { set('load', v); }, __nextHasNoMarginBottom: true,
				options: [{ value: '', label: __('As set in Appearance', 'ar-vr-3d-model-try-on') }, { value: 'scroll', label: __('When it scrolls into sight', 'ar-vr-3d-model-try-on') }, { value: 'click', label: __('Only after a click on “View in 3D”', 'ar-vr-3d-model-try-on') }]
			})));
	}

	function TryonTab(ctx) {
		var d = ctx.item.data, set = ctx.setData;
		var m = ctx.item.model;
		var _err = useState(''), err = _err[0], setErr = _err[1];
		// Try-on from a photo when the product has no 3D model (its plain background is removed).
		var _photo = useState(ctx.item.tryon_image_url || ''), photoUrl = _photo[0], setPhotoUrl = _photo[1];
		var hasModel = !!(m && m.files && m.files.glb);
		function test() {
			var sdk = window.AtlasARViewer;
			if (!sdk || !sdk.tryon || (!hasModel && !photoUrl)) return;
			setErr('');
			var src = hasModel ? { src: m.files.glb.url } : { tryonImage: photoUrl };
			sdk.tryon.open(Object.assign(src, { tryon: d.tryon }, boot.tryon || {}), {}).catch(function (e) { setErr(UI.message(e)); });
		}
		function choosePhoto() {
			if (!wp.media) return;
			var frame = wp.media({ title: __('Choose the try-on picture', 'ar-vr-3d-model-try-on'), library: { type: ['image/png', 'image/jpeg', 'image/webp'] }, multiple: false });
			frame.on('select', function () {
				var a = frame.state().get('selection').first().toJSON();
				set('tryon_image', a.id);
				setPhotoUrl(a.sizes && a.sizes.large ? a.sizes.large.url : a.url);
			});
			frame.open();
		}
		function useFeatured() {
			set('tryon_image', ctx.item.thumb_id);
			setPhotoUrl(ctx.item.thumb);
		}
		var photoBox = !hasModel ? el(UI.Field, { id: 'product.tryon_image', className: 'atlas-ar-tryon-photo' },
			el('h3', null, __('No 3D model? Use a photo', 'ar-vr-3d-model-try-on')),
			el('p', { className: 'description' }, __('A straight-on photo of the glasses or cap is enough: its plain background is removed and it sits on the face. Best on a white background, or a PNG with a transparent background (clear lenses look best that way). With a 3D model, the model is used instead.', 'ar-vr-3d-model-try-on')),
			photoUrl ? el('img', { src: photoUrl, alt: '', className: 'atlas-ar-tryon-photo-preview' }) : null,
			el('div', { className: 'atlas-ar-row' },
				wp.media ? el(C.Button, { variant: 'secondary', onClick: choosePhoto }, photoUrl ? __('Choose another picture', 'ar-vr-3d-model-try-on') : __('Choose a picture', 'ar-vr-3d-model-try-on')) : null,
				ctx.item.thumb_id && Number(d.tryon_image) !== Number(ctx.item.thumb_id) ? el(C.Button, { variant: 'tertiary', onClick: useFeatured }, __('Use the featured image', 'ar-vr-3d-model-try-on')) : null,
				photoUrl ? el(C.Button, { variant: 'tertiary', isDestructive: true, onClick: function () { set('tryon_image', 0); setPhotoUrl(''); } }, __('Remove', 'ar-vr-3d-model-try-on')) : null)) : null;
		return el(Fragment, null,
			el(UI.Field, { id: 'product.tryon' }, el('span', { className: 'atlas-ar-label', 'aria-hidden': 'true' }, __('Can shoppers try this on?', 'ar-vr-3d-model-try-on')), el(UI.Choice, {
				label: __('Can shoppers try this on?', 'ar-vr-3d-model-try-on'), value: d.tryon, compact: true, onChange: function (v) { set('tryon', v); },
				options: [
					{ value: '', title: __('No', 'ar-vr-3d-model-try-on'), text: __('A normal 3D view.', 'ar-vr-3d-model-try-on') },
					{ value: 'glasses', title: __('Glasses', 'ar-vr-3d-model-try-on'), text: __('Sunglasses and frames on the nose.', 'ar-vr-3d-model-try-on') },
					{ value: 'hat', title: __('Cap or hat', 'ar-vr-3d-model-try-on'), text: __('On the head, above the forehead.', 'ar-vr-3d-model-try-on') }
				]
			})),
			d.tryon ? el(Fragment, null,
				el(UI.Field, { id: 'product.tryon_viewer' }, el(C.ToggleControl, { label: __('Also show the 3D view and AR button for this product', 'ar-vr-3d-model-try-on'), checked: !!d.tryon_viewer, onChange: function (v) { set('tryon_viewer', v); } })),
				!boot.tryonEnabled ? el(C.Notice, { status: 'warning', isDismissible: false }, __('Try-on is turned off in AtlasAR › Try-on, so the button does not show.', 'ar-vr-3d-model-try-on')) : null,
				el('p', { className: 'description' }, __('The product sits on the face automatically.', 'ar-vr-3d-model-try-on')),
				photoBox,
				hasModel || photoUrl ? el(C.Button, { variant: 'secondary', onClick: test }, __('Test try-on with my camera', 'ar-vr-3d-model-try-on')) : null,
				err ? el(C.Notice, { status: 'error', isDismissible: false }, err) : null,
				el(UI.ProNote, { where: 'product_panel', spot: 'tryon_fit' }, __('AtlasAR Pro lets you fine-tune the fit and shows the product in real 3D.', 'ar-vr-3d-model-try-on'))) : null);
	}

	/** '#atlas-ar-panel:display/product.ar_placement' → { tab: 'display', field: 'product.ar_placement' } (anything odd is dropped). */
	function panelAddress(hash) {
		var m = /^#atlas-ar-panel(?::([a-z0-9_-]+))?(?:\/([a-z0-9_.-]+))?$/i.exec(String(hash || ''));
		return m ? { open: true, tab: m[1] || '', field: m[2] || '' } : { open: false, tab: '', field: '' };
	}

	/** AR-182: what a shopper gets on this product, in words (never colour alone). */
	function Status(props) {
		var item = props.item, m = item.model, d = item.data;
		var has3d = !!(m && m.files && m.files.glb);
		var arOff = boot.look && boot.look.ar === false;
		var chips = [
			has3d ? [__('3D: ready', 'ar-vr-3d-model-try-on'), 'ok'] : [__('3D: no model yet', 'ar-vr-3d-model-try-on'), ''],
			!has3d ? [__('AR: needs a model', 'ar-vr-3d-model-try-on'), '']
				: arOff ? [__('AR: off (Appearance)', 'ar-vr-3d-model-try-on'), '']
					: m.files.usdz ? [__('AR: iPhone and Android', 'ar-vr-3d-model-try-on'), 'ok'] : [__('AR: Android; iPhone from the GLB', 'ar-vr-3d-model-try-on'), 'ok'],
			d.tryon === 'glasses' ? [__('Try-on: glasses', 'ar-vr-3d-model-try-on'), boot.tryonEnabled ? 'ok' : 'note']
				: d.tryon === 'hat' ? [__('Try-on: cap', 'ar-vr-3d-model-try-on'), boot.tryonEnabled ? 'ok' : 'note'] : [__('Try-on: off', 'ar-vr-3d-model-try-on'), '']
		];
		return el('ul', { className: 'atlas-ar-panel-status', 'aria-label': __('AtlasAR status of this product', 'ar-vr-3d-model-try-on') },
			chips.map(function (c, i) { return el('li', { key: i }, el(UI.Chip, { tone: c[1] }, c[0])); }));
	}

	/** AR-182 review: below this panel width the tabs become a select (about three tabs fit a 280 px column). */
	var NARROW = 360;

	function Panel() {
		var _item = useState(boot.item), item = _item[0], setItem = _item[1];
		var address = useRef(panelAddress(window.location.hash));
		var _tab = useState(address.current.tab || 'model'), tab = _tab[0], setTab = _tab[1];
		var _st = useState({ busy: false, saved: false, error: '', dirty: false }), st = _st[0], setSt = _st[1];
		var hidden = useRef(document.getElementById('atlas-ar-panel-data'));
		var viewerRef = useRef(null), rootRef = useRef(null);

		useEffect(function () {
			if (hidden.current) hidden.current.value = JSON.stringify(item.data);
		}, [item.data]);

		// AR-182: #atlas-ar-panel:<tab>/<setting> (the dashboard's search and Products link here):
		// bring the panel into view and mark the setting, as the dashboard's search does.
		useEffect(function () {
			var a = address.current;
			if (!a.open || !rootRef.current) return;
			var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			var t = setTimeout(function () {
				var box = document.getElementById('atlas-ar-panel') || rootRef.current;
				if (box.classList && box.classList.contains('closed')) box.classList.remove('closed'); // a folded meta box opens
				box.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' });
				if (a.field && UI.search && UI.search.focusField) UI.search.focusField({ field: a.field, label: '' });
			}, 300);
			return function () { clearTimeout(t); };
		}, []);

		// AR-182 review: the panel's own width decides the tab form (a narrow side column gets a
		// select; the window width says nothing about the meta box).
		var _narrow = useState(false), narrow = _narrow[0], setNarrow = _narrow[1];
		(wp.element.useLayoutEffect || useEffect)(function () {
			var node = rootRef.current;
			if (!node) return;
			// Measured now, before the first paint (a ResizeObserver reports only at a rendering
			// step, which a background tab may hold back); the observer follows later changes.
			setNarrow(node.getBoundingClientRect().width < NARROW);
			if (!window.ResizeObserver) return;
			var ro = new ResizeObserver(function (entries) { setNarrow(entries[0].contentRect.width < NARROW); });
			ro.observe(node);
			return function () { ro.disconnect(); };
		}, []);

		// AR-182: an add-on whose script runs after the panel started (deferred or loaded later)
		// still gets its tabs and preview options in: draw again when one of our hooks is added.
		var _late = useState(0), setLate = _late[1];
		useEffect(function () {
			if (!wp.hooks || !wp.hooks.addAction) return;
			var ns = 'atlas-ar/product-panel';
			wp.hooks.addAction('hookAdded', ns, function (name) {
				if (/^atlasAr\.product\./.test(name)) setLate(function (n) { return n + 1; });
			});
			return function () { wp.hooks.removeAction('hookAdded', ns); };
		}, []);

		function setData(key, value) {
			var data = Object.assign({}, item.data); data[key] = value;
			setItem(Object.assign({}, item, { data: data }));
			setSt({ busy: false, saved: false, error: '', dirty: true });
		}
		function save() {
			setSt({ busy: true, saved: false, error: '', dirty: true });
			var data = Object.assign({}, item.data); delete data.model_id;
			UI.api('/items/' + item.id, { method: 'POST', data: { data: data } }).then(function (res) {
				setItem(res);
				// Lets AtlasAR Pro save its own part with the same click (it can return a Promise).
				var extra = wp.hooks ? wp.hooks.applyFilters('atlasAr.product.save', [], res) : [];
				return Promise.all(extra).then(function () { setSt({ busy: false, saved: true, error: '', dirty: false }); });
			}).catch(function (e) { setSt({ busy: false, saved: false, error: UI.message(e), dirty: true }); });
		}
		var _rev = useState(0), rev = _rev[0], setRev = _rev[1];
		var ctx = {
			item: item, setItem: setItem, setData: setData, boot: boot,
			/** The preview's <atlasar-viewer> (e.g. to place hotspots). */
			viewer: function () { return viewerRef.current; },
			/** Ask the preview to redraw (after AtlasAR Pro changed what it shows); changed = false for a load. */
			refresh: function (changed) {
				setRev(function (n) { return n + 1; });
				if (changed !== false) setSt(function (cur) { return Object.assign({}, cur, { saved: false, dirty: true }); });
			}
		};
		var tabs = UI.filters('atlasAr.product.tabs', [
			{ id: 'model', label: __('3D model', 'ar-vr-3d-model-try-on'), render: ModelTab },
			{ id: 'display', label: __('Display', 'ar-vr-3d-model-try-on'), render: DisplayTab },
			{ id: 'tryon', label: __('Try-on', 'ar-vr-3d-model-try-on'), render: TryonTab }
		], ctx).filter(function (t) { return t && t.id && typeof t.render === 'function'; });
		var byId = function (id) { return tabs.filter(function (t) { return t.id === id; })[0] || tabs[0]; };
		// AtlasAR Pro adds hotspots, sizes and more models to the preview.
		var options = UI.filters('atlasAr.product.viewerOptions', viewerOptions(item, boot.look), ctx);

		// Below NARROW px all tabs cannot be seen at once: a labelled select of the same sections
		// (no hidden tabs, no sideways scrolling). Wider: WordPress's TabPanel (ARIA tabs, arrow
		// keys, one tab stop), its tabs wrapping onto more rows; a plain row of buttons next to an
		// older kit that has no Tabs part.
		var tabsPart = narrow
			? el(Fragment, null,
				el(C.SelectControl, {
					className: 'atlas-ar-panel-pick', label: __('Section', 'ar-vr-3d-model-try-on'), value: byId(tab).id, __nextHasNoMarginBottom: true,
					options: tabs.map(function (t) { return { value: t.id, label: t.label }; }), onChange: setTab
				}),
				el('div', { className: 'atlas-ar-tab-body', role: 'region', 'aria-label': byId(tab).label }, el(byId(tab).render, ctx)))
			: UI.Tabs
			? el(UI.Tabs, { className: 'atlas-ar-panel-tabs', tabs: tabs.map(function (t) { return { name: t.id, title: t.label }; }), tab: byId(tab).id, onTab: setTab }, function (name) {
				return el('div', { className: 'atlas-ar-tab-body' }, el(byId(name).render, ctx));
			})
			: el(Fragment, null,
				el('div', { className: 'atlas-ar-tabs', role: 'tablist' }, tabs.map(function (t) {
					return el('button', { key: t.id, type: 'button', role: 'tab', 'aria-selected': t.id === byId(tab).id ? 'true' : 'false', className: 'atlas-ar-tab' + (t.id === byId(tab).id ? ' is-current' : ''), onClick: function () { setTab(t.id); } }, t.label);
				})),
				el('div', { className: 'atlas-ar-tab-body', role: 'tabpanel' }, el(byId(tab).render, ctx)));

		return el('div', { className: 'atlas-ar-panel-wrap', ref: rootRef },
			el(Status, { item: item }),
			// No model: no preview column (the Model tab's "No 3D model yet" card says it once, full width).
			el('div', { className: 'atlas-ar-panel' + (options.src ? '' : ' is-single') },
				options.src ? el('div', { className: 'atlas-ar-panel-view' },
					el(UI.Viewer, { options: Object.assign({ qr: !!boot.qr }, options), height: '340px', reloadKey: JSON.stringify(options) + ':' + rev, innerRef: viewerRef, empty: __('No 3D model yet.', 'ar-vr-3d-model-try-on') }),
					el('div', { className: 'atlas-ar-row' },
						el(C.Button, { variant: 'secondary', onClick: function () { var h = viewerRef.current; if (h && h.requestFullscreen) h.requestFullscreen().catch(function () {}); } }, __('Full screen', 'ar-vr-3d-model-try-on')))) : null,
				el('div', { className: 'atlas-ar-panel-side' },
					tabsPart,
					el('div', { className: 'atlas-ar-panel-foot' },
						el(UI.SaveBar, { label: __('Save 3D settings', 'ar-vr-3d-model-try-on'), busy: st.busy, saved: st.saved, error: st.error, onSave: save }),
						el('p', { className: 'description' }, __('Also saved when you update the product.', 'ar-vr-3d-model-try-on'))))));
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
