<?php
/**
 * AtlasAiDev Promotion handler
 * @version 1.0.0
 * @package AR_TRY_ON
 * @subpackage AppServices
 */

namespace AtlasAiDev\AppService;

if ( ! defined( 'ABSPATH' ) ) {
	die();
}

/**
 * Class Promotions
 *
 * Promotion object schema - one entry in the promotions JSON feed (the feed is an
 * array of these objects).
 *
 * REQUIRED
 *   content  string  Notice HTML (filtered with wp_kses_post()).
 *   start    string  Show from  - "YYYY-MM-DD" or "YYYY-MM-DD HH:MM:SS".
 *   end      string  Hide after - same format.
 *   hash     string  Unique id: the notice's DOM id + the per-user "dismissed"
 *                    key. If omitted, it is derived from `id`.
 *
 * TARGETING (optional)
 *   allowed_sites  string[]  List of site hostnames (matched against the
 *                            home_url() host). When present, the promo shows ONLY
 *                            on those sites - use it to preview a promo on a
 *                            specific staging/local site. When absent, it shows
 *                            on every site (the default).
 *   audience       string    "free" (default) | "pro" | "all" - which install sees it.
 *   below_version  string    Show only while the installed version is older than
 *                            this (version_compare), e.g. "3.5.0-beta.1" retires a
 *                            "join the 3.5 beta" promo for sites already on it. The
 *                            host decides which plugin's version counts through the
 *                            `{slug}_promo_version` filter (default: this plugin's).
 *   id             string    Stable slug; also used to derive `hash` when absent.
 *
 * BEHAVIOUR (optional)
 *   dismissible  int  0 (default) | 1 - show the close (x) button.
 *
 * APPEARANCE (optional)
 *   color            string  Text colour (CSS).
 *   backgroundColor  string  Notice background colour (CSS).
 *   backgroundImage  string  Image URL / data-URI.
 *   backgroundRepeat string  CSS background-repeat.
 *   backgroundSize   string  CSS background-size.
 *   wrapperPadding   string  CSS padding on the wrapper.
 *   logo    object  { src: string (required), alt: string }
 *   button  object  { url, label, backgroundColor, color, after } (all strings)
 *
 * Example (one JSON feed entry):
 * {
 *   "id": "atlasvoice-pricing-2026-07",
 *   "hash": "atlasvoice-pricing-2026-07",
 *   "audience": "free",
 *   "start": "2026-07-24",
 *   "end": "2026-08-31",
 *   "dismissible": 1,
 *   "content": "<strong>Upgrade to AtlasVoice Pro</strong> ...",
 *   "button": { "label": "View pricing", "url": "admin.php?page=atlasvoice-pricing",
 *               "backgroundColor": "#184c53", "color": "#ffffff" }
 * }
 *
 * For a testing-only promo, add an allowlist (shown ONLY on the listed sites):
 *   "allowed_sites": [ "cors2.atlasaidev.com", "localhost" ]
 */
class Promotions {
	
	/**
	 * AtlasAiDev\AppService\Client
	 *
	 * @var Client
	 */
	protected $client;
	
	/**
	 * URL for Promotions source json file
	 * @var string
	 */
	private $promotionSrc;
	
	/**
	 * Promotions
	 * @var bool|object[]
	 */
	private $promotions = false;
	/**
	 * List of hidden promotions for current user
	 * @var array
	 */
	private $hiddenPromotions;
	/**
	 * Current User Id
	 * @var int
	 */
	private $currentUser = 0;
	
	/**
	 * Promotions constructor.
	 * @param Client $client        The Client.
	 * @param string $data_source   Data Source URL
	 * @return void
	 */
	public function __construct( Client $client, $data_source = null ) {
		$this->client = $client;
		if ( ! is_null( $data_source ) ) $this->promotionSrc = esc_url( $data_source );
	}
	
