<?php
namespace AR_TRY_ON_Admin; // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedNamespaceFound -- Stable internal namespace (AR-66).

use AR_TRY_ON\AR_TRY_ON_Cache;
use AR_TRY_ON\AR_TRY_ON_Compression;
use AR_TRY_ON\AR_TRY_ON_Helper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Setup wizard (AR-72).
 *
 * The wizard is one more view of the existing dashboard bundle: when the
 * AtlasAR page is opened with `&welcome=1` (or `&welcome=pro`) the React
 * entry renders the wizard instead of the tabs. This class owns
 * everything around it:
 *
 * - the onboarding flags (`ar_try_on_onboarding_completed`, and
 *   `ar_try_on_pro_onboarding_completed` which Pro writes on activation),
 * - the one-time redirect after activating on a new site,
 * - the one-time notice for sites that existed before the wizard,
 * - the `ar_try_on/v1/wizard` route that saves the answers.
 *
 * Flag values: `pending` (should be set up), `legacy` (installed before
 * the wizard existed), `done`, `skipped`.
 *
 * Pro plugs in without a second wizard: its steps are registered in JS
 * through the `atlasAr.wizard.steps` wp.hooks filter, its data through
 * the `atlas_ar_wizard_data` PHP filter, and it saves its own answers on
 * the `atlas_ar_wizard_saved` action.
 *
 * @since 2.3.0
 */
class AR_TRY_ON_Wizard {

	const OPTION             = 'ar_try_on_onboarding_completed';
	const PRO_OPTION         = 'ar_try_on_pro_onboarding_completed';
	const REDIRECT_TRANSIENT = 'ar_try_on_activation_redirect';
	const NOTICE_META        = 'ar_try_on_wizard_notice_dismissed';
	const PAGE               = 'ar-vr-3d-model-try-on';

	/**
	 * Keys of `ar_try_on_settings` the wizard may write, with the values
	 * each one accepts. `null` means free text / colour (sanitised below).
	 */
	const SETTING_RULES = array(
		'ar_try_on_display_button_automatically' => array( 'yes', 'no' ),
		'ar_try_on_single_product_tabs'          => array( 'yes', 'no' ),
		'ar_try_on_wc_hook_position'             => array( 'product_image', '3d_viewer', '1', '2', '3', '4', '5', '6', '7' ),
		'model_load_strategy'                    => array( 'auto', 'interaction' ),
		'ar_try_on_ar_button'                    => array( 'activate', 'deactivate' ),
		'ar_try_on_enable_qr_code'               => array( 'yes', 'no' ),
		'ar_try_on_interaction_prompt'           => array( 'auto', 'when-focused', 'none' ),
		'ar_try_on_interaction_prompt_style'     => array( 'wiggle', 'basic' ),
		'ar_try_on_ar_button_text'               => null,
		'ar_try_on_ar_button_background_color'   => null,
		'ar_try_on_ar_button_text_color'         => null,
		'tryon_button_label'                     => null,
	);

