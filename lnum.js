(function () {
    // Polyfills
    if (!Object.keys) { Object.keys = function getObjectKeys(o) { var r = [], k; for (k in o) { if (Object.prototype.hasOwnProperty.call(o, k)) { r.push(k); } } return r; }; }
    if (!Array.prototype.map) { Array.prototype.map = function mapArray(c, t) { if (this == null) { throw new TypeError('Array is null or undefined'); } var s = Object(this), l = s.length >>> 0; if (typeof c !== 'function') { throw new TypeError(c + ' is not a function'); } var r = new Array(l); for (var i = 0; i < l; i++) { if (i in s) { r[i] = c.call(t, s[i], i, s); } } return r; }; }
    if (!Array.prototype.forEach) { Array.prototype.forEach = function forEachArray(c, t) { if (this == null) { throw new TypeError('Array is null or undefined'); } var s = Object(this), l = s.length >>> 0; if (typeof c !== 'function') { throw new TypeError(c + ' is not a function'); } for (var i = 0; i < l; i++) { if (i in s) { c.call(t, s[i], i, s); } } }; }
    if (!Array.prototype.indexOf) { Array.prototype.indexOf = function indexOfElement(e, f) { if (this == null) { throw new TypeError('"this" is null or not defined'); } var s = Object(this), l = s.length >>> 0; if (l === 0) return -1; var i = Number(f) || 0; if (i >= l) return -1; var k = Math.max(i >= 0 ? i : l - Math.abs(i), 0); while (k < l) { if (k in s && s[k] === e) return k; k++; } return -1; }; }

    var SOURCE_NAME = 'LNUM';
    var CACHE_SIZE = 100;
    var CACHE_TIME = 1000 * 60 * 60 * 3; //3h
    var cache = {};

    var LNUM_BASE_URL = 'https://lnum.levende-develop.workers.dev';
    var LNUM_TOKEN = 'LWqtqs1k1YVVIHSP';
    var LNUM_COLLECTIONS_BASE_URL = '';
    var LNUM_COLLECTIONS_TOKEN = LNUM_TOKEN;

    var COLLECTIONS = [];

    var BASE_CATEGORIES = {
        anime: 'anime',
        movies: 'movies',
        tv: 'tv',
        cartoons: 'cartoons',
        cartoons_tv: 'cartoons_tv',
        releases: '4k',
        legends: 'legends'
    };

    var LINE_TYPES = {
        base: 'base',
        collection: 'collection'
    };

    function LNumApiService() {
        var self = this;
        self.network = new Lampa.Reguest();
        self.discovery = false;
        self.cache = {};

        function getCache(key) {
            var res = cache[key];
            if (res) {
                var cache_timestamp = Date.now() - CACHE_TIME;
                if (res.timestamp > cache_timestamp) return res.value;

                for (var ID in cache) {
                    var node = cache[ID];
                    if (!(node && node.timestamp > cache_timestamp)) delete cache[ID];
                }
            }
            return null;
        }

        function setCache(key, value) {
            var timestamp = Date.now();
            var size = Object.keys(cache).length;

            if (size >= CACHE_SIZE) {
                var cache_timestamp = timestamp - CACHE_TIME;
                for (var ID in cache) {
                    var node = cache[ID];
                    if (!(node && node.timestamp > cache_timestamp)) delete cache[ID];
                }
                size = Object.keys(cache).length;
                if (size >= CACHE_SIZE) {
                    var timestamps = [];
                    for (var ID in cache) {
                        var node = cache[ID];
                        timestamps.push(node && node.timestamp || 0);
                    }
                    timestamps.sort(function (a, b) { return a - b });
                    cache_timestamp = timestamps[Math.floor(timestamps.length / 2)];
                    for (var ID in cache) {
                        var node = cache[ID];
                        if (!(node && node.timestamp > cache_timestamp)) delete cache[ID];
                    }
                }
            }

            cache[key] = {
                timestamp: timestamp,
                value: value
            };
        }

        function normalizeData(json) {
            return {
                results: (json.results || []).map(function (item) {
                    return {
                        id: item.id,
                        name: item.name || item.title,
                        original_name: item.original_name || item.original_title || item.name || 'Unknown',
                        number_of_seasons: item.number_of_seasons,
                        seasons: item.seasons,
                        last_episode_to_air: item.last_episode_to_air,
                        first_air_date: item.first_air_date,
                        release_date: item.release_date,
                        poster_path: item.poster_path || item.poster || item.img || '',
                        overview: item.overview || item.description || '',
                        vote_average: item.vote_average || 0,
                        vote_count: item.vote_count || 0,
                        backdrop_path: item.backdrop_path || item.backdrop || '',
                        still_path: item.still_path || '',
                        source: SOURCE_NAME,
                        release_quality: item.release_quality || '',
                    }
                }),
                page: json.page || 1,
                total_pages: json.total_pages || json.pagesCount || 1,
                total_results: json.total_results || json.total || 0
            };
        }

        function getFromCache(url, params, onComplete, onError) {
            var json = getCache(url);
            if (json) {
                onComplete(normalizeData(json));
            } else {
                self.get(url, params, onComplete, onError);
            }
        }

        self.get = function (url, params, onComplete, onError) {
            self.network.silent(url, function (json) {
                if (!json) {
                    onError(new Error('Empty response from server'));
                    return;
                }
                var normalizedJson = normalizeData(json);
                setCache(url, normalizedJson);
                onComplete(normalizedJson);
            }, function (error) {
                onError(error);
            });
        };

        self.list = function (params, onComplete, onError) {
            params = params || {};
            onComplete = onComplete || function () { };
            onError = onError || function () { };

            var targetParam = (params.url || LINE_TYPES.base + '__' + BASE_CATEGORIES.releases).split('__');
            var baseUrl = getBaseUrl(targetParam[0]);
            var token = getToken(targetParam[0]);
            var id = targetParam[1];

            var page = params.page || 1;
            var url = baseUrl + '/' + id + '?page=' + page + '&language=' + Lampa.Storage.get('tmdb_lang', 'ru') + '&api_key=' + Lampa.TMDB.key() + '&lnum_token=' + token;

            getFromCache(url, params, function (json) {
                if (!json.results) {
                    onError(new Error('Invalid cached data'));
                    return;
                }
                onComplete({
                    results: json.results || [],
                    page: json.page || page,
                    total_pages: json.total_pages || 1,
                    total_results: json.total_results || 0
                });
            }, onError);
        };

        self.full = function (params, onSuccess, onError) {
            var card = params.card;
            params.method = !!(card.number_of_seasons || card.seasons || card.last_episode_to_air || card.first_air_date) ? 'tv' : 'movie';

            Lampa.Api.sources.tmdb.full(params, onSuccess, onError);
        }

        self.category = function (params, onSuccess, onError) {
            params = params || {};

            var partsLimit = 5;

            var partsData = [
                function (callback) {
                    makeRequest(LINE_TYPES.base, BASE_CATEGORIES.releases, Lampa.Lang.translate('title_in_high_quality'), callback);
                },
                function (callback) {
                    callback({
                        source: 'tmdb',
                        results: Lampa.TimeTable.lately().slice(0, 20),
                        title: Lampa.Lang.translate('title_upcoming_episodes'),
                        nomore: true,
                        cardClass: function (elem, params) {
                            return new Episode(elem, params);
                        }
                    });
                },
                function (callback) {
                    makeRequest(LINE_TYPES.base, BASE_CATEGORIES.movies, Lampa.Lang.translate('menu_movies'), callback);
                },
                function (callback) {
                    makeRequest(LINE_TYPES.base, BASE_CATEGORIES.tv, Lampa.Lang.translate('menu_tv'), callback);
                },
                function (callback) {
                    makeRequest(LINE_TYPES.base, BASE_CATEGORIES.cartoons, Lampa.Lang.translate('menu_multmovie'), callback);
                },
                function (callback) {
                    makeRequest(LINE_TYPES.base, BASE_CATEGORIES.cartoons_tv, Lampa.Lang.translate('menu_multtv'), callback);
                },
                function (callback) {
                    makeRequest(LINE_TYPES.base, BASE_CATEGORIES.anime, Lampa.Lang.translate('menu_anime'), callback);
                },
                function (callback) {
                    makeRequest(LINE_TYPES.base, BASE_CATEGORIES.legends, Lampa.Lang.translate('title_top_movie'), callback);
                }
            ];

            function makeRequest(lineType, lineId, title, callback) {
                var baseUrl = getBaseUrl(lineType);
                var lang = Lampa.Storage.get('tmdb_lang', 'ru');
                var token = getToken(lineType);
                var page = params.page || 1;
                var url = baseUrl + '/' + lineId + '?language=' + lang + '&page=' + page + '&api_key=' + Lampa.TMDB.key() + '&lnum_token=' + token;

                getFromCache(url, params, function (json) {
                    var result = {
                        url: lineType + '__' + lineId,
                        title: title,
                        page: page,
                        total_results: json.total_results || 0,
                        total_pages: json.total_pages || 1,
                        more: json.total_pages > page,
                        results: json.results || [],
                        source: SOURCE_NAME
                    };
                    callback(result);
                }, function (error) {
                    callback({ error: error });
                });
            }

            function loadPart(partLoaded, partEmpty) {
                Lampa.Api.partNext(partsData, partsLimit, function (result) {
                    partLoaded(result);
                }, function (error) {
                    partEmpty(error);
                });
            }

            loadPart(onSuccess, onError);
            return loadPart;
        };

        function getBaseUrl(lineType) {
            switch (lineType) {
                case LINE_TYPES.base: return LNUM_BASE_URL;
                case LINE_TYPES.collection: return LNUM_COLLECTIONS_BASE_URL;
            }
        }

        function getToken(lineType) {
            switch (lineType) {
                case LINE_TYPES.base: return LNUM_TOKEN;
                case LINE_TYPES.collection: return LNUM_COLLECTIONS_TOKEN;
            }
        }
    }

    function Episode(data) {
        var self = this;
        var card = data.card || data;
        var episode = data.next_episode_to_air || data.episode || {};
        if (card.source === undefined) {
            card.source = SOURCE_NAME;
        }
        Lampa.Arrays.extend(card, {
            title: card.name,
            original_title: card.original_name,
            release_date: card.first_air_date
        });
        card.release_year = ((card.release_date || '0000') + '').slice(0, 4);

        function remove(elem) {
            if (elem) {
                elem.remove();
            }
        }

        self.build = function () {
            self.card = Lampa.Template.js('card_episode');
            if (!self.card) {
                Lampa.Noty.show('Error: card_episode template not found');
                return;
            }
            self.img_poster = self.card.querySelector('.card__img') || {};
            self.img_episode = self.card.querySelector('.full-episode__img img') || {};
            self.card.querySelector('.card__title').innerText = card.title || 'No title';
            self.card.querySelector('.full-episode__num').innerText = card.unwatched || '';
            if (episode && episode.air_date) {
                self.card.querySelector('.full-episode__name').innerText = 's' + (episode.season_number || '?') + 'e' + (episode.episode_number || '?') + '. ' + (episode.name || Lampa.Lang.translate('noname'));
                self.card.querySelector('.full-episode__date').innerText = episode.air_date ? Lampa.Utils.parseTime(episode.air_date).full : '----';
            }

            if (card.release_year === '0000') {
                remove(self.card.querySelector('.card__age'));
            } else {
                self.card.querySelector('.card__age').innerText = card.release_year;
            }

            self.card.addEventListener('visible', self.visible);
        };

        self.image = function () {
            self.img_poster.onload = function () { };
            self.img_poster.onerror = function () {
                self.img_poster.src = './img/img_broken.svg';
            };
            self.img_episode.onload = function () {
                self.card.querySelector('.full-episode__img').classList.add('full-episode__img--loaded');
            };
            self.img_episode.onerror = function () {
                self.img_episode.src = './img/img_broken.svg';
            };
        };

        self.visible = function () {
            if (card.poster_path) {
                self.img_poster.src = Lampa.Api.img(card.poster_path);
            } else if (card.profile_path) {
                self.img_poster.src = Lampa.Api.img(card.profile_path);
            } else if (card.poster) {
                self.img_poster.src = card.poster;
            } else if (card.img) {
                self.img_poster.src = card.img;
            } else {
                self.img_poster.src = './img/img_broken.svg';
            }
            if (card.still_path) {
                self.img_episode.src = Lampa.Api.img(episode.still_path, 'w300');
            } else if (card.backdrop_path) {
                self.img_episode.src = Lampa.Api.img(card.backdrop_path, 'w300');
            } else if (episode.img) {
                self.img_episode.src = episode.img;
            } else if (card.img) {
                self.img_episode.src = card.img;
            } else {
                self.img_episode.src = './img/img_broken.svg';
            }
            if (self.onVisible) {
                self.onVisible(self.card, card);
            }
        };

        self.create = function () {
            self.build();
            self.card.addEventListener('hover:focus', function () {
                if (self.onFocus) {
                    self.onFocus(self.card, card);
                }
            });
            self.card.addEventListener('hover:hover', function () {
                if (self.onHover) {
                    self.onHover(self.card, card);
                }
            });
            self.card.addEventListener('hover:enter', function () {
                if (self.onEnter) {
                    self.onEnter(self.card, card);
                }
            });
            self.image();
        };

        self.destroy = function () {
            self.img_poster.onerror = function () { };
            self.img_poster.onload = function () { };
            self.img_episode.onerror = function () { };
            self.img_episode.onload = function () { };
            self.img_poster.src = '';
            self.img_episode.src = '';
            remove(self.card);
            self.card = null;
            self.img_poster = null;
            self.img_episode = null;
        };

        self.render = function (js) {
            return js ? self.card : $(self.card);
        };
    }

    function startPlugin() {
        if (window.lnum_plugin) {
            return;
        }
        window.lnum_plugin = true;

        if (Lampa.Storage.field('start_page') === SOURCE_NAME) {
            window.start_deep_link = {
                component: 'category',
                page: 1,
                url: '',
                source: SOURCE_NAME,
                title: SOURCE_NAME
            };
        }

        var values = Lampa.Params.values.start_page;
        values[SOURCE_NAME] = SOURCE_NAME;

        Lampa.Lang.add({
            title_in_high_quality: {
                en: 'In high quality',
                uk: 'У високій якості'
            }
        });

        var lNumApi = new LNumApiService();
        Lampa.Api.sources.num = lNumApi;
        Object.defineProperty(Lampa.Api.sources, SOURCE_NAME, {
            get: function () {
                return lNumApi;
            }
        });

        var menuItem = $('<li data-action="lnum" class="menu__item selector"><div class="menu__ico"><svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><g><g><path fill="currentColor" d="M482.909,67.2H29.091C13.05,67.2,0,80.25,0,96.291v319.418C0,431.75,13.05,444.8,29.091,444.8h453.818c16.041,0,29.091-13.05,29.091-29.091V96.291C512,80.25,498.95,67.2,482.909,67.2z M477.091,409.891H34.909V102.109h442.182V409.891z"/></g></g><g><g><rect fill="currentColor" x="126.836" y="84.655" width="34.909" height="342.109"/></g></g><g><g><rect fill="currentColor" x="350.255" y="84.655" width="34.909" height="342.109"/></g></g><g><g><rect fill="currentColor" x="367.709" y="184.145" width="126.836" height="34.909"/></g></g><g><g><rect fill="currentColor" x="17.455" y="184.145" width="126.836" height="34.909"/></g></g><g><g><rect fill="currentColor" x="367.709" y="292.364" width="126.836" height="34.909"/></g></g><g><g><rect fill="currentColor" x="17.455" y="292.364" width="126.836" height="34.909"/></g></g></svg></div><div class="menu__text">LNUM</div></li>');
        $('.menu .menu__list').eq(0).append(menuItem);

        menuItem.on('hover:enter', function () {
            Lampa.Activity.push({
                title: SOURCE_NAME,
                component: 'category',
                source: SOURCE_NAME,
                page: 1
            });
        });
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