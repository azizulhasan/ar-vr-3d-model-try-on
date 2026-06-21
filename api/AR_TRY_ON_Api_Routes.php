<?php

namespace ATLAS_AR_API;

use AR_TRY_ON\AR_TRY_ON_Activator;
use AR_TRY_ON\AR_TRY_ON_Cache;
use AR_TRY_ON\AR_TRY_ON_Helper;

/**
 * This class is for getting all plugin's data  through api.
 * This is applied for tracker menu.
 * @since      1.0.0
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/api
 * @author     Azizul Hasan <azizulhasan.cr@gmail.com>
 */
class AR_TRY_ON_Api_Routes
{

    protected $namespace;
    protected $wordpress;
    protected $version;
    protected $analytics;
    protected $compatibility;

    public function __construct()
    {
        $this->version = 'v1';
        $this->namespace = 'ar_try_on/' . $this->version;
        add_action('rest_api_init', [$this, 'ATLAS_AR_register_routes']);
    }

    /**
     * Register Routes
     */
    public function ATLAS_AR_register_routes()
    {

        // register settings route — admin-only (reads & updates site options).
        register_rest_route(
            $this->namespace,
            '/settings',
            array(
                array(
                    'methods' => \WP_REST_Server::ALLMETHODS,
                    'callback' => array($this, 'settings'),
                    'permission_callback' => array($this, 'check_admin_access'),
                    'args' => array(),
                ),
            )
        );
        // register get_model_and_settings route — per-method permission
        // check (frontend read is public; admin read needs manage_options;
        // write needs edit_post on the target post).
        register_rest_route(
            $this->namespace,
            '/get_model_and_settings',
            array(
                array(
                    'methods' => \WP_REST_Server::ALLMETHODS,
                    'callback' => array($this, 'get_model_and_settings'),
                    'permission_callback' => array($this, 'check_model_settings_access'),
                    'args' => array(),
                ),
            )
        );

        // register demo_preview route — admin-only (returns site settings).
        register_rest_route(
            $this->namespace,
            '/demo_preview',
            array(
                array(
                    'methods' => \WP_REST_Server::ALLMETHODS,
                    'callback' => array($this, 'demo_preview'),
                    'permission_callback' => array($this, 'check_admin_access'),
                    'args' => array(),
                ),
            )
        );


        // register generate_3d_model route — admin-only (fires external
        // API calls to Tripo3D / Meshy AI, writes files to uploads).
        register_rest_route(
            $this->namespace,
            '/generate_3d_model',
            array(
                array(
                    'methods' => \WP_REST_Server::ALLMETHODS,
                    'callback' => array($this, 'generate_3d_model'),
                    'permission_callback' => array($this, 'check_admin_access'),
                    'args' => array(),
                ),
            )
        );


    }


    /*
     * Manage settings data
     */
    public function settings($request)
    {
        $response['status'] = true;
        // save data about recording.
        if ('post' == $request['method']) {
            $fields = json_decode($request['fields'], true);
            update_option('ar_try_on_settings', $fields);
            AR_TRY_ON_Cache::delete('settings');
            // Clear static settings cache in Helper class
            AR_TRY_ON_Helper::clear_settings_cache();

            if (isset($fields['ar_try_on_clear_cache']) && $fields['ar_try_on_clear_cache']) {
                AR_TRY_ON_Cache::flush();
                $fields['ar_try_on_clear_cache'] = false;
            }

            $response['data'] = $fields;
            AR_TRY_ON_Cache::set('settings', $fields);
            AR_TRY_ON_Helper::update_cache_data($request['has_value_changed']);

            return rest_ensure_response($response);
        }

        // get data about recording.
        if ('get' == $request['method']) {
            $settings = get_option('ar_try_on_settings');
            if (empty($settings)) {
                $settings = AR_TRY_ON_Activator::activate(1);
            }

            $response['data'] = $settings;

            return rest_ensure_response($response);
        }
    }

