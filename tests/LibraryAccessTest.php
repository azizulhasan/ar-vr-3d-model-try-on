<?php
/**
 * AR-177 (security): who may see 3D Library models through the REST API. An Author must not get
 * other users' models (file URLs) or the titles of posts they may not read; Editors and
 * Administrators keep seeing everything. Integration tests on a local site (tests/bootstrap.php).
 *
 * @package AR_TRY_ON
 */

use AR_TRY_ON\AR_TRY_ON_Library;
use AR_TRY_ON\AR_TRY_ON_Product;
use AR_TRY_ON\AR_TRY_ON_Settings;
use PHPUnit\Framework\TestCase;

final class LibraryAccessTest extends TestCase {

	/** @var array the site's settings before the test */
	private $saved_settings;

	/** @var int[] posts and users to delete */
	private $posts = array();
	private $users = array();

	/** @var int users */
	private $admin;
	private $editor;
	private $author;
	private $contributor;

	/** @var int fixtures */
	private $admin_model;
	private $author_model;
	private $private_post;
	private $draft_post;
	private $public_product;
	private $author_product;

	protected function setUp(): void {
		require_once ABSPATH . 'wp-admin/includes/user.php';
		$this->saved_settings = AR_TRY_ON_Settings::all();
		AR_TRY_ON_Settings::update( array( 'general' => array( 'post_types' => array( 'product', 'post', 'page' ) ) ) );

		$this->admin       = $this->user( 'administrator' );
		$this->editor      = $this->user( 'editor' );
		$this->author      = $this->user( 'author' );
		$this->contributor = $this->user( 'contributor' );

		$this->admin_model  = $this->model( $this->admin, 'AR-177 admin model' );
		$this->author_model = $this->model( $this->author, 'AR-177 author model' );

		// The administrator's private and draft posts show both models; a public product too.
		$this->private_post   = $this->post( $this->admin, 'private', 'AR-177 SECRET private title' );
		$this->draft_post     = $this->post( $this->admin, 'draft', 'AR-177 SECRET draft title' );
		$this->public_product = $this->post( $this->admin, 'publish', 'AR-177 public product', 'product' );
		$this->author_product = $this->post( $this->author, 'publish', 'AR-177 author post' ); // a post: Authors cannot edit WooCommerce products
		foreach ( array( $this->private_post, $this->draft_post, $this->public_product ) as $pid ) {
			AR_TRY_ON_Product::update( $pid, array( 'model_id' => $this->admin_model ) );
		}
		// The author's model is shown on the admin's private post and on the public product's
		// sibling (the author's own product).
		$this->author_model_private = $this->post( $this->admin, 'private', 'AR-177 SECRET private (author model)' );
		AR_TRY_ON_Product::update( $this->author_model_private, array( 'model_id' => $this->author_model ) );
		AR_TRY_ON_Product::update( $this->author_product, array( 'model_id' => $this->author_model ) );
	}

	/** @var int a private post of the admin that shows the author's model */
	private $author_model_private;

	protected function tearDown(): void {
		wp_set_current_user( 0 );
		foreach ( $this->posts as $id ) {
			wp_delete_post( $id, true );
		}
		foreach ( $this->users as $id ) {
			wp_delete_user( $id );
		}
		AR_TRY_ON_Settings::update( $this->saved_settings );
	}

	/* ------------------------------------------------------------------ helpers */

	private function user( $role ) {
		$id            = wp_insert_user( array( 'user_login' => 'ar177_' . $role . '_' . wp_generate_password( 6, false ), 'user_pass' => wp_generate_password( 20 ), 'role' => $role ) );
		$this->users[] = $id;
		return $id;
	}

	private function model( $owner, $title ) {
		$id = wp_insert_post( array( 'post_type' => AR_TRY_ON_Library::POST_TYPE, 'post_title' => $title, 'post_status' => 'publish', 'post_author' => $owner ) );
		update_post_meta( $id, AR_TRY_ON_Library::FILES_META, array( 'glb' => array( 'file' => 'atlasar/ar177/' . $id . '-secret.glb', 'size' => 1200 ) ) );
		$this->posts[] = $id;
		return $id;
	}

	private function post( $owner, $status, $title, $type = 'post' ) {
		$id            = wp_insert_post( array( 'post_type' => $type, 'post_title' => $title, 'post_status' => $status, 'post_author' => $owner ) );
		$this->posts[] = $id;
		return $id;
	}

	/** A REST request as a user: [ status, data, headers ]. */
	private function call( $user, $method, $route, array $params = array() ) {
		wp_set_current_user( $user );
		$req = new WP_REST_Request( $method, $route );
		foreach ( $params as $k => $v ) {
			$req->set_param( $k, $v );
		}
		$res = rest_do_request( $req );
		return array( $res->get_status(), $res->get_data(), $res->get_headers() );
	}

	private function ids( array $models ) {
		return array_map( 'intval', wp_list_pluck( $models, 'id' ) );
	}

	/** IDs in a model's "used by" list (titles of private posts read "Private: …"). */
	private function used( array $model ) {
		return array_map( 'intval', wp_list_pluck( isset( $model['used_by'] ) ? $model['used_by'] : array(), 'id' ) );
	}

