/**
 * Theme-button style sampler for the dynamic Try-On / View-in-AR buttons.
 *
 * Previously emitted as an inline <script> at wp_footer by
 * AR_TRY_ON_Tryon::print_dynamic_button_sampler_script(). Moved to this
 * enqueued file (the wp.org reviewer flagged non-enqueued inline scripts).
 *
 * The wrapper IDs to style — and the document-root sentinel — are passed in
 * via `window.atlasARTryOnButtons` (printed just before this script by
 * wp_add_inline_script):
 *
 *     window.atlasARTryOnButtons = { ids: [...], docRoot: "__atlas_ar_doc_root__" };
 *
 * For each wrapper the sampler measures the active theme's primary button
 * and copies the result onto the wrapper element as inline CSS custom
 * properties (--atlas-ar-btn-*), overriding the class defaults shipped in
 * ar-tryon-buttons.css.
 *
 * Sampling strategy (first match wins):
 *   1. Live theme button already on the page (strongest signal).
 *   2. Hidden probe elements carrying classic button classes.
 *   3. theme.json color presets (block themes / Hello Elementor).
 *   4. Default link color (framework themes with no button styling).
 *   5. Last-resort .wp-element-button probe (accepts WP core default gray).
 */
( function () {
	'use strict';

	var cfg = ( typeof window !== 'undefined' && window.atlasARTryOnButtons ) || {};
	var ids = Array.isArray( cfg.ids ) ? cfg.ids : [];
	// When this sentinel ID is in the list, the sampler treats
	// document.documentElement as the wrapper — so CSS vars cascade to
	// overlay buttons that live outside any `.atlas-ar-tryon-buttons` element
	// (see `tryon.css` for the `.art-tryon-image-overlay` rule that uses
	// these vars).
	var DOC_ROOT = cfg.docRoot || '';

	if ( ! ids.length ) {
		return;
	}

	function isTransparent( c ) {
		return ! c || c === 'transparent' || /^rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/.test( c );
	}
	function makeProbe( classes ) {
		var p = document.createElement( 'a' );
		p.className = classes;
		p.setAttribute( 'aria-hidden', 'true' );
		p.setAttribute( 'tabindex', '-1' );
		p.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden;pointer-events:none;';
		p.textContent = 'probe';
		document.body.appendChild( p );
		return p;
	}
	function findLive( w ) {
		var selectors = [
			'.single_add_to_cart_button',
			'.woocommerce a.button.alt',
			'.woocommerce-Button',
			'.btn-primary',
			'a.button',
			'button.button',
			'.btn'
		];
		// When `w` is `document.documentElement` (the sentinel target),
		// `w.contains(n)` is true for every element on the page and we'd
		// reject all candidates. Only exclude descendants of `w` when
		// `w` is a real wrapper element scoped inside the page.
		var skipContains = w === document.documentElement || w === document.body;
		for ( var i = 0; i < selectors.length; i++ ) {
			var nodes = document.querySelectorAll( selectors[ i ] );
			for ( var j = 0; j < nodes.length; j++ ) {
				var n = nodes[ j ];
				if ( ! skipContains && w.contains( n ) ) continue;
				if ( n.offsetParent === null && n.getClientRects().length === 0 ) continue;
				return n;
			}
		}
		return null;
	}
	function hasStyledBg( cs ) {
		return ! isTransparent( cs.backgroundColor ) || ( cs.backgroundImage && cs.backgroundImage !== 'none' );
	}
	function readThemePresetColor() {
		// theme.json colors exposed by modern themes (Twenty Twenty-X,
		// Hello Elementor, most block themes). Order: accent (call-to-
		// action), then primary, then contrast (deepest brand color).
		var root = window.getComputedStyle( document.documentElement );
		var keys = [ '--wp--preset--color--accent', '--wp--preset--color--primary', '--wp--preset--color--contrast' ];
		for ( var i = 0; i < keys.length; i++ ) {
			var v = root.getPropertyValue( keys[ i ] ).trim();
			if ( v ) return v;
		}
		return null;
	}
	function sampleLinkColor() {
		// Last-ditch fallback for framework themes like Hello Elementor
		// that ship no button styling AND no theme.json color presets.
		// The default link color is almost always the theme's accent.
		var p = document.createElement( 'a' );
		p.href = '#';
		p.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden;';
		p.textContent = 'x';
		document.body.appendChild( p );
		var c = window.getComputedStyle( p ).color;
		p.remove();
		return ( c && ! isTransparent( c ) ) ? c : null;
	}
	function apply( w ) {
		if ( ! w ) return;
		var sample = null;
		var probes = [];
		var paletteBg = null;
		// (1) Live theme button on the page — strongest signal.
		var live = findLive( w );
		if ( live && hasStyledBg( window.getComputedStyle( live ) ) ) {
			sample = live;
		}
		// (2) Probe with classic button conventions. NOTE: we
		//     deliberately exclude `.wp-element-button` from this round —
		//     it's WordPress core's universal fallback (dark gray
		//     #32373c) on themes that don't otherwise style it, which
		//     would mask better signals from theme.json / link color.
		//     Same reason we skip the combined Gutenberg + WC probe —
		//     it carries `.wp-element-button` and would hit that
		//     fallback when WC styling isn't loaded (non-WC pages).
		if ( ! sample ) {
			probes = [
				makeProbe( 'button add_to_cart_button product_type_simple' ),
				makeProbe( 'button' ),
				makeProbe( 'btn btn-primary' )
			];
			for ( var pi = 0; pi < probes.length; pi++ ) {
				if ( hasStyledBg( window.getComputedStyle( probes[ pi ] ) ) ) {
					sample = probes[ pi ];
					break;
				}
			}
		}
		// (3) Theme.json color presets — block themes / Hello Elementor.
		if ( ! sample ) {
			paletteBg = readThemePresetColor();
		}
		// (4) Link color — Hello Elementor and other framework themes.
		if ( ! sample && ! paletteBg ) {
			paletteBg = sampleLinkColor();
		}
		// (5) Last-resort: `.wp-element-button` probe (accepts WP default).
		if ( ! sample && ! paletteBg ) {
			var elProbe = makeProbe( 'wp-block-button__link wp-element-button button' );
			probes.push( elProbe );
			if ( hasStyledBg( window.getComputedStyle( elProbe ) ) ) {
				sample = elProbe;
			}
		}
		// Apply palette-only result: just bg + white text. No font /
		// padding / border sampling because we don't have a real button
		// to copy from — use sensible defaults instead.
		if ( ! sample && paletteBg ) {
			w.style.setProperty( '--atlas-ar-btn-bg', paletteBg );
			w.style.setProperty( '--atlas-ar-btn-color', '#fff' );
			probes.forEach( function ( p ) { if ( p.parentNode ) p.parentNode.removeChild( p ); } );
			return;
		}
		if ( ! sample ) {
			probes.forEach( function ( p ) { if ( p.parentNode ) p.parentNode.removeChild( p ); } );
			return;
		}
		var cs = window.getComputedStyle( sample );
		function set( name, value ) { if ( value ) w.style.setProperty( name, value ); }
		set( '--atlas-ar-btn-bg', cs.backgroundColor );
		set( '--atlas-ar-btn-bg-image', cs.backgroundImage && cs.backgroundImage !== 'none' ? cs.backgroundImage : null );
		set( '--atlas-ar-btn-color', cs.color );
		set( '--atlas-ar-btn-border-width', cs.borderTopWidth );
		set( '--atlas-ar-btn-border-style', cs.borderTopStyle );
		set( '--atlas-ar-btn-border-color', cs.borderTopColor );
		set( '--atlas-ar-btn-radius', cs.borderRadius );
		set( '--atlas-ar-btn-padding', cs.paddingTop + ' ' + cs.paddingRight + ' ' + cs.paddingBottom + ' ' + cs.paddingLeft );
		set( '--atlas-ar-btn-font-family', cs.fontFamily );
		set( '--atlas-ar-btn-font-size', cs.fontSize );
		set( '--atlas-ar-btn-font-weight', cs.fontWeight );
		set( '--atlas-ar-btn-line-height', cs.lineHeight );
		set( '--atlas-ar-btn-letter-spacing', cs.letterSpacing );
		set( '--atlas-ar-btn-text-transform', cs.textTransform );
		set( '--atlas-ar-btn-text-decoration', cs.textDecorationLine || cs.textDecoration );
		set( '--atlas-ar-btn-shadow', cs.boxShadow );
		set( '--atlas-ar-btn-transition', cs.transition );
		set( '--atlas-ar-btn-cursor', cs.cursor );
		set( '--atlas-ar-btn-min-height', cs.minHeight );
		probes.forEach( function ( p ) { if ( p.parentNode ) p.parentNode.removeChild( p ); } );
	}
	function run() {
		for ( var i = 0; i < ids.length; i++ ) {
			var target = ids[ i ] === DOC_ROOT ? document.documentElement : document.getElementById( ids[ i ] );
			apply( target );
		}
	}
	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', run );
	} else {
		run();
	}
} )();
