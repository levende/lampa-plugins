(function() {
    'use strict';
   
    function start() {
        if (window.imdb_vote_plugin) {
            return;
        }

        window.imdb_vote_plugin = true;

        Lampa.Utils.putScript(['https://levende.github.io/lampa-plugins/listener-extensions.js'], function () {
            Lampa.Listener.follow('card', function (event) {
                if (event.type === 'build' && event.object.data.imdb_rating) {
                    $('.card__vote', event.object.card).text(event.object.data.imdb_rating);
                }
            })
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
})()
