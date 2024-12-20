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
	}

	/**
	 * Register MetaBox to add PDF Download Button
	 */
	public function add_custom_meta_box() {

        if(!AR_TRY_ON_Helper::is_product_page()) {
            return;
        }


		$plugin_name = 'AR Try-On';
		add_meta_box(
			'ar_try_on-meta-box',
			$plugin_name,
			array(
				$this,
				'ar_try_on_meta_box',
			),
			get_current_screen()->post_type,
			'advanced',
			'high',
			null
		);

	}

	/**
	 * Add meta box for record, re-record, listen content with loud.
	 */
	public function ar_try_on_meta_box() {

		\do_action( 'ar_try_on_before_metabox_content' );
		?>
        <div class="tta_metabox">
            <div id="ar_try_on_product_model_settings"></div>
            <?php  \do_action( 'ar_try_on_after_free_metabox_settings' );  ?>
            <div id="ar_try_on_analytics"></div>
        </div>
		<?php
		\do_action( 'ar_try_on_after_metabox_content' );
	}
}

new AR_TRY_ON_Hooks();

