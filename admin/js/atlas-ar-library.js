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

	var KIND_LABEL = { glb: 'GLB', usdz: 'USDZ', poster: __('Poster', D), source: __('Source', D), original: __('Original', D) };
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

	/* ------------------------------------------------------------- optimise */

	function sdkTools() {
		var sdk = window.AtlasARViewer;
		return sdk && sdk.tools ? sdk.tools : null;
	}
	var STEP = {
		read: __('Reading the model…', D), geometry: __('Simplifying the shape…', D), textures: __('Making textures smaller…', D),
		compress: __('Compressing…', D), done: __('Saving…', D)
	};
	function fetchBlob(url) {
		return fetch(url, { credentials: 'same-origin' }).then(function (r) {
			if (!r.ok) throw new Error(sprintf(__('The file could not be read (%d).', D), r.status));
			return r.blob();
		});
	}

	/**
	 * AR-121: optimise a model's GLB in this browser (AtlasAR.tools.optimise) and keep the result
	 * when it is smaller (or when a real height was given). Resolves the model, or null when the
	 * file was already as small as it gets.
	 */
	function optimiseModel(m, heightCm, onStep) {
		var tools = sdkTools();
		if (!tools) return Promise.reject(new Error(__('The AtlasAR viewer did not load. Reload the page and try again.', D)));
		var src = m.files.original || m.files.glb;
		if (!src) return Promise.reject(new Error(__('This model has no GLB file.', D)));
		onStep && onStep(STEP.read);
		return fetchBlob(src.url).then(function (blob) {
			return tools.optimise(blob, { heightCm: heightCm || 0, onProgress: function (st) { if (onStep && STEP[st]) onStep(STEP[st]); } });
		}).then(function (res) {
			if (!heightCm && res.blob.size >= (m.files.glb ? m.files.glb.size : src.size)) return null;
			var f = new FormData();
			f.append('file', new File([res.blob], baseName(src.name || 'model') + '.glb', { type: 'model/gltf-binary' }));
			f.append('triangles', String(res.stats.triangles));
			f.append('budget', res.budget);
			if (heightCm) f.append('height_cm', String(heightCm));
			return api({ path: '/ar_try_on/v1/library/' + m.id + '/optimised', method: 'POST', body: f });
		});
	}

	/** AR-121: an OBJ / FBX source file → GLB in this browser, added to the model. */
	function convertModel(m, onStep) {
		var tools = sdkTools();
		if (!tools) return Promise.reject(new Error(__('The AtlasAR viewer did not load. Reload the page and try again.', D)));
		onStep && onStep(__('Converting to GLB…', D));
		return fetchBlob(m.files.source.url).then(function (blob) {
			return tools.convert(new File([blob], m.files.source.name));
		}).then(function (glb) {
			var f = new FormData();
			f.append('file', new File([glb], baseName(m.files.source.name) + '.glb', { type: 'model/gltf-binary' }), baseName(m.files.source.name) + '.glb');
			return api({ path: '/ar_try_on/v1/library/' + m.id + '/files', method: 'POST', body: f });
		});
	}

	/* ---------------------------------------------------------------- data */

	var PER_PAGE = 40;

	/** One page of models: { items, total } (the total from the X-WP-Total header). */
	function list(args) {
		var q = '?filter=' + encodeURIComponent(args.filter || 'all') + '&search=' + encodeURIComponent(args.search || '') + '&page=' + (args.page || 1) + '&per_page=' + PER_PAGE;
		return api({ path: '/ar_try_on/v1/library' + q, parse: false }).then(function (res) {
			return res.json().then(function (items) {
				return { items: items, total: parseInt(res.headers.get('X-WP-Total') || '0', 10) || items.length };
			});
		}, function (res) {
			// parse:false hands back the raw response on errors too: read the WordPress error from it.
			return res && typeof res.json === 'function' ? res.json().then(function (e) { throw e; }) : Promise.reject(res);
		});
	}

	/**
	 * Upload files one per request: the first file of each name group makes the model, the others
	 * join it (chair.glb + chair.usdz + chair.jpg = one model). onStatus(index, text, ok).
	 */
	/**
	 * AR-151: why a file is not taken, and what to do instead (by its extension).
	 * The 3D Library takes GLB / single-file glTF, USDZ, posters, and OBJ / FBX (converted here).
	 */
	function notTakenText(name) {
		var ext = extOf(name);
		if (['stl', 'ply', '3ds', 'dae', 'blend', 'step', 'stp', 'iges', 'igs', '3mf', 'max', 'c4d', 'skp', 'x3d', 'wrl', 'usd', 'usda', 'usdc', 'ma', 'mb'].indexOf(ext) !== -1) {
			return sprintf(__('.%s is not taken: convert it to GLB first. Free with Blender: File › Import, then File › Export › glTF 2.0 (.glb).', D), ext);
		}
		if (ext === 'zip') return __('ZIP files are not taken: unzip it and upload the .glb (or .gltf, .obj, .fbx) inside.', D);
		if (ext === 'bin') return __('A .bin file belongs to a multi-file glTF: export the model as one .glb file instead.', D);
		return __('Not a 3D, iPhone AR or poster file.', D);
	}

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
						onStatus(item.i, notTakenText(file.name), false);
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
						// AR-121: Settings › "Optimise every new model when it is added".
						if (config.autoOptimise && extOf(file.name) === 'glb' && file.size > 512 * 1024 && sdkTools()) {
							onStatus(item.i, __('Optimising…', D), null);
							return optimiseModel(out.model, 0, function (t) { onStatus(item.i, t, null); }).then(function (m2) {
								onStatus(item.i, m2 && m2.optimised
									? sprintf(__('Added and optimised: %1$s → %2$s', D), size(m2.optimised.before), size(m2.optimised.after))
									: sprintf(__('Added to “%s” (already small)', D), out.model.name), true);
							}, function () {
								onStatus(item.i, sprintf(__('Added to “%s” (not optimised)', D), out.model.name), true);
							});
						}
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

		var files = ['glb', 'usdz', 'poster', 'source', 'original'].filter(function (k) { return m.files[k]; }).map(function (k) {
			var f = m.files[k];
			if (k === 'original') {
				return el('li', { key: k, className: 'atlas-ar-file' },
					el('span', { className: 'atlas-ar-chip' }, KIND_LABEL[k]),
					el('a', { className: 'atlas-ar-file-name', href: f.url, target: '_blank', rel: 'noopener noreferrer' }, f.name),
					el('span', { className: 'atlas-ar-file-meta' }, size(f.size) + ' · ' + __('before Optimise', D)));
			}
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
					el('span', null, __('No iPhone file: iPhones still open AR, made from the GLB. For the best iPhone quality, upload a .usdz with the same name (Reality Converter on a Mac, or Blender’s USD export).', D)),
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
		var _h = useState(''), heightCm = _h[0], setHeightCm = _h[1];
		var _step = useState(''), step = _step[0], setStep = _step[1];
		function optimise() {
			run('optimise', optimiseModel(m, parseFloat(heightCm) || 0, setStep)).then(function (res) {
				setStep(res ? '' : __('This model is already as small as it gets.', D));
				if (res) changed(res);
			}, function () { setStep(''); });
		}
		function restore() {
			run('optimise', api({ path: '/ar_try_on/v1/library/' + m.id + '/restore', method: 'POST' })).then(changed, function () {});
		}
		function convert() {
			run('convert', convertModel(m, setStep)).then(function (res) { setStep(''); changed(res); }, function () { setStep(''); });
		}
		function cloudOptimise() {
			setStep(__('Sending to AtlasAR Cloud…', D));
			run('cloud', api({ path: '/ar_try_on/v1/library/' + m.id + '/cloud', method: 'POST', data: { height_cm: parseFloat(heightCm) || 0 } }).then(function () {
				setStep(__('AtlasAR Cloud is optimising the model…', D));
				return new Promise(function (resolve, reject) {
					var tries = 0;
					(function poll() {
						api({ path: '/ar_try_on/v1/library/' + m.id + '/cloud' }).then(function (res) {
							if (res.status === 'ready') return resolve(res.model);
							if (++tries > 120) return reject(new Error(__('AtlasAR Cloud is taking long. Check again later.', D)));
							setTimeout(poll, 5000);
						}, reject);
					})();
				});
			})).then(function (model) { setStep(''); changed(model); }, function () { setStep(''); });
		}
		var o = m.optimised;
		var optimiseBox = m.files.glb ? el('div', { className: 'atlas-ar-optimise' },
			el('h3', null, __('Make it smaller', D)),
			o ? el('p', { className: 'atlas-ar-saved' },
				sprintf(o.by === 'cloud' ? __('Optimised on AtlasAR Cloud: %1$s → %2$s', D) : __('Optimised in this browser: %1$s → %2$s', D), size(o.before), size(o.after)),
				o.height_cm ? ' · ' + sprintf(__('real height %s cm', D), o.height_cm) : '') : null,
			el('p', { className: 'description' }, config.cloud
				? __('Smaller files load faster. "Optimise" runs in this browser: nothing is uploaded. "Optimise on AtlasAR Cloud" sends the file to AtlasAR Cloud (also for very big files). The original file is kept.', D)
				: __('Smaller files load faster. Runs in this browser: nothing is uploaded anywhere. The original file is kept.', D)),
			el('div', { className: 'atlas-ar-row' },
				el(C.TextControl, {
					label: __('Real height (cm), optional', D),
					type: 'number', min: 0.5, max: 1000, step: 0.1, value: heightCm, onChange: setHeightCm,
					help: __('E.g. 32 for a 32 cm vase: the model is made exactly that size in AR. Leave it empty to keep the model’s own size.', D)
				})),
			el('div', { className: 'atlas-ar-row' },
				el(C.Button, { variant: 'primary', isBusy: busy === 'optimise', disabled: !!busy, onClick: optimise }, o ? __('Optimise again', D) : __('Optimise', D)),
				config.cloud ? el(C.Button, { variant: 'secondary', isBusy: busy === 'cloud', disabled: !!busy, onClick: cloudOptimise }, __('Optimise on AtlasAR Cloud', D)) : null,
				m.files.original ? el(C.Button, { variant: 'tertiary', disabled: !!busy, onClick: restore }, __('Restore the original', D)) : null),
			step ? el('p', { className: 'atlas-ar-step', role: 'status' }, step) : null) : null;
		var convertBox = m.files.source && !m.files.glb ? el('div', { className: 'atlas-ar-optimise' },
			el('h3', null, __('Convert to GLB', D)),
			el('p', { className: 'description' }, __('Turns the OBJ / FBX file into a GLB in this browser. Textures inside the file are kept.', D)),
			el(C.Button, { variant: 'primary', isBusy: busy === 'convert', disabled: !!busy, onClick: convert }, __('Convert to GLB', D)),
			step ? el('p', { className: 'atlas-ar-step', role: 'status' }, step) : null) : null;

		return el('aside', { className: 'atlas-ar-detail', 'aria-label': __('Model details', D) },
			el(Preview, { model: m, onHost: function (h) { host.current = h; } }),
			el(C.TextControl, {
				label: __('Name', D), value: name, onChange: setName, onBlur: rename,
				onKeyDown: function (e) { if (e.key === 'Enter') { e.preventDefault(); rename(); } }
			}),
			el('h3', null, __('Files', D)),
			el('ul', { className: 'atlas-ar-files' }, files, missing),
			convertBox,
			optimiseBox,
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
					el('li', null, el('b', null, __('Converted to GLB in your browser:', D)), ' .obj, .fbx'),
					// AR-151: everything else, and the iPhone file.
					el('li', null, el('b', null, __('Other formats', D)), ' (STL, DAE, 3DS, BLEND, STEP…): ', __('convert to GLB first, free with Blender (File › Export › glTF 2.0).', D))
				),
				el('p', { className: 'description' }, __('iPhone AR: a .usdz is optional. Without one, iPhones make it from the GLB. For the best iPhone quality, upload a .usdz with the same name as the GLB (make one with Apple’s Reality Converter on a Mac, or Blender’s USD export).', D)),
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

	/* ---------------------------------------------------- free 3D model library */

	var FREE = '/ar_try_on/v1/library/free';

	/**
	 * AR-144: "Free 3D models": search AtlasAR Cloud's free library and download a model into this
	 * 3D Library with one click. Needs a connected AtlasAR Cloud account (any plan); nothing is used.
	 */
	function FreeModels(props) {
		var _q = useState(''), q = _q[0], setQ = _q[1];
		var _cat = useState(''), cat = _cat[0], setCat = _cat[1];
		var _page = useState(1), page = _page[0], setPage = _page[1];
		var _res = useState(null), res = _res[0], setRes = _res[1];
		var _cats = useState({}), cats = _cats[0], setCats = _cats[1];
		var _err = useState(''), err = _err[0], setErr = _err[1];
		var _busy = useState(''), busy = _busy[0], setBusy = _busy[1];
		var _got = useState({}), got = _got[0], setGot = _got[1]; // lib id → 3D Library model id
		var req = useRef(0);

		useEffect(function () { setPage(1); }, [q, cat]);
		useEffect(function () {
			if (!config.cloud) return undefined;
			var mine = ++req.current;
			var t = setTimeout(function () {
				setErr('');
				api({ path: FREE + '?' + new URLSearchParams({ q: q, category: cat, page: String(page) }).toString() }).then(function (r) {
					if (mine !== req.current) return;
					setRes(r);
					if (r.categories && Object.keys(r.categories).length) setCats(r.categories);
				}, function (e) { if (mine === req.current) { setRes({ data: [], total: 0 }); setErr(message(e)); } });
			}, q ? 350 : 0);
			return function () { clearTimeout(t); };
		}, [q, cat, page]);

		function download(m) {
			setBusy(m.id); setErr('');
			api({ path: FREE + '/' + m.id, method: 'POST' }).then(function (model) {
				setBusy('');
				setGot(function (cur) { var n = Object.assign({}, cur); n[m.id] = model.id; return n; });
				props.api.done([model.id]);
			}, function (e) { setBusy(''); setErr(message(e)); });
		}

		var head = el('div', { className: 'atlas-ar-free-head' },
			el('h2', null, __('Free 3D models', D)),
			el(C.Button, { variant: 'tertiary', onClick: props.api.close }, __('Close', D)));
		var lead = el('p', { className: 'description' }, __('Ready-made, optimised 3D models from the AtlasAR Cloud library, free to use on your site. Download one and it is added to your 3D Library, ready to show on a product.', D));

		if (!config.cloud) {
			return el(Fragment, null, head, lead,
				el('p', null, config.canConnect
					? el(Fragment, null, __('The free library comes with AtlasAR Cloud (free plan included).', D), ' ', el('a', { href: config.integrationsUrl }, __('Connect AtlasAR Cloud in AtlasAR › Integrations', D)))
					: __('Ask an administrator to connect AtlasAR Cloud in AtlasAR › Integrations to use the free library.', D)));
		}

		var list = res ? res.data : null;
		var pages = res ? Math.max(1, Math.ceil(res.total / 24)) : 1;
		return el(Fragment, null, head, lead,
			el('div', { className: 'atlas-ar-free-tools' },
				el('div', { className: 'atlas-ar-search' }, el(C.SearchControl, { label: __('Search free 3D models', D), value: q, onChange: setQ, __nextHasNoMarginBottom: true })),
				el(C.SelectControl, {
					label: __('Category', D), hideLabelFromVision: true, value: cat, onChange: setCat, __nextHasNoMarginBottom: true,
					options: [{ value: '', label: __('All categories', D) }].concat(Object.keys(cats).map(function (k) { return { value: k, label: cats[k] }; }))
				})),
			err ? el(C.Notice, { status: 'error', isDismissible: false }, err) : null,
			list === null ? el('p', { className: 'atlas-ar-loading', role: 'status' }, el(C.Spinner, null), __('Loading…', D))
				: !list.length ? el('p', { className: 'description' }, q || cat ? __('No free models match. Try other words.', D) : __('The free library is empty for now. New models are added regularly.', D))
				: el('ul', { className: 'atlas-ar-free-grid' }, list.map(function (m) {
					var have = got[m.id] || m.imported;
					return el('li', { key: m.id, className: 'atlas-ar-free-card' },
						m.poster_url ? el('img', { src: m.poster_url, alt: '', loading: 'lazy', width: 160, height: 160 }) : el('span', { className: 'atlas-ar-free-noimg', 'aria-hidden': 'true' }, '3D'),
						el('strong', null, m.name),
						el('span', { className: 'atlas-ar-muted' }, [m.category, size(m.size), m.height_cm ? sprintf(__('%s cm tall', D), m.height_cm) : ''].filter(Boolean).join(' · ')),
						el('span', { className: 'atlas-ar-muted', title: m.license_label }, m.credit ? sprintf(__('%1$s · by %2$s', D), m.license, m.credit) : m.license),
						have ? el('span', { className: 'atlas-ar-saved' }, '✓ ', __('In your 3D Library', D))
							: el(C.Button, { variant: 'secondary', isBusy: busy === m.id, disabled: !!busy, onClick: function () { download(m); }, 'aria-label': sprintf(__('Download %s', D), m.name) }, busy === m.id ? __('Downloading…', D) : __('Download', D)));
				})),
			pages > 1 ? el('nav', { className: 'atlas-ar-library-pager', 'aria-label': __('Free 3D models pages', D) },
				el(C.Button, { variant: 'secondary', disabled: page <= 1, onClick: function () { setPage(page - 1); } }, __('Previous', D)),
				el('span', { 'aria-live': 'polite' }, sprintf(__('Page %1$d of %2$d', D), page, pages)),
				el(C.Button, { variant: 'secondary', disabled: page >= pages, onClick: function () { setPage(page + 1); } }, __('Next', D))) : null,
			el('p', { className: 'description' }, __('Only your search words are sent to AtlasAR Cloud. Downloads are free and do not use your monthly optimisations.', D)));
	}

	if (wp.hooks && config.cloudAvailable) {
		wp.hooks.addFilter('atlasAr.library.actions', 'atlas-ar/free-models', function (actions) {
			return [{ id: 'free-models', label: __('Free 3D models', D), render: FreeModels }].concat(actions);
		});
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

		var _loading = useState(true), loading = _loading[0], setLoading = _loading[1];
		var _page = useState(1), page = _page[0], setPage = _page[1];
		var _total = useState(0), total = _total[0], setTotal = _total[1];
		var pages = Math.max(1, Math.ceil(total / PER_PAGE));
		var req = useRef(0);
		var grid = useRef(null);
		function load(keepSel, at) {
			var mine = ++req.current; // only the newest answer is shown (quick filter clicks)
			var p = at || page;
			setLoading(true);
			return list({ filter: filter, search: search, page: p }).then(function (res) {
				if (mine !== req.current) return;
				// The last page emptied (e.g. its only model was deleted): show the one before.
				if (!res.items.length && p > 1) { setPage(p - 1); return; }
				setItems(res.items);
				setTotal(res.total);
				setErr('');
				setLoading(false);
				if (!keepSel && res.items.length && !res.items.some(function (m) { return m.id === sel; })) setSel(res.items[0].id);
			}, function (e) { if (mine !== req.current) return; setItems([]); setTotal(0); setErr(message(e)); setLoading(false); });
		}
		// A new filter or search starts again at page 1.
		useEffect(function () { setPage(1); }, [filter, search]);
		useEffect(function () {
			var t = setTimeout(function () { load(false); }, search ? 300 : 0);
			return function () { clearTimeout(t); };
		}, [filter, search, page]);
		function go(p) {
			setPage(p);
			if (grid.current) grid.current.scrollTop = 0;
		}

		function replace(model) {
			setItems(function (cur) { return (cur || []).map(function (m) { return m.id === model.id ? model : m; }); });
		}
		var current = (items || []).filter(function (m) { return m.id === sel; })[0];

		/**
		 * More ways to add models, next to "Upload 3D files" (AtlasAR Pro: "Make with AI").
		 * Filter atlasAr.library.actions: [{ id, label, render }]; render is a component that gets
		 * { api }: api.done(ids) shows the new models (page 1, the last one selected), api.close()
		 * closes the panel.
		 */
		var actions = wp.hooks ? wp.hooks.applyFilters('atlasAr.library.actions', [], { picker: !!props.onUse }) : [];
		var _open = useState(''), open = _open[0], setOpen = _open[1];
		var openAction = actions.filter(function (a) { return a.id === open; })[0];
		var actionApi = {
			close: function () { setOpen(''); },
			done: function (ids) {
				setPage(1);
				return load(true, 1).then(function () { if (ids && ids.length) setSel(ids[ids.length - 1]); });
			}
		};

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
				loading && items !== null ? el('span', { className: 'atlas-ar-loading', role: 'status' }, el(C.Spinner, null), __('Loading…', D)) : null,
				actions.map(function (a) {
					return el(C.Button, { key: a.id, variant: 'secondary', 'aria-expanded': open === a.id ? 'true' : 'false', onClick: function () { setUp(false); setOpen(open === a.id ? '' : a.id); } }, a.label);
				}),
				el(C.Button, { variant: up ? 'secondary' : 'primary', onClick: function () { setOpen(''); setUp(!up); } }, up ? __('Close upload', D) : (props.onUse ? __('Upload new', D) : __('Upload 3D files', D)))
			),
			openAction ? el('div', { className: 'atlas-ar-library-action' }, el(openAction.render, { key: openAction.id, api: actionApi })) : null,
			up ? el(Uploader, {
				onDone: function (ids) {
					// New models are the newest: show page 1, where they are.
					setPage(1);
					load(true, 1).then(function () { if (ids.length) setSel(ids[ids.length - 1]); });
				}
			}) : null,
			err ? el(C.Notice, { status: 'error', isDismissible: false }, err) : null,
			el('div', { className: 'atlas-ar-body' },
				el('div', { className: 'atlas-ar-grid-wrap' + (loading ? ' is-loading' : ''), 'aria-busy': loading ? 'true' : 'false', ref: grid },
					items === null ? el('p', { className: 'atlas-ar-loading', role: 'status' }, el(C.Spinner, null), __('Loading…', D))
						: items.length ? el('div', { className: 'atlas-ar-grid' }, items.map(function (m) {
							return el(Card, { key: m.id, model: m, selected: m.id === sel, onPick: function () { setSel(m.id); }, onUse: props.onUse });
						}))
							: el('div', { className: 'atlas-ar-empty' },
								el('p', null, search || filter !== 'all' ? __('No models match.', D) : __('No 3D models yet. Upload a GLB file to start.', D)),
								!up && !search && filter === 'all' ? el(C.Button, { variant: 'primary', onClick: function () { setUp(true); } }, __('Upload 3D files', D)) : null),
					total > PER_PAGE ? el('nav', { className: 'atlas-ar-library-pager', 'aria-label': __('3D models pages', D) },
						el('span', { className: 'atlas-ar-muted' }, sprintf(_n('%s model', '%s models', total, D), total)),
						el(C.Button, { variant: 'secondary', disabled: page <= 1 || loading, onClick: function () { go(page - 1); } }, __('Previous', D)),
						el('span', { 'aria-live': 'polite' }, sprintf(__('Page %1$d of %2$d', D), page, pages)),
						el(C.Button, { variant: 'secondary', disabled: page >= pages || loading, onClick: function () { go(page + 1); } }, __('Next', D))) : null
				),
				current ? el(Detail, {
					key: current.id, model: current, onChange: replace, onUse: props.onUse,
					onDeleted: function () { setSel(0); load(false); }
				}) : null
			)
		);
	}

	/* ----------------------------------------------------------- page + picker */

	/** AR-146: what AtlasAR Pro adds in the 3D Library (hidden when Pro is active: atlasAr.proNotes). */
	function ProNote() {
		if (!config.proUrl || (wp.hooks && wp.hooks.applyFilters('atlasAr.proNotes', true) === false)) return null;
		return el('div', { className: 'atlas-ar-pro-note' },
			el('p', null, el('span', { className: 'atlas-ar-badge atlas-ar-badge--pro' }, 'Pro'), ' ', __('More in the 3D Library with AtlasAR Pro:', D)),
			el('ul', null,
				el('li', null, __('Make with AI: a 3D model from a product photo or a description (AtlasAR Cloud, Meshy AI, Tripo3D), straight into this library.', D)),
				el('li', null, __('Optimise in bulk: every large file made lighter at once, in the background.', D)),
				el('li', null, __('AtlasAR Cloud Premium: no monthly limit on optimisations.', D))),
			el('a', { href: config.proUrl, target: '_blank', rel: 'noopener noreferrer' }, __('See AtlasAR Pro', D), el('span', { className: 'screen-reader-text' }, __('(opens in a new tab)', D))));
	}

	function Page() {
		return el('div', { className: 'atlas-ar-library' },
			el('h1', { className: 'wp-heading-inline' }, __('3D Library', D), config.brand && config.brand.name ? el('span', { className: 'atlas-ar-library-brand' }, config.brand.name) : null),
			el('p', { className: 'atlas-ar-lead' }, __('All your 3D models and their files in one place: GLB, iPhone USDZ and poster images. Kept apart from the Media Library.', D)),
			el(Browser, null),
			el(ProNote, null)
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
