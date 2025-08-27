(function(){
    function startPlugin() {
        if (window.tv_status_color) return;
        window.tv_status_color = true;

        Lampa.Listener.follow('activity,full', function (e) {
            if (e.type != 'complite' && e.type != 'archive') return;

            var active = Lampa.Activity.active();
            if (active.method != 'tv') return;

            var $render = active.activity.render();
            var $status = $('.full-start__status:not([class*=" "])', $render);

            if ($status.length == 0) return;

            var status = $status.text().trim();
            var statusColor = getStatusColor(status);

            if (!!statusColor) {
                $status.css('background-color', statusColor);
            }
        });

    }

    function getStatusColor(status) {
        switch (status) {
            case Lampa.Lang.translate('tv_status_canceled'): return '#FF5722';
            case Lampa.Lang.translate('tv_status_rumored'): return '#607D8B';
            case Lampa.Lang.translate('tv_status_returning_series'):
            case Lampa.Lang.translate('tv_status_pilot'):
                return '#FFA000';
            case Lampa.Lang.translate('tv_status_planned'):
            case Lampa.Lang.translate('tv_status_in_production'):
            case Lampa.Lang.translate('tv_status_post_production'):
                return '#42A5F5'
            case Lampa.Lang.translate('tv_status_released'):
            case Lampa.Lang.translate('tv_status_ended'):
                return '#38a564'
            default: '';
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
