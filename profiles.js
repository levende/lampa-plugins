(function () {
    'use strict';

    var pluginManifest = {
        version: '2.1.0',
        author: 'levende',
        docs: 'https://levende.github.io/lampa-plugins/docs/profiles',
        contact: 'https://t.me/levende',
    };

    var injectableSettings = {
        host: window.location.origin,
        profiles: [],
        defaultProfileIcon: 'https://levende.github.io/lampa-plugins/assets/profile_icon.png',
        showSettings: true,
        syncEnabled: true
    };

    var Utils = {
        Array: {
            find: function (array, predicate) {
                for (var i = 0; i < array.length; i++) {
                    if (predicate(array[i], i, array)) {
                        return array[i];
                    }
                }
                return null;
            },
            some: function (array, predicate) {
                for (var i = 0; i < array.length; i++) {
                    if (predicate(array[i], i, array)) {
                        return true;
                    }
                }
                return false;
            },
        },
        Date: {
            now: function () {
                return new Date().getTime();
            }
        },
        Object: {
            keys: function (obj) {
                var keys = [];
                for (var key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        keys.push(key);
                    }
                }
                return keys;
            }
        },
        CustomEvent: {
            get: function (event, params) {
                params = params || { bubbles: false, cancelable: false, detail: undefined };
                var evt = document.createEvent('CustomEvent');
                evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
                return evt;
            }
        }
    };

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

    function NotifyService() {
        this.notify = function (profile, eventType) {
            Lampa.Listener.send('profile', {
                type: eventType,
                profileId: profile.id,
                params: profile.params,
            });
        };
    }

    function ApiService() {
        var network = new Lampa.Reguest();

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

        this.send = function (url, callback, errCallback) {
            network.silent(addAuthParams(url), callback, errCallback)
        }
    }

    function Waiter() {
        this.wait = function (options) {
            logger.debug('Wait', { interval: options.interval, timeout: options.timeout });
            var start = Utils.Date.now();
            var callback = options.callback || function () { };

            function checkCondition() {
                if (options.conditionFn()) {
                    callback(true);
                    return;
                }

                if (Utils.Date.now() - start >= options.timeout) {
                    callback(false);
                    return;
                }

                setTimeout(checkCondition, options.interval);
            }

            checkCondition();
        }
    }

    var logger = new Logger();
    var waiter = new Waiter();
    var apiSvc = new ApiService();
    var notifySvc = new NotifyService();

    function WebSocketService() {
        var self = this;

        self.pluginSrc = 'profiles.js';
        self.connected = !!window.lwsEvent && window.lwsEvent.init;

        self.connectionEventTypes = Object.freeze({
            CONNECTED: "connected",
            RECONNECTED: "reconnected",
            CLOSED: "onclose",
        });

        document.addEventListener('lwsEvent', function (event) {
            if (!event.detail) return;

            var eventDetail = event.detail;
            if (eventDetail.name === 'system' && eventDetail.src !== self.pluginSrc && isConnectionEvent(eventDetail.data)) {
                self.connected = eventDetail.data === 'connected';
                logger.debug('lws connection changed: ' + self.connected);
            }

            function isConnectionEvent(value) {
                var connectionTypes = self.connectionEventTypes;
                return Utils.Array.some(Utils.Object.keys(connectionTypes), function (type) {
                    return connectionTypes[type] == value;
                });
            }
        });
    }

    function StateService() {
        var self = this;

        self.configured = false;
        self.syncProfileId = Lampa.Storage.get('lampac_profile_id', '');
        self.online = false;

        self.sync = {
            time: {
                interval: 200,
                timeout: Lampa.Storage.get('lampac_profile_refresh_timeout', 10) * 1000,
            },
            keys: [
                'favorite',
                'online_last_balanser',
                'online_watched_last',
                'torrents_view',
                'torrents_filter_data',
                'file_view',
                'online_view',
            ],
            timestamps: [
                'lampac_sync_favorite',
                'lampac_sync_view',
            ],
        };

        var externalSettings = window.profiles_settings;
        var hasExternalSettings = !!externalSettings
            && externalSettings === 'object'
            && !Array.isArray(externalSettings)

        Utils.Object.keys(injectableSettings).forEach(function (key) {
            self[key] = hasExternalSettings && externalSettings.hasOwnProperty(key)
                ? externalSettings[key]
                : injectableSettings[key];
        });

        if (!!externalSettings && typeof externalSettings === 'object' && !Array.isArray(externalSettings)) {
            Utils.Object.keys(injectableSettings).forEach(function (key) {
                self[key] = externalSettings.hasOwnProperty(key)
                    ? externalSettings[key]
                    : injectableSettings[key];
            });
        }

        self.getCurrentProfile = function () {
            return Utils.Array.find(self.profiles, function (profile) {
                return profile.selected;
            });
        }

        self.isRefreshType = function (refreshType) {
            return Lampa.Storage.get('lampac_profile_upt_type', 'soft') == refreshType;
        };
    }

    function Plugin() {
        this.start = function () {
            if (window.profiles_plugin) {
                logger.warning('Plugin already has been started');
                return;
            }

            window.profiles_plugin = true;
            logger.info('Start', pluginManifest);

            window.addEventListener('error', function (e) {
                if (e.filename.indexOf('profiles.js') !== -1) {
                    var stack = (e.error && e.error.stack ? e.error.stack : e.stack || '').split('\n').join('<br>');
                    logger.error('JS ERROR', e.filename, (e.error || e).message, stack);
                }
            });

            var stateSvc = new StateService();
            var wsSvc = new WebSocketService();

            var settingsManager = new SettingsManager(stateSvc);
            settingsManager.init();

            var profilesSvc = new ProfilesService(stateSvc, wsSvc, new ProfileManager(stateSvc, wsSvc));
            profilesSvc.init();
        }
    }

    function ProfileManager(state, ws) {
        var self = this;

        this.render = function () {
            var currentProfile = state.getCurrentProfile();

            var profileButton = $(
                '<div class="head__action selector open--profile">' +
                '<img id="user_profile_icon" src="' + currentProfile.icon + '"/>' +
                '</div>');

            $('.open--profile').before(profileButton).remove();

            profileButton.on('hover:enter hover:click hover:touch', function () {
                Lampa.Select.show({
                    title: Lampa.Lang.translate('account_profiles'),
                    nomark: false,
                    items: state.profiles.map(function (profile) {
                        return {
                            title: profile.title,
                            template: 'selectbox_icon',
                            icon: '<img src="' + profile.icon + '" style="width: 50px; height: 50px;" />',
                            selected: profile.selected,
                            profile: profile
                        };
                    }),
                    onSelect: function (item) {
                        window.sync_disable = item.profile.id != state.syncProfileId;

                        if (window.sync_disable) {
                            logger.info('Profile has been selected', item.profile);

                            var currentProfile = state.getCurrentProfile();

                            item.profile.selected = true;
                            state.syncProfileId = item.profile.id;

                            Lampa.Storage.set('lampac_profile_id', item.profile.id);
                            notifySvc.notify(item.profile, 'changed');

                            state.profiles
                                .filter(function (profile) { return profile.id != item.profile.id; })
                                .forEach(function (profile) { profile.selected = false; });

                            $('#user_profile_icon').attr('src', item.profile.icon);

                            var switchFn = state.online && state.syncEnabled ? switchOnlineProfile : switchOfflineProfile;

                            Lampa.Loading.start();
                            switchFn(
                                currentProfile,
                                item.profile,
                                function () {
                                    Lampa.Loading.stop();

                                    if (state.isRefreshType('full')) {
                                        window.location.reload();
                                        return;
                                    }

                                    Lampa.Activity.all().forEach(function (page) {
                                        page.outdated = true;
                                    });

                                    Lampa.Favorite.init();
                                    self.softRefresh();
                                });
                        }
                    },
                    onBack: function () {
                        Lampa.Controller.toggle('content');
                    },
                });
            });
        }

        function switchOnlineProfile(currentProfile, newProfile, refresh) {
            reset();

            if (!ws.connected) {
                window.location.reload();
            }

            setTimeout(function () {
                logger.debug('Sync with new profile');
                window.sync_disable = false;

                var event = Utils.CustomEvent.get('lwsEvent', {
                    detail: { name: 'system', data: ws.connectionEventTypes.RECONNECTED, src: ws.pluginSrc },
                });
                document.dispatchEvent(event);
            }, 200);

            waiter.wait({
                interval: state.sync.time.interval,
                timeout: state.sync.time.timeout,
                conditionFn: function () {
                    return state.sync.timestamps.every(function (timestampField) {
                        return Lampa.Storage.get(timestampField, 0) !== 0;
                    })
                },
                callback: function (synced) {
                    Lampa.Loading.stop();

                    if (!synced) {
                        window.location.reload();
                    }

                    refresh();
                }
            });
        }

        function switchOfflineProfile(currentProfile, newProfile, refresh) {
            backupOfflineProfile(currentProfile);
            reset();
            restoreOfflineProfile(newProfile);

            Lampa.Loading.stop();
            refresh();
        }

        function backupOfflineProfile(profile) {
            state.sync.keys.forEach(function (field) {
                var backupValue = Lampa.Storage.get(field, 'none');
                if (backupValue != 'none') {
                    var backupKey = 'lampac_profile_backup_' + profile.id + '_' + field;
                    Lampa.Storage.set(backupKey, backupValue);
                }
            });

            logger.debug('Profile data has been backed up for profile', profile);
        }

        function restoreOfflineProfile(profile) {
            state.sync.keys.forEach(function (field) {
                var backupKey = 'lampac_profile_backup_' + profile.id + '_' + field;
                var backupValue = Lampa.Storage.get(backupKey, 'none');
                if (backupValue != 'none') {
                    Lampa.Storage.set(field, backupValue);
                }
            });

            Lampa.Favorite.init();
            logger.debug('Profile data has been restored for profile', profile);
        }

        self.softRefresh = function () {
            var activity = Lampa.Activity.active();

            if (activity.page) {
                activity.page = 1;
            }

            Lampa.Activity.replace(activity);
            activity.outdated = false;

            logger.info('Page has been soft refreshed', activity);
        }

        function reset() {
            state.sync.keys.forEach(localStorage.removeItem.bind(localStorage));
            Lampa.Storage.set('favorite', {});
            Lampa.Favorite.init();

            state.sync.timestamps.forEach(function (timestamp) {
                Lampa.Storage.set(timestamp, 0);
            });
            logger.debug('Profile data has been removed');
        }
    }

    function ProfilesService(state, ws, manager) {
        var self = this;

        var configured = false;

        function configureListeners() {
            Lampa.Storage.listener.follow('change', function (event) {
                if (['account', 'account_use', 'lampac_unic_id'].indexOf(event.name) !== -1) {
                    location.reload();
                }
            });

            Lampa.Listener.follow('activity', function (event) {
                if (configured && event.type === 'archive' && event.object.outdated && state.isRefreshType('soft')) {
                    manager.softRefresh();
                }
            });

            $.ajaxPrefilter(function (options, originalOptions, jqXHR) {
                if (configured
                    && window.sync_disable
                    && options.url.indexOf('/storage/set') >= 0
                    && options.url.indexOf('path=sync') >= 0) {
                    options.beforeSend = function (jqXHR) {
                        logger.error('Request aborted', options.url);
                        jqXHR.abort();
                    };
                }
            });
        }

        function cubSyncEnabled() {
            return !!Lampa.Storage.get('account', '{}').token && Lampa.Storage.get('account_use', false);
        };

        function testBackendAccess(callback) {
            apiSvc.send(
                state.host + '/testaccsdb',
                function (response) { callback(!!response && response.accsdb == false); },
                function () { callback(false) },
            );
        }

        function getReqinfo(callback) {
            if (!!window.reqinfo) {
                callback(window.reqinfo);
                return;
            }

            apiSvc.send(state.host + '/reqinfo', callback);
        };

        function parseProfiles(profilesObj, callback) {
            if (!profilesObj || !Array.isArray(profilesObj) || profilesObj.length == 0) {
                callback([]);
                return;
            }

            var profiles = profilesObj.map(function (profile, index) {
                var profileId = hasProp(profile.id) ? profile.id.toString() : index.toString();
                var icon = state.defaultProfileIcon;

                if (hasProp(profile.icon)) {
                    icon = profile.icon.replace('{host}', state.host);
                }

                return {
                    title: hasProp(profile.title)
                        ? profile.title.toString()
                        : Lampa.Lang.translate('settings_cub_profile') + ' ' + (index + 1),
                    id: profileId,
                    icon: icon,
                    selected: profileId == state.syncProfileId,
                    params: hasProp(profile.params) ? profile.params : {},
                };
            });

            callback(profiles);

            function hasProp(value) {
                return value != undefined && value != null;
            }
        };

        function getProfiles(callback) {
            if (state.profiles.length > 0) {
                parseProfiles(state.profiles, callback);
                return;
            }

            getReqinfo(function (reqinfo) {
                var hasGlobalParams = !!reqinfo.params && !!reqinfo.params.profiles;

                var hasUserParams = !!reqinfo.user
                    && !!reqinfo.user.params
                    && !!reqinfo.user.params.profiles;

                if (!hasGlobalParams && !hasUserParams) {
                    callback([]);
                    return;
                }

                var params = hasUserParams ? reqinfo.user.params : reqinfo.params;
                parseProfiles(params.profiles, callback);
            });
        };

        function syncScriptUsed() {
            var isSyncPluginEnabled = Utils.Array.some(Lampa.Storage.get('plugins', '[]'), function (plugin) {
                return plugin.status == 1 && isSyncScript(plugin.url);
            });

            if (isSyncPluginEnabled) {
                return true;
            }

            var scripts = $.map($('script'), function (script) {
                return $(script).attr('src') || '';
            });

            return Utils.Array.some(scripts, function (src) {
                return isSyncScript(src);
            });

            function isSyncScript(url) {
                return url.indexOf('/sync.js') >= 0 || url.indexOf('/sync/') >= 0
            }
        }

        self.init = function () {
            if (configured) {
                logger.warning('Plugin is already works');
                return;
            }

            if (cubSyncEnabled()) {
                logger.error('CUB sync is currently enabled');
                return;
            }

            window.sync_disable = !state.syncEnabled;
            configureListeners();

            testBackendAccess(function (online) {
                getProfiles(function (profiles) {
                    state.profiles = profiles;

                    var offline = !online && profiles.length > 0;
                    state.online = !offline;

                    if (profiles.length == 0) {
                        logger.error('Profiles are not defined');
                        return;
                    }

                    var currentProfile = Utils.Array.find(state.profiles, function (profile) {
                        return profile.selected;
                    });

                    if (!currentProfile) {
                        currentProfile = state.profiles[0];
                        currentProfile.selected = true;
                        state.syncProfileId = currentProfile.id;
                        Lampa.Storage.set('lampac_profile_id', currentProfile.id);
                    }

                    notifySvc.notify(currentProfile, 'changed');

                    if (state.online && state.syncEnabled && !syncScriptUsed()) {
                        var scriptPath = state.host + '/sync.js';
                        Lampa.Utils.putScriptAsync([scriptPath], function () {
                            logger.debug('The script has been added to the app', scriptPath);
                        });
                    }

                    manager.render();
                    configured = true;

                    logger.info('Plugin has been loaded', {
                        wsConnected: ws.connected,
                        host: state.host,
                        online: state.online,
                        syncEnabled: state.syncEnabled,
                        profileId: state.syncProfileId,
                        profiles: state.profiles,
                    })
                });
            });
        }
    }

    function SettingsManager(state) {
        this.init = function () {
            if (!state.showSettings) {
                return;
            }

            addLocalization();
            addSettings();
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
                },
                lampac_profile_refresh_timeout: {
                    en: 'Refresh timeout',
                    uk: 'Таймаут оновлення',
                    ru: 'Таймаут обновления',
                },
                lampac_profile_refresh_timeout_descr: {
                    en: 'Timeout for synchronization during soft update (in seconds)',
                    uk: 'Таймаут для синхронізації в разі м’якого оновлення (у секундах)',
                    ru: 'Таймаут для синхронизации при мягком обновление (в секундах)',
                },
                lampac_profiles_plugin_about: {
                    en: 'About the plugin',
                    uk: 'Про плагін',
                    ru: 'О плагине'
                },
                lampac_profiles_plugin_descr: {
                    en: 'The plugin enables profile management in the Lampa app without requiring the CUB service. Additionally, it seamlessly integrates with the Lampac service for data synchronization, ensuring a smooth and connected user experience.',
                    uk: 'Плагін додає можливість керувати профілями в додатку Lampa без необхідності використання сервісу CUB. Крім того, він інтегрується з сервісом Lampac для зручної синхронізації даних, створюючи комфортний користувацький досвід.',
                    ru: 'Плагин позволяет использовать профили в приложении Lampa без необходимости подключения к сервису CUB. Более того, он поддерживает интеграцию с сервисом Lampac, обеспечивая удобную синхронизацию данных и комфортное использование.',
                },
            });
        }

        function showAbout() {
            var html =
                '<p>' + Lampa.Lang.translate('lampac_profiles_plugin_descr') + '</p>' +
                '<div style="width: 65%; float: left;">' +
                '<p><span class="account-add-device__site">' + Lampa.Lang.translate('title_author') + '</span> ' + pluginManifest.author + '</p>' +
                '<p><span class="account-add-device__site">' + Lampa.Lang.translate('about_version') + '</span> ' + pluginManifest.version + '</p>' +
                '</div>' +
                '<div style="width: 30%; float: right; text-align: center;">' +
                '<img src="https://quickchart.io/qr?text=' + pluginManifest.docs + '&size=200" alt="Documentation"/>' +
                '</div>' +
                '<div style="clear: both;"></div>';

            var controller = Lampa.Controller.enabled().name;
            Lampa.Select.show({
                title: Lampa.Lang.translate('lampac_profiles_plugin_about'),
                items: [{
                    title: html,
                    disabled: true
                }],
                onSelect: function () { Lampa.Controller.toggle(controller); },
                onBack: function () { Lampa.Controller.toggle(controller); }
            });
        }

        function addSettings() {
            Lampa.SettingsApi.addComponent({
                component: 'lampac_profiles',
                name: Lampa.Lang.translate('account_profiles'),
                icon: '<?xml version="1.0" encoding="utf-8"?><svg viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.12 12.78C12.05 12.77 11.96 12.77 11.88 12.78C10.12 12.72 8.71997 11.28 8.71997 9.50998C8.71997 7.69998 10.18 6.22998 12 6.22998C13.81 6.22998 15.28 7.69998 15.28 9.50998C15.27 11.28 13.88 12.72 12.12 12.78Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.74 19.3801C16.96 21.0101 14.6 22.0001 12 22.0001C9.40001 22.0001 7.04001 21.0101 5.26001 19.3801C5.36001 18.4401 5.96001 17.5201 7.03001 16.8001C9.77001 14.9801 14.25 14.9801 16.97 16.8001C18.04 17.5201 18.64 18.4401 18.74 19.3801Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
            });

            Lampa.SettingsApi.addParam({
                component: 'lampac_profiles',
                param: {
                    type: 'button',
                    component: 'about'
                },
                field: {
                    name: Lampa.Lang.translate('lampac_profiles_plugin_about'),
                    description: Lampa.Lang.translate('menu_about'),
                },
                onChange: showAbout
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
                    default: 'soft',
                },
                field: {
                    name: Lampa.Lang.translate('lampac_profile_upt_type'),
                    description: Lampa.Lang.translate('lampac_profile_upt_type_descr'),
                },
                onChange: function (value) {
                    Lampa.Storage.set('lampac_profile_upt_type', value);
                }
            });

            Lampa.SettingsApi.addParam({
                component: 'lampac_profiles',
                param: {
                    name: 'lampac_profile_refresh_timeout',
                    type: 'select',
                    values: {
                        5: '5',
                        10: '10',
                        30: '30',
                        60: '60'
                    },
                    default: '10',
                },
                field: {
                    name: Lampa.Lang.translate('lampac_profile_refresh_timeout'),
                    description: Lampa.Lang.translate('lampac_profile_refresh_timeout_descr'),
                },
                onChange: function (value) {
                    Lampa.Storage.set('lampac_profile_refresh_timeout', value);
                    state.sync.time.timeout = value * 1000;
                },
            });
        }
    }

    if (window.appready) {
        setTimeout(function () { new Plugin().start(); }, 500);
    } else {
        var onAppReady = function (event) {
            if (event.type != 'ready') return;
            Lampa.Listener.remove('app', onAppReady);
            setTimeout(function () { new Plugin().start(); }, 500);
        }
        Lampa.Listener.follow('app', onAppReady);
    }
})();