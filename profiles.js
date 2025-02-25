(function () {
    'use strict';

    var host = window.location.origin;
    var network = new Lampa.Reguest();
    var logger = new Logger();

    Lampa.Profile = {
        active: function () {
            return data.userProfiles.find(function (profile) {
                return profile.selected;
            });
        }
    };

    function startPlugin() {
        if (window.profiles_plugin == true) {
            logger.warning('Plugin is already started');
            return;
        }

        window.profiles_plugin = true;

        if (cubSyncEnabled()) {
            logger.error('The CUB syncronization is used');
            return;
        }

        Lampa.Storage.listener.follow('change', function (event) {
            if (event.name == 'account' || event.name == 'account_use' || event.name == 'lampac_unic_id') {
                location.reload();
            }
        });

        data.syncProfileId = Lampa.Storage.get('lampac_profile_id', '');

        network.silent(addAuthParams(host + '/reqinfo'), function (reqinfo) {
            if (!reqinfo.user_uid) {
                logger.error('accsdb', reqinfo)
                return;
            }

            data.userProfiles = getProfiles(reqinfo);

            if (data.userProfiles.length == 0) {
                logger.error('Profiles are not defined');
                return;
            }

            Lampa.Listener.follow('activity', function (e) {
                if (e.type == 'archive'
                    && e.object.outdated
                    && Lampa.Storage.get('lampac_profile_upt_type', 'soft') == 'soft'
                ) {
                    softRefresh();
                }
            });

            var profile = initDefaultState();
            replaceProfileButton(profile);
            addSettings();

            logger.info('Plugin is loaded');
            logger.info('Refresh type: ', Lampa.Storage.get('lampac_profile_upt_type', 'soft'));
        });
    }

    function initDefaultState() {
        var profile = Lampa.Profile.active();

        if (!profile) {
            profile = data.userProfiles[0];
            profile.selected = true;
            data.syncProfileId = profile.id;
            Lampa.Storage.set('lampac_profile_id', profile.id);
        }

        sendProfileEvent(profile, 'changed');

        if (!alreadySyncUsed()) {
            logger.debug('Add the sync.js script to the app');
            Lampa.Utils.putScriptAsync([host + '/sync.js']);
        }

        return profile;
    }

    function replaceProfileButton(profile) {
        var profileButton = $(
            '<div class="head__action selector open--profile">' +
            '<img id="user_profile_icon" src="' + profile.icon + '"/>' +
            '</div>');

        $('.open--profile').before(profileButton).remove();;

        profileButton.on('hover:enter hover:click hover:touch', function () {
            Lampa.Select.show({
                title: Lampa.Lang.translate('account_profiles'),
                nomark: false,
                items: data.userProfiles.map(function (profile) {
                    return {
                        title: profile.title,
                        template: 'selectbox_icon',
                        icon: '<img src="' + profile.icon + '" style="width: 50px; height: 50px;" />',
                        selected: profile.selected,
                        profile: profile
                    };
                }),
                onSelect: function (item) {
                    if (item.profile.id != data.syncProfileId) {
                        logger.info('Switch to profile', item.profile);

                        Lampa.Loading.start();

                        window.sync_disable = true;

                        item.profile.selected = true;
                        data.syncProfileId = item.profile.id;

                        Lampa.Storage.set('lampac_profile_id', item.profile.id);
                        sendProfileEvent(item.profile, 'changed');

                        clearProfileData();

                        data.userProfiles
                            .filter(function (profile) { return profile.id != data.syncProfileId; })
                            .forEach(function (profile) { profile.selected = false; });

                        $('#user_profile_icon').attr('src', item.profile.icon);

                        window.sync_disable = false;

                        setTimeout(function () {
                            logger.debug('Sync with new profile');

                            document.dispatchEvent(new CustomEvent('lwsEvent', {
                                detail: { name: 'system', data: 'reconnected' }
                            }));
                        }, 200);

                        waiter(function () {
                            return syncConfig.syncTimestamps.every(function (timestampField) {
                                return Lampa.Storage.get(timestampField, 0) !== 0;
                            })
                        },
                            syncConfig.check.interval,
                            syncConfig.check.timeout,
                            function (synced) {
                                Lampa.Loading.stop();

                                if (!synced || Lampa.Storage.get('lampac_profile_upt_type', 'soft') == 'full') {
                                    window.location.reload();
                                    return;
                                }

                                Lampa.Activity.all().forEach(function (page) {
                                    page.outdated = true;
                                });

                                softRefresh();
                            });
                    } else {
                        Lampa.Controller.toggle('content');
                    }
                },
                onBack: function () {
                    Lampa.Controller.toggle('content');
                }
            });
        });
    }

    function waiter(conditionFn, interval, duration, callback) {
        var start = Date.now();

        function checkCondition() {
            if (conditionFn()) {
                callback(true);
                return;
            }

            if (Date.now() - start >= duration) {
                callback(false);
                return;
            }

            setTimeout(checkCondition, interval);
        }

        checkCondition();
    }

    function addLocalization() {
        Lampa.Lang.add({
            lampac_profile_upt_type: {
                en: 'Refresh type',
                uk: 'Тип оновлення',
                ru: 'Тип обновления',
            },
            lampac_profile_upt_type_descr: {
                en: 'Refresh type after profile switch',
                uk: 'Тип оновлення після зміни профілю',
                ru: 'Тип обновления после смены профиля',
            },
            lampac_profile_soft_refresh: {
                en: 'Soft refresh',
                uk: 'М’яке оновлення',
                ru: 'Мягкое обновление',
            },
            lampac_profile_full_refresh: {
                en: 'Full refresh',
                uk: 'Повне оновлення',
                ru: 'Полное обновление',
            }
        });
    }

    function addSettings() {
        addLocalization();

        Lampa.SettingsApi.addComponent({
            component: 'lampac_profiles',
            name: Lampa.Lang.translate('account_profiles'),
            icon: `
            <?xml version="1.0" encoding="utf-8"?>
                <svg viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.12 12.78C12.05 12.77 11.96 12.77 11.88 12.78C10.12 12.72 8.71997 11.28 8.71997 9.50998C8.71997 7.69998 10.18 6.22998 12 6.22998C13.81 6.22998 15.28 7.69998 15.28 9.50998C15.27 11.28 13.88 12.72 12.12 12.78Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M18.74 19.3801C16.96 21.0101 14.6 22.0001 12 22.0001C9.40001 22.0001 7.04001 21.0101 5.26001 19.3801C5.36001 18.4401 5.96001 17.5201 7.03001 16.8001C9.77001 14.9801 14.25 14.9801 16.97 16.8001C18.04 17.5201 18.64 18.4401 18.74 19.3801Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`
        });

        Lampa.SettingsApi.addParam({
            component: 'lampac_profiles',
            param: {
                name: 'lampac_profile_upt_type',
                type: 'select',
                values: {
                    full: Lampa.Lang.translate('lampac_profile_full_refresh'),
                    soft: Lampa.Lang.translate('lampac_profile_soft_refresh'),
                },
                default: 'soft'
            },
            field: {
                name: Lampa.Lang.translate('lampac_profile_upt_type'),
                description: Lampa.Lang.translate('lampac_profile_upt_type_descr'),
            },
            onChange: function (value) {
                Lampa.Storage.set('lampac_profile_upt_type', value);
            }
        }
        )
    }

    function getProfiles(reqinfo) {
        var hasGlobalParams = !!reqinfo.params && !!reqinfo.params.profiles;

        var hasUserParams = !!reqinfo.user
            && !!reqinfo.user.params
            && !!reqinfo.user.params.profiles;

        if (!hasGlobalParams && !hasUserParams) {
            return [];
        }

        var params = hasUserParams ? reqinfo.user.params : reqinfo.params;

        var profiles = params.profiles.map(function (profile, index) {
            var profileId = hasProp(profile.id) ? profile.id.toString() : index.toString();
            return {
                title: hasProp(profile.title)
                    ? profile.title.toString()
                    : Lampa.Lang.translate('settings_cub_profile') + ' ' + (index + 1),
                id: profileId,
                icon: hasProp(profile.icon) ? profile.icon : data.defaultProfileIcon,
                selected: profileId == data.syncProfileId,
                params: hasProp(profile.params) ? profile.params : {},
            };
        });

        logger.debug('Profiles are parsed:', profiles);
        return profiles;

        function hasProp(value) {
            return value != undefined && value != null;
        }
    }

    function softRefresh() {
        var activity = Lampa.Activity.active();

        if (activity.page) {
            activity.page = 1;
        }

        Lampa.Activity.replace(activity);
        activity.outdated = false;

        logger.info('Soft refresh:', activity);
    }


    function clearProfileData() {
        logger.debug('Clear profile data');

        syncConfig.syncKeys.forEach(localStorage.removeItem.bind(localStorage));
        Object.keys(Lampa.Favorite.full()).forEach(Lampa.Favorite.clear.bind(Lampa.Favorite));

        Lampa.Storage.set('favorite', {});

        syncConfig.syncTimestamps.forEach(function (timestamp) {
            Lampa.Storage.set(timestamp, 0);
        });
    }

    function sendProfileEvent(profile, eventType) {
        Lampa.Listener.send('profile', {
            type: eventType,
            profileId: profile.id,
            params: profile.params,
        });
    }

    function cubSyncEnabled() {
        return !!Lampa.Storage.get('account', '{}').token && Lampa.Storage.get('account_use', false);
    }

    function alreadySyncUsed() {
        var isSyncPluginEnabled = Lampa.Storage.get('plugins', '[]').some(function (plugin) {
            return plugin.status == 1 && isSyncScript(plugin.url);
        });

        if (isSyncPluginEnabled) {
            return true;
        }

        return $.map($('script'), function (script) {
            return $(script).attr('src') || '';
        }).some(function (src) {
            return isSyncScript(src);
        });

        function isSyncScript(url) {
            return url.indexOf('/sync.js') >= 0 || url.indexOf('/sync/') >= 0
        }
    }

    function addAuthParams(url) {
        url = url + '';
        if (url.indexOf('account_email=') == -1) {
            var email = Lampa.Storage.get('account_email');
            if (email) url = Lampa.Utils.addUrlComponent(url, 'account_email=' + encodeURIComponent(email));
        }
        if (url.indexOf('uid=') == -1) {
            var uid = Lampa.Storage.get('lampac_unic_id', '');
            if (uid) url = Lampa.Utils.addUrlComponent(url, 'uid=' + encodeURIComponent(uid));
        }
        return url;
    }

    function Logger() {
        var levels = ['info', 'warning', 'error', 'debug'];
        var tags = { info: 'INF', warning: 'WRN', error: 'ERR', debug: 'DBG' };

        levels.forEach(function (level) {
            this[level] = function () {
                this.log(tags[level] + ':', arguments);
            };
        }, this);

        this.log = function (tag, args) {
            console.log.apply(console, ['Profiles', tag].concat(Array.prototype.slice.call(args)));
        };
    }

    var syncConfig = {
        check: {
            interval: 200,
            timeout: 3 * 60 * 1000,
        },
        syncKeys: [
            'favorite',
            'online_last_balanser',
            'online_watched_last',
            'torrents_view',
            'torrents_filter_data',
            'file_view',
            'online_view',
        ],
        syncTimestamps: [
            'lampac_sync_favorite',
            'lampac_sync_view',
        ],
    };

    var data = {
        syncProfileId: '',
        userProfiles: [],
        defaultProfileIcon: 'https://levende.github.io/lampa-plugins/assets/profile_icon.png',
    };

    if (window.appready) {
        setTimeout(function () { startPlugin(); }, 500);
    } else {
        var onAppReady = function (event) {
            if (event.type != 'ready') return;
            Lampa.Listener.remove('app', onAppReady);
            setTimeout(function () { startPlugin(); }, 500);
        }
        Lampa.Listener.follow('app', onAppReady);
    }
})();