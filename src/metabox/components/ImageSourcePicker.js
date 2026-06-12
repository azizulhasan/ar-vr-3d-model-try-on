import React, {useEffect, useMemo, useState} from "react";
import {getPostID, TRIPO_DEFAULT_MODEL_VERSION} from "../../context/utilities";
import notify from "../../context/Notify";

/**
 * Image-source picker for Tripo3D / Meshy AI `image_to_model`.
 *
 * Four sources:
 *   1. Featured image         (post / WC product thumbnail)
 *   2. Gallery image          (WC product gallery: _product_image_gallery)
 *   3. Media library          (wp.media frame — browse + select)
 *   4. Upload from computer   (wp.media frame — Upload Files tab)
 *
 * On selection, the picker rewrites
 * `productModel.exclude_integration_api_body` to the Tripo3D
 * image_to_model schema with `file.url` populated. The existing
 * Generate Model handler in IntegrationSection picks up the body
 * unchanged.
 *
 * Why owned by Free even though it's a Pro-only feature: the React
 * metabox runtime lives in Free. Visibility is gated on
 * `ar_try_on.is_pro_active === '1'` so the picker never renders on
 * a Free-only install.
 */
export default function ImageSourcePicker({productModel, setProductModel}) {
    const [activeTab, setActiveTab] = useState('featured');
    const [galleryImages, setGalleryImages] = useState([]);
    const [featuredImage, setFeaturedImage] = useState(null);
    const [loadingTab, setLoadingTab] = useState(null);
    const [customUrlInput, setCustomUrlInput] = useState('');
    const [customPreviewState, setCustomPreviewState] = useState('idle'); // idle | loading | ok | error

    const selectedUrl = useMemo(() => {
        const row = (productModel.exclude_integration_api_body || []).find(r => r.key === 'file.url');
        return row?.value || '';
    }, [productModel.exclude_integration_api_body]);

    const guessExt = (url) => {
        const m = String(url || '').match(/\.(jpe?g|png|webp)(?:\?|$)/i);
        if (!m) return 'jpg';
        const e = m[1].toLowerCase();
        return e === 'jpeg' ? 'jpg' : e;
    };

    /**
     * Upsert helper — find a body row by key, update it in place
     * when present, push it when absent. Preserves the row's
     * other properties (type / required / etc.) and the array
     * position of every other row. Used by pickUrl so picking
     * an image only touches the file source rows, leaving the
     * merchant's texture / pbr / model_version edits intact.
     */
    const upsertRow = (body, key, value, defaults = {}) => {
        const idx = body.findIndex(r => r && r.key === key);
        if (idx >= 0) {
            body[idx] = {...body[idx], value};
        } else {
            body.push({key, type: 'text', value, ...defaults});
        }
    };

    const pickUrl = (url, ext) => {
        if (!url) return;
        const ext_ = ext || guessExt(url);
        setProductModel((prev) => {
            const body = Array.isArray(prev.exclude_integration_api_body)
                ? [...prev.exclude_integration_api_body]
                : [];
            // Update only the rows the picker actually owns. file.url
            // wins; clear file.file_token and file.object so the body
            // can't carry two mutually-exclusive sources at once.
            upsertRow(body, 'type', 'image_to_model');
            upsertRow(body, 'file.url', url, {type: 'url'});
            upsertRow(body, 'file.type', ext_);
            const ftIdx = body.findIndex(r => r && r.key === 'file.file_token');
            if (ftIdx >= 0) body[ftIdx] = {...body[ftIdx], value: ''};
            const foIdx = body.findIndex(r => r && r.key === 'file.object');
            if (foIdx >= 0) body[foIdx] = {...body[foIdx], value: ''};
            return {...prev, exclude_integration_api_body: body};
        });
        notify('Image selected. Click Generate Model to start.', 'success', {autoClose: 2500});
    };

    /**
     * Tab 1 — featured image. Detected via the post-image sidebar widget
     * (#set-post-thumbnail img or .editor-post-featured-image img) on
     * either classic or Gutenberg. WC product page emits the classic
     * widget for the featured image.
     */
    useEffect(() => {
        if (activeTab !== 'featured' || featuredImage !== null) return;
        setLoadingTab('featured');
        try {
            const selectors = [
                '#set-post-thumbnail img',
                '#postimagediv img',
                '.editor-post-featured-image__preview img',
                '.editor-post-featured-image img',
            ];
            let src = null;
            for (const sel of selectors) {
                const el = document.querySelector(sel);
                if (el && el.src) { src = el.src; break; }
            }
            if (src) {
                // Strip WP's `-NNNxNNN` thumbnail-size suffix so we send the full original.
                src = src.replace(/-\d+x\d+(\.(?:jpe?g|png|webp))(?:\?|$)/i, '$1');
                setFeaturedImage({url: src});
            } else {
                setFeaturedImage({url: null});
            }
        } finally {
            setLoadingTab(null);
        }
    }, [activeTab, featuredImage]);

    /**
     * Tab 2 — WC product gallery. Read attachment IDs from the hidden
     * `#product_image_gallery` input (comma-separated) and resolve their
     * URLs via the WP REST `/wp/v2/media/<id>` endpoint.
     */
    useEffect(() => {
        if (activeTab !== 'gallery' || galleryImages.length > 0 || loadingTab === 'gallery') return;
        const idsInput = document.querySelector('#product_image_gallery');
        const idsRaw = idsInput?.value || '';
        const ids = idsRaw.split(',').map(s => s.trim()).filter(Boolean);
        if (ids.length === 0) {
            setGalleryImages([]);
            return;
        }
        setLoadingTab('gallery');
        const include = ids.join(',');
        // Use the site's REST root; ar_try_on.api_url ends with /wp-json/.
        const url = `${window.ar_try_on?.api_url || '/wp-json/'}wp/v2/media?include=${include}&per_page=${Math.max(50, ids.length)}&_fields=id,source_url,mime_type,media_details,title`;
        fetch(url, {headers: {'X-WP-Nonce': window.ar_try_on?.rest_nonce}})
            .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
            .then(items => {
                // Restore original order by IDs.
                const byId = Object.fromEntries((items || []).map(it => [String(it.id), it]));
                const ordered = ids.map(id => byId[String(id)]).filter(Boolean);
                setGalleryImages(ordered);
            })
            .catch(err => {
                console.error('AR-62 gallery fetch failed', err);
                notify('Could not load gallery images.', 'error');
                setGalleryImages([]);
            })
            .finally(() => setLoadingTab(null));
    }, [activeTab, galleryImages.length, loadingTab]);

    /**
     * Tab 3 & 4 — wp.media frame. Tab 3 opens the Media Library tab
     * (browse existing); Tab 4 opens the same frame on the Upload Files
     * tab. Both call back through the same select handler.
     */
    const openMediaFrame = (preferUploadTab) => {
        if (!window.wp || !window.wp.media) {
            notify('WordPress media library is not loaded on this page.', 'error');
            return;
        }
        const frame = window.wp.media({
            title: preferUploadTab ? 'Upload an image' : 'Select an image from media library',
            button: {text: 'Use this image'},
            library: {type: 'image'},
            multiple: false,
        });
        frame.on('select', () => {
            const attachment = frame.state().get('selection').first().toJSON();
            if (!attachment || !attachment.url) {
                notify('No image selected.', 'warn');
                return;
            }
            const mime = (attachment.mime || '').toLowerCase();
            const ext = mime.includes('png') ? 'png'
                      : mime.includes('webp') ? 'webp'
                      : 'jpg';
            pickUrl(attachment.url, ext);
        });
        frame.on('open', () => {
            if (preferUploadTab) {
                // Switch to "Upload Files" router tab.
                const router = frame.modal?.el?.querySelector?.('.media-router .media-menu-item');
                const uploadBtn = frame.modal?.el?.querySelector?.('.media-router #menu-item-upload, .media-router a[href*="upload"]');
                uploadBtn?.click?.();
            }
        });
        frame.open();
    };

    /**
     * Tab 5 — paste a URL manually. Lightweight validation: scheme +
     * image extension. We still let the user click "Use this URL" to
     * commit, so a non-`.jpg` URL that actually serves JPEG content
     * (CDN re-write, signed URL, etc.) is still allowed — the warning
     * is just a hint, not a block.
     */
    const isLikelyImageUrl = (s) => {
        const url = String(s || '').trim();
        if (!/^https?:\/\//i.test(url)) return false;
        return /\.(jpe?g|png|webp)(?:\?|#|$)/i.test(url);
    };

    const commitCustomUrl = () => {
        const url = String(customUrlInput || '').trim();
        if (!/^https?:\/\//i.test(url)) {
            notify('Please paste a full http(s):// image URL.', 'error');
            return;
        }
        pickUrl(url);
    };

    const tabBtn = (id, label) => (
        <button
            type="button"
            onClick={() => setActiveTab(id)}
            className={
                'art-px-3 art-py-2 art-border art-rounded art-mr-2 art-cursor-pointer ' +
                (activeTab === id
                    ? 'art-bg-blue-500 art-text-white art-border-blue-500'
                    : 'art-bg-white art-text-gray-800 art-border-gray-300')
            }
        >
            {label}
        </button>
    );

    const thumb = (src, key, onPick, title) => (
        <div
            key={key}
            onClick={onPick}
            style={{
                width: 110, height: 110, margin: 6, cursor: 'pointer',
                border: selectedUrl === src ? '3px solid #2563eb' : '2px solid #e5e7eb',
                borderRadius: 6, overflow: 'hidden', position: 'relative',
                background: '#f9fafb',
            }}
            title={title || src}
        >
            <img src={src} alt={title || ''} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </div>
    );

    /**
     * Detect localhost / private-network development hosts. Tripo3D
     * fetches the image server-side from its own infrastructure, so
     * any URL Featured / Gallery / Media library / Upload produces on
     * a localhost install resolves to "connection refused" on the
     * Tripo3D side and the task fails silently. Only the Paste URL
     * tab — pointed at a publicly hosted image — works under those
     * conditions, so we warn explicitly instead of leaving the user
     * to wait for a doomed generation.
     */
    const isLocalHost = (() => {
        const h = (window.location && window.location.hostname || '').toLowerCase();
        if (!h) return false;
        if (h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '::1') return true;
        if (/\.local$/.test(h) || /\.test$/.test(h) || /\.localhost$/.test(h)) return true;
        // Common private LAN ranges
        if (/^10\./.test(h)) return true;
        if (/^192\.168\./.test(h)) return true;
        if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
        return false;
    })();

    return (
        <div className="art-bg-white art-p-4 art-rounded art-border art-border-gray-200 art-mb-4">
            {isLocalHost && (
                <div
                    style={{
                        background: '#fef3c7',
                        border: '1px solid #f59e0b',
                        borderRadius: 6,
                        padding: '10px 12px',
                        marginBottom: 12,
                        fontSize: 13,
                        lineHeight: 1.45,
                        color: '#78350f',
                    }}
                >
                    <strong>Heads up — this site is on <code>{window.location.hostname}</code>.</strong>
                    {' '}Tripo3D pulls images server-side from the public internet, so the
                    {' '}<em>Featured image</em>, <em>Gallery image</em>, <em>Media library</em>, and
                    {' '}<em>Upload from computer</em> tabs all produce <code>http://{window.location.hostname}/…</code>
                    {' '}URLs that Tripo3D can't reach — generation will fail silently.
                    {' '}On localhost, use the <strong>Paste URL</strong> tab with a publicly hosted
                    {' '}image (or expose your site via a tunnel like ngrok / Cloudflare Tunnel).
                </div>
            )}
            <div className="art-flex art-items-center art-justify-between art-mb-3">
                <h4 className="art-font-medium" style={{margin: 0}}>Image source</h4>
                {selectedUrl ? (
                    <span className="art-text-xs art-text-green-700" style={{maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                        Selected: {selectedUrl}
                    </span>
                ) : (
                    <span className="art-text-xs art-text-gray-500">Pick an image, then click Generate Model.</span>
                )}
            </div>

            <div className="art-flex art-flex-wrap art-mb-3">
                {tabBtn('featured', 'Featured image')}
                {tabBtn('gallery',  'Gallery image')}
                {tabBtn('library',  'Media library')}
                {tabBtn('upload',   'Upload from computer')}
                {tabBtn('custom',   'Paste URL')}
            </div>

            {/*
              * Tripo `model_version` is no longer a picker affordance —
              * it lives in the body editor below as a schema-driven
              * row with the same datalist autocomplete. Keeps all
              * field metadata sourced from utilities.js and lets the
              * Tripo3D-mandatory-field gate include it uniformly.
              */}

            {activeTab === 'featured' && (
                <div style={{display: 'flex', flexWrap: 'wrap'}}>
                    {loadingTab === 'featured' && <div>Loading…</div>}
                    {featuredImage?.url
                        ? thumb(featuredImage.url, 'featured', () => pickUrl(featuredImage.url), 'Featured image')
                        : (featuredImage && !loadingTab && <div className="art-text-gray-500 art-text-sm">No featured image set for this post. Set one in the right sidebar, then come back.</div>)
                    }
                </div>
            )}

            {activeTab === 'gallery' && (
                <div style={{display: 'flex', flexWrap: 'wrap'}}>
                    {loadingTab === 'gallery' && <div>Loading…</div>}
                    {galleryImages.length === 0 && loadingTab !== 'gallery' && (
                        <div className="art-text-gray-500 art-text-sm">No gallery images on this product. Add some in the Product gallery sidebar, then come back.</div>
                    )}
                    {galleryImages.map(img => thumb(
                        img.source_url, 'g' + img.id,
                        () => {
                            const mime = (img.mime_type || '').toLowerCase();
                            const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
                            pickUrl(img.source_url, ext);
                        },
                        img.title?.rendered || ''
                    ))}
                </div>
            )}

            {activeTab === 'library' && (
                <div>
                    <button
                        type="button"
                        onClick={() => openMediaFrame(false)}
                        className="art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded art-border-none art-cursor-pointer"
                    >
                        Open media library
                    </button>
                </div>
            )}

            {activeTab === 'upload' && (
                <div>
                    <button
                        type="button"
                        onClick={() => openMediaFrame(true)}
                        className="art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded art-border-none art-cursor-pointer"
                    >
                        Upload an image from your computer
                    </button>
                    <div className="art-text-xs art-text-gray-500 art-mt-2">
                        The image is added to your WordPress media library and used as the Tripo3D source.
                    </div>
                </div>
            )}

            {activeTab === 'custom' && (
                <div>
                    <div className="art-flex art-gap-2 art-items-start">
                        <input
                            type="url"
                            inputMode="url"
                            placeholder="https://example.com/path/to/image.jpg"
                            value={customUrlInput}
                            onChange={(e) => { setCustomUrlInput(e.target.value); setCustomPreviewState('idle'); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitCustomUrl(); } }}
                            className="art-border art-rounded art-p-2"
                            style={{flex: 1, minWidth: 0}}
                        />
                        <button
                            type="button"
                            onClick={commitCustomUrl}
                            className="art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded art-border-none art-cursor-pointer"
                        >
                            Use this URL
                        </button>
                    </div>
                    <div className="art-text-xs art-text-gray-500 art-mt-2">
                        Direct link to a JPEG, PNG, or WebP image. Tripo3D fetches the URL server-side, so the image must be publicly reachable. Max 20 MB.
                    </div>

                    {/* Preview — we attempt to load the URL as an image.
                        Helps the user catch typos before burning Tripo3D
                        credits on an unreachable URL. */}
                    {customUrlInput && /^https?:\/\//i.test(customUrlInput) && (
                        <div className="art-mt-3" style={{maxWidth: 220}}>
                            <img
                                src={customUrlInput}
                                alt="Preview"
                                onLoad={() => setCustomPreviewState('ok')}
                                onError={() => setCustomPreviewState('error')}
                                style={{
                                    maxWidth: '100%', maxHeight: 220,
                                    border: '2px solid ' + (customPreviewState === 'error' ? '#dc2626' : '#e5e7eb'),
                                    borderRadius: 6, display: 'block',
                                }}
                            />
                            {customPreviewState === 'error' && (
                                <div className="art-text-xs art-text-red-600 art-mt-1">
                                    Could not load the URL as an image. Check the link and try again.
                                </div>
                            )}
                            {!isLikelyImageUrl(customUrlInput) && customPreviewState !== 'error' && (
                                <div className="art-text-xs art-text-amber-600 art-mt-1">
                                    URL does not end in .jpg / .png / .webp — Tripo3D may still accept it if the server returns image bytes.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