	/**
	 * Placements the wizard may set on the chosen product.
	 */
	const PLACEMENTS = array( 'floor', 'wall', 'face-glasses', 'face-hat' );

	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	public function init() {
		add_action( 'admin_init', array( $this, 'maybe_migrate' ), 5 );
		add_action( 'admin_init', array( $this, 'maybe_redirect' ) );
		add_action( 'admin_notices', array( $this, 'render_notice' ) );
		add_action( 'admin_post_atlas_ar_dismiss_wizard_notice', array( $this, 'dismiss_notice' ) );
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/* ------------------------------------------------------------------ */
	/*  Flags                                                             */
	/* ------------------------------------------------------------------ */

	/**
	 * Called from the free plugin's activation hook.
	 *
	 * @param bool $is_fresh_install True when the plugin has never been
	 *                               activated on this site before.
	 */
	public static function on_activation( $is_fresh_install ) {
		$state = get_option( self::OPTION, '' );

		if ( $is_fresh_install && '' === $state ) {
			update_option( self::OPTION, 'pending', false );
			$state = 'pending';
		}

		// A site that installed but never finished the wizard gets it
		// again on re-activation; finished, skipped and older sites don't.
		if ( 'pending' === $state ) {
			set_transient( self::REDIRECT_TRANSIENT, 'free', MINUTE_IN_SECONDS );
		}
	}

	/**
	 * Sites that existed before the wizard never ran the new activation
	 * code. Mark them `legacy` once so they get the notice, not a redirect.
	 */
	public function maybe_migrate() {
		if ( false !== get_option( self::OPTION ) ) {
			return;
		}

		$existing = false !== get_option( 'ar_try_on_activated_at' ) || false !== get_option( 'ar_try_on_settings' );
		update_option( self::OPTION, $existing ? 'legacy' : 'pending', false );

		if ( AR_TRY_ON_Helper::is_pro_active() && false === get_option( self::PRO_OPTION ) ) {
			update_option( self::PRO_OPTION, $existing ? 'legacy' : 'pending', false );
		}
	}

	public static function free_state() {
		return (string) get_option( self::OPTION, '' );
	}

	public static function pro_state() {
		return (string) get_option( self::PRO_OPTION, '' );
	}

	/**
	 * Whether the free part still needs attention (shown in the notice).
	 */
	private static function free_needs_setup() {
		return in_array( self::free_state(), array( 'pending', 'legacy' ), true );
	}

	/**
	 * Whether the Pro part still needs attention (shown in the notice).
	 */
	private static function pro_needs_setup() {
		return AR_TRY_ON_Helper::is_pro_active() && in_array( self::pro_state(), array( 'pending', 'legacy' ), true );
	}

	/* ------------------------------------------------------------------ */
	/*  Redirect + notice                                                 */
	/* ------------------------------------------------------------------ */

	/**
	 * One redirect after activation. Value `free` opens the full wizard,
	 * `pro` (set by Pro when the free setup is already done) the Pro part.
	 */
	public function maybe_redirect() {
		$target = get_transient( self::REDIRECT_TRANSIENT );
		if ( ! $target ) {
			return;
		}
		delete_transient( self::REDIRECT_TRANSIENT );

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Core flag set during bulk activation; presence check only.
		if ( wp_doing_ajax() || is_network_admin() || isset( $_GET['activate-multi'] ) || ! current_user_can( 'manage_options' ) ) {
			return;
		}

		wp_safe_redirect( self::wizard_url( 'pro' === $target ? 'pro' : '1' ) );
		exit;
	}

	public static function wizard_url( $mode = '1' ) {
		return add_query_arg(
			array(
				'page'    => self::PAGE,
				'welcome' => $mode,
			),
			admin_url( 'admin.php' )
		);
	}

	/**
	 * The wizard mode requested on this screen: '' (no wizard), 'full' or 'pro'.
	 */
	public static function requested_mode() {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- Read-only routing check on an admin page, no state change.
		if ( ! isset( $_GET['page'], $_GET['welcome'] ) || self::PAGE !== $_GET['page'] ) {
			return '';
		}
		$welcome = sanitize_key( wp_unslash( $_GET['welcome'] ) );
		// phpcs:enable WordPress.Security.NonceVerification.Recommended
		if ( ! current_user_can( 'manage_options' ) ) {
			return '';
		}
		if ( 'pro' === $welcome ) {
			return AR_TRY_ON_Helper::is_pro_active() ? 'pro' : 'full';
		}

		return '1' === $welcome ? 'full' : '';
	}

	/**
	 * One notice for sites that still need setup: existing sites (no
	 * redirect ever happens for them) and sites whose redirect was skipped
	 * (bulk activation). Dashboard and AtlasAR screens only, per user.
	 */
	public function render_notice() {
		if ( ! current_user_can( 'manage_options' ) || '' !== self::requested_mode() ) {
			return;
		}
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || ! in_array( $screen->id, array( 'dashboard', 'toplevel_page_' . self::PAGE ), true ) ) {
			return;
		}
		if ( get_user_meta( get_current_user_id(), self::NOTICE_META, true ) ) {
			return;
		}

		$free = self::free_needs_setup();
		$pro  = self::pro_needs_setup();
		if ( ! $free && ! $pro ) {
			return;
		}

		$dismiss_url = wp_nonce_url( admin_url( 'admin-post.php?action=atlas_ar_dismiss_wizard_notice' ), 'atlas_ar_dismiss_wizard_notice' );
		?>
		<div class="notice notice-info">
			<p><strong><?php esc_html_e( 'AtlasAR has a new setup guide.', 'ar-vr-3d-model-try-on' ); ?></strong></p>
			<p>
				<?php
				if ( $free ) {
					esc_html_e( 'It takes about two minutes: where 3D appears, your first model, page speed and try-on. It starts from your current settings, and nothing changes until you press Finish.', 'ar-vr-3d-model-try-on' );
				} else {
					esc_html_e( 'Your free setup is done. A short guide covers the features AtlasAR Pro adds. Nothing changes until you press Finish.', 'ar-vr-3d-model-try-on' );
				}
				?>
			</p>
			<p>
				<a class="button button-primary" href="<?php echo esc_url( self::wizard_url( $free ? '1' : 'pro' ) ); ?>"><?php esc_html_e( 'Open setup guide', 'ar-vr-3d-model-try-on' ); ?></a>
				<?php if ( $free && $pro ) : ?>
					<a class="button" href="<?php echo esc_url( self::wizard_url( 'pro' ) ); ?>"><?php esc_html_e( 'Only the Pro part', 'ar-vr-3d-model-try-on' ); ?></a>
				<?php endif; ?>
				<a href="<?php echo esc_url( $dismiss_url ); ?>"><?php esc_html_e( 'Dismiss', 'ar-vr-3d-model-try-on' ); ?></a>
			</p>
		</div>
		<?php
	}

