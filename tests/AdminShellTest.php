<?php
/**
 * AR-180: the desktop-app frame of the AtlasAR admin. Integration tests on a local site
 * (tests/bootstrap.php):
 *   - the light boot of the 3D Library page holds no settings, Cloud details or email;
 *   - link items from atlas_ar_shell_links are checked (no javascript: or broken items);
 *   - boot() keeps every key it had and adds `shell`;
 *   - regression: the 3D Library is a full-window app screen also when the brand filter renames
 *     the menu ("AtlasAR Pro"), which changes the screen id WordPress builds.
 *
 * @package AR_TRY_ON
 */

use AR_TRY_ON_Admin\AR_TRY_ON_Dashboard;
use AR_TRY_ON_Admin\AR_TRY_ON_Library_Page;
use ATLAS_AR_API\AR_TRY_ON_Admin_Routes;
use PHPUnit\Framework\TestCase;

final class AdminShellTest extends TestCase {

	/** @var int[] users to delete */
	private $users = array();

	/** @var int the user before the test */
	private $before;

	protected function setUp(): void {
		require_once ABSPATH . 'wp-admin/includes/user.php';
		$this->before = get_current_user_id();
	}

	protected function tearDown(): void {
		remove_all_filters( 'atlas_ar_shell_links' );
		wp_set_current_user( $this->before );
		foreach ( $this->users as $id ) {
			wp_delete_user( $id );
		}
	}

	private function user( $role ) {
		$id            = wp_insert_user(
			array(
				'user_login' => 'ar180_' . $role . '_' . wp_generate_password( 6, false ),
				'user_pass'  => wp_generate_password( 24 ),
				'user_email' => 'ar180_' . $role . '_' . wp_generate_password( 6, false ) . '@example.test',
				'role'       => $role,
			)
		);
		$this->users[] = $id;
		return $id;
	}

	public function test_light_boot_holds_only_the_frame_keys(): void {
		wp_set_current_user( $this->user( 'author' ) );
		$shell = AR_TRY_ON_Admin_Routes::shell_boot();
		$this->assertSame( array( 'brand', 'version', 'urls', 'can', 'links' ), array_keys( $shell ) );
		$this->assertSame( array( 'dashboard', 'wizard', 'library', 'plugins' ), array_keys( $shell['urls'] ) );
		$this->assertSame( array( 'manage' => false, 'upload' => true ), $shell['can'] );
		$json = wp_json_encode( $shell );
		foreach ( array( 'settings', 'cloud', 'email', 'key', 'telemetry' ) as $word ) {
			$this->assertStringNotContainsStringIgnoringCase( '"' . $word, $json, "the light boot has no {$word}" );
		}
	}

	public function test_administrator_may_open_everything(): void {
		wp_set_current_user( $this->user( 'administrator' ) );
		$this->assertSame( array( 'manage' => true, 'upload' => true ), AR_TRY_ON_Admin_Routes::shell_boot()['can'] );
	}

	public function test_shell_links_are_checked(): void {
		add_filter(
			'atlas_ar_shell_links',
			function () {
				return array(
					array( 'id' => 'licence', 'label' => 'Licence <b>key</b>', 'href' => admin_url( 'admin.php?page=atlas-ar-pro-licence' ), 'icon' => 'external' ),
					array( 'id' => 'evil', 'label' => 'Evil', 'href' => 'javascript:alert(1)' ),
					array( 'id' => 'nolabel', 'href' => admin_url() ),
					'not an array',
					array( 'id' => 'data', 'label' => 'Data', 'href' => 'data:text/html,hi' ),
				);
			}
		);
		$links = AR_TRY_ON_Admin_Routes::shell_boot()['links'];
		$this->assertCount( 1, $links );
		$this->assertSame( 'licence', $links[0]['id'] );
		$this->assertSame( 'Licence key', $links[0]['label'], 'tags are stripped' );
		$this->assertSame( 'more', $links[0]['group'], 'no group: "More"' );
		$this->assertStringStartsWith( 'http', $links[0]['href'] );
	}

	public function test_boot_keeps_every_key_and_adds_shell(): void {
		wp_set_current_user( $this->user( 'administrator' ) );
		$boot = AR_TRY_ON_Admin_Routes::boot();
		foreach ( array( 'settings', 'schema', 'cloud', 'tracker', 'postTypes', 'migration', 'woo', 'blockTheme', 'counts', 'version', 'brand', 'demoModel', 'shell' ) as $key ) {
			$this->assertArrayHasKey( $key, $boot, $key );
		}
	}

