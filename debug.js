/**
 * Тимчасовий діагностичний плагін: хто вбиває активність / закриває модалку.
 *
 * Standalone-файл, у збірку НЕ входить (не кладти в public/ — поїде всім).
 * Хостити будь-де, але віддавати з MIME application/javascript: Лампа
 * підключає плагіни через <script src> (src/utils/utils.js:434), а
 * raw.githubusercontent.com і gist віддають text/plain + nosniff, і Chromium
 * відмовляється їх виконувати.
 *
 * Встановлення: Налаштування -> Розширення -> додати за URL, потім
 * ПЕРЕЗАПУСТИТИ апп — Plugins.task (src/core/plugins.js:236) будує список
 * завантаження один раз на старті.
 *
 * URL має бути абсолютний: відносний ('./plugins/...') ламає updatePluginDB,
 * нативний шар APK відповідає "Invalid protocol; use http or https".
 *
 * Читання логу:
 *   1. фокус на шапку -> UP 11 разів -> вкладка "App"
 *   2. Налаштування -> Інше -> Експорт (src/custom/interaction/logs.js)
 * Обидва працюють, бо src/interaction/console.js перехоплює console.log.
 *
 * Сумісність: цілі з src/custom/doc/es5-compatibility.md — chrome 38,
 * safari 7 (Orsay WebKit), samsung 4. Тому тут чистий ES5 без транспіляції:
 * ніяких const/let, стрілок, шаблонних рядків, Object.keys, bind, Promise.
 * Все, що може бути відсутнім на давніх рушіях, під feature-detect.
 *
 * Після закриття питання — видалити файл.
 */
