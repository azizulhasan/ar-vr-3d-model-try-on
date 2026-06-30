<?php
namespace AR_TRY_ON; // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedNamespaceFound -- Stable internal namespace; renaming risks a Free/Pro update-window fatal (see plan/AR-66).
/**
 * Admin Notice System
 *
 * Reusable admin notice system with per-user dismissal
 *
 * @link       http://azizulhasan.com
 * @since      1.8.0
 *
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/includes
 */

defined( 'ABSPATH' ) || exit;

/**
 * AR_TRY_ON_Admin_Notice Class
 *
 * Handles admin notices with user-specific dismissal and tracking
 *
 * @since 1.8.0
 */
class AR_TRY_ON_Admin_Notice {

	/**
	 * Singleton instance
	 *
	 * @var AR_TRY_ON_Admin_Notice
	 */
	private static $instance = null;

	/**
	 * Registered notices
	 *
	 * @var array
	 */
	private $notices = array();

	/**
	 * Get singleton instance
	 *
	 * @return AR_TRY_ON_Admin_Notice
	 */
	public static function instance() {
		if ( self::$instance === null ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor
	 */
	private function __construct() {
		add_action( 'admin_notices', array( $this, 'display_notices' ) );
		add_action( 'wp_ajax_atlas_ar_dismiss_notice', array( $this, 'ajax_dismiss_notice' ) );
		add_action( 'wp_ajax_atlas_ar_track_notice_action', array( $this, 'ajax_track_notice_action' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_scripts' ) );

		// Register default promo notice
		$this->register_promo_notice();

		// Register the smart review-request notice
		$this->register_review_notice();
	}

	/**
	 * Enqueue scripts for notices
	 */
	public function enqueue_scripts() {
		wp_enqueue_script(
			'ar-try-on-admin-notice',
			plugin_dir_url( dirname( __FILE__ ) ) . 'admin/js/admin-notice.js',
			array( 'jquery' ),
			ATLAS_AR_VERSION,
			true
		);

		wp_localize_script(
			'ar-try-on-admin-notice',
			'arNoticeData',
			array(
				'ajaxurl' => admin_url( 'admin-ajax.php' ),
				'nonce'   => wp_create_nonce( 'atlas_ar_notice_nonce' ),
			)
		);
	}

	/**
	 * Register a new notice
	 *
	 * @param array $args Notice configuration
	 * @return bool
	 */
	public function register_notice( $args ) {
		$defaults = array(
			'id'                => '',           // Unique ID (required)
			'title'             => '',           // Notice title (required)
			'message'           => '',           // Notice message (required)
			'type'              => 'info',       // info, success, warning, error
			'icon'              => '🎉',         // Emoji icon
			'dismissible'       => true,         // Can user dismiss?
			'show_once'         => false,        // Show only once per user?
			'condition'         => null,         // Callable condition to check if notice should show
			'screens'           => array(),      // Specific screens to show on (empty = all admin)
			'buttons'           => array(),      // Array of buttons
			'footer_text'       => '',           // Small text at bottom
			'track_clicks'      => false,        // Track button clicks?
			'max_clicks'        => 0,            // Max clicks (0 = unlimited)
			'click_action'      => null,         // Callable when button clicked
			'reshow_after_days' => 0,            // Re-show this many days after dismissal (0 = permanent)
		);

		$notice = wp_parse_args( $args, $defaults );

		// Validate required fields
		if ( empty( $notice['id'] ) || empty( $notice['title'] ) ) {
			return false;
		}

		$this->notices[ $notice['id'] ] = $notice;
		return true;
	}

	/**
	 * Display all active notices
	 */
	public function display_notices() {
		foreach ( $this->notices as $notice_id => $notice ) {
			$this->display_notice( $notice_id, $notice );
		}
	}

	/**
	 * Display a single notice
	 *
	 * @param string $notice_id Notice ID
	 * @param array  $notice Notice configuration
	 */
	private function display_notice( $notice_id, $notice ) {
		// Check condition
		if ( is_callable( $notice['condition'] ) && ! call_user_func( $notice['condition'] ) ) {
			return;
		}

		// Check screen
		if ( ! empty( $notice['screens'] ) && ! $this->is_current_screen( $notice['screens'] ) ) {
			return;
		}

		$user_id = get_current_user_id();

		// Check if dismissed (honors timed re-show when reshow_after_days is set)
		if ( $notice['dismissible'] && $this->is_dismissed( $notice_id, $notice ) ) {
			return;
		}

		// Check if shown once
		if ( $notice['show_once'] ) {
			$shown = get_user_meta( $user_id, 'ar_try_on_shown_' . $notice_id, true );
			if ( $shown ) {
				return;
			}
			update_user_meta( $user_id, 'ar_try_on_shown_' . $notice_id, true );
		}

		// Check click tracking
		$total_clicks = 0;
		$user_clicked = false;
		if ( $notice['track_clicks'] ) {
			$total_clicks = (int) get_option( 'ar_try_on_clicks_' . $notice_id, 0 );
			$user_clicked = get_user_meta( $user_id, 'ar_try_on_clicked_' . $notice_id, true );

			if ( $notice['max_clicks'] > 0 && $total_clicks >= $notice['max_clicks'] ) {
				return; // Max clicks reached
			}
		}

		// Render notice
		$this->render_notice( $notice_id, $notice, $total_clicks, $user_clicked );
	}

	/**
	 * Render notice HTML
	 *
	 * @param string $notice_id Notice ID
	 * @param array  $notice Notice configuration
	 * @param int    $total_clicks Total clicks
	 * @param bool   $user_clicked User already clicked
	 */
	private function render_notice( $notice_id, $notice, $total_clicks, $user_clicked ) {
		$type_colors = array(
			'info'    => '#00a32a',
			'success' => '#00a32a',
			'warning' => '#ffc107',
			'error'   => '#dc3545',
		);

		$border_color = $type_colors[ $notice['type'] ] ?? $type_colors['info'];
		$dismissible_class = $notice['dismissible'] ? 'is-dismissible' : '';

		?>
		<div class="notice notice-<?php echo esc_attr( $notice['type'] ); ?> <?php echo esc_attr( $dismissible_class ); ?> ar-try-on-notice" data-notice-id="<?php echo esc_attr( $notice_id ); ?>" style="position: relative; border-left-color: <?php echo esc_attr( $border_color ); ?>; padding: 20px;">
			<?php if ( $notice['dismissible'] ) : ?>
			<button type="button" class="notice-dismiss ar-notice-dismiss" data-notice-id="<?php echo esc_attr( $notice_id ); ?>">
				<span class="screen-reader-text"><?php esc_html_e( 'Dismiss this notice.', 'ar-vr-3d-model-try-on' ); ?></span>
			</button>
			<?php endif; ?>

			<div style="display: flex; align-items: center; gap: 20px;">
				<?php if ( ! empty( $notice['icon'] ) ) : ?>
				<div style="flex-shrink: 0;">
					<span style="font-size: 48px;"><?php echo esc_html( $notice['icon'] ); ?></span>
				</div>
				<?php endif; ?>

				<div style="flex-grow: 1;">
					<h2 style="margin: 0 0 10px 0; font-size: 18px; color: <?php echo esc_attr( $border_color ); ?>;">
						<?php echo wp_kses_post( $notice['title'] ); ?>
					</h2>

					<p style="margin: 0 0 10px 0; font-size: 14px; line-height: 1.6;">
						<?php echo wp_kses_post( $notice['message'] ); ?>
					</p>

					<?php if ( $notice['track_clicks'] && $notice['max_clicks'] > 0 ) : ?>
					<div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
						<?php
						$spots_left = max( 0, $notice['max_clicks'] - $total_clicks );
						if ( $spots_left > 0 ) :
							?>
						<div style="background: #fff3cd; padding: 8px 15px; border-radius: 5px; border-left: 3px solid #ffc107;">
							<strong style="color: #856404;">⏰ Only <?php echo esc_html( $spots_left ); ?> spot<?php echo $spots_left !== 1 ? 's' : ''; ?> left!</strong>
						</div>
						<?php endif; ?>
						<?php if ( $total_clicks > 0 ) : ?>
						<div style="color: #666; font-size: 13px;">
							✅ <?php echo esc_html( $total_clicks ); ?> user<?php echo $total_clicks !== 1 ? 's' : ''; ?> already claimed
						</div>
						<?php endif; ?>
					</div>
					<?php endif; ?>

					<?php if ( $user_clicked ) : ?>
					<div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 4px; padding: 10px 15px; margin-bottom: 10px;">
						<strong style="color: #0c5460;">✓ You've already taken action on this!</strong>
					</div>
					<?php endif; ?>

					<?php if ( ! empty( $notice['buttons'] ) ) : ?>
					<div style="display: flex; gap: 10px; margin-top: 15px;">
						<?php foreach ( $notice['buttons'] as $button ) : ?>
							<?php
							$btn_defaults = array(
								'text'       => 'Click Here',
								'url'        => '#',
								'type'       => 'primary', // primary, secondary
								'icon'       => '',
								'action'     => '',        // AJAX action name
								'track'      => false,     // Track this button click?
							);
							$btn = wp_parse_args( $button, $btn_defaults );

							$btn_class = $btn['type'] === 'primary' ? 'button-primary' : 'button-secondary';
							$btn_style = '';
							if ( $btn['type'] === 'primary' ) {
								$btn_style = 'background: ' . esc_attr( $border_color ) . '; border-color: ' . esc_attr( $border_color ) . '; padding: 8px 20px; height: auto; font-size: 14px; box-shadow: 0 2px 4px rgba(0,163,42,0.3);';
							} else {
								$btn_style = 'padding: 8px 20px; height: auto; font-size: 14px;';
							}

							if ( ! empty( $btn['action'] ) ) {
								// AJAX button — emit the data-* attributes inline,
								// each escaped at the point of output.
								?>
								<a href="#" class="button <?php echo esc_attr( $btn_class ); ?> ar-notice-action-btn" data-notice-id="<?php echo esc_attr( $notice_id ); ?>"<?php if ( $btn['track'] ) : ?> data-track="true"<?php endif; ?> data-action="<?php echo esc_attr( $btn['action'] ); ?>" style="<?php echo esc_attr( $btn_style ); ?>">
									<?php if ( ! empty( $btn['icon'] ) ) : ?>
									<span class="dashicons dashicons-<?php echo esc_attr( $btn['icon'] ); ?>" style="margin-top: 3px;"></span>
									<?php endif; ?>
									<?php echo esc_html( $btn['text'] ); ?>
								</a>
								<?php
							} else {
								// Regular link
								?>
								<a href="<?php echo esc_url( $btn['url'] ); ?>" class="button <?php echo esc_attr( $btn_class ); ?>" target="_blank" style="<?php echo esc_attr( $btn_style ); ?>">
									<?php if ( ! empty( $btn['icon'] ) ) : ?>
									<span class="dashicons dashicons-<?php echo esc_attr( $btn['icon'] ); ?>" style="margin-top: 3px;"></span>
									<?php endif; ?>
									<?php echo esc_html( $btn['text'] ); ?>
								</a>
								<?php
							}
							?>
						<?php endforeach; ?>
					</div>
					<?php endif; ?>

					<?php if ( ! empty( $notice['footer_text'] ) ) : ?>
					<p style="margin: 12px 0 0 0; font-size: 12px; color: #666; line-height: 1.5;">
						<?php echo wp_kses_post( $notice['footer_text'] ); ?>
					</p>
					<?php endif; ?>
				</div>
			</div>
		</div>
		<?php
	}

	/**
	 * Check if current screen matches
	 *
	 * @param array $screens Screen IDs
	 * @return bool
	 */
	private function is_current_screen( $screens ) {
		$screen = get_current_screen();
		if ( ! $screen ) {
			return false;
		}

		return in_array( $screen->id, $screens, true );
	}

	/**
	 * AJAX handler for dismissing notices
	 */
	public function ajax_dismiss_notice() {
		check_ajax_referer( 'atlas_ar_notice_nonce', 'nonce' );

		$notice_id = isset( $_POST['notice_id'] ) ? sanitize_text_field( wp_unslash( $_POST['notice_id'] ) ) : '';

		if ( empty( $notice_id ) ) {
			wp_send_json_error( array( 'message' => 'Invalid notice ID' ) );
		}

		$user_id = get_current_user_id();

		// Store dismissal in user meta
		update_user_meta( $user_id, 'ar_try_on_dismiss_' . $notice_id, true );

		// If the notice is configured to re-show, store the cooldown timestamp so
		// is_dismissed() surfaces it again once the window has elapsed.
		$notice = isset( $this->notices[ $notice_id ] ) ? $this->notices[ $notice_id ] : null;
		if ( $notice && (int) $notice['reshow_after_days'] > 0 ) {
			update_option(
				'ar_try_on_reshow_' . $notice_id,
				time() + ( DAY_IN_SECONDS * (int) $notice['reshow_after_days'] ),
				false
			);
		}

		wp_send_json_success( array( 'message' => 'Notice dismissed' ) );
	}

	/**
	 * AJAX handler for notice actions
	 */
	public function ajax_track_notice_action() {
		check_ajax_referer( 'atlas_ar_notice_nonce', 'nonce' );

		$notice_id = isset( $_POST['notice_id'] ) ? sanitize_text_field( wp_unslash( $_POST['notice_id'] ) ) : '';
		$action    = isset( $_POST['action_name'] ) ? sanitize_text_field( wp_unslash( $_POST['action_name'] ) ) : '';

		if ( empty( $notice_id ) || ! isset( $this->notices[ $notice_id ] ) ) {
			wp_send_json_error( array( 'message' => 'Invalid notice ID' ) );
		}

		$notice  = $this->notices[ $notice_id ];
		$user_id = get_current_user_id();
		$user    = wp_get_current_user();

		// Track click if enabled
		if ( $notice['track_clicks'] ) {
			$total_clicks = (int) get_option( 'ar_try_on_clicks_' . $notice_id, 0 );

			if ( $notice['max_clicks'] > 0 && $total_clicks >= $notice['max_clicks'] ) {
				wp_send_json_error( array( 'message' => 'Sorry, all spots have been claimed!' ) );
			}

			// Check if user already clicked
			$already_clicked = get_user_meta( $user_id, 'ar_try_on_clicked_' . $notice_id, true );

			if ( ! $already_clicked ) {
				// Increment counter
				update_option( 'ar_try_on_clicks_' . $notice_id, $total_clicks + 1 );

				// Mark user as clicked
				update_user_meta( $user_id, 'ar_try_on_clicked_' . $notice_id, true );
			}
		}

		// Execute custom action
		if ( is_callable( $notice['click_action'] ) ) {
			$result = call_user_func( $notice['click_action'], $notice_id, $action, $user );

			if ( is_wp_error( $result ) ) {
				wp_send_json_error( array( 'message' => $result->get_error_message() ) );
			}

			if ( is_array( $result ) ) {
				wp_send_json_success( $result );
			}
		}

		wp_send_json_success(
			array(
				'message' => 'Action tracked',
				'email'   => $user->user_email,
			)
		);
	}

	/**
	 * Register the default promo notice — 14-day Pro free trial.
	 *
	 * Shown only when the merchant is on the Free plan (Pro not active)
	 * and they haven't already used the trial. The CTA opens the
	 * Freemius-managed trial activation page baked into the plugin so
	 * the trial starts with one click — no payment, no credit card.
	 */
	private function register_promo_notice() {
		$this->register_notice(
			array(
				'id'            => 'promo_notice',
				'title'         => __( '🎁 Try AtlasAR Pro Free for 14 Days — No Card Required', 'ar-vr-3d-model-try-on' ),
				'message'       => __( 'Unlock the full Pro feature set for 2 weeks on us: <strong>3D depth-occluded overlay</strong>, <strong>watermark-free HD snapshots</strong>, <strong>live per-product calibration</strong>, <strong>server-side compression for large GLBs</strong>, <strong>FBX / OBJ / USDZ format conversion</strong>, <strong>interactive hotspots editor</strong>, <strong>real-world dimensions in AR</strong>, and <strong>per-variation model swap</strong>. Cancel any time — no automatic charge after the trial.', 'ar-vr-3d-model-try-on' ),
				'type'          => 'info',
				'icon'          => '🎁',
				'dismissible'   => true,
				'condition'     => function() {
					// Hide once Pro is active. The trial-utilized check that
					// used to live here was driven by Free's Freemius SDK,
					// which AR-61 §1.1 removed — the trial workflow now lives
					// entirely in the Pro plugin, so Free can only know
					// "Pro is here or not" via the constant check below.
					if ( AR_TRY_ON_Helper::is_pro_active() ) {
						return false;
					}
					return true;
				},
				'track_clicks'  => false,
				'buttons'       => array(
					array(
						'text' => __( 'Start 14-day Free Trial', 'ar-vr-3d-model-try-on' ),
						'type' => 'primary',
						'icon' => 'star-filled',
						'url'  => 'https://wpaugmentedreality.com/pricing/',
					),
					array(
						'text' => __( 'Read Try-On Docs', 'ar-vr-3d-model-try-on' ),
						'type' => 'secondary',
						'icon' => 'book',
						'url'  => 'https://wpaugmentedreality.com/docs/virtual-try-on-glasses-caps/get-started/virtual-try-on-glasses-caps/',
					),
				),
				'footer_text'   => __( 'No credit card required. The trial ends after 14 days — your store automatically reverts to the Free plan unless you choose to subscribe.', 'ar-vr-3d-model-try-on' ),
			)
		);
	}

	/**
	 * Register the smart review-request notice.
	 *
	 * Shown only to admins on the Free plan who have actually got value from
	 * the plugin — at least one real 3D model set up and the plugin active for
	 * two weeks. Mirrors the AtlasVoice review-prompt behaviour: a 90-day
	 * re-show, a 14-day "remind me later" snooze, and a one-click path to the
	 * WordPress.org 5-star review form. Never shown once Pro is active or once
	 * the merchant says they've reviewed / never want to be asked again.
	 */
	private function register_review_notice() {
		// Backfill an activation timestamp for installs that predate it (i.e.
		// users updating to 2.2.3). Seed it 15 days in the past so the 14-day
		// "active for a while" gate clears right away and these existing,
		// already-engaged users see the review prompt as soon as possible.
		// Fresh installs are unaffected: AR_TRY_ON_Activator sets this to the
		// real activation time on activate(), so the option already exists.
		if ( ! get_option( 'ar_try_on_activated_at' ) ) {
			update_option( 'ar_try_on_activated_at', time(), false );
		}

		$activated_at = (int) get_option( 'ar_try_on_activated_at', 0 );
		$days_active  = $activated_at ? ( time() - $activated_at ) / DAY_IN_SECONDS : 0;

		$this->register_notice(
			array(
				'id'                => 'review',
				'title'             => __( 'Enjoying 3D Viewer & AtlasTryOn?', 'ar-vr-3d-model-try-on' ),
				'message'           => __( 'You\'ve set up 3D models on your site — nice work! If the plugin is helping your shoppers, would you consider leaving a quick review? It takes about 30 seconds and genuinely helps us keep building free features.', 'ar-vr-3d-model-try-on' ),
				'type'              => 'success',
				'icon'              => '⭐',
				'dismissible'       => true,
				'reshow_after_days' => 60,
				'condition'         => function () use ( $days_active ) {
					// 1. Admins only.
					if ( ! current_user_can( 'manage_options' ) ) {
						return false;
					}
					// 2. Never show to Pro users.
					if ( AR_TRY_ON_Helper::is_pro_active() ) {
						return false;
					}
					// 3. Honoured "Already did" / "Never ask again".
					if ( get_user_meta( get_current_user_id(), 'ar_try_on_review_done', true ) ) {
						return false;
					}
					// 4. Active for at least 14 days.
					if ( $days_active < 14 ) {
						return false;
					}
					// 5. At least one real (non-demo) 3D model configured.
					if ( $this->get_cached_user_model_count() < 1 ) {
						return false;
					}
					return true;
				},
				'click_action'      => array( $this, 'handle_review_action' ),
				'buttons'           => array(
					array(
						'text'   => __( '⭐ Leave a Review', 'ar-vr-3d-model-try-on' ),
						'type'   => 'primary',
						'action' => 'given',
						'track'  => true,
					),
					array(
						'text'   => __( 'Remind Me Later', 'ar-vr-3d-model-try-on' ),
						'type'   => 'secondary',
						'action' => 'later',
						'track'  => true,
					),
					array(
						'text'   => __( 'I Already Did', 'ar-vr-3d-model-try-on' ),
						'type'   => 'secondary',
						'action' => 'done',
						'track'  => true,
					),
					array(
						'text'   => __( 'Never Ask Again', 'ar-vr-3d-model-try-on' ),
						'type'   => 'secondary',
						'action' => 'never',
						'track'  => true,
					),
				),
				'footer_text'       => __( 'Thank you for using 3D Viewer & AtlasTryOn.', 'ar-vr-3d-model-try-on' ),
			)
		);
	}

	/**
	 * Handle review-notice button actions (given / later / done / never).
	 *
	 * @param string   $notice_id   Notice ID.
	 * @param string   $action_name Action key.
	 * @param \WP_User $user        Current user.
	 * @return array
	 */
	public function handle_review_action( $notice_id, $action_name, $user ) {
		$user_id = $user->ID;
		$result  = array( 'dismiss' => true );

		// Hide it for this user right away in every case.
		update_user_meta( $user_id, 'ar_try_on_dismiss_' . $notice_id, true );

		switch ( $action_name ) {
			case 'given':
				// Sent to leave a review — don't ask again, open the review form.
				update_user_meta( $user_id, 'ar_try_on_review_done', true );
				$result['redirect_url'] = 'https://wordpress.org/support/plugin/ar-vr-3d-model-try-on/reviews/?rate=5#new-post';
				break;

			case 'later':
				// Snooze for 14 days, then surface again.
				update_option( 'ar_try_on_reshow_' . $notice_id, time() + ( DAY_IN_SECONDS * 14 ), false );
				break;

			case 'done':
			case 'never':
				// Permanently stop asking this user.
				update_user_meta( $user_id, 'ar_try_on_review_done', true );
				break;
		}

		return $result;
	}

	/**
	 * Whether a notice is dismissed for the current user.
	 *
	 * Honours a timed re-show: when reshow_after_days is set, the notice is
	 * surfaced again once the stored cooldown timestamp has elapsed.
	 *
	 * @param string $notice_id Notice ID.
	 * @param array  $notice    Notice configuration.
	 * @return bool
	 */
	private function is_dismissed( $notice_id, $notice ) {
		$user_id   = get_current_user_id();
		$dismissed = get_user_meta( $user_id, 'ar_try_on_dismiss_' . $notice_id, true );

		if ( ! $dismissed ) {
			return false;
		}

		// Permanent dismissal when no re-show window is configured.
		if ( (int) $notice['reshow_after_days'] <= 0 ) {
			return true;
		}

		// Timed re-show: clear the dismissal once the cooldown has passed.
		$next = (int) get_option( 'ar_try_on_reshow_' . $notice_id, 0 );
		if ( $next && time() > $next ) {
			delete_user_meta( $user_id, 'ar_try_on_dismiss_' . $notice_id );
			delete_option( 'ar_try_on_reshow_' . $notice_id );
			return false;
		}

		return true;
	}

	/**
	 * Number of real (non-demo) 3D models configured on the site, cached daily.
	 *
	 * @return int
	 */
	private function get_cached_user_model_count() {
		$cache_key = 'ar_try_on_review_model_count';
		$cached    = get_transient( $cache_key );

		if ( false !== $cached ) {
			return (int) $cached;
		}

		$count = $this->query_user_model_count();
		set_transient( $cache_key, $count, DAY_IN_SECONDS );

		return $count;
	}

	/**
	 * Count posts/products that have a real 3D model assigned.
	 *
	 * Excludes the demo model the activator seeds so the review gate only
	 * trips once the merchant has added a model of their own. Scans a capped
	 * number of rows to stay light on large sites.
	 *
	 * @return int
	 */
	private function query_user_model_count() {
		$demo_src = 'https://modelviewer.dev/shared-assets/models/NeilArmstrong.glb';

		$query = new \WP_Query(
			array(
				'post_type'              => 'any',
				'post_status'            => 'any',
				'posts_per_page'         => 20,
				'fields'                 => 'ids',
				'no_found_rows'          => true,
				'update_post_term_cache' => false,
				'meta_key'               => 'ar_try_on_product_settings', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
			)
		);

		$count = 0;
		foreach ( $query->posts as $post_id ) {
			$settings = (array) get_post_meta( $post_id, 'ar_try_on_product_settings', true );
			if ( ! empty( $settings['src'] ) && $settings['src'] !== $demo_src ) {
				$count++;
			}
		}

		return $count;
	}
}
