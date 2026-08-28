(function () {
    'use strict';

    if (window.__lampac_anti_dmca) return;
    window.__lampac_anti_dmca = true;

    window.lampa_settings = window.lampa_settings || {};
    window.lampa_settings.dcma = false;
    window.lampa_settings.disable_features = window.lampa_settings.disable_features || {};
    window.lampa_settings.disable_features.dmca = true;

    function normalizeCard(card) {
        if (!card || typeof card !== 'object') return;
        if (!card.title) card.title = card.name || card.original_title || card.original_name || '';
        if (!card.original_title) card.original_title = card.original_name || card.title;
        if (!Array.isArray(card.production_countries)) card.production_countries = [];
        if (!Array.isArray(card.production_companies)) card.production_companies = [];
        if (!Array.isArray(card.genres)) card.genres = [];
    }

    // Дописывать поля карточки в произвольный ответ нельзя: чужие плагины делают
    // for (var i in result) и падают на подсунутых ключах. Поэтому — только списки
    // (results[]) и только объекты, которые реально являются карточкой (есть id).
    function normalizeData(data) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) return;
        if ('results' in data && !Array.isArray(data.results)) data.results = [];
        if (Array.isArray(data.results)) data.results.forEach(normalizeCard);
        else if (data.id) normalizeCard(data);
        if (data.movie) normalizeCard(data.movie);
    }

    function patchParseCountries() {
        var candidates = [];

        if (window.Lampa) {
            if (window.Lampa.TMDB) candidates.push(window.Lampa.TMDB);
            if (window.Lampa.Api && window.Lampa.Api.sources) {
                if (window.Lampa.Api.sources.tmdb) candidates.push(window.Lampa.Api.sources.tmdb);
                if (window.Lampa.Api.sources.cub) candidates.push(window.Lampa.Api.sources.cub);
            }
        }

        candidates.forEach(function (obj) {
            if (obj && typeof obj.parseCountries === 'function' && !obj.__anti_dmca_patched) {
                var _orig = obj.parseCountries;
                obj.parseCountries = function (movie) {
                    var result;
                    try { result = _orig.apply(this, arguments); }
                    catch (e) { result = []; }
                    return Array.isArray(result) ? result : [];
                };
                obj.__anti_dmca_patched = true;
            }
        });

        return candidates.length > 0;
    }

    function start() {
        if (Lampa && Lampa.Utils) {
            Lampa.Utils.dcma = function () { return false; };
        }

        if (!patchParseCountries()) {
            var _patchTimer = setInterval(function () {
                if (patchParseCountries()) clearInterval(_patchTimer);
            }, 100);
            setTimeout(function () { clearInterval(_patchTimer); }, 15000);
        }

        Lampa.Listener.follow('request_secuses', function (event) {
            if (!event || !event.data) return;

            var url = (event.params && event.params.url) || '';

            // Детальный запрос карточки — единственный, где сервер шлёт заглушку {blocked:true}
            // вместо полных данных. У обоих источников (tmdb и cub) он содержит append_to_response.
            var isDetail = url.indexOf('append_to_response') >= 0;

            // URL бывает api.themoviedb.org/3/movie/1 (tmdb), tmdb.<cub>/3/movie/1 (cub)
            // или через прокси — без /api/, поэтому матчим только /movie/<id> | /tv/<id>
            var match = url.match(/\/(movie|tv)\/(\d+)/);

            // Нормализуем ТОЛЬКО ответы TMDB API. Ответы остальных плагинов (таймкоды,
            // онлайн-балансеры) трогать нельзя — там свои форматы.
            if (url.indexOf('/3/') < 0 && !match) return;

            var d = event.data;

            try { normalizeData(d); } catch (e) {}

            // Заглушку определяем не только по флагу blocked: в кэше (7 дней) могла осесть
            // заглушка с уже сброшенным blocked=false. У настоящей карточки всегда есть id и title/name.
            var stripped = isDetail && (!d.id || !(d.title || d.name));

            if (!d.blocked && !stripped) return;

            if (!isDetail || !match) {
                // Не детальная карточка: снять флаг можно, данные уже нормализованы выше
                if (!isDetail) d.blocked = false;
                // isDetail без match — оставляем blocked: пусть покажет штатный DMCA-экран, а не упадёт
                return;
            }

            if (typeof event.abort !== 'function') return; // android_go шлёт событие без abort

            var sendSecuses = event.abort();

            // Берём хвост оригинального URL (/movie/123?append_to_response=...&language=..)
            // и шлём его напрямую в TMDB — сохраняются все параметры, включая external_ids и images
            var tail = url.slice(url.search(/\/(movie|tv)\/\d+/));
            tail = tail.replace(/&?email=[^&]*/g, '');

            var tmdbUrl = 'https://api.themoviedb.org/3' + tail;

            if (tmdbUrl.indexOf('api_key=') < 0) {
                var tmdbKey = (Lampa.TMDB && typeof Lampa.TMDB.key === 'function') ? Lampa.TMDB.key() : '4ef0d7355d9ffb5151e987764708ce96';
                tmdbUrl += (tmdbUrl.indexOf('?') >= 0 ? '&' : '?') + 'api_key=' + tmdbKey;
            }
            if (tmdbUrl.indexOf('language=') < 0) {
                tmdbUrl += '&language=' + (Lampa.Storage ? Lampa.Storage.field('tmdb_lang') : 'ru');
            }

            $.ajax({
                url: tmdbUrl,
                dataType: 'json',
                timeout: 8000,
                success: function (json) {
                    normalizeCard(json);
                    sendSecuses(json);
                },
                error: function () {
                    // TMDB недоступен — форсим blocked, чтобы показать DMCA-экран, а не пустую карточку
                    d.blocked = true;
                    sendSecuses(d);
                }
            });
        });

        try {
            Object.defineProperty(window.lampa_settings, 'dcma', {
                get: function () { return false; },
                set: function () {},
                configurable: true,
                enumerable: true
            });
        } catch (e) {
            setInterval(function () {
                if (window.lampa_settings.dcma !== false) window.lampa_settings.dcma = false;
            }, 5000);
        }
    }

    if (window.appready) {
        start();
    } else if (typeof Lampa !== 'undefined' && Lampa.Listener) {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') start();
        });
    } else {
        var _timer = setInterval(function () {
            if (typeof Lampa !== 'undefined' && Lampa.Listener) {
                clearInterval(_timer);
                if (window.appready) start();
                else Lampa.Listener.follow('app', function (event) {
                    if (event.type === 'ready') start();
                });
            }
        }, 200);
    }
})();