    public function get_model_and_settings($request)
    {

        $decoded_body = $request->get_params();
        $post_id = isset($decoded_body['post_id']) ? $decoded_body['post_id'] : null;
        if (!$post_id) {
            $post_id = isset($decoded_body['product_id']) ? $decoded_body['product_id'] : null;
        }
        $post_id = intval($post_id);
        $call_from = isset($decoded_body['call_from']) ? $decoded_body['call_from'] : '';
        $method = isset($decoded_body['method']) ? $decoded_body['method'] : 'GET';
        $filtered_data = [];
        $data = [];
        if ($method == 'GET') {
            $settings = (array)get_option('ar_try_on_settings');
            $product_settings = [];
            if (empty($post_id) && $call_from == 'admin') {
                if (empty($settings)) {
                    $settings = AR_TRY_ON_Helper::default_settings();
                }
                $product_settings = AR_TRY_ON_Helper::default_model_settings();
            }

            if ($post_id) {
                $product_settings = (array)get_post_meta($post_id, 'ar_try_on_product_settings', true);
                $product_settings = AR_TRY_ON_Helper::rename_old_keys_of_product_metadata($product_settings);

            }

            // Get Default value.
            if (empty($product_settings) || !array_key_exists('src', $product_settings)) {
                $product_settings = AR_TRY_ON_Helper::default_model_settings();
            } else {
                // AR-61: products saved before this release have no
                // `tone_mapping`, `interaction_prompt`, etc. fields. Fill
                // them in from the defaults without overwriting anything
                // the merchant explicitly set — `wp_parse_args` keeps
                // existing keys untouched and only adds the new ones.
                $product_settings = wp_parse_args(
                    $product_settings,
                    AR_TRY_ON_Helper::default_model_settings()
                );
            }


            $data = $settings;
            $data += $product_settings;

            // The per-product metabox "model_load_strategy" override must read
            // as 'inherit' (use global) unless the product EXPLICITLY set it.
            // Because $data is seeded from the global settings, the global value
            // would otherwise leak in and the metabox would show a fake
            // per-product override (and persist it on the next save). Only
            // expose the key here when the raw product meta actually carries it.
            if (!array_key_exists('model_load_strategy', $product_settings)) {
                unset($data['model_load_strategy']);
            }

            $data['product_name'] = $post_id ? get_the_title($post_id) : '';

            // Reviewer item 1: strip any HTML from custom_css before it
            // leaves the server, so values persisted by an older (un-
            // sanitized) build can't reach the front-end as a markup
            // injection vector. New writes are sanitized in the POST branch.
            if (isset($data['custom_css'])) {
                $data['custom_css'] = AR_TRY_ON_Helper::sanitize_custom_css($data['custom_css']);
            }

            /**
             * If call is form frontend then exclude api related values.
             * and update cached ids
             */
            if($call_from !== 'admin') {
                $data = AR_TRY_ON_Helper::exclude_sensitive_properties($data);
                AR_TRY_ON_Helper::update_cache_data(true, $post_id, 'remove');
            }
        } else {
            $fields = json_decode($decoded_body['fields']);
            $data = $fields;
            foreach ($fields as $key => $value) {
                if (strpos($key, 'ar_try_on') === false) {
                    $filtered_data[$key] = $value;
                }
            }

            // Reviewer item 1: custom_css is persisted straight from the
            // request body. Strip any HTML so it can't be used as a stored
            // CSS/markup injection vector, and keep the echoed response in
            // sync with what we actually store.
            if (isset($filtered_data['custom_css'])) {
                $safe_css = AR_TRY_ON_Helper::sanitize_custom_css($filtered_data['custom_css']);
                $filtered_data['custom_css'] = $safe_css;
                if (is_object($data) && isset($data->custom_css)) {
                    $data->custom_css = $safe_css;
                } elseif (is_array($data) && isset($data['custom_css'])) {
                    $data['custom_css'] = $safe_css;
                }
            }

            update_post_meta($post_id, 'ar_try_on_product_settings', $filtered_data);

            AR_TRY_ON_Helper::update_cache_data($decoded_body, $post_id);
        }

        // Enviar la respuesta en formato JSON
        return rest_ensure_response([
            'success' => true,
            'data' => $data,
        ]);
    }

    /*
 * Manage product settings data
 */
    public function demo_preview($request)
    {
        $response['status'] = true;
        // save data about recording.
        if ('post' == $request['method']) {
            $response['data'] = get_option('ar_try_on_settings');

            return rest_ensure_response($response);
        }
    }