	public function dismiss_notice() {
		check_admin_referer( 'atlas_ar_dismiss_wizard_notice' );
		if ( current_user_can( 'manage_options' ) ) {
			update_user_meta( get_current_user_id(), self::NOTICE_META, 1 );
		}
		wp_safe_redirect( wp_get_referer() ? wp_get_referer() : admin_url() );
		exit;
	}

	/* ------------------------------------------------------------------ */
	/*  Data for the React wizard                                         */
	/* ------------------------------------------------------------------ */

	/**
	 * Payload added to the dashboard's `ar_try_on` object as `wizard`.
	 * Only built on the wizard screen.
	 *
	 * @return array
	 */
	public function get_client_data() {
		$mode = self::requested_mode();
		if ( '' === $mode ) {
			return array(
				'active' => false,
				'url'    => self::wizard_url(),
			);
		}

		$data = array(
			'active'        => true,
			'url'           => self::wizard_url(),
			'mode'          => $mode,
			'free_state'    => self::free_state(),
			'pro_state'     => self::pro_state(),
			'dashboard_url' => admin_url( 'admin.php?page=' . self::PAGE ),
			'settings'      => AR_TRY_ON_Helper::get_settings(),
			'compression'   => AR_TRY_ON_Compression::get_settings(),
			'sample_model'  => AR_TRY_ON_Helper::default_model_settings(),
			'posts'         => $this->get_posts_by_type(),
		);

		/**
		 * Filter: atlas_ar_wizard_data
		 *
		 * Lets Pro add the data its wizard steps need (under its own key).
		 *
		 * @param array $data Wizard payload.
		 */
		return apply_filters( 'atlas_ar_wizard_data', $data );
	}

	/**
	 * Recent published items for each post type AR can be enabled on, so
	 * the "First 3D model" step can offer one to try.
	 *
	 * @return array post_type => list of items
	 */
	private function get_posts_by_type() {
		$demo_src = AR_TRY_ON_Helper::default_model_settings()['src'];
		$result   = array();

		foreach ( (array) AR_TRY_ON_Helper::get_post_types() as $post_type ) {
			$post_type = is_array( $post_type ) ? ( $post_type['value'] ?? '' ) : $post_type;
			if ( ! $post_type || 'attachment' === $post_type || ! post_type_exists( $post_type ) ) {
				continue;
			}
			$ids  = get_posts(
				array(
					'post_type'      => $post_type,
					'post_status'    => 'publish',
					'posts_per_page' => 20,
					'fields'         => 'ids',
					'no_found_rows'  => true,
				)
			);
			$list = array();
			foreach ( $ids as $id ) {
				$meta   = (array) get_post_meta( $id, 'ar_try_on_product_settings', true );
				$src    = isset( $meta['src'] ) ? (string) $meta['src'] : '';
				$list[] = array(
					'id'           => $id,
					'title'        => html_entity_decode( get_the_title( $id ), ENT_QUOTES, 'UTF-8' ),
					'has_model'    => '' !== $src && $src !== $demo_src,
					'src'          => $src,
					'ios_src'      => isset( $meta['ios_src'] ) ? (string) $meta['ios_src'] : '',
					'poster'       => isset( $meta['poster'] ) ? (string) $meta['poster'] : '',
					'ar_placement' => isset( $meta['ar_placement'] ) ? (string) $meta['ar_placement'] : 'floor',
					'edit_url'     => get_edit_post_link( $id, 'raw' ),
					'view_url'     => get_permalink( $id ),
				);
			}
			$result[ $post_type ] = $list;
		}

		return $result;
	}

	/* ------------------------------------------------------------------ */
	/*  REST                                                              */
	/* ------------------------------------------------------------------ */

