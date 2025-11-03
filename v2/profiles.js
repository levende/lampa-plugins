(function () {
    'use strict';

    // Polyfills
    if(!Array.prototype.forEach){Array.prototype.forEach=function(c,t){var o=Object(this),l=o.length>>>0,k=0;if(typeof c!=="function")throw new TypeError(c+" is not a function");if(arguments.length>1)t=thisArg;while(k<l){if(k in o)c.call(t,o[k],k,o);k++};};}
    if(!Array.prototype.some){Array.prototype.some=function(c,t){var o=Object(this),l=o.length>>>0,i=0;if(typeof c!=="function")throw new TypeError(c+" is not a function");for(;i<l;i++)if(i in o&&c.call(t,o[i],i,o))return true;return false;};}
    if(!Array.prototype.map){Array.prototype.map=function(c,t){var o=Object(this),l=o.length>>>0,a=new Array(l),k=0;if(typeof c!=="function")throw new TypeError(c+" is not a function");if(arguments.length>1)t=thisArg;while(k<l){if(k in o)a[k]=c.call(t,o[k],k,o);k++;}return a;};}
    if(!Array.prototype.filter){Array.prototype.filter=function(c,t){var o=Object(this),l=o.length>>>0,r=[],i=0;if(typeof c!=="function")throw new TypeError(c+" is not a function");for(;i<l;i++)if(i in o&&c.call(t,o[i],i,o))r.push(o[i]);return r;};}
    if(!Object.keys){Object.keys=function(){var h=Object.prototype.hasOwnProperty,d=!({toString:null}).propertyIsEnumerable("toString"),e=["toString","toLocaleString","valueOf","hasOwnProperty","isPrototypeOf","propertyIsEnumerable","constructor"],l=e.length;return function(o){if(typeof o!=="object"&&(typeof o!=="function"||o===null))throw new TypeError("Object.keys called on non-object");var r=[],p,i;for(p in o)if(h.call(o,p))r.push(p);if(d)for(i=0;i<l;i++)if(h.call(o,e[i]))r.push(e[i]);return r;};}();}
    (function(){if(typeof window.CustomEvent==="function")return false;function CustomEvent(e,p){p=p||{bubbles:false,cancelable:false,detail:undefined};var evt=document.createEvent("CustomEvent");evt.initCustomEvent(e,p.bubbles,p.cancelable,p.detail);return evt;}CustomEvent.prototype=window.Event.prototype;window.CustomEvent=CustomEvent;})();
    if(!navigator.userAgent)navigator.userAgent="";
    if(!document.createEvent)document.createEvent=function(t){var e=document.createEventObject();e.type=t;e.bubbles=false;e.cancelable=false;return e;};
    if(!window.location.origin){window.location.origin=window.location.protocol+"//"+window.location.hostname+(window.location.port ? ":"+window.location.port : "");}

    var pluginManifest = {
        version: '2.6.3',
        author: 'levende',
        docs: 'https://levende.github.io/lampa-plugins/docs/profiles',
        contact: 'https://t.me/levende',
    };

    var injectableSettings = {
        host: window.location.origin,
        profiles: [],
        defaultProfileIcon: 'https://levende.github.io/lampa-plugins/assets/profile_icon.png',
        showSettings: false,
        syncEnabled: true,
        broadcastEnabled: true,
        broadcastScanAll: false
    };

    var originalOpen = XMLHttpRequest.prototype.open;
    var originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
        this._method = method;
        this._url = url;
        return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
        var xhr = this;
        var originalOnReadyStateChange = xhr.onreadystatechange;

        xhr.onreadystatechange = function () {
            var method = xhr._method;
            var url = xhr._url;

            if (method === 'GET' && url.indexOf('/bookmark/list') !== -1) {
                setTimeout(function () {
                    Lampa.Storage.set('lampac_sync_favorite', 666);
                }, 350);
            }

            if (originalOnReadyStateChange) {
                originalOnReadyStateChange.apply(xhr, arguments);
            }
        };

        return originalSend.apply(this, arguments);
    };

    var DEVICE_TYPES = {
        'Amazon Fire TV': {
            check: function(ua) { return ua.match(/Fire TV|Amazon/i); },
            name: 'Amazon Fire TV'
        },
        'NVIDIA Shield TV': {
            check: function(ua) { return ua.match(/SHIELD|NVIDIA/i); },
            name: 'NVIDIA Shield TV'
        },
        'Roku': {
            check: function(ua) { return ua.match(/Roku/i) && !ua.match(/TCL/i); },
            name: 'Roku'
        },
        'Xiaomi Mi Box': {
            check: function(ua) { return ua.match(/MiBox|Xiaomi/i); },
            name: 'Xiaomi Mi Box'
        },
        'Apple TV': {
            check: function(ua) { return Lampa.Platform.screen('tv') && ua.match(/Apple/) && ua.match(/iPad/) && !Lampa.Platform.screen('mobile'); },
            name: 'Apple TV'
        },
        'LG WebOS TV': {
            check: function(ua) { return Lampa.Platform.screen('tv') && ua.match(/WebOS|LG/i); },
            name: 'LG WebOS TV'
        },
        'Samsung Tizen TV': {
            check: function(ua) { return Lampa.Platform.screen('tv') && ua.match(/Samsung|Tizen/i); },
            name: 'Samsung Tizen TV'
        },
        'Sony Bravia TV': {
            check: function(ua) { return Lampa.Platform.screen('tv') && ua.match(/Sony|Bravia/i); },
            name: 'Sony Bravia TV'
        },
        'TCL Roku TV': {
            check: function(ua) { return Lampa.Platform.screen('tv') && ua.match(/Roku|TCL/i); },
            name: 'TCL Roku TV'
        },
        'Hisense VIDAA TV': {
            check: function(ua) { return Lampa.Platform.screen('tv') && ua.match(/VIDAA|Hisense/i); },
            name: 'Hisense VIDAA TV'
        },
        'Haier Smart TV': {
            check: function(ua) { return Lampa.Platform.screen('tv') && ua.match(/Haier/i); },
            name: 'Haier Smart TV'
        },
        'Yandex Smart TV': {
            check: function(ua) { return Lampa.Platform.screen('tv') && ua.match(/YNDX|Yandex|YandexTV/i); },
            name: 'Yandex Smart TV'
        },
        'Android Device': {
            check: function(ua) { return ua.match(/Android/) && !Lampa.Platform.screen('tv'); },
            name: 'Android Device'
        },
        'Smart TV': {
            check: function(ua) { return Lampa.Platform.screen('tv') && ua.match(/Smart-TV|Smart TV|TV/i); },
            name: 'Smart TV'
        },
        'Android TV': {
            check: function(ua) { return Lampa.Platform.screen('tv') && ua.match(/Android/) && !ua.match(/MiBox|SHIELD|Yandex/i); },
            name: 'Android TV'
        },
        'iPhone': {
            check: function(ua) { return ua.match(/iPhone/); },
            name: 'iPhone'
        },
        'iPad': {
            check: function(ua) { return ua.match(/iPad|Macintosh/) && Lampa.Platform.screen('mobile'); },
            name: 'iPad'
        },
        'Mac Device': {
            check: function(ua) { return ua.match(/Macintosh|iPad/) && !Lampa.Platform.screen('mobile'); },
            name: 'Mac Device'
        },
        'Windows PC': {
            check: function(ua) { return ua.match(/Windows/); },
            name: 'Windows PC'
        }
    };

    var Utils = {
        Device: {
            extractName: function (userAgent) {
                if (!userAgent || typeof userAgent !== 'string') {
                    return 'Unknown Device - (Unknown Details)';
                }
                var deviceMatch = userAgent.match(/\((.*?)\)/);
                var deviceDetails = deviceMatch ? deviceMatch[1] : 'Unknown Details';
                for (var key in DEVICE_TYPES) {
                    if (DEVICE_TYPES.hasOwnProperty(key) && DEVICE_TYPES[key].check(userAgent)) {
                        return DEVICE_TYPES[key].name + ' - (' + deviceDetails + ')';
                    }
                }
                return 'Unknown Device - (' + deviceDetails + ')';
            },
            getInfo: function () {
                var userAgent = navigator.userAgent || '';
                var deviceName = this.extractName(userAgent);

                var deviceInfo = {
                    name: deviceName,
                    userAgent: userAgent
                };

                if (window.lwsEvent && window.lwsEvent.connectionId) {
                    deviceInfo.wsConnectionId = window.lwsEvent.connectionId;
                }

                return deviceInfo;
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
            var start = new Date().getTime();
            var callback = options.callback || function () { };

            function checkCondition() {
                if (options.conditionFn()) {
                    callback(true);
                    return;
                }

                if (new Date().getTime() - start >= options.timeout) {
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

        self.connectionEventTypes = {
            CONNECTED: "connected",
            RECONNECTED: "reconnected",
            CLOSED: "onclose"
        };

        document.addEventListener('lwsEvent', function (event) {
            if (!event.detail) return;

            var eventDetail = event.detail;
            if (eventDetail.name === 'system' && eventDetail.src !== self.pluginSrc && isConnectionEvent(eventDetail.data)) {
                self.connected = eventDetail.data === 'connected';
                Lampa.Listener.send('lws_connect', {
                    connected: self.connected
                });
                logger.debug('lws connection changed: ' + self.connected);
            }

            function isConnectionEvent(value) {
                var connectionTypes = self.connectionEventTypes;
                return Object.keys(connectionTypes).some(function (type) {
                    return connectionTypes[type] == value;
                });
            }
        });
    }

    function BroadcastService(ws, state) {
        var self = this;

        var $broadcastBtn = $('<div class="head__action head__settings selector open--broadcast-lampac"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.04272 7.22978V6.76392C1.04272 4.00249 3.2813 1.76392 6.04272 1.76392H17.7877C20.5491 1.76392 22.7877 4.00249 22.7877 6.76392V17.2999C22.7877 20.0613 20.5491 22.2999 17.7877 22.2999H15.8387" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"></path><circle cx="6.69829" cy="16.6443" r="5.65556" fill="currentColor"></circle></svg></div>');

        self.init = function () {
            extendContextMenu();
            addBroadcastButton();

            document.addEventListener('lwsEvent', function (event) {
                if (event.detail.name === 'profiles_broadcast_discovery' && (state.broadcastScanAll || event.detail.data === state.syncProfileId)) {
                    var deviceInfo = Utils.Device.getInfo();
                    window.lwsEvent.send('profiles_broadcast_discovery_response', JSON.stringify(deviceInfo));
                }

                if (event.detail.name === 'profiles_broadcast_open_full') {
                    var openRequest = JSON.parse(event.detail.data);
                    if (openRequest.connectionId === window.lwsEvent.connectionId) {
                        Lampa.Activity.push({
                            card: openRequest.data,
                            component: 'full',
                            method: openRequest.data.method,
                            source: openRequest.data.source,
                            id: openRequest.data.id
                        });
                    }
                }

                if (event.detail.name === 'profiles_broadcast_open_player') {
                    var openRequest = JSON.parse(event.detail.data);

                    if (openRequest.connectionId === window.lwsEvent.connectionId) {
                        Lampa.Controller.toContent();
                        Lampa.Modal.open({
                            title: '',
                            align: 'center',
                            html: $('<div class="about">' + Lampa.Lang.translate('confirm_open_player') + '</div>'),
                            buttons: [{
                                name: Lampa.Lang.translate('settings_param_no'),
                                onSelect: function () {
                                    Lampa.Modal.close();
                                    Lampa.Controller.toggle('content');
                                }
                            }, {
                                name: Lampa.Lang.translate('settings_param_yes'),
                                onSelect: function () {
                                    Lampa.Modal.close();
                                    Lampa.Controller.toggle('content');
                                    Lampa.Player.play(openRequest.data.player);
                                    Lampa.Player.playlist(openRequest.data.playlist);
                                }
                            }],
                            onBack: function () {
                                Lampa.Modal.close();
                                Lampa.Controller.toggle('content');
                            }
                        });
                    }
                }
            });

            Lampa.Listener.follow('activity', function (event) {
                if (ws.connected && event.type === 'start' && event.component === 'full') {
                    $broadcastBtn.show();
                } else {
                    $broadcastBtn.hide();
                }
            });

            Lampa.PlayerPanel.listener.follow('share', function (e) {
                broadcast(Lampa.Lang.translate('broadcast_play'), function (device) {
                    broadcastPlayer(function () {
                        return {
                            player: Lampa.Player.playdata(),
                            playlist: Lampa.PlayerPlaylist.get()
                        };
                    });
                });
            });

            window.lampac_online_context_menu = {
                push: function (menu, extra, params) {
                    if (extra && params && params.element && (params.element.method === 'play' || params.element.method === 'call')) {
                        menu.push({
                            title: Lampa.Lang.translate('player_share_descr'),
                            broadcast_play: true
                        });
                    }
                },
                onSelect: function (a, params) {
                    if (a.broadcast_play) {
                        withPlayerFromContextMenu(params.element, function (data) {
                            broadcastPlayer(function () { return data; });
                        });
                    }
                }
            };
        };

        function withPlayerFromContextMenu(element, callback) {
            if (element.method === 'play') {
                callback({
                    player: {
                        quality: element.qualitys,
                        title: element.title,
                        url: element.url,
                        timeline: element.timeline
                    },
                    playlist: []
                });
            } else if (element.method === 'call') {
                apiSvc.send(element.url, function (player) {
                    player.timeline = element.timeline;
                    callback({
                        player: player,
                        playlist: []
                    });
                }, function () {
                    Lampa.Noty.show(Lampa.Lang.translate('network_error'));
                });
            } else {
                Lampa.Noty.show(Lampa.Lang.translate('network_error'));
            }
        }

        function broadcastPlayer(getPlayerDataFunc) {
            broadcast(Lampa.Lang.translate('broadcast_play'), function (device) {
                var openRequest = {
                    data: getPlayerDataFunc(),
                    connectionId: device.wsConnectionId
                };

                window.lwsEvent.send('profiles_broadcast_open_player', JSON.stringify(openRequest));
            });
        }

        function broadcast(text, callback) {
            var enabled = Lampa.Controller.enabled().name;

            var template = Lampa.Template.get('broadcast', {
                text: text
            });

            var $list = template.find('.broadcast__devices');
            $list.empty();
            var deviceList = [];

            template.find('.about').remove();

            document.addEventListener('lwsEvent', handleDiscoveryResponse);
            window.lwsEvent.send('profiles_broadcast_discovery', state.syncProfileId);

            var interval = 500;
            var duration = 3000;

            var timer = setInterval(function () {
                window.lwsEvent.send('profiles_broadcast_discovery', state.syncProfileId);
            }, interval);

            setTimeout(function () {
                clearInterval(timer);
                document.removeEventListener('lwsEvent', handleDiscoveryResponse);
            }, duration);

            Lampa.Modal.open({
                title: '',
                html: template,
                size: 'small',
                mask: true,
                onBack: function () {
                    document.removeEventListener('lwsEvent', handleDiscoveryResponse);
                    Lampa.Modal.close();
                    Lampa.Controller.toggle(enabled);
                }
            });

            function handleDiscoveryResponse(event) {
                if (event.detail.name === 'profiles_broadcast_discovery_response') {
                    var device = JSON.parse(event.detail.data);

                    if (deviceList.indexOf(device.wsConnectionId) >= 0) {
                        return;
                    }

                    var item = $('<div class="broadcast__device selector">' + device.name + '</div>');

                    item.on('hover:enter', function () {
                        document.removeEventListener('lwsEvent', handleDiscoveryResponse);
                        Lampa.Modal.close();
                        Lampa.Controller.toggle(enabled);

                        callback(device);
                    });
                    $list.append(item);

                    if (deviceList.length === 0) {
                        Lampa.Modal.toggle(item[0]);
                    }

                    deviceList.push(device.wsConnectionId);
                }
            }
        }

        function extendContextMenu() {
            var manifest = {
                type: 'video',
                version: '1.0.0',
                name: Lampa.Lang.translate('broadcast_open'),
                description: '',
                onContextMenu: function (object) {
                    if (ws.connected) return;
                    return {
                        name: Lampa.Lang.translate('broadcast_open'),
                        description: ''
                    };
                },
                onContextLauch: function (data) {
                    broadcast(Lampa.Lang.translate('broadcast_open'), function (device) {
                        if (!data.method) {
                            data.method = data.number_of_seasons || data.seasons || data.last_episode_to_air || data.first_episode_to_air || data.first_air_date ? 'tv' : 'movie';
                        }

                        data.source = data.source || Lampa.Storage.get('source', 'cub');

                        var openRequest = {
                            data: data,
                            connectionId: device.wsConnectionId
                        };

                        window.lwsEvent.send('profiles_broadcast_open_full', JSON.stringify(openRequest));
                    });
                }
            };

            Lampa.Manifest.plugins = manifest;
        }

        function addBroadcastButton() {
            $('.open--broadcast').remove();
            Lampa.Broadcast.open = function () { };

            $broadcastBtn.on('hover:enter hover:click hover:touch', function () {
                broadcast(Lampa.Lang.translate('broadcast_open'), function (device) {
                    var openRequest = {
                        data: Lampa.Activity.extractObject(Lampa.Activity.active()),
                        connectionId: device.wsConnectionId
                    };

                    window.lwsEvent.send('profiles_broadcast_open_full', JSON.stringify(openRequest));
                });
            });

            $('.head__action.open--search').after($broadcastBtn);
            
            var currentActive = Lampa.Activity.active();
            if (!ws.connected || !currentActive || currentActive.component !== 'full') {
                $broadcastBtn.hide();
            }

            Lampa.Listener.follow('lws_connect', function (event) {
                var active = Lampa.Activity.active();
                if (event.connected && !!active && active.component === 'full') {
                    $broadcastBtn.show();
                }
            });
        }
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
            && typeof externalSettings === 'object'
            && !Array.isArray(externalSettings);

        Object.keys(injectableSettings).forEach(function (key) {
            self[key] = hasExternalSettings && externalSettings.hasOwnProperty(key)
                ? externalSettings[key]
                : injectableSettings[key];
        });

        if (!!externalSettings && typeof externalSettings === 'object' && !Array.isArray(externalSettings)) {
            Object.keys(injectableSettings).forEach(function (key) {
                self[key] = externalSettings.hasOwnProperty(key)
                    ? externalSettings[key]
                    : injectableSettings[key];
            });
        }

        self.getCurrentProfile = function () {
            return self.profiles.find(function (profile) {
                return profile.selected;
            });
        };

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

            if (!Lampa.ParentalControl) {
                Lampa.ParentalControl = {
                    query: function (success, error) {
                        if (typeof success === 'function') success();
                    }
                };
            }
        }
    }

    function ProfileManager(state, ws) {
        var self = this;

        this.render = function () {
            var currentProfile = state.getCurrentProfile();

            var profileButton = $('<div class="head__action selector open--profile"><img id="user_profile_icon" src="' + currentProfile.icon + '"/></div>');
            $('.open--profile').before(profileButton).remove();

            var showProfileSelect = function () {
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

                                    if (Lampa.Favorite.read) Lampa.Favorite.read(true);
                                    else Lampa.Favorite.init();

                                    self.softRefresh();
                                });
                        }
                    },
                    onBack: function () {
                        Lampa.Controller.toggle('content');
                    },
                });
            }

            profileButton.on('hover:enter hover:click hover:touch', function () {
                var parentControlScopes = Lampa.Storage.get('parental_control_personal', []);

                if (parentControlScopes.indexOf('account_profiles') !== -1) {
                    var controllerName = Lampa.Controller.enabled().name;
                    Lampa.ParentalControl.query(
                        showProfileSelect,
                        function() { Lampa.Controller.toggle(controllerName) });
                } else {
                    showProfileSelect()
                }
            });
        };

        function switchOnlineProfile(currentProfile, newProfile, refresh) {
            reset();

            if (!ws.connected) {
                window.location.reload();
            }

            setTimeout(function () {
                logger.debug('Sync with new profile');
                window.sync_disable = false;

                var event = new CustomEvent('lwsEvent', {
                    detail: { name: 'system', data: ws.connectionEventTypes.RECONNECTED, src: ws.pluginSrc }
                });

                document.dispatchEvent(event);
                Lampa.Listener.send('lampac', {name: "bookmark_pullFromServer" });
            }, 50);

            waiter.wait({
                interval: state.sync.time.interval,
                timeout: state.sync.time.timeout,
                conditionFn: function () {
                    return state.sync.timestamps.every(function (timestampField) {
                        return !!Lampa.Storage.get(timestampField, 0);
                    });
                },
                callback: function (synced) {
                    Lampa.Loading.stop();

                    if (!synced) {
                        window.location.reload();
                    }

                    var syncedEvent = new CustomEvent('lwsEvent', {
                        detail: { name: 'profile_synced', data: newProfile.id, src: ws.pluginSrc }
                    });

                    document.dispatchEvent(syncedEvent);

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

            if (Lampa.Favorite.read) Lampa.Favorite.read(true);
            else Lampa.Favorite.init();

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
        };

        function reset() {
            state.sync.keys.forEach(localStorage.removeItem.bind(localStorage));
            Lampa.Storage.set('favorite', {});

            if (Lampa.Favorite.read) Lampa.Favorite.read(true);
            else Lampa.Favorite.init();

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
        }

        function compareVersions(v1, v2) {
            var a = v1.split('.').map(x => parseInt(x, 10));
            var b = v2.split('.').map(x => parseInt(x, 10));
            var len = Math.max(a.length, b.length);

            for (var i = 0; i < len; i++) {
                var diff = (a[i] || 0) - (b[i] || 0);
                if (diff !== 0) return diff > 0 ? 1 : -1;
            }
            return 0;
        }

        function testBackendAccess(callback) {
            apiSvc.send(
                state.host + '/version',
                function(version) {
                    apiSvc.send(
                        state.host + '/testaccsdb',
                        function (response) { callback(!!response && response.accsdb == false, version); },
                        function () { callback(false, 0); }
                    );
                },
                function () { callback(false, 0); }
            );
        }

        function getReqinfo(callback) {
            if (!!window.reqinfo) {
                callback(window.reqinfo);
                return;
            }

            apiSvc.send(state.host + '/reqinfo', callback);
        }

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
        }

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
        }

        function syncScriptUsed() {
            var isSyncPluginEnabled = Lampa.Storage.get('plugins', '[]').some(function (plugin) {
                return plugin.status == 1 && isSyncScript(plugin.url);
            });

            if (isSyncPluginEnabled) {
                return true;
            }

            var scripts = $.map($('script'), function (script) {
                return $(script).attr('src') || '';
            });

            return scripts.some(function (src) {
                return isSyncScript(src);
            });

            function isSyncScript(url) {
                return url.indexOf('/sync.js') >= 0 || url.indexOf('/sync/') >= 0;
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

            testBackendAccess(function (online, version) {
                if (compareVersions(String(version), '148.12') >= 0 && compareVersions(String(version), '148.14') <= 0) {
                    Lampa.Noty.show('Invalid Lampac version: ' + version + '. Please update to 148.15 or higher.');
                    return;
                }

                getProfiles(function (profiles) {
                    state.profiles = profiles;

                    var offline = !online && profiles.length > 0;
                    state.online = !offline;

                    if (profiles.length == 0) {
                        logger.error('Profiles are not defined');
                        return;
                    }

                    if (state.online && state.broadcastEnabled) {
                        var broadcastSvc = new BroadcastService(ws, state);
                        broadcastSvc.init();
                    }

                    var currentProfile = state.profiles.find(function (profile) {
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
                    });
                });
            });
        };
    }

    function SettingsManager(state) {
        this.init = function () {
            if (!state.showSettings) {
                return;
            }

            addLocalization();
            addSettings();
        };

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
        Lampa.Listener.follow('app', function() {
            setTimeout(function () { new Plugin().start(); }, 500);
        });
    }
})();
