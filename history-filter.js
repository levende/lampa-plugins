(function () {
    'use strict';

    function start() {
        if (window.history_filter_plugin) {
            return;
        }

        window.history_filter_plugin = true;

       Lampa.Listener.follow('request_secuses', function (event) {
            if (event.params.url.indexOf(Lampa.TMDB.api('')) != -1 && event.params.url.indexOf('search') == -1 && event.data && Array.isArray(event.data.results)) {
                event.data.results = event.data.results.filter(function(item) {
                    return !Lampa.Favorite.check(item).history;
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
