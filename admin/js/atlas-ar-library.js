/**
 * AR-119: AtlasAR 3D Library — the admin page (AtlasAR › 3D Library) and the model picker the
 * product editor opens instead of the Media Library:
 *
 *   window.AtlasARLibrary.pick({ title, selected, onSelect(model) })
 *   window.AtlasARLibrary.flat({ name, onDone({ kind, model }) })   (AR-159: a 3D model from a photo)
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
	config = config || {};

	var KIND_LABEL = { glb: 'GLB', usdz: 'USDZ', poster: __('Poster', 'ar-vr-3d-model-try-on'), source: __('Source', 'ar-vr-3d-model-try-on'), original: __('Original', 'ar-vr-3d-model-try-on') };
	var FILTERS = [
		['all', __('All', 'ar-vr-3d-model-try-on')],
		['used', __('Used by products', 'ar-vr-3d-model-try-on')],
		['unused', __('Not used', 'ar-vr-3d-model-try-on')],
		['missing', __('Missing files', 'ar-vr-3d-model-try-on')],
		['large', __('Large files', 'ar-vr-3d-model-try-on')]
	];

	function size(bytes) {
		if (!bytes) return '0 KB';
		return bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
	}
	// Page-speed proof: how long a file takes on a typical phone connection (10 Mbit/s, about 1.25 MB a second).
	var PHONE_BYTES_PER_S = 1250000;
	function loadTime(bytes) {
		var s = (bytes || 0) / PHONE_BYTES_PER_S;
		return s < 1 ? __('under 1 s', 'ar-vr-3d-model-try-on') : sprintf(__('%s s', 'ar-vr-3d-model-try-on'), s < 10 ? s.toFixed(1) : Math.round(s));
	}
	/** "92 % smaller" for an optimised model, or ''. */
	function savedPct(o) {
		if (!o || !o.before || !o.after || o.after >= o.before) return '';
		return Math.round(100 * (1 - o.after / o.before));
	}
	function message(err) {
		return (err && err.message) || __('Something went wrong. Please try again.', 'ar-vr-3d-model-try-on');
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
		read: __('Reading the model…', 'ar-vr-3d-model-try-on'), geometry: __('Simplifying the shape…', 'ar-vr-3d-model-try-on'), textures: __('Making textures smaller…', 'ar-vr-3d-model-try-on'),
		compress: __('Compressing…', 'ar-vr-3d-model-try-on'), done: __('Saving…', 'ar-vr-3d-model-try-on')
	};
	function fetchBlob(url) {
		return fetch(url, { credentials: 'same-origin' }).then(function (r) {
			if (!r.ok) throw new Error(sprintf(__('The file could not be read (%d).', 'ar-vr-3d-model-try-on'), r.status));
			return r.blob();
		});
	}

	/**
	 * AR-162: optimisation levels (the viewer SDK's AtlasAR.tools.levels); high = as before levels.
	 * The released plugin's quality slider had the same five bands.
	 */
	var LEVELS = [
		{ value: 'maximum', label: __('Maximum quality', 'ar-vr-3d-model-try-on'), text: __('Up to 150,000 triangles, textures up to 4096 px. Largest files; for close-up detail.', 'ar-vr-3d-model-try-on') },
		{ value: 'high', label: __('High (recommended)', 'ar-vr-3d-model-try-on'), text: __('Up to 50,000 triangles, textures up to 2048 px. Looks the same, loads fast.', 'ar-vr-3d-model-try-on') },
		{ value: 'balanced', label: __('Balanced', 'ar-vr-3d-model-try-on'), text: __('Up to 30,000 triangles, textures up to 1024 px. Smaller files, small details soften.', 'ar-vr-3d-model-try-on') },
		{ value: 'low', label: __('Low', 'ar-vr-3d-model-try-on'), text: __('Up to 15,000 triangles, textures up to 1024 px. Small files for slow connections.', 'ar-vr-3d-model-try-on') },
		{ value: 'minimum', label: __('Smallest file', 'ar-vr-3d-model-try-on'), text: __('Up to 8,000 triangles, textures up to 512 px. The lightest; simple shapes only.', 'ar-vr-3d-model-try-on') }
	];
	var siteLevel = function () { return config.optimiseLevel || 'high'; };

	/**
	 * AR-121: optimise a model's GLB in this browser (AtlasAR.tools.optimise) and keep the result
	 * when it is smaller (or when a real height was given). Resolves the model, or null when the
	 * file was already as small as it gets.
	 */
	function optimiseModel(m, heightCm, onStep, level) {
		level = level || siteLevel();
		var tools = sdkTools();
		if (!tools) return Promise.reject(new Error(__('The AtlasAR viewer did not load. Reload the page and try again.', 'ar-vr-3d-model-try-on')));
		var src = m.files.original || m.files.glb;
		if (!src) return Promise.reject(new Error(__('This model has no GLB file.', 'ar-vr-3d-model-try-on')));
		onStep && onStep(STEP.read);
		return fetchBlob(src.url).then(function (blob) {
			return tools.optimise(blob, { heightCm: heightCm || 0, level: level, onProgress: function (st) { if (onStep && STEP[st]) onStep(STEP[st]); } });
		}).then(function (res) {
			// A higher level may give a bigger file than the current one on purpose (more detail).
			var asked = m.optimised && m.optimised.level && m.optimised.level !== level;
			if (!heightCm && !asked && res.blob.size >= (m.files.glb ? m.files.glb.size : src.size)) return null;
			var f = new FormData();
			f.append('file', new File([res.blob], baseName(src.name || 'model') + '.glb', { type: 'model/gltf-binary' }));
			f.append('triangles', String(res.stats.triangles));
			f.append('budget', res.budget);
			if (heightCm) f.append('height_cm', String(heightCm));
			f.append('level', (res.stats && res.stats.level) || level);
			return api({ path: '/ar_try_on/v1/library/' + m.id + '/optimised', method: 'POST', body: f });
		});
	}

	/** AR-121: an OBJ / FBX source file → GLB in this browser, added to the model. */
	function convertModel(m, onStep) {
		var tools = sdkTools();
		if (!tools) return Promise.reject(new Error(__('The AtlasAR viewer did not load. Reload the page and try again.', 'ar-vr-3d-model-try-on')));
		onStep && onStep(__('Converting to GLB…', 'ar-vr-3d-model-try-on'));
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
			return sprintf(__('.%s is not taken: convert it to GLB first. Free with Blender: File › Import, then File › Export › glTF 2.0 (.glb).', 'ar-vr-3d-model-try-on'), ext);
		}
		if (ext === 'zip') return __('ZIP files are not taken: unzip it and upload the .glb (or .gltf, .obj, .fbx) inside.', 'ar-vr-3d-model-try-on');
		if (ext === 'bin') return __('A .bin file belongs to a multi-file glTF: export the model as one .glb file instead.', 'ar-vr-3d-model-try-on');
		return __('Not a 3D, iPhone AR or poster file.', 'ar-vr-3d-model-try-on');
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
						onStatus(item.i, sprintf(__('Larger than %s, the most this site takes.', 'ar-vr-3d-model-try-on'), size(config.maxBytes)), false);
						return null;
					}
					onStatus(item.i, __('Uploading…', 'ar-vr-3d-model-try-on'), null);
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
						onStatus(item.i, sprintf(__('Added to “%s”', 'ar-vr-3d-model-try-on'), out.model.name), true);
						// AR-121: Settings › "Optimise every new model when it is added".
						if (config.autoOptimise && extOf(file.name) === 'glb' && file.size > 512 * 1024 && sdkTools()) {
							onStatus(item.i, __('Optimising…', 'ar-vr-3d-model-try-on'), null);
							return optimiseModel(out.model, 0, function (t) { onStatus(item.i, t, null); }).then(function (m2) {
								onStatus(item.i, m2 && m2.optimised
									? sprintf(__('Added and optimised: %1$s → %2$s', 'ar-vr-3d-model-try-on'), size(m2.optimised.before), size(m2.optimised.after))
									: sprintf(__('Added to “%s” (already small)', 'ar-vr-3d-model-try-on'), out.model.name), true);
							}, function () {
								onStatus(item.i, sprintf(__('Added to “%s” (not optimised)', 'ar-vr-3d-model-try-on'), out.model.name), true);
							});
						}
						// An OBJ / FBX is converted to GLB right away, so the model can be shown (as the panel
						// says); a GLB of the same name in the same upload wins. Failing that, the model's
						// "Convert to GLB" button stays.
						var ext = extOf(file.name);
						if (('obj' === ext || 'fbx' === ext) && out.model.files && out.model.files.source && !out.model.files.glb && sdkTools()) {
							return convertModel(out.model, function (t) { onStatus(item.i, t, null); }).then(function () {
								onStatus(item.i, sprintf(__('Added to “%s” and converted to GLB', 'ar-vr-3d-model-try-on'), out.model.name), true);
							}, function (err) {
								onStatus(item.i, sprintf(__('Added to “%1$s”, not converted: %2$s', 'ar-vr-3d-model-try-on'), out.model.name, message(err)), false);
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
		if (m.files.source && !m.files.glb) chips.push(el('span', { key: 'src', className: 'atlas-ar-chip atlas-ar-chip--warn' }, __('Waiting to convert', 'ar-vr-3d-model-try-on')));
		if (m.large) chips.push(el('span', { key: 'large', className: 'atlas-ar-chip atlas-ar-chip--warn' }, __('Large file', 'ar-vr-3d-model-try-on')));
		// Health check: errors (shows white, wrong size, cannot be read) first; "Large file" says the rest.
		var h = m.health && m.health.counts;
		if (h && h.error) chips.push(el('span', { key: 'fix', className: 'atlas-ar-chip atlas-ar-chip--error' }, __('Needs a fix', 'ar-vr-3d-model-try-on')));
		return el('div', { className: 'atlas-ar-chips' }, chips);
	}

	function Thumb(props) {
		var m = props.model;
		if (m.files.poster) return el('img', { src: m.files.poster.url, alt: '', loading: 'lazy' });
		return el('span', { className: 'atlas-ar-thumb-icon', 'aria-hidden': 'true' }, '3D');
	}

	function usedText(m) {
		var n = m.used_by.length;
		return n ? sprintf(_n('%d product', '%d products', n, 'ar-vr-3d-model-try-on'), n) : __('not used', 'ar-vr-3d-model-try-on');
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
			savedPct(m.optimised) ? el('span', { className: 'atlas-ar-card-saved' }, sprintf(__('%s %% smaller', 'ar-vr-3d-model-try-on'), savedPct(m.optimised))) : null,
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
			return el('div', { className: 'atlas-ar-preview atlas-ar-preview--empty' }, __('No GLB file yet.', 'ar-vr-3d-model-try-on'));
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
			if (!mv || typeof mv.toBlob !== 'function') { setErr(__('The 3D view is still loading. Try again in a moment.', 'ar-vr-3d-model-try-on')); return; }
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
					el('span', { className: 'atlas-ar-file-meta' }, size(f.size) + ' · ' + __('before Optimise', 'ar-vr-3d-model-try-on')));
			}
			return el('li', { key: k, className: 'atlas-ar-file' },
				el('span', { className: 'atlas-ar-chip atlas-ar-chip--' + k }, KIND_LABEL[k]),
				el('a', { className: 'atlas-ar-file-name', href: f.url, target: '_blank', rel: 'noopener noreferrer' }, f.name),
				el('span', { className: 'atlas-ar-file-meta' }, size(f.size)),
				el(FileButton, { variant: 'link', busy: busy === 'file', accept: '.' + (k === 'glb' ? 'glb,.gltf' : k === 'usdz' ? 'usdz' : k === 'poster' ? 'jpg,.jpeg,.png,.webp' : 'obj,.fbx'), onFiles: function (fs) { addFile(fs[0]); } }, __('Replace', 'ar-vr-3d-model-try-on')),
				k !== 'glb' ? el(C.Button, { variant: 'link', isDestructive: true, disabled: !!busy, onClick: function () { removeFile(k); } }, __('Remove', 'ar-vr-3d-model-try-on')) : null
			);
		});
		var missing = m.missing.map(function (k) {
			if (k === 'usdz') {
				return el('li', { key: k, className: 'atlas-ar-missing' },
					el('span', null, __('No iPhone file: iPhones still open AR, made from the GLB. For the best iPhone quality, upload a .usdz with the same name (Reality Converter on a Mac, or Blender’s USD export).', 'ar-vr-3d-model-try-on')),
					el(FileButton, { variant: 'link', busy: busy === 'file', accept: '.usdz', onFiles: function (fs) { addFile(fs[0]); } }, __('Upload', 'ar-vr-3d-model-try-on')));
			}
			if (k === 'poster') {
				return el('li', { key: k, className: 'atlas-ar-missing' },
					el('span', null, __('No poster image', 'ar-vr-3d-model-try-on')),
					m.files.glb ? el(C.Button, { variant: 'link', isBusy: busy === 'poster', disabled: !!busy, onClick: posterFromView }, __('Take one from the 3D view', 'ar-vr-3d-model-try-on')) : null,
					el(FileButton, { variant: 'link', busy: busy === 'file', accept: '.jpg,.jpeg,.png,.webp', onFiles: function (fs) { addFile(fs[0]); } }, __('Upload', 'ar-vr-3d-model-try-on')));
			}
			return el('li', { key: k, className: 'atlas-ar-missing' },
				el('span', null, __('No GLB file: the model cannot be shown yet.', 'ar-vr-3d-model-try-on')),
				el(FileButton, { variant: 'link', busy: busy === 'file', accept: '.glb,.gltf', onFiles: function (fs) { addFile(fs[0]); } }, __('Upload', 'ar-vr-3d-model-try-on')));
		});
		var used = m.used_by.length;
		var _h = useState(''), heightCm = _h[0], setHeightCm = _h[1];
		var _lv = useState((m.optimised && m.optimised.level) || siteLevel()), level = _lv[0], setLevel = _lv[1];
		var _step = useState(''), step = _step[0], setStep = _step[1];
		function optimise() {
			run('optimise', optimiseModel(m, parseFloat(heightCm) || 0, setStep, level)).then(function (res) {
				setStep(res ? '' : __('This model is already as small as it gets.', 'ar-vr-3d-model-try-on'));
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
			setStep(__('Sending to AtlasAR Cloud…', 'ar-vr-3d-model-try-on'));
			run('cloud', api({ path: '/ar_try_on/v1/library/' + m.id + '/cloud', method: 'POST', data: { height_cm: parseFloat(heightCm) || 0, level: level } }).then(function () {
				setStep(__('AtlasAR Cloud is optimising the model…', 'ar-vr-3d-model-try-on'));
				return new Promise(function (resolve, reject) {
					var tries = 0;
					(function poll() {
						api({ path: '/ar_try_on/v1/library/' + m.id + '/cloud' }).then(function (res) {
							if (res.status === 'ready') return resolve(res.model);
							if (++tries > 120) return reject(new Error(__('AtlasAR Cloud is taking long. Check again later.', 'ar-vr-3d-model-try-on')));
							setTimeout(poll, 5000);
						}, reject);
					})();
				});
			})).then(function (model) { setStep(''); changed(model); }, function () { setStep(''); });
		}
		var o = m.optimised;
		var optimiseBox = m.files.glb ? el('div', { className: 'atlas-ar-optimise' },
			el('h3', null, __('Make it smaller', 'ar-vr-3d-model-try-on')),
			o ? el('p', { className: 'atlas-ar-saved' },
				sprintf(o.by === 'cloud' ? __('Optimised on AtlasAR Cloud: %1$s → %2$s', 'ar-vr-3d-model-try-on') : __('Optimised in this browser: %1$s → %2$s', 'ar-vr-3d-model-try-on'), size(o.before), size(o.after)),
				o.height_cm ? ' · ' + sprintf(__('real height %s cm', 'ar-vr-3d-model-try-on'), o.height_cm) : '',
				o.level ? ' · ' + (LEVELS.filter(function (l) { return l.value === o.level; })[0] || { label: o.level }).label : '') : null,
			// The saving in time, not only in megabytes: what shoppers on a phone wait.
			o && savedPct(o) ? el('p', { className: 'atlas-ar-speed' },
				el('strong', null, sprintf(__('Loads in %1$s instead of %2$s', 'ar-vr-3d-model-try-on'), loadTime(o.after), loadTime(o.before))),
				' ' + sprintf(__('on a typical phone connection: %s %% smaller.', 'ar-vr-3d-model-try-on'), savedPct(o))) : null,
			!o && m.files.glb.size ? el('p', { className: 'atlas-ar-speed' + (m.large ? ' is-slow' : '') },
				sprintf(__('Takes about %s to load on a typical phone connection.', 'ar-vr-3d-model-try-on'), loadTime(m.files.glb.size)),
				m.large ? ' ' + __('Optimise usually makes it 5 to 10 times lighter.', 'ar-vr-3d-model-try-on') : '') : null,
			el('p', { className: 'description' }, config.cloud
				? __('Smaller files load faster. "Optimise" runs in this browser: nothing is uploaded. "Optimise on AtlasAR Cloud" sends the file to AtlasAR Cloud (also for very big files). The original file is kept.', 'ar-vr-3d-model-try-on')
				: __('Smaller files load faster. Runs in this browser: nothing is uploaded anywhere. The original file is kept.', 'ar-vr-3d-model-try-on')),
			el('div', { className: 'atlas-ar-row atlas-ar-optimise-fields' },
				el(C.SelectControl, {
					label: __('Level', 'ar-vr-3d-model-try-on'), value: level, onChange: setLevel, __nextHasNoMarginBottom: true,
					options: LEVELS.map(function (l) { return { value: l.value, label: l.label }; }),
					help: (LEVELS.filter(function (l) { return l.value === level; })[0] || LEVELS[1]).text
				}),
				el(C.TextControl, {
					label: __('Real height (cm), optional', 'ar-vr-3d-model-try-on'),
					id: 'atlas-ar-height-' + m.id,
					type: 'number', min: 0.5, max: 1000, step: 0.1, value: heightCm, onChange: setHeightCm,
					help: __('E.g. 32 for a 32 cm vase: the model is made exactly that size in AR. Leave it empty to keep the model’s own size.', 'ar-vr-3d-model-try-on')
				})),
			el('div', { className: 'atlas-ar-row' },
				el(C.Button, { variant: 'primary', isBusy: busy === 'optimise', disabled: !!busy, onClick: optimise }, o ? __('Optimise again', 'ar-vr-3d-model-try-on') : __('Optimise', 'ar-vr-3d-model-try-on')),
				config.cloud ? el(C.Button, { variant: 'secondary', isBusy: busy === 'cloud', disabled: !!busy, onClick: cloudOptimise }, __('Optimise on AtlasAR Cloud', 'ar-vr-3d-model-try-on')) : null,
				m.files.original ? el(C.Button, { variant: 'tertiary', disabled: !!busy, onClick: restore }, __('Restore the original', 'ar-vr-3d-model-try-on')) : null),
			step ? el('p', { className: 'atlas-ar-step', role: 'status' }, step) : null) : null;
		var convertBox = m.files.source && !m.files.glb ? el('div', { className: 'atlas-ar-optimise' },
			el('h3', null, __('Convert to GLB', 'ar-vr-3d-model-try-on')),
			el('p', { className: 'description' }, __('Turns the OBJ / FBX file into a GLB in this browser. Textures inside the file are kept.', 'ar-vr-3d-model-try-on')),
			el(C.Button, { variant: 'primary', isBusy: busy === 'convert', disabled: !!busy, onClick: convert }, __('Convert to GLB', 'ar-vr-3d-model-try-on')),
			step ? el('p', { className: 'atlas-ar-step', role: 'status' }, step) : null) : null;

		// Health check: what would make it show white, wrong-sized, slow or not at all, with the fix.
		var health = m.health && m.health.issues ? m.health : null;
		var LEVEL = { error: __('Must fix', 'ar-vr-3d-model-try-on'), warning: __('Should fix', 'ar-vr-3d-model-try-on'), info: __('Tip', 'ar-vr-3d-model-try-on') };
		function fix(i) {
			if (i.fix === 'optimise' || i.fix === 'optimise_lower') return optimise();
			if (i.fix === 'poster') return posterFromView();
			if (i.fix === 'height') {
				var field = document.getElementById('atlas-ar-height-' + m.id);
				if (field) { field.scrollIntoView({ block: 'center' }); field.focus(); }
			}
			return null;
		}
		var FIX_LABEL = { optimise: __('Optimise', 'ar-vr-3d-model-try-on'), optimise_lower: __('Optimise', 'ar-vr-3d-model-try-on'), poster: __('Take one from the 3D view', 'ar-vr-3d-model-try-on'), height: __('Enter its real height', 'ar-vr-3d-model-try-on') };
		var healthBox = health && m.files.glb ? el('div', { className: 'atlas-ar-health' + (health.ok ? ' is-ok' : '') },
			el('h3', null, __('Health check', 'ar-vr-3d-model-try-on')),
			health.issues.length ? el('ul', null, health.issues.map(function (i) {
				return el('li', { key: i.code, className: 'atlas-ar-health-item is-' + i.level },
					el('span', { className: 'atlas-ar-health-level' }, LEVEL[i.level] || i.level),
					el('div', { className: 'atlas-ar-health-body' },
						el('strong', null, i.title),
						el('span', null, i.text),
						FIX_LABEL[i.fix] ? el(C.Button, { variant: 'secondary', size: 'small', disabled: !!busy, onClick: function () { fix(i); } }, FIX_LABEL[i.fix]) : null));
			})) : el('p', { className: 'atlas-ar-health-ok' }, __('All good: it shows with its colours, at its real size, and loads fast.', 'ar-vr-3d-model-try-on'))) : null;

		return el('aside', { className: 'atlas-ar-detail', 'aria-label': __('Model details', 'ar-vr-3d-model-try-on') },
			el(Preview, { model: m, onHost: function (h) { host.current = h; } }),
			el(C.TextControl, {
				label: __('Name', 'ar-vr-3d-model-try-on'), value: name, onChange: setName, onBlur: rename,
				onKeyDown: function (e) { if (e.key === 'Enter') { e.preventDefault(); rename(); } }
			}),
			healthBox,
			el('h3', null, __('Files', 'ar-vr-3d-model-try-on')),
			el('ul', { className: 'atlas-ar-files' }, files, missing),
			convertBox,
			optimiseBox,
			el('h3', null, __('Used by', 'ar-vr-3d-model-try-on')),
			used
				? el('ul', { className: 'atlas-ar-used' }, m.used_by.map(function (p) {
					return el('li', { key: p.id }, el('a', { href: 'post.php?post=' + p.id + '&action=edit' }, p.title || '#' + p.id));
				}))
				: el('p', { className: 'description' }, __('Not used yet.', 'ar-vr-3d-model-try-on')),
			err ? el(C.Notice, { status: 'error', isDismissible: false }, err) : null,
			el('div', { className: 'atlas-ar-detail-actions' },
				props.onUse ? el(C.Button, { variant: 'primary', onClick: function () { props.onUse(m); }, disabled: !m.files.glb }, __('Use this model', 'ar-vr-3d-model-try-on')) : null,
				!props.onUse && !confirm ? el(C.Button, {
					variant: 'secondary', isDestructive: true, disabled: !!busy || used > 0,
					onClick: function () { setConfirm(true); }
				}, __('Delete', 'ar-vr-3d-model-try-on')) : null,
				!props.onUse && confirm ? el(Fragment, null,
					el('span', null, __('Delete this model and its files?', 'ar-vr-3d-model-try-on')),
					el(C.Button, { variant: 'primary', isDestructive: true, isBusy: busy === 'delete', onClick: remove }, __('Delete', 'ar-vr-3d-model-try-on')),
					el(C.Button, { variant: 'tertiary', onClick: function () { setConfirm(false); } }, __('Cancel', 'ar-vr-3d-model-try-on'))
				) : null
			),
			!props.onUse && used > 0 ? el('p', { className: 'description' }, __('A model that products use cannot be deleted. Choose another model for them first.', 'ar-vr-3d-model-try-on')) : null
		);
	}

	/* -------------------------------------------------------------- upload */

	function Uploader(props) {
		var _rows = useState([]), rows = _rows[0], setRows = _rows[1];
		var _drag = useState(false), drag = _drag[0], setDrag = _drag[1];
		var _busy = useState(false), busy = _busy[0], setBusy = _busy[1];

		function start(files) {
			var base = rows.length;
			var next = rows.concat(files.map(function (f) { return { name: f.name, ext: extOf(f.name).toUpperCase(), text: __('Waiting…', 'ar-vr-3d-model-try-on'), ok: null }; }));
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
				el('strong', null, __('Drop files here', 'ar-vr-3d-model-try-on')),
				el('p', null, __('Files with the same name become one model: chair.glb + chair.usdz + chair.jpg', 'ar-vr-3d-model-try-on')),
				el(FileButton, { multiple: true, busy: busy, variant: 'primary', onFiles: start }, __('Choose files', 'ar-vr-3d-model-try-on')),
				el('ul', { className: 'atlas-ar-kinds' },
					el('li', null, el('b', null, __('3D models:', 'ar-vr-3d-model-try-on')), ' .glb, .gltf ', __('(a single-file .gltf)', 'ar-vr-3d-model-try-on')),
					el('li', null, el('b', null, __('iPhone AR:', 'ar-vr-3d-model-try-on')), ' .usdz'),
					el('li', null, el('b', null, __('Posters:', 'ar-vr-3d-model-try-on')), ' .jpg, .png, .webp'),
					el('li', null, el('b', null, __('Converted to GLB in your browser:', 'ar-vr-3d-model-try-on')), ' .obj, .fbx'),
					// AR-151: everything else, and the iPhone file.
					el('li', null, el('b', null, __('Other formats', 'ar-vr-3d-model-try-on')), ' (STL, DAE, 3DS, BLEND, STEP…): ', __('convert to GLB first, free with Blender (File › Export › glTF 2.0).', 'ar-vr-3d-model-try-on'))
				),
				el('p', { className: 'description' }, __('iPhone AR: a .usdz is optional. Without one, iPhones make it from the GLB. For the best iPhone quality, upload a .usdz with the same name as the GLB (make one with Apple’s Reality Converter on a Mac, or Blender’s USD export).', 'ar-vr-3d-model-try-on')),
				config.maxBytes ? el('p', { className: 'description' }, sprintf(__('Up to %s per file.', 'ar-vr-3d-model-try-on'), size(config.maxBytes))) : null
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
			el('h2', null, __('Free 3D models', 'ar-vr-3d-model-try-on')),
			el(C.Button, { variant: 'tertiary', onClick: props.api.close }, __('Close', 'ar-vr-3d-model-try-on')));
		var lead = el('p', { className: 'description' }, __('Ready-made, optimised 3D models from the AtlasAR Cloud library, free to use on your site. Download one and it is added to your 3D Library, ready to show on a product.', 'ar-vr-3d-model-try-on'));

		if (!config.cloud) {
			return el(Fragment, null, head, lead,
				el('p', null, config.canConnect
					? el(Fragment, null, __('The free library comes with AtlasAR Cloud (free plan included).', 'ar-vr-3d-model-try-on'), ' ', el('a', { href: config.integrationsUrl }, __('Connect AtlasAR Cloud in AtlasAR › Integrations', 'ar-vr-3d-model-try-on')))
					: __('Ask an administrator to connect AtlasAR Cloud in AtlasAR › Integrations to use the free library.', 'ar-vr-3d-model-try-on')));
		}

		var list = res ? res.data : null;
		var pages = res ? Math.max(1, Math.ceil(res.total / 24)) : 1;
		return el(Fragment, null, head, lead,
			el('div', { className: 'atlas-ar-free-tools' },
				el('div', { className: 'atlas-ar-search' }, el(C.SearchControl, { label: __('Search free 3D models', 'ar-vr-3d-model-try-on'), value: q, onChange: setQ, __nextHasNoMarginBottom: true })),
				el(C.SelectControl, {
					label: __('Category', 'ar-vr-3d-model-try-on'), hideLabelFromVision: true, value: cat, onChange: setCat, __nextHasNoMarginBottom: true,
					options: [{ value: '', label: __('All categories', 'ar-vr-3d-model-try-on') }].concat(Object.keys(cats).map(function (k) { return { value: k, label: cats[k] }; }))
				})),
			err ? el(C.Notice, { status: 'error', isDismissible: false }, err) : null,
			list === null ? el('p', { className: 'atlas-ar-loading', role: 'status' }, el(C.Spinner, null), __('Loading…', 'ar-vr-3d-model-try-on'))
				: !list.length ? el('p', { className: 'description' }, q || cat ? __('No free models match. Try other words.', 'ar-vr-3d-model-try-on') : __('The free library is empty for now. New models are added regularly.', 'ar-vr-3d-model-try-on'))
				: el('ul', { className: 'atlas-ar-free-grid' }, list.map(function (m) {
					var have = got[m.id] || m.imported;
					return el('li', { key: m.id, className: 'atlas-ar-free-card' },
						m.poster_url ? el('img', { src: m.poster_url, alt: '', loading: 'lazy', width: 160, height: 160 }) : el('span', { className: 'atlas-ar-free-noimg', 'aria-hidden': 'true' }, '3D'),
						el('strong', null, m.name),
						// A Premium model: AtlasAR Cloud lets Premium sites download it (the service decides).
						m.premium ? el('span', null, el('span', { className: 'atlas-ar-badge--pro' }, __('Cloud Premium', 'ar-vr-3d-model-try-on'))) : null,
						el('span', { className: 'atlas-ar-muted' }, [m.category, size(m.size), m.height_cm ? sprintf(__('%s cm tall', 'ar-vr-3d-model-try-on'), m.height_cm) : ''].filter(Boolean).join(' · ')),
						el('span', { className: 'atlas-ar-muted', title: m.license_label }, m.credit ? sprintf(__('%1$s · by %2$s', 'ar-vr-3d-model-try-on'), m.license, m.credit) : m.license),
						have ? el('span', { className: 'atlas-ar-saved' }, '✓ ', __('In your 3D Library', 'ar-vr-3d-model-try-on'))
							: m.available === false
								? el(C.Button, { variant: 'secondary', href: config.cloudPricingUrl, target: '_blank', rel: 'noopener noreferrer', 'aria-label': sprintf(__('%s is for AtlasAR Cloud Premium sites: see Premium (opens in a new tab)', 'ar-vr-3d-model-try-on'), m.name) }, __('See Premium', 'ar-vr-3d-model-try-on'), ' ↗')
								: el(C.Button, { variant: 'secondary', isBusy: busy === m.id, disabled: !!busy, onClick: function () { download(m); }, 'aria-label': sprintf(__('Download %s', 'ar-vr-3d-model-try-on'), m.name) }, busy === m.id ? __('Downloading…', 'ar-vr-3d-model-try-on') : __('Download', 'ar-vr-3d-model-try-on')));
				})),
			pages > 1 ? el('nav', { className: 'atlas-ar-library-pager', 'aria-label': __('Free 3D models pages', 'ar-vr-3d-model-try-on') },
				el(C.Button, { variant: 'secondary', disabled: page <= 1, onClick: function () { setPage(page - 1); } }, __('Previous', 'ar-vr-3d-model-try-on')),
				el('span', { 'aria-live': 'polite' }, sprintf(__('Page %1$d of %2$d', 'ar-vr-3d-model-try-on'), page, pages)),
				el(C.Button, { variant: 'secondary', disabled: page >= pages, onClick: function () { setPage(page + 1); } }, __('Next', 'ar-vr-3d-model-try-on'))) : null,
			el('p', { className: 'description' }, __('Only your search words are sent to AtlasAR Cloud. Downloads are free and do not use your monthly optimisations. Models marked Cloud Premium are for sites on the AtlasAR Cloud Premium plan.', 'ar-vr-3d-model-try-on')));
	}

	/* ------------------------------------------- flat products from a photo (AR-153) */

	// The same kinds as the SDK's tools (flat.js); default thickness in mm.
	var FLAT_KINDS = [
		['canvas', __('Canvas print', 'ar-vr-3d-model-try-on'), 20], ['poster', __('Poster / paper print', 'ar-vr-3d-model-try-on'), 1], ['framed', __('Framed picture', 'ar-vr-3d-model-try-on'), 25],
		['rug', __('Rug / mat', 'ar-vr-3d-model-try-on'), 10], ['tile', __('Tile / panel', 'ar-vr-3d-model-try-on'), 8]
	];

	/** A file into the 3D Library: a new model, or one more file of an existing model. */
	function uploadToLibrary(blob, filename, modelId) {
		var f = new File([blob], filename, { type: blob.type });
		return modelId
			? api({ path: '/ar_try_on/v1/library/' + modelId + '/files', method: 'POST', body: form('file', f) })
			: api({ path: '/ar_try_on/v1/library', method: 'POST', body: form('files[]', f) }).then(function (res) {
				var r = res.results && res.results[0];
				if (!r || r.error) throw new Error(r ? r.error : '');
				return res.models[0];
			});
	}

	/**
	 * A flat product's 3D model from its photo, made in this browser and saved to the 3D Library with
	 * its iPhone file and the photo as poster. One path for the "from a photo" window and bulk.
	 * @param {File} file   JPEG, PNG or WebP
	 * @param {object} o    { kind, widthCm, heightCm, frameColor, name }
	 * @returns Promise<{ model, placement }>  placement: wall | floor (for AR)
	 */
	function makeFlat(file, o) {
		var tools = sdkTools();
		if (!tools || !tools.flat) return Promise.reject(new Error(__('The 3D tools could not load. Please reload the page.', 'ar-vr-3d-model-try-on')));
		var spec = FLAT_KINDS.filter(function (k) { return k[0] === o.kind; })[0] || FLAT_KINDS[0];
		var name = String(o.name || '').trim();
		var slug = (name || 'flat-product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'flat-product';
		var ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
		return tools.flat(file, { kind: spec[0], widthCm: parseFloat(o.widthCm), heightCm: parseFloat(o.heightCm), depthMm: spec[2], frameColor: o.frameColor || '#2b2b2b', name: name }).then(function (out) {
			return uploadToLibrary(out.glb, slug + '.glb').then(function (model) {
				return uploadToLibrary(out.usdz, slug + '.usdz', model.id)
					.then(function () { return uploadToLibrary(file, slug + '.' + ext, model.id); })
					// The name as typed (the file name gives only a slug).
					.then(function () { return name ? api({ path: '/ar_try_on/v1/library/' + model.id, method: 'POST', data: { name: name } }) : model; })
					.then(function () { return { model: model, placement: out.placement || 'wall' }; });
			});
		});
	}

	/**
	 * AR-153: "Make 3D from a photo": a flat product (wall art, poster, canvas, rug, tile) built in
	 * this browser from one photo, at its real size, with an iPhone file and the photo as poster.
	 * Free; nothing is uploaded anywhere but this site.
	 */
	function FlatFromPhoto(props) {
		var _file = useState(null), file = _file[0], setFile = _file[1];
		var _url = useState(''), url = _url[0], setUrl = _url[1];
		var _ratio = useState(0), ratio = _ratio[0], setRatio = _ratio[1];
		var _kind = useState('canvas'), kind = _kind[0], setKind = _kind[1];
		var _w = useState(''), w = _w[0], setW = _w[1];
		var _h = useState(''), h = _h[0], setH = _h[1];
		var _frame = useState('#2b2b2b'), frame = _frame[0], setFrame = _frame[1];
		var _name = useState(props.name || ''), name = _name[0], setName = _name[1];
		var _busy = useState(''), busy = _busy[0], setBusy = _busy[1];
		var _err = useState(''), err = _err[0], setErr = _err[1];
		useEffect(function () { return function () { if (url) URL.revokeObjectURL(url); }; }, [url]);
		var _from = useState(''), from = _from[0], setFrom = _from[1]; // featured | library | computer

		/** AR-167: a photo of this site (featured image, Media Library) as a file to work on. */
		function usePhoto(photo, source) {
			if (!photo || !photo.url) return;
			setErr('');
			fetch(photo.url, { credentials: 'same-origin' }).then(function (r) {
				if (!r.ok) throw new Error(String(r.status));
				return r.blob();
			}).then(function (blob) {
				var name = (photo.url.split('/').pop() || 'photo').split('?')[0];
				choose([new File([blob], name, { type: blob.type })], source);
			}, function () { setErr(__('That photo could not be loaded. Choose another one.', 'ar-vr-3d-model-try-on')); });
		}
		// The product's featured image is the photo to start with (product panel).
		useEffect(function () { if (props.photo) usePhoto(props.photo, 'featured'); }, []);
		function fromLibrary() {
			if (!wp.media) return;
			var frame = wp.media({ title: __('Choose a photo', 'ar-vr-3d-model-try-on'), library: { type: ['image/jpeg', 'image/png', 'image/webp'] }, multiple: false });
			frame.on('select', function () {
				var a = frame.state().get('selection').first().toJSON();
				usePhoto({ url: a.sizes && a.sizes.large ? a.sizes.large.url : a.url }, 'library');
			});
			frame.open();
		}

		function choose(files, source) {
			var f = files[0];
			if (!f || !/^image\/(jpeg|png|webp)$/.test(f.type)) { setErr(__('Choose a JPEG, PNG or WebP photo.', 'ar-vr-3d-model-try-on')); return; }
			setErr(''); setFile(f); setFrom(source || 'computer'); if (!props.name) setName(baseName(f.name).replace(/[-_]+/g, ' '));
			var u = URL.createObjectURL(f); setUrl(u);
			var img = new Image();
			img.onload = function () { var r = img.naturalHeight / img.naturalWidth; setRatio(r); if (w) setH((parseFloat(w) * r).toFixed(1)); };
			img.src = u;
		}
		function setWidth(v) { setW(v); if (ratio && parseFloat(v) > 0) setH((parseFloat(v) * ratio).toFixed(1)); }
		function make() {
			setBusy(__('Making the 3D model in your browser…', 'ar-vr-3d-model-try-on')); setErr('');
			makeFlat(file, { kind: kind, widthCm: w, heightCm: h, frameColor: frame, name: name }).then(function (res) {
				setBusy(''); setFile(null); setUrl(''); setW(''); setH('');
				props.api.done([res.model.id], { kind: kind, model: res.model });
			}, function (e) { setBusy(''); setErr(message(e)); });
		}

		var sizeOk = parseFloat(w) >= 1 && parseFloat(w) <= 1000 && parseFloat(h) >= 1 && parseFloat(h) <= 1000;
		return el(Fragment, null,
			// AR-159: say plainly what it does, and for which products it works.
			el('p', null, __('Turns one photo of a flat product into a 3D model at its real size, so shoppers can see it in 3D and hang it on their own wall (or lay it on their floor) in AR, on Android and iPhone.', 'ar-vr-3d-model-try-on')),
			el('p', { className: 'description' }, __('For flat products only: wall art, posters, canvas prints, framed pictures, rugs, mats and tiles. For products with a shape, such as shoes, chairs or bottles, you need a real 3D model (a GLB file). Made in this browser, free; the photo stays on your site.', 'ar-vr-3d-model-try-on')),
			el('ol', { className: 'atlas-ar-flat-how' },
				el('li', null, __('Choose a straight-on photo of the product.', 'ar-vr-3d-model-try-on')),
				el('li', null, __('Say what it is and enter its real size.', 'ar-vr-3d-model-try-on')),
				el('li', null, __('Click “Make the 3D model”: it is saved in the 3D Library.', 'ar-vr-3d-model-try-on'))),
			el('div', { className: 'atlas-ar-flat' },
				el('div', { className: 'atlas-ar-flat-photo' },
					url ? el('img', { src: url, alt: '' }) : el('span', { className: 'atlas-ar-free-noimg', 'aria-hidden': 'true' }, __('Photo', 'ar-vr-3d-model-try-on')),
					from === 'featured' ? el('span', { className: 'atlas-ar-muted' }, __('The product’s featured image', 'ar-vr-3d-model-try-on')) : null,
					// AR-167: another photo, from the Media Library or this computer; back to the featured image.
					wp.media ? el(C.Button, { variant: 'secondary', onClick: fromLibrary }, __('Choose from the Media Library', 'ar-vr-3d-model-try-on')) : null,
					el(FileButton, { accept: 'image/jpeg,image/png,image/webp', variant: wp.media ? 'tertiary' : 'secondary', onFiles: function (fs) { choose(fs, 'computer'); } }, wp.media ? __('Upload from your computer', 'ar-vr-3d-model-try-on') : (file ? __('Choose another photo', 'ar-vr-3d-model-try-on') : __('Choose a photo', 'ar-vr-3d-model-try-on'))),
					props.photo && from !== 'featured' ? el(C.Button, { variant: 'link', onClick: function () { usePhoto(props.photo, 'featured'); } }, __('Use the featured image', 'ar-vr-3d-model-try-on')) : null),
				el('div', { className: 'atlas-ar-flat-fields' },
					el(C.SelectControl, { label: __('What is it?', 'ar-vr-3d-model-try-on'), value: kind, onChange: setKind, __nextHasNoMarginBottom: true, options: FLAT_KINDS.map(function (k) { return { value: k[0], label: k[1] }; }) }),
					el('div', { className: 'atlas-ar-flat-size' },
						el(C.TextControl, { label: __('Width (cm)', 'ar-vr-3d-model-try-on'), type: 'number', min: 1, max: 1000, step: 0.1, value: w, onChange: setWidth, __nextHasNoMarginBottom: true }),
						el(C.TextControl, { label: __('Height (cm)', 'ar-vr-3d-model-try-on'), type: 'number', min: 1, max: 1000, step: 0.1, value: h, onChange: setH, __nextHasNoMarginBottom: true })),
					el('p', { className: 'description' }, __('The real size of the product. The height follows the photo’s shape; change it if needed.', 'ar-vr-3d-model-try-on')),
					kind === 'framed' ? el('label', { className: 'atlas-ar-label' }, __('Frame colour', 'ar-vr-3d-model-try-on'), ' ', el('input', { type: 'color', value: frame, onChange: function (e) { setFrame(e.target.value); } })) : null,
					el(C.TextControl, { label: __('Name in the 3D Library', 'ar-vr-3d-model-try-on'), value: name, maxLength: 100, onChange: setName, __nextHasNoMarginBottom: true }),
					el(C.Button, { variant: 'primary', isBusy: !!busy, disabled: !!busy || !file || !sizeOk, onClick: make }, __('Make the 3D model', 'ar-vr-3d-model-try-on')),
					busy ? el('p', { className: 'atlas-ar-loading', role: 'status' }, el(C.Spinner, null), busy) : null,
					err ? el(C.Notice, { status: 'error', isDismissible: false }, err) : null)));
	}

	if (wp.hooks) {
		wp.hooks.addFilter('atlasAr.library.actions', 'atlas-ar/flat-photo', function (actions) {
			// One window for the 3D Library and the product panel (AtlasARLibrary.flat).
			return [{
				id: 'flat-photo', label: __('3D model from a photo', 'ar-vr-3d-model-try-on'),
				open: function (api, button) {
					window.AtlasARLibrary.flat({ returnFocus: button, onDone: function (info) { api.done([info.model.id]); } });
				}
			}].concat(actions);
		}, 9);
	}

	/**
	 * "From a phone scan": how to get a scan (Polycam, Scaniverse, Luma, iPhone Object Capture) into
	 * the library. Scans are heavy (hundreds of thousands of triangles, big textures); uploads are
	 * optimised on the way in, so the guide is the missing part, not another setting.
	 */
	function PhoneScan(props) {
		var steps = [
			__('Scan the product with a phone app: Polycam, Scaniverse, Luma AI, or Object Capture on an iPhone. Even light, the whole product in view, and crop away the floor before you export.', 'ar-vr-3d-model-try-on'),
			__('Export the scan as a GLB file (glTF binary). An iPhone scan that only saves a .usdz file: open it in Reality Composer or Blender and export a GLB, or upload both files with the same name.', 'ar-vr-3d-model-try-on'),
			__('Upload it here. It is made lighter on the way in: a scan of tens of megabytes usually becomes just a few, at its real size, with its textures kept.', 'ar-vr-3d-model-try-on'),
			__('Then link it to a product. iPhones get their AR file from the GLB by themselves.', 'ar-vr-3d-model-try-on')
		];
		return el('div', { className: 'atlas-ar-scan' },
			el('h3', null, __('From a phone scan', 'ar-vr-3d-model-try-on')),
			el('ol', null, steps.map(function (t, i) { return el('li', { key: i }, t); })),
			el('div', { className: 'atlas-ar-row' },
				el(C.Button, { variant: 'primary', onClick: function () { props.api.upload(); } }, __('Upload the scan', 'ar-vr-3d-model-try-on')),
				el(C.Button, { variant: 'tertiary', onClick: function () { props.api.close(); } }, __('Close', 'ar-vr-3d-model-try-on'))));
	}
	if (wp.hooks) {
		wp.hooks.addFilter('atlasAr.library.actions', 'atlas-ar/phone-scan', function (actions) {
			return actions.concat([{ id: 'phone-scan', label: __('From a phone scan', 'ar-vr-3d-model-try-on'), render: PhoneScan }]);
		}, 20);
	}

	if (wp.hooks && config.cloudAvailable) {
		wp.hooks.addFilter('atlasAr.library.actions', 'atlas-ar/free-models', function (actions) {
			return [{ id: 'free-models', label: __('Free 3D models', 'ar-vr-3d-model-try-on'), render: FreeModels }].concat(actions);
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
		 * closes the panel. An action with open(api, button) instead of render opens its own window.
		 */
		var actions = wp.hooks ? wp.hooks.applyFilters('atlasAr.library.actions', [], { picker: !!props.onUse }) : [];
		var _open = useState(''), open = _open[0], setOpen = _open[1];
		var openAction = actions.filter(function (a) { return a.id === open && a.render; })[0];
		var actionApi = {
			close: function () { setOpen(''); },
			upload: function () { setOpen(''); setUp(true); }, // opens "Upload 3D files"

			done: function (ids) {
				setPage(1);
				return load(true, 1).then(function () { if (ids && ids.length) setSel(ids[ids.length - 1]); });
			}
		};

		return el('div', { className: 'atlas-ar-browser' },
			// AR-168 (design system): the ways to add models in one row, "Upload 3D files" the one primary.
			el('div', { className: 'atlas-ar-toolbar-actions', role: 'group', 'aria-label': __('Add models', 'ar-vr-3d-model-try-on') },
				el('span', { className: 'atlas-ar-toolbar-label' }, __('Add models:', 'ar-vr-3d-model-try-on')),
				actions.map(function (a) {
					if (typeof a.open === 'function') {
						return el(C.Button, { key: a.id, variant: 'secondary', 'aria-haspopup': 'dialog', onClick: function (e) { setUp(false); setOpen(''); a.open(actionApi, e.currentTarget); } }, a.label);
					}
					return el(C.Button, { key: a.id, variant: 'secondary', 'aria-expanded': open === a.id ? 'true' : 'false', onClick: function () { setUp(false); setOpen(open === a.id ? '' : a.id); } }, a.label);
				}),
				el(C.Button, { variant: up ? 'secondary' : 'primary', onClick: function () { setOpen(''); setUp(!up); } }, up ? __('Close upload', 'ar-vr-3d-model-try-on') : (props.onUse ? __('Upload new', 'ar-vr-3d-model-try-on') : __('Upload 3D files', 'ar-vr-3d-model-try-on')))),
			el('div', { className: 'atlas-ar-toolbar' },
				el('div', { className: 'atlas-ar-search' },
					el(C.SearchControl, { label: __('Search 3D models', 'ar-vr-3d-model-try-on'), value: search, onChange: setSearch, __nextHasNoMarginBottom: true })),
				el('div', { className: 'atlas-ar-filters', role: 'group', 'aria-label': __('Show', 'ar-vr-3d-model-try-on') }, FILTERS.map(function (f) {
					return el('button', {
						key: f[0], type: 'button', className: 'atlas-ar-filter' + (filter === f[0] ? ' is-on' : ''),
						'aria-pressed': filter === f[0] ? 'true' : 'false', onClick: function () { setFilter(f[0]); }
					}, f[1]);
				})),
				loading && items !== null ? el('span', { className: 'atlas-ar-loading', role: 'status' }, el(C.Spinner, null), __('Loading…', 'ar-vr-3d-model-try-on')) : null
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
					items === null ? el('p', { className: 'atlas-ar-loading', role: 'status' }, el(C.Spinner, null), __('Loading…', 'ar-vr-3d-model-try-on'))
						: items.length ? el('div', { className: 'atlas-ar-grid' }, items.map(function (m) {
							return el(Card, { key: m.id, model: m, selected: m.id === sel, onPick: function () { setSel(m.id); }, onUse: props.onUse });
						}))
							: el('div', { className: 'atlas-ar-empty' },
								el('p', null, search || filter !== 'all' ? __('No models match.', 'ar-vr-3d-model-try-on') : __('No 3D models yet. Upload a GLB file to start.', 'ar-vr-3d-model-try-on')),
								!up && !search && filter === 'all' ? el(C.Button, { variant: 'primary', onClick: function () { setUp(true); } }, __('Upload 3D files', 'ar-vr-3d-model-try-on')) : null),
					total > PER_PAGE ? el('nav', { className: 'atlas-ar-library-pager', 'aria-label': __('3D models pages', 'ar-vr-3d-model-try-on') },
						el('span', { className: 'atlas-ar-muted' }, sprintf(_n('%s model', '%s models', total, 'ar-vr-3d-model-try-on'), total)),
						el(C.Button, { variant: 'secondary', disabled: page <= 1 || loading, onClick: function () { go(page - 1); } }, __('Previous', 'ar-vr-3d-model-try-on')),
						el('span', { 'aria-live': 'polite' }, sprintf(__('Page %1$d of %2$d', 'ar-vr-3d-model-try-on'), page, pages)),
						el(C.Button, { variant: 'secondary', disabled: page >= pages || loading, onClick: function () { go(page + 1); } }, __('Next', 'ar-vr-3d-model-try-on'))) : null
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
			el('p', null, el('span', { className: 'atlas-ar-badge atlas-ar-badge--pro' }, 'Pro'), ' ', __('More in the 3D Library with AtlasAR Pro:', 'ar-vr-3d-model-try-on')),
			el('ul', null,
				el('li', null, __('Make with AI: a 3D model from a product photo or a description (AtlasAR Cloud, Meshy AI, Tripo3D), straight into this library.', 'ar-vr-3d-model-try-on')),
				el('li', null, __('Optimise in bulk: every large file made lighter at once, in the background.', 'ar-vr-3d-model-try-on')),
				el('li', null, __('AtlasAR Cloud Premium: no monthly limit on optimisations.', 'ar-vr-3d-model-try-on'))),
			el('a', { href: config.proUrl, target: '_blank', rel: 'noopener noreferrer' }, __('See AtlasAR Pro', 'ar-vr-3d-model-try-on'), el('span', { className: 'screen-reader-text' }, __('(opens in a new tab)', 'ar-vr-3d-model-try-on'))));
	}

	function Page() {
		var lead = el('p', { className: 'atlas-ar-lead' }, __('All your 3D models and their files in one place: GLB, iPhone USDZ and poster images. Kept apart from the Media Library.', 'ar-vr-3d-model-try-on'));
		var UI = window.AtlasARAdminUI;
		// AR-180: the same desktop-app frame as the dashboard (side menu, search, notices bell,
		// status bar). The page title is the frame's h1 and the brand is in its menu.
		if (UI && UI.version >= 2 && UI.shell && UI.shell.Shell) {
			var facts = config.cloudAvailable ? [{
				id: 'cloud', href: config.canConnect ? config.integrationsUrl : '',
				text: config.cloud ? __('AtlasAR Cloud: connected', 'ar-vr-3d-model-try-on') : __('AtlasAR Cloud: not connected', 'ar-vr-3d-model-try-on')
			}] : [];
			return el(UI.shell.Shell, { items: UI.shell.railItems(), current: 'library', title: __('3D Library', 'ar-vr-3d-model-try-on'), facts: facts },
				el(UI.shell.Pane, { fill: true, className: 'atlas-ar-pane--library' }, el('div', { className: 'atlas-ar-library' }, lead, el(Browser, null), el(ProNote, null))));
		}
		return el('div', { className: 'atlas-ar-library' },
			el('h1', { className: 'wp-heading-inline' }, __('3D Library', 'ar-vr-3d-model-try-on'), config.brand && config.brand.name ? el('span', { className: 'atlas-ar-library-brand' }, config.brand.name) : null),
			lead,
			el(Browser, null),
			el(ProNote, null)
		);
	}

	function Picker(props) {
		return el(C.Modal, {
			title: props.title || __('Choose a 3D model', 'ar-vr-3d-model-try-on'),
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

	/** AR-159: "Make a 3D model from a photo" in a window (the product panel). */
	function FlatModal(props) {
		return el(C.Modal, { title: __('Make a 3D model from a photo', 'ar-vr-3d-model-try-on'), onRequestClose: props.onClose, className: 'atlas-ar-picker atlas-ar-flat-modal', size: 'large' },
			el('div', { className: 'atlas-ar-library' }, el(FlatFromPhoto, {
				name: props.name, photo: props.photo,
				api: { close: props.onClose, done: function (ids, info) { props.onDone(info); props.onClose(); } }
			})));
	}

	window.AtlasARLibrary = Object.freeze({
		/** AR-162: optimisation levels [{ value, label, text }] (Settings uses the same list). */
		levels: LEVELS,
		/** Flat product kinds [[value, label, depthMm]] and makeFlat(file, { kind, widthCm, heightCm, name }) → { model, placement }. */
		flatKinds: FLAT_KINDS,
		makeFlat: makeFlat,
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
		},
		/**
		 * AR-159: make a flat product's 3D model from a photo: options { name, photo: { url } (AR-167: the
		 * photo to start with, e.g. the featured image), onDone({ kind, model }) }.
		 * kind: canvas | poster | framed (on a wall) or rug | tile (on the floor).
		 */
		flat: function (options) {
			options = options || {};
			var node = document.createElement('div');
			document.body.appendChild(node);
			var unmount = null;
			var close = function () {
				if (unmount) unmount();
				node.remove();
				if (options.returnFocus && options.returnFocus.focus) options.returnFocus.focus();
			};
			unmount = mount(node, el(FlatModal, {
				name: options.name, photo: options.photo || null,
				onDone: function (info) { if (typeof options.onDone === 'function') options.onDone(info); },
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
