(function() {
  'use strict';
  function start() {
    if (window.remove_shots_button) return;
    window.remove_shots_button = true;
    
    Lampa.Listener.follow('full', function (e) {
      if (e.type === 'complite') {
          e.body.find('.shots-view-button').remove();
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
