(function(){
    var BLACK_LIST = ["Заблокировано"];

    function startPlugin() {
        if (window.balancer_sanitizer) return;
        window.balancer_sanitizer = true;

        var originalOpen = XMLHttpRequest.prototype.open;
        var originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function(method, url, async) {
            this._url = url;
            return originalOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function(body) {
            var xhr = this;
            var originalOnReady = xhr.onreadystatechange;

            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4 && xhr.status === 200 && typeof xhr.responseText === "string" && xhr.responseText.indexOf('<div') !== -1) {
                    try {
                        var parser = new DOMParser();
                        var doc = parser.parseFromString(xhr.responseText, "text/html");

                        var items = doc.querySelectorAll('.videos__item');
                        var blackList = window.balancer_sanitizer_black_list || BLACK_LIST;

                        for (var i = 0; i < items.length; i++) {
                            var item = items[i];
                            var text = item.textContent || item.innerText || "";

                            for (var j = 0; j < blackList.length; j++) {
                                if (text.indexOf(blackList[j]) !== -1) {
                                    if (item.parentNode) item.parentNode.removeChild(item);
                                    break;
                                }
                            }
                        }

                        try {
                            Object.defineProperty(xhr, 'responseText', { value: doc.body.innerHTML });
                        } catch(e) {
                        }
                    } catch(e) {
                    }
                }

                if (originalOnReady) originalOnReady.apply(xhr, arguments);
            };

            return originalSend.apply(this, arguments);
        };
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
