(function () {
    'use strict';

    var __ = wp.i18n.__;

    var atlasPlugins = [
        {
            name: 'Text To Speech TTS \u2013 AtlasVoice',
            slug: 'text-to-audio',
            basename: 'text-to-audio/text-to-audio.php',
            learnMoreUrl: 'https://atlasaidev.com/plugins/text-to-speech-pro/pricing/',
            description: __('The most user-friendly Text-to-Speech accessibility plugin for WordPress. Automatically adds an audio player with no API required.', 'text-to-audio'),
            features: [
                __('Unlimited text-to-speech conversion', 'text-to-audio'),
                __('51+ languages, 20-300+ voices', 'text-to-audio'),
                __('Customizable player design', 'text-to-audio'),
                __('Shortcode support with flexible attributes', 'text-to-audio'),
                __('Custom Post Type & ACF compatibility', 'text-to-audio'),
                __('No external API required (browser SpeechSynthesis)', 'text-to-audio'),
                __('Multilingual support (WPML, GTranslate)', 'text-to-audio'),
                __('Analytics & engagement tracking', 'text-to-audio'),
            ],
        },
        {
            name: '3D Model Viewer \u2013 AtlasAR',
            slug: 'ar-vr-3d-model-try-on',
            basename: 'ar-vr-3d-model-try-on/developer_flavor_flavor.php',
            learnMoreUrl: 'https://wpaugmentedreality.com/3d-viewer-3d-model-viewer-augmented-reality-atlasar-pricing/',
            description: __('Display interactive 3D models and augmented reality on your WordPress & WooCommerce site for enhanced product visualization.', 'text-to-audio'),
            features: [
                __('Interactive 3D model display', 'text-to-audio'),
                __('Augmented Reality (AR) support', 'text-to-audio'),
                __('WordPress & WooCommerce integration', 'text-to-audio'),
                __('Mobile-optimized viewing', 'text-to-audio'),
                __('Customizable display options', 'text-to-audio'),
                __('Reduces return rates with realistic visualization', 'text-to-audio'),
                __('Easy product page embedding', 'text-to-audio'),
            ],
        },
        {
            name: 'AI Workflow Automation \u2013 AtlasAgent',
            slug: 'ai-workflow-automation-ai-agent-hub',
            basename: 'ai-workflow-automation-ai-agent-hub/ai-workflow-automation-ai-agent-hub.php',
            learnMoreUrl: 'https://wordpress.org/plugins/ai-workflow-automation-ai-agent-hub/',
            description: __('Transform WordPress into an AI-powered control center with 70+ abilities, MCP server support, and workflow builder.', 'text-to-audio'),
            features: [
                __('70+ abilities across 9 modules', 'text-to-audio'),
                __('Built-in MCP Server (JSON-RPC 2.0)', 'text-to-audio'),
                __('JWT authentication', 'text-to-audio'),
                __('Drag-and-drop workflow builder', 'text-to-audio'),
                __('Multi-provider AI support (OpenAI, Gemini, Claude)', 'text-to-audio'),
                __('WooCommerce AI Store Manager', 'text-to-audio'),
                __('Post editor AI integration', 'text-to-audio'),
            ],
        },
    ];

    /**
     * Check if a plugin slug is in the active list.
     */
    function isPluginActive(slug) {
        return typeof atlasPluginsData !== 'undefined'
            && atlasPluginsData.active_plugins
            && atlasPluginsData.active_plugins.indexOf(slug) !== -1;
    }

    /**
     * Check if a plugin slug is in the installed list.
     */
    function isPluginInstalled(slug) {
        return typeof atlasPluginsData !== 'undefined'
            && atlasPluginsData.installed_plugins
            && atlasPluginsData.installed_plugins.indexOf(slug) !== -1;
    }

    function injectStyles() {
        if (document.getElementById('atlas-plugins-styles')) {
            return;
        }
        var style = document.createElement('style');
        style.id = 'atlas-plugins-styles';
        style.textContent = [
            '.atlas_plugins_wrap { max-width: 1200px; padding: 20px 20px 20px 0; }',

            '.atlas_plugins_header { margin-bottom: 8px; }',
            '.atlas_plugins_header h2 { font-size: 22px; font-weight: 600; color: #1d2327; margin: 0 0 4px 0; }',
            '.atlas_plugins_header p { font-size: 14px; color: #50575e; margin: 0; }',

            '.atlas_plugins_grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px; padding: 24px 0; }',

            '.atlas_plugins_card { background: #fff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 24px; display: flex; flex-direction: column; transition: box-shadow 0.2s ease; }',
            '.atlas_plugins_card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }',

            '.atlas_plugins_name { font-size: 18px; font-weight: 600; color: #1d2327; margin: 0 0 8px 0; line-height: 1.4; }',

            '.atlas_plugins_description { font-size: 14px; color: #50575e; margin: 0 0 16px 0; line-height: 1.5; }',

            '.atlas_plugins_accordion { border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 16px; overflow: hidden; }',
            '.atlas_plugins_accordion_header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #f6f7f7; cursor: pointer; border: none; width: 100%; font-size: 14px; font-weight: 500; color: #1d2327; text-align: left; }',
            '.atlas_plugins_accordion_header:hover { background: #f0f0f1; }',
            '.atlas_plugins_accordion_icon { transition: transform 0.2s ease; }',
            '.atlas_plugins_accordion_icon.atlas_plugins_open { transform: rotate(180deg); }',
            '.atlas_plugins_accordion_body { max-height: 0; overflow: hidden; transition: max-height 0.3s ease; }',
            '.atlas_plugins_accordion_body.atlas_plugins_expanded { max-height: 500px; }',

            '.atlas_plugins_features_list { list-style: none; margin: 0; padding: 12px 16px; }',
            '.atlas_plugins_features_list li { padding: 6px 0; font-size: 13px; color: #50575e; border-bottom: 1px solid #f0f0f1; display: flex; align-items: flex-start; gap: 8px; }',
            '.atlas_plugins_features_list li:last-child { border-bottom: none; }',
            '.atlas_plugins_feature_check { color: #00a32a; flex-shrink: 0; font-weight: bold; }',

            '.atlas_plugins_actions { display: flex; align-items: center; gap: 12px; margin-top: auto; padding-top: 8px; flex-wrap: wrap; }',

            '.atlas_plugins_btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 20px; color: #fff; border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; transition: background 0.2s ease; text-decoration: none; }',
            '.atlas_plugins_btn:hover { opacity: 0.9; }',
            '.atlas_plugins_btn:disabled { background: #a7aaad !important; cursor: not-allowed; }',
            '.atlas_plugins_btn .dashicons { font-size: 16px; width: 16px; height: 16px; line-height: 16px; }',

            '.atlas_plugins_install_btn { background: #2271b1; }',
            '.atlas_plugins_install_btn:hover { background: #135e96; }',

            '.atlas_plugins_activate_btn { background: #00a32a; }',
            '.atlas_plugins_activate_btn:hover { background: #008a20; }',

            '.atlas_plugins_activating .atlas_plugins_activate_btn { background: #dba617; }',
            '.atlas_plugins_installing .atlas_plugins_install_btn { background: #dba617; }',

            '.atlas_plugins_learn_more { font-size: 14px; color: #2271b1; text-decoration: none; font-weight: 500; }',
            '.atlas_plugins_learn_more:hover { color: #135e96; text-decoration: underline; }',

            '.atlas_plugins_active_badge { display: inline-block; padding: 6px 16px; background: #00a32a; color: #fff; border-radius: 6px; font-size: 13px; font-weight: 600; }',

            '.atlas_plugins_error { color: #d63638; font-size: 13px; margin-top: 4px; width: 100%; }',
        ].join('\n');
        document.head.appendChild(style);
    }

    /**
     * Show the "Active" badge in the actions row.
     */
    function showActiveBadge(actions, plugin) {
        actions.innerHTML = '';
        var badge = document.createElement('span');
        badge.className = 'atlas_plugins_active_badge';
        badge.textContent = __('Active', 'text-to-audio');
        actions.appendChild(badge);

        appendLearnMore(actions, plugin);
    }

    /**
     * Create and return an Activate button that uses the given activateUrl.
     */
    function createActivateButton(activateUrl) {
        var activateBtn = document.createElement('button');
        activateBtn.className = 'atlas_plugins_btn atlas_plugins_activate_btn';
        activateBtn.type = 'button';
        activateBtn.innerHTML = '<span class="dashicons dashicons-plugins-checked"></span> ' + __('Activate', 'text-to-audio');

        activateBtn.addEventListener('click', function () {
            window.location.href = activateUrl;
        });

        return activateBtn;
    }

    /**
     * Append "Learn More" link to the actions row.
     */
    function appendLearnMore(actions, plugin) {
        if (plugin.learnMoreUrl) {
            var learnMore = document.createElement('a');
            learnMore.className = 'atlas_plugins_learn_more';
            learnMore.href = plugin.learnMoreUrl;
            learnMore.target = '_blank';
            learnMore.rel = 'noopener noreferrer';
            learnMore.textContent = __('Learn More', 'text-to-audio');
            actions.appendChild(learnMore);
        }
    }

    function createPluginCard(plugin) {
        var card = document.createElement('div');
        card.className = 'atlas_plugins_card';

        var pluginIsActive    = isPluginActive(plugin.slug);
        var pluginIsInstalled = isPluginInstalled(plugin.slug);

        // Plugin name
        var name = document.createElement('h3');
        name.className = 'atlas_plugins_name';
        name.textContent = plugin.name;
        card.appendChild(name);

        // Description
        var desc = document.createElement('p');
        desc.className = 'atlas_plugins_description';
        desc.textContent = plugin.description;
        card.appendChild(desc);

        // Features accordion
        if (plugin.features && plugin.features.length > 0) {
            var accordion = document.createElement('div');
            accordion.className = 'atlas_plugins_accordion';

            var header = document.createElement('button');
            header.className = 'atlas_plugins_accordion_header';
            header.type = 'button';

            var headerText = document.createElement('span');
            headerText.textContent = __('Features', 'text-to-audio');
            header.appendChild(headerText);

            var icon = document.createElement('span');
            icon.className = 'atlas_plugins_accordion_icon dashicons dashicons-arrow-down-alt2';
            header.appendChild(icon);

            var body = document.createElement('div');
            body.className = 'atlas_plugins_accordion_body';

            var list = document.createElement('ul');
            list.className = 'atlas_plugins_features_list';

            plugin.features.forEach(function (feature) {
                var li = document.createElement('li');

                var check = document.createElement('span');
                check.className = 'atlas_plugins_feature_check';
                check.textContent = '\u2713';
                li.appendChild(check);

                var text = document.createElement('span');
                text.textContent = feature;
                li.appendChild(text);

                list.appendChild(li);
            });

            body.appendChild(list);
            accordion.appendChild(header);
            accordion.appendChild(body);

            header.addEventListener('click', function () {
                body.classList.toggle('atlas_plugins_expanded');
                icon.classList.toggle('atlas_plugins_open');
            });

            card.appendChild(accordion);
        }

        // Actions row
        var actions = document.createElement('div');
        actions.className = 'atlas_plugins_actions';

        if (pluginIsActive) {
            // Plugin is active — show Active badge
            showActiveBadge(actions, plugin);
        } else if (pluginIsInstalled) {
            // Plugin is installed but not active — show Activate button
            // Use the activate URL generated by PHP (includes proper nonce).
            var activateUrl = (atlasPluginsData.activate_urls && atlasPluginsData.activate_urls[plugin.slug]) || '';
            if (activateUrl) {
                var activateBtn = createActivateButton(activateUrl);
                actions.appendChild(activateBtn);
            }
            appendLearnMore(actions, plugin);
        } else {
            // Plugin is not installed — show Install Now button
            var installBtn = document.createElement('button');
            installBtn.className = 'atlas_plugins_btn atlas_plugins_install_btn';
            installBtn.type = 'button';
            installBtn.innerHTML = '<span class="dashicons dashicons-download"></span> ' + __('Install Now', 'text-to-audio');

            installBtn.addEventListener('click', function () {
                if (installBtn.disabled) {
                    return;
                }

                installBtn.disabled = true;
                card.classList.add('atlas_plugins_installing');
                installBtn.innerHTML = '<span class="dashicons dashicons-update"></span> ' + __('Installing...', 'text-to-audio');

                var prevError = card.querySelector('.atlas_plugins_error');
                if (prevError) {
                    prevError.remove();
                }

                wp.updates.installPlugin({
                    slug: plugin.slug,
                    success: function (response) {
                        card.classList.remove('atlas_plugins_installing');
                        installBtn.remove();

                        // Use the activateUrl from the install response
                        if (response && response.activateUrl) {
                            var activateBtn = createActivateButton(response.activateUrl);
                            actions.insertBefore(activateBtn, actions.firstChild);
                        }
                    },
                    error: function (response) {
                        card.classList.remove('atlas_plugins_installing');
                        installBtn.disabled = false;
                        installBtn.innerHTML = '<span class="dashicons dashicons-download"></span> ' + __('Install Now', 'text-to-audio');

                        var errorEl = document.createElement('p');
                        errorEl.className = 'atlas_plugins_error';
                        errorEl.textContent = response.errorMessage || __('Installation failed. Please try again.', 'text-to-audio');
                        actions.appendChild(errorEl);
                    },
                });
            });

            actions.appendChild(installBtn);
            appendLearnMore(actions, plugin);
        }

        card.appendChild(actions);

        return card;
    }

    function render() {
        var container = document.getElementById('atlas_plugins_container');
        if (!container) {
            return;
        }

        injectStyles();

        // Wrap
        var wrap = document.createElement('div');
        wrap.className = 'atlas_plugins_wrap';

        // Header
        var header = document.createElement('div');
        header.className = 'atlas_plugins_header';

        var h2 = document.createElement('h2');
        h2.textContent = __('AtlasAiDev Plugins', 'text-to-audio');
        header.appendChild(h2);

        var subtitle = document.createElement('p');
        subtitle.textContent = __('Discover and install plugins by AtlasAiDev to enhance your WordPress site.', 'text-to-audio');
        header.appendChild(subtitle);

        wrap.appendChild(header);

        // Cards grid
        var grid = document.createElement('div');
        grid.className = 'atlas_plugins_grid';

        atlasPlugins.forEach(function (plugin) {
            grid.appendChild(createPluginCard(plugin));
        });

        wrap.appendChild(grid);
        container.appendChild(wrap);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', render);
    } else {
        render();
    }
})();
