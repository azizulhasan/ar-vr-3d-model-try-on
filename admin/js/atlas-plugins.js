(function () {
    'use strict';

    var __ = wp.i18n.__;

    // ── Helpers ──────────────────────────────────────────────

    function getPlugins() {
        if (typeof atlasPluginsData !== 'undefined' && atlasPluginsData.plugins) {
            return atlasPluginsData.plugins;
        }
        return [];
    }

    function isPluginActive(slug) {
        return typeof atlasPluginsData !== 'undefined'
            && atlasPluginsData.active_plugins
            && atlasPluginsData.active_plugins.indexOf(slug) !== -1;
    }

    function isPluginInstalled(slug) {
        return typeof atlasPluginsData !== 'undefined'
            && atlasPluginsData.installed_plugins
            && atlasPluginsData.installed_plugins.indexOf(slug) !== -1;
    }

    function isProInstalled(slug) {
        return typeof atlasPluginsData !== 'undefined'
            && atlasPluginsData.pro_installed
            && atlasPluginsData.pro_installed.indexOf(slug) !== -1;
    }

    function isCurrentPlugin(slug) {
        return typeof atlasPluginsData !== 'undefined'
            && atlasPluginsData.current_plugin_slug === slug;
    }

    function isRecommended(plugin) {
        if (!plugin.complementary || !atlasPluginsData.current_plugin_slug) return false;
        return plugin.complementary.indexOf(atlasPluginsData.current_plugin_slug) !== -1;
    }

    function getWporgInfo(slug) {
        if (typeof atlasPluginsData !== 'undefined' && atlasPluginsData.wporg_info && atlasPluginsData.wporg_info[slug]) {
            return atlasPluginsData.wporg_info[slug];
        }
        return { rating: 0, num_ratings: 0, active_installs: 0 };
    }

    function formatInstalls(num) {
        if (num >= 1000000) return Math.floor(num / 1000000) + 'M+';
        if (num >= 1000) return Math.floor(num / 1000) + 'K+';
        if (num > 0) return num + '+';
        return __('New', 'ar-vr-3d-model-try-on');
    }

    function addUtm(url) {
        if (!url) return '';
        var sep = url.indexOf('?') === -1 ? '?' : '&';
        var current = (atlasPluginsData && atlasPluginsData.current_plugin_slug) || 'unknown';
        return url + sep + 'utm_source=wordpress&utm_medium=plugins_page&utm_campaign=cross_sell&utm_content=' + encodeURIComponent(current);
    }

    /**
     * Sort plugins: by priority (ascending), then shuffle within same priority.
     */
    function sortPlugins(plugins) {
        var sorted = plugins.slice();
        // Group by priority
        var groups = {};
        sorted.forEach(function (p) {
            var pri = p.priority || 99;
            if (!groups[pri]) groups[pri] = [];
            groups[pri].push(p);
        });
        // Shuffle each group
        Object.keys(groups).forEach(function (key) {
            var arr = groups[key];
            for (var i = arr.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var temp = arr[i]; arr[i] = arr[j]; arr[j] = temp;
            }
        });
        // Flatten by sorted priority keys
        var keys = Object.keys(groups).sort(function (a, b) { return a - b; });
        var result = [];
        keys.forEach(function (k) { result = result.concat(groups[k]); });

        // Move recommended plugins to front (within their priority group they float up)
        var recommended = [];
        var rest = [];
        result.forEach(function (p) {
            if (isRecommended(p) && !isCurrentPlugin(p.slug)) {
                recommended.push(p);
            } else {
                rest.push(p);
            }
        });
        return recommended.concat(rest);
    }

    // ── Stars renderer ──────────────────────────────────────

    function renderStars(rating100) {
        // rating is 0-100 from WP.org, convert to 0-5
        var stars = Math.round((rating100 / 100) * 5 * 2) / 2; // round to nearest 0.5
        var html = '';
        for (var i = 1; i <= 5; i++) {
            if (i <= Math.floor(stars)) {
                html += '<span class="atlas_plugins_star atlas_plugins_star_full">&#9733;</span>';
            } else if (i - 0.5 === stars) {
                html += '<span class="atlas_plugins_star atlas_plugins_star_half">&#9733;</span>';
            } else {
                html += '<span class="atlas_plugins_star atlas_plugins_star_empty">&#9734;</span>';
            }
        }
        return html;
    }

    // ── Styles ──────────────────────────────────────────────

    function injectStyles() {
        if (document.getElementById('atlas-plugins-styles')) return;
        var style = document.createElement('style');
        style.id = 'atlas-plugins-styles';
        style.textContent = [
            '.atlas_plugins_wrap { max-width: 1200px; padding: 20px 20px 20px 0; }',

            /* Banner */
            '.atlas_plugins_banner { background: linear-gradient(135deg, #1d2327 0%, #2c3338 100%); color: #fff; padding: 16px 24px; border-radius: 10px; margin-bottom: 20px; }',
            '.atlas_plugins_banner h2 { font-size: 18px; font-weight: 600; color: #fff; margin: 0 0 4px 0; }',
            '.atlas_plugins_banner h2 span { color: #72aee6; }',
            '.atlas_plugins_banner p { font-size: 14px; color: #c3c4c7; margin: 0; }',

            /* Header */
            '.atlas_plugins_header { margin-bottom: 8px; }',
            '.atlas_plugins_header_row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }',
            '.atlas_plugins_header p { font-size: 14px; color: #50575e; margin: 0; }',

            '.atlas_plugins_refresh_btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: #f0f0f1; color: #1d2327; border: 1px solid #c3c4c7; border-radius: 4px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; }',
            '.atlas_plugins_refresh_btn:hover { background: #e0e0e0; border-color: #999; }',
            '.atlas_plugins_refresh_btn:disabled { opacity: 0.6; cursor: not-allowed; }',
            '.atlas_plugins_refresh_btn .dashicons { font-size: 16px; width: 16px; height: 16px; line-height: 16px; }',
            '.atlas_plugins_refresh_btn.atlas_plugins_refreshing .dashicons { animation: atlas_plugins_spin 1s linear infinite; }',
            '@keyframes atlas_plugins_spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }',
            '.atlas_plugins_refresh_msg { font-size: 13px; margin-left: 8px; }',
            '.atlas_plugins_refresh_msg.atlas_plugins_success { color: #00a32a; }',
            '.atlas_plugins_refresh_msg.atlas_plugins_fail { color: #d63638; }',

            /* Grid */
            '.atlas_plugins_grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px; padding: 24px 0; }',

            /* Card */
            '.atlas_plugins_card { background: #fff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 24px; display: flex; flex-direction: column; transition: box-shadow 0.2s ease; position: relative; }',
            '.atlas_plugins_card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }',
            '.atlas_plugins_card.atlas_plugins_current_card { border-color: #2271b1; border-width: 2px; }',

            /* Card header with icon */
            '.atlas_plugins_card_header { display: flex; gap: 14px; margin-bottom: 12px; align-items: flex-start; }',
            '.atlas_plugins_icon { width: 56px; height: 56px; border-radius: 10px; flex-shrink: 0; object-fit: cover; background: #f0f0f1; }',
            '.atlas_plugins_card_header_info { flex: 1; min-width: 0; }',
            '.atlas_plugins_name { font-size: 16px; font-weight: 600; color: #1d2327; margin: 0 0 4px 0; line-height: 1.3; }',

            /* Badges row */
            '.atlas_plugins_badges { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 4px; }',
            '.atlas_plugins_badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }',
            '.atlas_plugins_badge_new { background: #fcf0e3; color: #b26200; }',
            '.atlas_plugins_badge_pro { background: #f0e6ff; color: #6b21a8; }',
            '.atlas_plugins_badge_recommended { background: #e6f4ea; color: #1a7431; }',
            '.atlas_plugins_badge_here { background: #e8f0fe; color: #1a56db; }',

            /* Rating & installs */
            '.atlas_plugins_meta { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #646970; }',
            '.atlas_plugins_star { font-size: 14px; line-height: 1; }',
            '.atlas_plugins_star_full { color: #f0b849; }',
            '.atlas_plugins_star_half { color: #f0b849; opacity: 0.6; }',
            '.atlas_plugins_star_empty { color: #c3c4c7; }',
            '.atlas_plugins_meta_sep { color: #c3c4c7; }',

            /* Description */
            '.atlas_plugins_description { font-size: 13px; color: #50575e; margin: 0 0 14px 0; line-height: 1.5; }',

            /* Accordion */
            '.atlas_plugins_accordion { border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 16px; overflow: hidden; }',
            '.atlas_plugins_accordion_header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #f6f7f7; cursor: pointer; border: none; width: 100%; font-size: 13px; font-weight: 500; color: #1d2327; text-align: left; }',
            '.atlas_plugins_accordion_header:hover { background: #f0f0f1; }',
            '.atlas_plugins_accordion_icon { transition: transform 0.2s ease; }',
            '.atlas_plugins_accordion_icon.atlas_plugins_open { transform: rotate(180deg); }',
            '.atlas_plugins_accordion_body { max-height: 0; overflow: hidden; transition: max-height 0.3s ease; }',
            '.atlas_plugins_accordion_body.atlas_plugins_expanded { max-height: 500px; }',
            '.atlas_plugins_features_list { list-style: none; margin: 0; padding: 10px 14px; }',
            '.atlas_plugins_features_list li { padding: 5px 0; font-size: 12px; color: #50575e; border-bottom: 1px solid #f0f0f1; display: flex; align-items: flex-start; gap: 6px; }',
            '.atlas_plugins_features_list li:last-child { border-bottom: none; }',
            '.atlas_plugins_feature_check { color: #00a32a; flex-shrink: 0; font-weight: bold; font-size: 13px; }',

            /* Actions */
            '.atlas_plugins_actions { display: flex; align-items: center; gap: 10px; margin-top: auto; padding-top: 8px; flex-wrap: wrap; }',

            '.atlas_plugins_btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; color: #fff; border: none; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; transition: background 0.2s ease; text-decoration: none; }',
            '.atlas_plugins_btn:hover { opacity: 0.9; }',
            '.atlas_plugins_btn:disabled { background: #a7aaad !important; cursor: not-allowed; }',
            '.atlas_plugins_btn .dashicons { font-size: 14px; width: 14px; height: 14px; line-height: 14px; }',

            '.atlas_plugins_install_btn { background: #2271b1; }',
            '.atlas_plugins_install_btn:hover { background: #135e96; }',
            '.atlas_plugins_activate_btn { background: #00a32a; }',
            '.atlas_plugins_activate_btn:hover { background: #008a20; }',
            '.atlas_plugins_configure_btn { background: #50575e; }',
            '.atlas_plugins_configure_btn:hover { background: #3c4043; }',
            '.atlas_plugins_pro_btn { background: linear-gradient(135deg, #6b21a8, #9333ea); }',
            '.atlas_plugins_pro_btn:hover { opacity: 0.9; }',

            '.atlas_plugins_activating .atlas_plugins_activate_btn { background: #dba617; }',
            '.atlas_plugins_installing .atlas_plugins_install_btn { background: #dba617; }',

            '.atlas_plugins_link { font-size: 13px; color: #2271b1; text-decoration: none; font-weight: 500; }',
            '.atlas_plugins_link:hover { color: #135e96; text-decoration: underline; }',

            '.atlas_plugins_active_badge { display: inline-block; padding: 6px 14px; background: #00a32a; color: #fff; border-radius: 6px; font-size: 12px; font-weight: 600; }',

            '.atlas_plugins_error { color: #d63638; font-size: 13px; margin-top: 4px; width: 100%; }',
        ].join('\n');
        document.head.appendChild(style);
    }

    // ── Card builder ────────────────────────────────────────

    function createPluginCard(plugin) {
        var card = document.createElement('div');
        card.className = 'atlas_plugins_card';

        var slug            = plugin.slug;
        var pluginIsActive  = isPluginActive(slug);
        var pluginInstalled = isPluginInstalled(slug);
        var isCurrent       = isCurrentPlugin(slug);
        var proInstalled    = isProInstalled(slug);
        var recommended     = isRecommended(plugin);
        var wporg           = getWporgInfo(slug);

        if (isCurrent) card.classList.add('atlas_plugins_current_card');

        // ── Card header: icon + name + badges + meta ──
        var headerDiv = document.createElement('div');
        headerDiv.className = 'atlas_plugins_card_header';

        // Icon
        if (plugin.icon) {
            var icon = document.createElement('img');
            icon.className = 'atlas_plugins_icon';
            icon.src = plugin.icon;
            icon.alt = plugin.name;
            icon.loading = 'lazy';
            headerDiv.appendChild(icon);
        }

        var infoDiv = document.createElement('div');
        infoDiv.className = 'atlas_plugins_card_header_info';

        // Plugin name
        var name = document.createElement('h3');
        name.className = 'atlas_plugins_name';
        name.textContent = plugin.name;
        infoDiv.appendChild(name);

        // Badges
        var badgesDiv = document.createElement('div');
        badgesDiv.className = 'atlas_plugins_badges';

        if (isCurrent) {
            var hereBadge = document.createElement('span');
            hereBadge.className = 'atlas_plugins_badge atlas_plugins_badge_here';
            hereBadge.textContent = __('You\'re here', 'ar-vr-3d-model-try-on');
            badgesDiv.appendChild(hereBadge);
        }
        if (plugin.isNew) {
            var newBadge = document.createElement('span');
            newBadge.className = 'atlas_plugins_badge atlas_plugins_badge_new';
            newBadge.textContent = __('New', 'ar-vr-3d-model-try-on');
            badgesDiv.appendChild(newBadge);
        }
        if (plugin.proUrl) {
            var proBadge = document.createElement('span');
            proBadge.className = 'atlas_plugins_badge atlas_plugins_badge_pro';
            proBadge.textContent = __('Pro', 'ar-vr-3d-model-try-on');
            badgesDiv.appendChild(proBadge);
        }
        if (recommended && !isCurrent) {
            var recBadge = document.createElement('span');
            recBadge.className = 'atlas_plugins_badge atlas_plugins_badge_recommended';
            recBadge.textContent = __('Recommended', 'ar-vr-3d-model-try-on');
            badgesDiv.appendChild(recBadge);
        }
        if (badgesDiv.children.length > 0) {
            infoDiv.appendChild(badgesDiv);
        }

        // Rating + installs meta
        if (wporg.rating > 0 || wporg.active_installs > 0) {
            var meta = document.createElement('div');
            meta.className = 'atlas_plugins_meta';
            if (wporg.rating > 0) {
                var starsSpan = document.createElement('span');
                starsSpan.innerHTML = renderStars(wporg.rating);
                meta.appendChild(starsSpan);
                var countSpan = document.createElement('span');
                countSpan.textContent = '(' + wporg.num_ratings + ')';
                meta.appendChild(countSpan);
                if (wporg.active_installs > 0) {
                    var sep = document.createElement('span');
                    sep.className = 'atlas_plugins_meta_sep';
                    sep.textContent = '|';
                    meta.appendChild(sep);
                }
            }
            if (wporg.active_installs > 0) {
                var installs = document.createElement('span');
                installs.textContent = formatInstalls(wporg.active_installs) + ' ' + __('active installs', 'ar-vr-3d-model-try-on');
                meta.appendChild(installs);
            }
            infoDiv.appendChild(meta);
        }

        headerDiv.appendChild(infoDiv);
        card.appendChild(headerDiv);

        // ── Description ──
        var desc = document.createElement('p');
        desc.className = 'atlas_plugins_description';
        desc.textContent = plugin.description;
        card.appendChild(desc);

        // ── Features accordion (open by default) ──
        if (plugin.features && plugin.features.length > 0) {
            var accordion = document.createElement('div');
            accordion.className = 'atlas_plugins_accordion';

            var accHeader = document.createElement('button');
            accHeader.className = 'atlas_plugins_accordion_header';
            accHeader.type = 'button';

            var accText = document.createElement('span');
            accText.textContent = __('Features', 'ar-vr-3d-model-try-on');
            accHeader.appendChild(accText);

            var accIcon = document.createElement('span');
            accIcon.className = 'atlas_plugins_accordion_icon dashicons dashicons-arrow-down-alt2 atlas_plugins_open';
            accHeader.appendChild(accIcon);

            var accBody = document.createElement('div');
            accBody.className = 'atlas_plugins_accordion_body atlas_plugins_expanded';

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

            accBody.appendChild(list);
            accordion.appendChild(accHeader);
            accordion.appendChild(accBody);

            accHeader.addEventListener('click', function () {
                accBody.classList.toggle('atlas_plugins_expanded');
                accIcon.classList.toggle('atlas_plugins_open');
            });

            card.appendChild(accordion);
        }

        // ── Actions row ──
        var actions = document.createElement('div');
        actions.className = 'atlas_plugins_actions';

        if (isCurrent) {
            // Current plugin: "You're here" badge + Go Pro or Configure
            var hereBadgeAction = document.createElement('span');
            hereBadgeAction.className = 'atlas_plugins_active_badge';
            hereBadgeAction.textContent = __('Active', 'ar-vr-3d-model-try-on');
            actions.appendChild(hereBadgeAction);

            if (plugin.proUrl && !proInstalled) {
                actions.appendChild(createProButton(plugin));
            } else if (plugin.configureSlug) {
                actions.appendChild(createConfigureButton(plugin));
            }
        } else if (pluginIsActive) {
            // Other active plugin
            var activeBadge = document.createElement('span');
            activeBadge.className = 'atlas_plugins_active_badge';
            activeBadge.textContent = __('Active', 'ar-vr-3d-model-try-on');
            actions.appendChild(activeBadge);

            if (plugin.proUrl && !proInstalled) {
                actions.appendChild(createProButton(plugin));
            } else if (plugin.configureSlug) {
                actions.appendChild(createConfigureButton(plugin));
            }
            appendLearnMore(actions, plugin);
        } else if (pluginInstalled) {
            // Installed but not active
            var activateUrl = (atlasPluginsData.activate_urls && atlasPluginsData.activate_urls[slug]) || '';
            if (activateUrl) {
                actions.appendChild(createActivateButton(activateUrl));
            }
            if (plugin.proUrl && !proInstalled) {
                actions.appendChild(createProButton(plugin));
            }
            appendLearnMore(actions, plugin);
        } else {
            // Not installed
            actions.appendChild(createInstallButton(plugin, card, actions));
            appendLearnMore(actions, plugin);
        }

        card.appendChild(actions);
        return card;
    }

    // ── Button factories ────────────────────────────────────

    function createActivateButton(activateUrl) {
        var btn = document.createElement('button');
        btn.className = 'atlas_plugins_btn atlas_plugins_activate_btn';
        btn.type = 'button';
        btn.innerHTML = '<span class="dashicons dashicons-plugins-checked"></span> ' + __('Activate', 'ar-vr-3d-model-try-on');
        btn.addEventListener('click', function () { window.location.href = activateUrl; });
        return btn;
    }

    function createConfigureButton(plugin) {
        var btn = document.createElement('a');
        btn.className = 'atlas_plugins_btn atlas_plugins_configure_btn';
        btn.href = (atlasPluginsData.admin_url || '') + 'admin.php?page=' + encodeURIComponent(plugin.configureSlug);
        btn.innerHTML = '<span class="dashicons dashicons-admin-generic"></span> ' + __('Configure', 'ar-vr-3d-model-try-on');
        return btn;
    }

    function createProButton(plugin) {
        var btn = document.createElement('a');
        btn.className = 'atlas_plugins_btn atlas_plugins_pro_btn';
        btn.href = addUtm(plugin.proUrl);
        btn.target = '_blank';
        btn.rel = 'noopener noreferrer';
        btn.innerHTML = '<span class="dashicons dashicons-star-filled"></span> ' + __('Go Pro', 'ar-vr-3d-model-try-on');
        return btn;
    }

    function createInstallButton(plugin, card, actions) {
        var btn = document.createElement('button');
        btn.className = 'atlas_plugins_btn atlas_plugins_install_btn';
        btn.type = 'button';
        btn.innerHTML = '<span class="dashicons dashicons-download"></span> ' + __('Install Now', 'ar-vr-3d-model-try-on');

        btn.addEventListener('click', function () {
            if (btn.disabled) return;
            btn.disabled = true;
            card.classList.add('atlas_plugins_installing');
            btn.innerHTML = '<span class="dashicons dashicons-update"></span> ' + __('Installing...', 'ar-vr-3d-model-try-on');

            var prevError = card.querySelector('.atlas_plugins_error');
            if (prevError) prevError.remove();

            wp.updates.installPlugin({
                slug: plugin.slug,
                success: function (response) {
                    card.classList.remove('atlas_plugins_installing');
                    btn.remove();
                    if (response && response.activateUrl) {
                        var activateBtn = createActivateButton(response.activateUrl);
                        actions.insertBefore(activateBtn, actions.firstChild);
                    }
                },
                error: function (response) {
                    card.classList.remove('atlas_plugins_installing');
                    btn.disabled = false;
                    btn.innerHTML = '<span class="dashicons dashicons-download"></span> ' + __('Install Now', 'ar-vr-3d-model-try-on');
                    var errorEl = document.createElement('p');
                    errorEl.className = 'atlas_plugins_error';
                    errorEl.textContent = response.errorMessage || __('Installation failed. Please try again.', 'ar-vr-3d-model-try-on');
                    actions.appendChild(errorEl);
                },
            });
        });

        return btn;
    }

    function appendLearnMore(actions, plugin) {
        if (plugin.learnMoreUrl) {
            var link = document.createElement('a');
            link.className = 'atlas_plugins_link';
            link.href = addUtm(plugin.learnMoreUrl);
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = __('Learn More', 'ar-vr-3d-model-try-on');
            actions.appendChild(link);
        }
    }

    // ── Grid rendering ──────────────────────────────────────

    function renderGrid(container, plugins) {
        var existing = container.querySelector('.atlas_plugins_grid');
        if (existing) existing.remove();

        var grid = document.createElement('div');
        grid.className = 'atlas_plugins_grid';

        var sorted = sortPlugins(plugins);
        sorted.forEach(function (plugin) {
            grid.appendChild(createPluginCard(plugin));
        });

        container.querySelector('.atlas_plugins_wrap').appendChild(grid);
    }

    // ── Refresh handler ─────────────────────────────────────

    function refreshPlugins(btn, msgEl, container) {
        btn.disabled = true;
        btn.classList.add('atlas_plugins_refreshing');
        msgEl.textContent = '';
        msgEl.className = 'atlas_plugins_refresh_msg';

        var xhr = new XMLHttpRequest();
        xhr.open('POST', atlasPluginsData.ajax_url);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onload = function () {
            btn.disabled = false;
            btn.classList.remove('atlas_plugins_refreshing');
            if (xhr.status === 200) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    if (response.success && response.data && response.data.plugins) {
                        atlasPluginsData.plugins = response.data.plugins;
                        if (response.data.wporg_info) {
                            atlasPluginsData.wporg_info = response.data.wporg_info;
                        }
                        renderGrid(container, response.data.plugins);
                        msgEl.className = 'atlas_plugins_refresh_msg atlas_plugins_success';
                        msgEl.textContent = __('Updated successfully!', 'ar-vr-3d-model-try-on');
                    } else {
                        msgEl.className = 'atlas_plugins_refresh_msg atlas_plugins_fail';
                        msgEl.textContent = __('No updates found.', 'ar-vr-3d-model-try-on');
                    }
                } catch (e) {
                    msgEl.className = 'atlas_plugins_refresh_msg atlas_plugins_fail';
                    msgEl.textContent = __('Failed to parse response.', 'ar-vr-3d-model-try-on');
                }
            } else {
                msgEl.className = 'atlas_plugins_refresh_msg atlas_plugins_fail';
                msgEl.textContent = __('Request failed. Please try again.', 'ar-vr-3d-model-try-on');
            }
            setTimeout(function () { msgEl.textContent = ''; }, 5000);
        };
        xhr.onerror = function () {
            btn.disabled = false;
            btn.classList.remove('atlas_plugins_refreshing');
            msgEl.className = 'atlas_plugins_refresh_msg atlas_plugins_fail';
            msgEl.textContent = __('Network error. Please try again.', 'ar-vr-3d-model-try-on');
            setTimeout(function () { msgEl.textContent = ''; }, 5000);
        };
        xhr.send('action=atlas_plugins_refresh&nonce=' + encodeURIComponent(atlasPluginsData.refresh_nonce));
    }

    // ── Main render ─────────────────────────────────────────

    function render() {
        var container = document.getElementById('atlas_plugins_container');
        if (!container) return;

        injectStyles();

        var wrap = document.createElement('div');
        wrap.className = 'atlas_plugins_wrap';

        // ── Top banner ──
        var currentName = (atlasPluginsData && atlasPluginsData.current_plugin_name) || '';
        if (currentName) {
            var banner = document.createElement('div');
            banner.className = 'atlas_plugins_banner';
            var bannerH2 = document.createElement('h2');
            bannerH2.innerHTML = __('You\'re using', 'ar-vr-3d-model-try-on') + ' <span>' + currentName + '</span>';
            banner.appendChild(bannerH2);
            var bannerP = document.createElement('p');
            bannerP.textContent = __('Complete your AI toolkit with these complementary plugins by AtlasAiDev.', 'ar-vr-3d-model-try-on');
            banner.appendChild(bannerP);
            wrap.appendChild(banner);
        }

        // ── Header with refresh button ──
        var header = document.createElement('div');
        header.className = 'atlas_plugins_header';

        var headerRow = document.createElement('div');
        headerRow.className = 'atlas_plugins_header_row';

        var subtitle = document.createElement('p');
        subtitle.textContent = __('Discover and install plugins by AtlasAiDev to enhance your WordPress site.', 'ar-vr-3d-model-try-on');
        headerRow.appendChild(subtitle);

        var refreshBtn = document.createElement('button');
        refreshBtn.className = 'atlas_plugins_refresh_btn';
        refreshBtn.type = 'button';
        refreshBtn.innerHTML = '<span class="dashicons dashicons-update"></span> ' + __('Check for Updates', 'ar-vr-3d-model-try-on');

        var refreshMsg = document.createElement('span');
        refreshMsg.className = 'atlas_plugins_refresh_msg';

        var refreshWrap = document.createElement('div');
        refreshWrap.style.display = 'flex';
        refreshWrap.style.alignItems = 'center';
        refreshWrap.appendChild(refreshBtn);
        refreshWrap.appendChild(refreshMsg);
        headerRow.appendChild(refreshWrap);

        header.appendChild(headerRow);
        wrap.appendChild(header);

        // ── Grid ──
        var plugins = getPlugins();
        var grid = document.createElement('div');
        grid.className = 'atlas_plugins_grid';

        var sorted = sortPlugins(plugins);
        sorted.forEach(function (plugin) {
            grid.appendChild(createPluginCard(plugin));
        });

        wrap.appendChild(grid);
        container.appendChild(wrap);

        refreshBtn.addEventListener('click', function () {
            refreshPlugins(refreshBtn, refreshMsg, container);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', render);
    } else {
        render();
    }
})();
