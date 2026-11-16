/**
 * AR-180: the desktop-app frame of the AtlasAR admin (the dashboard and the 3D Library): a side
 * menu with groups and icons, a top bar (screen title, search, notices bell, help), one section
 * at a time in the middle (only that pane scrolls), and a thin status bar with facts. On phones
 * the side menu becomes a slide-in menu. Fills window.AtlasARAdminUI.shell:
 *
 *   parseHash, formatHash, useRoute, useMedia, railItems, Shell, Pane, Tabs, SaveFooter,
 *   notify, Snackbars (AR-182)
 *
 * Plain JavaScript on WordPress's own React and components (no build step), like the rest of the
 * AtlasAR admin. The same frame as AtlasMCP's admin (one design family), with these differences:
 * the notices bell keeps moved notices in the page (a hidden holder), the status bar only shows
 * facts, and every word is translatable.
 *
 * Addresses: #<screen> as before, plus #<screen>:<tab> and #<screen>:<tab>/<field> (or
 * #<screen>/<field>), e.g. #appearance:frame/look.radius. Old links such as #integrations work.
 */
(function (UI, wp) {
	'use strict';
	if (!UI || !UI.shell || Object.isFrozen(UI.shell) || !UI.search || !UI.search.Search) return;
	var el = UI.el, Fragment = UI.Fragment, useState = UI.useState, useEffect = UI.useEffect, useRef = UI.useRef, C = UI.C;
	var useLayoutEffect = wp.element.useLayoutEffect || useEffect;
	var __ = wp.i18n.__, _n = wp.i18n._n, sprintf = wp.i18n.sprintf;
	var compose = wp.compose || {};
	var sb = (UI.boot && UI.boot.shell) || {};
	var urls = sb.urls || {}, can = sb.can || {};

	function speak(text) {
		if (text && wp.a11y && wp.a11y.speak) wp.a11y.speak(text);
	}

	/* ------------------------------------------------------------ addresses */

	var ID = /^[a-z0-9_-]+$/i;
	var FIELD = /^[a-z0-9_-]+(\.[a-z0-9_-]+)*$/i;

	/** '#appearance:frame/look.radius' → { screen: 'appearance', tab: 'frame', field: 'look.radius' }. Anything odd becomes ''. */
	function parseHash(hash) {
		var h = String(hash || '').replace(/^#/, '');
		try { h = decodeURIComponent(h); } catch (e) { h = ''; }
		var field = '', slash = h.indexOf('/');
		if (slash !== -1) { field = h.slice(slash + 1); h = h.slice(0, slash); }
		var parts = h.split(':');
		return {
			screen: ID.test(parts[0] || '') ? parts[0] : '',
			tab: ID.test(parts[1] || '') ? parts[1] : '',
			field: FIELD.test(field) ? field : ''
		};
	}

	function formatHash(r) {
		var h = r.screen || '';
		if (h && r.tab) h += ':' + r.tab;
		if (h && r.field) h += '/' + r.field;
		return h ? '#' + h : '';
	}

	/**
	 * The current address and a way to change it: [ route, go ]. route = { screen, tab, field,
	 * source, n } where source says how we got here (load, hash = Back button or a pasted link,
	 * rail, search, go) and n changes on every move (effects key on it).
	 * go( screen, tab, field, { replace, source } ): replace for tab switches (no history entry each).
	 */
	function useRoute() {
		var _r = useState(function () { return Object.assign(parseHash(window.location.hash), { source: 'load', n: 0 }); });
		var route = _r[0], setRoute = _r[1];
		useEffect(function () {
			function onHash() {
				setRoute(function (cur) { return Object.assign(parseHash(window.location.hash), { source: 'hash', n: cur.n + 1 }); });
			}
			window.addEventListener('hashchange', onHash);
			return function () { window.removeEventListener('hashchange', onHash); };
		}, []);
		function go(screen, tab, field, opts) {
			opts = opts || {};
			var next = { screen: screen || '', tab: tab || '', field: field || '' };
			var hash = formatHash(next) || window.location.pathname + window.location.search;
			// pushState / replaceState do not fire hashchange, so the route is set here once.
			if (window.history && window.history.pushState) {
				if (opts.replace) window.history.replaceState(null, '', hash);
				else if (window.location.hash !== formatHash(next)) window.history.pushState(null, '', hash);
			}
			setRoute(function (cur) { return Object.assign(next, { source: opts.source || 'go', n: cur.n + 1 }); });
		}
		return [route, go];
	}

	/** True while a media query matches (the frame changes form at 1280, 960 and 782 px). */
	function useMedia(query) {
		var mq = window.matchMedia ? window.matchMedia(query) : null;
		var _m = useState(mq ? mq.matches : false), on = _m[0], setOn = _m[1];
		useEffect(function () {
			if (!mq) return;
			var update = function () { setOn(mq.matches); };
			update();
			if (mq.addEventListener) mq.addEventListener('change', update); else mq.addListener(update);
			return function () { if (mq.removeEventListener) mq.removeEventListener('change', update); else mq.removeListener(update); };
		}, [query]);
		return on;
	}

	/* ------------------------------------------------------------ side menu */

	/**
	 * The side menu's items, from the map (atlas-ar-map.js) and what the page draws.
	 * opts: { pages (the dashboard's screens after the atlasAr.dashboard.pages filter; omitted on
	 *         other pages), settings (the dashboard's settings, for the Setup item) }
	 * Item: { id, label, group, icon, tabs?, keywords?, en?, local (drawn on this page) | href }.
	 * Only what the user may open is listed; the server still decides.
	 */
	function railItems(opts) {
		opts = opts || {};
		var map = UI.map && UI.map.screens ? UI.map : null;
		var pages = opts.pages || null;
		var list = [];
		var hasPage = function (id) { return !!pages && pages.some(function (p) { return p.id === id; }); };
		(map ? map.screens : [{ id: 'library', href: 'library', group: 'models', icon: 'media', cap: 'upload', label: __('3D Library', 'ar-vr-3d-model-try-on') }]).forEach(function (s) {
			if ((s.cap === 'manage' && !can.manage) || (s.cap === 'upload' && !can.upload)) return;
			if (s.when && !s.when(opts)) return;
			var item = { id: s.id, label: s.label, group: s.group || '', icon: s.icon, tabs: s.tabs, keywords: s.keywords, en: s.en };
			if (s.href) {
				if (!urls[s.href]) return;
				item.href = urls[s.href];
			} else if (pages) {
				if (!hasPage(s.id)) return; // removed with the atlasAr.dashboard.pages filter
				item.local = true;
			} else {
				item.href = urls.dashboard + '#' + s.id;
			}
			list.push(item);
		});
		// Screens another plugin added with atlasAr.dashboard.pages: in their group, or "More".
		(pages || []).forEach(function (p) {
			if (list.some(function (i) { return i.id === p.id; })) return;
			list.push({ id: p.id, label: p.label, group: p.group || 'more', icon: UI.icons[p.icon] ? p.icon : 'plugins', tabs: p.tabs, keywords: p.keywords, en: p.en, local: true });
		});
		// Links to other pages from the PHP filter atlas_ar_shell_links (already checked on the server).
		(sb.links || []).forEach(function (l) {
			list.push({ id: 'link-' + l.id, label: l.label, href: l.href, group: l.group || 'more', icon: UI.icons[l.icon] ? l.icon : 'external', keywords: l.keywords });
		});
		return list;
	}

	/** Groups in the map's order; a group nobody knows joins "More". */
	function grouped(items) {
		var order = (UI.map && UI.map.groups) || [{ id: '', label: '' }, { id: 'more', label: __('More', 'ar-vr-3d-model-try-on') }];
		var known = order.map(function (g) { return g.id; });
		return order.map(function (g) {
			return { id: g.id, label: g.label, items: items.filter(function (i) { return (known.indexOf(i.group) === -1 ? 'more' : i.group) === g.id; }) };
		}).filter(function (g) { return g.items.length; });
	}

	/** Logo, name, a badge when the brand filter added a word ("AtlasAR Pro" → AtlasAR + Pro), versions. */
	function Brand() {
		var b = sb.brand || {};
		var name = b.name || 'AtlasAR', badge = '';
		if (name.indexOf('AtlasAR ') === 0) { badge = name.slice(8); name = 'AtlasAR'; }
		var ver = b.version || sb.version || '';
		var also = sb.version && b.version && sb.version !== b.version ? sb.version : '';
		return el('div', { className: 'atlas-ar-rail-brand' },
			el('span', { className: 'atlas-ar-rail-logo', 'aria-hidden': 'true' }, 'AR'),
			el('span', { className: 'atlas-ar-rail-text' },
				el('span', { className: 'atlas-ar-rail-name' }, name, badge ? el('span', { className: 'atlas-ar-rail-badge' }, badge) : null),
				ver ? el('span', { className: 'atlas-ar-rail-version' },
					/* translators: 1: the version of the product shown, 2: the version of the free AtlasAR plugin under it. */
					also ? sprintf(__('%1$s · AtlasAR %2$s', 'ar-vr-3d-model-try-on'), ver, also) : ver) : null));
	}

	function RailItem(props) {
		var it = props.item, cur = props.current === it.id;
		var inner = [el(UI.Icon, { key: 'i', name: it.icon }), el('span', { key: 'l', className: 'atlas-ar-nav-label' }, it.label)];
		var common = { className: 'atlas-ar-nav-item' + (cur ? ' is-current' : ''), 'aria-current': cur ? 'page' : undefined };
		var node = it.local && props.onGo
			? el('button', Object.assign({ type: 'button', onClick: function () { props.onGo(it); } }, common), inner)
			: el('a', Object.assign({ href: it.href }, common), inner);
		// In the icon-only menu the name is still there for screen readers; the tooltip shows it.
		return props.compact ? el(C.Tooltip, { text: it.label, placement: 'right' }, node) : node;
	}

	/** The menu itself (also drawn inside the slide-in menu on phones). */
	function Rail(props) {
		var showPro = UI.filters('atlasAr.proNotes', true) !== false;
		return el(Fragment, null,
			el(Brand),
			el('nav', { className: 'atlas-ar-nav', 'aria-label': __('AtlasAR', 'ar-vr-3d-model-try-on') },
				grouped(props.items).map(function (g) {
					var hid = 'atlas-ar-nav-g-' + (g.id || 'top');
					return el('div', { key: g.id || 'top', className: 'atlas-ar-nav-group', role: g.label ? 'group' : undefined, 'aria-labelledby': g.label ? hid : undefined },
						g.label ? el('div', { id: hid, className: 'atlas-ar-nav-heading' }, g.label) : null,
						g.items.map(function (it) { return el(RailItem, { key: it.id, item: it, current: props.current, onGo: props.onGo, compact: props.compact }); }));
				})),
			showPro ? el('div', { className: 'atlas-ar-rail-foot' },
				el('a', { href: UI.link(UI.LINKS.pro, 'rail', 'rail_pro'), target: '_blank', rel: 'noopener noreferrer' },
					__('See AtlasAR Pro', 'ar-vr-3d-model-try-on'),
					el('span', { className: 'screen-reader-text' }, __('(opens in a new tab)', 'ar-vr-3d-model-try-on')))) : null);
	}

	/**
	 * Phones: the menu as a dialog that slides in. Focus moves in, stays in, and returns to the
	 * menu button on close (WordPress's own focus helpers; a small fallback for old WordPress).
	 */
	function MenuDialog(props) {
		var refs = [];
		if (compose.useConstrainedTabbing) refs.push(compose.useConstrainedTabbing());
		if (compose.useFocusReturn) refs.push(compose.useFocusReturn());
		if (compose.useFocusOnMount) refs.push(compose.useFocusOnMount('firstElement'));
		var merged = compose.useMergeRefs && refs.length ? compose.useMergeRefs(refs) : null;
		var own = useRef(null);
		useEffect(function () {
			if (merged || !own.current) return;
			var first = own.current.querySelector('button, a[href]');
			if (first) first.focus();
		}, []);
		return el(Fragment, null,
			el('div', { className: 'atlas-ar-menu-backdrop', 'aria-hidden': 'true', onClick: props.onClose }),
			el('div', {
				id: 'atlas-ar-menu', className: 'atlas-ar-rail is-drawer', role: 'dialog', 'aria-modal': 'true',
				'aria-label': __('AtlasAR menu', 'ar-vr-3d-model-try-on'), ref: merged || own,
				onKeyDown: function (e) { if (e.key === 'Escape') { e.stopPropagation(); props.onClose(); } }
			},
				el('div', { className: 'atlas-ar-drawer-close' }, el(C.Button, { icon: el(UI.Icon, { name: 'close' }), label: __('Close menu', 'ar-vr-3d-model-try-on'), onClick: props.onClose })),
				props.children));
	}

	/* ------------------------------------------------------------ notices bell */

	var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, LINK: 1, NOSCRIPT: 1, TEMPLATE: 1 };
	var SKIP_IDS = { 'screen-meta': 1, 'screen-meta-links': 1, 'atlas-ar-dashboard': 1, 'atlas-ar-library': 1 };

	function visible(n) {
		return !!(n.offsetWidth || n.offsetHeight || (n.getClientRects && n.getClientRects().length));
	}

	/** A notice, or any other visible element another plugin printed above the app. Ours and WordPress's own stay. */
	function movable(n, wrap) {
		if (n.nodeType !== 1 || n === wrap || SKIP_TAGS[n.tagName] || SKIP_IDS[n.id]) return false;
		var c = n.classList;
		if (c.contains('clear') || c.contains('wp-header-end') || c.contains('atlas-ar-notices-holder')) return false;
		if (n.matches && n.matches('.notice, .updated, .error, .update-nag')) return true;
		return visible(n); // a hidden element takes no room, and its plugin may look for it where it is
	}

	/** Moves notices into the holder (never removes them). */
	function collect(holder, wrap) {
		var list = [];
		var body = document.getElementById('wpbody-content');
		[body, wrap].forEach(function (parent) {
			if (!parent) return;
			Array.prototype.forEach.call(parent.children, function (n) { if (movable(n, wrap)) list.push(n); });
		});
		list.forEach(function (n) { holder.appendChild(n); });
	}

	/** The open bell: the real notices are moved in (their own buttons and dismiss scripts keep working) and back out on close. */
	function NoticesList(props) {
		var box = props.boxRef;
		useLayoutEffect(function () {
			var holder = props.holder, node = box.current;
			if (!holder || !node) return;
			while (holder.firstChild) node.appendChild(holder.firstChild);
			var mo = new MutationObserver(props.onChange);
			mo.observe(node, { childList: true });
			props.onChange();
			return function () {
				mo.disconnect();
				while (node.firstChild) holder.appendChild(node.firstChild);
				box.current = null;
				props.onChange();
			};
		}, []);
		return el('div', { className: 'atlas-ar-notices' },
			props.total ? null : el('p', { className: 'atlas-ar-notices-empty' }, __('No notices.', 'ar-vr-3d-model-try-on')),
			el('div', { ref: box, className: 'atlas-ar-notices-list' }),
			el('p', { className: 'atlas-ar-notices-note' }, __('Notices from WordPress and other plugins are moved here on AtlasAR screens, never hidden.', 'ar-vr-3d-model-try-on')));
	}

	function NoticesBell(props) {
		var _c = useState({ total: 0, errors: 0 }), counts = _c[0], setCounts = _c[1];
		var _h = useState(null), holder = _h[0], setHolder = _h[1];
		var box = useRef(null);
		var holderRef = useRef(null);

		function recount() {
			var h = holderRef.current;
			if (!h) return;
			var nodes = Array.prototype.slice.call(h.children).concat(box.current ? Array.prototype.slice.call(box.current.children) : []);
			setCounts({ total: nodes.length, errors: nodes.filter(function (n) { return n.matches && n.matches('.notice-error, .error'); }).length });
		}

		useEffect(function () {
			var root = props.rootRef.current;
			var wrap = root ? (root.closest('.wrap') || root.parentNode) : null;
			var h = document.createElement('div');
			h.className = 'atlas-ar-notices-holder';
			h.hidden = true;
			(wrap || document.body).appendChild(h);
			holderRef.current = h;
			setHolder(h);
			var queued = false;
			function run() {
				if (queued) return;
				queued = true;
				// WordPress's own script moves notices after .wp-header-end when the page is ready, and
				// plugins add some later: collect again whenever the page around the app changes.
				window.requestAnimationFrame(function () { queued = false; collect(h, wrap); recount(); });
			}
			collect(h, wrap);
			recount();
			var mo = new MutationObserver(run);
			var body = document.getElementById('wpbody-content');
			if (body) mo.observe(body, { childList: true });
			if (wrap) mo.observe(wrap, { childList: true });
			mo.observe(h, { childList: true });
			return function () { mo.disconnect(); };
		}, []);

		var label = counts.total
			? sprintf(_n('Notices: %d', 'Notices: %d', counts.total, 'ar-vr-3d-model-try-on'), counts.total) +
				(counts.errors ? ', ' + sprintf(_n('%d error', '%d errors', counts.errors, 'ar-vr-3d-model-try-on'), counts.errors) : '')
			: __('Notices: none', 'ar-vr-3d-model-try-on');
		return el(C.Dropdown, {
			className: 'atlas-ar-bell', contentClassName: 'atlas-ar-notices-pop', popoverProps: { placement: 'bottom-end' },
			renderToggle: function (t) {
				return el(C.Button, { className: 'atlas-ar-header-button', icon: el(UI.Icon, { name: 'bell' }), label: label, showTooltip: true, 'aria-expanded': t.isOpen, onClick: t.onToggle },
					el(UI.Count, { value: counts.total, alert: counts.errors > 0 }));
			},
			renderContent: function () { return el(NoticesList, { holder: holder, boxRef: box, total: counts.total, onChange: recount }); }
		});
	}

	/* ------------------------------------------------------------ help menu */

	function HelpMenu(props) {
		var external = function (href, text, close) {
			return el(C.MenuItem, { href: href, target: '_blank', rel: 'noopener noreferrer', icon: el(UI.Icon, { name: 'external', size: 20 }), iconPosition: 'right', onClick: close },
				text, el('span', { className: 'screen-reader-text' }, __('(opens in a new tab)', 'ar-vr-3d-model-try-on')));
		};
		return el(C.Dropdown, {
			className: 'atlas-ar-help', popoverProps: { placement: 'bottom-end' },
			renderToggle: function (t) {
				return el(C.Button, { className: 'atlas-ar-header-button', icon: el(UI.Icon, { name: 'help' }), label: __('Help', 'ar-vr-3d-model-try-on'), showTooltip: true, 'aria-expanded': t.isOpen, onClick: t.onToggle });
			},
			renderContent: function (t) {
				return el(C.MenuGroup, { label: __('Help', 'ar-vr-3d-model-try-on') },
					can.manage ? el(C.MenuItem, { onClick: function () { t.onClose(); props.onScreen('help'); } }, __('Help and guides', 'ar-vr-3d-model-try-on')) : null,
					external(UI.link(UI.LINKS.docs, 'header', 'help_docs'), __('Documentation', 'ar-vr-3d-model-try-on'), t.onClose),
					external(UI.link(UI.LINKS.support, 'header', 'help_support'), __('Contact support', 'ar-vr-3d-model-try-on'), t.onClose),
					can.manage && urls.wizard ? el(C.MenuItem, { href: urls.wizard }, __('Run the setup wizard', 'ar-vr-3d-model-try-on')) : null);
			}
		});
	}

	/* ------------------------------------------------------------ status bar */

	/** Facts only, from data the page already has (no request). Each fact may open its screen. facts: [ { id, text, screen | href } ] */
	function StatusBar(props) {
		var facts = props.facts || [];
		return el('div', { className: 'atlas-ar-status' },
			facts.length ? el('ul', { 'aria-label': __('AtlasAR status', 'ar-vr-3d-model-try-on') }, facts.map(function (f) {
				var body = f.screen ? el('button', { type: 'button', className: 'atlas-ar-status-link', onClick: function () { props.onScreen(f.screen); } }, f.text)
					: f.href ? el('a', { className: 'atlas-ar-status-link', href: f.href }, f.text) : f.text;
				return el('li', { key: f.id }, body);
			})) : null);
	}

	/* ------------------------------------------------------------ content pane */

	/**
	 * One section at a time. Only its body scrolls (fill: on wide screens the content scrolls its
	 * own parts, as the Appearance fields and preview, or the 3D Library grid and details; the
	 * className names which, for atlas-ar-shell.css). footer: the Save bar.
	 */
	function Pane(props) {
		return el('section', { className: 'atlas-ar-pane' + (props.fill ? ' is-fill' : '') + (props.className ? ' ' + props.className : ''), id: 'atlas-ar-pane', tabIndex: -1, 'aria-labelledby': 'atlas-ar-screen-title' },
			el('div', { className: 'atlas-ar-pane-body' }, props.children),
			props.footer ? el('div', { className: 'atlas-ar-pane-foot' }, props.footer) : null);
	}

	/**
	 * Sub-tabs on WordPress's TabPanel (arrow keys, one tab stop; the content is drawn inside its
	 * role="tabpanel"). TabPanel only takes a first tab, so it is drawn again (a new key) only
	 * when the tab is changed from outside (the search, an address), never on a click, so focus
	 * stays on the tab the user picked.
	 * props: tabs [ { name, title } ], tab, onTab( name ), className, children( tab ) → content
	 */
	function Tabs(props) {
		var picked = useRef(null), key = useRef(0);
		var wanted = props.tabs.some(function (t) { return t.name === props.tab; }) ? props.tab : props.tabs[0].name;
		if (wanted !== picked.current) { picked.current = wanted; key.current++; }
		return el(C.TabPanel, {
			key: key.current, className: 'atlas-ar-tabs-panel' + (props.className ? ' ' + props.className : ''),
			tabs: props.tabs, initialTabName: wanted,
			onSelect: function (name) {
				if (name === picked.current) return;
				picked.current = name;
				props.onTab(name);
			}
		}, function (t) { return props.children(t.name); });
	}

	/** The Save bar in the pane's footer: a status line in words, and the one primary button. status: { busy, saved, error, dirty } */
	function SaveFooter(props) {
		var s = props.status || {};
		var line = s.busy ? __('Saving…', 'ar-vr-3d-model-try-on')
			: s.dirty ? __('Unsaved changes', 'ar-vr-3d-model-try-on')
				: s.saved ? __('All changes saved', 'ar-vr-3d-model-try-on') : '';
		return el('div', { className: 'atlas-ar-savefoot' },
			el('span', { className: 'atlas-ar-savefoot-status' + (s.dirty && !s.busy ? ' is-dirty' : ''), role: 'status' }, line),
			s.error ? el('span', { className: 'atlas-ar-error', role: 'alert' }, s.error) : null,
			el(C.Button, { variant: 'primary', isBusy: s.busy, disabled: s.busy, onClick: props.onSave }, props.label || __('Save changes', 'ar-vr-3d-model-try-on')));
	}

	/* ------------------------------------------------------------ snackbars */

	/**
	 * AR-182: a short message for a result that has no place of its own ("Copied", "Settings
	 * imported"). WordPress's SnackbarList shows it, says it to screen readers and hides it again.
	 */
	var snacks = [], listeners = [];
	function emit() { listeners.forEach(function (fn) { fn(snacks); }); }
	function notify(text, opts) {
		snacks = snacks.concat([{ id: 'atlas-ar-' + Date.now() + '-' + snacks.length, content: String(text), status: (opts && opts.type) || 'success' }]).slice(-3);
		emit();
	}
	function Snackbars() {
		var _s = useState(snacks), list = _s[0], setList = _s[1];
		useEffect(function () {
			listeners.push(setList);
			return function () { listeners = listeners.filter(function (fn) { return fn !== setList; }); };
		}, []);
		if (!C.SnackbarList) return null;
		return el(C.SnackbarList, {
			className: 'atlas-ar-snackbars', notices: list,
			onRemove: function (id) { snacks = snacks.filter(function (n) { return n.id !== id; }); emit(); }
		});
	}

	/* ------------------------------------------------------------ the frame */

	/**
	 * props: items (railItems()), current (screen id), title, onGo( screen, tab, field, opts ) for
	 *        screens drawn on this page, route (from useRoute, for focus after a move), facts,
	 *        dirty, children (the pane).
	 */
	function Shell(props) {
		var phone = useMedia('(max-width: 782px), (max-height: 559px)');
		var compactRail = useMedia('(max-width: 1279px)') && !phone;
		var compactSearch = useMedia('(max-width: 959px)');
		var _m = useState(false), menuOpen = _m[0], setMenuOpen = _m[1];
		var rootRef = useRef(null), titleRef = useRef(null), pending = useRef(null), indexCache = useRef(null);
		var items = props.items || [];

		function getIndex() {
			if (!indexCache.current) indexCache.current = UI.search.buildIndex({ items: items, map: UI.map && UI.map.allFields ? UI.map : null, can: can, urls: urls });
			return indexCache.current;
		}

		function isLocal(screen) {
			return !!props.onGo && items.some(function (i) { return i.id === screen && i.local; });
		}

		/** Open a screen of this app (here, or on the dashboard page). */
		function openScreen(screen, tab, field, source) {
			if (isLocal(screen)) props.onGo(screen, tab || '', field || '', { source: source });
			else if (urls.dashboard) window.location.href = urls.dashboard + formatHash({ screen: screen, tab: tab, field: field });
		}

		function onRail(item) {
			setMenuOpen(false);
			openScreen(item.id, '', '', 'rail');
		}

		function onPick(entry) {
			if (entry.href) { window.location.href = entry.href; return; }
			pending.current = entry;
			openScreen(entry.screen, entry.tab, entry.field, 'search');
		}

		function focusTitle(text) {
			if (titleRef.current) titleRef.current.focus();
			speak(text);
		}

		/** After a jump: the field (tried for about a second while the tab draws), else the title and where it is. */
		function land(entry) {
			var tries = 0;
			(function attempt() {
				if (UI.search.focusField(entry)) return;
				// A setting or an action's button may need a moment while its tab draws; a product's
				// setting is never on this screen (Products says where it is).
				if (entry.field && entry.kind !== 'product' && ++tries < 20) { setTimeout(attempt, 60); return; }
				/* translators: 1: a setting or action, 2: where it is, e.g. "Appearance › Look". */
				focusTitle(entry.where ? sprintf(__('%1$s is in %2$s.', 'ar-vr-3d-model-try-on'), entry.label, entry.where) : props.title);
			})();
		}

		// Focus after a move: from the search, the field; from the Back button or a pasted link,
		// the title; from the menu, focus stays on the item and the screen's name is announced.
		var r = props.route;
		useEffect(function () {
			if (!r) return;
			if (r.source === 'search' && pending.current) {
				var entry = pending.current;
				pending.current = null;
				if (entry.field) land(entry);
				else setTimeout(function () { focusTitle(props.title); }, 0);
			} else if (r.source === 'load' && r.field) {
				var hit = getIndex().entries.filter(function (e) { return e.field === r.field && e.screen === r.screen; })[0];
				if (hit) land(hit);
			} else if (r.source === 'hash') {
				focusTitle(props.title);
			} else if (r.source === 'rail') {
				speak(props.title);
			}
		}, [r ? r.n : 0]);

		var rail = el(Rail, { items: items, current: props.current, onGo: onRail, compact: compactRail });
		return el('div', { ref: rootRef, className: 'atlas-ar-app' + (phone ? ' is-phone' : '') + (compactRail ? ' is-compact' : '') },
			el('a', {
				className: 'atlas-ar-skip', href: '#atlas-ar-pane',
				// No change of address: #atlas-ar-pane is not a screen.
				onClick: function (e) { e.preventDefault(); var p = document.getElementById('atlas-ar-pane'); if (p) p.focus(); }
			}, __('Skip to AtlasAR content', 'ar-vr-3d-model-try-on')),
			phone ? null : el('div', { className: 'atlas-ar-rail' }, rail),
			el('div', { className: 'atlas-ar-header' },
				el('div', { className: 'atlas-ar-header-title' },
					phone ? el(C.Button, {
						className: 'atlas-ar-header-button', icon: el(UI.Icon, { name: 'menu' }), label: __('Menu', 'ar-vr-3d-model-try-on'),
						'aria-expanded': menuOpen ? 'true' : 'false', 'aria-controls': menuOpen ? 'atlas-ar-menu' : undefined,
						onClick: function () { setMenuOpen(true); }
					}) : null,
					el('h1', { id: 'atlas-ar-screen-title', ref: titleRef, tabIndex: -1 }, props.title),
					props.dirty ? el(UI.Chip, { tone: 'note' }, __('Unsaved changes', 'ar-vr-3d-model-try-on')) : null),
				el('div', { className: 'atlas-ar-header-search' }, el(UI.search.Search, { getIndex: getIndex, onPick: onPick, compact: compactSearch })),
				el('div', { className: 'atlas-ar-header-end' },
					el(NoticesBell, { rootRef: rootRef }),
					el(HelpMenu, { onScreen: function (s) { openScreen(s, '', '', 'search'); } }))),
			el('div', { className: 'atlas-ar-work' }, props.children),
			el(StatusBar, { facts: props.facts, onScreen: function (s) { openScreen(s, '', '', 'rail'); } }),
			el(Snackbars),
			phone && menuOpen ? el(MenuDialog, { onClose: function () { setMenuOpen(false); } }, rail) : null);
	}

	Object.assign(UI.shell, {
		parseHash: parseHash, formatHash: formatHash, useRoute: useRoute, useMedia: useMedia, railItems: railItems,
		Shell: Shell, Pane: Pane, Tabs: Tabs, SaveFooter: SaveFooter, notify: notify, Snackbars: Snackbars
	});
	Object.freeze(UI.shell);
})(window.AtlasARAdminUI, window.wp);
