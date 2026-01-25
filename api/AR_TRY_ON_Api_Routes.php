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

        // register settings route.
        register_rest_route(
            $this->namespace,
            '/settings',
            array(
                array(
                    'methods' => \WP_REST_Server::ALLMETHODS,
                    'callback' => array($this, 'settings'),
                    'permission_callback' => array($this, 'get_route_access'),
                    'args' => array(),
                ),
            )
        );
        // register get_model_and_settings route.
        register_rest_route(
            $this->namespace,
            '/get_model_and_settings',
            array(
                array(
                    'methods' => \WP_REST_Server::ALLMETHODS,
                    'callback' => array($this, 'get_model_and_settings'),
                    'permission_callback' => array($this, 'get_route_access'),
                    'args' => array(),
                ),
            )
        );

        // register demo_preview route.
        register_rest_route(
            $this->namespace,
            '/demo_preview',
            array(
                array(
                    'methods' => \WP_REST_Server::ALLMETHODS,
                    'callback' => array($this, 'demo_preview'),
                    'permission_callback' => array($this, 'get_route_access'),
                    'args' => array(),
                ),
            )
        );


        // register generate_3d_model route.
        register_rest_route(
            $this->namespace,
            '/generate_3d_model',
            array(
                array(
                    'methods' => \WP_REST_Server::ALLMETHODS,
                    'callback' => array($this, 'generate_3d_model'),
                    'permission_callback' => array($this, 'get_route_access'),
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
            }


            $data = $settings;
            $data += $product_settings;
            $data['product_name'] = $post_id ? get_the_title($post_id) : '';

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
//        $result['data']['temp'] = AR_TRY_ON_Helper::download_model_files_files_and_store($result['data']['output'], $decoded_data);
//
//        $result['extra'] = [
//            '$decoded_data' => $decoded_data,
//            '$result' => $result
//        ];
//
//        return rest_ensure_response($result);

        $response_body = '';
        if (!isset($api_body['task_id']) || !$api_body['task_id']) {
            $response = wp_remote_post($api_url, array(
                'headers' => $headers,
                'body' => json_encode($api_body),
                'timeout' => 90, // optional, prevent timeout on large requests
            ));

            if (is_wp_error($response)) {
                $result['data'] = $response->get_error_message();
                return rest_ensure_response($result);
            }

            $status_code = wp_remote_retrieve_response_code($response);
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

        if ($task_id) {
            unset($headers['Content-Type']);
            $api_url = $api_url . '/' . $task_id;

            $task_response = wp_remote_get($api_url, array(
                'headers' => $headers,
                'timeout' => 90, // optional, prevent timeout on large requests
            ));

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
        $task_result['data']['temp'] = AR_TRY_ON_Helper::download_model_files_files_and_store($task_result['data']['output'], $decoded_data);
        $task_result['extra'] = [
            '$task_response_body' => $task_response_body
        ];


        return rest_ensure_response($task_result);
    }


    /*
     * Get route access if request is valid.
     */
    public function get_route_access()
    {
        if (!isset($_SERVER['HTTP_X_WP_NONCE'])) {
            $nonce = sanitize_text_field(wp_unslash($_SERVER['HTTP_X_WP_NONCE']));
            if (!wp_verify_nonce($nonce, 'wp_rest')) {
                return apply_filters('ATLAS_AR_rest_route_access', false);
            }
        }


        return apply_filters('ATLAS_AR_rest_route_access', true);
    }
}
