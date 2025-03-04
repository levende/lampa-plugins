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
        var networkBtn = $('<div class="full-descr__tag selector network-btn"></div>');

        if (network.logo_path) {
            networkBtn.css('background-color', '#fff');
            var logo = $('<img/>').attr({
                src: Lampa.TMDB.image("t/p/w300" + network.logo_path),
                alt: network.name,
                height: 24
            }).css('background-color', '#fff');
            networkBtn.append(logo);
        } else {
            networkBtn.text(network.name);
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
            '<div class="full-descr__tag tag-count selector">' +
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

    function renderNetworks(movie) {
        $('.network-line').remove();
        if (!movie || movie.source !== 'tmdb' || !movie.networks || !movie.networks.length) return;

        var networksLine = $(
            '<div class="items-line network-line">' +
                '<div class="items-line__head">' +
                '<div class="items-line__title">' + Lampa.Lang.translate('tmdb_networks') + '</div>' +
            '</div>' +
                '<div class="items-line__body">' +
                    '<div class="full-descr">' +
                        '<div class="full-descr__line-body"></div>' +
                    '</div>' +
                '</div>' +
            '</div>'
        );

        var container = $('.full-descr__line-body', networksLine);

        movie.networks.forEach(function (network, index) {
            container.append(createNetworkButton(network, index, movie.networks.length));

            if (movie.networks.length > VISIBLE_NETWORKS_LIMIT && index === VISIBLE_NETWORKS_LIMIT - 1) {
                container.append(createMoreButton(movie.networks.length - VISIBLE_NETWORKS_LIMIT));
            }
        });

        $('.full-start-new').after(networksLine);
    }

    function onNetworkButtonClick(network) {
        var enabled = Lampa.Controller.enabled().name;
        var menu = [
            {
                title: Lampa.Lang.translate('tmdb_networks_open') + ' ' + Lampa.Lang.translate('tmdb_networks_top').toLowerCase(),
                sort_by: '',
                type: Lampa.Lang.translate('tmdb_networks_top')
            },
            {
                title: Lampa.Lang.translate('tmdb_networks_open') + ' ' + Lampa.Lang.translate('tmdb_networks_new').toLowerCase(),
                sort_by: 'first_air_date.desc',
                type: Lampa.Lang.translate('tmdb_networks_new')
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
                    page: 1
                });
            }
        });
    }

    function startPlugin() {
        if (window.tmdb_networks) {
            return;
        }
        window.tmdb_networks = true;

        addLocalization();

        Lampa.Listener.follow('activity', function (e) {
            if (e.type === 'archive' && e.object) {
                renderNetworks(e.object.card);
            }
        });

        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite' && (e.object.method === 'tv' || e.object.method === 'movie')) {
                renderNetworks(e.data.movie);
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