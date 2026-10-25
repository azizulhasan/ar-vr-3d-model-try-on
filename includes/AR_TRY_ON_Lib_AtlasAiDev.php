<?php

namespace AR_TRY_ON; // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedNamespaceFound -- Stable internal namespace; renaming risks a Free/Pro update-window fatal (see plan/AR-66).


/**
 * class AR_TRY_ON_Lib_AtlasAiDev
 */
final class AR_TRY_ON_Lib_AtlasAiDev {

    /**
     * Singleton instance
     *
     * @var AR_TRY_ON_Lib_AtlasAiDev
     */
    protected static $instance;

    /**
     * @var AR_TRY_ON
     */
    protected $client = null;

    /**
     * @var AR_TRY_ON
     */
    protected $insights = null;

    /**
     * Promotions Class Instance
     *
     * @var AR_TRY_ON
     */
    public $promotion = null;

    /**
     * Initialize
     *
     * @return AR_TRY_ON_Lib_AtlasAiDev
     */
    public static function instance() {
        if ( is_null( self::$instance ) ) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    /**
     * Class constructor
     *
     * @return void
     * @since 1.0.0
     */
    public function init() {
        if ( ! class_exists( '\AtlasAiDev\AppService\Client' ) ) {
            /** @noinspection PhpIncludeInspection */
            require_once ATLAS_AR_PLUGIN_PATH . 'libs/AtlasAiDev/Client.php';
        }
        // Load Client
        $this->client = new \AtlasAiDev\AppService\Client( 'e0212edbb7ce82838c61d71951c5cb2c', ATLAS_AR_PLUGIN_NAME, ATLAS_AR_ROOT_FILE );
        // Load
        $this->insights  = $this->client->insights(); // Plugin Insights


        // AR-172: admin notices from AtlasAiDev's public GitHub file (like AtlasVoice, TTS-262), for
        // news such as the AtlasAR 3.0 beta. Disclosed in the readme (External services); replaces the
        // old undisclosed gist (AR-61). Only for administrators, in the admin; cached 12 hours; each
        // notice has dates and can be dismissed per user. Editing the file publishes or retires a
        // notice without a release. One file in the free plugin serves Pro users too: a notice's
        // `audience` (free | pro | all) is matched against whether AtlasAR Pro is active.
        // AtlasAR's own class (not the library's shared Promotions, which another plugin may load first).
        $this->promotion = new AR_TRY_ON_Promotions( $this->client );
        $this->promotion->set_source( 'https://raw.githubusercontent.com/atlasaidev/plugins/main/ar-vr-3d-model-try-on-promotions.json' );
        $this->promotion->init();
        add_filter( $this->client->getSlug() . '_promo_audience', array( __CLASS__, 'promo_audience' ) );

        // Initialize
        $this->insightInit();


        // Filter updater api data
        add_filter(
            'AtlasAiDev_' . $this->client->getSlug() . '_plugin_api_info',
            array(
                $this,
                '__plugin_api_info',
            ),
            10,
            1
        );
    }

    /**
     * AR-172: who a notice is for. "pro" only for a site whose AtlasAR Pro has a valid licence (it can
     * unlock the Pro beta); Pro installed without one, or the free plugin alone, is "free". Reads Pro's
     * own licence state when Pro is loaded; nothing is gated by it, it only picks the notice.
     *
     * @return string 'pro' or 'free'
     */
    public static function promo_audience() {
        // Pro running (its constant), not only listed as active.
        if ( ! defined( 'AR_TRY_ON_PRO_VERSION' ) ) {
            return 'free';
        }
        if ( function_exists( 'av3mto_fs' ) ) {
            $fs = av3mto_fs();
            if ( is_object( $fs ) && method_exists( $fs, 'can_use_premium_code' ) ) {
                return $fs->can_use_premium_code() ? 'pro' : 'free';
            }
        }
        return 'pro';
    }

    /**
     * Exclude License data from option dropdown
     *
     * @param $exclude
     *
     * @return array
     */
    public function __exclude_license_option( $exclude ) {
        $exclude[] = 'AtlasAiDev_%_manage_license';

        return $exclude;
    }

    /**
     * Cloning is forbidden.
     *
     * @since 1.0.2
     */
    public function __clone() {
        _doing_it_wrong( __FUNCTION__, esc_html__( 'Cloning is forbidden.', 'ar-vr-3d-model-try-on' ), '1.0.2' );
    }

    /**
     * Initialize Insights
     *
     * @return void
     */
    private function insightInit() {

        $projectSlug = $this->client->getSlug();
        add_filter( $projectSlug . '_what_tracked', array( $this, 'data_we_collect' ), 10, 1 );
        add_filter(
            "AtlasAiDev_{$projectSlug}_Support_Ticket_Recipient_Email",
            function () {
                return 'contact.atlasaidev@gmail.com';
            },
            10
        );
        add_filter(
            "AtlasAiDev_{$projectSlug}_Support_Ticket_Email_Template",
            array(
                $this,
                'supportTicketTemplate',
            ),
            10
        );
        add_filter(
            "AtlasAiDev_{$projectSlug}_Support_Request_Ajax_Success_Response",
            array(
                $this,
                'supportResponse',
            ),
            10
        );
        add_filter(
            "AtlasAiDev_{$projectSlug}_Support_Request_Ajax_Error_Response",
            array(
                $this,
                'supportErrorResponse',
            ),
            10
        );
        add_filter(
            "AtlasAiDev_{$projectSlug}_Support_Page_URL",
            function () {
                return 'https://atlasaidev.com/contact-us/';
            },
            10
        );
        $this->insights->init();
    }

    /**
     * Generate Support Ticket Email Template
     *
     * @return string
     */
    public function supportTicketTemplate() {
        /** @noinspection HtmlUnknownTarget */
        $template  = sprintf( '<div style="margin: 10px auto;"><p>Website : <a href="__WEBSITE__">__WEBSITE__</a><br>Plugin : %s (v%s)</p></div>', $this->client->getName(), $this->client->getProjectVersion() );
        $template .= '<div style="margin: 10px auto;"><hr></div>';
        $template .= '<div style="margin: 10px auto;"><h3>__SUBJECT__</h3></div>';
        $template .= '<div style="margin: 10px auto;">__MESSAGE__</div>';
        $template .= '<div style="margin: 10px auto;"><hr></div>';
        $template .= sprintf(
            '<div style="margin: 50px auto 10px auto;"><p style="font-size: 12px;color: #009688">%s</p></div>',
            'Message Processed With AtlasAiDev Service Library (v.' . $this->client->getClientVersion() . ')'
        );

        return $template;
    }

    /**
     * Generate Support Ticket Ajax Response
     *
     * @return string
     */
    public function supportResponse() {
        $response        = '';
        $response       .= sprintf( '<h3>%s</h3>', esc_html__( 'Thank you -- Support Ticket Submitted.', 'ar-vr-3d-model-try-on' ) );
        $ticketSubmitted = esc_html__( 'Your ticket has been successfully submitted.', 'ar-vr-3d-model-try-on' );
        $twenty4Hours    = sprintf( '<strong>%s</strong>', esc_html__( '24 hours', 'ar-vr-3d-model-try-on' ) );
        /* translators: %s: Approx. time to response after ticket submission. */
        $notification = sprintf( esc_html__( 'You will receive an email notification from "contact.atlasaidev@gmail.com" in your inbox within %s.', 'ar-vr-3d-model-try-on' ), $twenty4Hours );
        $followUp     = esc_html__( 'Please Follow the email and AtlasAiDev Support Team will get back with you shortly.', 'ar-vr-3d-model-try-on' );
        $response    .= sprintf( '<p>%s %s %s</p>', $ticketSubmitted, $notification, $followUp );
        $docLink      = sprintf( '<a class="button button-primary" href="https://atlasaidev.helpscoutdocs.com/" target="_blank"><span class="dashicons dashicons-media-document" aria-hidden="true"></span> %s</a>', esc_html__( 'Documentation', 'ar-vr-3d-model-try-on' ) );
        $vidLink      = sprintf( '<a class="button button-primary" href="https://www.youtube.com/@atlasaidev" target="_blank"><span class="dashicons dashicons-video-alt3" aria-hidden="true"></span> %s</a>', esc_html__( 'Video Tutorials', 'ar-vr-3d-model-try-on' ) );
        $response    .= sprintf( '<p>%s %s</p>', $docLink, $vidLink );
        $response    .= '<br><br><br>';
        $toc          = sprintf( '<a href="https://atlasaidev.com/terms-and-conditions/" target="_blank">%s</a>', esc_html__( 'Terms & Conditions', 'ar-vr-3d-model-try-on' ) );
        $pp           = sprintf( '<a href="https://atlasaidev.com/privacy-policy/" target="_blank">%s</a>', esc_html__( 'Privacy Policy', 'ar-vr-3d-model-try-on' ) );
        /* translators: 1: Link to the Trams And Condition Page, 2: Link to the Privacy Policy Page */
        $policy    = sprintf( esc_html__( 'Please read our %1$s and %2$s', 'ar-vr-3d-model-try-on' ), $toc, $pp );
        $response .= sprintf( '<p style="font-size: 12px;">%s</p>', $policy );

        return $response;
    }

    /**
     * Set Error Response Message For Support Ticket Request
     *
     * @return string
     */
    public function supportErrorResponse() {
        return sprintf(
            '<div class="mui-error"><p>%s</p><p>%s</p><br><br><p style="font-size: 12px;">%s</p></div>',
            esc_html__( 'Something Went Wrong. Please Try The Support Ticket Form On Our Website.', 'ar-vr-3d-model-try-on' ),
            sprintf( '<a class="button button-primary" href="https://atlasaidev.com/contact-us/" target="_blank">%s</a>', esc_html__( 'Get Support', 'ar-vr-3d-model-try-on' ) ),
            esc_html__( 'Support Ticket form will open in new tab in 5 seconds.', 'ar-vr-3d-model-try-on' )
        );
    }

    /**
     * Set Data Collection description for the tracker
     *
     * @param $data
     *
     * @return array
     */
    public function data_we_collect( $data ) {
        $data = array_merge(
            $data,
            array(
                esc_html__( 'Site name, language and url.', 'ar-vr-3d-model-try-on' ),
                esc_html__( 'Number of active and inactive plugins.', 'ar-vr-3d-model-try-on' ),
                esc_html__( 'Your name and email address.', 'ar-vr-3d-model-try-on' ),
            )
        );

        return $data;
    }

    /**
     * Get Tracker Data Collection Description Array
     *
     * @return array
     */
    public function get_data_collection_description() {
        return $this->insights->get_data_collection_description();
    }

    /**
     * Add Missing Info for plugin details after fetching through api
     *
     * @param $data
     *
     * @return array
     */
    public function __plugin_api_info( $data ) {
        // house keeping
        if ( isset( $data['homepage'], $data['author'] ) && false === strpos( $data['author'], '<a' ) ) {
            /** @noinspection HtmlUnknownTarget */
            $data['author'] = sprintf( '<a href="%s">%s</a>', $data['homepage'], $data['author'] );
        }
        if ( ! isset( $data['contributors'] ) ) {
            $data['contributors'] = array(
                'hasanazizul' => array(
                    'profile'      => 'https://atlasaidev.com/',
                    'avatar'       => 'https://en.gravatar.com/userimage/227637086/c835cfe932588050eec49c4e0d0e017b.jpeg',
                    'display_name' => 'Azizul Hasan',
                ),
            );
        }
        $sections = array( 'description', 'installation', 'faq', 'screenshots', 'changelog', 'reviews', 'other_notes' );
        foreach ( $sections as $section ) {
            if ( isset( $data['sections'][ $section ] ) && empty( $data['sections'][ $section ] ) ) {
                unset( $data['sections'][ $section ] );
            }
        }

        return $data;
    }

    /**
     * Update Tracker OptIn
     *
     * @param bool $override optional. ignore last send datetime settings if true.
     *
     * @see Insights::send_tracking_data()
     * @return void
     */
    public function trackerOptIn( $override = false ) {
        $this->insights->optIn( $override );
    }

    /**
     * Update Tracker OptOut
     *
     * @return void
     */
    public function trackerOptOut() {
        $this->insights->optOut();
    }

    /**
     * Check if tracking is enable
     *
     * @return bool
     */
    public function is_tracking_allowed() {
        return $this->insights->is_tracking_allowed();
    }

}

