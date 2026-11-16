/**
 * AR-181: the one map of the AtlasAR admin: screens, their tabs, settings (field definitions)
 * and a few actions. Data and words only. Three readers use it, so there is no second list:
 *   - the side menu (labels, groups, icons),
 *   - the screens (UI.Fields draws every setting from its definition),
 *   - the header search (atlas-ar-search.js turns the same definitions into search entries).
 *
 * A field definition (written once; the screen draws it and the search finds it):
 *   { id: 'look.exposure',            the settings path group.key (also the search target id)
 *     screen, tab, section,           where it lives
 *     control,                        toggle | text | url | number | textarea | select | radio |
 *                                     range | swatches | custom (with render( props ))
 *     label, help,                    translated, shown
 *     keywords,                       translated search words (not shown)
 *     en,                             plain English search words, never translated: the fallback
 *     options, colors, step,          what only the screen knows (min, max and the allowed option
 *                                     values come from the server's schema, boot.schema)
 *     showIf( settings ), needs,      when it shows, the field that makes it show, and one line
 *     needsHint,                      that says so (the search uses them when the field is hidden)
 *     onByDefault, hideLabel }        on unless saved as false; the label is a heading already
 *
 * Extension points (wp.hooks): atlasAr.fields (more definitions: drawn and searchable).
 *
 * Preview scope (AR-179): the Appearance screen is fully on the map. The other screens are in
 * the map as screens (rail and search find them); their settings join the map in AR-182.
 */
