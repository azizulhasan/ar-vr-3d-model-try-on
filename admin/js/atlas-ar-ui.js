/**
 * AR-120: shared pieces of the AtlasAR admin screens (dashboard, setup wizard, product panel),
 * on WordPress's own React (wp.element) and components. One surface for the screens and for
 * AtlasAR Pro to build on: window.AtlasARAdminUI.
 *
 * Extension points (wp.hooks filters, plain data):
 *   atlasAr.dashboard.pages      [ { id, label, render(ctx) } ]       dashboard sections
 *   atlasAr.wizard.steps         [ { id, label, render(ctx), next } ] setup wizard steps
 *   atlasAr.product.tabs         [ { id, label, render(ctx) } ]       product panel tabs
 *   atlasAr.integrations.cards   [ { id, render(ctx) } ]               Integrations page cards
 *   atlasAr.product.viewerOptions (options, ctx) → options               the panel's preview
 *   atlasAr.product.save         (promises, savedItem) → promises        save more with "Save 3D settings"
 *   atlasAr.proNotes             true → false hides the "See AtlasAR Pro" notes
 *   atlasAr.fields               [ field definitions ]                AR-181: settings drawn by UI.Fields and found by the search
 *   atlasAr.search.items         [ search entries ]                   AR-181: entries for the header search only
 *
 * Kit version 2 (AR-180): every member of version 1 keeps its meaning. Added: version, Icon, icons,
 * Chip, Count, Swatches, Field, Fields, valueOf, and three parts that their own files fill and
 * freeze: shell (atlas-ar-shell.js), search (atlas-ar-search.js) and map (atlas-ar-map.js). An
 * add-on checks `UI.version >= 2` before it uses one of them, so it still runs next to an older
 * AtlasAR.
 */
