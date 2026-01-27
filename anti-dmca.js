(function () {
    'use strict';

    function start() {
        if (window.anti_dmca_plugin) {
            return;
        }

        window.anti_dmca_plugin = true;
        window.lampa_settings.dcma = [];

        Lampa.Utils.dcma = function () { return undefined };
        var defaultSource = Lampa.Storage.get('source', 'cub');

        Lampa.Listener.follow('request_secuses', function (event) {
            if (event.data.blocked) {
                window.lampa_settings.dcma = [];

                var active = Lampa.Activity.active();
                active.source = 'tmdb';
                Lampa.Storage.set('source', 'tmdb', true);
                Lampa.Activity.replace(active);
                Lampa.Storage.set('source', defaultSource, true);
                setTimeout(function() {
                    Lampa.Controller.toggle('content');
                }, 250);
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
