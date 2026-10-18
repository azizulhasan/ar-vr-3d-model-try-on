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
		return (err && err.message) || __('Something went wrong. Please try again.', D);
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

	/** Page head: title + one line. */
	function Head(props) {
		return el('header', { className: 'atlas-ar-head' },
			el('h1', null, props.title),
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

	/** A short note about what AtlasAR Pro adds (text and a link: never a disabled control). */
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
				props.items ? null : el('a', { href: href, target: '_blank', rel: 'noopener noreferrer' }, props.link || __('See AtlasAR Pro', D),
					el('span', { className: 'screen-reader-text' }, __('(opens in a new tab)', D)))),
			props.items ? el(Fragment, null,
				el('ul', null, props.items.map(function (t, i) { return el('li', { key: i }, t); })),
				el('a', { href: href, target: '_blank', rel: 'noopener noreferrer' }, props.link || __('See AtlasAR Pro', D),
					el('span', { className: 'screen-reader-text' }, __('(opens in a new tab)', D)))) : null);
	}

	/** The real shop viewer (viewer SDK) with options, for previews. */
	function Viewer(props) {
		var o = props.options || {};
		if (!o.src) return el('div', { className: 'atlas-ar-viewer-empty', style: { height: props.height || '320px' } }, props.empty || __('No 3D model yet.', D));
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
			el(C.Button, { variant: 'primary', isBusy: props.busy, disabled: props.busy || props.disabled, onClick: props.onSave }, props.label || __('Save changes', D)),
			props.saved ? el('span', { className: 'atlas-ar-saved', role: 'status' }, __('Saved', D)) : null,
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

	window.AtlasARAdminUI = Object.freeze({
		el: el, Fragment: Fragment, useState: useState, useEffect: useEffect, useRef: useRef, C: C, __: __, D: D,
		api: api, message: message, size: size, filters: filters, LINKS: LINKS, link: link, boot: boot,
		Section: Section, Head: Head, Choice: Choice, ProNote: ProNote, Viewer: Viewer, SaveBar: SaveBar,
		lookOptions: lookOptions, useSettings: useSettings
	});
})(window.wp, window.atlasArAdmin);