	/**
	 * Set JSON Source File URL For getting promotion data
	 * @param string $URL      Set Data Source URL.
	 *
	 * @return Promotions
	 */
	public function set_source( $URL ) {
		$this->promotionSrc = esc_url( $URL );
		return $this;
	}
	
	/**
	 * Init Promotions
	 * @return void
	 */
	public function init() {
		if ( is_null( $this->promotionSrc ) ) {
			_doing_it_wrong( __METHOD__, esc_html__( 'Promotion Source URL Not Set. see Promotions::set_source( $URL )', 'ar-vr-3d-model-try-on' ), '1.0.0' );
		}
		add_action( 'admin_init', [ $this, '__init_internal' ], 10 );
	}
	
	/**
	 * Set environment variables and init internal hooks
	 * @return void
	 */
	public function __init_internal() {
		// AR-172: notices are for the people who run the site, never for subscribers or customers.
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$this->currentUser = get_current_user_id();
		// TTS-262: get_user_option() returns false when unset, and casting that to an
		// array yields array( false ) — junk that pollutes the stored list and makes
		// the hash lookup unreliable. Keep only real string hashes.
		$hidden                 = get_user_option( $this->client->getSlug() . '_hidden_promos', $this->currentUser );
		$this->hiddenPromotions = is_array( $hidden ) ? array_values( array_filter( $hidden, 'is_string' ) ) : array();
		$this->promotions = $this->__get_promos();
		// only run if there is active promotions.
		if ( count( $this->promotions ) ) {
			add_action( 'admin_notices', [ $this, '__show_promos' ], 10 );
			// AR-172: one dismiss action per plugin. The library classes are shared by every AtlasAiDev
			// plugin on a site, so a shared action would be answered by whichever plugin hooked first
			// and the dismissal saved in the wrong plugin's list.
			add_action( 'wp_ajax_' . $this->__dismiss_action(), [ $this, '__atlasaidev_dismiss_promo' ], 10 );
			// Styles and the dismiss script go through the enqueue API (no <style>/<script> tags).
			add_action( 'admin_enqueue_scripts', [ $this, '__enqueue_deps' ], 10 );
		}
	}
	
