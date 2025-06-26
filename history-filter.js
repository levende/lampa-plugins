(function () {
    'use strict';

    // Polyfills
    if (!Array.prototype.map) { Array.prototype.map = function (c, t) { var o = Object(this), l = o.length >>> 0, a = new Array(l), k = 0; if (typeof c !== "function") throw new TypeError(c + " is not a function"); if (arguments.length > 1) t = thisArg; while (k < l) { if (k in o) a[k] = c.call(t, o[k], k, o); k++; } return a; }; }
    if (!Array.prototype.filter) { Array.prototype.filter = function (c, t) { var o = Object(this), l = o.length >>> 0, r = [], i = 0; if (typeof c !== "function") throw new TypeError(c + " is not a function"); for (; i < l; i++)if (i in o && c.call(t, o[i], i, o)) r.push(o[i]); return r; }; }

    var postFilters = {
        filters: [
            function (results) {
                var favorite = Lampa.Storage.get('favorite', '{}');

                for (var indx = results.length - 1; indx >= 0; indx--) {
                    var item = results[indx];

                    var mediaType = item.media_type;

                    if (!mediaType) {
                        mediaType = !!item.first_air_date ? 'tv' : 'movie';
                    }

                    var favoriteItem = Lampa.Favorite.check(item);
                    var watched = !!favoriteItem && !!favoriteItem.history;

                    if (!watched) {
                        continue;
                    }

                    if (watched && mediaType == 'movie') {
                        results.splice(indx, 1);
                        continue;
                    }

                    var historyEpisodes = getEpisodesListFromHistory(item.id, favorite);
                    var allHistoryEpisodesWatched = allEpisodesWatched(
                        (item.original_title || item.original_name),
                        historyEpisodes);

                    if (allHistoryEpisodesWatched) {
                        results.splice(indx, 1);
                        continue;
                    }

                    Lampa.TimeTable.get(item, function (timeTableEpisodes) {
                        var releasedTimeTableEpisodes = timeTableEpisodes.filter(function (episode) {
                            if (!episode.air_date) {
                                return false;
                            }

                            var airDate = new Date(episode.air_date);
                            var now = new Date();

                            return airDate <= now;
                        });

                        var allTimeTableEpisodesWathced = allEpisodesWatched(
                            (item.original_title || item.original_name),
                            releasedTimeTableEpisodes);

                        if (allTimeTableEpisodesWathced) {
                            results.splice(indx, 1);
                        }
                    });

                };
            }
        ],
        apply: function (results) {
            for (var i = 0; i < this.filters.length; i++) {
                this.filters[i](results);
            }
        }
    };

    function getEpisodesListFromHistory(id, favorite) {
        var historyCard = favorite.card.filter(function (card) {
            return card.id == id && Array.isArray(card.seasons) && card.seasons.length > 0;
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
            && baseUrl.indexOf('/search') == -1
            && baseUrl.indexOf('/person/') == -1;
    }

    function start() {
        if (window.history_filter_plugin) {
            return;
        }

        window.history_filter_plugin = true;

        Lampa.Listener.follow('request_secuses', function (event) {
            if (isFilterApplicable(event.params.url) && event.data && Array.isArray(event.data.results)) {
                postFilters.apply(event.data.results);
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
