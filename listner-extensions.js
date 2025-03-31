(function () {
    'use strict';

    Object.defineProperty(window.Lampa.Card.prototype, 'build', {
        get: function () {
            return this._build;
        },
        set: function (value) {
            this._build = function() {
                value.apply(this);
    
                Lampa.Listener.send('card', {
                    type: 'build',
                    object: this
                });
            }.bind(this);
        }
    });
})()