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

    function hasMorePage(data) {
        return !!data
            && Array.isArray(data.results)
            && data.original_length !== data.results.length
            && data.page === 1
            && !!data.total_pages
            && data.total_pages > 1;
    }
    
    function start() {
        if (window.trash_filter_plugin) {
            return;
        }

        window.trash_filter_plugin = true;

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
                event.data.original_length = event.data.results.length;
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