	/* -------------------------------------------------------------------- tests */

	public function test_an_author_lists_only_their_own_models(): void {
		list( $status, $data, $headers ) = $this->call( $this->author, 'GET', '/ar_try_on/v1/library', array( 'per_page' => 100 ) );
		$this->assertSame( 200, $status );
		$ids = $this->ids( $data );
		$this->assertContains( $this->author_model, $ids );
		$this->assertNotContains( $this->admin_model, $ids, 'the administrator\'s model must not be listed' );
		$this->assertSame( (string) count( $ids ), $headers['X-WP-Total'], 'the total counts only what the author may see' );
		$this->assertStringNotContainsString( $this->admin_model . '-secret.glb', wp_json_encode( $data ) );
	}

	public function test_an_author_cannot_read_someone_elses_model(): void {
		list( $status, $data ) = $this->call( $this->author, 'GET', '/ar_try_on/v1/library/' . $this->admin_model );
		$this->assertContains( $status, array( 401, 403 ) );
		$this->assertStringNotContainsString( 'secret.glb', wp_json_encode( $data ) );
	}

	public function test_an_author_never_gets_titles_of_posts_they_cannot_read(): void {
		list( $status, $data ) = $this->call( $this->author, 'GET', '/ar_try_on/v1/library/' . $this->author_model );
		$this->assertSame( 200, $status );
		$used = $this->used( $data );
		$this->assertContains( $this->author_product, $used );
		$this->assertNotContains( $this->author_model_private, $used );
		$this->assertStringNotContainsString( 'SECRET', wp_json_encode( $data ) );

		list( , $list ) = $this->call( $this->author, 'GET', '/ar_try_on/v1/library', array( 'per_page' => 100 ) );
		$this->assertStringNotContainsString( 'SECRET', wp_json_encode( $list ), 'the list hides them too' );
	}

	public function test_an_author_cannot_link_someone_elses_model(): void {
		list( $status, $data ) = $this->call( $this->author, 'POST', '/ar_try_on/v1/products/' . $this->author_product . '/model', array( 'model_id' => $this->admin_model ) );
		$this->assertContains( $status, array( 401, 403 ) );
		$this->assertStringNotContainsString( 'secret.glb', wp_json_encode( $data ) );
		$this->assertSame( $this->author_model, AR_TRY_ON_Product::model_id( $this->author_product ), 'the product keeps its model' );

		list( $status, $data ) = $this->call( $this->author, 'POST', '/ar_try_on/v1/products/' . $this->author_product . '/model', array( 'model_id' => $this->author_model ) );
		$this->assertSame( 200, $status, 'their own model still links' );
		$this->assertStringNotContainsString( 'SECRET', wp_json_encode( $data ) );

		list( $status ) = $this->call( $this->author, 'POST', '/ar_try_on/v1/products/' . $this->author_product . '/model', array( 'model_id' => 0 ) );
		$this->assertSame( 200, $status, 'removing the model still works' );
	}

	public function test_the_product_panel_data_hides_unreadable_titles(): void {
		wp_set_current_user( $this->author );
		AR_TRY_ON_Product::update( $this->author_product, array( 'model_id' => $this->author_model ) );
		$item = \ATLAS_AR_API\AR_TRY_ON_Admin_Routes::item( $this->author_product );
		$this->assertContains( $this->author_product, $this->used( $item['model'] ) );
		$this->assertNotContains( $this->author_model_private, $this->used( $item['model'] ) );
		$this->assertStringNotContainsString( 'SECRET', wp_json_encode( $item ) );
	}

	public function test_editors_and_administrators_see_everything(): void {
		foreach ( array( $this->editor, $this->admin ) as $user ) {
			list( $status, $data ) = $this->call( $user, 'GET', '/ar_try_on/v1/library', array( 'per_page' => 100 ) );
			$this->assertSame( 200, $status );
			$ids = $this->ids( $data );
			$this->assertContains( $this->admin_model, $ids );
			$this->assertContains( $this->author_model, $ids );

			list( $status, $data ) = $this->call( $user, 'GET', '/ar_try_on/v1/library/' . $this->admin_model );
			$this->assertSame( 200, $status );
			$used = $this->used( $data );
			$this->assertContains( $this->private_post, $used, 'they may read private posts' );
			$this->assertContains( $this->draft_post, $used );
			$this->assertContains( $this->public_product, $used );
		}
	}

	public function test_without_upload_files_there_is_no_library(): void {
		list( $status ) = $this->call( $this->contributor, 'GET', '/ar_try_on/v1/library' );
		$this->assertContains( $status, array( 401, 403 ) );
		list( $status ) = $this->call( $this->contributor, 'GET', '/ar_try_on/v1/library/' . $this->author_model );
		$this->assertContains( $status, array( 401, 403 ) );
		list( $status ) = $this->call( 0, 'GET', '/ar_try_on/v1/library' );
		$this->assertContains( $status, array( 401, 403 ) );
	}

	public function test_server_side_code_keeps_the_full_model(): void {
		wp_set_current_user( 0 );
		$model = AR_TRY_ON_Library::get( $this->admin_model );
		$this->assertCount( 3, $model['used_by'], 'get() itself is unchanged (WP-CLI, migrations)' );
	}
}
