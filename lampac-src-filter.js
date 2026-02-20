(function () {
    'use strict'

    function start() {
        if (window.lampac_src_filter_plugin) {
            return;
        }

        window.lampac_src_filter_plugin = true;

        Lampa.Lang.add({
            change_filter_series_order: {
                uk: 'Змінити порядок серій',
                en: 'Change series order',
                ru: 'Изменить порядок серий',
            },
            order_standard: {
                uk: 'Стандартно',
                en: 'Standard',
                ru: 'Стандартно',
            },
            order_invert: {
                uk: 'Інвертовано',
                en: 'Inverted',
                ru: 'Инвертировано',
            },
            find_episode: {
                uk: 'Знайти серію',
                en: 'Find episode',
                ru: 'Найти серию'
            },
            find_episode_subtitle: {
                uk: 'Пошук серії за номером',
                en: 'Search episode by number',
                ru: 'Поиск серии по номеру'
            }
        });

        Lampa.Controller.listener.follow('toggle', function (event) {
            if (event.name !== 'select') {
                return;
            }

            var active = Lampa.Activity.active();
            var componentName = active.component.toLowerCase();

            if (componentName !== 'online' && componentName !== 'lampac' && componentName.indexOf('bwa') !== 0) return;


            var $filterTitle = $('.selectbox__title');

            if ($filterTitle.length !== 1 || $filterTitle.text() !== Lampa.Lang.translate('title_filter')) return;

            var $sourceBtn = $('.simple-button--filter.filter--sort');

            if ($sourceBtn.length !== 1 || $sourceBtn.hasClass('hide')) return;

            var $selectBoxItem = Lampa.Template.get('selectbox_item', {
                title: Lampa.Lang.translate('settings_rest_source'),
                subtitle: $('div', $sourceBtn).text()
            });

            $selectBoxItem.on('hover:enter', function () {
                $sourceBtn.trigger('hover:enter');
            });

            var $selectOptions = $('.selectbox-item');

            if ($selectOptions.length > 0) {
                $selectOptions.first().after($selectBoxItem);
            } else {
                $('body > .selectbox').find('.scroll__body').prepend($selectBoxItem);
            }

            if (!active.movie || !Array.isArray(active.movie.seasons)) {
                Lampa.Controller.collectionSet($('body > .selectbox').find('.scroll__body'));
                Lampa.Controller.collectionFocus($('.selectbox-item').first());
                return;
            }

            active.invertedTv = !!active.invertedTv;

            var $invertOptionItem = Lampa.Template.get('selectbox_item', {
                title: Lampa.Lang.translate('change_filter_series_order'),
                subtitle: active.invertedTv ? Lampa.Lang.translate('order_invert') : Lampa.Lang.translate('order_standard')
            });


            $invertOptionItem.on('hover:enter', function () {
                var $seriesElements = $('.online-prestige.online-prestige--full');
                $seriesElements.parent().append($seriesElements.get().reverse());

                active.invertedTv = !active.invertedTv;

                $invertOptionItem.find('.selectbox-item__subtitle').text(active.invertedTv ? Lampa.Lang.translate('order_invert') : Lampa.Lang.translate('order_standard'));
            });

            var $findEpisode = Lampa.Template.get('selectbox_item', {
                title: Lampa.Lang.translate('find_episode'),
                subtitle: Lampa.Lang.translate('find_episode_subtitle')
            });

            $findEpisode.on('hover:enter', function () {
                Lampa.Controller.toggle('content');

                Lampa.Input.edit({
                    free: true,
                    title: Lampa.Lang.translate('find_episode'),
                    nosave: true,
                    value: '',
                    layout: 'nums',
                    keyboard: 'lampa'
                }, function (episode) {
                    Lampa.Controller.toggle('content');

                    var $episode = $('.online-prestige--full').filter(function () {
                        return $(this).find('.online-prestige__episode-number').text().trim() == episode;
                    });

                    if ($episode.length) {
                        Lampa.Controller.collectionFocus($episode, active.activity.body);
                    }
                })
            })

            $('body > .selectbox').find('.scroll__body').append($invertOptionItem);
            $('body > .selectbox').find('.scroll__body').append($findEpisode);

            Lampa.Controller.collectionSet($('body > .selectbox').find('.scroll__body'));
            Lampa.Controller.collectionFocus($('.selectbox-item').first());
        });
    }

    if (window.appready) {
        start();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') {
                start();
            }
        });
    }
})();