	/**
	 * Render Promotions
	 * @return void
	 */
	public function __show_promos() {
		$ns = Client::PLUGIN_PREFIX;
		foreach ( $this->promotions as $promotion ) {
			$wrapperStyles  = '';
			$buttonStyles   = '';
			$is_dismissible = ! isset( $promotion->dismissible ) || isset( $promotion->dismissible ) && 0 == $promotion->dismissible ? false : true;
			
			$has_columns = isset( $promotion->button, $promotion->logo );
			if ( isset( $promotion->color ) ) {
				$wrapperStyles .= 'color: ' . $promotion->color . ';';
			}
			if ( isset( $promotion->wrapperPadding ) ) {
				$wrapperStyles .= 'padding: ' . $promotion->wrapperPadding . ';';
			}
			if ( isset( $promotion->backgroundColor ) ) {
				$wrapperStyles .= 'background-color: ' . $promotion->backgroundColor . ';';
			}
			if ( isset( $promotion->backgroundImage ) ) {
				$wrapperStyles .= 'background-image: url("' . esc_url( $promotion->backgroundImage ) . '");';
			}
			if ( isset( $promotion->backgroundRepeat ) ) {
				$wrapperStyles .= 'background-repeat: ' . $promotion->backgroundRepeat . ';';
			}
			if ( isset( $promotion->backgroundSize ) ) {
				$wrapperStyles .= 'background-size: ' . $promotion->backgroundSize . ';';
			}
			if ( property_exists( $promotion, 'button' ) ) {
				if ( isset( $promotion->button->backgroundColor ) ) {
					$buttonStyles .= 'background-color: ' . $promotion->button->backgroundColor . ';border-color: ' . $promotion->button->backgroundColor . ';';
				}
				if ( isset( $promotion->button->color ) ) {
					$buttonStyles .= 'color: ' . $promotion->button->color . ';';
				}
			}
			// Note: deliberately NOT using core's `is-dismissible` class — its
			// dismiss button is injected by admin JS and renders unreliably on
			// custom-colored notices. We output our own button below instead.
			$noticeClasses = 'notice notice-success ' . $ns . '-promo';
	?>
		<div class="<?php echo esc_attr( $noticeClasses ); ?> " id="<?php echo esc_attr( $promotion->hash ); ?>" data-nonce="<?php echo esc_attr( wp_create_nonce( $ns . '-dismiss-promo' ) ); ?>" data-action="<?php echo esc_attr( $this->__dismiss_action() ); ?>" style="<?php echo esc_attr( $wrapperStyles ); ?>">
			<?php if ( $is_dismissible ) { ?>
			<button type="button" class="notice-dismiss"><span class="screen-reader-text"><?php esc_html_e( 'Dismiss this notice.', 'ar-vr-3d-model-try-on' ); ?></span></button>
			<?php } ?>
			<div class="<?php echo esc_attr( $ns ); ?>-promo-wrap<?php if ( ! $has_columns ) echo ' no-column'; ?>">
				<?php if ( isset( $promotion->logo ) && ! empty( $promotion->logo ) ) { ?>
				<div class="<?php echo esc_attr( $ns ); ?>-logo <?php echo esc_attr( $ns ); ?>-column">
					<img src="<?php echo esc_url( $promotion->logo->src ); ?>" alt="<?php echo esc_attr( $promotion->logo->alt ); ?>">
				</div>
				<?php } ?>
				<div class="<?php echo esc_attr( $ns ); ?>-details<?php if ( $has_columns ) echo ' ' . esc_attr( $ns ) . '-column'; ?>">
					<?php echo wp_kses_post( $promotion->content ); ?>
				</div>
				<?php if ( isset( $promotion->button ) && ! empty( $promotion->button ) ) { ?>
					<div class="<?php echo esc_attr( $ns ); ?>-btn-container <?php echo esc_attr( $ns ); ?>-column">
						<a href="<?php echo esc_url( $promotion->button->url ); ?>" class="button <?php echo esc_attr( $ns ); ?>-promo-btn" style="<?php echo esc_attr( $buttonStyles ); ?>" target="_blank"><?php echo wp_kses_post( $promotion->button->label ); ?></a>
						<?php
						if ( isset( $promotion->button->after ) && ! empty( $promotion->button->after ) ) {
							echo wp_kses_post( $promotion->button->after );
						}
						?>
					</div>
				<?php } ?>
				<?php if ( isset( $promotion->button ) && ! empty( $promotion->button ) ) { ?>
				<?php } ?>
			</div>
		</div>
	<?php
		}
	}
	
