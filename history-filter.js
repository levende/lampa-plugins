(function () {
    'use strict';

    // Polyfills
    if (!Array.prototype.filter) { Array.prototype.filter = function (c, t) { var o = Object(this), l = o.length >>> 0, r = [], i = 0; if (typeof c !== "function") throw new TypeError(c + " is not a function"); for (; i < l; i++)if (i in o && c.call(t, o[i], i, o)) r.push(o[i]); return r; }; }
    if (!Array.isArray) {Array.isArray = function(arg) {return Object.prototype.toString.call(arg) === '[object Array]';};}

    var postFilters = {
        filters: [
            function (results) {

                var favorite = Lampa.Storage.get('favorite', '{}');
                var timeTable = Lampa.Storage.cache('timetable', 300, []);

                return results.filter(function (item) {
                    if (!item || !item.original_language) {
                        return true;
                    }

                    var mediaType = item.media_type;

                    if (!mediaType) {
                        mediaType = !!item.first_air_date ? 'tv' : 'movie';
                    }

                    var favoriteItem = Lampa.Favorite.check(item);
                    var watched = !!favoriteItem && !!favoriteItem.history;
                    var thrown = !!favoriteItem && favoriteItem.thrown;

                    if (thrown) {
                        return false;
                    }

                    if (!watched) {
                        return true;
                    }

                    if (watched && mediaType === 'movie') {
                        return false;
                    }

                    var historyEpisodes = getEpisodesFromHistory(item.id, favorite);
                    var timeTableEpisodes = getEpisodesFromTimeTable(item.id, timeTable);

                    var releasedEpisodes = mergeEpisodes(historyEpisodes, timeTableEpisodes);

                    var allReleasedEpisodesWatched = allEpisodesWatched(
                        (item.original_title || item.original_name),
                        releasedEpisodes);

                    return !allReleasedEpisodesWatched;
                });
            }
        ],
        apply: function (results) {
            var clone = Lampa.Arrays.clone(results);

            for (var i = 0; i < this.filters.length; i++) {
                clone = this.filters[i](clone);
            }

            return clone;
        }
    };

    function getEpisodesFromHistory(id, favorite) {
        var historyCard = favorite.card.filter(function (card) {
            return card.id === id && Array.isArray(card.seasons) && card.seasons.length > 0;
        })[0];

        if (!historyCard) {
            return [];
        }

        var realSeasons = historyCard.seasons.filter(function (season) {
            return season.season_number > 0
                && season.episode_count > 0
                && season.air_date
                && new Date(season.air_date) < new Date();
        });

        if (realSeasons.length === 0) {
            return [];
        }

        var seasonEpisodes = [];
        for (var seasonIndex = 0; seasonIndex < realSeasons.length; seasonIndex++) {
            var season = realSeasons[seasonIndex];

            for (var episodeIndex = 1; episodeIndex <= season.episode_count; episodeIndex++) {
                seasonEpisodes.push({
                    season_number: season.season_number,
                    episode_number: episodeIndex
                });
            }
        }

        return seasonEpisodes;
    }

    function getEpisodesFromTimeTable(id, timeTable) {
        var serialTimeTable = timeTable.filter(function (item) { return item.id === id })[0] || {};

        if (!Array.isArray(serialTimeTable.episodes) || serialTimeTable.episodes.length === 0) {
            return [];
        }

        return serialTimeTable.episodes.filter(function (episode) {
            return episode.season_number > 0
                && episode.air_date
                && new Date(episode.air_date) < new Date();
        });
    }

    function mergeEpisodes(arr1, arr2) {
        var allEpisodes = arr1.concat(arr2);
        var result = [];

        for (var i = 0; i < allEpisodes.length; i++) {
            var episode = allEpisodes[i];
            var isDuplicate = false;

            for (var j = 0; j < result.length; j++) {
                if (result[j].season_number === episode.season_number
                    && result[j].episode_number === episode.episode_number) {
                    isDuplicate = true;
                    break;
                }
            }

            if (!isDuplicate) {
                result.push(episode);
            }
        }

        return result;
    }

    function allEpisodesWatched(originalTitle, episodes) {
        if (!episodes || episodes.length === 0) {
            return false;
        }

        for (var i = 0; i < episodes.length; i++) {
            var episode = episodes[i];

            var episodeHash = Lampa.Utils.hash([
                episode.season_number,
                episode.season_number > 10 ? ':' : '',
                episode.episode_number,
                originalTitle
            ].join(''));

            var episodeView = Lampa.Timeline.view(episodeHash);

            if (episodeView.percent === 0) {
                return false;
            }
        }

        return true;
    }

    function isFilterApplicable(baseUrl) {
        return baseUrl.indexOf(Lampa.TMDB.api('')) > -1
            && baseUrl.indexOf('/search') === -1
            && baseUrl.indexOf('/person/') === -1;
    }

    function hasMorePage(data) {
        return !!data
            && Array.isArray(data.results)
            && data.original_length !== data.results.length
            && data.page === 1
            && !!data.total_pages
            && data.total_pages > 1;
    }

    function start() {
        if (window.history_filter_plugin) {
            return;
        }

        window.history_filter_plugin = true;

        Lampa.Listener.follow('line', function (event) {
            if (event.type !== 'visible' || !hasMorePage(event.data)) {
                return;
            }

            var lineHeader$ = $(event.body.closest('.items-line')).find('.items-line__head');
            var hasMoreBtn = lineHeader$.find('.items-line__more').length !== 0;

            if (hasMoreBtn) return;

            var button = document.createElement('div');
            button.classList.add('items-line__more');
            button.classList.add('selector');
            button.innerText = Lampa.Lang.translate('more');

            button.addEventListener('hover:enter', function() {
                Lampa.Activity.push({
                    url: event.data.url,
                    title: event.data.title || Lampa.Lang.translate('title_category'),
                    component: 'category_full',
                    page: 1,
                    genres: event.params.genres,
                    filter: event.data.filter,
                    source: event.data.source || event.params.object.source
                });
            });

            lineHeader$.append(button);
        });

        Lampa.Listener.follow('line', function (event) {
            if (event.type !== 'append' || !hasMorePage(event.data)) {
                return;
            }

            if (event.items.length === event.data.results.length && Lampa.Controller.own(event.line)) {
                Lampa.Controller.collectionAppend(event.line.more());
            }
        });

        Lampa.Listener.follow('request_secuses', function (event) {
            if (isFilterApplicable(event.params.url) && event.data && Array.isArray(event.data.results)) {
                if (!event.data.original_length) event.data.original_length = event.data.results.length;
                event.data.results = postFilters.apply(event.data.results);
            }
        });
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
