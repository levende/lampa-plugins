(function () {
    'use strict';

    function start() {
        if (window.trash_filter_plugin) {
            return;
        }

        window.trash_filter_plugin = true;

       Lampa.Listener.follow('request_secuses', function (event) {
            if (event.params.url.indexOf(Lampa.TMDB.api('')) != -1 && event.params.url.indexOf('search') != -1 && event.data && Array.isArray(event.data.results)) {
                event.data.results = event.data.results.filter(function(item) {
                    return item.vote_average !== 0 && (item.vote_count === undefined || item.vote_count > 50);
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