	/**
	 * Get Promotion Data
	 * Cache First then fetch source url for json data.
	 * @return array
	 */
	private function __get_promos() {
		$promos = get_transient( $this->client->getSlug() . '_cached_promos' );
		if ( empty( $promos ) ) {
			// get promotions data from json source.
			$response = wp_safe_remote_get( $this->promotionSrc, array( 'timeout' => 15 ) ); // phpcs:ignore
			$promos   = wp_remote_retrieve_body( $response );
			if ( is_wp_error( $response ) || 200 !== wp_remote_retrieve_response_code( $response ) ) {
				$promos = '[]';
			}
			// cache data.
			set_transient( $this->client->getSlug() . '_cached_promos', $promos, 12 * HOUR_IN_SECONDS );
		}
		// decode to array.
		$promos = json_decode( $promos );

		// TTS-262: guard — an empty body, a network hiccup, or a malformed feed
		// makes json_decode() return null; array_filter(null) would fatal.
		if ( ! is_array( $promos ) ) {
			$promos = array();
		}

		// TTS-262: every promo needs a stable, unique hash — it is the notice's
		// DOM id and the per-user dismissal key. Feeds may omit it, so derive one
		// from the promo's `id` (or its content) to avoid an "undefined property"
		// warning and keep dismissal working.
		foreach ( $promos as $promo ) {
			if ( empty( $promo->hash ) ) {
				$promo->hash = ! empty( $promo->id )
					? sanitize_title( $promo->id )
					: md5( wp_json_encode( $promo ) );
			}
		}

		// filter promotions by date.
		$promos = array_filter( $promos, [ $this, '__is_promo_active' ] );
		if ( ! empty( $promos ) ) {
			// Allowlist gate: a promo with `allowed_sites` renders only on those sites.
			$promos = array_filter( $promos, [ $this, '__is_promo_for_allowed_sites' ] );
			// TTS-262: filter by target audience (free|pro|all).
			$promos = array_filter( $promos, [ $this, '__is_promo_for_audience' ] );
			$promos = array_filter( $promos, [ $this, '__is_promo_for_version' ] );
			// filter promotions by list of hidden promotions by the user.
			$promos = array_filter( $promos, [ $this, '__is_promo_hidden' ] );
		}
		return $promos;
	}
	
	/**
	 * Check if promotion is active by date.
	 * must have start and end property
	 * @param object $promo {   the promo object.
	 *      Single Promo Object
	 *      @type string    $content   string. required
	 *      @type string    $start     valid timestamp. required
	 *      @type string    $end       valid timestamp. required
	 * }
	 *
	 * @return bool
	 */
	public function __is_promo_active( $promo ) {
		$ct = current_time( 'timestamp' ); // phpcs:ignore
		return ( ! empty( $promo->content ) && strtotime( $promo->start ) < $ct && $ct < strtotime( $promo->end ) );
	}

	/**
	 * Site allowlist gate — a promo with `allowed_sites` renders only on those sites.
	 *
	 * `allowed_sites` (optional) is a list of site hostnames. When present, the
	 * promo shows only if the current site's home_url() host matches one of them —
	 * used to preview a promo on a specific staging/local site. When absent, the
	 * promo shows on every site (the default "live" behaviour).
	 *
	 * @param object $promo the promo object; optional `allowed_sites` array of hostnames.
	 *
	 * @return bool true if the promo should render on the current site.
	 */
	public function __is_promo_for_allowed_sites( $promo ) {
		// No allowlist -> show on every site (default).
		if ( empty( $promo->allowed_sites ) || ! is_array( $promo->allowed_sites ) ) {
			return true;
		}
		$current = strtolower( (string) wp_parse_url( home_url(), PHP_URL_HOST ) );
		foreach ( $promo->allowed_sites as $site ) {
			$site = (string) $site;
			// Accept "example.com" or a full URL; compare host to host.
			$host = wp_parse_url( ( false === strpos( $site, '//' ) ? '//' . $site : $site ), PHP_URL_HOST );
			if ( $host && strtolower( $host ) === $current ) {
				return true;
			}
		}
		return false;
	}
	
	/**
	 * Check if promo is hidden by current user
	 * @param object $promo {   the promo object.
	 *      Single Promo Object
	 *      @type string    $hash     valid unique hash for a promo
	 * }
	 *
	 * @return bool         true if promo is hidden by user
	 */
	public function __is_promo_hidden( $promo ) {
		return ! in_array( $promo->hash, $this->hiddenPromotions, true );
	}

	/**
	 * TTS-262 — check if a promo targets the current audience.
	 *
	 * Each promo may declare `"audience": "free" | "pro" | "all"` (default
	 * "free" — never nag Pro users unless explicitly opted in). The host plugin
	 * resolves the current site's audience via the `{slug}_promo_audience`
	 * filter (default "free"); the AtlasVoice free plugin returns "pro" when the
	 * Pro add-on is active and "free" otherwise. Since this library is generic,
	 * the pro/free determination lives in the host, not here.
	 *
	 * @param object $promo the promo object; optional `audience` property.
	 *
	 * @return bool true if the promo should be shown to the current audience.
	 */
	public function __is_promo_for_audience( $promo ) {
		$audience = apply_filters( $this->client->getSlug() . '_promo_audience', 'free' );
		$target   = ( isset( $promo->audience ) && $promo->audience ) ? $promo->audience : 'free';

		return 'all' === $target || $target === $audience;
	}