    public function generate_3d_model($request)
    {
        $body = $request->get_params();
        $result['status'] = false;
        $decoded_data = json_decode($body['data'], 1);
        $api_url = $decoded_data['url'];
        $headers = $decoded_data['headers'];
        $headers['Authorization'] = 'Bearer ' . $headers['Authorization'];
        $api_body = $decoded_data['body'];

        /**
         * Move temporary files to permanent folder.
         */
        if(isset($decoded_data['temporary_model_data'])){
            $files_data = AR_TRY_ON_Helper::move_model_files_to_permanent_folder($decoded_data['temporary_model_data']);
            $result['data'] = $files_data;
            $result['extra'] = [
                '$decoded_data' => $decoded_data,
            ];

            return rest_ensure_response($result);
        }

//        $response_data = file_get_contents('D:\mamp\htdocs\azizulhasan\tts\wp-content\plugins\ar-vr-3d-model-try-on\src\context\tripo3d_final.json');
//        $response_data = json_decode($response_data, true);
//
//        $result['data'] = AR_TRY_ON_Helper::get_structured_model_response($decoded_data, $response_data);
//        $result['data']['temp'] = AR_TRY_ON_Helper::download_model_files_and_store($result['data']['output'], $decoded_data);
//
//        $result['extra'] = [
//            '$decoded_data' => $decoded_data,
//            '$result' => $result
//        ];
//
//        return rest_ensure_response($result);

        $response_body = '';
        $is_create_request = ! isset($api_body['task_id']) || ! $api_body['task_id'];
        if ($is_create_request) {
            /**
             * AR-62 §3g: retry transient 5xx / 429 once with a short
             * backoff. Tripo3D occasionally returns 502 / 503 during
             * autoscale events and 429 under rate-limit; a single
             * retry covers ~99% of those without surfacing a hard
             * error to the user.
             */
            $response    = null;
            $status_code = 0;
            for ($attempt = 0; $attempt < 2; $attempt++) {
                $response = wp_remote_post($api_url, array(
                    'headers' => $headers,
                    'body'    => wp_json_encode($api_body),
                    'timeout' => 60,
                ));
                if (is_wp_error($response)) {
                    if ($attempt === 1) {
                        $result['data'] = $response->get_error_message();
                        return rest_ensure_response($result);
                    }
                    usleep(750000); // 0.75s, then retry
                    continue;
                }
                $status_code = wp_remote_retrieve_response_code($response);
                if ($status_code >= 500 || $status_code === 429) {
                    if ($attempt === 1) { break; } // give up, surface the error below
                    usleep(750000);
                    continue;
                }
                break; // success / client error — stop retrying
            }

            $response_body = wp_remote_retrieve_body($response);
            $response_body = json_decode($response_body, true);

            /**
             * Model generated properly .
             */
            if ($status_code !== 200) {
                $result['data'] = $response_body;
                $result['extra'] = [
                    'headers' => $headers,
                    'api_body' => $api_body,
                    'response_body' => $response_body,
                    '$decoded_data' => $decoded_data,
                    'http_status'   => $status_code,
                ];

                return rest_ensure_response($result);
            }
        }

        // Generate the model with task ID

        $task_result['status'] = false;

        $task_id = isset($api_body['task_id']) ? $api_body['task_id'] : null;
        if (isset($response_body['data'], $response_body['data']['task_id'])) { // tripo3d ai
            $task_id = $response_body['data']['task_id'];
        }
        if (isset($response_body['result']) && $response_body['result']) { // meshy ai
            $task_id = $response_body['result'];
        }
        $task_response_body = [];

        /**
         * AR-62 §3f: on the create request, return immediately with the
         * fresh task_id instead of doing a redundant `GET /task/<id>`
         * — Tripo3D's status right after create is reliably "queued",
         * so the extra round trip just doubles the response time of
         * the very first request. The JS poller will fetch live status
         * on the next tick.
         */
        if ($is_create_request && $task_id) {
            $task_result['status']      = true;
            $task_result['data']        = AR_TRY_ON_Helper::get_structured_model_response($decoded_data, $response_body);
            $task_result['data']['task_id'] = $task_id;
            $task_result['extra']       = [ 'response_body' => $response_body ];
            return rest_ensure_response($task_result);
        }

        if ($task_id) {
            unset($headers['Content-Type']);
            $api_url = $api_url . '/' . $task_id;

            /**
             * AR-62 §3g: same single-retry policy for the polling GET.
             */
            $task_response = null;
            for ($attempt = 0; $attempt < 2; $attempt++) {
                $task_response = wp_remote_get($api_url, array(
                    'headers' => $headers,
                    'timeout' => 30,
                ));
                if (is_wp_error($task_response)) {
                    if ($attempt === 1) { break; }
                    usleep(750000);
                    continue;
                }
                $task_status_code = wp_remote_retrieve_response_code($task_response);
                if ($task_status_code >= 500 || $task_status_code === 429) {
                    if ($attempt === 1) { break; }
                    usleep(750000);
                    continue;
                }
                break;
            }

            if (is_wp_error($task_response)) {
                $task_result['data'] = $task_response->get_error_message();
                $task_result['extra'] = [
                    'headers' => $headers,
                    'api_body' => $api_body,
                    '$api_url' => $api_url,
                    '$decoded_data' => $decoded_data,
                ];
                return rest_ensure_response($task_result);
            }

            $task_status_code = wp_remote_retrieve_response_code($task_response);
            $task_response_body = wp_remote_retrieve_body($task_response);
            $task_response_body = json_decode($task_response_body, true);

            if ($task_status_code !== 200) {
                $task_result['data'] = $task_response_body;
                $task_result['extra'] = [
                    'headers' => $headers,
                    'api_body' => $api_body,
                    '$task_response_body' => $task_response_body,
                    '$decoded_data' => $decoded_data,
                    '$api_url' => $api_url,
                ];

                return rest_ensure_response($task_result);
            }

            $task_result['status'] = true;

        }

        $task_result['data'] = AR_TRY_ON_Helper::get_structured_model_response($decoded_data, $task_response_body);
        $task_result['data']['temp'] = AR_TRY_ON_Helper::download_model_files_and_store($task_result['data']['output'], $decoded_data);
        $task_result['extra'] = [
            '$task_response_body' => $task_response_body
        ];


        return rest_ensure_response($task_result);
    }