(function (wp, boot) {
	'use strict';
	if (!wp || !wp.element || !wp.components) return;

	var el = wp.element.createElement;
	var Fragment = wp.element.Fragment;
	var useState = wp.element.useState;
	var useEffect = wp.element.useEffect;
	var useRef = wp.element.useRef;
	var C = wp.components;
	var __ = wp.i18n.__;
	// Kept for add-ons that read UI.D (kit version 1). This file passes the text domain as a literal,
	// because `wp i18n make-pot` skips strings whose domain is a variable.
	var D = 'ar-vr-3d-model-try-on';
	boot = boot || {};

	var LINKS = Object.freeze({
		pro: 'https://wpaugmentedreality.com/pricing/',
		docs: 'https://wpaugmentedreality.com/docs/3d-model-viewer/',
		support: 'https://wpaugmentedreality.com/contact-us/'
	});

	/**
	 * AR-146: one of our links with its UTM tags (the same rule as AR_TRY_ON_Admin::link() in PHP):
	 * utm_source=plugin, utm_medium=<the screen>, utm_campaign=atlasar_3, utm_content=<the spot>.
	 */
	function link(url, medium, content) {
		try {
			var u = new URL(url);
			if (!/(^|\.)(wpaugmentedreality\.com|atlasaidev\.com)$/.test(u.hostname)) return url;
			u.searchParams.set('utm_source', 'plugin');
			u.searchParams.set('utm_medium', medium || 'dashboard');
			u.searchParams.set('utm_campaign', 'atlasar_3');
			if (content) u.searchParams.set('utm_content', content);
			return u.toString();
		} catch (e) { return url; }
	}

	function api(path, opts) {
		return wp.apiFetch(Object.assign({ path: '/ar_try_on/v1' + path }, opts || {}));
	}
	function message(err) {
		return (err && err.message) || __('Something went wrong. Please try again.', 'ar-vr-3d-model-try-on');
	}
	function size(bytes) {
		if (!bytes) return '0 KB';
		return bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
	}
	function filters(name, list, ctx) {
		return wp.hooks ? wp.hooks.applyFilters(name, list, ctx) : list;
	}

	/** A titled white box. */
	function Section(props) {
		return el('section', { className: 'atlas-ar-section' + (props.className ? ' ' + props.className : '') },
			props.title ? el('h2', { className: 'atlas-ar-section-title' }, props.title) : null,
			props.lead ? el('p', { className: 'atlas-ar-section-lead' }, props.lead) : null,
			props.children);
	}

	/**
	 * A screen's lead line. AR-180: the screen title is the app frame's h1 (one h1 per page), so a
	 * screen prints only its lead here; `title` is still accepted (kit version 1) and not shown.
	 */
	function Head(props) {
		if (!props.lead && !props.children) return null;
		return el('div', { className: 'atlas-ar-head' },
			props.lead ? el('p', null, props.lead) : null,
			props.children);
	}

	/** Cards to choose one of (radio group). options: [ { value, title, text, badge, picture } ] */
	function Choice(props) {
		return el('div', { className: 'atlas-ar-choice' + (props.compact ? ' is-compact' : ''), role: 'radiogroup', 'aria-label': props.label },
			props.options.map(function (o) {
				var on = props.value === o.value;
				return el('button', {
					key: o.value, type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false',
					className: 'atlas-ar-choice-item' + (on ? ' is-on' : ''),
					onClick: function () { props.onChange(o.value); }
				},
					o.picture ? el('span', { className: 'atlas-ar-choice-picture', 'aria-hidden': 'true' }, o.picture) : null,
					el('span', { className: 'atlas-ar-choice-title' }, o.title, o.badge ? el('span', { className: 'atlas-ar-badge' }, o.badge) : null),
					o.text ? el('span', { className: 'atlas-ar-choice-text' }, o.text) : null);
			}));
	}

	/**
	 * A short note on what AtlasAR Pro adds right here (AR-146: contextual). `where` = the screen,
	 * `spot` = this note (UTM). `items` = a few one-line points (optional). Text and a link only:
	 * nothing in the free plugin is locked.
	 */
	function ProNote(props) {
		if (filters('atlasAr.proNotes', true) === false) return null; // AtlasAR Pro is here: no note
		var href = link(LINKS.pro, props.where || 'dashboard', props.spot || 'pro_note');
		return el('div', { className: 'atlas-ar-pro-note' },
			el('p', null,
				el('span', { className: 'atlas-ar-badge atlas-ar-badge--pro' }, 'Pro'), ' ',
				props.children, ' ',
				props.items ? null : el('a', { href: href, target: '_blank', rel: 'noopener noreferrer' }, props.link || __('See AtlasAR Pro', 'ar-vr-3d-model-try-on'),
					el('span', { className: 'screen-reader-text' }, __('(opens in a new tab)', 'ar-vr-3d-model-try-on')))),
			props.items ? el(Fragment, null,
				el('ul', null, props.items.map(function (t, i) { return el('li', { key: i }, t); })),
				el('a', { href: href, target: '_blank', rel: 'noopener noreferrer' }, props.link || __('See AtlasAR Pro', 'ar-vr-3d-model-try-on'),
					el('span', { className: 'screen-reader-text' }, __('(opens in a new tab)', 'ar-vr-3d-model-try-on')))) : null);
	}

	/** The real shop viewer (viewer SDK) with options, for previews. */
	function Viewer(props) {
		var o = props.options || {};
		if (!o.src) return el('div', { className: 'atlas-ar-viewer-empty', style: { height: props.height || '320px' } }, props.empty || __('No 3D model yet.', 'ar-vr-3d-model-try-on'));
		var attrs = { key: props.reloadKey || o.src, src: o.src, load: 'immediate', qr: 'false', width: '100%', height: props.height || '320px' };
		Object.keys(o).forEach(function (k) {
			if (k === 'src' || o[k] === '' || o[k] === null || o[k] === undefined) return;
			attrs[k.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); })] = typeof o[k] === 'boolean' ? String(o[k]) : (typeof o[k] === 'object' ? JSON.stringify(o[k]) : String(o[k]));
		});
		if (props.innerRef) attrs.ref = props.innerRef;
		// AR-156: the same frame the shop draws (border, corners, shadow, width).
		var f = props.frame, style;
		if (f) {
			var shadow = { none: 'none', soft: '0 2px 10px rgba(0,0,0,.12)', strong: '0 6px 24px rgba(0,0,0,.22)' };
			style = {
				border: (Number(f.border_width) || 0) + 'px solid ' + (f.border_color || 'transparent'),
				borderRadius: (Number(f.radius) || 0) + 'px', boxShadow: shadow[f.frame_shadow] || 'none',
				overflow: Number(f.radius) > 0 ? 'hidden' : 'visible', boxSizing: 'border-box',
				maxWidth: Number(f.max_width) > 0 ? Number(f.max_width) + 'px' : '100%',
				marginLeft: f.align === 'center' || f.align === 'right' ? 'auto' : 0, marginRight: f.align === 'center' ? 'auto' : 0
			};
		}
		return el('div', { className: 'atlas-ar-viewer-box', style: style }, el('atlasar-viewer', attrs));
	}

	/** Viewer options from the site's Appearance settings (the same mapping the shop uses). */
	function lookOptions(look) {
		look = look || {};
		return {
			background: look.background,
			environmentImage: look.lighting === 'custom' && look.environment_url ? look.environment_url : (look.lighting === 'bright' ? 'legacy' : 'neutral'),
			exposure: look.exposure,
			shadowIntensity: look.shadow,
			autoRotate: !!look.auto_rotate,
			disableZoom: !look.zoom,
			arButton: look.ar_button === 'custom' ? 'custom' : 'default',
			arButtonText: look.ar_text,
			arButtonBackground: look.ar_color,
			// AR-156 (the same mapping as AR_TRY_ON_Viewer::options()).
			arButtonColor: look.ar_text_color,
			cameraOrbit: { front: '0deg 80deg auto', side: '90deg 80deg auto', top: '0deg 25deg auto' }[look.camera] || '',
			interactionPrompt: look.prompt === false ? 'none' : 'auto',
			toneMapping: look.tone || 'neutral',
			skyboxImage: look.skybox && look.lighting === 'custom' ? (look.environment_url || '') : '',
			ar: look.ar !== false,
			xrEnvironment: look.xr_environment !== false
		};
	}

	/** "Saved" / error line next to a Save button. */
	function SaveBar(props) {
		return el('div', { className: 'atlas-ar-savebar' },
			el(C.Button, { variant: 'primary', isBusy: props.busy, disabled: props.busy || props.disabled, onClick: props.onSave }, props.label || __('Save changes', 'ar-vr-3d-model-try-on')),
			props.saved ? el('span', { className: 'atlas-ar-saved', role: 'status' }, __('Saved', 'ar-vr-3d-model-try-on')) : null,
			props.error ? el('span', { className: 'atlas-ar-error', role: 'alert' }, props.error) : null);
	}

	/**
	 * Settings state with save: [ settings, set(group, key, value), save(patch?), status ]
	 */
	function useSettings(initial) {
		var _s = useState(initial || {}), s = _s[0], setS = _s[1];
		var _st = useState({ busy: false, saved: false, error: '', dirty: false }), st = _st[0], setSt = _st[1];
		function set(group, key, value) {
			setS(function (cur) {
				var next = Object.assign({}, cur);
				next[group] = Object.assign({}, cur[group]);
				next[group][key] = value;
				return next;
			});
			setSt({ busy: false, saved: false, error: '', dirty: true });
		}
		function save(patch) {
			setSt({ busy: true, saved: false, error: '', dirty: st.dirty });
			return api('/config', { method: 'POST', data: { settings: patch || s } }).then(function (res) {
				setS(res.settings);
				setSt({ busy: false, saved: true, error: '', dirty: false });
				return res.settings;
			}, function (e) {
				setSt({ busy: false, saved: false, error: message(e), dirty: true });
				throw e;
			});
		}
		return [s, set, save, st, setS];
	}


	/* ------------------------------------------------------------ AR-180: kit version 2 */

	/**
	 * Icons of the app frame: paths copied from @wordpress/icons 10.32 (GPL-2.0-or-later, the
	 * same licence as this plugin). AtlasAR has no build step, so it cannot import that package
	 * (it is not a WordPress script handle). Per path: [ d, evenodd? ]; all on a 24 px grid.
	 */
	var icons = Object.freeze({
		store: [['M19.75 11H21V8.667L19.875 4H4.125L3 8.667V11h1.25v8.75h15.5V11zm-1.5 0H5.75v7.25H10V13h4v5.25h4.25V11zm-5.5-5.5h2.067l.486 3.24.028.76H12.75v-4zm-3.567 0h2.067v4H8.669l.028-.76.486-3.24zm7.615 3.1l-.464-3.1h2.36l.806 3.345V9.5h-2.668l-.034-.9zM7.666 5.5h-2.36L4.5 8.845V9.5h2.668l.034-.9.464-3.1z', 1]],
		check: [['M16.7 7.1l-6.3 8.5-3.3-2.5-.9 1.2 4.5 3.4L17.9 8z']],
		media: [['m7 6.5 4 2.5-4 2.5z'], ['m5 3c-1.10457 0-2 .89543-2 2v14c0 1.1046.89543 2 2 2h14c1.1046 0 2-.8954 2-2v-14c0-1.10457-.8954-2-2-2zm14 1.5h-14c-.27614 0-.5.22386-.5.5v10.7072l3.62953-2.6465c.25108-.1831.58905-.1924.84981-.0234l2.92666 1.8969 3.5712-3.4719c.2911-.2831.7545-.2831 1.0456 0l2.9772 2.8945v-9.3568c0-.27614-.2239-.5-.5-.5zm-14.5 14.5v-1.4364l4.09643-2.987 2.99567 1.9417c.2936.1903.6798.1523.9307-.0917l3.4772-3.3806 3.4772 3.3806.0228-.0234v2.5968c0 .2761-.2239.5-.5.5h-14c-.27614 0-.5-.2239-.5-.5z', 1]],
		plugins: [['M10.5 4v4h3V4H15v4h1.5a1 1 0 011 1v4l-3 4v2a1 1 0 01-1 1h-3a1 1 0 01-1-1v-2l-3-4V9a1 1 0 011-1H9V4h1.5zm.5 12.5v2h2v-2l3-4v-3H8v3l3 4z']],
		layout: [['M18 5.5H6a.5.5 0 00-.5.5v3h13V6a.5.5 0 00-.5-.5zm.5 5H10v8h8a.5.5 0 00.5-.5v-7.5zm-10 0h-3V18a.5.5 0 00.5.5h2.5v-8zM6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z']],
		styles: [['M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 0 1-6.5 6.5v-13a6.5 6.5 0 0 1 6.5 6.5Z', 1]],
		capturePhoto: [['M12 9.2c-2.2 0-3.9 1.8-3.9 4s1.8 4 3.9 4 4-1.8 4-4-1.8-4-4-4zm0 6.5c-1.4 0-2.4-1.1-2.4-2.5s1.1-2.5 2.4-2.5 2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5zM20.2 8c-.1 0-.3 0-.5-.1l-2.5-.8c-.4-.1-.8-.4-1.1-.8l-1-1.5c-.4-.5-1-.9-1.7-.9h-2.9c-.6.1-1.2.4-1.6 1l-1 1.5c-.3.3-.6.6-1.1.7l-2.5.8c-.2.1-.4.1-.6.1-1 .2-1.7.9-1.7 1.9v8.3c0 1 .9 1.9 2 1.9h16c1.1 0 2-.8 2-1.9V9.9c0-1-.7-1.7-1.8-1.9zm.3 10.1c0 .2-.2.4-.5.4H4c-.3 0-.5-.2-.5-.4V9.9c0-.1.2-.3.5-.4.2 0 .5-.1.8-.2l2.5-.8c.7-.2 1.4-.6 1.8-1.3l1-1.5c.1-.1.2-.2.4-.2h2.9c.2 0 .3.1.4.2l1 1.5c.4.7 1.1 1.1 1.9 1.4l2.5.8c.3.1.6.1.8.2.3 0 .4.2.4.4v8.1z']],
		chartBar: [['M11.25 5h1.5v15h-1.5V5zM6 10h1.5v10H6V10zm12 4h-1.5v6H18v-6z', 1]],
		settings: [['m19 7.5h-7.628c-.3089-.87389-1.1423-1.5-2.122-1.5-.97966 0-1.81309.62611-2.12197 1.5h-2.12803v1.5h2.12803c.30888.87389 1.14231 1.5 2.12197 1.5.9797 0 1.8131-.62611 2.122-1.5h7.628z'], ['m19 15h-2.128c-.3089-.8739-1.1423-1.5-2.122-1.5s-1.8131.6261-2.122 1.5h-7.628v1.5h7.628c.3089.8739 1.1423 1.5 2.122 1.5s1.8131-.6261 2.122-1.5h2.128z']],
		help: [['M12 4a8 8 0 1 1 .001 16.001A8 8 0 0 1 12 4Zm0 1.5a6.5 6.5 0 1 0-.001 13.001A6.5 6.5 0 0 0 12 5.5Zm.75 11h-1.5V15h1.5v1.5Zm-.445-9.234a3 3 0 0 1 .445 5.89V14h-1.5v-1.25c0-.57.452-.958.917-1.01A1.5 1.5 0 0 0 12 8.75a1.5 1.5 0 0 0-1.5 1.5H9a3 3 0 0 1 3.305-2.984Z']],
		external: [['M19.5 4.5h-7V6h4.44l-5.97 5.97 1.06 1.06L18 7.06v4.44h1.5v-7Zm-13 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3H17v3a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h3V5.5h-3Z']],
		menu: [['M5 5v1.5h14V5H5zm0 7.8h14v-1.5H5v1.5zM5 19h14v-1.5H5V19z']],
		close: [['m13.06 12 6.47-6.47-1.06-1.06L12 10.94 5.53 4.47 4.47 5.53 10.94 12l-6.47 6.47 1.06 1.06L12 13.06l6.47 6.47 1.06-1.06L13.06 12Z']],
		search: [['M13 5c-3.3 0-6 2.7-6 6 0 1.4.5 2.7 1.3 3.7l-3.8 3.8 1.1 1.1 3.8-3.8c1 .8 2.3 1.3 3.7 1.3 3.3 0 6-2.7 6-6S16.3 5 13 5zm0 10.5c-2.5 0-4.5-2-4.5-4.5s2-4.5 4.5-4.5 4.5 2 4.5 4.5-2 4.5-4.5 4.5z']],
		bell: [['M17 11.5c0 1.353.17 2.368.976 3 .266.209.602.376 1.024.5v1H5v-1c.422-.124.757-.291 1.024-.5.806-.632.976-1.647.976-3V9c0-2.8 2.2-5 5-5s5 2.2 5 5v2.5ZM15.5 9v2.5c0 .93.066 1.98.515 2.897l.053.103H7.932a4.018 4.018 0 0 0 .053-.103c.449-.917.515-1.967.515-2.897V9c0-1.972 1.528-3.5 3.5-3.5s3.5 1.528 3.5 3.5Zm-5.492 9.008c0-.176.023-.346.065-.508h3.854A1.996 1.996 0 0 1 12 20c-1.1 0-1.992-.892-1.992-1.992Z', 1]]
	});

	/** An icon from `icons`. Decoration only: hidden from screen readers (the text next to it names it). */
	function Icon(props) {
		var paths = icons[props.name];
		if (!paths) return null;
		var px = props.size || 24;
		return el('svg', { className: 'atlas-ar-icon', viewBox: '0 0 24 24', width: px, height: px, 'aria-hidden': 'true', focusable: 'false' },
			paths.map(function (p, i) {
				return el('path', { key: i, d: p[0], fillRule: p[1] ? 'evenodd' : undefined, clipRule: p[1] ? 'evenodd' : undefined });
			}));
	}

	/** A small word label ("Unsaved changes"). tone: '' | 'note' | 'warn'. Always words, never colour alone. */
	function Chip(props) {
		return el('span', { className: 'atlas-ar-chip' + (props.tone ? ' atlas-ar-chip--' + props.tone : '') }, props.children);
	}

	/** A number badge (the notices bell). Hidden from screen readers: the button's name says the number in words. */
	function Count(props) {
		if (!props.value) return null;
		return el('span', { className: 'atlas-ar-count' + (props.alert ? ' is-alert' : ''), 'aria-hidden': 'true' }, props.value > 99 ? '99+' : String(props.value));
	}

	/** Colour swatches (a radio group) plus "Other" (a colour input). Moved here from the dashboard (AR-180). */
	function Swatches(props) {
		return el('div', { className: 'atlas-ar-swatches', role: 'radiogroup', 'aria-label': props.label },
			props.colors.map(function (c) {
				return el('button', {
					key: c, type: 'button', role: 'radio', 'aria-checked': props.value === c ? 'true' : 'false', 'aria-label': c,
					className: 'atlas-ar-swatch' + (props.value === c ? ' is-on' : ''), style: { background: c },
					onClick: function () { props.onChange(c); }
				});
			}),
			el('label', { className: 'atlas-ar-swatch-custom' }, __('Other', 'ar-vr-3d-model-try-on'),
				el('input', { type: 'color', value: props.value || '#ffffff', onChange: function (e) { props.onChange(e.target.value); } })));
	}

	/**
	 * AR-181: the wrapper the header search finds a setting by: div.atlas-ar-field[data-atlas-ar-field].
	 * Add-ons wrap their own controls in it, so a search entry can jump to them too.
	 */
	function Field(props) {
		return el('div', { className: 'atlas-ar-field' + (props.className ? ' ' + props.className : ''), 'data-atlas-ar-field': props.id }, props.children);
	}

	/** The settings path of a field definition, split: 'look.exposure' → [ 'look', 'exposure' ]. */
	function pathOf(def) {
		var p = String(def.id).split('.');
		return [p[0], p.slice(1).join('.')];
	}

	/** Limits and allowed values of a setting come from the server's schema; a definition never repeats them. */
	function schemaOf(def) {
		var p = pathOf(def);
		return ((boot.schema || {})[p[0]] || {})[p[1]] || {};
	}

	/** A field's current value. onByDefault: on unless the saved value is false (look.prompt, look.ar …). */
	function valueOf(def, settings) {
		var p = pathOf(def);
		var v = ((settings || {})[p[0]] || {})[p[1]];
		return def.onByDefault ? v !== false : v;
	}

	/** The options of a select or radio field, limited to what the schema allows. */
	function optionsOf(def) {
		var allowed = schemaOf(def).options;
		var list = def.options || [];
		return Array.isArray(allowed) ? list.filter(function (o) { return allowed.indexOf(o.value) !== -1; }) : list;
	}

	/** The WordPress component that matches a definition's `control`, with the field's value. */
	function control(def, props) {
		var schema = schemaOf(def);
		var value = valueOf(def, props.settings);
		var label = (props.labels && props.labels[def.id]) || def.label;
		var p = pathOf(def);
		var set = function (v) { props.set(p[0], p[1], v); };
		var text = value === undefined || value === null ? '' : value;
		// A tab heading can name a field (hideLabel); a short form without headings shows the label (showLabels).
		var hideLabel = !!def.hideLabel && !props.showLabels;
		switch (def.control) {
			case 'toggle':
				return el(C.ToggleControl, { label: label, help: def.help, checked: !!value, onChange: set });
			case 'text':
			case 'url':
				return el(C.TextControl, { label: label, help: def.help, type: def.control === 'url' ? 'url' : 'text', value: text, maxLength: def.control === 'text' ? schema.max : undefined, onChange: set });
			case 'number':
				return el(C.TextControl, { label: label, help: def.help, type: 'number', min: schema.min, max: schema.max, value: text, onChange: set });
			case 'textarea':
				return el(C.TextareaControl, { label: label, help: def.help, value: text, rows: def.rows || 3, onChange: set });
			case 'select':
				return el(C.SelectControl, { label: label, help: def.help, value: value, options: optionsOf(def), onChange: set, __nextHasNoMarginBottom: true });
			case 'radio':
				return el(C.RadioControl, { label: label, help: def.help, hideLabelFromVision: hideLabel, selected: value, options: optionsOf(def), onChange: set });
			case 'range':
				return el(C.RangeControl, { label: label, help: def.help, value: Number(value), min: schema.min, max: schema.max, step: def.step || 1, onChange: set });
			case 'swatches':
				return el(Fragment, null,
					hideLabel ? null : el('span', { className: 'atlas-ar-label', 'aria-hidden': 'true' }, label),
					el(Swatches, { label: label, colors: def.colors || [], value: value, onChange: set }));
			case 'custom':
				return typeof def.render === 'function' ? def.render(props) : null;
		}
		return null;
	}

	/**
	 * AR-181: draws settings from their definitions in the map (atlas-ar-map.js), each inside
	 * UI.Field so the header search can find it. A setting is written once: the screen draws it
	 * and the search finds it.
	 *
	 * props: where { screen, tab } (every field of that tab, under its section headings) or ids [ … ];
	 *        settings; set( group, key, value ); labels { id: label } (words that differ, e.g. in
	 *        the wizard); always (true: ignore showIf) and showLabels (true: every label visible),
 *        both for the wizard's short form.
	 */
	function Fields(props) {
		var map = window.AtlasARAdminUI && window.AtlasARAdminUI.map;
		if (!map || !map.fieldsAt) return null;
		var list = props.ids ? props.ids.map(map.field).filter(Boolean) : map.fieldsAt(props.where || {});
		var shown = list.filter(function (def) { return props.always || !def.showIf || def.showIf(props.settings); });
		var sections = props.ids ? [{ id: '', label: '' }] : map.sectionsOf(props.where || {});
		return el(Fragment, null, sections.map(function (sec) {
			var mine = props.ids ? shown : shown.filter(function (d) { return (d.section || '') === sec.id; });
			if (!mine.length) return null;
			return el(Fragment, { key: sec.id || '_' },
				sec.label ? el('h3', null, sec.label) : null,
				mine.map(function (def) { return el(Field, { key: def.id, id: def.id }, control(def, props)); }));
		}));
	}

	window.AtlasARAdminUI = Object.freeze({
		el: el, Fragment: Fragment, useState: useState, useEffect: useEffect, useRef: useRef, C: C, __: __, D: D,
		api: api, message: message, size: size, filters: filters, LINKS: LINKS, link: link, boot: boot,
		Section: Section, Head: Head, Choice: Choice, ProNote: ProNote, Viewer: Viewer, SaveBar: SaveBar,
		lookOptions: lookOptions, useSettings: useSettings,
		// AR-180: kit version 2.
		version: 2, icons: icons, Icon: Icon, Chip: Chip, Count: Count, Swatches: Swatches, Field: Field, Fields: Fields,
		valueOf: valueOf,
		// Filled and frozen by atlas-ar-shell.js, atlas-ar-search.js and atlas-ar-map.js.
		shell: {}, search: {}, map: {}
	});
})(window.wp, window.atlasArAdmin);
