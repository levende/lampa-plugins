/*
 * Anti DMCA для Lampa.
 *
 * 1. Выключает клиентский список блокировки Lampa (lampa_settings.dcma, disable_features.dmca, Utils.dcma).
 * 2. Карточка фильма/сериала (путь /3/movie/<id>, /3/tv/<id> на любом хосте: tmdb.<cub>, apitmdb.<cub>,
 *    наш прокси) с непригодным ответом перезапрашивается один раз через TMDB-прокси нашего сервера.
 *    Непригодный ответ: заглушка CUB {"blocked":true}, ответ без числового id или без названия, ответ
 *    с status_code, отравленный кэш {"blocked":false} от старой версии плагина, пустая карточка нашего
 *    прокси (id:0) при сбое апстрима. Не вышло — Lampa получает исходный ответ с blocked=true и
 *    показывает свой экран «контент заблокирован» (никогда не пустую карточку).
 * 3. Заглушка на подресурсах карточки (credits, season/N, ...) тоже перезапрашивается; ответ прокси
 *    принимается, только если он про тот же тайтл/сезон. Не вышло — ответ отдаётся как есть.
 * 4. Страховка отрисовки: TMDB.parseCountries всегда возвращает массив, у карточки массивы на месте.
 *
 * Только ES5: файл грузится и на старых webOS/Tizen/Android TV WebView.
 * Плагин никогда не бросает исключения в request(): каждый обработчик в try/catch.
 */
