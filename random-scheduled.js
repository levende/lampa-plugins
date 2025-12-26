(function () {
    'use strict';

    // Polyfills
    if (!Array.prototype.filter) { Array.prototype.filter = function (c, t) { var o = Object(this), l = o.length >>> 0, r = [], i = 0; if (typeof c !== "function") throw new TypeError(c + " is not a function"); for (; i < l; i++)if (i in o && c.call(t, o[i], i, o)) r.push(o[i]); return r; }; }
    if (!Array.prototype.slice) Array.prototype.slice = function (s, e) { var l = this.length >>> 0; s = parseInt(s) || 0; s = s < 0 ? Math.max(0, l + s) : Math.min(l, s); e = e === undefined ? l : parseInt(e); e = e < 0 ? Math.max(0, l + e) : Math.min(l, e); var r = []; for (var i = s; i < e; i++)r.push(this[i]); return r; };
    if (!Array.isArray) {Array.isArray = function(arg) {return Object.prototype.toString.call(arg) === '[object Array]';};}

    var errorTranslated = false;

    function shuffleArray(array) {
        if (!Array.isArray(array)) {
            throw new TypeError(' Expected a non-empty array');
        }

        if (array.length === 0) {
            return [];
        }

        var arr = array.slice(0);
        var i = arr.length - 1;
        while (i > 0) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
            i--;
        }
        return arr;
    }

    function start() {
        if (window.random_scheduled_plugin) {
            return;
        }

        window.random_scheduled_plugin = true;

        Lampa.Lang.add({
            random_card_title: {
                en: 'Random',
                uk: 'Випадкове',
                ru: 'Случайное'
            }
        });

        var icon = '<svg fill="currentColor" height="800px" width="800px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xml:space="preserve"><g><path class="st0" d="M449.525,105.602L288.456,8.989C278.474,2.994,267.228,0,256,0c-11.232,0-22.476,2.994-32.46,8.989L62.469,105.602c-19.01,11.406-30.641,31.95-30.641,54.117v192.562c0,22.168,11.631,42.711,30.641,54.117l161.072,96.613C233.524,508.999,244.772,512,256,512c11.228,0,22.474-3.001,32.456-8.989l161.069-96.613c19.012-11.406,30.647-31.95,30.647-54.117V159.719C480.172,137.552,468.537,117.008,449.525,105.602z M250.593,492.733c-6.026-0.745-11.927-2.719-17.32-5.948L72.203,390.172c-13.31-7.99-21.453-22.37-21.453-37.891V159.719c0-6.022,1.238-11.862,3.514-17.233l196.328,117.76V492.733z M59.663,133.114c3.366-4.464,7.596-8.318,12.541-11.285l161.069-96.613c7.002-4.196,14.856-6.291,22.728-6.291c7.868,0,15.726,2.095,22.725,6.291l161.065,96.613c4.955,2.967,9.184,6.821,12.541,11.285L256,250.881L59.663,133.114z M461.247,352.281c0,15.521-8.15,29.901-21.456,37.891l-161.065,96.613c-5.391,3.229-11.296,5.203-17.321,5.948V260.246l196.325-117.76c2.282,5.37,3.518,11.211,3.518,17.233V352.281z"/><path class="st0" d="M202.061,309.771c11.158,6.082,20.201,1.967,20.201-9.191c0-11.15-9.043-25.128-20.201-31.21c-11.154-6.076-20.201-1.961-20.201,9.19C181.86,289.718,190.907,303.689,202.061,309.771z"/><path class="st0" d="M89.283,361.082c11.154,6.076,20.197,1.961,20.197-9.197c0-11.151-9.043-25.122-20.197-31.204c-11.155-6.083-20.201-1.968-20.201,9.19C69.081,341.022,78.128,355,89.283,361.082z"/><path class="st0" d="M145.672,335.424c11.154,6.082,20.201,1.967,20.201-9.191c0-11.151-9.047-25.128-20.201-31.204c-11.158-6.082-20.201-1.967-20.201,9.184C125.471,315.37,134.514,329.341,145.672,335.424z"/><path class="st0" d="M418.335,207.902c-11.158,6.082-20.208,20.053-20.208,31.21c0,11.151,9.05,15.266,20.208,9.19c11.151-6.082,20.194-20.059,20.194-31.21C438.529,205.934,429.486,201.819,418.335,207.902z"/><path class="st0" d="M305.552,269.37c-11.161,6.082-20.201,20.06-20.201,31.21c0,11.158,9.04,15.273,20.201,9.191c11.155-6.082,20.198-20.053,20.198-31.211C325.749,267.409,316.707,263.294,305.552,269.37z"/><path class="st0" d="M418.335,320.681c-11.158,6.082-20.208,20.052-20.208,31.204c0,11.158,9.05,15.273,20.208,9.197c11.151-6.082,20.194-20.06,20.194-31.21C438.529,318.714,429.486,314.598,418.335,320.681z"/><path class="st0" d="M305.552,382.149c-11.161,6.082-20.201,20.059-20.201,31.21c0,11.158,9.04,15.273,20.201,9.191c11.155-6.083,20.198-20.053,20.198-31.211C325.749,380.188,316.707,376.074,305.552,382.149z"/><path class="st0" d="M284.992,107.012c-15.726-11.648-41.627-11.936-57.86-0.658c-16.227,11.285-16.643,29.875-0.913,41.509c15.726,11.648,41.63,11.943,57.867,0.658C300.312,137.243,300.722,118.654,284.992,107.012z"/></g></svg>';
        var menuItem = $('<li data-action="random-card" class="menu__item selector"><div class="menu__ico">' + icon + '</div><div class="menu__text">' + Lampa.Lang.translate('random_card_title') + '</div></li>');
        var navButton = $('<div class="navigation-bar__item" data-action="random-card"><div class="navigation-bar__icon">' + icon + '</div><div class="navigation-bar__label">' + Lampa.Lang.translate('random_card_title') + '</div></div>');

        $('.menu .menu__list').eq(0).append(menuItem);
        $('.navigation-bar__body').append(navButton);

        var onClick = function () {
            var randomCard = getRandomScheduledCard();
            if (!randomCard) {
                if (!errorTranslated) {
                    errorTranslated = true;

                    var laterTitle = Lampa.Lang.translate('title_wath');
                    var scheduledTitle = Lampa.Lang.translate('title_scheduled');

                    Lampa.Lang.add({
                        random_card_no_list_error: {
                            en: 'Looks like you have already watched everything from the ' + laterTitle + ' and ' + scheduledTitle + ' lists',
                            uk: 'Схоже, ви вже все переглянули зі списків ' + laterTitle + ' та ' + scheduledTitle,
                            ru: 'Похоже, Вы уже всё посмотрели из списков ' + laterTitle + ' и ' + scheduledTitle,
                        }
                    });
                }

                Lampa.Noty.show(Lampa.Lang.translate('random_card_no_list_error'));
            } else {
                Lampa.Activity.push({
                    card: randomCard,
                    component: 'full',
                    method: randomCard.method || (isTv(randomCard) ? 'tv' : 'movie'),
                    source: randomCard.source,
                    id: randomCard.id
                });
            }
        };

        menuItem.on('hover:enter', onClick);
        navButton.on('click', onClick);
    }

    function isTv(card) {
        return !!card.number_of_seasons
            || !!card.number_of_episodes
            || !!card.next_episode_to_air
            || !!card.first_air_date
            || (!!card.original_name && !card.original_title);
    }

    function getRandomScheduledCard() {
        var favorite = Lampa.Storage.get('favorite', '{}');

        var cards = favorite.card || [];
        if (cards.length === 0) {
            return null;
        }

        var watch = favorite.wath || [];
        var scheduled = favorite.scheduled || [];

        if (watch.length === 0 && scheduled.length === 0) {
            return null;
        }

        var merge = watch.concat(scheduled);

        var skip = (favorite.history || [])
            .concat(favorite.continued || [])
            .concat(favorite.look || [])
            .concat(favorite.thrown || [])
            .concat(favorite.viewed || []);

        var notWatched = merge.length === 1
            ? merge
            : merge.filter(function (item, index, array) {
                return array.indexOf(item) === index && skip.indexOf(item) === -1;
            });

        if (notWatched.length === 0) {
            return null;
        }

        var randomItem = shuffleArray(notWatched)[0];
        return cards.filter(function (card) { return card.id === randomItem })[0];
    }

    if (window.appready) {
        start();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') {
                start();
            }
        });
    }
})();