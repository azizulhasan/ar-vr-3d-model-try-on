<?php
/**
 * AR-129: the "AtlasAR 3D view" Elementor widget. Loaded by AR_TRY_ON_Elementor only when
 * Elementor is active (it extends Elementor's own widget class).
 *
 * @package AR_TRY_ON
 */

namespace AR_TRY_ON; // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedNamespaceFound -- Stable internal namespace (see AR-66).

use Elementor\Controls_Manager;
use Elementor\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AR_TRY_ON_Elementor_Widget extends Widget_Base {

	public function get_name() {
		return 'atlas_ar_viewer';
	}

	public function get_title() {
		return __( 'AtlasAR 3D view', 'ar-vr-3d-model-try-on' );
	}

	public function get_icon() {
		return 'eicon-photo-library';
	}

	public function get_categories() {
		return array( 'general' );
	}

	public function get_keywords() {
		return array( '3d', 'ar', 'augmented reality', 'model', 'glb', 'atlasar', 'try on' );
	}

	/**
	 * Never cached by Elementor's element cache: the viewer's page needs to know it shows a viewer
	 * (to load the viewer script), and the model can change in the 3D Library.
	 */
	protected function is_dynamic_content(): bool {
		return true;
	}

	protected function register_controls() {
		$this->start_controls_section( 'content', array( 'label' => __( '3D view', 'ar-vr-3d-model-try-on' ) ) );
		$this->add_control(
			'post_id',
			array(
				'label'       => __( 'Product or post ID', 'ar-vr-3d-model-try-on' ),
				'description' => __( 'Its 3D model is shown. Leave 0 for the page this is on.', 'ar-vr-3d-model-try-on' ),
				'type'        => Controls_Manager::NUMBER,
				'min'         => 0,
				'default'     => 0,
			)
		);
		$this->add_control(
			'show',
			array(
				'label'   => __( 'Show', 'ar-vr-3d-model-try-on' ),
				'type'    => Controls_Manager::SELECT,
				'default' => 'view',
				'options' => array(
					'view'   => __( 'The 3D view', 'ar-vr-3d-model-try-on' ),
					'button' => __( 'A button that opens it', 'ar-vr-3d-model-try-on' ),
				),
			)
		);
		$this->add_control(
			'height',
			array(
				'label'     => __( 'Height', 'ar-vr-3d-model-try-on' ),
				'type'      => Controls_Manager::TEXT,
				'default'   => '420px',
				'condition' => array( 'show' => 'view' ),
			)
		);
		$this->add_control(
			'aspect_ratio',
			array(
				'label'       => __( 'Aspect ratio (instead of a height)', 'ar-vr-3d-model-try-on' ),
				'description' => __( 'For example 1/1 or 4/3.', 'ar-vr-3d-model-try-on' ),
				'type'        => Controls_Manager::TEXT,
				'default'     => '',
				'condition'   => array( 'show' => 'view' ),
			)
		);
		$this->add_control(
			'button_label',
			array(
				'label'     => __( 'Button text', 'ar-vr-3d-model-try-on' ),
				'type'      => Controls_Manager::TEXT,
				'default'   => __( 'View in 3D', 'ar-vr-3d-model-try-on' ),
				'condition' => array( 'show' => 'button' ),
			)
		);
		$this->end_controls_section();
	}

	protected function render() {
		$s    = $this->get_settings_for_display();
		$atts = array( 'reveal' => 'button' === $s['show'] ? 'false' : 'true' );
		if ( ! empty( $s['post_id'] ) ) {
			$atts['id'] = absint( $s['post_id'] );
		}
		if ( 'button' === $s['show'] ) {
			$atts['button_label'] = (string) $s['button_label'];
		} else {
			$atts['height']       = (string) $s['height'];
			$atts['aspect_ratio'] = (string) $s['aspect_ratio'];
		}
		$html = AR_TRY_ON_Frontend::shortcode( $atts );
		if ( '' === $html && \Elementor\Plugin::$instance->editor->is_edit_mode() ) {
			echo '<p>' . esc_html__( 'No 3D model yet: choose one in the AtlasAR panel of this page or product, or set a product ID.', 'ar-vr-3d-model-try-on' ) . '</p>';
			return;
		}
		AR_TRY_ON_Viewer::print_html( $html );
	}
}
