/**
 * AR-116: the shop page side of AtlasAR (WordPress adapter). The AtlasAR viewer SDK draws every
 * 3D view, popup, AR button and try-on window; this file only does what is WordPress- or
 * WooCommerce-specific:
 *   - gallery placements: put the 3D view over the main product image, with a photo / 3D switch
 *     and a full-screen button;
 *   - WooCommerce variations: tell every viewer which option the shopper picked (the SDK's
 *     variants module, from AtlasAR Pro, changes the model; without it nothing happens);
 *   - "Try it on" buttons: open the SDK's try-on.
 * No 3D code runs before the shopper scrolls to a view or clicks.
 */
(function () {
	'use strict';

	var sdk = function () {
		return window.AtlasARViewer || null;
	};
	var icon = {
		cube: '<svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true"><path d="M8 1 2 4.5v7L8 15l6-3.5v-7zM2 4.5 8 8l6-3.5M8 8v7" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
		image: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5z" fill="currentColor"/></svg>',
		full: '<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>'
	};
	var text = {
		show3d: 'View in 3D',
		showImage: 'Show the photo',
		fullscreen: 'Full screen'
	};

	function button(cls, label, svg) {
		var b = document.createElement('button');
		b.type = 'button';
		b.className = 'atlas-ar-gallery-btn ' + cls;
		b.setAttribute('aria-label', label);
		b.title = label;
		b.innerHTML = svg; // fixed markup above, no data
		return b;
	}

	/* ---------------------------------------------------------------- gallery */
	function setupGallery(source) {
		var gallery = document.querySelector('.woocommerce-product-gallery');
		var target = gallery && gallery.querySelector('.woocommerce-product-gallery__image');
		// A product without photos shows WooCommerce's grey placeholder: the 3D view takes its place.
		var placeholder = !target && gallery && gallery.querySelector('.woocommerce-product-gallery__image--placeholder');
		if (placeholder) target = placeholder;
		if (!target) {
			source.hidden = false; // no WooCommerce gallery on this theme: show the view where it is
			return;
		}
		var overlay = document.createElement('div');
		overlay.className = 'atlas-ar-gallery-overlay';
		while (source.firstChild) overlay.appendChild(source.firstChild); // moves the live viewer
		source.remove();
		target.classList.add('atlas-ar-gallery-target');
		target.appendChild(overlay);

		var bar = document.createElement('div');
		bar.className = 'atlas-ar-gallery-bar';
		var toggle = button('atlas-ar-gallery-toggle', text.show3d, icon.cube);
		var full = button('atlas-ar-gallery-full', text.fullscreen, icon.full);
		bar.appendChild(toggle);
		bar.appendChild(full);
		target.appendChild(bar);

		function show(is3d) {
			target.classList.toggle('atlas-ar-show-3d', is3d);
			overlay.hidden = !is3d;
			full.hidden = !is3d;
			toggle.setAttribute('aria-label', is3d ? text.showImage : text.show3d);
			toggle.title = is3d ? text.showImage : text.show3d;
			toggle.innerHTML = is3d ? icon.image : icon.cube;
		}
		toggle.addEventListener('click', function (e) {
			e.preventDefault();
			e.stopPropagation(); // the gallery's own zoom / lightbox must not open
			show(overlay.hidden);
		});
		full.addEventListener('click', function (e) {
			e.preventDefault();
			e.stopPropagation();
			if (document.fullscreenElement) {
				document.exitFullscreen();
			} else if (overlay.requestFullscreen) {
				overlay.requestFullscreen().catch(function () {});
			}
		});
		if (placeholder) toggle.hidden = true; // no photo to switch back to
		show(!!placeholder || source.getAttribute('data-atlas-ar-start') === '3d');
	}

	/* ------------------------------------------------------- slide thumbnail */
	// WooCommerce draws the gallery thumbnails after load, from each slide's data-thumb: mark the
	// 3D slide's thumbnail with a "3D" badge so shoppers see there is a 3D view among the photos.
	function setupSlideThumb(slide) {
		var gallery = slide.closest('.woocommerce-product-gallery');
		if (!gallery) return;
		var index = Array.prototype.indexOf.call(gallery.querySelectorAll('.woocommerce-product-gallery__image'), slide);
		function mark() {
			var items = gallery.querySelectorAll('.flex-control-thumbs li');
			if (!items[index]) return false;
			items[index].classList.add('atlas-ar-thumb-3d');
			return true;
		}
		if (index < 0 || mark() || !window.MutationObserver) return;
		var watch = new MutationObserver(function () {
			if (mark()) watch.disconnect();
		});
		watch.observe(gallery, { childList: true, subtree: true });
		setTimeout(function () { watch.disconnect(); }, 15000); // a theme without thumbnails
	}

	/* ------------------------------------------------------------- variations */
	function viewers() {
		return Array.prototype.slice.call(document.querySelectorAll('atlasar-viewer'));
	}
	function pick(values) {
		viewers().forEach(function (host) {
			if (typeof host.setVariant !== 'function') return; // no variants module (AtlasAR Pro)
			values.forEach(function (v) {
				if (v) host.setVariant(v);
			});
		});
	}
	function original() {
		viewers().forEach(function (host) {
			if (typeof host.resetVariant === 'function') host.resetVariant(); // the SDK's variants module
		});
	}
	function setupVariations() {
		var $ = window.jQuery;
		if (!$) return;
		$(document).on('found_variation', '.variations_form', function (e, variation) {
			var attrs = (variation && variation.attributes) || {};
			pick(Object.keys(attrs).map(function (k) { return String(attrs[k] || ''); }));
		});
		$(document).on('reset_data', '.variations_form', original);
	}

	/* ----------------------------------------------------------------- try-on */
	function setupTryon() {
		document.addEventListener('click', function (e) {
			var btn = e.target.closest && e.target.closest('.atlas-ar-tryon-button');
			if (!btn || btn.disabled) return;
			e.preventDefault();
			var core = sdk();
			if (!core || !core.tryon) return;
			var opts;
			try {
				opts = JSON.parse(btn.getAttribute('data-atlas-ar-tryon') || '{}');
			} catch (err) {
				return;
			}
			btn.disabled = true;
			core.tryon.open(opts, { target: btn, returnFocus: btn }).then(function () {
				btn.disabled = false;
			}, function () {
				btn.disabled = false;
			});
		});
	}

	function start() {
		Array.prototype.forEach.call(document.querySelectorAll('.atlas-ar-gallery'), setupGallery);
		Array.prototype.forEach.call(document.querySelectorAll('.atlas-ar-slide'), setupSlideThumb);
		setupVariations();
		setupTryon();
	}
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
	else start();
})();
