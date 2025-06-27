(function () {
    'use strict';

    // Polyfills
    if (!Array.prototype.filter) { Array.prototype.filter = function (c, t) { var o = Object(this), l = o.length >>> 0, r = [], i = 0; if (typeof c !== "function") throw new TypeError(c + " is not a function"); for (; i < l; i++)if (i in o && c.call(t, o[i], i, o)) r.push(o[i]); return r; }; }

    var errorTranslated = false;

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

        var icon = '<svg  fill="none" stroke="currentColor" width="800px" height="800px" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M39 6H9C7.34315 6 6 7.34315 6 9V39C6 40.6569 7.34315 42 9 42H39C40.6569 42 42 40.6569 42 39V9C42 7.34315 40.6569 6 39 6Z" stroke-width="4" stroke-linejoin="round"/><path d="M24 28.625V24.625C27.3137 24.625 30 21.9387 30 18.625C30 15.3113 27.3137 12.625 24 12.625C20.6863 12.625 18 15.3113 18 18.625" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path fill-rule="evenodd" clip-rule="evenodd" d="M24 37.625C25.3807 37.625 26.5 36.5057 26.5 35.125C26.5 33.7443 25.3807 32.625 24 32.625C22.6193 32.625 21.5 33.7443 21.5 35.125C21.5 36.5057 22.6193 37.625 24 37.625Z"/></svg>';
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

        var randomItem = notWatched[Math.floor(Math.random() * notWatched.length)];
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
