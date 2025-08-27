(function(){
    var BLACK_LIST = ['Заблокировано', ' TS'];

    function startPlugin() {
        if (window.balancer_sanitizer) return;
        window.balancer_sanitizer = true;

        Lampa.Listener.follow('request_secuses', function (event) {
            if (!event.params || event.params.dataType != 'text') return;

            var response = event.data;
            if (typeof response !== "string" || response.indexOf('<div') == -1) return;

            var doc = parseHtml(event.data);
            if (!doc) return;

            var newData = filterHtml(doc);
            var originalComplite = event.params.complite;

            event.params.complite = function() {
                originalComplite(newData);
            }
        });
    }

    function parseHtml(str) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(str, "text/html");

        return doc.querySelector("parsererror") ? null : doc;
    }

    function filterHtml(doc) {
        var items = doc.querySelectorAll('.videos__item');

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var text = item.textContent || item.innerText || '';

            var blackList = window.balancer_sanitizer_black_list || BLACK_LIST;

            for (var j = 0; j < blackList.length; j++) {
                if (text.toLowerCase().indexOf(blackList[j].toLowerCase()) !== -1) {
                    if (item.parentNode) {
                        item.parentNode.removeChild(item);
                    }

                    break;
                }
            }
        }

        return doc.body.innerHTML;
    }

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') {
                startPlugin();
            }
        });
    }
})();
