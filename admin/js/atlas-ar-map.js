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
 * AR-182: every setting of option atlas_ar_settings that has a control is here (47: Placement 4,
 * Product cards 6, Appearance 26, Try-on 5, General 6). productFields are the settings each
 * product has in its AtlasAR panel: the search finds them and says where they are.
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
			en: 'placement where position gallery button popup tab slide product page qr code cards shop category',
			tabs: [
				{
					id: 'page', label: __('Product page', 'ar-vr-3d-model-try-on'),
					sections: [
						{ id: '', label: __('Where the 3D view appears', 'ar-vr-3d-model-try-on') },
						{ id: 'also', label: __('Also', 'ar-vr-3d-model-try-on') }
					]
				},
				{
					id: 'cards', label: __('Product cards', 'ar-vr-3d-model-try-on'),
					sections: [
						{ id: '', label: __('Button on the cards', 'ar-vr-3d-model-try-on') },
						{ id: 'picture', label: __('Card picture', 'ar-vr-3d-model-try-on') }
					]
				}
			]
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
			en: 'try on tryon virtual camera face glasses sunglasses caps hats',
			// One pane, four groups (no tabs).
			sections: [
				{ id: '', label: '' },
				{ id: 'types', label: __('Product types', 'ar-vr-3d-model-try-on') },
				{ id: 'shown', label: __('What shoppers see', 'ar-vr-3d-model-try-on') },
				{ id: 'files', label: __('Face-tracking files', 'ar-vr-3d-model-try-on') }
			]
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
			en: 'settings post types optimise optimize privacy telemetry usage data delete export import reset tools',
			tabs: [
				{
					id: 'general', label: __('General', 'ar-vr-3d-model-try-on'),
					sections: [
						{ id: '', label: __('Show the AtlasAR panel on', 'ar-vr-3d-model-try-on') },
						{ id: 'optimise', label: __('Optimisation', 'ar-vr-3d-model-try-on') }
					]
				},
				{ id: 'privacy', label: __('Privacy', 'ar-vr-3d-model-try-on') },
				{ id: 'tools', label: __('Tools', 'ar-vr-3d-model-try-on') }
			]
		},
		{
			id: 'help', page: 'dashboard', group: 'care', icon: 'help', cap: 'manage',
			label: __('Help', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this screen, comma separated. */
			keywords: __('guides, documentation, support, shortcode, site check', 'ar-vr-3d-model-try-on'),
			en: 'help guides docs documentation support contact shortcode builder site check',
			tabs: [
				{ id: 'guides', label: __('Guides', 'ar-vr-3d-model-try-on') },
				{ id: 'shortcode', label: __('Shortcode builder', 'ar-vr-3d-model-try-on') },
				{ id: 'check', label: __('Site check', 'ar-vr-3d-model-try-on') }
			]
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


	/** AR-182: the placements (Placement › Product page; the wizard shows the first four). */
	var PLACEMENTS = [
		{ value: 'gallery', title: __('In the gallery, image first', 'ar-vr-3d-model-try-on'), text: __('A 3D button on the main product image switches to the 3D view.', 'ar-vr-3d-model-try-on'), badge: __('Recommended', 'ar-vr-3d-model-try-on') },
		{ value: 'gallery3d', title: __('In the gallery, 3D first', 'ar-vr-3d-model-try-on'), text: __('The 3D view replaces the main image; the image is one click away.', 'ar-vr-3d-model-try-on') },
		{ value: 'button', title: __('A button that opens a popup', 'ar-vr-3d-model-try-on'), text: __('Keeps the gallery as it is; the 3D view opens in a window.', 'ar-vr-3d-model-try-on') },
		{ value: 'tab', title: __('Only in a product tab', 'ar-vr-3d-model-try-on'), text: __('The 3D view sits with the description and reviews.', 'ar-vr-3d-model-try-on') },
		{ value: 'slide', title: __('As a gallery slide', 'ar-vr-3d-model-try-on'), text: __('The 3D view is one more slide among the product images.', 'ar-vr-3d-model-try-on') }
	];
	function cardsButtonOn(s) { return !!s.cards.button; }
	var cardsHint = __('It shows when the card button is on.', 'ar-vr-3d-model-try-on');
	var blockTheme = function () { return !!(UI.boot && UI.boot.blockTheme); };

	/** AR-182: Placement, Product cards (AR-176), Try-on and General. */
	fields = fields.concat([
		/* Placement › Product page */
		{
			id: 'placement.mode', screen: 'placement', tab: 'page', control: 'choice', options: PLACEMENTS, hideLabel: true,
			label: __('Placement', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. Add the words people use in your language. */
			keywords: __('where, gallery, popup, tab, slide', 'ar-vr-3d-model-try-on'),
			en: 'placement where position gallery image first 3d first button popup window tab slide'
		},
		{
			id: 'placement.button_position', screen: 'placement', tab: 'page', control: 'select',
			showIf: function (s) { return s.placement.mode === 'button'; }, needs: 'placement.mode',
			needsHint: __('It shows when the placement is “A button that opens a popup”.', 'ar-vr-3d-model-try-on'),
			label: __('Show the button', 'ar-vr-3d-model-try-on'),
			options: [
				{ value: 'after_cart', label: __('After the “Add to cart” button', 'ar-vr-3d-model-try-on') },
				{ value: 'before_cart', label: __('Before the “Add to cart” button', 'ar-vr-3d-model-try-on') },
				{ value: 'after_summary', label: __('After the product summary', 'ar-vr-3d-model-try-on') },
				{ value: 'under_images', label: __('Under the product images', 'ar-vr-3d-model-try-on') }
			],
			/* translators: search words for this setting, comma separated. */
			keywords: __('button position, add to cart', 'ar-vr-3d-model-try-on'),
			en: 'button position add to cart summary under images popup'
		},
		{
			id: 'placement.product_tab', screen: 'placement', tab: 'page', section: 'also', control: 'toggle',
			showIf: function (s) { return s.placement.mode !== 'tab'; }, needs: 'placement.mode',
			needsHint: __('It shows when the placement is not “Only in a product tab”.', 'ar-vr-3d-model-try-on'),
			label: __('Add a “3D view” tab to the product tabs', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('product tab, 3D view tab', 'ar-vr-3d-model-try-on'),
			en: 'product tab tabs 3d view description reviews'
		},
		{
			id: 'placement.qr', screen: 'placement', tab: 'page', section: 'also', control: 'toggle',
			label: __('On computers, show a QR code to open AR on a phone', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('QR code, phone, computer', 'ar-vr-3d-model-try-on'),
			en: 'qr code phone mobile computer desktop scan ar'
		},
		/* Placement › Product cards (AR-176) */
		{
			id: 'cards.button', screen: 'placement', tab: 'cards', control: 'toggle',
			label: __('Show a “View in 3D and AR” button on product cards', 'ar-vr-3d-model-try-on'),
			help: __('It opens the 3D view in a window, with AR on phones. Glasses and caps get the “Try it on” button instead; wall art opens on the wall.', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('product cards, shop page, category, button', 'ar-vr-3d-model-try-on'),
			en: 'product cards shop category archive loop button view in 3d and ar'
		},
		{
			id: 'cards.button_text', screen: 'placement', tab: 'cards', control: 'text', showIf: cardsButtonOn, needs: 'cards.button', needsHint: cardsHint,
			label: __('Button text', 'ar-vr-3d-model-try-on'),
			help: __('Try-on products use the button text from the Try-on page.', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('card button text, label', 'ar-vr-3d-model-try-on'),
			en: 'card button text label words'
		},
		{
			id: 'cards.button_position', screen: 'placement', tab: 'cards', control: 'select', showIf: cardsButtonOn, needs: 'cards.button', needsHint: cardsHint,
			label: __('Where in the card', 'ar-vr-3d-model-try-on'),
			options: [
				{ value: 'after', label: __('After the card’s buttons (“Add to cart”)', 'ar-vr-3d-model-try-on') },
				{ value: 'before', label: __('Before them', 'ar-vr-3d-model-try-on') }
			],
			// Without a block theme there is no style choice: say how the button looks.
			note: function () { return blockTheme() ? '' : __('The button looks like your theme’s “Add to cart” button.', 'ar-vr-3d-model-try-on'); },
			/* translators: search words for this setting, comma separated. */
			keywords: __('card button position', 'ar-vr-3d-model-try-on'),
			en: 'card button position before after add to cart'
		},
		{
			id: 'cards.button_style', screen: 'placement', tab: 'cards', control: 'select',
			showIf: function (s) { return !!s.cards.button && blockTheme(); }, needs: 'cards.button',
			needsHint: __('It shows when the card button is on, with a block theme.', 'ar-vr-3d-model-try-on'),
			label: __('Style', 'ar-vr-3d-model-try-on'),
			options: [
				{ value: 'outline', label: __('Outline (your theme’s secondary button)', 'ar-vr-3d-model-try-on') },
				{ value: 'fill', label: __('Filled (your theme’s main button)', 'ar-vr-3d-model-try-on') }
			],
			help: __('The button follows your theme’s button styles.', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('card button style, outline, filled', 'ar-vr-3d-model-try-on'),
			en: 'card button style outline filled fill block theme'
		},
		{
			id: 'cards.media', screen: 'placement', tab: 'cards', section: 'picture', control: 'select',
			label: __('What the card shows', 'ar-vr-3d-model-try-on'),
			options: [
				{ value: 'image', label: __('The product image', 'ar-vr-3d-model-try-on') },
				{ value: '3d', label: __('The 3D view first (its poster; the model loads when a shopper clicks)', 'ar-vr-3d-model-try-on') }
			],
			help: __('Pages stay fast: no 3D model is downloaded before a shopper interacts.', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('card picture, image, poster', 'ar-vr-3d-model-try-on'),
			en: 'card picture image media poster 3d first'
		},
		{
			id: 'cards.badge', screen: 'placement', tab: 'cards', section: 'picture', control: 'toggle',
			showIf: function (s) { return s.cards.media === 'image'; }, needs: 'cards.media',
			needsHint: __('It shows when the card shows the product image.', 'ar-vr-3d-model-try-on'),
			label: __('A small 3D badge on the image that opens the 3D view or the try-on', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('badge, 3D badge, icon', 'ar-vr-3d-model-try-on'),
			en: 'badge 3d icon card image'
		},
		/* Try-on */
		{
			id: 'tryon.enabled', screen: 'tryon', control: 'toggle',
			label: __('Show the “Try it on” button on try-on products', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('try on, turn on, button', 'ar-vr-3d-model-try-on'),
			en: 'try on tryon enable turn on button camera'
		},
		{
			id: 'tryon.label', screen: 'tryon', section: 'shown', control: 'text',
			label: __('Button text', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('try-on button text, label', 'ar-vr-3d-model-try-on'),
			en: 'try on button text label'
		},
		{
			id: 'tryon.consent', screen: 'tryon', section: 'shown', control: 'textarea', rows: 3,
			label: __('Camera message (shown before the camera starts)', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('camera message, consent, privacy', 'ar-vr-3d-model-try-on'),
			en: 'camera message consent permission privacy'
		},
		{
			id: 'tryon.snapshot', screen: 'tryon', section: 'shown', control: 'toggle',
			label: __('Let shoppers save a photo of themselves wearing it', 'ar-vr-3d-model-try-on'),
			help: __('Saved photos show a small “Powered by AtlasAR” label.', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('photo, snapshot, picture, save', 'ar-vr-3d-model-try-on'),
			en: 'photo snapshot picture save download selfie'
		},
		{
			id: 'tryon.tracker', screen: 'tryon', section: 'files', control: 'radio', hideLabel: true,
			label: __('Load the face-tracking files', 'ar-vr-3d-model-try-on'),
			options: [
				{ value: 'cdn', label: __('From the public CDN (default) — jsDelivr and Google; listed under External services in the readme', 'ar-vr-3d-model-try-on') },
				{ value: 'self', label: __('From this site — downloaded once into your uploads folder; no third-party request', 'ar-vr-3d-model-try-on') }
			],
			/* translators: search words for this setting, comma separated. */
			keywords: __('face tracking files, CDN, download, this site', 'ar-vr-3d-model-try-on'),
			en: 'face tracking files tracker cdn jsdelivr google self host download local mediapipe'
		},
		/* Settings › General */
		{
			id: 'general.post_types', screen: 'settings', tab: 'general', control: 'checklist', hideLabel: true, fallback: ['product'],
			label: __('Show the AtlasAR panel on', 'ar-vr-3d-model-try-on'),
			options: function () { return ((UI.boot && UI.boot.postTypes) || []).map(function (t) { return { value: t.name, label: t.label }; }); },
			/* translators: search words for this setting, comma separated. */
			keywords: __('post types, products, posts, pages', 'ar-vr-3d-model-try-on'),
			en: 'post types products posts pages panel where'
		},
		{
			id: 'general.auto_optimise', screen: 'settings', tab: 'general', section: 'optimise', control: 'toggle',
			label: __('Optimise every new model when it is added', 'ar-vr-3d-model-try-on'),
			help: __('Smaller files load faster. Runs in your browser when you upload a GLB to the 3D Library (files over 0.5 MB); the original is kept and can be restored.', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('optimise, compress, smaller files', 'ar-vr-3d-model-try-on'),
			en: 'optimise optimize compress compression smaller files automatic upload'
		},
		{
			id: 'general.optimise_level', screen: 'settings', tab: 'general', section: 'optimise', control: 'select',
			// The levels come from the 3D Library script (AR-162), the same list it uses.
			showIf: function () { return !!(window.AtlasARLibrary && window.AtlasARLibrary.levels); },
			label: __('Optimisation level', 'ar-vr-3d-model-try-on'),
			options: function () { return ((window.AtlasARLibrary && window.AtlasARLibrary.levels) || []).map(function (l) { return { value: l.value, label: l.label }; }); },
			help: function (s) {
				var level = s.general.optimise_level || 'high';
				return (((window.AtlasARLibrary && window.AtlasARLibrary.levels) || []).filter(function (l) { return l.value === level; })[0] || {}).text;
			},
			/* translators: search words for this setting, comma separated. */
			keywords: __('optimisation level, quality, compression', 'ar-vr-3d-model-try-on'),
			en: 'optimisation optimization level quality compression maximum high balanced low'
		},
		/* Settings › Privacy */
		{
			id: 'general.stats', screen: 'settings', tab: 'privacy', control: 'toggle', onByDefault: true,
			label: __('Count how shoppers use the 3D view (Analytics)', 'ar-vr-3d-model-try-on'),
			help: __('Daily totals per product, kept on this site: 3D views, AR, try-on. No cookies and no personal data; nothing is sent to us or anyone else.', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('analytics, statistics, counting', 'ar-vr-3d-model-try-on'),
			en: 'analytics statistics stats count counting views tracking shoppers'
		},
		{
			id: 'general.telemetry', screen: 'settings', tab: 'privacy', control: 'toggle',
			label: __('Share usage data with AtlasAiDev to help improve AtlasAR', 'ar-vr-3d-model-try-on'),
			help: __('Off unless you turn it on. Sent once a week: this site’s address and name, the admin’s name and email, the IP address, WordPress, PHP and server versions, active plugins and the theme. Never your products, files or visitors.', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('usage data, telemetry, share', 'ar-vr-3d-model-try-on'),
			en: 'usage data telemetry share tracking improve'
		},
		{
			id: 'general.remove_data', screen: 'settings', tab: 'privacy', control: 'toggle',
			label: __('Delete all AtlasAR settings, 3D Library models and product data when the plugin is deleted', 'ar-vr-3d-model-try-on'),
			/* translators: search words for this setting, comma separated. */
			keywords: __('delete data, uninstall, remove', 'ar-vr-3d-model-try-on'),
			en: 'delete remove data uninstall clean up'
		}
	]);

	/**
	 * AR-182: the settings each product has in its AtlasAR panel (post meta, edited on the product).
	 * Search entries only: a pick opens Products and says where to find the setting.
	 */
	var PANEL_MODEL = __('3D model', 'ar-vr-3d-model-try-on'), PANEL_DISPLAY = __('Display', 'ar-vr-3d-model-try-on'), PANEL_TRYON = __('Try-on', 'ar-vr-3d-model-try-on');
	var productFields = [
		{ id: 'product.model', panelTab: PANEL_MODEL, label: __('A product’s 3D model', 'ar-vr-3d-model-try-on'), en: 'product model glb file add change remove' },
		{ id: 'product.use_site', panelTab: PANEL_DISPLAY, label: __('Use the site settings (Appearance)', 'ar-vr-3d-model-try-on'), en: 'product use site settings own look' },
		{ id: 'product.background', panelTab: PANEL_DISPLAY, label: __('A product’s own background', 'ar-vr-3d-model-try-on'), en: 'product background colour color' },
		{ id: 'product.placement', panelTab: PANEL_DISPLAY, label: __('Where one product shows its 3D view', 'ar-vr-3d-model-try-on'), en: 'product placement show it gallery button tab slide' },
		{ id: 'product.ar_placement', panelTab: PANEL_DISPLAY, label: __('AR placement (floor or wall)', 'ar-vr-3d-model-try-on'), en: 'product ar placement floor table wall' },
		{ id: 'product.ar_scale', panelTab: PANEL_DISPLAY, label: __('Shoppers can change the size in AR', 'ar-vr-3d-model-try-on'), en: 'product ar scale size resize real size' },
		{ id: 'product.height', panelTab: PANEL_DISPLAY, label: __('Height of a product’s 3D view', 'ar-vr-3d-model-try-on'), en: 'product height size view' },
		{ id: 'product.ar_text', panelTab: PANEL_DISPLAY, label: __('A product’s AR button text', 'ar-vr-3d-model-try-on'), en: 'product ar button text label' },
		{ id: 'product.load', panelTab: PANEL_DISPLAY, label: __('When a product’s 3D view loads', 'ar-vr-3d-model-try-on'), en: 'product load loading click scroll' },
		{ id: 'product.tryon', panelTab: PANEL_TRYON, label: __('Can shoppers try this product on?', 'ar-vr-3d-model-try-on'), en: 'product try on glasses cap hat type' },
		{ id: 'product.tryon_viewer', panelTab: PANEL_TRYON, label: __('Also show the 3D view on a try-on product', 'ar-vr-3d-model-try-on'), en: 'product try on 3d view ar button also' },
		{ id: 'product.tryon_image', panelTab: PANEL_TRYON, label: __('Try-on picture of a product', 'ar-vr-3d-model-try-on'), en: 'product try on picture image png photo' }
	].map(function (f) {
		return Object.assign({ kind: 'product', screen: 'products', control: 'none' }, f, {
			/* translators: %s: a tab of the product's AtlasAR panel, e.g. "Display". */
			where: wp.i18n.sprintf(__('Each product › AtlasAR panel › %s', 'ar-vr-3d-model-try-on'), f.panelTab)
		});
	});

	/**
	 * Actions the search can open. An action opens its place (a screen, or another page); it
	 * never runs the action itself.
	 */
	var actions = [
		{ id: 'action.wizard', href: 'wizard', cap: 'manage', label: __('Run the setup wizard', 'ar-vr-3d-model-try-on'), en: 'setup wizard start onboarding again' },
		{ id: 'action.shortcode', screen: 'help', tab: 'shortcode', target: 'help.shortcode', cap: 'manage', label: __('Make a shortcode', 'ar-vr-3d-model-try-on'), en: 'shortcode atlas_ar embed page post builder elementor' },
		{ id: 'action.upload', href: 'library', cap: 'upload', label: __('Upload 3D files', 'ar-vr-3d-model-try-on'), en: 'upload add glb usdz gltf model file' },
		{ id: 'action.flat', screen: 'products', target: 'action.flat', cap: 'manage', label: __('Make 3D from product photos', 'ar-vr-3d-model-try-on'), en: 'photo image picture flat wall art poster canvas rug bulk 3d from photo' },
		{ id: 'action.cloud', screen: 'integrations', target: 'card.cloud', cap: 'manage', label: __('Connect AtlasAR Cloud', 'ar-vr-3d-model-try-on'), en: 'cloud connect account api key optimise' },
		{ id: 'action.export', screen: 'settings', tab: 'tools', target: 'action.export', cap: 'manage', label: __('Export settings', 'ar-vr-3d-model-try-on'), en: 'export backup download settings json' },
		{ id: 'action.import', screen: 'settings', tab: 'tools', target: 'action.import', cap: 'manage', label: __('Import settings', 'ar-vr-3d-model-try-on'), en: 'import restore upload settings json' },
		{ id: 'action.reset', screen: 'settings', tab: 'tools', target: 'action.reset', cap: 'manage', label: __('Reset to defaults', 'ar-vr-3d-model-try-on'), en: 'reset defaults restore factory' }
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
		var own = tab ? tab.sections : (s && !s.tabs ? s.sections : null);
		var list = own ? own.slice() : [{ id: '', label: '' }];
		fieldsAt({ screen: where.screen, tab: where.tab }).forEach(function (f) {
			var id = f.section || '';
			if (!list.some(function (x) { return x.id === id; })) list.push({ id: id, label: '' });
		});
		return list;
	}

	Object.assign(UI.map, {
		groups: groups, screens: screens, fields: fields, actions: actions, productFields: productFields, placements: PLACEMENTS,
		allFields: allFields, field: field, screen: screen, fieldsAt: fieldsAt, sectionsOf: sectionsOf
	});
	Object.freeze(UI.map);
})(window.AtlasARAdminUI, window.wp);