	/**
	 * TTS-266 — hide a promo from sites that already have what it offers.
	 *
	 * @param object $promo the promo object; optional `below_version` property.
	 *
	 * @return bool true if there is no `below_version`, or the installed version is older.
	 */
	public function __is_promo_for_version( $promo ) {
		if ( empty( $promo->below_version ) ) {
			return true;
		}
		$version = (string) apply_filters( $this->client->getSlug() . '_promo_version', $this->client->getProjectVersion(), $promo );

		return '' === $version || version_compare( $version, (string) $promo->below_version, '<' );
	}
	
	/**
	 * The dismiss AJAX action of this plugin's notices (one per plugin, see __init_internal()).
	 * @return string
	 */
	public function __dismiss_action() {
		return Client::PLUGIN_PREFIX . '_dismiss_promo_' . sanitize_key( $this->client->getSlug() );
	}

	/**
	 * Styles and the dismiss script, through the enqueue API. Added once per page, even when
	 * several AtlasAiDev plugins show notices (they share these rules).
	 * @return void
	 */
	public function __enqueue_deps() {
		wp_enqueue_script( 'wp-util' );
		wp_enqueue_script( 'jquery' );
		if ( wp_style_is( 'atlasaidev-promo', 'enqueued' ) ) {
			return;
		}
		$ns = sanitize_html_class( Client::PLUGIN_PREFIX );
		wp_register_style( 'atlasaidev-promo', false, array(), $this->client->getProjectVersion() );
		wp_enqueue_style( 'atlasaidev-promo' );
		wp_add_inline_style( 'atlasaidev-promo', '.' . $ns . '-promo { border: none; padding: 15px 0; position: relative; }
.' . $ns . '-promo .notice-dismiss { position: absolute; top: 8px; right: 8px; margin: 0; padding: 6px; border: none; background: transparent; color: inherit; cursor: pointer; line-height: 1; }
.' . $ns . '-promo .notice-dismiss:before { content: "\00d7"; font-family: inherit; font-size: 24px; font-weight: 400; line-height: 1; color: inherit; opacity: .8; }
.' . $ns . '-promo .notice-dismiss:hover:before,
.' . $ns . '-promo .notice-dismiss:focus:before { opacity: 1; }
.' . $ns . '-promo-wrap { display: flex; justify-content: center; align-items: center; text-align: center; color: inherit; max-width: 1820px; margin: 0 auto; }
.' . $ns . '-promo-wrap.no-column{ display: block; }
.' . $ns . '-column.' . $ns . '-logo { flex: 0 0 25%; }
.' . $ns . '-column.' . $ns . '-logo img { height: 48px; width: auto; }
.' . $ns . '-details {display: block;}
.' . $ns . '-details h3 { color: inherit; font-size: 30px; margin: 12px 0; }
.' . $ns . '-details p { color: inherit; font-size: 15px; }
.' . $ns . '-column.' . $ns . '-details { flex: 0 0 50%; }
.' . $ns . '-column.' . $ns . '-btn-container { flex: 0 0 25%; }
.' . $ns . '-promo-wrap .' . $ns . '-promo-btn { position: relative; padding: 15px; border-radius: 30px; font-size: 15px; font-weight: 700; display: block; color: inherit; text-decoration: none; max-width: 200px; margin: 0 auto; line-height: normal; height: auto; box-shadow: 1px 2px 0 rgba(0, 0, 0, 0.1); }
.' . $ns . '-promo-wrap .' . $ns . '-promo-btn:focus,
.' . $ns . '-promo-wrap .' . $ns . '-promo-btn:hover,
.' . $ns . '-promo-wrap .' . $ns . '-promo-btn:active { box-shadow: inset 3px 4px 6px 0 rgba(1, 9, 12, 0.25); }
.' . $ns . '-promo-wrap .' . $ns . '-promo-btn:active { top: 1px; }
@media screen and (max-width: 1200px) {
.' . $ns . '-promo-wrap { display: block; overflow: hidden; }
.' . $ns . '-column .' . $ns . '-logo { width: 100%; margin: 0 auto; }
.' . $ns . '-column .' . $ns . '-details { width: 68%; float: left; margin-right: 4%; margin-top: 32px; }
.' . $ns . '-column.' . $ns . '-btn-container { width: 28%; float: right; margin-top: 42px; }
}
@media screen and (max-width: 782px) {
.' . $ns . '-promo-wrap .' . $ns . '-details { float: none; width: 100%; }
.' . $ns . '-btn-container { float: none; width: 100%; margin-top: 32px; }
.' . $ns . '-column.' . $ns . '-btn-container { width: 100%; float: right; margin-top: 42px; }
}' );
		$js = <<<'JS'
(function ($) {
	$('body').on('click', '.__NS__-promo .notice-dismiss', function (e) {
		e.preventDefault();
		var $parent = $(this).closest('.__NS__-promo');
		if ($parent.data('dismissing')) { return; }
		$parent.data('dismissing', true);
		wp.ajax.post($parent.data('action'), { dismissed: true, hash: $parent.attr('id'), _wpnonce: $parent.data('nonce') });
		// Hide the notice ourselves: core only fades notices whose dismiss button it injected.
		$parent.fadeTo(100, 0, function () { $parent.slideUp(100, function () { $parent.remove(); }); });
	});
})(jQuery);
JS;
		wp_add_inline_script( 'wp-util', str_replace( '__NS__', $ns, $js ) );
	}

	/**
	 * Ajax Callback handler for hiding promo
	 * @return void
	 */
	public function __atlasaidev_dismiss_promo() {
		if (
				isset( $_REQUEST['dismissed'], $_REQUEST['hash'], $_REQUEST['_wpnonce'] ) &&
				'true' == $_REQUEST['dismissed'] && ! empty( $_REQUEST['hash'] ) &&
				wp_verify_nonce( sanitize_text_field( wp_unslash( $_REQUEST['_wpnonce'] ) ), Client::PLUGIN_PREFIX . '-dismiss-promo' )
		) {
			$this->hiddenPromotions = array_merge( $this->hiddenPromotions, [ sanitize_text_field( wp_unslash( $_REQUEST['hash'] ) ) ] );
			update_user_option( $this->currentUser, $this->client->getSlug() . '_hidden_promos', $this->hiddenPromotions );
			wp_send_json_success( esc_html__( 'Promo hidden', 'ar-vr-3d-model-try-on' ) );
		}
		wp_send_json_error( esc_html__( 'Invalid Request', 'ar-vr-3d-model-try-on' ) );
		die();
	}
	
	/**
	 * @noinspection PhpUnused
	 * Clear Hidden Promotion preference for User
	 * @return bool
	 */
	public function clear_hidden_promos() {
		if ( ! did_action( 'admin_init' ) ) {
			_doing_it_wrong( __METHOD__, esc_html__( 'Method must be invoked inside admin_init action', 'ar-vr-3d-model-try-on' ), '1.0.0' );
		}
		$this->currentUser = get_current_user_id();
		return delete_user_option( $this->currentUser, $this->client->getSlug() . '_hidden_promos' );
	}
	
	/**
	 * Clear Cached Promotion data
	 * @return bool
	 */
	public function clear_cache() {
		return delete_transient( $this->client->getSlug() . '_cached_promos' );
	}
}
// End of file Promotions.php.