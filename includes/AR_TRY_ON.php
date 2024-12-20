<?php

namespace AR_TRY_ON;

use AR_TRY_ON_Admin\AR_TRY_ON_Admin;
use AR_TRY_ON_Public\AR_TRY_ON_Public;

/**
 * The file that defines the core plugin class
 *
 * A class definition that includes attributes and functions used across both the
 * public-facing side of the site and the admin area.
 *
 * @link       http://azizulhasan.com
 * @since      1.0.0
 *
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/includes
 */

/**
 * The core plugin class.
 *
 * This is used to define internationalization, admin-specific hooks, and
 * public-facing site hooks.
 *
 * Also maintains the unique identifier of this plugin as well as the current
 * version of the plugin.
 *
 * @since      1.0.0
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/includes
 * @author     Azizul Hasan <azizulhasan.cr@gmail.com>
 */
class AR_TRY_ON {

	/**
	 * The loader that's responsible for maintaining and registering all hooks that power
	 * the plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      AR_TRY_ON_Loader $loader Maintains and registers all hooks for the plugin.
	 */
	protected $loader;

	/**
	 * The unique identifier of this plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      string $plugin_name The string used to uniquely identify this plugin.
	 */
	protected $plugin_name;

	/**
	 * The current version of the plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      string $version The current version of the plugin.
	 */
	protected $version;

	/**
	 * The unique prefix of this plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      string $plugin_prefix The string used to uniquely prefix technical functions of this plugin.
	 */
	protected $plugin_prefix;

	/**
	 * Define the core functionality of the plugin.
	 *
	 * Set the plugin name and the plugin version that can be used throughout the plugin.
	 * Load the dependencies, define the locale, and set the hooks for the admin area and
	 * the public-facing side of the site.
	 *
	 * @since    1.0.0
	 */
	public function __construct() {
		if ( defined( 'AR_TRY_ON_VERSION' ) ) {
			$this->version = AR_TRY_ON_VERSION;
		} else {
			$this->version = '1.0.0';
		}
		$this->plugin_name   = 'ar-try-on-for-wordpress';
		$this->plugin_prefix = 'ar_try_on_';


		$this->load_dependencies();
		$this->set_locale();
		$this->define_admin_hooks();
		$this->define_public_hooks();
	}

	/**
	 * Load the required dependencies for this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function load_dependencies() {

		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/AR_TRY_ON_Hooks.php';

		$this->loader = new AR_TRY_ON_Loader();

	}

	/**
	 * Define the locale for this plugin for internationalization.
	 *
	 * Uses the AR_TRY_ON_i18n class in order to set the domain and to register the hook
	 * with WordPress.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function set_locale() {

		$plugin_i18n = new AR_TRY_ON_i18n();
		$this->loader->add_action( 'plugins_loaded', $plugin_i18n, 'load_plugin_textdomain' );

	}

	/**
	 * Register all of the hooks related to the admin area functionality
	 * of the plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function define_admin_hooks() {

		$plugin_admin = new AR_TRY_ON_Admin( $this->get_plugin_name(), $this->get_version() );

		$this->loader->add_action( 'admin_enqueue_scripts', $plugin_admin, 'enqueue_styles', 999999 );
		$this->loader->add_action( 'admin_enqueue_scripts', $plugin_admin, 'enqueue_scripts', 99999 );


		$this->loader->add_action( 'admin_menu', $plugin_admin, 'ar_try_on_menu' );
	}

	/**
	 * Register all of the hooks related to the admin area functionality
	 * of the plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function define_public_hooks() {

		$plugin_public = new AR_TRY_ON_Public( $this->get_plugin_name(), $this->get_plugin_prefix(), $this->get_version() );

			$this->loader->add_action( 'wp_enqueue_scripts', $plugin_public, 'enqueue_styles', 99999 );

			$this->loader->add_action( 'wp_enqueue_scripts', $plugin_public, 'enqueue_scripts', 99999 );


		switch ( true ) {
			case 1:
				$this->loader->add_action( 'wordpress_before_single_product_summary', $plugin_public, 'ar_try_on_for_wordpress_button' );
				break;
			case 2:
				$this->loader->add_action( 'wordpress_after_single_product_summary', $plugin_public, 'ar_try_on_for_wordpress_button' );
				break;
			case 3:
				$this->loader->add_action( 'wordpress_before_single_product', $plugin_public, 'ar_try_on_for_wordpress_button' );
				break;
			case 4:
				$this->loader->add_action( 'wordpress_after_single_product', $plugin_public, 'ar_try_on_for_wordpress_button' );
				break;
			case 5:
				$this->loader->add_action( 'wordpress_after_add_to_cart_form', $plugin_public, 'ar_try_on_for_wordpress_button' );
				break;
			case 6:
				$this->loader->add_action( 'wordpress_before_add_to_cart_form', $plugin_public, 'ar_try_on_for_wordpress_button' );
				break;
		}


	}

	/**
	 * Run the loader to execute all of the hooks with WordPress.
	 *
	 * @since    1.0.0
	 */
	public function run() {
		$this->loader->run();
	}

	/**
	 * The name of the plugin used to uniquely identify it within the context of
	 * WordPress and to define internationalization functionality.
	 *
	 * @return    string    The name of the plugin.
	 * @since     1.0.0
	 */
	public function get_plugin_name() {
		return $this->plugin_name;
	}

	/**
	 * The reference to the class that orchestrates the hooks with the plugin.
	 *
	 * @return    AR_TRY_ON_Loader    Orchestrates the hooks of the plugin.
	 * @since     1.0.0
	 */
	public function get_loader() {
		return $this->loader;
	}

	/**
	 * Retrieve the version number of the plugin.
	 *
	 * @return    string    The version number of the plugin.
	 * @since     1.0.0
	 */
	public function get_version() {
		return $this->version;
	}

	/**
	 * The unique prefix of the plugin used to uniquely prefix technical functions.
	 *
	 * @return    string    The prefix of the plugin.
	 * @since     1.0.0
	 */
	public function get_plugin_prefix() {
		return $this->plugin_prefix;
	}

}
