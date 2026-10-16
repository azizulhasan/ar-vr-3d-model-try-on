/**
 * AR-119: AtlasAR 3D Library — the admin page (AtlasAR › 3D Library) and the model picker the
 * product editor opens instead of the Media Library:
 *
 *   window.AtlasARLibrary.pick({ title, selected, onSelect(model) })
 *
 * Plain JavaScript on WordPress's own React (wp.element) and components; no build step.
 * Talks to the ar_try_on/v1/library REST routes (wp.apiFetch adds the REST nonce).
 */
(function (wp, config) {
	'use strict';
	if (!wp || !wp.element || !wp.components || !wp.apiFetch) return;

	var el = wp.element.createElement;
	var Fragment = wp.element.Fragment;
	var useState = wp.element.useState;
	var useEffect = wp.element.useEffect;
	var useRef = wp.element.useRef;
	var C = wp.components;
	var __ = wp.i18n.__;
	var sprintf = wp.i18n.sprintf;
	var _n = wp.i18n._n;
	var api = wp.apiFetch;
	var D = 'ar-vr-3d-model-try-on';
	config = config || {};

	var KIND_LABEL = { glb: 'GLB', usdz: 'USDZ', poster: __('Poster', D), source: __('Source', D) };
	var FILTERS = [
		['all', __('All', D)],
		['used', __('Used by products', D)],
		['unused', __('Not used', D)],
		['missing', __('Missing files', D)],
		['large', __('Large files', D)]
	];

	function size(bytes) {
		if (!bytes) return '0 KB';
		return bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
	}
	function message(err) {
		return (err && err.message) || __('Something went wrong. Please try again.', D);
	}
	function baseName(name) {
		return String(name).replace(/\.[^.]+$/, '').toLowerCase();
	}
	function extOf(name) {
		var m = /\.([^.]+)$/.exec(String(name));
		return m ? m[1].toLowerCase() : '';
	}
	function accepted(name) {
		return (config.accept || '').split(',').indexOf('.' + extOf(name)) !== -1;
	}
	function form(field, file) {
		var f = new FormData();
		f.append(field, file, file.name);
		return f;
	}

	/* ---------------------------------------------------------------- data */

	function list(args) {
		var q = '?filter=' + encodeURIComponent(args.filter || 'all') + '&search=' + encodeURIComponent(args.search || '') + '&per_page=100';
		return api({ path: '/ar_try_on/v1/library' + q });
	}

	/**
	 * Upload files one per request: the first file of each name group makes the model, the others
	 * join it (chair.glb + chair.usdz + chair.jpg = one model). onStatus(index, text, ok).
	 */
	function uploadAll(files, onStatus) {
		var groups = {};
		var order = [];
		files.forEach(function (file, i) {
			var b = baseName(file.name);
			if (!groups[b]) { groups[b] = []; order.push(b); }
			groups[b].push({ file: file, i: i });
		});
		var touched = [];
		return order.reduce(function (chain, b) {
			var modelId = 0;
			return groups[b].reduce(function (inner, item) {
				return inner.then(function () {
					var file = item.file;
					if (!accepted(file.name)) {
						onStatus(item.i, __('Not a 3D, iPhone AR or poster file.', D), false);
						return null;
					}
					if (config.maxBytes && file.size > config.maxBytes) {
						onStatus(item.i, sprintf(__('Larger than %s, the most this site takes.', D), size(config.maxBytes)), false);
						return null;
					}
					onStatus(item.i, __('Uploading…', D), null);
					var req = modelId
						? api({ path: '/ar_try_on/v1/library/' + modelId + '/files', method: 'POST', body: form('file', file) }).then(function (m) {
							return { model: m };
						})
						: api({ path: '/ar_try_on/v1/library', method: 'POST', body: form('files[]', file) }).then(function (res) {
							var r = res.results && res.results[0];
							if (!r || r.error) throw new Error(r ? r.error : '');
							return { model: res.models[0] };
						});
					return req.then(function (out) {
						modelId = out.model.id;
						if (touched.indexOf(modelId) === -1) touched.push(modelId);
						onStatus(item.i, sprintf(__('Added to “%s”', D), out.model.name), true);
					}, function (err) {
						onStatus(item.i, message(err), false);
					});
				});
			}, chain);
		}, Promise.resolve()).then(function () { return touched; });
	}

	/* ------------------------------------------------------------- pieces */

	function Chips(props) {
		var m = props.model;
		var chips = ['glb', 'usdz', 'poster'].filter(function (k) { return m.files[k]; }).map(function (k) {
			return el('span', { key: k, className: 'atlas-ar-chip atlas-ar-chip--' + k }, KIND_LABEL[k]);
		});
		if (m.files.source && !m.files.glb) chips.push(el('span', { key: 'src', className: 'atlas-ar-chip atlas-ar-chip--warn' }, __('Waiting to convert', D)));
		if (m.large) chips.push(el('span', { key: 'large', className: 'atlas-ar-chip atlas-ar-chip--warn' }, __('Large file', D)));
		return el('div', { className: 'atlas-ar-chips' }, chips);
	}

	function Thumb(props) {
		var m = props.model;
		if (m.files.poster) return el('img', { src: m.files.poster.url, alt: '', loading: 'lazy' });
		return el('span', { className: 'atlas-ar-thumb-icon', 'aria-hidden': 'true' }, '3D');
	}

	function usedText(m) {
		var n = m.used_by.length;
		return n ? sprintf(_n('%d product', '%d products', n, D), n) : __('not used', D);
	}

	function Card(props) {
		var m = props.model;
		return el('button', {
			type: 'button',
			className: 'atlas-ar-card' + (props.selected ? ' is-selected' : ''),
			'aria-pressed': props.selected ? 'true' : 'false',
			onClick: function () { props.onPick(m); },
			onDoubleClick: props.onUse ? function () { props.onUse(m); } : undefined
		},
			el('span', { className: 'atlas-ar-thumb' }, el(Thumb, { model: m })),
			el('span', { className: 'atlas-ar-card-name' }, m.name),
			el(Chips, { model: m }),
			el('span', { className: 'atlas-ar-card-meta' }, size(m.size) + ' · ' + usedText(m))
		);
	}

	function Preview(props) {
		var m = props.model;
		var ref = useRef(null);
		useEffect(function () {
			if (props.onHost) props.onHost(ref.current);
		}, [m.id]);
		if (!m.files.glb) {
			return el('div', { className: 'atlas-ar-preview atlas-ar-preview--empty' }, __('No GLB file yet.', D));
		}
		var attrs = {
			ref: ref,
			key: m.files.glb.url,
			src: m.files.glb.url,
			alt: m.name,
			load: 'immediate',
			qr: 'false',
			'ar-button': 'none',
			width: '100%',
			height: '240px',
			'auto-rotate': 'true'
		};
		if (m.files.usdz) attrs['ios-src'] = m.files.usdz.url;
		if (m.files.poster) attrs.poster = m.files.poster.url;
		return el('div', { className: 'atlas-ar-preview' }, el('atlasar-viewer', attrs));
	}

	/** A hidden file input behind a button. */
	function FileButton(props) {
		var ref = useRef(null);
		return el(Fragment, null,
			el(C.Button, { variant: props.variant || 'secondary', isBusy: props.busy, disabled: props.busy, onClick: function () { ref.current.click(); } }, props.children),
			el('input', {
				ref: ref, type: 'file', hidden: true, multiple: !!props.multiple, accept: props.accept || config.accept,
				onChange: function (e) {
					var files = Array.prototype.slice.call(e.target.files || []);
					e.target.value = '';
					if (files.length) props.onFiles(files);
				}
			})
		);
	}

	/* -------------------------------------------------------------- detail */

	function Detail(props) {
		var m = props.model;
		var _name = useState(m.name), name = _name[0], setName = _name[1];
		var _busy = useState(''), busy = _busy[0], setBusy = _busy[1];
		var _err = useState(''), err = _err[0], setErr = _err[1];
		var _confirm = useState(false), confirm = _confirm[0], setConfirm = _confirm[1];
		var host = useRef(null);
		useEffect(function () { setName(m.name); setErr(''); setConfirm(false); }, [m.id]);

		function run(what, promise) {
			setBusy(what); setErr('');
			return promise.then(function (res) { setBusy(''); return res; }, function (e) { setBusy(''); setErr(message(e)); throw e; });
		}
		function changed(model) { props.onChange(model); }
		function rename() {
			var v = name.trim();
			if (!v || v === m.name) { setName(m.name); return; }
			run('name', api({ path: '/ar_try_on/v1/library/' + m.id, method: 'POST', data: { name: v } })).then(changed, function () {});
		}
		function addFile(file) {
			run('file', api({ path: '/ar_try_on/v1/library/' + m.id + '/files', method: 'POST', body: form('file', file) })).then(changed, function () {});
		}
		function removeFile(kind) {
			run('file', api({ path: '/ar_try_on/v1/library/' + m.id + '/files/' + kind, method: 'DELETE' })).then(changed, function () {});
		}
		function posterFromView() {
			var h = host.current;
			var mv = h && h.modelViewer;
			if (!mv || typeof mv.toBlob !== 'function') { setErr(__('The 3D view is still loading. Try again in a moment.', D)); return; }
			run('poster', mv.toBlob({ mimeType: 'image/webp', idealAspect: true }).then(function (blob) {
				var file = new File([blob], (baseName(m.files.glb.name) || 'poster') + '.webp', { type: 'image/webp' });
				return api({ path: '/ar_try_on/v1/library/' + m.id + '/files', method: 'POST', body: form('file', file) });
			})).then(changed, function () {});
		}
		function remove() {
			run('delete', api({ path: '/ar_try_on/v1/library/' + m.id, method: 'DELETE' })).then(function () { props.onDeleted(m); }, function () {});
		}

		var files = ['glb', 'usdz', 'poster', 'source'].filter(function (k) { return m.files[k]; }).map(function (k) {
			var f = m.files[k];
			return el('li', { key: k, className: 'atlas-ar-file' },
				el('span', { className: 'atlas-ar-chip atlas-ar-chip--' + k }, KIND_LABEL[k]),
				el('a', { className: 'atlas-ar-file-name', href: f.url, target: '_blank', rel: 'noopener noreferrer' }, f.name),
				el('span', { className: 'atlas-ar-file-meta' }, size(f.size)),
				el(FileButton, { variant: 'link', busy: busy === 'file', accept: '.' + (k === 'glb' ? 'glb,.gltf' : k === 'usdz' ? 'usdz' : k === 'poster' ? 'jpg,.jpeg,.png,.webp' : 'obj,.fbx'), onFiles: function (fs) { addFile(fs[0]); } }, __('Replace', D)),
				k !== 'glb' ? el(C.Button, { variant: 'link', isDestructive: true, disabled: !!busy, onClick: function () { removeFile(k); } }, __('Remove', D)) : null
			);
		});
		var missing = m.missing.map(function (k) {
			if (k === 'usdz') {
				return el('li', { key: k, className: 'atlas-ar-missing' },
					el('span', null, __('No iPhone file (iPhones can still open AR from the GLB)', D)),
					el(FileButton, { variant: 'link', busy: busy === 'file', accept: '.usdz', onFiles: function (fs) { addFile(fs[0]); } }, __('Upload', D)));
			}
			if (k === 'poster') {
				return el('li', { key: k, className: 'atlas-ar-missing' },
					el('span', null, __('No poster image', D)),
					m.files.glb ? el(C.Button, { variant: 'link', isBusy: busy === 'poster', disabled: !!busy, onClick: posterFromView }, __('Take one from the 3D view', D)) : null,
					el(FileButton, { variant: 'link', busy: busy === 'file', accept: '.jpg,.jpeg,.png,.webp', onFiles: function (fs) { addFile(fs[0]); } }, __('Upload', D)));
			}
			return el('li', { key: k, className: 'atlas-ar-missing' },
				el('span', null, __('No GLB file: the model cannot be shown yet.', D)),
				el(FileButton, { variant: 'link', busy: busy === 'file', accept: '.glb,.gltf', onFiles: function (fs) { addFile(fs[0]); } }, __('Upload', D)));
		});
		var used = m.used_by.length;

		return el('aside', { className: 'atlas-ar-detail', 'aria-label': __('Model details', D) },
			el(Preview, { model: m, onHost: function (h) { host.current = h; } }),
			el(C.TextControl, {
				label: __('Name', D), value: name, onChange: setName, onBlur: rename,
				onKeyDown: function (e) { if (e.key === 'Enter') { e.preventDefault(); rename(); } }
			}),
			el('h3', null, __('Files', D)),
			el('ul', { className: 'atlas-ar-files' }, files, missing),
			el('h3', null, __('Used by', D)),
			used
				? el('ul', { className: 'atlas-ar-used' }, m.used_by.map(function (p) {
					return el('li', { key: p.id }, el('a', { href: 'post.php?post=' + p.id + '&action=edit' }, p.title || '#' + p.id));
				}))
				: el('p', { className: 'description' }, __('Not used yet.', D)),
			err ? el(C.Notice, { status: 'error', isDismissible: false }, err) : null,
			el('div', { className: 'atlas-ar-detail-actions' },
				props.onUse ? el(C.Button, { variant: 'primary', onClick: function () { props.onUse(m); }, disabled: !m.files.glb }, __('Use this model', D)) : null,
				!props.onUse && !confirm ? el(C.Button, {
					variant: 'secondary', isDestructive: true, disabled: !!busy || used > 0,
					onClick: function () { setConfirm(true); }
				}, __('Delete', D)) : null,
				!props.onUse && confirm ? el(Fragment, null,
					el('span', null, __('Delete this model and its files?', D)),
					el(C.Button, { variant: 'primary', isDestructive: true, isBusy: busy === 'delete', onClick: remove }, __('Delete', D)),
					el(C.Button, { variant: 'tertiary', onClick: function () { setConfirm(false); } }, __('Cancel', D))
				) : null
			),
			!props.onUse && used > 0 ? el('p', { className: 'description' }, __('A model that products use cannot be deleted. Choose another model for them first.', D)) : null
		);
	}

	/* -------------------------------------------------------------- upload */

	function Uploader(props) {
		var _rows = useState([]), rows = _rows[0], setRows = _rows[1];
		var _drag = useState(false), drag = _drag[0], setDrag = _drag[1];
		var _busy = useState(false), busy = _busy[0], setBusy = _busy[1];

		function start(files) {
			var base = rows.length;
			var next = rows.concat(files.map(function (f) { return { name: f.name, ext: extOf(f.name).toUpperCase(), text: __('Waiting…', D), ok: null }; }));
			setRows(next);
			setBusy(true);
			uploadAll(files, function (i, text, ok) {
				setRows(function (cur) {
					var copy = cur.slice();
					copy[base + i] = Object.assign({}, copy[base + i], { text: text, ok: ok });
					return copy;
				});
			}).then(function (ids) {
				setBusy(false);
				props.onDone(ids);
			});
		}

		return el('div', { className: 'atlas-ar-upload' },
			el('div', {
				className: 'atlas-ar-drop' + (drag ? ' is-over' : ''),
				onDragOver: function (e) { e.preventDefault(); setDrag(true); },
				onDragLeave: function () { setDrag(false); },
				onDrop: function (e) {
					e.preventDefault(); setDrag(false);
					var files = Array.prototype.slice.call((e.dataTransfer && e.dataTransfer.files) || []);
					if (files.length) start(files);
				}
			},
				el('strong', null, __('Drop files here', D)),
				el('p', null, __('Files with the same name become one model: chair.glb + chair.usdz + chair.jpg', D)),
				el(FileButton, { multiple: true, busy: busy, variant: 'primary', onFiles: start }, __('Choose files', D)),
				el('ul', { className: 'atlas-ar-kinds' },
					el('li', null, el('b', null, __('3D models:', D)), ' .glb, .gltf ', __('(a single-file .gltf)', D)),
					el('li', null, el('b', null, __('iPhone AR:', D)), ' .usdz'),
					el('li', null, el('b', null, __('Posters:', D)), ' .jpg, .png, .webp'),
					el('li', null, el('b', null, __('Converted to GLB by AtlasAR Cloud:', D)), ' .obj, .fbx')
				),
				config.maxBytes ? el('p', { className: 'description' }, sprintf(__('Up to %s per file.', D), size(config.maxBytes))) : null
			),
			rows.length ? el('ul', { className: 'atlas-ar-queue', 'aria-live': 'polite' }, rows.map(function (r, i) {
				return el('li', { key: i, className: r.ok === false ? 'is-error' : r.ok ? 'is-done' : '' },
					el('span', { className: 'atlas-ar-chip' }, r.ext || '?'),
					el('span', { className: 'atlas-ar-file-name' }, r.name),
					el('span', { className: 'atlas-ar-queue-status' }, r.text));
			})) : null
		);
	}

	/* ------------------------------------------------------------ browser */

	/** Search + filters + grid + detail; the page and the picker both use it. */
	function Browser(props) {
		var _items = useState(null), items = _items[0], setItems = _items[1];
		var _filter = useState('all'), filter = _filter[0], setFilter = _filter[1];
		var _search = useState(''), search = _search[0], setSearch = _search[1];
		var _sel = useState(props.selected || 0), sel = _sel[0], setSel = _sel[1];
		var _err = useState(''), err = _err[0], setErr = _err[1];
		var _up = useState(false), up = _up[0], setUp = _up[1];

		function load(keepSel) {
			return list({ filter: filter, search: search }).then(function (res) {
				setItems(res);
				setErr('');
				if (!keepSel && res.length && !res.some(function (m) { return m.id === sel; })) setSel(res[0].id);
			}, function (e) { setItems([]); setErr(message(e)); });
		}
		useEffect(function () {
			var t = setTimeout(function () { load(false); }, search ? 300 : 0);
			return function () { clearTimeout(t); };
		}, [filter, search]);

		function replace(model) {
			setItems(function (cur) { return (cur || []).map(function (m) { return m.id === model.id ? model : m; }); });
		}
		var current = (items || []).filter(function (m) { return m.id === sel; })[0];

		return el('div', { className: 'atlas-ar-browser' },
			el('div', { className: 'atlas-ar-toolbar' },
				el('div', { className: 'atlas-ar-search' },
					el(C.SearchControl, { label: __('Search 3D models', D), value: search, onChange: setSearch, __nextHasNoMarginBottom: true })),
				el('div', { className: 'atlas-ar-filters', role: 'group', 'aria-label': __('Show', D) }, FILTERS.map(function (f) {
					return el('button', {
						key: f[0], type: 'button', className: 'atlas-ar-filter' + (filter === f[0] ? ' is-on' : ''),
						'aria-pressed': filter === f[0] ? 'true' : 'false', onClick: function () { setFilter(f[0]); }
					}, f[1]);
				})),
				el(C.Button, { variant: up ? 'secondary' : 'primary', onClick: function () { setUp(!up); } }, up ? __('Close upload', D) : (props.onUse ? __('Upload new', D) : __('Upload 3D files', D)))
			),
			up ? el(Uploader, {
				onDone: function (ids) {
					load(true).then(function () { if (ids.length) setSel(ids[ids.length - 1]); });
				}
			}) : null,
			err ? el(C.Notice, { status: 'error', isDismissible: false }, err) : null,
			el('div', { className: 'atlas-ar-body' },
				el('div', { className: 'atlas-ar-grid-wrap' },
					items === null ? el(C.Spinner, null)
						: items.length ? el('div', { className: 'atlas-ar-grid' }, items.map(function (m) {
							return el(Card, { key: m.id, model: m, selected: m.id === sel, onPick: function () { setSel(m.id); }, onUse: props.onUse });
						}))
							: el('div', { className: 'atlas-ar-empty' },
								el('p', null, search || filter !== 'all' ? __('No models match.', D) : __('No 3D models yet. Upload a GLB file to start.', D)),
								!up && !search && filter === 'all' ? el(C.Button, { variant: 'primary', onClick: function () { setUp(true); } }, __('Upload 3D files', D)) : null)
				),
				current ? el(Detail, {
					key: current.id, model: current, onChange: replace, onUse: props.onUse,
					onDeleted: function () { setSel(0); load(false); }
				}) : null
			)
		);
	}

	/* ----------------------------------------------------------- page + picker */

	function Page() {
		return el('div', { className: 'atlas-ar-library' },
			el('h1', { className: 'wp-heading-inline' }, __('3D Library', D)),
			el('p', { className: 'atlas-ar-lead' }, __('All your 3D models and their files in one place: GLB, iPhone USDZ and poster images. Kept apart from the Media Library.', D)),
			el(Browser, null)
		);
	}

	function Picker(props) {
		return el(C.Modal, {
			title: props.title || __('Choose a 3D model', D),
			onRequestClose: props.onClose,
			className: 'atlas-ar-picker',
			isFullScreen: false,
			size: 'large'
		}, el('div', { className: 'atlas-ar-library' }, el(Browser, {
			selected: props.selected,
			onUse: function (m) { props.onSelect(m); props.onClose(); }
		})));
	}

	function mount(node, child) {
		if (wp.element.createRoot) {
			var root = wp.element.createRoot(node);
			root.render(child);
			return function () { root.unmount(); };
		}
		wp.element.render(child, node);
		return function () { wp.element.unmountComponentAtNode(node); };
	}

	window.AtlasARLibrary = Object.freeze({
		/** Open the picker: options { title, selected (model id), onSelect(model) }. */
		pick: function (options) {
			options = options || {};
			var node = document.createElement('div');
			document.body.appendChild(node);
			var unmount = null;
			var close = function () {
				if (unmount) unmount();
				node.remove();
				if (options.returnFocus && options.returnFocus.focus) options.returnFocus.focus();
			};
			unmount = mount(node, el(Picker, {
				title: options.title, selected: options.selected,
				onSelect: function (m) { if (typeof options.onSelect === 'function') options.onSelect(m); },
				onClose: close
			}));
			return close;
		}
	});

	function start() {
		var node = document.getElementById('atlas-ar-library');
		if (node) mount(node, el(Page));
	}
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
	else start();
})(window.wp, window.atlasArLibrary);
