/**
 * WooCommerce gallery 3D-item poster hydration.
 *
 * Previously an inline <script> emitted by
 * AR_TRY_ON::add_3d_file_as_product_gallery_item(). Moved to this enqueued
 * file so the gallery item markup is plain HTML (wp.org reviewer item: drop
 * inline scripts / phcs:ignore escapes).
 *
 * It reads the cached poster (saved by AtlasAR.fetchModelData into
 * sessionStorage) for the current product and copies the poster URL + a
 * responsive srcset onto the gallery item's data-thumb-* attributes so the
 * WooCommerce gallery thumbnail matches the 3D model's poster. Config is read
 * from the element itself:
 *
 *     <div id="atlas_ar-3d-gallery-item"
 *          data-atlas-product-id="<id>"
 *          data-atlas-default-srcset="<url> 100w, …"> … </div>
 */
( function () {
	'use strict';

	function run() {
		var el = document.getElementById( 'atlas_ar-3d-gallery-item' );
		if ( ! el ) {
			return;
		}

		var productId = el.getAttribute( 'data-atlas-product-id' );
		var defaultSrcset = el.getAttribute( 'data-atlas-default-srcset' ) || '';

		var poster = getPosterByProductId( productId );
		if ( ! poster ) {
			console.warn( 'Poster not found for this product.' );
			return;
		}

		el.setAttribute( 'data-thumb', poster.url );
		el.setAttribute( 'data-thumb-alt', poster.alt );

		var srcset = '';
		if ( poster.sizes && poster.sizes.thumbnail && poster.sizes.thumbnail.url ) {
			srcset += poster.sizes.thumbnail.url + ' ' + poster.sizes.thumbnail.width + 'w, ';
		}
		if ( poster.sizes && poster.sizes.medium && poster.sizes.medium.url ) {
			srcset += poster.sizes.medium.url + ' ' + poster.sizes.medium.width + 'w, ';
		}
		if ( poster.sizes && poster.sizes.large && poster.sizes.large.url ) {
			srcset += poster.sizes.large.url + ' ' + poster.sizes.large.width + 'w';
		}

		if ( srcset ) {
			el.setAttribute( 'data-thumb-srcset', srcset );
		} else if ( defaultSrcset ) {
			el.setAttribute( 'data-thumb-srcset', defaultSrcset );
		}
	}

	function getPosterByProductId( productId ) {
		var data = sessionStorage.getItem( 'atlas_ar_model_data' );
		if ( ! data ) {
			return null;
		}
		try {
			var parsed = JSON.parse( data );
			var model = parsed.models && parsed.models[ productId ];
			return {
				url: ( model && model.poster ) || '',
				sizes: ( model && model.sizes ) || {},
				alt: ( model && model.alt ) || '',
			};
		} catch ( e ) {
			console.error( 'Error parsing model data:', e );
			return null;
		}
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', run );
	} else {
		run();
	}
} )();