	/**
	 * Regression (AR-179 plan 3.3): with the menu renamed by atlas_ar_brand ("AtlasAR Pro"),
	 * WordPress names the 3D Library's screen "atlasar-pro_page_atlas-ar-library"; the old fixed
	 * id "atlasar_page_atlas-ar-library" missed it, so the page lost its full-window frame.
	 */
	public function test_library_is_an_app_screen_when_the_menu_is_renamed(): void {
		global $admin_page_hooks, $_registered_pages, $menu, $submenu, $_parent_pages;
		require_once ABSPATH . 'wp-admin/includes/plugin.php';
		$saved = array( $admin_page_hooks, $_registered_pages, $menu, $submenu, $_parent_pages );
		wp_set_current_user( $this->user( 'administrator' ) );
		$rename = function ( $brand ) {
			$brand['name'] = 'AtlasAR Pro';
			return $brand;
		};
		add_filter( 'atlas_ar_brand', $rename );
		try {
			$brand = \AR_TRY_ON_Admin\AR_TRY_ON_Admin::brand();
			add_menu_page( $brand['name'], $brand['name'], 'manage_options', AR_TRY_ON_Dashboard::SLUG, '__return_null' );
			AR_TRY_ON_Library_Page::menu();
			$hook = AR_TRY_ON_Library_Page::hook();
			$this->assertSame( 'atlasar-pro_page_atlas-ar-library', $hook );
			$this->assertTrue( AR_TRY_ON_Dashboard::is_app_screen( $hook ) );
			$this->assertTrue( AR_TRY_ON_Dashboard::is_app_screen( 'toplevel_page_ar-vr-3d-model-try-on' ) );
			$this->assertFalse( AR_TRY_ON_Dashboard::is_app_screen( 'atlasar_page_atlas-ar-library' ), 'the old fixed id is not used' );
			$this->assertFalse( AR_TRY_ON_Dashboard::is_app_screen( 'edit-post' ) );
		} finally {
			remove_filter( 'atlas_ar_brand', $rename );
			list( $admin_page_hooks, $_registered_pages, $menu, $submenu, $_parent_pages ) = $saved;
		}
	}

	public function test_scripts_are_registered_with_the_kit_handle_kept(): void {
		AR_TRY_ON_Dashboard::register();
		$scripts = wp_scripts();
		foreach ( array( 'atlas-ar-ui', 'atlas-ar-map', 'atlas-ar-search', 'atlas-ar-shell', 'atlas-ar-dashboard' ) as $handle ) {
			$this->assertTrue( wp_script_is( $handle, 'registered' ), $handle );
		}
		$this->assertTrue( wp_style_is( 'atlas-ar-shell', 'registered' ) );
		$deps = $scripts->registered['atlas-ar-dashboard']->deps;
		foreach ( array( 'atlas-ar-ui', 'atlas-ar-map', 'atlas-ar-shell' ) as $dep ) {
			$this->assertContains( $dep, $deps );
		}
		// Old Pro 4.0.0 depends on atlas-ar-ui only: it must not need a new handle.
		$this->assertNotContains( 'atlas-ar-shell', $scripts->registered['atlas-ar-ui']->deps );
	}

	/**
	 * AR-182: the product panel's markup and save field are unchanged (the hidden field the
	 * save_post handler reads, its nonce, the root), and its script loads the search part for the
	 * #atlas-ar-panel:<tab>/<setting> address.
	 */
	public function test_product_panel_keeps_its_save_field_and_loads_the_search(): void {
		// The admin screen API is not loaded on the command line.
		require_once ABSPATH . 'wp-admin/includes/class-wp-screen.php';
		require_once ABSPATH . 'wp-admin/includes/screen.php';
		wp_set_current_user( $this->user( 'administrator' ) );
		$post_id = wp_insert_post( array( 'post_type' => 'product', 'post_title' => 'AR-182 panel test', 'post_status' => 'draft' ) );
		try {
			ob_start();
			\AR_TRY_ON_Admin\AR_TRY_ON_Product_Panel::render( get_post( $post_id ) );
			$html = (string) ob_get_clean();
			$this->assertStringContainsString( 'id="atlas-ar-panel-data" name="atlas_ar_panel"', $html );
			$this->assertStringContainsString( 'name="atlas_ar_panel_nonce"', $html );
			$this->assertStringContainsString( 'id="atlas-ar-panel-root"', $html );

			$GLOBALS['post'] = get_post( $post_id );
			set_current_screen( 'product' );
			AR_TRY_ON_Dashboard::register();
			\AR_TRY_ON_Admin\AR_TRY_ON_Product_Panel::enqueue( 'post.php' );
			$deps = wp_scripts()->registered['atlas-ar-product']->deps;
			$this->assertContains( 'atlas-ar-ui', $deps );
			$this->assertContains( 'atlas-ar-search', $deps );
			$this->assertNotContains( 'atlas-ar-shell', $deps, 'no app frame in the editor' );
		} finally {
			wp_dequeue_script( 'atlas-ar-product' );
			unset( $GLOBALS['post'] );
			set_current_screen( 'front' );
			wp_delete_post( $post_id, true );
		}
	}
}
