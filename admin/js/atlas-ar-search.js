/**
 * AR-181: the header search of the AtlasAR admin. Fills window.AtlasARAdminUI.search:
 *   normalise, tokens, buildIndex, find, Search (the combobox), focusField (jump and mark).
 *
 * The index is built from the map (atlas-ar-map.js) and the side menu, never from a list written
 * by hand: screens and their tabs, every field definition, a few actions, and what add-ons add
 * through the wp.hooks filter atlasAr.search.items ( entries, { can } ) → entries.
 *
 * Everything runs in memory: no request per keystroke and none on page load. The index is built
 * the first time the box is used, so hooks added late are included.
 */
(function (UI, wp) {
	'use strict';
	if (!UI || !UI.search || Object.isFrozen(UI.search)) return;
	var el = UI.el, useState = UI.useState, useEffect = UI.useEffect, useRef = UI.useRef, C = UI.C;
	var __ = wp.i18n.__, _n = wp.i18n._n, sprintf = wp.i18n.sprintf;

	/* ------------------------------------------------------------ matching */

	// Letters that do not split into a base letter and a mark under NFD.
	var FOLD = { 'ß': 'ss', 'æ': 'ae', 'ø': 'o', 'ł': 'l', 'œ': 'oe', 'đ': 'd', 'ı': 'i' };

	/**
	 * Lower case, accents removed, punctuation as spaces. Plain character ranges, no \p{…}:
	 * an older browser that cannot parse Unicode property escapes would fail on the whole file.
	 */
	function normalise(text) {
		var s = String(text === undefined || text === null ? '' : text).toLowerCase();
		if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
		s = s.replace(/[ßæøłœđı]/g, function (c) { return FOLD[c]; });
		s = s.replace(/[\s!-/:-@[-`{-~ -¿ -⁯　-〿！-／：-＠]+/g, ' ');
		return s.trim();
	}

	function tokens(text) {
		var n = normalise(text);
		return n ? n.split(' ') : [];
	}

	// Words outside Latin script (Chinese, Japanese …) may match inside a word from 2 letters on.
	var NON_LATIN = /[^\u0000-ɏ]/;

	/** How well one typed word matches a list of words: whole 1, start 0.8, inside 0.5, none 0. */
	function matchWord(word, list) {
		var best = 0, inside = word.length >= 3 || (word.length >= 2 && NON_LATIN.test(word));
		for (var i = 0; i < list.length && best < 1; i++) {
			var t = list[i];
			if (t === word) best = 1;
			else if (best < 0.8 && t.indexOf(word) === 0) best = 0.8;
			else if (best < 0.5 && inside && t.indexOf(word) > 0) best = 0.5;
		}
		return best;
	}

	// Where a word was found counts: the label most, the "where" line least.
	var WEIGHTS = { label: 100, keywords: 60, path: 40, options: 30, help: 20, where: 10 };
	var KIND_ORDER = { screen: 0, tab: 1, setting: 2, action: 3, product: 4 };
	var GROUPS = [
		{ id: 'screens', kinds: ['screen', 'tab'], limit: 6, label: __('Screens', 'ar-vr-3d-model-try-on') },
		{ id: 'settings', kinds: ['setting'], limit: 8, label: __('Settings', 'ar-vr-3d-model-try-on') },
		{ id: 'actions', kinds: ['action'], limit: 3, label: __('Actions', 'ar-vr-3d-model-try-on') },
		{ id: 'products', kinds: ['product'], limit: 4, label: __('Product settings', 'ar-vr-3d-model-try-on') }
	];

	/** The searchable words of one entry, normalised once when the index is built. */
	function prepare(entry, order) {
		return {
			entry: entry, order: order,
			label: normalise(entry.label),
			fields: [
				[tokens(entry.label), WEIGHTS.label],
				[tokens((entry.keywords || '') + ' ' + (entry.en || '')), WEIGHTS.keywords],
				[entry.kind === 'setting' || entry.kind === 'product' ? tokens(entry.id) : [], WEIGHTS.path],
				[tokens((entry.options || []).join(' ')), WEIGHTS.options],
				[tokens(entry.help), WEIGHTS.help],
				[tokens(entry.where), WEIGHTS.where]
			]
		};
	}

	/** Score of one prepared entry for the typed words (0 = not a match: every word must match). */
	function score(item, words, phrase) {
		var total = 0;
		for (var w = 0; w < words.length; w++) {
			var best = 0;
			for (var f = 0; f < item.fields.length; f++) {
				var s = matchWord(words[w], item.fields[f][0]) * item.fields[f][1];
				if (s > best) best = s;
			}
			if (!best) return 0;
			total += best;
		}
		if (item.label.indexOf(phrase) === 0) total += 30;
		else if (item.label.indexOf(phrase) > 0) total += 15;
		return total;
	}

	/**
	 * Results for a query, grouped: { groups: [ { id, label, items } ], total }. With nothing typed:
	 * the screens in menu order and three actions.
	 */
	function find(index, query) {
		var words = tokens(query);
		var phrase = words.join(' ');
		var hits;
		if (!words.length) {
			hits = index.items.filter(function (i) { return i.entry.kind === 'screen' || i.entry.kind === 'action'; })
				.map(function (i) { return { item: i, score: 0 }; });
		} else {
			hits = [];
			index.items.forEach(function (i) {
				var s = score(i, words, phrase);
				if (s > 0) hits.push({ item: i, score: s });
			});
			hits.sort(function (a, b) {
				return (b.score - a.score) ||
					(KIND_ORDER[a.item.entry.kind] - KIND_ORDER[b.item.entry.kind]) ||
					(a.item.label.length - b.item.label.length) ||
					(a.item.order - b.item.order);
			});
		}
		var total = 0;
		var groups = GROUPS.map(function (g) {
			var limit = words.length ? g.limit : (g.id === 'screens' ? 50 : 3);
			var items = hits.filter(function (h) { return g.kinds.indexOf(h.item.entry.kind) !== -1; }).slice(0, limit).map(function (h) { return h.item.entry; });
			total += items.length;
			return { id: g.id, label: g.label, items: items };
		}).filter(function (g) { return g.items.length; });
		return { groups: groups, total: total };
	}

	/* ------------------------------------------------------------ the index */

	/** Words of a definition part that may be a function (AR-182: options and help that depend on the site). */
	function words(v) {
		if (typeof v === 'function') {
			try { v = v({ placement: {}, look: {}, cards: {}, tryon: {}, general: {} }); } catch (e) { return ''; }
		}
		return typeof v === 'string' ? v : '';
	}
	function optionWords(v) {
		if (typeof v === 'function') {
			try { v = v(); } catch (e) { return []; }
		}
		return Array.isArray(v) ? v.map(function (o) { return o && (o.label || o.title) ? String(o.label || o.title) : ''; }) : [];
	}

	/** An address from a filter: this site's admin page (relative) or http(s). Never javascript: or data:. */
	function safeHref(href) {
		if (typeof href !== 'string' || !href) return false;
		if (/^https?:\/\//i.test(href)) return true;
		return /^[a-z0-9_-]+\.php(\?|#|$)/i.test(href) || (/^\/[^/\\]/.test(href));
	}

	/** An entry from atlasAr.search.items is used only when it is complete; a broken one is dropped, never thrown. */
	function isEntry(e) {
		return !!e && typeof e === 'object' && typeof e.id === 'string' && e.id !== '' &&
			typeof e.label === 'string' && e.label !== '' &&
			((typeof e.screen === 'string' && e.screen !== '') || safeHref(e.href));
	}

	/**
	 * Builds the index from the side menu and the map.
	 * opts: { items (the side menu's items: { id, label, tabs?, keywords?, en?, href?, local? }),
	 *         map (UI.map or null), can { manage, upload }, urls { … } }
	 */
	function buildIndex(opts) {
		var entries = [];
		var labels = {}, tabLabels = {};
		var can = opts.can || {};
		(opts.items || []).forEach(function (it) {
			labels[it.id] = it.label;
			entries.push({ id: 'screen:' + it.id, kind: 'screen', screen: it.href ? '' : it.id, href: it.href || '', label: it.label, keywords: it.keywords, en: it.en });
			(it.tabs || []).forEach(function (t) {
				tabLabels[it.id + ':' + t.id] = t.label;
				entries.push({ id: 'tab:' + it.id + ':' + t.id, kind: 'tab', screen: it.id, tab: t.id, label: t.label, where: it.label, en: it.en });
			});
		});
		var map = opts.map;
		if (map && can.manage) {
			map.allFields().concat(map.productFields || []).forEach(function (f) {
				var where = f.where || [labels[f.screen], tabLabels[f.screen + ':' + f.tab]].filter(Boolean).join(' › ');
				entries.push({
					id: f.id, kind: f.kind === 'product' ? 'product' : 'setting', screen: f.screen, tab: f.tab || '', field: f.id,
					label: f.label, help: words(f.help), keywords: f.keywords, en: f.en, where: where, needs: f.needs || '', needsHint: f.needsHint || '',
					options: optionWords(f.options)
				});
			});
		}
		if (map) {
			(map.actions || []).forEach(function (a) {
				if ((a.cap === 'manage' && !can.manage) || (a.cap === 'upload' && !can.upload)) return;
				var where = [labels[a.screen], tabLabels[a.screen + ':' + a.tab]].filter(Boolean).join(' › ');
				entries.push({ id: a.id, kind: 'action', screen: a.screen || '', tab: a.tab || '', field: a.target || '', href: a.href ? (opts.urls || {})[a.href] || '' : '', label: a.label, en: a.en, where: where });
			});
		}
		var all = UI.filters('atlasAr.search.items', entries, { can: can });
		all = (Array.isArray(all) ? all : entries).filter(isEntry).map(function (e) {
			if (!KIND_ORDER.hasOwnProperty(e.kind)) e = Object.assign({}, e, { kind: e.screen ? 'setting' : 'action' });
			if (e.href && !safeHref(e.href)) e = Object.assign({}, e, { href: '' });
			return e;
		});
		return { items: all.map(prepare), entries: all };
	}

	/* ------------------------------------------------------------ jump and mark */

	function reducedMotion() {
		return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
	}

	function cssEscape(s) {
		return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/[^a-zA-Z0-9_.-]/g, '');
	}

	/**
	 * Scroll a field into the middle of the pane, focus its control and mark it for 2 seconds.
	 * `entry` comes from the index (the id was in the registry), and the id still goes through
	 * CSS.escape, so nothing typed or pasted reaches a selector. Returns false when the field is
	 * not on the screen (the caller then focuses the screen title and says where it is).
	 * When a condition hides the field, the field that makes it appear is used, and the hint says so.
	 */
	function focusField(entry) {
		var root = document.getElementById('atlas-ar-pane') || document;
		var find1 = function (id) { return id ? root.querySelector('[data-atlas-ar-field="' + cssEscape(id) + '"]') : null; };
		var node = find1(entry.field || entry.id), hint = '';
		if (!node && entry.needs) { node = find1(entry.needs); hint = entry.needsHint || ''; }
		if (!node) return false;
		var still = reducedMotion();
		node.scrollIntoView({ block: 'center', behavior: still ? 'auto' : 'smooth' });
		var target = node.querySelector('[aria-checked="true"], input[type="radio"]:checked') ||
			node.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex="0"]');
		if (target) target.focus({ preventScroll: true });
		node.classList.remove('is-found');
		void node.offsetWidth; // restart the mark when the same field is picked twice
		node.classList.add('is-found');
		setTimeout(function () { node.classList.remove('is-found'); }, 2000);
		var said = entry.where ? sprintf(__('%1$s, in %2$s', 'ar-vr-3d-model-try-on'), entry.label, entry.where) : entry.label;
		if (wp.a11y && wp.a11y.speak) wp.a11y.speak(hint ? said + '. ' + hint : said);
		return true;
	}

	/* ------------------------------------------------------------ the combobox */

	var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');

	function isTyping(node) {
		if (!node || !node.tagName) return false;
		var tag = node.tagName.toLowerCase();
		return tag === 'input' || tag === 'textarea' || tag === 'select' || node.isContentEditable;
	}

	/**
	 * The search box (WAI-ARIA 1.2 combobox with a list: focus stays in the box and
	 * aria-activedescendant names the active option).
	 * props: getIndex() → index, onPick( entry ), compact (below 960 px: an icon that opens the box).
	 */
	function Search(props) {
		var _q = useState(''), query = _q[0], setQuery = _q[1];
		var _open = useState(false), open = _open[0], setOpen = _open[1];
		var _active = useState(-1), active = _active[0], setActive = _active[1];
		var _shown = useState(false), shown = _shown[0], setShown = _shown[1]; // compact: the box is out
		var input = useRef(null), returnTo = useRef(null), indexRef = useRef(null), toggle = useRef(null);
		var compact = !!props.compact;

		function index() {
			if (!indexRef.current) indexRef.current = props.getIndex();
			return indexRef.current;
		}
		var result = open ? find(index(), query) : { groups: [], total: 0 };
		var flat = [];
		result.groups.forEach(function (g) { g.items.forEach(function (e) { flat.push(e); }); });

		// Ctrl/⌘+K and "/" focus the box on AtlasAR screens. The capture phase runs before
		// WordPress's own command palette, which would otherwise open on top.
		useEffect(function () {
			function onKey(e) {
				var k = e.key;
				var mod = (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (k === 'k' || k === 'K');
				var slash = k === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping(e.target);
				if (!mod && !slash) return;
				if (document.querySelector('.components-modal__screen-overlay')) return; // a WordPress window is open
				e.preventDefault();
				e.stopPropagation();
				if (document.activeElement !== input.current) returnTo.current = document.activeElement;
				setShown(true);
				setOpen(true);
				setTimeout(function () { if (input.current) input.current.focus(); }, 0);
			}
			window.addEventListener('keydown', onKey, true);
			return function () { window.removeEventListener('keydown', onKey, true); };
		}, []);

		// Screen readers: the number of results after a short pause (not every reader announces a changing list).
		useEffect(function () {
			if (!open || !query) return;
			var t = setTimeout(function () {
				if (!wp.a11y || !wp.a11y.speak) return;
				wp.a11y.speak(result.total ? sprintf(_n('%d result', '%d results', result.total, 'ar-vr-3d-model-try-on'), result.total) : __('No results', 'ar-vr-3d-model-try-on'));
			}, 600);
			return function () { clearTimeout(t); };
		}, [query, open, result.total]);

		// The active option stays in view inside the list.
		useEffect(function () {
			if (active < 0) return;
			var node = document.getElementById('atlas-ar-search-opt-' + active);
			if (node && node.scrollIntoView) node.scrollIntoView({ block: 'nearest' });
		}, [active]);

		function close() { setOpen(false); setActive(-1); }

		function collapse(restore) {
			close();
			setQuery('');
			if (compact) setShown(false);
			if (restore) {
				var back = returnTo.current;
				returnTo.current = null;
				if (back && back.focus && document.body.contains(back)) back.focus();
				else if (compact && toggle.current) toggle.current.focus();
			}
		}

		function pick(entry) {
			if (!entry) return;
			collapse(false);
			returnTo.current = null;
			props.onPick(entry);
		}

		function onKeyDown(e) {
			var n = flat.length;
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				if (!open) { setOpen(true); setActive(0); return; }
				setActive(n ? Math.min(active + 1, n - 1) : -1);
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				if (!open) { setOpen(true); return; }
				setActive(n ? Math.max(active - 1, 0) : -1);
			} else if (e.key === 'Enter') {
				if (!open) return;
				e.preventDefault();
				pick(active >= 0 ? flat[active] : flat[0]);
			} else if (e.key === 'Escape') {
				e.preventDefault();
				e.stopPropagation(); // the slide-in menu or a dropdown around us stays as it is
				if (open) close();
				else if (query) setQuery('');
				else collapse(true);
			} else if (e.key === 'Tab') {
				close();
			}
		}

		if (compact && !shown) {
			return el(C.Button, {
				ref: toggle, className: 'atlas-ar-hsearch-toggle', icon: el(UI.Icon, { name: 'search' }),
				label: __('Search', 'ar-vr-3d-model-try-on'), 'aria-expanded': 'false',
				onClick: function () { setShown(true); setTimeout(function () { if (input.current) input.current.focus(); }, 0); }
			});
		}

		var listId = 'atlas-ar-search-list';
		var hint = isMac ? '⌘K' : 'Ctrl K';
		var count = -1;
		return el('div', { className: 'atlas-ar-hsearch' + (compact ? ' is-floating' : ''), role: 'search', 'aria-label': __('AtlasAR', 'ar-vr-3d-model-try-on') },
			el('span', { className: 'atlas-ar-hsearch-icon' }, el(UI.Icon, { name: 'search', size: 20 })),
			el('input', {
				ref: input, type: 'search', role: 'combobox', className: 'atlas-ar-hsearch-input',
				placeholder: __('Search settings and screens…', 'ar-vr-3d-model-try-on'),
				'aria-label': __('Search settings and screens (Ctrl+K or /)', 'ar-vr-3d-model-try-on'),
				'aria-autocomplete': 'list', 'aria-expanded': open ? 'true' : 'false', 'aria-controls': listId,
				'aria-activedescendant': open && active >= 0 ? 'atlas-ar-search-opt-' + active : undefined,
				'aria-keyshortcuts': 'Control+K Meta+K /', autoComplete: 'off', spellCheck: false, value: query,
				onChange: function (e) { setQuery(e.target.value); setOpen(true); setActive(-1); },
				onKeyDown: onKeyDown,
				onClick: function () { if (!open) setOpen(true); },
				onBlur: function () {
					// Options are not focusable (mousedown keeps the focus here), so a blur means leaving the box.
					setTimeout(function () {
						if (input.current && document.activeElement === input.current) return;
						close();
						if (compact && !input.current.value) setShown(false);
					}, 0);
				}
			}),
			query ? null : el('kbd', { className: 'atlas-ar-hsearch-kbd', 'aria-hidden': 'true' }, hint),
			el('div', { className: 'atlas-ar-hsearch-pop', hidden: !open },
				el('div', { id: listId, role: 'listbox', 'aria-label': __('Search results', 'ar-vr-3d-model-try-on') },
					result.groups.map(function (g) {
						var gid = 'atlas-ar-search-g-' + g.id;
						return el('div', { key: g.id, role: 'group', 'aria-labelledby': gid, className: 'atlas-ar-hsearch-group' },
							el('div', { id: gid, role: 'presentation', className: 'atlas-ar-hsearch-heading' }, g.label),
							g.items.map(function (entry) {
								count++;
								var i = count;
								return el('div', {
									key: entry.id, id: 'atlas-ar-search-opt-' + i, role: 'option', 'aria-selected': i === active ? 'true' : 'false',
									className: 'atlas-ar-hsearch-option' + (i === active ? ' is-active' : ''),
									onMouseDown: function (e) { e.preventDefault(); },
									onMouseMove: function () { if (active !== i) setActive(i); },
									onClick: function () { pick(entry); }
								},
									el('span', { className: 'atlas-ar-hsearch-label' }, entry.label),
									entry.where ? el('small', { className: 'atlas-ar-hsearch-where' }, entry.where) : null,
									entry.href ? el('span', { className: 'screen-reader-text' }, __('(another page)', 'ar-vr-3d-model-try-on')) : null);
							}));
					})),
				open && query && !result.total ? el('div', { className: 'atlas-ar-hsearch-empty' },
					el('p', null, sprintf(__('Nothing matches “%s”. Try another word, for example “button”, “QR” or “privacy”.', 'ar-vr-3d-model-try-on'), query)),
					el(C.Button, {
						variant: 'secondary', onMouseDown: function (e) { e.preventDefault(); },
						onClick: function () { pick({ id: 'screen:help', kind: 'screen', screen: 'help', label: __('Help', 'ar-vr-3d-model-try-on') }); }
					}, __('Open Help', 'ar-vr-3d-model-try-on'))) : null));
	}

	Object.assign(UI.search, {
		normalise: normalise, tokens: tokens, matchWord: matchWord, buildIndex: buildIndex, find: find,
		safeHref: safeHref, isEntry: isEntry, focusField: focusField, Search: Search
	});
	Object.freeze(UI.search);
})(window.AtlasARAdminUI, window.wp);
