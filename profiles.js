(function(){
    'use strict';

    function start() {
        var pluginUrl = Lampa.Manifest.app_digital >= 300
            ? 'https://levende.github.io/lampa-plugins/v3/profiles.js'
            : 'https://levende.github.io/lampa-plugins/v2/profiles.js';

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