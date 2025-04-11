(function () {
    'use strict';

    var pluginManifest = {
        version: '2.0.3',
        author: 'levende',
        docs: 'https://levende.github.io/lampa-plugins/docs/tmdb-networks',
        contact: 'https://t.me/levende'
    };

    var LIST_DISPLAY_MODE = Object.freeze({
        HIDE: 0,
        LOGO: 1,
        TEXT: 2
    });

    var EXTRA_BTN_DISPLAY_MODE = Object.freeze({
        HIDE: 0,
        LOGO: 1,
        TEXT: 2,
        LIST_BTN: 3
    });

    var settings = {
        platfroms_tv_list_mode: -1,
        platfroms_tv_list_max_visible: -1,
        platfroms_tv_extra_btn_mode: -1,

        platfroms_movie_list_mode: -1,
        platfroms_movie_list_max_visible: -1,
        platfroms_movie_extra_btn_mode: -1
    };

    var network = new Lampa.Reguest();

    function addLocalization() {
        Lampa.Lang.add({
            tmdb_networks_open: {
                en: 'Open',
                uk: 'Відкрити',
                ru: 'Открыть'
            },
            tmdb_networks_top: {
                en: 'Top',
                uk: 'Популярні',
                ru: 'Популярные'
            },
            tmdb_networks_new: {
                en: 'New',
                uk: 'Новинки',
                ru: 'Новинки'
            },
            tmdb_networks_hide: {
                en: 'Hide',
                uk: 'Сховати',
                ru: 'Скрыть'
            },
            tmdb_networks_plugin_platforms: {
                en: 'Plaftorms',
                uk: 'Платформи',
                ru: 'Платформы'
            },
            tmdb_networks_plugin_platforms_setting_descr: {
                en: 'Display configuration settings for platforms in cards',
                uk: 'Налаштування відображення платформ у картках',
                ru: 'Настройки отображения платформ в карточках'
            },
            tmdb_networks_plugin_about: {
                en: 'About the plugin',
                uk: 'Про плагін',
                ru: 'О плагине'
            },
            tmdb_networks_plugin_descr: {
                en: 'The plugin adds buttons for streaming services and platforms to cards, showing where movies and series were released or sold, making them easier to find',
                uk: 'Плагін додає в картки кнопки стримінгових сервісів і платформ, де виходили або продавалися фільми та серіали, що спрощує їх пошук',
                ru: 'Плагин добавляет в карточки кнопки стриминговых сервисов и платформ, где выходили или продавались фильмы и сериалы, упрощая их поиск'
            },
            platfroms_list: {
                en: 'List',
                uk: 'Перелік',
                ru: 'Список'
            },
            platfroms_list_limit: {
                en: 'List limit',
                uk: 'Ліміт переліку',
                ru: 'Лимит списка'
            },
            platform_display_hide: {
                en: 'Do not show',
                uk: 'Не показувати',
                ru: 'Не показывать'
            },
            platform_display_logo: {
                en: 'Logo',
                uk: 'Логотип',
                ru: 'Логотип'
            },
            platform_display_name: {
                en: 'Name',
                uk: 'Назва',
                ru: 'Имя'
            },
            platform_display_combo_btn: {
                en: 'Select button',
                uk: 'Кнопка з вибором',
                ru: 'Кнопка с выбором'
            },
            platform_extra_btn: {
                en: 'Extra button',
                uk: 'Додаткова кнопка',
                ru: 'Дополнительная кнопка'
            }
        });
    }

    function createNetworkButton(network, index, type, mode, limit) {
        var networkBtn = $('<div class="tag-count selector network-btn"></div>');

        if (network.logo_path && mode == LIST_DISPLAY_MODE.LOGO) {
            networkBtn.addClass('network-logo');
            networkBtn.addClass(type);

            networkBtn.append($('<div class="tag-count overlay"></div>'));
            var logo = $('<img/>').attr({
                src: Lampa.TMDB.image("t/p/w300" + network.logo_path),
                alt: network.name
            });
            networkBtn.append(logo);
        } else {
            networkBtn.append($('<div class="tag-count__name">' + network.name + '</div>'));
        }

        if (index >= limit) {
            networkBtn.addClass('hide');
        }

        networkBtn.on('hover:enter', function () {
            onNetworkButtonClick(network, this, type);
        });

        return networkBtn;
    }

    function createMoreButton(hiddenCount, type, container) {
        var moreBtn = $(
            '<div class="tag-count selector network-btn network-more">' +
                '<div class="tag-count__name">' + Lampa.Lang.translate('more') + '</div>' +
                '<div class="tag-count__count">' + hiddenCount + '</div>' +
            '</div>'
        );

        var limit = settings['platfroms_' + type + '_list_max_visible'];

        moreBtn.on('hover:enter', function () {
            $('.network-btn.hide').removeClass('hide');
            $(this).addClass('hide');
            Lampa.Controller.collectionFocus($('.network-btn', container).eq(limit + 1), Lampa.Activity.active().activity.render());
        });

        return moreBtn;
    }

    function createHideButton(type) {
        var hideBtn = $(
            '<div class="tag-count selector network-btn hide">' +
                '<div class="tag-count__name">' + Lampa.Lang.translate('tmdb_networks_hide') + '</div>' +
            '</div>');
            
        var limit = settings['platfroms_' + type + '_list_max_visible'];

        hideBtn.on('hover:enter', function () {
            $(this).addClass('hide');
            $('.network-btn:not(.button--plaftorms):gt(' + (limit - 1) + ')').addClass('hide');

            var moreBtn = $('.network-more');
            moreBtn.removeClass('hide');
            Lampa.Controller.collectionFocus(moreBtn, Lampa.Activity.active().activity.render());
        });

        return hideBtn;
    }

    function getMovieProviders(movie, callback) {
        var allowedCountryCodes = ['US', 'RU'];
        var excludeKeywords = ['Free', 'Ad', 'With Ads', 'Free with Ads', 'Plex', 'Tubi', 'Pluto TV', 'Google Play', 'Youtube', 'Max Amazon Channel'];
        var maxDisplayPriority = 20;

        var url = Lampa.TMDB.api('movie/' + movie.id + '/watch/providers?api_key=' + Lampa.TMDB.key());
        network.silent(url, function (data) {
            if (!data.results) {
                return [];
            }

            var countryCodes = Object.keys(data.results).filter(function(countryCode) {
                return allowedCountryCodes.includes(countryCode);
            });

            var providers = [];
            var uniqueProviders = [];

            countryCodes.forEach(function(countryCode) {
                var countryProviders = (data.results[countryCode].flatrate || [])
                    .concat(data.results[countryCode].rent || [])
                    .concat(data.results[countryCode].buy || []);
            
                countryProviders.forEach(function(provider) { provider.country_code = countryCode });
                providers = providers.concat(countryProviders);
            });

            providers.forEach(function (provider) {
                if (provider.display_priority > maxDisplayPriority) return;

                if (uniqueProviders.some(function(p) { return p.id == provider.provider_id } )) return;

                var name = provider.provider_name;
                var excluded = excludeKeywords.some(function (keyword) {
                    return name.toLowerCase().indexOf(keyword.toLowerCase()) !== -1;
                });

                if (excluded) return;

                uniqueProviders.push({
                    id: provider.provider_id,
                    name: name,
                    logo_path: provider.logo_path,
                    display_priority: provider.display_priority,
                    country_code: provider.country_code
                });
            });

            uniqueProviders = uniqueProviders.sort(function (a, b) { return a.display_priority - b.display_priority });
            console.log(uniqueProviders);
            callback(uniqueProviders);
        });
    }

    function getNetworks(object, callback) {
        var movie = object.card;
        if (!movie || movie.source !== 'tmdb') return callback([]);

        var getFn = movie.networksList // cache
            ? function() { callback(movie.networksList); }
            : movie.networks 
                ? function() { callback(movie.networks); }
                : getMovieProviders;
        
        getFn(movie, function(networks) {
            movie.networksList = networks;
            callback(networks);
        });
    }

    function renderExtraBtn(render, networks, type) {
        $('.button--plaftorms', render).remove();

        var displayMode = settings['platfroms_' + type + '_extra_btn_mode'];
        var container = $('.full-start-new__buttons', render);
        var btn = $('<div class="full-start__button selector button--plaftorms"></div>');

        switch (displayMode) {
            case EXTRA_BTN_DISPLAY_MODE.LOGO:
            case EXTRA_BTN_DISPLAY_MODE.TEXT: {
                btn = createNetworkButton(networks[0], 0, type, displayMode, 1);
                btn.removeClass('tag-count').addClass('full-start__button').addClass('button--plaftorms');
                btn.css('height', $('.full-start__button', render).first().outerHeight() + 'px');
                break;
            }
            case EXTRA_BTN_DISPLAY_MODE.LIST_BTN: {
                var title = Lampa.Lang.translate('tmdb_networks_plugin_platforms');
                btn.html(
                    '<svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="512.000000pt" height="512.000000pt" viewBox="0 0 512.000000 512.000000">' +
                        '<g transform="translate(0.000000,512.000000) scale(0.100000,-0.100000)" fill="currentColor">' +
                            '<path d="M895 4306 c-16 -7 -59 -44 -95 -82 -284 -302 -487 -669 -586 -1060 -57 -227 -69 -330 -69 -604 0 -274 12 -377 69 -604 86 -339 253 -666 483 -943 156 -189 209 -225 300 -208 49 9 109 69 118 118 13 67 -1 103 -72 180 -389 422 -583 908 -583 1457 0 551 193 1032 584 1459 45 48 67 81 72 105 24 131 -102 234 -221 182z"/>' +
                            '<path d="M4095 4306 c-41 -18 -83 -69 -91 -111 -12 -65 3 -102 73 -178 388 -422 583 -909 583 -1457 0 -548 -195 -1035 -583 -1457 -71 -77 -85 -113 -72 -180 9 -49 69 -109 118 -118 77 -15 105 -1 199 96 272 279 482 659 583 1053 58 225 70 331 70 606 0 275 -12 381 -70 606 -101 394 -301 756 -585 1058 -88 94 -148 116 -225 82z"/>' +
                            '<path d="M1525 3695 c-83 -28 -274 -269 -364 -458 -53 -111 -95 -234 -123 -358 -20 -91 -23 -130 -23 -319 0 -189 3 -228 23 -319 28 -124 70 -247 123 -358 92 -193 290 -440 371 -461 102 -27 198 46 198 151 0 60 -8 76 -83 157 -32 36 -83 101 -112 145 -142 215 -205 425 -205 685 0 260 63 470 205 685 29 44 80 109 112 145 75 81 83 97 83 158 0 107 -103 181 -205 147z"/>' +
                            '<path d ="M3513 3700 c-76 -17 -123 -76 -123 -153 0 -60 8 -76 83 -157 153 -168 262 -390 302 -614 19 -114 19 -318 0 -432 -40 -224 -149 -446 -302 -614 -75 -81 -83 -97 -83 -157 0 -105 96 -178 198 -151 81 21 279 268 371 461 53 111 95 234 123 358 20 91 23 130 23 319 0 189 -3 228 -23 319 -61 273 -193 531 -367 719 -88 95 -133 118 -202 102z"/>' +
                            '<path d="M2435 3235 c-417 -77 -668 -518 -519 -912 111 -298 421 -488 723 -445 326 46 557 277 603 603 41 289 -136 595 -412 710 -130 55 -260 69 -395 44z m197 -316 c77 -17 137 -50 190 -107 57 -61 83 -110 98 -190 22 -111 -12 -222 -96 -312 -138 -148 -359 -156 -510 -18 -96 88 -138 210 -114 330 16 82 42 132 99 191 52 55 97 81 174 102 65 17 92 18 159 4z"/>' +
                        '</g>' +
                    '</svg>' +
                    '<span>' + title + '</span>');
        
                btn.on('hover:enter', function () {
                    var controllerName = Lampa.Controller.enabled().name;
                    Lampa.Select.show({
                        title: title,
                        items: networks.map(function(network) { return { title: network.name, network: network } } ),
                        onBack: function () {
                            Lampa.Controller.toggle(controllerName);
                            Lampa.Controller.collectionFocus(btn, render);
                        },
                        onSelect: function (action) {
                            onNetworkButtonClick(action.network, null, type, controllerName);
                        }
                    });
                });
                break;
            }
            default: return;
        }

        container.append(btn);
        Lampa.Activity.active().activity.toggle();
    }

    function renderNetworks() {
        var object = Lampa.Activity.active();
        var render = object.activity.render();
        $('.tmdb-networks', render).remove();

        getNetworks(object, function(networks) {
            if (networks.length == 0) return;

            var type = object.method;

            renderExtraBtn(render, networks, type, object);

            var displayMode = settings['platfroms_' + type + '_list_mode'];

            if (displayMode == LIST_DISPLAY_MODE.HIDE) return;
            var displayLimit = settings['platfroms_' + type + '_list_max_visible'];
            var networksLine = $(
                '<div class="tmdb-networks">' +
                    '<div class="items-line__body" style="margin-bottom:3em;">' +
                        '<div class="full-descr">' +
                            '<div class="full-descr__left">' +
                                '<div class="full-descr__tags" style="margin-top:0;"></div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>'
            );

            var container = $('.full-descr__tags', networksLine);

            var hasMoreBtn = false;
            networks.forEach(function (network, index) {
                container.append(createNetworkButton(network, index, type, displayMode, displayLimit));

                if (networks.length > displayLimit && index === displayLimit - 1) {
                    container.append(createMoreButton(networks.length - displayLimit, type, container));
                    hasMoreBtn = true;
                }
            });

            if (hasMoreBtn) {
                container.append(createHideButton(type));
            }

            $('.items-line', render).eq(0).prepend(networksLine);
        });
    }

    function onNetworkButtonClick(network, element, type, controller) {
        var isTv = type == 'tv';
        var controllerName = controller || Lampa.Controller.enabled().name;
        

        var releaseDateField = isTv ? 'first_air_date' : 'primary_release_date';
        var topFilter = { 'vote_count.gte': 10 };
        var newFilter = { 'vote_count.gte': 10 };
        newFilter[releaseDateField + '.lte'] = new Date().toISOString().split('T')[0];

        var menu = [
            {
                title: Lampa.Lang.translate('tmdb_networks_open') + ' ' + Lampa.Lang.translate('tmdb_networks_top').toLowerCase(),
                sort_by: '',
                type: Lampa.Lang.translate('tmdb_networks_top'),
                filter: topFilter
            },
            {
                title: Lampa.Lang.translate('tmdb_networks_open') + ' ' + Lampa.Lang.translate('tmdb_networks_new').toLowerCase(),
                sort_by: releaseDateField + '.desc',
                type: Lampa.Lang.translate('tmdb_networks_new'),
                filter: newFilter
            }
        ];

        if (network.country_code) {
            menu.forEach(function(selectItem) {
                selectItem.filter.watch_region = network.country_code;
                selectItem.filter.with_watch_providers = network.id;
            });
        }

        var categoryLangKey = isTv ? 'menu_tv' : 'menu_movies';

        Lampa.Select.show({
            title: network.name + ' ' + Lampa.Lang.translate(categoryLangKey),
            items: menu,
            onBack: function () {
                Lampa.Controller.toggle(controllerName);
                Lampa.Controller.collectionFocus(element, Lampa.Activity.active().activity.render());
            },
            onSelect: function (action) {
                Lampa.Activity.push({
                    url: 'discover/' + type,
                    title: network.name + ' ' + action.type + ' ' + Lampa.Lang.translate(categoryLangKey),
                    component: 'category_full',
                    networks: network.id,
                    sort_by: action.sort_by,
                    source: 'tmdb',
                    card_type: true,
                    page: 1,
                    filter: action.filter,
                });
            }
        });
    }

    function addSettingsByType(type) {
        Lampa.SettingsApi.addParam({
            component: 'platforms',
            param: {
                name: 'platfroms_' + type + '_list_mode',
                type: 'select',
                values: {
                    [LIST_DISPLAY_MODE.HIDE]: Lampa.Lang.translate('platform_display_hide'),
                    [LIST_DISPLAY_MODE.LOGO]: Lampa.Lang.translate('platform_display_logo'),
                    [LIST_DISPLAY_MODE.TEXT]: Lampa.Lang.translate('platform_display_name'),
                },
                default: settings['platfroms_' + type + '_list_mode'],
            },
            field: {
                name: Lampa.Lang.translate('platfroms_list'),
            },
            onChange: initSettings
        });

        Lampa.SettingsApi.addParam({
            component: 'platforms',
            param: {
                name: 'platfroms_' + type + '_list_max_visible',
                type: 'select',
                values: { 1: 1, 2: 2, 3: 3, 5: 5 },
                default: settings['platfroms_' + type + '_list_max_visible'],
            },
            field: {
                name: Lampa.Lang.translate('platfroms_list_limit')
            },
            onChange: initSettings
        });

        Lampa.SettingsApi.addParam({
            component: 'platforms',
            param: {
                name: 'platfroms_' + type + '_extra_btn_mode',
                type: 'select',
                values: {
                    [EXTRA_BTN_DISPLAY_MODE.HIDE]: Lampa.Lang.translate('platform_display_hide'),
                    [EXTRA_BTN_DISPLAY_MODE.LOGO]: Lampa.Lang.translate('platform_display_logo'),
                    [EXTRA_BTN_DISPLAY_MODE.TEXT]: Lampa.Lang.translate('platform_display_name'),
                    [EXTRA_BTN_DISPLAY_MODE.LIST_BTN]: Lampa.Lang.translate('platform_display_combo_btn')
                },
                default: settings['platfroms_' + type + '_extra_btn_mode'],
            },
            field: {
                name: Lampa.Lang.translate('platform_extra_btn'),
            },
            onChange: initSettings
        });
    }

    function addSettings() {
        Lampa.Template.add('settings_platforms', '<div></div>');

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: { 
                type: 'button',
                component: 'platforms' 
            },
            field: {
                name: Lampa.Lang.translate('tmdb_networks_plugin_platforms'),
                description: Lampa.Lang.translate('tmdb_networks_plugin_platforms_setting_descr')
            },
            onChange: function() {
                Lampa.Settings.create('platforms', {
                    template: 'settings_platforms',
                    onBack: function() {
                        Lampa.Settings.create('interface');
                    }
                });
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'platforms',
            param: {
                type: 'button',
                component: 'about'
            },
            field: {
                name: Lampa.Lang.translate('tmdb_networks_plugin_about'),
                description: Lampa.Lang.translate('menu_about'),
            },
            onChange: showAbout
        });

        Lampa.SettingsApi.addParam({
            component: 'platforms',
            param: { type: 'title' },
            field: { name: Lampa.Lang.translate('menu_tv') }
        });

        addSettingsByType('tv');

        Lampa.SettingsApi.addParam({
            component: 'platforms',
            param: { type: 'title' },
            field: { name: Lampa.Lang.translate('menu_movies') }
        });

        addSettingsByType('movie');
    }

    function showAbout() {
        var html =
            '<p>' + Lampa.Lang.translate('tmdb_networks_plugin_descr') + '</p>' +
            '<div style="width: 65%; float: left;">' +
                '<p><span class="account-add-device__site">' + Lampa.Lang.translate('title_author') + '</span> ' + pluginManifest.author + '</p>' +
                '<p><span class="account-add-device__site">' + Lampa.Lang.translate('about_version') + '</span> '+ pluginManifest.version + '</p>' +
            '</div>' +
            '<div style="width: 30%; float: right; text-align: center;">' +
                '<img src="https://quickchart.io/qr?text=' + pluginManifest.docs + '&size=200" alt="Documentation"/>' +
            '</div>' +
            '<div style="clear: both;"></div>';

        var controller = Lampa.Controller.enabled().name;
        Lampa.Select.show({
            title: Lampa.Lang.translate('tmdb_networks_plugin_about'),
            items: [{
                title: html,
                disabled: true
            }],
            onSelect: function () { Lampa.Controller.toggle(controller); },
            onBack: function () { Lampa.Controller.toggle(controller); }
        });
    }

    function initSettings() {
        settings.platfroms_tv_list_mode = Lampa.Storage.get('platfroms_tv_list_mode', LIST_DISPLAY_MODE.LOGO);
        settings.platfroms_tv_list_max_visible = Lampa.Storage.get('platfroms_tv_list_max_visible', 3);
        settings.platfroms_tv_extra_btn_mode = Lampa.Storage.get('platfroms_tv_extra_btn_mode', EXTRA_BTN_DISPLAY_MODE.LIST_BTN);

        settings.platfroms_movie_list_mode = Lampa.Storage.get('platfroms_movie_list_mode', LIST_DISPLAY_MODE.TEXT);
        settings.platfroms_movie_list_max_visible = Lampa.Storage.get('platfroms_movie_list_max_visible', 3);
        settings.platfroms_movie_extra_btn_mode = Lampa.Storage.get('platfroms_movie_extra_btn_mode', EXTRA_BTN_DISPLAY_MODE.LIST_BTN);

    }

    function startPlugin() {
        if (window.tmdb_networks) {
            return;
        }
        window.tmdb_networks = true;

        $('<style>').prop('type', 'text/css').html(
            '.tmdb-networks { margin-top: -3em; } ' +
            '.network-btn { height: 2.94em; } ' +
            '.network-btn.movie { height: 4em; } ' +
            '.network-logo { background-color: #fff; position: relative; } ' +
            '.network-logo.movie { background: none; padding: 0; } ' +
            '.network-logo .overlay { ' +
                'position: absolute; top: 0; left: 0; right: 0; bottom: 0; ' +
                'background: rgba(0, 0, 0, 0); ' +
            '} ' +
            '.network-logo img { border-radius: 0.6em; height: 100%; } ' +
            '.network-logo.full-start__button .overlay, .network-logo.full-start__button.movie * { border-radius: 1em }' + 
            '.network-logo.focus .overlay { background: rgba(0, 0, 0, 0.3); } ' +
            '.network-logo.focus { box-shadow: 0 0 0 0.2em rgb(255, 255, 255); }'
        ).appendTo('head');

        initSettings();
        addLocalization();
        addSettings();

        Lampa.Listener.follow('activity,full', function (e) {
            if (e.type === 'complite' || e.type === 'archive') {
                renderNetworks();
            }
        });
    }

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') {
                startPlugin();
            }
        });
    }
})();