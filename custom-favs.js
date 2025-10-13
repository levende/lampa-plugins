(function(){
    'use strict';

    function start() {
        var pluginUrl = Lampa.Manifest.app_digital >= 300
            ? 'https://levende.github.io/lampa-plugins/v3/custom-favs.js'
            : 'https://levende.github.io/lampa-plugins/v2/custom-favs.js';

        Lampa.Utils.putScriptAsync([pluginUrl], function () { });
    }

    if (window.appready) {
        start();
    } else {
        Lampa.Listener.follow('app', function() {
            start();
        });
    }
})();