(function () {
    'use strict';

    var host = window.location.origin;
    var network = new Lampa.Reguest();

    function startPlugin() {
        if (window.profiles_plugin == true) {
            console.info('profiles.js: plugin is already started');
            return;
        }

        window.profiles_plugin = true;

        if (Lampa.Storage.get('lampac_unic_id', '') == '') {
            console.error('profiles.js: lampac_unic_id is empty');
            return;
        }

        var cubAccount = Lampa.Storage.get('account', '');
        if (cubAccount && cubAccount.token) {
            console.error('profiles.js: CUB account is used');
            return;
        }

        data.syncProfileId = Lampa.Storage.get('lampac_profile_id', '');

        network.silent(addAuthParams(host + '/reqinfo'), function (reqinfo) {
            if (reqinfo.user_uid) {
                data.userProfiles = getProfiles(reqinfo);

                if (data.userProfiles.length == 0) {
                    console.error('profiles.js: profiles are not defined');
                    return;
                }

                var profile = initDefaultState();
                addProfileButton(profile);
            }
        });
    }

    function initDefaultState() {
        var profile = data.userProfiles.find(function (profile) {
            return profile.selected;
        });

        if (!profile) {
            profile = data.userProfiles[0];
            profile.selected = true;
            data.syncProfileId = profile.id;
            Lampa.Storage.set('lampac_profile_id', profile.id);
        }

        if (!alreadySyncUsed()) {
            Lampa.Utils.putScriptAsync([host + '/sync.js']);
        }

        return profile;
    }

    function addProfileButton(profile) {
        var style = `
            .head__action.open--user_profile {
                padding: 0.1em;
            }
            .head__action.open--user_profile img {
                -webkit-border-radius: 100%;
                -moz-border-radius: 100%;
                border-radius: 100%;
                width: 2.4em;
                height: 2.4em;
            }
        `;

        var styleSheet = document.createElement("style");
        styleSheet.type = "text/css";
        styleSheet.innerText = style;
        document.head.appendChild(styleSheet);

        var profileButton =
            '<div class="head__action selector open--user_profile">' +
            '<img id="user_profile_icon" src="' + profile.icon + '"/>' +
            '</div>';

        $('#app > div.head > div > div.head__actions').append(profileButton);

        $('.open--user_profile').on('hover:enter hover:click hover:touch', function () {
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
                        Lampa.Loading.start();
                        var syncedTimestamps = [];
                        var interceptor = new EventInterceptor(Lampa.Storage.listener);

                        interceptor.onEvent = function (event, data) {
                            console.debug('profiles.json: intercepted event', { event, data });

                            var syncedStorageField = event == 'change'
                                && syncConfig.syncTimestamps.includes(data.name)
                                && data.value > 0;

                            if (!syncedStorageField) return;
                            syncedTimestamps.push(data.name);
                            if (syncConfig.syncTimestamps.length != syncedTimestamps.length) return;

                            interceptor.destroy();
                            Lampa.Loading.stop();

                            var currentActivity = Lampa.Activity.active().activity;
                            currentActivity.needRefresh();
                            if (!currentActivity.canRefresh()) {
                                Lampa.Activity.push({
                                    url: '',
                                    title: Lampa.Lang.translate('title_main') + ' - ' + Lampa.Storage.field('source').toUpperCase(),
                                    component: 'main',
                                    source: Lampa.Storage.field('source'),
                                    page: 1,
                                });
                            }
                        };

                        data.userProfiles.find(function (profile) {
                            return profile.id == data.syncProfileId;
                        }).selected = false;

                        item.profile.selected = true;
                        data.syncProfileId = item.profile.id;

                        Lampa.Storage.set('lampac_profile_id', item.profile.id);
                        clearProfileData();

                        document.dispatchEvent(new CustomEvent('lwsEvent', {
                            detail: { name: 'system', data: 'reconnected' }
                        }));

                        $('#user_profile_icon').attr('src', item.profile.icon);
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

    function getProfiles(reqinfo) {
        var hasGlobalParams = !!reqinfo.params && !!reqinfo.params.profiles;

        var hasUserParams = !!reqinfo.user
            && !!reqinfo.user.params
            && !!reqinfo.user.params.profiles;

        if (!hasGlobalParams && !hasUserParams) {
            return [];
        }

        var params = hasUserParams ? reqinfo.user.params : reqinfo.params;

        return params.profiles.map(function (profile, index) {
            var profileId = hasProp(profile.id) ? profile.id.toString() : index.toString();
            return {
                title: hasProp(profile.title)
                    ? profile.title.toString()
                    : Lampa.Lang.translate('settings_cub_profile') + ' ' + (index + 1),
                id: profileId,
                icon: hasProp(profile.icon) ? profile.icon : data.defaultProfileIcon,
                selected: profileId == data.syncProfileId,
            };
        });

        function hasProp(value) {
            return value != undefined && value != null;
        }
    }

    function clearProfileData() {
        syncConfig.syncKeys.forEach(localStorage.removeItem.bind(localStorage));
        Object.keys(Lampa.Favorite.full()).forEach(Lampa.Favorite.clear.bind(Lampa.Favorite));

        syncConfig.syncTimestamps.forEach(function (timestamp) {
            Lampa.Storage.set(timestamp, 0);
        });
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
        if (url.indexOf('uid=') == -1) {
            var uid = Lampa.Storage.get('lampac_unic_id', '');
            if (uid) url = Lampa.Utils.addUrlComponent(url, 'uid=' + encodeURIComponent(uid));
        }
        return url;
    }

    function EventInterceptor(listener) {
        var self = this;
        var originalSend = listener.send;

        self.onEvent = null;

        listener.send = function (event, data) {
            if (typeof self.onEvent == 'function') {
                self.onEvent(event, data);
            }
        };

        self.destroy = function () {
            listener.send = originalSend;
        }
    }

    var syncConfig = {
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
        defaultProfileIcon: 'data:image/png;base64,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'
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