(function (UI, wp) {
	'use strict';
	if (!UI || !UI.map || Object.isFrozen(UI.map)) return;
	var __ = wp.i18n.__;

	/** Groups of the side menu, in order. '' = no heading (the first items). */
	var groups = [
		{ id: '', label: '' },
		{ id: 'models', label: __('3D models', 'ar-vr-3d-model-try-on') },
		{ id: 'shop', label: __('Shop display', 'ar-vr-3d-model-try-on') },
		{ id: 'care', label: __('Look after', 'ar-vr-3d-model-try-on') },
		{ id: 'more', label: __('More', 'ar-vr-3d-model-try-on') }
	];

	/**
	 * Screens, in menu order. page: 'dashboard' = drawn by the dashboard (hash #id); href = a
	 * key of the shell's urls (another WordPress page). cap: who may open it (manage | upload).
	 */
	var screens = [
		{
			id: 'products', page: 'dashboard', group: '', icon: 'store', cap: 'manage',
			label: __('Products', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this screen, comma separated. Add the words people use in your language. */
			keywords: __('products, catalogue, get started, checklist', 'ar-vr-3d-model-try-on'),
			en: 'products woocommerce catalogue list get started checklist'
		},
		{
			id: 'setup', href: 'wizard', group: '', icon: 'check', cap: 'manage',
			// Only while the setup wizard has not been finished or skipped (the dashboard knows).
			when: function (o) { return !!(o && o.settings && o.settings.general && !o.settings.general.wizard_done); },
			label: __('Setup', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this screen, comma separated. */
			keywords: __('setup, wizard, start', 'ar-vr-3d-model-try-on'),
			en: 'setup wizard start onboarding'
		},
		{
			id: 'library', href: 'library', group: 'models', icon: 'media', cap: 'upload',
			label: __('3D Library', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this screen, comma separated. */
			keywords: __('models, files, upload, GLB, USDZ', 'ar-vr-3d-model-try-on'),
			en: '3d library models files upload glb usdz gltf media'
		},
		{
			id: 'integrations', page: 'dashboard', group: 'models', icon: 'plugins', cap: 'manage',
			label: __('Integrations', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this screen, comma separated. */
			keywords: __('cloud, AI, API key, connect', 'ar-vr-3d-model-try-on'),
			en: 'integrations atlasar cloud meshy tripo tripo3d ai api key connect optimise'
		},
		{
			id: 'placement', page: 'dashboard', group: 'shop', icon: 'layout', cap: 'manage',
			label: __('Placement', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this screen, comma separated. */
			keywords: __('where, position, gallery, button, tab, QR code, product cards', 'ar-vr-3d-model-try-on'),
			en: 'placement where position gallery button popup tab slide product page qr code cards shop category'
		},
		{
			id: 'appearance', page: 'dashboard', group: 'shop', icon: 'styles', cap: 'manage',
			label: __('Appearance', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this screen, comma separated. */
			keywords: __('look, style, design, colours', 'ar-vr-3d-model-try-on'),
			en: 'appearance look style design colour color',
			tabs: [
				{
					id: 'look', label: __('Look', 'ar-vr-3d-model-try-on'),
					sections: [
						{ id: 'background', label: __('Background', 'ar-vr-3d-model-try-on') },
						{ id: 'light', label: __('Light and movement', 'ar-vr-3d-model-try-on') },
						{ id: 'load', label: __('When the 3D view loads', 'ar-vr-3d-model-try-on') }
					]
				},
				{ id: 'view', label: __('Starting view', 'ar-vr-3d-model-try-on') },
				{ id: 'frame', label: __('Size and frame', 'ar-vr-3d-model-try-on') },
				{
					id: 'ar', label: __('AR button', 'ar-vr-3d-model-try-on'),
					sections: [
						{ id: '', label: '' },
						{ id: 'style', label: __('Your style', 'ar-vr-3d-model-try-on') }
					]
				}
			]
		},
		{
			id: 'tryon', page: 'dashboard', group: 'shop', icon: 'capturePhoto', cap: 'manage',
			label: __('Try-on', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this screen, comma separated. */
			keywords: __('try on, camera, face, glasses, caps', 'ar-vr-3d-model-try-on'),
			en: 'try on tryon virtual camera face glasses sunglasses caps hats'
		},
		{
			id: 'analytics', page: 'dashboard', group: 'care', icon: 'chartBar', cap: 'manage',
			label: __('Analytics', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this screen, comma separated. */
			keywords: __('statistics, views, reports', 'ar-vr-3d-model-try-on'),
			en: 'analytics statistics stats views counts reports'
		},
		{
			id: 'settings', page: 'dashboard', group: 'care', icon: 'settings', cap: 'manage',
			label: __('Settings', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this screen, comma separated. */
			keywords: __('post types, optimise, privacy, export, import, reset', 'ar-vr-3d-model-try-on'),
			en: 'settings post types optimise optimize privacy telemetry usage data delete export import reset tools'
		},
		{
			id: 'help', page: 'dashboard', group: 'care', icon: 'help', cap: 'manage',
			label: __('Help', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this screen, comma separated. */
			keywords: __('guides, documentation, support, shortcode, site check', 'ar-vr-3d-model-try-on'),
			en: 'help guides docs documentation support contact shortcode builder site check'
		},
		{
			id: 'plugins', href: 'plugins', group: 'care', icon: 'external', cap: 'manage',
			label: __('More plugins', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this screen, comma separated. */
			keywords: __('plugins, AtlasAiDev', 'ar-vr-3d-model-try-on'),
			en: 'more plugins atlasaidev other free'
		}
	];

	var BACKGROUNDS = ['#ffffff', '#f6f7f7', '#eef2f3', '#1d2327'];
	var BUTTON_COLORS = ['#0e6b5c', '#2271b1', '#1d2327', '#b32d2e', '#996800'];

	function lightingIsCustom(s) { return s.look.lighting === 'custom'; }

	/** Every setting of the Appearance screen (option atlas_ar_settings, group look). */
	var fields = [
		/* Look › Background */
		{
			id: 'look.background', screen: 'appearance', tab: 'look', section: 'background', control: 'swatches', colors: BACKGROUNDS, hideLabel: true,
			label: __('Background', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. Add the words people use in your language. */
			keywords: __('background, colour, white, dark', 'ar-vr-3d-model-try-on'),
			en: 'background colour color backdrop white grey dark'
		},
		/* Look › Light and movement */
		{
			id: 'look.lighting', screen: 'appearance', tab: 'look', section: 'light', control: 'select',
			label: __('Lighting', 'ar-vr-3d-model-try-on'),
			options: [
				{ value: 'neutral', label: __('Neutral studio (recommended)', 'ar-vr-3d-model-try-on') },
				{ value: 'bright', label: __('Bright', 'ar-vr-3d-model-try-on') },
				{ value: 'custom', label: __('Custom environment image', 'ar-vr-3d-model-try-on') }
			],
			/* translators: search words for this setting, comma separated. */
			keywords: __('light, environment, studio', 'ar-vr-3d-model-try-on'),
			en: 'lighting light environment studio hdr'
		},
		{
			id: 'look.environment_url', screen: 'appearance', tab: 'look', section: 'light', control: 'url',
			showIf: lightingIsCustom, needs: 'look.lighting',
			needsHint: __('It shows when Lighting is “Custom environment image”.', 'ar-vr-3d-model-try-on'),
			label: __('Environment image URL (.hdr, .jpg)', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('environment image, HDR, custom light', 'ar-vr-3d-model-try-on'),
			en: 'environment image hdr url custom lighting'
		},
		{
			id: 'look.exposure', screen: 'appearance', tab: 'look', section: 'light', control: 'range', step: 0.1,
			label: __('Brightness', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('exposure, light, dark, bright', 'ar-vr-3d-model-try-on'),
			en: 'brightness exposure light dark bright'
		},
		{
			id: 'look.shadow', screen: 'appearance', tab: 'look', section: 'light', control: 'range', step: 0.1,
			label: __('Shadow', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('shadow, ground', 'ar-vr-3d-model-try-on'),
			en: 'shadow ground floor darkness'
		},
		{
			id: 'look.auto_rotate', screen: 'appearance', tab: 'look', section: 'light', control: 'toggle',
			label: __('Turn the model slowly until the visitor touches it', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('rotate, spin, turn, motion', 'ar-vr-3d-model-try-on'),
			en: 'auto rotate rotation spin turn motion'
		},
		{
			id: 'look.zoom', screen: 'appearance', tab: 'look', section: 'light', control: 'toggle',
			label: __('Visitors can zoom', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('zoom, pinch', 'ar-vr-3d-model-try-on'),
			en: 'zoom pinch scroll closer'
		},
		/* Look › When the 3D view loads */
		{
			id: 'look.load', screen: 'appearance', tab: 'look', section: 'load', control: 'radio', hideLabel: true,
			label: __('When the 3D view loads', 'ar-vr-3d-model-try-on'),
			options: [
				{ value: 'scroll', label: __('When the view scrolls into sight — best for most shops', 'ar-vr-3d-model-try-on') },
				{ value: 'click', label: __('Only after a click on “View in 3D” — fastest pages, shows the image first', 'ar-vr-3d-model-try-on') }
			],
			/* translators: search words for this setting, comma separated. */
			keywords: __('loading, speed, fast, lazy', 'ar-vr-3d-model-try-on'),
			en: 'load loading lazy speed fast click scroll performance'
		},
		/* Starting view */
		{
			id: 'look.camera', screen: 'appearance', tab: 'view', control: 'select',
			label: __('Camera', 'ar-vr-3d-model-try-on'),
			options: [
				{ value: 'auto', label: __('As the model was made (recommended)', 'ar-vr-3d-model-try-on') },
				{ value: 'front', label: __('From the front', 'ar-vr-3d-model-try-on') },
				{ value: 'side', label: __('From the side', 'ar-vr-3d-model-try-on') },
				{ value: 'top', label: __('From above', 'ar-vr-3d-model-try-on') }
			],
			/* translators: search words for this setting, comma separated. */
			keywords: __('camera, angle, front, side, above', 'ar-vr-3d-model-try-on'),
			en: 'camera angle view front side top orbit'
		},
		{
			id: 'look.tone', screen: 'appearance', tab: 'view', control: 'select',
			label: __('Colours', 'ar-vr-3d-model-try-on'),
			options: [
				{ value: 'neutral', label: __('True to life (recommended)', 'ar-vr-3d-model-try-on') },
				{ value: 'aces', label: __('More contrast', 'ar-vr-3d-model-try-on') },
				{ value: 'agx', label: __('Softer, for very bright products', 'ar-vr-3d-model-try-on') }
			],
			/* translators: search words for this setting, comma separated. */
			keywords: __('colours, contrast, tone', 'ar-vr-3d-model-try-on'),
			en: 'colours colors tone mapping contrast'
		},
		{
			id: 'look.skybox', screen: 'appearance', tab: 'view', control: 'toggle',
			showIf: lightingIsCustom, needs: 'look.lighting',
			needsHint: __('It shows when Lighting is “Custom environment image”.', 'ar-vr-3d-model-try-on'),
			label: __('Show the environment image behind the model', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('environment image, behind, sky', 'ar-vr-3d-model-try-on'),
			en: 'skybox environment image behind background'
		},
		{
			id: 'look.prompt', screen: 'appearance', tab: 'view', control: 'toggle', onByDefault: true,
			label: __('Show a “drag to turn” hint until the visitor touches the model', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('hint, drag, prompt', 'ar-vr-3d-model-try-on'),
			en: 'hint prompt drag turn interaction'
		},
		/* Size and frame */
		{
			id: 'look.height', screen: 'appearance', tab: 'frame', control: 'range', step: 10,
			label: __('Height on computers (px)', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('height, size, desktop', 'ar-vr-3d-model-try-on'),
			en: 'height size desktop computer tall'
		},
		{
			id: 'look.mobile_height', screen: 'appearance', tab: 'frame', control: 'range', step: 10,
			label: __('Height on phones (px)', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('height, size, phone, mobile', 'ar-vr-3d-model-try-on'),
			en: 'height size phone mobile'
		},
		{
			id: 'look.max_width', screen: 'appearance', tab: 'frame', control: 'number',
			label: __('Maximum width (px)', 'ar-vr-3d-model-try-on'),
			help: __('0 = as wide as the space it is in.', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('width, size', 'ar-vr-3d-model-try-on'),
			en: 'width maximum max size'
		},
		{
			id: 'look.align', screen: 'appearance', tab: 'frame', control: 'select',
			showIf: function (s) { return Number(s.look.max_width) > 0; }, needs: 'look.max_width',
			needsHint: __('It shows when a maximum width is set.', 'ar-vr-3d-model-try-on'),
			label: __('Position', 'ar-vr-3d-model-try-on'),
			options: [
				{ value: 'left', label: __('Left', 'ar-vr-3d-model-try-on') },
				{ value: 'center', label: __('Centre', 'ar-vr-3d-model-try-on') },
				{ value: 'right', label: __('Right', 'ar-vr-3d-model-try-on') }
			],
			/* translators: search words for this setting, comma separated. */
			keywords: __('align, centre, left, right', 'ar-vr-3d-model-try-on'),
			en: 'position align alignment centre center left right'
		},
		{
			id: 'look.border_width', screen: 'appearance', tab: 'frame', control: 'range',
			label: __('Border (px)', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('border, frame, outline', 'ar-vr-3d-model-try-on'),
			en: 'border width frame outline line'
		},
		{
			id: 'look.border_color', screen: 'appearance', tab: 'frame', control: 'swatches', colors: ['#dcdcde', '#c3c4c7', '#1d2327', '#0e6b5c', '#2271b1'],
			showIf: function (s) { return Number(s.look.border_width) > 0; }, needs: 'look.border_width',
			needsHint: __('It shows when the border is above 0.', 'ar-vr-3d-model-try-on'),
			label: __('Border colour', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('border, colour, frame', 'ar-vr-3d-model-try-on'),
			en: 'border color colour frame outline'
		},
		{
			id: 'look.radius', screen: 'appearance', tab: 'frame', control: 'range',
			label: __('Rounded corners (px)', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('corners, round, radius', 'ar-vr-3d-model-try-on'),
			en: 'rounded corners radius round'
		},
		{
			id: 'look.frame_shadow', screen: 'appearance', tab: 'frame', control: 'select',
			label: __('Shadow around the view', 'ar-vr-3d-model-try-on'),
			options: [
				{ value: 'none', label: __('None', 'ar-vr-3d-model-try-on') },
				{ value: 'soft', label: __('Soft', 'ar-vr-3d-model-try-on') },
				{ value: 'strong', label: __('Strong', 'ar-vr-3d-model-try-on') }
			],
			/* translators: search words for this setting, comma separated. */
			keywords: __('shadow, box, frame', 'ar-vr-3d-model-try-on'),
			en: 'shadow around frame box drop'
		},
		/* AR button */
		{
			id: 'look.ar', screen: 'appearance', tab: 'ar', control: 'toggle', onByDefault: true,
			label: __('Show the button (shoppers place the product in their room)', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('AR, augmented reality, view in your room', 'ar-vr-3d-model-try-on'),
			en: 'ar augmented reality view in your room button show'
		},
		{
			id: 'look.xr_environment', screen: 'appearance', tab: 'ar', control: 'toggle', onByDefault: true,
			showIf: function (s) { return s.look.ar !== false; }, needs: 'look.ar',
			needsHint: __('It shows when the AR button is on.', 'ar-vr-3d-model-try-on'),
			label: __('In AR, light the model like the room (Android)', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('AR lighting, room, Android', 'ar-vr-3d-model-try-on'),
			en: 'ar lighting room android webxr environment'
		},
		{
			id: 'look.ar_button', screen: 'appearance', tab: 'ar', control: 'radio',
			label: __('Button style', 'ar-vr-3d-model-try-on'),
			options: [
				{ value: 'default', label: __('Standard', 'ar-vr-3d-model-try-on') },
				{ value: 'custom', label: __('Your style', 'ar-vr-3d-model-try-on') }
			],
			/* translators: search words for this setting, comma separated. */
			keywords: __('AR button, style', 'ar-vr-3d-model-try-on'),
			en: 'ar button style standard custom'
		},
		{
			id: 'look.ar_text', screen: 'appearance', tab: 'ar', section: 'style', control: 'text',
			showIf: function (s) { return s.look.ar_button === 'custom'; }, needs: 'look.ar_button',
			needsHint: __('It shows when the button style is “Your style”.', 'ar-vr-3d-model-try-on'),
			label: __('Button text', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('AR button, text, label', 'ar-vr-3d-model-try-on'),
			en: 'ar button text label words'
		},
		{
			id: 'look.ar_color', screen: 'appearance', tab: 'ar', section: 'style', control: 'swatches', colors: BUTTON_COLORS,
			showIf: function (s) { return s.look.ar_button === 'custom'; }, needs: 'look.ar_button',
			needsHint: __('It shows when the button style is “Your style”.', 'ar-vr-3d-model-try-on'),
			label: __('Button colour', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('AR button, colour', 'ar-vr-3d-model-try-on'),
			en: 'ar button colour color background'
		},
		{
			id: 'look.ar_text_color', screen: 'appearance', tab: 'ar', section: 'style', control: 'swatches', colors: ['#ffffff', '#1d2327'],
			showIf: function (s) { return s.look.ar_button === 'custom'; }, needs: 'look.ar_button',
			needsHint: __('It shows when the button style is “Your style”.', 'ar-vr-3d-model-try-on'),
			label: __('Button text colour', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('AR button, text colour', 'ar-vr-3d-model-try-on'),
			en: 'ar button text colour color'
		}
	];

	/**
	 * Actions the search can open. An action opens its place (a screen, or another page); it
	 * never runs the action itself.
	 */
	var actions = [
		{ id: 'action.wizard', href: 'wizard', cap: 'manage', label: __('Run the setup wizard', 'ar-vr-3d-model-try-on'), en: 'setup wizard start onboarding again' },
		{ id: 'action.upload', href: 'library', cap: 'upload', label: __('Upload 3D files', 'ar-vr-3d-model-try-on'), en: 'upload add glb usdz gltf model file' },
		{ id: 'action.flat', screen: 'products', cap: 'manage', label: __('Make 3D from product photos', 'ar-vr-3d-model-try-on'), en: 'photo image picture flat wall art poster canvas rug bulk 3d from photo' },
		{ id: 'action.cloud', screen: 'integrations', cap: 'manage', label: __('Connect AtlasAR Cloud', 'ar-vr-3d-model-try-on'), en: 'cloud connect account api key optimise' },
		{ id: 'action.export', screen: 'settings', cap: 'manage', label: __('Export settings', 'ar-vr-3d-model-try-on'), en: 'export backup download settings json' },
		{ id: 'action.import', screen: 'settings', cap: 'manage', label: __('Import settings', 'ar-vr-3d-model-try-on'), en: 'import restore upload settings json' },
		{ id: 'action.reset', screen: 'settings', cap: 'manage', label: __('Reset to defaults', 'ar-vr-3d-model-try-on'), en: 'reset defaults restore factory' }
	];

	var ID = /^[a-z0-9_-]+(\.[a-z0-9_-]+)*$/i;

	/** A definition from the atlasAr.fields filter is used only when it has the parts the screens and the search need. */
	function isField(def) {
		return !!def && typeof def === 'object' && typeof def.id === 'string' && ID.test(def.id) &&
			typeof def.label === 'string' && def.label !== '' && typeof def.screen === 'string' && typeof def.control === 'string';
	}

	/** Every field definition: Free's, plus those an add-on adds with the atlasAr.fields filter. */
	function allFields() {
		var list = UI.filters('atlasAr.fields', fields.slice());
		return Array.isArray(list) ? list.filter(isField) : fields.slice();
	}

	function field(id) {
		return allFields().filter(function (f) { return f.id === id; })[0] || null;
	}

	function screen(id) {
		return screens.filter(function (s) { return s.id === id; })[0] || null;
	}

	/** The fields of a screen (and tab, and section), in map order. */
	function fieldsAt(where) {
		where = where || {};
		return allFields().filter(function (f) {
			return (!where.screen || f.screen === where.screen) && (!where.tab || (f.tab || '') === where.tab) && (where.section === undefined || (f.section || '') === where.section);
		});
	}

	/** The section headings of a tab, plus any section an add-on's fields use (at the end). */
	function sectionsOf(where) {
		var s = screen(where.screen);
		var tab = s && s.tabs ? s.tabs.filter(function (t) { return t.id === where.tab; })[0] : null;
		var list = tab && tab.sections ? tab.sections.slice() : [{ id: '', label: '' }];
		fieldsAt({ screen: where.screen, tab: where.tab }).forEach(function (f) {
			var id = f.section || '';
			if (!list.some(function (x) { return x.id === id; })) list.push({ id: id, label: '' });
		});
		return list;
	}

	Object.assign(UI.map, {
		groups: groups, screens: screens, fields: fields, actions: actions,
		allFields: allFields, field: field, screen: screen, fieldsAt: fieldsAt, sectionsOf: sectionsOf
	});
	Object.freeze(UI.map);
})(window.AtlasARAdminUI, window.wp);