(function () {
    'use strict'

    var TAG = '[AD]'

    // Date.now немає на найдавніших рушіях
    function now() {
        return Date.now ? Date.now() : +new Date()
    }

    var t0 = now()

    function stamp() {
        return '+' + ((now() - t0) / 1000).toFixed(1) + 's'
    }

    // console може бути відсутнім до того, як Лампа підмінить його своїм
    function log(msg) {
        if (window.console && console.log) console.log(TAG, stamp(), msg)
    }

    function loud(msg) {
        log(msg)

        try {
            Lampa.Noty.show(TAG + ' ' + msg)
        } catch (e) {}
    }

    // JSON.stringify падає на циклічних обʼєктах і віддає undefined для undefined
    function brief(value, max) {
        var str

        try {
            str = JSON.stringify(value)
        } catch (e) {
            str = '[unserializable]'
        }

        return String(str).slice(0, max || 60)
    }

    /**
     * Два кадри стека нижче нашої обгортки — справжній викликач і його контекст.
     *
     * V8 дає "Error\n    at fn (url:line)", WebKit — "fn@url:line" без першого
     * рядка, а на дуже старих рушіях .stack взагалі немає. Тому не рахуємо кадри
     * від нуля, а шукаємо власний фрейм 'origin' і беремо два наступних.
     *
     * ponytail: два рядки замість повного стека. Якщо винуватця не видно —
     * підняти ліміт out.length або дописати console.trace() у потрібну обгортку.
     */
    function origin() {
        var stack = ''

        try {
            stack = (new Error()).stack || ''
        } catch (e) {}

        if (!stack) return 'no stack'

        var lines = stack.split('\n')
        var base = 2
        var i

        for (i = 0; i < lines.length; i++) {
            if (lines[i].indexOf('origin') > -1) {
                base = i + 2 // +1 наша обгортка, +2 справжній викликач

                break
            }
        }

        var out = []

        for (i = base; i < lines.length && out.length < 2; i++) {
            var line = lines[i].replace(/^\s*at\s+/, '')

            // без String.prototype.trim на всяк випадок
            line = line.replace(/^\s+/, '').replace(/\s+$/, '')

            if (line) out.push(line.slice(0, 90))
        }

        return out.length ? out.join(' < ') : '?'
    }

    function boot() {
        // ── стартовий зліпок ────────────────────────────────────────────
        log('start, pages_save_total=' + Lampa.Storage.get('pages_save_total', 5) +
            ', activities=' + Lampa.Activity.all().length)

        try {
            var list = Lampa.Plugins.get()

            for (var i = 0; i < list.length; i++) {
                log('plugin status=' + list[i].status + ' ' + (list[i].name || '') + ' ' + list[i].url)
            }
        } catch (e) {}

        // ── якір: плеєр закрився ────────────────────────────────────────
        // Все, що приходить у логу після цього рядка — і є винуватець.
        Lampa.Player.listener.follow('destroy', function () {
            log('--- PLAYER DESTROY ---')
        })

        // ── зовнішні виклики рефрешу (сюди попадають плагіни) ───────────
        // Внутрішні refresh(true) в activity.js йдуть в обхід експорту,
        // їх ловимо нижче по тригерах.
        var orig_refresh = Lampa.Activity.refresh

        Lampa.Activity.refresh = function (all) {
            loud('Activity.refresh(all=' + !!all + ') <- ' + origin())

            return orig_refresh.apply(this, arguments)
        }

        // ── хто закриває модалку "Файли" ────────────────────────────────
        // Без Noty: модалки закриваються часто, тости заважали б відтворювати баг.
        var orig_close = Lampa.Modal.close

        Lampa.Modal.close = function () {
            log('Modal.close <- ' + origin())

            return orig_close.apply(this, arguments)
        }

        var orig_open = Lampa.Modal.open

        Lampa.Modal.open = function (params) {
            log('Modal.open "' + ((params && params.title) || '') + '"')

            return orig_open.apply(this, arguments)
        }

        // ── програмний back ─────────────────────────────────────────────
        var orig_backward = Lampa.Activity.backward

        Lampa.Activity.backward = function () {
            log('Activity.backward count=' + Lampa.Activity.all().length + ' <- ' + origin())

            return orig_backward.apply(this, arguments)
        }

        // ── життєвий цикл активностей ───────────────────────────────────
        Lampa.Listener.follow('activity', function (e) {
            log('activity ' + e.type + ' ' + e.component +
                ' left=' + Lampa.Activity.all().length)
        })

        // ── внутрішній тригер refresh(true): activity.js:107 ────────────
        var watch = ['light_version', 'account_use', 'interface_size', 'account', 'pages_save_total']

        Lampa.Storage.listener.follow('change', function (e) {
            if (watch.indexOf(e.name) < 0) return

            loud('storage ' + e.name + '=' + brief(e.value) + ' <- ' + origin())
        })

        // ── внутрішній тригер refresh(true): activity.js:112 ────────────
        // Рефреш дає лише target=='favorite' з reason 'read' або 'profile'.
        Lampa.Listener.follow('state:changed', function (e) {
            if (e.target !== 'favorite') return

            var hot = e.reason === 'read' || e.reason === 'profile'
            var write = hot ? loud : log

            write('state:changed favorite/' + e.reason + (hot ? ' => REFRESH ALL' : '') +
                ' <- ' + origin())
        })

        // ── HOME -> повернення в апп ────────────────────────────────────
        // Safari 7 / старий WebKit знає лише webkit-префіксний варіант.
        var modern = typeof document.visibilityState !== 'undefined'

        document.addEventListener(modern ? 'visibilitychange' : 'webkitvisibilitychange', function () {
            log('visibility=' + (modern ? document.visibilityState : document.webkitVisibilityState) +
                ', activities=' + Lampa.Activity.all().length)
        })

        loud('activity-debug ready')
    }

    // Плагін може стартувати раніше, ніж збереться Lampa. Ліміт спроб, щоб не
    // крутити таймер вічно там, де Lampa так і не зʼявиться.
    var tries = 0

    function wait() {
        if (window.Lampa && Lampa.Activity && Lampa.Modal && Lampa.Player &&
            Lampa.Storage && Lampa.Listener && Lampa.Plugins) return boot()

        if (++tries > 150) return log('give up waiting for Lampa') // ~15 c

        setTimeout(wait, 100)
    }

    wait()
})()
