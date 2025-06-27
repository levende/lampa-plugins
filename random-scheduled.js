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

        var icon = '<svg viewBox="0 0 98 123" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M66.7 0.7a1.2 1.2 0 0 0-1.8-0.6H5.8C2.6 0.1 0 2.7 0 5.8v111.2c0 3.1 2.6 5.8 5.8 5.8h86.2c3.2 0 5.8-2.6 5.8-5.8V33.9c.1-.8-.2-1.5-.8-2.1l-30-30.4h-.3zm-11.5 85.5H40.3v-1.5c0-2.6.3-4.6.9-6.2 0.6-1.6 1.4-3.1 2.6-4.4s3.7-3.6 7.7-7c2.1-1.7 3.2-3.3 3.2-4.8 0-1.4-.4-2.6-1.3-3.4-.9-.8-2.1-1.2-3.9-1.2-1.9 0-3.4.6-4.6 1.9-1.2 1.2-2 3.4-2.3 6.5l-15.2-1.9c.5-5.6 2.6-10.1 6.1-13.5 3.6-3.4 9-5.1 16.4-5.1 5.7 0 10.3 1.2 13.9 3.6 4.8 3.2 7.2 7.5 7.2 12.9 0 2.2-.6 4.4-1.9 6.5-1.2 2.1-3.8 4.6-7.6 7.6-2.7 2.1-4.3 3.8-5 5.1-.8 1.6-1.1 3.3-1.1 5.4zM39.8 90.2h16v11.7h-16V90.2zM60.7 7.6v20.9c0 2.2.9 4.7 2.3 6.2 1.4 1.4 4.5 2.6 6.6 2.6h20.7v77.3c0 .1-.2.3-.3.4-.1.1-.1.2-.3.2H8.6c-.2 0-.3-.1-.4-.2-.1-.1-.2-.3-.2-.4V8.2c0-.2.1-.3.2-.4.1-.1.2-.2.4-.2h52.1zM67.5 28V8.9l21.4 21.7H70.2c-.7 0-1.4-.3-1.9-.8-.3-.5-.7-1.2-.7-1.8z"/></svg>';
        var menuItem = $('<li data-action="random-card" class="menu__item selector"><div class="menu__ico">' + icon + '</div><div class="menu__text">' + Lampa.Lang.translate('random_card_title') + '</div></li>');
        $('.menu .menu__list').eq(0).append(menuItem);

        menuItem.on('hover:enter', function () {
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
        });
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
