/**
 * Тимчасовий діагностичний плагін: хто вбиває активність / закриває модалку
 *
(function () {
    'use strict'

    var TAG = '[AD]'
    var t0 = Date.now()

    function stamp() {
        return '+' + ((Date.now() - t0) / 1000).toFixed(1) + 's'
    }

    function log(msg) {
        console.log(TAG, stamp(), msg)
    }

    function loud(msg) {
        log(msg)

        try {
            Lampa.Noty.show(TAG + ' ' + msg)
        } catch (e) {}
    }

    /**
     * Два кадри стека нижче нашої обгортки — справжній викликач і його контекст.
     * ponytail: два рядки замість повного стека. Якщо винуватця не видно —
     * підняти ліміт out.length або дописати console.trace() у потрібну обгортку.
     */
    function origin() {
        var stack = ''

        try {
            stack = (new Error()).stack || ''
        } catch (e) {
            return '?'
        }

        var lines = stack.split('\n')
        var base = 3 // Error, origin, наша обгортка — далі справжній викликач

        // Плагін інжектиться інлайном (createPluginDB у core/plugins.js), тому
        // фільтрувати за іменем файлу не можна — рахуємо кадри від власного.
        for (var i = 0; i < lines.length; i++) {
            if (lines[i].indexOf('origin') > -1) {
                base = i + 2

                break
            }
        }

        var out = []

        for (var j = base; j < lines.length && out.length < 2; j++) {
            var line = lines[j].replace(/^\s*at\s*/, '').trim()

            if (line) out.push(line.slice(0, 90))
        }

        return out.join(' < ') || '?'
    }


    function boot() {
        // ── стартовий зліпок ────────────────────────────────────────────
        log('start, pages_save_total=' + Lampa.Storage.get('pages_save_total', 5) +
            ', activities=' + Lampa.Activity.all().length)

        try {
            Lampa.Plugins.get().forEach(function (p) {
                log('plugin status=' + p.status + ' ' + (p.name || '') + ' ' + p.url)
            })
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

            loud('storage ' + e.name + '=' + JSON.stringify(e.value).slice(0, 60) + ' <- ' + origin())
        })

        // ── внутрішній тригер refresh(true): activity.js:112 ────────────
        // Рефреш дає лише target=='favorite' з reason 'read' або 'profile'.
        Lampa.Listener.follow('state:changed', function (e) {
            if (e.target !== 'favorite') return

            var hot = e.reason === 'read' || e.reason === 'profile'
            var out = hot ? loud : log

            out('state:changed favorite/' + e.reason + (hot ? ' => REFRESH ALL' : '') +
                ' <- ' + origin())
        })

        // ── HOME -> повернення в апп ────────────────────────────────────
        document.addEventListener('visibilitychange', function () {
            log('visibility=' + document.visibilityState +
                ', activities=' + Lampa.Activity.all().length)
        })

        loud('activity-debug ready')
    }

    // Плагін може стартувати раніше, ніж збереться Lampa
    function wait() {
        if (window.Lampa && Lampa.Activity && Lampa.Modal && Lampa.Player && Lampa.Storage && Lampa.Plugins) return boot()

        setTimeout(wait, 100)
    }

    wait()
})()
