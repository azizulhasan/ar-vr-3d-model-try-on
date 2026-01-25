<?php

namespace AR_TRY_ON;
/**
 * Fired during plugin activation
 *
 * @link       http://azizulhasan.com
 * @since      1.0.0
 *
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/includes
 */

/**
 * Fired during plugin activation.
 *
 * This class defines all code necessary to run during the plugin's activation.
 *
 * @since      1.0.0
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/includes
 * @author     Azizul Hasan <azizulhasan.cr@gmail.com>
 */
class AR_TRY_ON_Hooks {

	public function __construct() {
		add_action( 'add_meta_boxes', array( $this, 'add_custom_meta_box' ) );

		// Hook to update cache when any post is created or updated
		add_action( 'save_post', [ 'AR_TRY_ON\AR_TRY_ON_Cache', 'update_post_type_cache' ] );

		// Hook to update cache when any post is deleted
		add_action( 'delete_post', [ 'AR_TRY_ON\AR_TRY_ON_Cache', 'update_post_type_cache' ] );

		add_filter( 'wp_kses_allowed_html', [ $this, 'allow_model_viewer_attributes' ], 10, 2 );
	}

	/**
     * Allow all attributes for the <model-viewer> tag
     *
	 * @param $tags
	 * @param $context
	 *
	 * @return mixed
	 */
	public function allow_model_viewer_attributes( $tags, $context ) {
		// Check the context or directly apply changes
		if ( ! isset( $tags['model-viewer'] ) ) {
			$tags['model-viewer'] = [];
		}

		// Allow any attribute for <model-viewer>
		$tags['model-viewer']['*'] = true;

		return $tags;
	}

	/**
	 * Register MetaBox to add PDF Download Button
	 */
	public function add_custom_meta_box() {
		$plugin_name = 'AtlasAR';

		global $post;
		if ( $post && AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
			add_meta_box(
				'ar_try_on-meta-box',
				$plugin_name,
				array(
					$this,
					'atlas_ar_meta_box',
				),
				get_current_screen()->post_type,
				'advanced',
				'high',
				null
			);
		}


	}

	/**
	 * Add meta box for record, re-record, listen content with loud.
	 */
	public function atlas_ar_meta_box() {

		\do_action( 'atlas_ar_before_metabox_content' );
		?>
        <div class="tta_metabox">
            <div id="atlas_ar_product_model_settings"></div>
			<?php \do_action( 'ATLAS_AR_after_free_metabox_settings' ); ?>
            <div id="atlas_ar_analytics"></div>
        </div>
		<?php
		\do_action( 'atlas_ar_after_metabox_content' );
	}
}

new AR_TRY_ON_Hooks();