	public function register_routes() {
		register_rest_route(
			'ar_try_on/v1',
			'/wizard',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'save' ),
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
			)
		);
	}

	/**
	 * Save the wizard. Only keys sent by the steps that were shown are
	 * written; everything else in the options is left as it is.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function save( $request ) {
		$params = (array) $request->get_json_params();
		$mode   = isset( $params['mode'] ) && 'pro' === $params['mode'] ? 'pro' : 'full';
		$status = isset( $params['status'] ) && 'skipped' === $params['status'] ? 'skipped' : 'done';
		$pro    = AR_TRY_ON_Helper::is_pro_active();

		if ( 'done' === $status ) {
			if ( 'full' === $mode ) {
				if ( isset( $params['settings'] ) && is_array( $params['settings'] ) ) {
					$this->save_settings( $params['settings'] );
				}
				if ( isset( $params['product'] ) && is_array( $params['product'] ) ) {
					$this->save_product( $params['product'] );
				}
				if ( isset( $params['compression'] ) && is_array( $params['compression'] ) ) {
					AR_TRY_ON_Compression::update_settings(
						array(
							'enabled' => ! empty( $params['compression']['enabled'] ),
							'quality' => max( 10, min( 100, absint( $params['compression']['quality'] ?? 85 ) ) ),
						)
					);
				}
			}

			/**
			 * Action: atlas_ar_wizard_saved
			 *
			 * Fires after the wizard's free answers are saved. Pro saves its
			 * own answers (sent under `pro`) here.
			 *
			 * @param array  $params Request body.
			 * @param string $mode   'full' or 'pro'.
			 */
			do_action( 'atlas_ar_wizard_saved', $params, $mode );
		}

		if ( 'full' === $mode ) {
			update_option( self::OPTION, $status, false );
		}
		if ( $pro ) {
			update_option( self::PRO_OPTION, $status, false );
		}

		return rest_ensure_response(
			array(
				'status' => true,
				'data'   => array(
					'free_state'    => self::free_state(),
					'pro_state'     => self::pro_state(),
					'dashboard_url' => admin_url( 'admin.php?page=' . self::PAGE ),
				),
			)
		);
	}

	/**
	 * Merge the allowed keys into `ar_try_on_settings`.
	 *
	 * @param array $input Settings sent by the wizard.
	 */
	private function save_settings( array $input ) {
		$settings = (array) get_option( 'ar_try_on_settings', array() );
		if ( empty( $settings ) ) {
			$settings = AR_TRY_ON_Helper::default_settings();
		}

		foreach ( self::SETTING_RULES as $key => $allowed ) {
			if ( ! array_key_exists( $key, $input ) ) {
				continue;
			}
			$value = $input[ $key ];
			if ( is_array( $allowed ) ) {
				$value = (string) $value;
				if ( in_array( $value, $allowed, true ) ) {
					$settings[ $key ] = $value;
				}
			} elseif ( false !== strpos( $key, 'color' ) ) {
				$color = sanitize_hex_color( (string) $value );
				if ( $color ) {
					$settings[ $key ] = $color;
				}
			} else {
				$settings[ $key ] = sanitize_text_field( (string) $value );
			}
		}

		if ( array_key_exists( 'tryon_snapshot', $input ) ) {
			$settings['tryon_snapshot'] = ! empty( $input['tryon_snapshot'] );
		}

		if ( isset( $input['ar_try_on_allowed_post_types'] ) && is_array( $input['ar_try_on_allowed_post_types'] ) ) {
			$types = array_values(
				array_filter(
					array_map( 'sanitize_key', $input['ar_try_on_allowed_post_types'] ),
					'post_type_exists'
				)
			);
			// Free supports one post type at a time (same rule as Settings).
			if ( ! AR_TRY_ON_Helper::is_pro_active() ) {
				$types = array_slice( $types, 0, 1 );
			}
			if ( $types ) {
				$settings['ar_try_on_allowed_post_types'] = $types;
			}
		}

		update_option( 'ar_try_on_settings', $settings );

		// Same cache handling as the Settings tab save.
		AR_TRY_ON_Cache::delete( 'settings' );
		AR_TRY_ON_Helper::clear_settings_cache();
		AR_TRY_ON_Cache::set( 'settings', $settings );
		AR_TRY_ON_Helper::update_cache_data( true );
	}

	/**
	 * Put the chosen model on the chosen item.
	 *
	 * @param array $input Product block sent by the wizard.
	 */
	private function save_product( array $input ) {
		$post_id = isset( $input['id'] ) ? absint( $input['id'] ) : 0;
		if ( ! $post_id || ! get_post( $post_id ) || ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}

		$meta = get_post_meta( $post_id, 'ar_try_on_product_settings', true );
		$meta = is_array( $meta ) && ! empty( $meta ) ? $meta : AR_TRY_ON_Helper::default_model_settings();
		$meta = wp_parse_args( $meta, AR_TRY_ON_Helper::default_model_settings() );

		foreach ( array( 'src', 'ios_src', 'poster' ) as $key ) {
			if ( isset( $input[ $key ] ) ) {
				$meta[ $key ] = esc_url_raw( (string) $input[ $key ] );
			}
		}
		if ( isset( $input['alt'] ) ) {
			$meta['alt'] = sanitize_text_field( (string) $input['alt'] );
		}
		if ( isset( $input['ar_placement'] ) && in_array( $input['ar_placement'], self::PLACEMENTS, true ) ) {
			$meta['ar_placement'] = $input['ar_placement'];
		}

		update_post_meta( $post_id, 'ar_try_on_product_settings', $meta );
	}
}