    /**
     * Permission callback for admin-only routes (/settings, /demo_preview,
     * /generate_3d_model).
     *
     * Replaces the previous get_route_access() which had two AR-61-flagged
     * bugs: (1) the nonce branch's outer isset() was negated so the actual
     * wp_verify_nonce() was unreachable; (2) no current_user_can() check
     * at all, so any logged-in or anonymous request that hit the right
     * URL was allowed. WP REST cookie auth already verifies wp_rest
     * nonces at the framework level for logged-in users — we only need
     * the capability gate here.
     *
     * The legacy ATLAS_AR_rest_route_access filter is still applied so
     * third-party addons can veto or override the decision; the filter
     * receives the boolean and (new) the WP_REST_Request as a second arg.
     *
     * @since 2.0.x (AR-61 §6)
     * @param \WP_REST_Request $request
     * @return bool|\WP_Error True if allowed, WP_Error otherwise.
     */
    public function check_admin_access($request)
    {
        $allowed = current_user_can('manage_options');

        /**
         * Filter: ATLAS_AR_rest_route_access
         *
         * @param bool             $allowed Whether the current request is allowed.
         * @param \WP_REST_Request $request The REST request (added in AR-61).
         */
        $allowed = apply_filters('ATLAS_AR_rest_route_access', $allowed, $request);

        if (!$allowed) {
            return new \WP_Error(
                'rest_forbidden',
                __('You do not have permission to access this endpoint.', 'ar-vr-3d-model-try-on'),
                array('status' => is_user_logged_in() ? 403 : 401)
            );
        }

        return true;
    }

    /**
     * Permission callback for /get_model_and_settings.
     *
     * The route mixes three behaviors in one callback (the body's `method`
     * field selects between them), so the permission logic mirrors that:
     *
     *   - body method == 'POST' → writes post meta. Requires edit_post on
     *     the post_id / product_id in the body.
     *   - body method == 'GET' with call_from == 'admin' → reads admin
     *     payload (unredacted). Requires manage_options.
     *   - body method == 'GET' from frontend → public read. The callback
     *     itself runs exclude_sensitive_properties() before returning, so
     *     no admin-only data leaks.
     *
     * @since 2.0.x (AR-61 §6.3)
     * @param \WP_REST_Request $request
     * @return bool|\WP_Error True if allowed, WP_Error otherwise.
     */
    public function check_model_settings_access($request)
    {
        $params  = (array) $request->get_params();
        /**
         * Default to GET — NOT the underlying HTTP verb — when the body's
         * `method` field is missing. The actual handler does the same
         * (`get_model_and_settings()` defaults `$method` to 'GET' when
         * `$decoded_body['method']` is unset). Without this alignment,
         * the public frontend's `AtlasAR.fetchModelData()` — which uses
         * `postWithoutImage` (HTTP POST) but never sets `body.method` —
         * tripped the POST branch below, was asked to prove `edit_post`,
         * and returned 401 to every anonymous visitor on mobile (Joachim
         * Rodriguez, 2026-06-09, kunstplaza.de).
         *
         * Writes are still locked down: an explicit `method=POST` in the
         * body (which the admin save path sends) lands in the POST
         * branch and demands `edit_post` as before.
         */
        $method  = strtoupper(isset($params['method']) ? (string) $params['method'] : 'GET');
        $post_id = 0;
        if (isset($params['post_id'])) {
            $post_id = intval($params['post_id']);
        } elseif (isset($params['product_id'])) {
            $post_id = intval($params['product_id']);
        }

        if ('POST' === $method) {
            $allowed = $post_id > 0 && current_user_can('edit_post', $post_id);
        } else {
            $call_from = isset($params['call_from']) ? (string) $params['call_from'] : '';
            if ('admin' === $call_from) {
                $allowed = current_user_can('manage_options');
            } else {
                // Frontend public read: callback strips sensitive props
                // via AR_TRY_ON_Helper::exclude_sensitive_properties().
                $allowed = true;
            }
        }

        $allowed = apply_filters('ATLAS_AR_rest_route_access', $allowed, $request);

        if (!$allowed) {
            return new \WP_Error(
                'rest_forbidden',
                __('You do not have permission to access this endpoint.', 'ar-vr-3d-model-try-on'),
                array('status' => is_user_logged_in() ? 403 : 401)
            );
        }

        return true;
    }
}
