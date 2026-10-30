<?php
/**
 * Model health check: what makes a 3D model show white, wrong-sized, slow or not at all, found
 * before shoppers see it, each with the fix.
 *
 * Reads only the GLB's JSON part (its first few kilobytes: meshes, materials, textures, sizes), never
 * the whole model, and keeps the result in post meta until the GLB changes. Checks:
 *   textures_outside  textures that point to other files (the model shows white)     error
 *   unsupported       a required glTF extension the viewer cannot read               error
 *   tiny / huge       the size points to wrong units (millimetres saved as metres)    error
 *   no_colour         no materials or textures at all (a plain white/grey model)      warning
 *   heavy             file over the "large" size (slow on phones)                     warning
 *   triangles         far more detail than a product page needs                       warning
 *   no_poster         no picture: blank until the model loads, none for search        info
 *
 * @package AR_TRY_ON
 */

namespace AR_TRY_ON; // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedNamespaceFound -- Stable internal namespace (see AR-66).

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AR_TRY_ON_Health {

	const META = '_atlas_ar_health';
	/** The JSON part of a GLB larger than this is not read (a real model's is far smaller). */
	const MAX_JSON_BYTES = 33554432;
	/** More triangles than this is far more detail than a product page needs. */
	const TRIANGLES_WARN = 300000;
	/** Sizes (metres) that point to wrong units: smaller than 5 mm or larger than 30 m. */
	const TINY_M = 0.005;
	const HUGE_M = 30;
	/** glTF extensions the viewer reads (model-viewer with the decoders this plugin ships). */
	/** A normalized accessor's divisor by component type (byte, unsigned byte, short, unsigned short). */
	const NORMALIZED = array( 5120 => 127, 5121 => 255, 5122 => 32767, 5123 => 65535 );
	const SUPPORTED = array(
		'KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_meshopt_compression', 'KHR_texture_basisu',
		'KHR_mesh_quantization', 'KHR_texture_transform', 'EXT_texture_webp', 'EXT_texture_avif', 'KHR_materials_unlit',
		'KHR_materials_emissive_strength', 'KHR_materials_clearcoat', 'KHR_materials_ior', 'KHR_materials_sheen',
		'KHR_materials_specular', 'KHR_materials_transmission', 'KHR_materials_volume', 'KHR_materials_iridescence',
		'KHR_materials_anisotropy', 'KHR_materials_dispersion', 'KHR_materials_variants', 'KHR_materials_pbrSpecularGlossiness',
		'KHR_lights_punctual', 'EXT_mesh_gpu_instancing',
	);

	/**
	 * The model's health, from the cache while its GLB is unchanged.
	 *
	 * @param int        $id    model id
	 * @param array|null $model AR_TRY_ON_Library::get() (to avoid a second read), without 'health'
	 * @return array { ok, counts: {error, warning, info}, issues: [ {code, level, title, text, fix} ], facts }
	 */
	public static function check( $id, $model = null ) {
		$model = is_array( $model ) ? $model : AR_TRY_ON_Library::get( $id );
		if ( ! $model ) {
			return self::result( array(), array() );
		}
		$facts = null;
		if ( ! empty( $model['files']['glb'] ) ) {
			$path  = AR_TRY_ON_Library::file_path( $id, 'glb' );
			// The cache is good while the GLB is the same file (name, size, time).
			$stamp = $model['files']['glb']['name'] . ':' . (int) $model['files']['glb']['size'] . ':' . ( $path ? (int) filemtime( $path ) : 0 );
			$cache = get_post_meta( $id, self::META, true );
			if ( is_array( $cache ) && isset( $cache['stamp'] ) && $cache['stamp'] === $stamp && array_key_exists( 'facts', $cache ) ) {
				$facts = $cache['facts'];
			} else {
				$facts = self::inspect( $path );
				update_post_meta( $id, self::META, array( 'stamp' => $stamp, 'facts' => $facts ) );
			}
		}
		return self::result( self::issues( $model, $facts ), $facts );
	}

	/** @return array */
	private static function result( array $issues, $facts ) {
		$counts = array( 'error' => 0, 'warning' => 0, 'info' => 0 );
		foreach ( $issues as $i ) {
			++$counts[ $i['level'] ];
		}
		return array( 'ok' => 0 === $counts['error'] + $counts['warning'], 'counts' => $counts, 'issues' => $issues, 'facts' => $facts );
	}

	/**
	 * Facts from a GLB's JSON part: triangles, textures (and those in other files), materials,
	 * primitives without a material, required extensions, and the model's size in metres.
	 *
	 * @param string $path
	 * @return array|null null when the file is not a readable GLB
	 */
	public static function inspect( $path ) {
		$json = self::glb_json( $path );
		if ( ! is_array( $json ) ) {
			return null;
		}
		$accessors = isset( $json['accessors'] ) && is_array( $json['accessors'] ) ? $json['accessors'] : array();
		$triangles = 0;
		$bare      = 0;
		foreach ( (array) ( $json['meshes'] ?? array() ) as $mesh ) {
			foreach ( (array) ( $mesh['primitives'] ?? array() ) as $p ) {
				$mode = isset( $p['mode'] ) ? (int) $p['mode'] : 4;
				$acc  = isset( $p['indices'] ) ? (int) $p['indices'] : ( isset( $p['attributes']['POSITION'] ) ? (int) $p['attributes']['POSITION'] : -1 );
				$n    = isset( $accessors[ $acc ]['count'] ) ? (int) $accessors[ $acc ]['count'] : 0;
				if ( 4 === $mode ) {
					$triangles += intdiv( $n, 3 );
				} elseif ( 5 === $mode || 6 === $mode ) {
					$triangles += max( 0, $n - 2 );
				}
				if ( ! isset( $p['material'] ) ) {
					++$bare;
				}
			}
		}
		$images  = (array) ( $json['images'] ?? array() );
		$outside = 0;
		foreach ( $images as $img ) {
			if ( isset( $img['uri'] ) && 0 !== strpos( (string) $img['uri'], 'data:' ) ) {
				++$outside;
			}
		}
		$required = array_values( array_filter( array_map( 'strval', (array) ( $json['extensionsRequired'] ?? array() ) ) ) );
		return array(
			'triangles'   => $triangles,
			'images'      => count( $images ),
			'outside'     => $outside,
			'materials'   => count( (array) ( $json['materials'] ?? array() ) ),
			'bare'        => $bare,
			'required'    => $required,
			'unsupported' => array_values( array_diff( $required, self::SUPPORTED ) ),
			'size_m'      => self::bounds( $json ),
		);
	}

	/**
	 * The problems in plain words, worst first.
	 *
	 * @param array      $model
	 * @param array|null $facts
	 * @return array
	 */
	public static function issues( array $model, $facts ) {
		$out   = array();
		$files = $model['files'];
		$add   = function ( $code, $level, $title, $text, $fix = '' ) use ( &$out ) {
			$out[] = compact( 'code', 'level', 'title', 'text', 'fix' );
		};
		if ( empty( $files['glb'] ) ) {
			return $out; // "Missing files" already says so; nothing to check.
		}
		if ( null === $facts ) {
			$add( 'unreadable', 'error', __( 'The GLB file could not be read', 'ar-vr-3d-model-try-on' ), __( 'It may be damaged or not a real GLB. Export it again from your 3D app and upload it.', 'ar-vr-3d-model-try-on' ), 'upload' );
			return $out;
		}
		if ( $facts['outside'] > 0 ) {
			$add( 'textures_outside', 'error', __( 'Textures are not inside the file', 'ar-vr-3d-model-try-on' ),
				/* translators: %d: number of textures */
				sprintf( _n( '%d texture points to another file, so the model shows white. Export a GLB with the textures embedded (in Blender: glTF Binary, "Images: Automatic").', '%d textures point to other files, so the model shows white. Export a GLB with the textures embedded (in Blender: glTF Binary, "Images: Automatic").', $facts['outside'], 'ar-vr-3d-model-try-on' ), $facts['outside'] ), 'upload' );
		}
		if ( $facts['unsupported'] ) {
			$add( 'unsupported', 'error', __( 'It uses a format the 3D viewer cannot read', 'ar-vr-3d-model-try-on' ),
				/* translators: %s: glTF extension names */
				sprintf( __( 'Required: %s. Export it again without this option, or optimise it (the result uses formats every browser reads).', 'ar-vr-3d-model-try-on' ), implode( ', ', $facts['unsupported'] ) ), 'optimise' );
		}
		$size = $facts['size_m'];
		if ( is_array( $size ) ) {
			$max = max( $size );
			if ( $max > 0 && $max < self::TINY_M ) {
				$add( 'tiny', 'error', __( 'It is far too small', 'ar-vr-3d-model-try-on' ),
					/* translators: %s: size in millimetres */
					sprintf( __( 'Its largest side is %s mm, so in AR it is almost invisible. It was probably made in another unit. Enter its real height and optimise: it is made exactly that size.', 'ar-vr-3d-model-try-on' ), number_format_i18n( $max * 1000, 2 ) ), 'height' );
			} elseif ( $max > self::HUGE_M ) {
				$add( 'huge', 'error', __( 'It is far too big', 'ar-vr-3d-model-try-on' ),
					/* translators: %s: size in metres */
					sprintf( __( 'Its largest side is %s m, so in AR it fills the room. It was probably made in millimetres or centimetres. Enter its real height and optimise: it is made exactly that size.', 'ar-vr-3d-model-try-on' ), number_format_i18n( $max, 1 ) ), 'height' );
			}
		}
		if ( 0 === $facts['images'] && ( 0 === $facts['materials'] || $facts['bare'] > 0 ) ) {
			$add( 'no_colour', 'warning', __( 'No colours or textures', 'ar-vr-3d-model-try-on' ), __( 'Parts of the model have no material, so they show plain white or grey. Check the export settings of your 3D app (materials and textures on).', 'ar-vr-3d-model-try-on' ), 'upload' );
		}
		$optimised = ! empty( $model['optimised'] );
		if ( ! empty( $model['large'] ) ) {
			$add( 'heavy', 'warning', __( 'Too heavy for phones', 'ar-vr-3d-model-try-on' ),
				/* translators: %s: file size */
				sprintf( __( 'The file is %s: shoppers on a phone wait for it. Optimise usually makes it 5 to 10 times lighter.', 'ar-vr-3d-model-try-on' ), size_format( (int) $files['glb']['size'], 1 ) ), 'optimise' );
		}
		if ( $facts['triangles'] > self::TRIANGLES_WARN ) {
			$add( 'triangles', 'warning', __( 'Far more detail than a product page needs', 'ar-vr-3d-model-try-on' ),
				/* translators: %s: triangle count */
				sprintf( __( '%s triangles (a phone scan, or a model made for print). Optimise keeps the look with far fewer.', 'ar-vr-3d-model-try-on' ), number_format_i18n( $facts['triangles'] ) ), $optimised ? 'optimise_lower' : 'optimise' );
		}
		if ( empty( $files['poster'] ) ) {
			$add( 'no_poster', 'info', __( 'No poster picture', 'ar-vr-3d-model-try-on' ), __( 'The view is blank until the model loads, and search results have no picture. Take one from the 3D view.', 'ar-vr-3d-model-try-on' ), 'poster' );
		}
		return $out;
	}

	/**
	 * The JSON part of a GLB (its first chunk). Only that part is read.
	 *
	 * @param string $path
	 * @return array|null
	 */
	private static function glb_json( $path ) {
		if ( ! is_string( $path ) || '' === $path || ! is_readable( $path ) ) {
			return null;
		}
		$head = file_get_contents( $path, false, null, 0, 20 ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a local model's 20-byte header (WP_Filesystem would read the whole model).
		if ( ! is_string( $head ) || strlen( $head ) < 20 || 0 !== strncmp( $head, 'glTF', 4 ) ) {
			return null;
		}
		$chunk = unpack( 'Vlength/Vtype', substr( $head, 12, 8 ) );
		if ( ! $chunk || 0x4E4F534A !== $chunk['type'] || $chunk['length'] < 2 || $chunk['length'] > self::MAX_JSON_BYTES ) {
			return null;
		}
		$text = file_get_contents( $path, false, null, 20, (int) $chunk['length'] ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- only the GLB's JSON chunk, never the whole model.
		$json = is_string( $text ) ? json_decode( $text, true ) : null;
		return is_array( $json ) ? $json : null;
	}

	/**
	 * The model's width, height and depth in metres (glTF units), from the meshes' position bounds
	 * and the node transforms of the default scene. null when it cannot be worked out.
	 *
	 * @param array $json
	 * @return array|null [ x, y, z ]
	 */
	private static function bounds( array $json ) {
		$nodes     = (array) ( $json['nodes'] ?? array() );
		$meshes    = (array) ( $json['meshes'] ?? array() );
		$accessors = (array) ( $json['accessors'] ?? array() );
		$scenes    = (array) ( $json['scenes'] ?? array() );
		$scene     = isset( $json['scene'] ) ? (int) $json['scene'] : 0;
		$roots     = isset( $scenes[ $scene ]['nodes'] ) ? (array) $scenes[ $scene ]['nodes'] : array_keys( $nodes );
		$min       = array( INF, INF, INF );
		$max       = array( -INF, -INF, -INF );
		$seen      = 0;
		$walk      = function ( $index, $parent, $depth ) use ( &$walk, &$min, &$max, &$seen, $nodes, $meshes, $accessors ) {
			if ( $depth > 64 || ! isset( $nodes[ $index ] ) || ++$seen > 20000 ) {
				return;
			}
			$node  = $nodes[ $index ];
			$world = self::multiply( $parent, self::local( $node ) );
			if ( isset( $node['mesh'], $meshes[ $node['mesh'] ] ) ) {
				foreach ( (array) ( $meshes[ $node['mesh'] ]['primitives'] ?? array() ) as $p ) {
					$a = isset( $p['attributes']['POSITION'] ) ? (int) $p['attributes']['POSITION'] : -1;
					if ( ! isset( $accessors[ $a ]['min'], $accessors[ $a ]['max'] ) || count( (array) $accessors[ $a ]['min'] ) < 3 ) {
						continue;
					}
					// Quantized positions (KHR_mesh_quantization, as optimised models use): a normalized
					// accessor's min/max are whole numbers in its type's range, not the positions.
					$div = ! empty( $accessors[ $a ]['normalized'] ) ? self::NORMALIZED[ (int) ( $accessors[ $a ]['componentType'] ?? 0 ) ] ?? 1 : 1;
					$lo  = array_map( function ( $v ) use ( $div ) { return (float) $v / $div; }, $accessors[ $a ]['min'] );
					$hi  = array_map( function ( $v ) use ( $div ) { return (float) $v / $div; }, $accessors[ $a ]['max'] );
					foreach ( array( $lo[0], $hi[0] ) as $x ) {
						foreach ( array( $lo[1], $hi[1] ) as $y ) {
							foreach ( array( $lo[2], $hi[2] ) as $z ) {
								$p3 = self::apply( $world, array( (float) $x, (float) $y, (float) $z ) );
								for ( $i = 0; $i < 3; $i++ ) {
									$min[ $i ] = min( $min[ $i ], $p3[ $i ] );
									$max[ $i ] = max( $max[ $i ], $p3[ $i ] );
								}
							}
						}
					}
				}
			}
			foreach ( (array) ( $node['children'] ?? array() ) as $child ) {
				$walk( (int) $child, $world, $depth + 1 );
			}
		};
		foreach ( $roots as $root ) {
			$walk( (int) $root, self::identity(), 0 );
		}
		if ( INF === $min[0] ) {
			return null;
		}
		return array( $max[0] - $min[0], $max[1] - $min[1], $max[2] - $min[2] );
	}

	/** @return float[] column-major 4×4 identity */
	private static function identity() {
		return array( 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 );
	}

	/** A node's local transform (matrix, or translation × rotation × scale), column-major. */
	private static function local( array $node ) {
		if ( isset( $node['matrix'] ) && is_array( $node['matrix'] ) && 16 === count( $node['matrix'] ) ) {
			return array_map( 'floatval', array_values( $node['matrix'] ) );
		}
		$t = isset( $node['translation'] ) ? array_map( 'floatval', (array) $node['translation'] ) + array( 0, 0, 0 ) : array( 0, 0, 0 );
		$r = isset( $node['rotation'] ) ? array_map( 'floatval', (array) $node['rotation'] ) + array( 0, 0, 0, 1 ) : array( 0, 0, 0, 1 );
		$s = isset( $node['scale'] ) ? array_map( 'floatval', (array) $node['scale'] ) + array( 1, 1, 1 ) : array( 1, 1, 1 );
		list( $x, $y, $z, $w ) = $r;
		return array(
			( 1 - 2 * ( $y * $y + $z * $z ) ) * $s[0], ( 2 * ( $x * $y + $z * $w ) ) * $s[0], ( 2 * ( $x * $z - $y * $w ) ) * $s[0], 0,
			( 2 * ( $x * $y - $z * $w ) ) * $s[1], ( 1 - 2 * ( $x * $x + $z * $z ) ) * $s[1], ( 2 * ( $y * $z + $x * $w ) ) * $s[1], 0,
			( 2 * ( $x * $z + $y * $w ) ) * $s[2], ( 2 * ( $y * $z - $x * $w ) ) * $s[2], ( 1 - 2 * ( $x * $x + $y * $y ) ) * $s[2], 0,
			$t[0], $t[1], $t[2], 1,
		);
	}

	/** a × b for column-major 4×4 matrices. */
	private static function multiply( array $a, array $b ) {
		$o = array_fill( 0, 16, 0.0 );
		for ( $c = 0; $c < 4; $c++ ) {
			for ( $r = 0; $r < 4; $r++ ) {
				$sum = 0.0;
				for ( $k = 0; $k < 4; $k++ ) {
					$sum += $a[ $k * 4 + $r ] * $b[ $c * 4 + $k ];
				}
				$o[ $c * 4 + $r ] = $sum;
			}
		}
		return $o;
	}

	/** A point through a column-major 4×4 matrix. */
	private static function apply( array $m, array $p ) {
		return array(
			$m[0] * $p[0] + $m[4] * $p[1] + $m[8] * $p[2] + $m[12],
			$m[1] * $p[0] + $m[5] * $p[1] + $m[9] * $p[2] + $m[13],
			$m[2] * $p[0] + $m[6] * $p[1] + $m[10] * $p[2] + $m[14],
		);
	}
}
