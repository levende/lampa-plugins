(function () {
    // Polyfills
    if (!Object.keys) { Object.keys = function getObjectKeys(o) { var r = [], k; for (k in o) { if (Object.prototype.hasOwnProperty.call(o, k)) { r.push(k); } } return r; }; }
    if (!Array.prototype.map) { Array.prototype.map = function mapArray(c, t) { if (this == null) { throw new TypeError('Array is null or undefined'); } var s = Object(this), l = s.length >>> 0; if (typeof c !== 'function') { throw new TypeError(c + ' is not a function'); } var r = new Array(l); for (var i = 0; i < l; i++) { if (i in s) { r[i] = c.call(t, s[i], i, s); } } return r; }; }
    if (!Array.prototype.forEach) { Array.prototype.forEach = function forEachArray(c, t) { if (this == null) { throw new TypeError('Array is null or undefined'); } var s = Object(this), l = s.length >>> 0; if (typeof c !== 'function') { throw new TypeError(c + ' is not a function'); } for (var i = 0; i < l; i++) { if (i in s) { c.call(t, s[i], i, s); } } }; }
    if (!Array.prototype.indexOf) { Array.prototype.indexOf = function indexOfElement(e, f) { if (this == null) { throw new TypeError('"this" is null or not defined'); } var s = Object(this), l = s.length >>> 0; if (l === 0) return -1; var i = Number(f) || 0; if (i >= l) return -1; var k = Math.max(i >= 0 ? i : l - Math.abs(i), 0); while (k < l) { if (k in s && s[k] === e) return k; k++; } return -1; }; }

    addTranslates();

    var ICON = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><g><g><path fill="currentColor" d="M482.909,67.2H29.091C13.05,67.2,0,80.25,0,96.291v319.418C0,431.75,13.05,444.8,29.091,444.8h453.818c16.041,0,29.091-13.05,29.091-29.091V96.291C512,80.25,498.95,67.2,482.909,67.2z M477.091,409.891H34.909V102.109h442.182V409.891z"/></g></g><g><g><rect fill="currentColor" x="126.836" y="84.655" width="34.909" height="342.109"/></g></g><g><g><rect fill="currentColor" x="350.255" y="84.655" width="34.909" height="342.109"/></g></g><g><g><rect fill="currentColor" x="367.709" y="184.145" width="126.836" height="34.909"/></g></g><g><g><rect fill="currentColor" x="17.455" y="184.145" width="126.836" height="34.909"/></g></g><g><g><rect fill="currentColor" x="367.709" y="292.364" width="126.836" height="34.909"/></g></g><g><g><rect fill="currentColor" x="17.455" y="292.364" width="126.836" height="34.909"/></g></g></svg>';

    var SESSION_ID = '';

    var HIDE_MENU = false;

    var SOURCE_NAME = 'LNUM';
    var CACHE_SIZE = 100;
    var CACHE_TIME = 1000 * 60 * 60 * 3; //3h
    var cache = {};

    var LNUM_BASE_URL = 'https://lnum.levende-develop.workers.dev';
    var LNUM_TOKEN = 'LWqtqs1k1YVVIHSP';
    var LNUM_COLLECTIONS_BASE_URL = 'https://lnum-collections.levende-develop.workers.dev/list';
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

    var CAT_NAME = SOURCE_NAME;

    var DISPLAY_OPTIONS = {
        releases: {
            title: Lampa.Lang.translate('title_in_high_quality')
        },
        episodes: {
            title: Lampa.Lang.translate('title_upcoming_episodes')
        },
        movies: {
            title: Lampa.Lang.translate('menu_movies')
        },
        tv: {
            title: Lampa.Lang.translate('menu_tv')
        },
        cartoons: {
            title: Lampa.Lang.translate('menu_multmovie')
        },
        cartoons_tv: {
            title: Lampa.Lang.translate('menu_multtv')
        },
        anime: {
            title: Lampa.Lang.translate('menu_anime')
        },
        legends: {
            title: Lampa.Lang.translate('title_top_movie')
        },
        collections: {
            title: Lampa.Lang.translate('collections')
        }
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
                    var dataItem = {
                        id: item.id,
                        poster_path: item.poster_path || item.poster || '',
                        img: item.img,
                        overview: item.overview || item.description || '',
                        vote_average: item.vote_average || 0,
                        backdrop_path: item.backdrop_path || item.backdrop || '',
                        background_image: item.background_image,
                        source: SOURCE_NAME
                    };

                    if (!!item.release_quality) dataItem.release_quality = item.release_quality;

                    if (!!item.name) dataItem.name = item.name;
                    if (!!item.title) dataItem.title = item.title;
                    if (!!item.original_name) dataItem.original_name = item.original_name;
                    if (!!item.original_title) dataItem.original_title = item.original_title;

                    if (!!item.release_date) dataItem.release_date = item.release_date;
                    if (!!item.first_air_date) dataItem.first_air_date = item.first_air_date;
                    if (!!item.number_of_seasons) dataItem.number_of_seasons = item.number_of_seasons;
                    if (!!item.last_air_date) dataItem.last_air_date = item.last_air_date;
                    if (!!item.last_episode_to_air) dataItem.last_episode_to_air = item.last_episode_to_air;

                    dataItem.promo_title = dataItem.name || dataItem.title || dataItem.original_name || dataItem.original_title;
                    dataItem.promo = dataItem.overview;

                    return dataItem;
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
            var lineType = targetParam[0];
            var baseUrl = getBaseUrl(lineType);
            var token = getToken(lineType);
            var id = targetParam[1];
            var page = params.page || 1;

            var url = baseUrl + '/' + id + '?page=' + page + '&language=' + Lampa.Storage.get('tmdb_lang', 'ru') + '&api_key=' + Lampa.TMDB.key() + '&lnum_token=' + token + '&session_id=' + SESSION_ID;

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
            var partsData = [];

            if (DISPLAY_OPTIONS.releases.visible) {
                partsData.push(function (callback) {
                    makeRequest(LINE_TYPES.base, BASE_CATEGORIES.releases, DISPLAY_OPTIONS.releases.title, callback);
                });
            }

            if (DISPLAY_OPTIONS.episodes.visible) {  
                var addEpisodes = Lampa.Manifest.app_digital >= 300
                    ? addEpisodesV3
                    : addEpisodesV2;

                addEpisodes(partsData);
            }

            if (DISPLAY_OPTIONS.movies.visible) {
                partsData.push(function (callback) {
                    makeRequest(LINE_TYPES.base, BASE_CATEGORIES.movies, DISPLAY_OPTIONS.movies.title, callback);
                });
            }

            if (DISPLAY_OPTIONS.tv.visible) {
                partsData.push(function (callback) {
                    makeRequest(LINE_TYPES.base, BASE_CATEGORIES.tv, DISPLAY_OPTIONS.tv.title, callback);
                });
            }

            if (DISPLAY_OPTIONS.cartoons.visible) {
                partsData.push(function (callback) {
                    makeRequest(LINE_TYPES.base, BASE_CATEGORIES.cartoons, DISPLAY_OPTIONS.cartoons.title, callback);
                });
            }

            if (DISPLAY_OPTIONS.cartoons_tv.visible) {
                partsData.push(function (callback) {
                    makeRequest(LINE_TYPES.base, BASE_CATEGORIES.cartoons_tv, DISPLAY_OPTIONS.cartoons_tv.title, callback);
                });
            }

            if (DISPLAY_OPTIONS.anime.visible) {
                partsData.push(function (callback) {
                    makeRequest(LINE_TYPES.base, BASE_CATEGORIES.anime, DISPLAY_OPTIONS.anime.title, callback);
                });
            }

            if (DISPLAY_OPTIONS.legends.visible) {
                partsData.push(function (callback) {
                    makeRequest(LINE_TYPES.base, BASE_CATEGORIES.legends, DISPLAY_OPTIONS.legends.title, callback);
                });
            }

            function loadCollectionsAndProceed() {
                if (COLLECTIONS.length > 0) {
                    var collectionLines = [];
                    COLLECTIONS.forEach(function (collectionSrc) {
                        collectionSrc.list.forEach(function (collectionName, index) {
                            collectionLines.push(function (callback) {
                                makeRequest(LINE_TYPES.collection, '/' + collectionSrc.name + '/' + index, collectionName, callback, true);
                            });
                        });
                    });
                }

                partsData = partsData.concat(getCollectionLines());

                function loadPart(partLoaded, partEmpty) {
                    Lampa.Api.partNext(partsData, partsLimit, function (result) {
                        partLoaded(result);
                    }, function (error) {
                        partEmpty(error);
                    });
                }

                loadPart(onSuccess, onError);
                return loadPart;
            }

            if (COLLECTIONS.length === 0) {
                self.network.silent(LNUM_COLLECTIONS_BASE_URL + '?session_id=' + SESSION_ID + '&lnum_token=' + LNUM_TOKEN, function (json) {
                    if (json.success) {
                        COLLECTIONS = json.results;
                        return loadCollectionsAndProceed();
                    } else {
                        onError(new Error('Failed to load collections'));
                    }
                }, function (error) {
                    onError(error);
                });
            } else {
                return loadCollectionsAndProceed();
            }

            function getCollectionLines() {
                var collectionLinesRaw = [];

                if (!DISPLAY_OPTIONS.collections.visible || COLLECTIONS.length === 0) {
                    return [];
                }

                COLLECTIONS.forEach(function (collectionSrc) {
                    for (var i = 0; i < collectionSrc.list.length; i++) {
                        collectionLinesRaw.push({
                            path: '/' + collectionSrc.name + '/' + (i + 1),
                            name: collectionSrc.list[i]
                        });
                    }
                });

                function shuffle(array) {
                    var i = array.length, j, temp;
                    while (--i > 0) {
                        j = Math.floor(Math.random() * (i + 1));
                        temp = array[i];
                        array[i] = array[j];
                        array[j] = temp;
                    }
                }
                shuffle(collectionLinesRaw);

                var finalLines = [];
                var previousHadTrue = false;

                for (var i = 0; i < collectionLinesRaw.length; i++) {
                    var item = collectionLinesRaw[i];
                    var useTrue = false;

                    if (!previousHadTrue && Math.random() < 0.28) {
                        useTrue = true;
                        previousHadTrue = true;
                    } else {
                        previousHadTrue = false;
                    }

                    finalLines.push((function (path, name, useTrueFlag) {
                        return function (callback) {
                            makeRequest(LINE_TYPES.collection, path, name, callback, useTrueFlag);
                        };
                    })(item.path, item.name, useTrue));
                }

                return finalLines;
            }

            function addEpisodesV2(partsData) {
                partsData.push(function (callback) {
                    callback({
                        source: 'tmdb',
                        results: Lampa.TimeTable.lately().slice(0, 20),
                        title: DISPLAY_OPTIONS.episodes.title,
                        nomore: true,
                        cardClass: function (elem, params) {
                            return new Episode(elem, params);
                        }
                    });
                });
            }

            function addEpisodesV3(partsData) {
                partsData.push(function (callback) {  
                    var results = Lampa.TimeTable.lately().slice(0, 20);  
                    
                    results.forEach(function(item) {  
                        item.params = {  
                            createInstance: function(data) {  
                                return Lampa.Maker.make('Episode', data, function(module) {  
                                    return module.only('Card', 'Callback');  
                                });  
                            },  
                            emit: {  
                                onlyEnter: function() {  
                                    Lampa.Router.call('full', item.card);  
                                },  
                                onlyFocus: function() {  
                                    Lampa.Background.change(Lampa.Utils.cardImgBackgroundBlur(item.card));  
                                }  
                            }  
                        };  
                        
                        Lampa.Arrays.extend(item, item.episode);  
                    });  
                    
                    callback({  
                        source: 'tmdb',  
                        results: results,  
                        title: DISPLAY_OPTIONS.episodes.title,  
                        nomore: true  
                    });  
                });
            }

            function makeRequest(lineType, lineId, title, callback, wide) {
                if (wide === undefined) {
                    wide = false;
                }

                var baseUrl = getBaseUrl(lineType);
                var lang = Lampa.Storage.get('tmdb_lang', 'ru');
                var token = getToken(lineType);
                var page = 1;
                var url = baseUrl + '/' + lineId + '?language=' + lang + '&page=' + page + '&api_key=' + Lampa.TMDB.key() + '&lnum_token=' + token + '&session_id=' + SESSION_ID;

                getFromCache(url, params, function (json) {
                    var result = {
                        url: lineType + '__' + lineId,
                        title: title,
                        page: page,
                        total_results: json.total_results || 0,
                        total_pages: json.total_pages || 1,
                        more: json.total_pages > page,
                        results: json.results || [],
                        source: SOURCE_NAME,
                        small: wide,
                        wide: wide
                    };
                    callback(result);
                }, function (error) {
                    callback({ error: error });
                });
            }
        };

        self.clear = function () {
            self.network.clear();
        }

        self.person = function (params, onSuccess, onError) {
            Lampa.Api.sources.tmdb.person(params, onSuccess, onError);
        }

        self.seasons = function (params, onSuccess, onError) {
            Lampa.Api.sources.tmdb.seasons(params, onSuccess, onError);
        }

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

    function addTranslates() {

        Lampa.Lang.add({
            title_in_high_quality: {
                en: 'In high quality',
                uk: 'У високій якості'
            },
            donate: {
                en: 'Donate',
                uk: 'Підтримати',
                ru: 'Поддержать'
            },
            donate_title: {
                en: 'Thank you for using the LNUM plugin',
                uk: 'Дякую, що користуєшься плагіном LNUM',
                ru: 'Спасибо, что пользуетесь плагином LNUM'
            },
            donate_text: {
                en: "If you enjoy the plugin, buy me a coffee — it'll fuel the plugin's growth and new projects!",
                uk: 'Якщо Вам подобається плагін, пригостіть мене кавою — це дасть енергії для розвитку та нових проектів!',
                ru: 'Если Вам нравится работа плагина, угостите меня кофе — это даст заряд для развития плагина и новых проектов!'
            },
            donate_footer: {
                en: 'Want to say thanks another way? Message me on Telegram:',
                uk: 'Хочете подякувати інакше? Пишіть у Telegram:',
                ru: 'Хотите отблагодарить иначе? Напишите в Telegram:'
            },
            collections: {
                en: 'Collections',
                uk: 'Колекції',
                ru: 'Коллекции'
            },
            lnum_title: {
                en: 'Title',
                uk: 'Назва',
                ru: 'Название'
            },
            lnum_title_desc: {
                en: 'Enter a title instead of ',
                uk: 'Введіть назву замість ',
                ru: 'Введите своё название вместо '
            },
            lnum_select_visibility: {
                en: 'Select whether the category will be visible',
                uk: 'Виберіть чи буде відображатися категорія',
                ru: 'Выберете будет ли отображаться категория'
            }
        });
    }

    function startPlugin() {
        if (window.lnum_plugin) {
            return;
        }
        window.lnum_plugin = true;

        Lampa.Utils.putScriptAsync(['https://levende.github.io/lampa-plugins/listener-extensions.js'], function () {
            Lampa.Listener.follow('card', function (event) {
                if (event.type === 'build' && event.object.data.id === 'lnum_promo') {
                    if ($(event.object.card).hasClass('card--wide')) {
                        event.object.data.img = event.object.data.background_image;
                        $('.card__promo', event.object.card).remove();
                    }

                    var $donateBar = $('<div style="z-index: 50; position: absolute;left: -0.8em;top: 1.4em;padding: 0.4em 0.4em;background: #800020;color: #fff;font-size: 0.8em;-webkit-border-radius: 0.3em;-moz-border-radius: 0.3em;border-radius: 0.3em;" class="card__type">' + Lampa.Lang.translate('donate') + '</div>');
                    $('.card__icons', event.object.card).after($donateBar);

                    event.object.card.on('hover:enter', function (e) {
                        var $header = $('<div><p>' + Lampa.Lang.translate('donate_text') + '</p></div>');
                        var $wallets = $('<div style="overflow:hidden;margin:2em 2em;"><div class="wallet selector" style="display:inline-block;width:45%;vertical-align:top;margin:0 2%;"><div><span class="account-add-device__site">USDT TRC20</span></div><img style="margin-top: 1em;" src="https://quickchart.io/qr?text=TTv2ufWrx6M7BrwtSjVoHGgAtkpFXBgowv&size=200" alt="USDT TRC20 QR Code"><p style="overflow-wrap: break-word; margin: 1em 0;">TTv2ufWrx6M7BrwtSjVoHGgAtkpFXBgowv</p></div><div class="wallet selector" style="display:inline-block;width:45%;vertical-align:top;margin:0 2%;"><div><span class="account-add-device__site">Toncoin</span></div><img style="margin-top: 1em;" src="https://quickchart.io/qr?text=UQBdsCYCjQ5v7b34SysE7XS3ncsHJKJp-gby5dniS5w3mMnV&size=200" alt="TON QR Code"><p style="overflow-wrap: break-word; margin: 1em 0;">UQBdsCYCjQ5v7b34SysE7XS3ncsHJKJp-gby5dniS5w3mMnV</p></div></div>');
                        var $footer = $('<div><p>' + Lampa.Lang.translate('donate_footer') + ' <span class="account-add-device__site" style="color: #fff; background-color: #0088cc;">@levende</span></p></div>');

                        $('.wallet', $wallets).on('hover:enter', function() {
                            $walletAddress = $('p', $(this)).text();
                            Lampa.Utils.copyTextToClipboard($walletAddress, function() {
                                Lampa.Noty.show(Lampa.Lang.translate('copy_secuses'))
                            }, function() {
                                Lampa.Noty.show(Lampa.Lang.translate('copy_error'));
                            });
                        });

                        var $html = $('<div></div>');

                        $html.append($header);
                        $html.append($wallets);
                        $html.append($footer);

                        Lampa.Modal.open({
                            title: Lampa.Lang.translate('donate_title'),
                            html: $html,
                            size: 'medium',
                            align: 'center',
                            onBack: function () {
                                Lampa.Modal.close();
                                Lampa.Controller.toggle('content');
                            }
                        });

                        e.stopImmediatePropagation();
                    })
                }
            });
        });

        CAT_NAME = Lampa.Storage.get('lnum_settings_cat_name', SOURCE_NAME);

        if (Lampa.Storage.field('start_page') === SOURCE_NAME) {
            window.start_deep_link = {
                component: 'category',
                page: 1,
                url: '',
                source: SOURCE_NAME,
                title: CAT_NAME
            };
        }

        var values = Lampa.Params.values.start_page;
        values[SOURCE_NAME] = CAT_NAME;

        Lampa.SettingsApi.addComponent({
            component: 'lnum_settings',
            name: CAT_NAME,
            icon: ICON
        });

        Lampa.SettingsApi.addParam({
            component: 'lnum_settings',
            param: {
                name: 'lnum_settings_cat_name',
                type: 'input',
                placeholder: '',
                values: '',
                default: CAT_NAME
            },
            field: {
                name: Lampa.Lang.translate('lnum_title'),
                description: Lampa.Lang.translate('lnum_title_desc') + SOURCE_NAME
            },
            onChange: function (value) {
                CAT_NAME = value;
                $('.lnum_cat_text').text(value);
                Lampa.Settings.update();
            }
        });

        Object.keys(DISPLAY_OPTIONS).forEach(function(option) {
            var settingName = 'lnum_settings_' + option + '_visible';

            var visible = Lampa.Storage.get(settingName, "true").toString() === "true";
            DISPLAY_OPTIONS[option].visible = visible;

            Lampa.SettingsApi.addParam({
                component: "lnum_settings",
                param: {
                    name: settingName,
                    type: "trigger",
                    default: visible
                },
                field: {
                    name: DISPLAY_OPTIONS[option].title,
                    description: Lampa.Lang.translate('lnum_select_visibility')
                },
                onChange: function(value) {
                    DISPLAY_OPTIONS[option].visible = value === "true";
                }
            });
        });

        SESSION_ID = Lampa.Utils.uid();

        var overrideSettings = window.lnum_settings || {};

        LNUM_TOKEN = overrideSettings.token || LNUM_COLLECTIONS_TOKEN;
        LNUM_COLLECTIONS_TOKEN = overrideSettings.token || LNUM_COLLECTIONS_TOKEN;

        var lNumApi = new LNumApiService();
        Lampa.Api.sources.num = lNumApi;
        Object.defineProperty(Lampa.Api.sources, SOURCE_NAME, {
            get: function () {
                return lNumApi;
            }
        });

        var network = new Lampa.Reguest();
        network.silent(LNUM_COLLECTIONS_BASE_URL + '?session_id=' + SESSION_ID + '&lnum_token=' + LNUM_TOKEN, function (json) {
            if (json.success) {
                COLLECTIONS = json.results;
            }
        });

        var hideMenu = !!overrideSettings.hideMenu || HIDE_MENU;

        if (!hideMenu) {
            var menuItem = $('<li data-action="lnum" class="menu__item selector"><div class="menu__ico">' + ICON + '</div><div class="menu__text lnum_cat_text">' + CAT_NAME + '</div></li>');
            $('.menu .menu__list').eq(0).append(menuItem);

            menuItem.on('hover:enter', function () {
                Lampa.Activity.push({
                    title: CAT_NAME,
                    component: 'category',
                    source: SOURCE_NAME,
                    page: 1
                });
            });
        }
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