(function () {
    'use strict';

    if (window.__lampac_anti_dmca_v2) return;
    window.__lampac_anti_dmca_v2 = true;
    // старая версия плагина, если подгрузится после этой, сразу выйдет
    window.__lampac_anti_dmca = true;

    var LOG_PREFIX = '[anti-dmca]';
    // таймаут перезапроса; поверх него страховочный таймер +1 с
    var REFETCH_TIMEOUT = 8000;
    // неудача, которая заняла столько или больше (или таймаут), запоминается по method/id на FAIL_TTL:
    // запрос описания на en, сезона и т.п. для того же тайтла не ждут прокси второй раз
    var SLOW_FAIL_MS = 3000;
    var FAIL_TTL = 120000;
    var MARK = '__antiDmca';
    // тот же набор, что Lampa запрашивает для карточки в источнике TMDB
    var DEFAULT_APPEND = 'content_ratings,release_dates,external_ids,keywords,alternative_titles,images';
    // параметры CUB/чужих прокси, которые не нужно нести на наш сервер
    var STRIP_PARAMS = ['email', 'account_email', 'uid', 'token'];
    // Сверяется только путь (до '?' и '#').
    // m[1] = movie|tv, m[2] = id, m[3] = подресурс ('/credits', '/season/1') или пусто для самой карточки
    var TMDB_PATH_RE = /\/3\/(movie|tv)\/(\d+)(\/[^?#]*)?$/;
    // подресурсы, в ответе которых id совпадает с id фильма/сериала
    var ID_SUBS = ['credits', 'aggregate_credits', 'videos', 'images', 'external_ids', 'keywords', 'release_dates',
        'content_ratings', 'alternative_titles', 'translations', 'reviews', 'lists', 'watch', 'screened_theatrically'];
    var TMDB_DIRECT = 'https://api.themoviedb.org/3/';

    // Сервер при отдаче файла подставляет сюда свой адрес (схема://хост, без слэша на конце).
    var SERVER_ORIGIN = 'https://beta.l-vid.online';
    // Адрес, с которого браузер реально загрузил этот файл; вычисляется только сейчас,
    // пока document.currentScript указывает на нас.
    var SCRIPT_ORIGIN = scriptOrigin();
    var BASE = resolveBase();

    var installed = { listeners: false, parse: false, utils: false };
    var lockedSettings = null;
    // 'movie/123' -> время медленной неудачи перезапроса
    var failedAt = {};

    // ── утилиты ─────────────────────────────────────────────

    function log(msg) {
        try {
            if (window.console && console.log) console.log(LOG_PREFIX + ' ' + msg);
        } catch (e) {}
    }

    function now() {
        return new Date().getTime();
    }

    function isArray(v) {
        return Array.isArray ? Array.isArray(v) : Object.prototype.toString.call(v) === '[object Array]';
    }

    function isPlainObject(v) {
        return !!v && typeof v === 'object' && !isArray(v);
    }

    function isNumericId(v) {
        if (typeof v === 'number') return v > 0 && v % 1 === 0;
        return typeof v === 'string' && /^\d+$/.test(v) && !/^0+$/.test(v);
    }

    function hasStatusCode(d) {
        return d.status_code !== undefined && d.status_code !== null;
    }

    function hasTitle(d) {
        return !!(d.title || d.name || d.original_title || d.original_name);
    }

    // заглушка без содержимого: {"blocked":true} от CUB или {"blocked":false} из кэша старой версии
    function isBlockedStub(d) {
        if (d.blocked === true) return true;
        if (d.blocked !== false) return false;
        for (var k in d) {
            if (Object.prototype.hasOwnProperty.call(d, k) && k !== 'blocked') return false;
        }
        return true;
    }

    function hostOf(u) {
        return String(u || '').replace(/^[a-z]+:\/\//i, '').toLowerCase().split(/[\/?#]/)[0];
    }

    function originOf(src) {
        var m = /^(https?:)?\/\/([^\/?#]+)/i.exec(src || '');
        if (!m) return '';
        var proto = m[1];
        if (!proto) proto = pageIsHttps() ? 'https:' : 'http:';
        return proto.toLowerCase() + '//' + m[2];
    }

    function pageIsHttps() {
        try {
            return !!(window.location && window.location.protocol === 'https:');
        } catch (e) {
            return false;
        }
    }

    function scriptOrigin() {
        try {
            var cs = document.currentScript;
            if (cs && cs.src && cs.src.indexOf('anti-dmca') >= 0) return originOf(cs.src);
            var list = document.getElementsByTagName('script');
            for (var i = list.length - 1; i >= 0; i--) {
                var src = list[i].src || '';
                if (src.indexOf('anti-dmca') >= 0) return originOf(src);
            }
        } catch (e) {}
        return '';
    }

    // Куда перезапрашивать: наш прокси /tmdb/api/3/, в крайнем случае TMDB напрямую.
    function resolveBase() {
        var origin = '';
        var server = SERVER_ORIGIN;
        // подстановки не было — строка так и начинается с фигурной скобки
        if (server && server.charAt(0) !== '{' && /^https?:\/\/[^\/?#]+/i.test(server)) origin = server.replace(/\/+$/, '');
        if (SCRIPT_ORIGIN) {
            if (!origin) origin = SCRIPT_ORIGIN;
            // тот же хост: берём схему, по которой файл реально загрузился (за обратным прокси может разойтись)
            else if (hostOf(origin) === hostOf(SCRIPT_ORIGIN)) origin = SCRIPT_ORIGIN;
            // со страницы https запрос на http заблокирует браузер (mixed content), а хост скрипта доступен
            else if (pageIsHttps() && /^http:/i.test(origin) && /^https:/i.test(SCRIPT_ORIGIN)) origin = SCRIPT_ORIGIN;
        }
        return origin ? origin + '/tmdb/api/3/' : TMDB_DIRECT;
    }

    function tmdbKey() {
        try {
            var T = window.Lampa && window.Lampa.TMDB;
            if (T && typeof T.key === 'function') return String(T.key() || '');
        } catch (e) {}
        return '';
    }

    function tmdbLang() {
        try {
            var S = window.Lampa && window.Lampa.Storage;
            var v = S && typeof S.field === 'function' ? S.field('tmdb_lang') : '';
            if (v) return String(v);
        } catch (e) {}
        return 'ru';
    }

    function imageLangs(lang) {
        var first = String(lang || 'en').split(/[-_,]/)[0] || 'en';
        var list = [first, 'en', 'null'];
        var out = [];
        for (var i = 0; i < list.length; i++) if (out.indexOf(list[i]) < 0) out.push(list[i]);
        return out.join(',');
    }

    function paramName(part) {
        var k = part.split('=')[0];
        try { k = decodeURIComponent(k); } catch (e) {}
        return k.toLowerCase();
    }

    // ── разбор и сборка адресов ─────────────────────────────

    function parseTmdbUrl(url) {
        if (typeof url !== 'string' || !url) return null;
        var cut = url.search(/[?#]/);
        var path = cut >= 0 ? url.slice(0, cut) : url;
        var m = TMDB_PATH_RE.exec(path);
        if (!m) return null;
        var sub = m[3] ? m[3].replace(/\/+$/, '') : '';
        var query = '';
        if (cut >= 0 && url.charAt(cut) === '?') {
            query = url.slice(cut + 1);
            var hi = query.indexOf('#');
            if (hi >= 0) query = query.slice(0, hi);
        }
        return { url: url, method: m[1], id: m[2], sub: sub, detail: !sub, query: query };
    }

    // Тот же путь и запрос, но через наш прокси. Ключ, язык, append_to_response берём из исходного адреса.
    function buildRefetchUrl(info) {
        var parts = info.query ? info.query.split('&') : [];
        var out = [];
        var seen = {};
        var has = function (n) { return Object.prototype.hasOwnProperty.call(seen, n); };
        for (var i = 0; i < parts.length; i++) {
            if (!parts[i]) continue;
            var name = paramName(parts[i]);
            if (STRIP_PARAMS.indexOf(name) >= 0 || has(name)) continue;
            seen[name] = true;
            out.push(parts[i]);
        }
        if (!has('api_key')) {
            var key = tmdbKey();
            if (key) out.push('api_key=' + encodeURIComponent(key));
        }
        if (info.detail) {
            var lang = tmdbLang();
            if (!has('language')) out.push('language=' + encodeURIComponent(lang));
            if (!has('append_to_response')) {
                out.push('append_to_response=' + DEFAULT_APPEND);
                if (!has('include_image_language')) out.push('include_image_language=' + imageLangs(lang));
            }
        }
        return BASE + info.method + '/' + info.id + info.sub + (out.length ? '?' + out.join('&') : '');
    }

    function isTmdbApiPath(url) {
        if (typeof url !== 'string') return false;
        var cut = url.search(/[?#]/);
        return /\/3\//.test(cut >= 0 ? url.slice(0, cut) : url);
    }

    // ── проверка и нормализация данных ──────────────────────

    // Карточку можно рисовать: не заблокирована, без ошибки TMDB, есть числовой id и название.
    function isUsableDetail(data) {
        return data.blocked !== true && !hasStatusCode(data) && isNumericId(data.id) && hasTitle(data);
    }

    function isGoodRefetch(json, info) {
        if (!isPlainObject(json) || json.blocked === true || hasStatusCode(json)) return false;
        if (info.detail) return isUsableDetail(json) && String(json.id) === info.id;

        // info.sub = '/credits' -> ['', 'credits']; '/season/2' -> ['', 'season', '2']
        var seg = info.sub.split('/');
        if (seg[1] === 'season') {
            // у сезона свой id, сверяем номер и наличие серий
            if (seg.length === 3) {
                return isArray(json.episodes) &&
                    (json.season_number === undefined || json.season_number === null || String(json.season_number) === seg[2]);
            }
            // серия и прочее внутри сезона: у ответа свой числовой id
            return isNumericId(json.id);
        }
        if (ID_SUBS.indexOf(seg[1]) >= 0) return String(json.id) === info.id;
        // прочее (recommendations, similar, ...): либо тот же id, либо список
        return json.id !== undefined ? String(json.id) === info.id : isArray(json.results);
    }

    // Только сама карточка (числовой id, адрес карточки); элементы списков не трогаем.
    function normalizeCard(card, method) {
        if (!isPlainObject(card) || !isNumericId(card.id) || card.blocked === true) return;
        if (!isArray(card.production_countries)) card.production_countries = [];
        if (!isArray(card.production_companies)) card.production_companies = [];
        if (!isArray(card.genres)) card.genres = [];
        if (!card.title && !card.name) {
            var t = card.original_title || card.original_name || '';
            if (method === 'tv') card.name = t;
            else card.title = t;
        }
    }

    function recentlyFailed(key) {
        var t = failedAt[key];
        if (!t) return false;
        if (now() - t < FAIL_TTL) return true;
        delete failedAt[key];
        return false;
    }

    // ── сеть ────────────────────────────────────────────────

    // ok/fail вызываются ровно один раз и не позже timeout + 1 с.
    function fetchJson(url, timeout, ok, fail) {
        var finished = false;
        var xhr = null;
        var timer = null;

        function finish(json, err) {
            if (finished) return;
            finished = true;
            if (timer) clearTimeout(timer);
            try {
                if (err) fail(err);
                else ok(json);
            } catch (e) {
                log('callback error: ' + (e && e.message));
                // ok упал на полпути: всё равно отдаём ответ (fail сам отдаёт ровно один раз)
                if (!err) {
                    try { fail('exception'); } catch (e2) {}
                }
            }
        }

        // страховка поверх таймаута транспорта
        timer = setTimeout(function () {
            finish(null, 'timeout');
            try { if (xhr && xhr.abort) xhr.abort(); } catch (e) {}
        }, timeout + 1000);

        var jq = window.jQuery || window.$;
        if (jq && typeof jq.ajax === 'function') {
            try {
                xhr = jq.ajax({
                    url: url,
                    dataType: 'json',
                    timeout: timeout,
                    crossDomain: true,
                    success: function (json) { finish(json); },
                    error: function (x, status) {
                        var code = x && x.status;
                        finish(null, status === 'error' && code ? 'http ' + code : status || 'error');
                    }
                });
                return;
            } catch (e) {
                xhr = null;
            }
        }

        try {
            var req = new XMLHttpRequest();
            xhr = req;
            req.open('GET', url, true);
            try { req.timeout = timeout; } catch (e) {}
            req.onreadystatechange = function () {
                if (req.readyState !== 4) return;
                if (req.status >= 200 && req.status < 300) {
                    var json;
                    try { json = JSON.parse(req.responseText); } catch (e) { return finish(null, 'parse'); }
                    finish(json);
                } else finish(null, 'http ' + req.status);
            };
            req.send(null);
        } catch (e) {
            finish(null, 'xhr');
        }
    }

    // Запасная доставка, если abort() не вернул функцию: повторяем то, что делает sendSecuses (без кэша).
    function manualSender(params) {
        return function (payload) {
            var p = params || {};
            var steps = ['before_complite', 'complite', 'after_complite', 'end'];
            for (var i = 0; i < steps.length; i++) {
                if (typeof p[steps[i]] !== 'function') continue;
                try {
                    if (steps[i] === 'end') p.end();
                    else p[steps[i]](payload);
                } catch (err) {
                    log(steps[i] + ' error: ' + (err && err.message));
                }
            }
        };
    }

    // ── обработчики событий запроса ─────────────────────────

    // Непригодный ответ: прерываем выдачу, перезапрашиваем через наш прокси (всегда один раз, даже если
    // исходный запрос шёл туда же: это обычный GET мимо кэша Lampa, пустую заглушку сервер не кэширует).
    // При любой неудаче отдаём исходный ответ: у карточки с blocked=true (родной экран блокировки Lampa),
    // у подресурса как есть.
    function replaceOrBlock(e, data, info) {
        var key = info.method + '/' + info.id;
        var label = key + info.sub;

        // Нативный запрос Android (android_go) не даёт abort; недавно прокси по этому тайтлу не ответил.
        // В обоих случаях ответ отдаёт сама Lampa, карточка — с пометкой блокировки.
        if (typeof e.abort !== 'function' || recentlyFailed(key)) {
            if (info.detail) data.blocked = true;
            return;
        }

        var send;
        try {
            send = e.abort();
        } catch (err) {
            // abort не сработал — ответ отдаст сама Lampa
            if (info.detail) data.blocked = true;
            log('abort error for ' + label + ': ' + (err && err.message));
            return;
        }
        if (typeof send !== 'function') {
            log('abort() returned no sender for ' + label + ', delivering directly');
            send = manualSender(e.params);
        }

        // после abort() ответ доставляем только мы: всё, что может бросить, — внутри try с fallback
        var started = now();
        var delivered = false;

        function deliver(payload) {
            if (delivered) return;
            delivered = true;
            try {
                send(payload);
            } catch (err) {
                log('deliver error: ' + (err && err.message));
            }
        }

        function fallback(reason, slow) {
            if (delivered) return;
            try {
                if (slow) failedAt[key] = now();
                log('refetch ' + label + ' failed (' + reason + '), ' + (info.detail ? 'showing blocked' : 'passing original'));
                if (info.detail) data.blocked = true;
            } catch (err) {}
            deliver(data);
        }

        try {
            var url = buildRefetchUrl(info);
            started = now();
            fetchJson(url, REFETCH_TIMEOUT, function (json) {
                try {
                    if (!isGoodRefetch(json, info)) return fallback('bad response', false);
                    if (info.detail) normalizeCard(json, info.method);
                    delete failedAt[key];
                    log('refetch ' + label + ' ok via ' + hostOf(BASE));
                    deliver(json);
                } catch (err) {
                    fallback('exception: ' + (err && err.message), false);
                }
            }, function (reason) {
                fallback(reason, reason === 'timeout' || now() - started >= SLOW_FAIL_MS);
            });
        } catch (err) {
            fallback('exception: ' + (err && err.message), false);
        }
    }

    function handleSecuses(e) {
        if (!e || !e.params) return;
        var data = e.data;
        if (!isPlainObject(data)) return;

        var info = parseTmdbUrl(e.params.url);

        if (info && info.detail) {
            if (isUsableDetail(data)) normalizeCard(data, info.method);
            else replaceOrBlock(e, data, info);
            return;
        }

        // подресурс карточки с заглушкой: пробуем наш прокси, иначе ответ как есть
        if (info) {
            if (isBlockedStub(data)) replaceOrBlock(e, data, info);
            return;
        }

        // списки TMDB-API: снимаем blocked только там, где есть что показать; чужие API и остальное не трогаем
        if (data.blocked === true && isArray(data.results) && data.results.length && isTmdbApiPath(e.params.url)) data.blocked = false;
    }

    function onRequestSecuses(e) {
        try {
            handleSecuses(e);
        } catch (err) {
            log('request_secuses error: ' + (err && err.message));
        }
    }

    // Обёртка complite только для запросов карточки: нормализуем данные прямо перед отрисовкой.
    // Повторные попытки (attempts) снова шлют request_before: метка не даёт обернуть дважды.
    function onRequestBefore(e) {
        try {
            var params = e && e.params;
            if (!params || typeof params.complite !== 'function' || params.complite[MARK]) return;

            var info = parseTmdbUrl(params.url);
            if (!info || !info.detail) return;

            var original = params.complite;
            var wrapped = function (data) {
                try {
                    if (isPlainObject(data)) {
                        if (isUsableDetail(data)) normalizeCard(data, info.method);
                        // сюда непригодная карточка доходит, только если наш request_secuses не отработал
                        // (чужой обработчик бросил раньше): лучше родной экран блокировки, чем падение
                        else data.blocked = true;
                    }
                } catch (err) {}
                return original.apply(this, arguments);
            };
            wrapped[MARK] = true;
            params.complite = wrapped;
        } catch (err) {
            log('request_before error: ' + (err && err.message));
        }
    }

    // ── установка ───────────────────────────────────────────

    function lockSettings() {
        try {
            var s = window.lampa_settings = window.lampa_settings || {};
            if (s === lockedSettings) return;
            s.disable_features = s.disable_features || {};
            s.disable_features.dmca = true;
            try {
                Object.defineProperty(s, 'dcma', {
                    get: function () { return false; },
                    set: function () {},
                    configurable: true,
                    enumerable: true
                });
            } catch (e) {
                s.dcma = false;
                setInterval(function () {
                    try { if (window.lampa_settings.dcma !== false) window.lampa_settings.dcma = false; } catch (er) {}
                }, 5000);
            }
            lockedSettings = s;
        } catch (e) {}
    }

    // Lampa.Api.sources.tmdb — защищённый геттером объект: правим только его свойство parseCountries.
    function patchParseCountries() {
        var L = window.Lampa;
        var src = L && L.Api && L.Api.sources && L.Api.sources.tmdb;
        if (!src || typeof src.parseCountries !== 'function') return false;
        if (src.parseCountries[MARK]) return true;

        var original = src.parseCountries;
        var wrapped = function () {
            var result;
            try {
                result = original.apply(this, arguments);
            } catch (e) {
                return [];
            }
            return isArray(result) ? result : [];
        };
        wrapped[MARK] = true;
        try { src.parseCountries = wrapped; } catch (e) { return false; }
        return src.parseCountries === wrapped;
    }

    function onApp(e) {
        try {
            if (e && e.type === 'ready') installAll();
        } catch (err) {}
    }

    function installAll() {
        lockSettings();

        var L = window.Lampa;
        if (!L) return false;

        if (!installed.listeners && L.Listener && typeof L.Listener.follow === 'function') {
            L.Listener.follow('request_before', onRequestBefore);
            L.Listener.follow('request_secuses', onRequestSecuses);
            L.Listener.follow('app', onApp);
            installed.listeners = true;
        }

        if (!installed.utils && L.Utils) {
            try {
                L.Utils.dcma = function () { return false; };
                installed.utils = true;
            } catch (e) {}
        }

        if (!installed.parse) {
            try { installed.parse = patchParseCountries(); } catch (e) {}
        }

        return installed.listeners && installed.utils && installed.parse;
    }

    // Ставимся, как только появится Lampa: без ограничения по времени, с затуханием частоты.
    // После готовности приложения новых объектов не появится: ещё ~1 мин попыток и событие app:ready.
    var pollDelay = 50;
    var pollsAfterReady = 0;
    function poll() {
        var done = false;
        try { done = installAll(); } catch (e) {}
        if (done) return;
        if (window.appready && installed.listeners && ++pollsAfterReady > 60) return;
        pollDelay = Math.min(pollDelay * 2, 1000);
        setTimeout(poll, pollDelay);
    }

    poll();
})();
