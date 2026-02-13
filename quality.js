(function () {
    'use strict';

    var settings = {
        apn: [
        	''
            //'https://cors.bwa.workers.dev/',
        ],
        api: [{
            url: 'https://api.apbugall.org  ',
            token: '8da1c9beda9545174264dc9f63a77d'
        }, {
            url: 'https://upn.stull.xyz  ',
            token: 'd317441359e505c343c2063edc97e7'
        }],
        cache: {
            key: 'alloha_cache',
            size: 1000,
            time: 1000 * 60 * 60 * 24,
        },
        queue: {
            maxParallel: 12,
        }
    };

    var cache = null;

    function debounce(func, wait) {
        var timeout;
        return function () {
            var context = this, args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function () {
                func.apply(context, args);
            }, wait);
        };
    }

    function random(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    function getCacheKey(item) {
        return (item.original_name ? 'tv' : 'movie') + '_' + item.id;
    }

    function determineQuality(responseData) {
        if (!responseData || !responseData.quality) return null;
        if (responseData.uhd) return '4K';
        if (/(^|,\s*)ts(\s*,|$)/i.test(responseData.quality)) return 'TS';
        return 'HD';
    }

    function buildApiUrl(item) {
        var apn = random(settings.apn).trim();
        var api = random(settings.api);
        var baseUrl = (apn + api.url).replace(/\s+/g, '');
        var url = baseUrl + '?token=' + api.token;
        
        if (item.kinopoisk_id) {
            url += '&kp=' + encodeURIComponent(item.kinopoisk_id);
        } else if (item.imdb_id) {
            url += '&imdb=' + encodeURIComponent(item.imdb_id);
        } else if (item.id) {
            url += '&tmdb=' + encodeURIComponent(item.id);
        }
        return url;
    }

    function prepareCacheValue(quality, responseData) {
        return {
            quality: quality,
            rating: {
                imdb: responseData.rating_imdb,
                kp: responseData.rating_kp
            }
        };
    }

    function formatQuality(quality) {
        var schema = colorSchemas[quality.toLowerCase()] || colorSchemas.hd;
        return {
            quality: quality,
            style: {
                'background-color': schema.bg,
                'color': schema.text
            }
        };
    }

    function Cache(storageKey, cacheSize, cacheTime) {
        var self = this;
        var storage = {};

        self.save = debounce(function () {
            Lampa.Storage.set(storageKey, storage);
        }, 500);

        self.init = function () {
            storage = Lampa.Storage.get(storageKey, {});
            self.init = function () {};
        };

        self.get = function (id) {
            var memory = storage[id];
            var now = Date.now();
            var minValidTimestamp = now - cacheTime;

            if (memory && memory.timestamp > minValidTimestamp) {
                return memory.value;
            }

            var keysToRemove = [];
            for (var cacheId in storage) {
                if (storage.hasOwnProperty(cacheId)) {
                    var node = storage[cacheId];
                    if (!node || node.timestamp <= minValidTimestamp) {
                        keysToRemove.push(cacheId);
                    }
                }
            }
            for (var i = 0; i < keysToRemove.length; i++) {
                delete storage[keysToRemove[i]];
            }
            if (keysToRemove.length > 0) self.save();

            return null;
        };

        self.set = function (id, value) {
            var now = Date.now();
            var minValidTimestamp = now - cacheTime;

            var keysToRemove = [];
            for (var cacheId in storage) {
                if (storage.hasOwnProperty(cacheId)) {
                    var node = storage[cacheId];
                    if (!node || node.timestamp <= minValidTimestamp) {
                        keysToRemove.push(cacheId);
                    }
                }
            }
            for (var i = 0; i < keysToRemove.length; i++) {
                delete storage[keysToRemove[i]];
            }

            var currentSize = Object.keys(storage).length;
            if (currentSize >= cacheSize) {
                var timestamps = [];
                for (var cacheId in storage) {
                    if (storage.hasOwnProperty(cacheId)) {
                        var node = storage[cacheId];
                        if (node && node.timestamp) timestamps.push(node.timestamp);
                    }
                }
                if (timestamps.length > 0) {
                    timestamps.sort(function (a, b) { return a - b; });
                    var medianTimestamp = timestamps[Math.floor(timestamps.length / 2)];
                    for (var cacheId in storage) {
                        if (storage.hasOwnProperty(cacheId)) {
                            var node = storage[cacheId];
                            if (node && node.timestamp <= medianTimestamp) {
                                delete storage[cacheId];
                            }
                        }
                    }
                }
            }

            storage[id] = {
                timestamp: now,
                value: value
            };
            self.save();
        };
    }

    var colorSchemas = {
        'ts': { bg: '#d43737', text: 'white' },
        '4k': { bg: '#4CAF50', text: 'white' },
        'hd': { bg: '#039BE5', text: 'white' }
    };

    function renderQualityInCard(html, quality) {
        var $quality = $('.card__quality', html);
        if ($quality.length !== 1) {
            $quality = $('<div class="card__quality"><div></div></div>');
            $('.card__icons', html).after($quality);
        }
        var fmt = formatQuality(quality);
        $('div', $quality).text(fmt.quality);
        $quality.css(fmt.style);
    }

    function renderQualityInFullView($container, quality) {
        var fmt = formatQuality(quality);
        var $block = $('<div class="full-start__status">' + fmt.quality + '</div>');
        $block.css(fmt.style);
        $container.append($block);
    }

    var requestQueue = {
        queue: [],
        activeCount: 0,
        maxParallel: settings.queue.maxParallel,

        add: function (task) {
            this.queue.push(task);
            this.process();
        },

        process: function () {
            if (this.activeCount >= this.maxParallel || this.queue.length === 0) return;
            var task = this.queue.shift();
            this.activeCount++;
            task(function () {
                requestQueue.activeCount--;
                requestQueue.process();
            });
        }
    };

    function fetchQualityData(item, cacheKey, onSuccess) {
        var url = buildApiUrl(item);
        requestQueue.add(function (completeCallback) {
            Lampa.Network.silent(url, function (response) {
                completeCallback();
                if (response.status !== 'success' || !response.data) return;
                
                var quality = determineQuality(response.data);
                if (!quality) return;
                
                var cacheValue = prepareCacheValue(quality, response.data);
                cache.set(cacheKey, cacheValue);
                onSuccess(quality);
            });
        });
    }

    function enhanceCardQuality(cardComponent) {
        var card = cardComponent.data;
        if (!card || (card.source !== 'tmdb' && card.source !== 'cub') || !card.id) return;
        
        var cacheKey = getCacheKey(card);
        var cached = cache.get(cacheKey);
        
        if (cached && cached.quality) {
            renderQualityInCard(cardComponent.html, cached.quality);
            return;
        }
        
        fetchQualityData(card, cacheKey, function (quality) {
            renderQualityInCard(cardComponent.html, quality);
        });
    }

    function enhanceFullView(event) {
        if (event.type !== 'complite') return;
        
        var $render = event.object.activity.render();
        var $details = $render.find('.full-start-new__details');
        var qualityText = Lampa.Lang.translate('player_quality') + ':';
        var $qualitySpan = $details.find('span').filter(function () {
            return $(this).text().indexOf(qualityText) === 0;
        });
        $qualitySpan.prev('.full-start-new__split').addBack().remove();
        
        var movie = event.data.movie;
        if (!movie || (!movie.id && !movie.kinopoisk_id && !movie.imdb_id)) return;
        
        var cacheKey = getCacheKey(movie);
        var cached = cache.get(cacheKey);
        
        var $rateLine = $render.find('.full-start-new__rate-line');
        if (cached && cached.quality && $rateLine.length) {
            renderQualityInFullView($rateLine, cached.quality);
            return;
        }
        
        fetchQualityData(movie, cacheKey, function (quality) {
            var $currentRender = event.object.activity.render();
            var $currentRateLine = $currentRender.find('.full-start-new__rate-line');
            if ($currentRateLine.length) {
                renderQualityInFullView($currentRateLine, quality);
            }
        });
    }

    function start() {
        if (window.alloha_quality) return;
        window.alloha_quality = true;

        cache = new Cache(settings.cache.key, settings.cache.size, settings.cache.time);
        cache.init();

        var CardMaker = Lampa.Maker.map('Card');
        var originalOnVisible = CardMaker.Card.onVisible;
        CardMaker.Card.onVisible = function () {
            originalOnVisible.apply(this, arguments);
            enhanceCardQuality(this);
        };

        Lampa.Listener.follow('full', enhanceFullView);
    }

    if (window.appready) {
        start();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') start();
        });
    }
})();