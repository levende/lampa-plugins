(function () {
    'use strict';

    var VISIBLE_NETWORKS_LIMIT = 3;

    function addLocalization() {
        Lampa.Lang.add({
            tmdb_networks: {
                'en': 'Networks',
                'uk': 'Мережі',
                'ru': 'Сети',
            },
            tmdb_networks_open: {
                'en': 'Open',
                'uk': 'Відкрити',
                'ru': 'Открыть',
            },
            tmdb_networks_top: {
                'en': 'Top',
                'uk': 'Популярні',
                'ru': 'Популярные'
            },
            tmdb_networks_new: {
                'en': 'New',
                'uk': 'Новинки',
                'ru': 'Новинки',
            },
        });
    }

    function createNetworkButton(network, index) {
        var networkBtn = $('<div class="tag-count selector network-btn"></div>');

        if (network.logo_path) {
            networkBtn.addClass('network-logo');
            var logo = $('<img/>').attr({
                src: Lampa.TMDB.image("t/p/w300" + network.logo_path),
                alt: network.name,
            });
            networkBtn.append(logo);
        } else {
            networkBtn.append($('<div class="tag-count__name">' + network.name + '</div>'))
        }

        if (index >= VISIBLE_NETWORKS_LIMIT) {
            networkBtn.addClass('hide');
        }

        networkBtn.on('hover:enter', function () {
            onNetworkButtonClick(network);
        });

        return networkBtn;
    }

    function createMoreButton(hiddenCount) {
        var moreBtn = $(
            '<div class="tag-count selector">' +
            '<div class="tag-count__name">' + Lampa.Lang.translate('more') + '</div>' +
            '<div class="tag-count__count">' + hiddenCount + '</div>' +
            '</div>'
        );

        moreBtn.on('hover:enter', function () {
            $(this).addClass('hide');
            $('.network-btn.hide').removeClass('hide');
        });

        return moreBtn;
    }

    function renderNetworks(object) {
        var render = object.activity.render();
        var movie = object.card;

        $('.tmdb-networks', render).remove();
        if (!movie || movie.source !== 'tmdb' || !movie.networks || !movie.networks.length) return;

        var networksLine = $(
            '<div class="tmdb-networks">' +
                '<div class="items-line__head">' +
                    '<div class="items-line__title">' + Lampa.Lang.translate('tmdb_networks') + '</div>' +
                '</div>' +
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

        movie.networks.forEach(function (network, index) {
            container.append(createNetworkButton(network, index, movie.networks.length));

            if (movie.networks.length > VISIBLE_NETWORKS_LIMIT && index === VISIBLE_NETWORKS_LIMIT - 1) {
                container.append(createMoreButton(movie.networks.length - VISIBLE_NETWORKS_LIMIT));
            }
        });

        $('.items-line', render).eq(0).prepend(networksLine);
    }

    function onNetworkButtonClick(network) {
        var enabled = Lampa.Controller.enabled().name;
        var menu = [
            {
                title: Lampa.Lang.translate('tmdb_networks_open') + ' ' + Lampa.Lang.translate('tmdb_networks_top').toLowerCase(),
                sort_by: '',
                type: Lampa.Lang.translate('tmdb_networks_top'),
                filter: {},
            },
            {
                title: Lampa.Lang.translate('tmdb_networks_open') + ' ' + Lampa.Lang.translate('tmdb_networks_new').toLowerCase(),
                sort_by: 'first_air_date.desc',
                type: Lampa.Lang.translate('tmdb_networks_new'),
                filter: { 'first_air_date.lte': new Date().toISOString().split('T')[0] },
            }
        ];

        Lampa.Select.show({
            title: network.name,
            items: menu,
            onBack: function () {
                Lampa.Controller.toggle(enabled);
            },
            onSelect: function (action) {
                Lampa.Activity.push({
                    url: 'discover/tv',
                    title: action.type + ' ' + network.name,
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

    function startPlugin() {
        if (window.tmdb_networks) {
            return;
        }
        window.tmdb_networks = true;

        $('head').append(
            '<style>' +
                '.network-logo {background-color:#fff}' +
                '.network-logo img {height:25px}' +
                '.network-logo.focus {box-shadow:0 0 0 5px rgba(0, 0, 0, 0.4)}' +
            '</style>'
        );

        addLocalization();

        Lampa.Listener.follow('activity', function (e) {
            if (e.type === 'archive') {
                renderNetworks(e.object);
            }
        });

        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite' && (e.object.method === 'tv' || e.object.method === 'movie')) {
                renderNetworks(e.object);
            }
        });
    }

    if (window.appready) {
        setTimeout(startPlugin, 500);
    } else {
        var onAppReady = function (event) {
            if (event.type !== 'ready') return;
            Lampa.Listener.remove('app', onAppReady);
            setTimeout(startPlugin, 500);
        };
        Lampa.Listener.follow('app', onAppReady);
    }
})();