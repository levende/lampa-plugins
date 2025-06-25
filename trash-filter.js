(function () {
    'use strict';

    var PreFilters = {
        applyMinVotes: function(baseUrl) {
            baseUrl += '&vote_count.gte=' + 1;
            return baseUrl;
        },
        applyWithoutKeywords: function(baseUrl) {
            var baseExcludedKeywords = [
                '346488',
                '158718',
                '41278'
            ];

            baseUrl += '&without_keywords=' + encodeURIComponent(baseExcludedKeywords.join(','));
            return baseUrl;
        }
    }

    var PostFilters = {
        applyMinVotes(results) {
            return results.filter(function(item) {
                if (!item.original_language) {
                    return true;
                }

                var lang = item.original_language.toLowerCase();
                if (lang == 'uk' || lang == 'ru') {
                    return true;
                }

                return item.vote_count > 50;
            });
        }
    }

    function isFilterApplicable(baseUrl) {
        return baseUrl.indexOf(Lampa.TMDB.api('')) > -1 && baseUrl.indexOf('search') == -1;
    }

    function start() {
        if (window.trash_filter_plugin) {
            return;
        }

        window.trash_filter_plugin = true;

        Lampa.Listener.follow('request_before', function(event) {
            if (isFilterApplicable(event.params.url)) {
                event.params.url = PreFilters.applyMinVotes(event.params.url);
                event.params.url = PreFilters.applyWithoutKeywords(event.params.url);
            }
        });

        Lampa.Listener.follow('request_secuses', function (event) {
            if (isFilterApplicable(event.params.url) && event.data && Array.isArray(event.data.results)) {
                event.data.results = PostFilters.applyMinVotes(event.data.results);
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
