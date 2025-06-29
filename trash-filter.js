(function () {
    'use strict';

    var preFilters = {
        filters: [
            function(baseUrl) {
                baseUrl += '&vote_count.gte=' + 1;
                return baseUrl;
            },
            function(baseUrl) {
                var baseExcludedKeywords = [
                    '346488',
                    '158718',
                    '41278'
                ];

                baseUrl += '&without_keywords=' + encodeURIComponent(baseExcludedKeywords.join(','));
                return baseUrl;
            }
        ],
        apply: function(baseUrl) {
            var resultUrl = baseUrl;

            for (var i = 0; i < this.filters.length; i++) {
                resultUrl = this.filters[i](resultUrl);
            }

            return resultUrl;
        }
    };

    var postFilters = {
        filters: [
            function(results) {
                return results.filter(function(item) {
                    if (!item || !item.original_language) {
                        return true;
                    }

                    var lang = item.original_language.toLowerCase();
                    if (lang == 'uk' || lang == 'ru') {
                        return true;
                    }

                    return item.vote_count >= 30;
                });
            }
        ],
        apply: function(results) {
            var clone = Lampa.Arrays.clone(results);

            for (var i = 0; i < this.filters.length; i++) {
                clone = this.filters[i](results);
            }

            return clone;
        }
    };

    function isFilterApplicable(baseUrl) {
        return baseUrl.indexOf(Lampa.TMDB.api('')) > -1
            && baseUrl.indexOf('/search') === -1
            && baseUrl.indexOf('/person/') === -1;
    }

    function start() {
        if (window.trash_filter_plugin) {
            return;
        }

        window.trash_filter_plugin = true;

        Lampa.Listener.follow('line', function (event) {
            if (event.type !== 'append'
                || !event.data
                || !Array.isArray(event.data.results)
                || !event.data.original_length
                || !event.data.filter_length) {
                return;
            }

            if (event.data.filter_length === event.data.original_length) {
                return;
            }

            if (event.items.length === event.data.filter_length) {
                Lampa.Controller.collectionAppend(event.line.more());
            }
        });

        Lampa.Listener.follow('request_before', function(event) {
            if (isFilterApplicable(event.params.url)) {
                event.params.url = preFilters.apply(event.params.url);
            }
        });

        Lampa.Listener.follow('request_secuses', function (event) {
            if (isFilterApplicable(event.params.url) && event.data && Array.isArray(event.data.results)) {
                event.data.original_length = event.data.results.length;
                event.data.results = postFilters.apply(event.data.results);
                event.data.filter_length = event.data.results.length;
                // event.data.results.length = event.data.original_length;
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
