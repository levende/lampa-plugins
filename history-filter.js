(function () {
    'use strict';

    // Minimal Promise-like implementation
    function SimplePromise(executor) {
        var callbacks = [];
        var state = 'pending';
        var value = null;

        this.then = function (callback) {
            if (state === 'fulfilled') {
                callback(value);
            } else {
                callbacks.push(callback);
            }
            return this; // Allow basic chaining for simplicity
        };

        function resolve(result) {
            if (state !== 'pending') return;
            state = 'fulfilled';
            value = result;
            for (var i = 0; i < callbacks.length; i++) {
                callbacks[i](value);
            }
        }

        executor(resolve);
    }

    // Polyfills
    if (!Array.prototype.map) {
        Array.prototype.map = function (c, t) {
            var o = Object(this), l = o.length >>> 0, a = new Array(l), k = 0;
            if (typeof c !== "function") throw new TypeError(c + " is not a function");
            if (arguments.length > 1) t = thisArg;
            while (k < l) {
                if (k in o) a[k] = c.call(t, o[k], k, o);
                k++;
            }
            return a;
        };
    }
    if (!Array.prototype.filter) {
        Array.prototype.filter = function (c, t) {
            var o = Object(this), l = o.length >>> 0, r = [], i = 0;
            if (typeof c !== "function") throw new TypeError(c + " is not a function");
            for (; i < l; i++) if (i in o && c.call(t, o[i], i, o)) r.push(o[i]);
            return r;
        };
    }

    var postFilters = {
        filters: [
            function (results, callback) {
                var filteredResults = [];
                var index = 0;

                function processItem() {
                    if (index >= results.length) {
                        callback(filteredResults);
                        return;
                    }

                    var item = results[index];
                    var mediaType = item.media_type;

                    if (!mediaType && !!item.first_air_date) {
                        mediaType = 'tv';
                    }

                    if (!mediaType) {
                        filteredResults.push(item);
                        index++;
                        processItem();
                        return;
                    }

                    var favoriteItem = Lampa.Favorite.check(item);
                    var watched = !!favoriteItem && !!favoriteItem.history;

                    if (!watched) {
                        filteredResults.push(item);
                        index++;
                        processItem();
                        return;
                    }

                    if (watched && mediaType === 'movie') {
                        index++;
                        processItem();
                        return;
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

                        var allEpisodes = releasedTimeTableEpisodes.concat(getEpisodesListFromHistory(item.id));
                        var episodes = [];

                        for (var i = 0; i < allEpisodes.length; i++) {
                            var episode = allEpisodes[i];
                            var exists = false;

                            for (var j = 0; j < episodes.length; j++) {
                                if (
                                    episodes[j].season_number === episode.season_number &&
                                    episodes[j].episode_number === episode.episode_number
                                ) {
                                    exists = true;
                                    break;
                                }
                            }

                            if (!exists) {
                                episodes.push(episode);
                            }
                        }

                        var lastSeasonWatched = allEpisodesWatched(
                            (item.original_title || item.original_name),
                            episodes
                        );

                        if (!lastSeasonWatched) {
                            filteredResults.push(item);
                        }

                        index++;
                        processItem();
                    });
                }

                processItem();
            }
        ],
        apply: function (results, callback) {
            var clone = Lampa.Arrays.clone(results);
            var self = this;

            function applyFilters(filterIndex, currentResults) {
                if (filterIndex >= self.filters.length) {
                    callback(currentResults);
                    return;
                }

                self.filters[filterIndex](currentResults, function (filtered) {
                    applyFilters(filterIndex + 1, filtered);
                });
            }

            applyFilters(0, clone);
        }
    };

    function getEpisodesListFromHistory(id) {
        var historyCard = Lampa.Storage.get('favorite').card.filter(function (card) {
            return card.id == id && Array.isArray(card.seasons) && card.seasons.length > 0;
        })[0];

        if (!historyCard) {
            return [];
        }

        var realSeasons = historyCard.seasons.filter(function (season) {
            return season.season_number > 0 && season.episode_count > 0;
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
            return true;
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
        return baseUrl.indexOf(Lampa.TMDB.api('')) > -1 && baseUrl.indexOf('search') == -1;
    }

    function start() {
        if (window.history_filter_plugin) {
            return;
        }

        window.history_filter_plugin = true;

        Lampa.Listener.follow('request_secuses', function (event) {
            if (isFilterApplicable(event.params.url) && event.data && Array.isArray(event.data.results)) {
                var originalResults = Lampa.Arrays.clone(event.data.results);
                new SimplePromise(function (resolve) {
                    postFilters.apply(originalResults, function (filteredResults) {
                        resolve(filteredResults);
                    });
                }).then(function (filteredResults) {
                    event.data.results.length = 0;
                    for (var i = 0; i < filteredResults.length; i++) {
                        event.data.results.push(filteredResults[i]);
                    }
                });
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
