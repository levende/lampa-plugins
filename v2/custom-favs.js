(function () {
    'use strict';

    if(!window.location.origin){window.location.origin=window.location.protocol+"//"+window.location.hostname+(window.location.port ? ":"+window.location.port : "");}

    var HOST = window.location.origin;
    var STORAGE_KEY = "custom_favorite";
    var STORAGE_SYNC_KEY = "lampac_sync_custom_favorite";

    function CustomFavoriteFolder(data) {
        var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        this.data = data;
        this.params = params;
        this.card = this.data.length ? this.data[0] : {};

        this.create = function () {
            var self = this;

            this.folder = Lampa.Template.js('bookmarks_folder');
            this.folder.querySelector('.bookmarks-folder__title').innerText = Lampa.Lang.translate('menu_' + params.media);
            this.folder.querySelector('.bookmarks-folder__num').innerText = this.data.length;
            this.folder.addEventListener('hover:focus', function () {
                if (self.onFocus) {
                    self.onFocus(self.folder, self.card);
                }
            });
            this.folder.addEventListener('hover:touch', function () {
                if (self.onTouch) {
                    self.onTouch(self.folder, self.card);
                }
            });
            this.folder.addEventListener('hover:hover', function () {
                if (self.onHover) {
                    self.onHover(self.folder, self.card);
                }
            });
            this.folder.addEventListener('hover:enter', function () {
                Lampa.Activity.push({
                    url: '',
                    title: params.title + ' - ' + Lampa.Lang.translate('menu_' + params.media),
                    component: 'favorite',
                    type: params.category,
                    filter: params.media,
                    page: 1
                });
            });
            this.folder.addEventListener('visible', this.visible.bind(this));
        };

        this.image = function (src, i) {
            var self = this;

            var img = document.createElement('img');
            img.addClass('card__img');
            img.addClass('i-' + i);

            img.onload = function () {
                self.folder.classList.add('card--loaded');
            };

            img.onerror = function () {
                img.src = './img/img_broken.svg';
            };

            this.folder.querySelector('.bookmarks-folder__body').append(img);
            img.src = src;
        };

        this.visible = function () {
            var self = this;

            var filtred = this.data.filter(function (a) {
                return a.poster_path;
            }).slice(0, 3);
            filtred.forEach(function (a, i) {
                self.image(Lampa.Api.img(a.poster_path), i);
            });
            if (filtred.length == 0) {
                this.image('./img/img_load.svg');
            }
            if (this.onVisible) {
                this.onVisible(this.folder, data);
            }
        };

        this.destroy = function () {
            this.folder.remove();
        };

        this.render = function (js) {
            return js ? this.folder : $(this.folder);
        };
    }

    function CustomFavorite() {
        var _customFavorite = null;
        var allCustomFavs = [];

        this.migration = function() {
            this.migrationV1();
        }

        this.migrationV1 = function() {
            var customFavs = this.getFavorite();
            var customTypes = customFavs.customTypes || {};
            customFavs.customTypes = customTypes;

            if (typeof customTypes.migrationVersion === 'number'
                && isFinite(customTypes.migrationVersion)
                && customTypes.migrationVersion > 0) {
                return;
            }

            var fav = Lampa.Storage.get('favorite', {});

            if (isFavoriteEmpty(fav)) {
                return;
            }
            
            if (!fav.customTypes || !Array.isArray(fav.customTypes.card) || fav.customTypes.card.length == 0) {
                customFavs.customTypes.migrationVersion = 1;
                Lampa.Storage.set(STORAGE_KEY, customFavs);
                return;
            }

            customTypes.card = mergeCard(customTypes.card || [], fav.customTypes.card);

            var oldTypesDefinitions = this.getTypesWithoutSystem(fav);

            oldTypesDefinitions.forEach(function(typeName) {
                if (!fav.customTypes.hasOwnProperty(typeName)) return;
                var typeUid = fav.customTypes[typeName];

                customFavs.customTypes[typeName] = typeUid;
                customFavs[typeUid] = mergeCategory(customFavs[typeUid] || [], fav[typeUid]);

                //delete fav[typeUid];
            });

            customFavs.customTypes.migrationVersion = 1;
            Lampa.Storage.set(STORAGE_KEY, customFavs);

            //delete fav.customTypes;
            //Lampa.Storage.set('favorite', fav);

            function isFavoriteEmpty(favorite) {
                var emptyFavorite = true;

                for (var key in favorite) {
                    if (favorite.hasOwnProperty(key)) {
                        var value = favorite[key];

                        if (Array.isArray(value)) {
                            if (value.length !== 0) {
                                emptyFavorite = false;
                                break;
                            }
                        }
                    }
                }

                return emptyFavorite;
            }

            function mergeCard(arr1, arr2) {
                var merged = [];
                var ids = {};

                for (var i = 0; i < arr1.length; i++) {
                    var obj = arr1[i];
                    ids[obj.id] = obj;
                }

                for (var j = 0; j < arr2.length; j++) {
                    var obj2 = arr2[j];
                    if (ids.hasOwnProperty(obj2.id)) {
                        var existing = ids[obj2.id];
                        for (var key in obj2) {
                            if (obj2.hasOwnProperty(key)) {
                                existing[key] = obj2[key];
                            }
                        }
                    } else {
                        ids[obj2.id] = obj2;
                    }
                }

                for (var id in ids) {
                    if (ids.hasOwnProperty(id)) {
                        merged.push(ids[id]);
                    }
                }

                return merged;
            }

            function mergeCategory(arr1, arr2) {
                var merged = arr1.concat(arr2);
                var unique = [];
                var seen = {};

                for (var i = 0; i < merged.length; i++) {
                    var item = merged[i];
                    if (!seen.hasOwnProperty(item)) {
                        seen[item] = true;
                        unique.push(item);
                    }
                }

                return unique;
            }
        }

        this.init = function(obj) {
            _customFavorite = obj || Lampa.Storage.get(STORAGE_KEY, {});
            _customFavorite.customTypes = _customFavorite.customTypes || { card: [] };
        }

        this.getFavorite = function () {
            if (_customFavorite == null) {
                this.init();
                this.migration();
            }

            return _customFavorite;
        }

        this.getTypes = function () {
            return this.getTypesWithoutSystem(this.getFavorite());
        }

        this.hasTypeId = function (favorite, type) {
            var customTypes = favorite.customTypes;
            for (var key in customTypes) {
                if (customTypes.hasOwnProperty(key) && customTypes[key] === type) {
                    return true;
                }
            }
            return false;
        };

        this.getTypesWithoutSystem = function(favorite) {
            var systemFields = [ 'card', 'migrationVersion'];

            return Object
                .keys(favorite.customTypes || {})
                .filter(function(type) { return systemFields.indexOf(type) == -1 } );
        }

        this.getCards = function (favorite) {
            if (!favorite && allCustomFavs.length > 0) {
                return allCustomFavs;
            }

            favorite = favorite || this.getFavorite();
            allCustomFavs =  this.getTypesWithoutSystem(favorite).reduce(function (acc, key) {
                var uid = favorite.customTypes[key];
                return favorite.hasOwnProperty(uid) ? acc.concat(favorite[uid]) : acc;
            }, []);

            return allCustomFavs;
        }

        this.createType = function (typeName) {
            var favorite = this.getFavorite();

            if (favorite.customTypes[typeName]) {
                var err = new Error('custom.fav.name-used');
                err.code = 'custom.fav';
                throw err;
            }

            var uid = Lampa.Utils.uid(8).toLowerCase();
            favorite.customTypes[typeName] = uid;
            favorite[uid] = [];

            Lampa.Storage.set(STORAGE_KEY, favorite);

            return {
                name: typeName,
                uid: uid,
                counter: 0
            };
        }

        this.renameType = function (oldName, newName) {
            var favorite = this.getFavorite();
            var uid = favorite.customTypes[oldName];

            if (!uid) {
                var err = new Error('custom.fav.not-defined');
                err.code = 'custom.fav';
                throw err;
            }

            if (favorite.customTypes[newName]) {
                var err = new Error('custom.fav.name-used');
                err.code = 'custom.fav';
                throw err;
            }

            favorite.customTypes[newName] = uid;
            delete favorite.customTypes[oldName];

            Lampa.Storage.set(STORAGE_KEY, favorite);
            return true;
        }

        this.removeType = function (typeName) {
            var favorite = this.getFavorite();
            var uid = favorite.customTypes[typeName];

            if (!uid) {
                var err = new Error('custom.fav.not-defined');
                err.code = 'custom.fav';
                throw err;
            }

            delete favorite.customTypes[typeName];
            delete favorite[uid];

            Lampa.Storage.set(STORAGE_KEY, favorite);
            return true;
        }

        this.getTypeList = function (typeName) {
            var favorite = this.getFavorite();
            var uid = favorite.customTypes[typeName];

            if (!uid) {
                var err = new Error('custom.fav.not-defined');
                err.code = 'custom.fav';
                throw err;
            }

            return favorite[uid] || [];
        }

        this.toggleCard = function (typeName, card) {
            var favorite = this.getFavorite();
            var uid = favorite.customTypes[typeName];

            if (!uid) {
                var err = new Error('custom.fav.not-defined');
                err.code = 'custom.fav';
                throw err;
            }

            var typeList = favorite[uid] || [];
            favorite[uid] = typeList;

            var customTypeCards = favorite.customTypes.card;

            if (typeList.indexOf(card.id) === -1) {
                if (customTypeCards.every(function (favCard) { return favCard.id !== card.id })) {
                    Lampa.Arrays.insert(customTypeCards, 0, card);
                }

                Lampa.Arrays.insert(typeList, 0, card.id);
                this.getCards(favorite);

            } else {
                Lampa.Arrays.remove(typeList, card.id);
                var customCards = this.getCards(favorite);

                var used = customCards.indexOf(card.id) >= 0;

                if (!used) {
                    favorite.customTypes.card = customTypeCards.filter(function (favCard) {
                        return favCard.id !== card.id;
                    });
                }
            }

            Lampa.Storage.set(STORAGE_KEY, favorite);

            return {
                name: typeName,
                uid: uid,
                counter: typeList.length,
            }
        }
    }

    var customFavorite = new CustomFavorite();

    function SyncService() {
        function account(url) {
            url = url + '';
            if (url.indexOf('account_email=') === -1) {
                var email = Lampa.Storage.get('account_email');
                if (email) url = Lampa.Utils.addUrlComponent(url, 'account_email=' + encodeURIComponent(email));
            }
            if (url.indexOf('uid=') === -1) {
                var uid = Lampa.Storage.get('lampac_unic_id', '');
                if (uid) url = Lampa.Utils.addUrlComponent(url, 'uid=' + encodeURIComponent(uid));
            }
            return url;
        }

        function goExport() {
            if (window.sync_disable) return;

            var value = Lampa.Storage.get(STORAGE_KEY, {});
            if (!value.hasOwnProperty('customTypes')) return;

            var uri = account(HOST + '/storage/set?path=custom_favs&pathfile=' + Lampa.Storage.get('lampac_profile_id', ''));

            $.ajax({
                url: uri + '&events=' + encodeURIComponent(Lampa.Base64.encode(JSON.stringify({
                    connectionId: (window.lwsEvent ? window.lwsEvent.connectionId : ''),
                    name: 'sync_custom_favorite',
                    data: Lampa.Storage.get('lampac_profile_id', ''),
                }))),
                type: 'POST',
                data: JSON.stringify(value),
                async: true,
                cache: false,
                contentType: 'application/json',
                processData: false,
                success: function (j) {
                    if (j.success && j.fileInfo) {
                        Lampa.Storage.set(STORAGE_SYNC_KEY, j.fileInfo.changeTime);
                    }
                },
                error: function () {
                    console.log('Lampac Storage', 'export', 'error');
                }
            });
        }

        function goImport(callback) {
            if (window.sync_disable) return;

            var network = new Lampa.Reguest();
            network.silent(
                account(HOST + '/storage/get?path=custom_favs&pathfile=' + Lampa.Storage.get('lampac_profile_id', '')),
                function (j) {
                    if (j.success && j.fileInfo && j.data) {
                        if (j.fileInfo.changeTime > Lampa.Storage.get(STORAGE_SYNC_KEY, 0)) {
                            try {
                                var data = JSON.parse(j.data);
                                if (data.hasOwnProperty('customTypes')) {
                                    Lampa.Storage.set(STORAGE_KEY, data, true);
                                    Lampa.Storage.set(STORAGE_SYNC_KEY, j.fileInfo.changeTime);
                                    customFavorite.init(data);
                                }
                            } catch (error) {
                                console.log('Lampac Storage', 'import', error.message);
                            }
                        }
                    } else if (j.msg && j.msg === 'outFile') {
                        customFavorite.init();
                        goExport();
                    }

                    if (typeof callback === 'function') {
                        callback();
                    }
                }
            );
        }

        function sync() {
            if (window.custom_favs_sync_init) return;
            window.custom_favs_sync_init = true;

            goImport(function () {
                Lampa.Storage.listener.follow('change', function (event) {
                    if (event.name === STORAGE_KEY) {
                        goExport();
                    }
                });

                document.addEventListener('lwsEvent', function (event) {
                    var profileId = Lampa.Storage.get('lampac_profile_id', '');
                    var eventName = event.detail.name;
                    var eventData = event.detail.data;
                    var eventSource = event.detail.src;

                    if ((eventName === 'sync_custom_favorite' || eventName === 'profile_synced') && eventData === profileId) {
                        goImport(function () {
                            if (eventSource === 'profiles.js') {
                                customFavorite.migration();
                            }
                        });
                    } else if (eventName === 'system' && eventData === 'reconnected' && eventSource !== 'profiles.js') {
                        goImport(function () {});
                    }
                });
            });
        }

        this.start = function() {
            if (!window.lwsEvent) {
                Lampa.Utils.putScript([account(HOST + '/invc-ws.js')], function () { }, false, function () {
                    sync();
                }, true);
            } else sync();
        }
    }

    function FavoritePageService() {
    }

    FavoritePageService.prototype.renderCustomFavoriteButton = function (type) {
        var customTypeCssClass = 'custom-type-' + type.uid;

        var $register = Lampa.Template.js('register').addClass('selector').addClass(customTypeCssClass).addClass('custom-type');
        $register.find('.register__name').text(type.name).addClass(customTypeCssClass);
        $register.find('.register__counter').text(type.counter || 0).addClass(customTypeCssClass);

        var $render = Lampa.Activity.active().activity.render();

        $register.on('hover:long', function () {
            var menu = [
                {
                    title: Lampa.Lang.translate('rename'),
                    action: 'rename'
                },
                {
                    title: Lampa.Lang.translate('settings_remove'),
                    action: 'remove'
                }
            ]

            var controllerName = Lampa.Controller.enabled().name;

            Lampa.Select.show({
                title: Lampa.Lang.translate('title_action'),
                items: menu,
                onBack: function () {
                    Lampa.Controller.toggle(controllerName);
                    Lampa.Controller.toggle('content');
                },
                onSelect: function (item) {
                    switch (item.action) {
                        case 'remove': {
                            try {
                                customFavorite.removeType(type.name);
                                $register.remove();

                                Lampa.Controller.toggle(controllerName);
                                Lampa.Controller.toggle('content');
                            } finally {
                                break;
                            }
                        }
                        case 'rename': {
                            var inputOptions = {
                                title: Lampa.Lang.translate('filter_set_name'),
                                value: type.name,
                                free: true,
                                nosave: true
                            };

                            Lampa.Input.edit(inputOptions, function (value) {
                                if (value === '' || type.name == value || value === 'card') {
                                    Lampa.Controller.toggle('content');
                                    Lampa.Noty.show(Lampa.Lang.translate('invalid_name'));
                                    return;
                                };

                                try {
                                    customFavorite.renameType(type.name, value);
                                    $register.find('.register__name').text(value);
                                    type.name = value;
                                } finally {
                                    Lampa.Controller.toggle(controllerName);
                                    Lampa.Controller.collectionFocus($register, $render);
                                }
                            });

                            break;
                        }
                    }
                }
            });
        });

        $register.on('hover:enter', function () {
            Lampa.Activity.push({
                url: '',
                component: 'favorite',
                title: type.name,
                type: type.uid,
                page: 1,
            });
        });

        $('.register:first', $render).after($register);
        return $register;
    }

    FavoritePageService.prototype.refresh = function (type) {
        var activity = Lampa.Activity.active();

        if (activity.component === 'bookmarks') {
            $('.register__counter.custom-type-' + type.uid).text(type.counter || 0);
        };
    }

    FavoritePageService.prototype.renderAddButton = function () {
        var self = this;

        var $register = Lampa.Template.js('register').addClass('selector').addClass('new-custom-type');
        $register.find('.register__counter').html('<img src="./img/icons/add.svg"/>');

        $('.register:first').before($register);

        $register.on('hover:enter', function () {
            var inputOptions = {
                title: Lampa.Lang.translate('filter_set_name'),
                value: '',
                free: true,
                nosave: true
            };

            Lampa.Input.edit(inputOptions, function (value) {
                if (value === '' || value === 'card') {
                    Lampa.Controller.toggle('content');
                    Lampa.Noty.show(Lampa.Lang.translate('invalid_name'));
                    return;
                };

                try {
                    var type = customFavorite.createType(value);
                    self.renderCustomFavoriteButton(type);
                } finally {
                    Lampa.Controller.toggle('content');
                }
            });
        });
    }

    FavoritePageService.prototype.renderLines = function () {
        var object = Lampa.Activity.active();
        var favorite = customFavorite.getFavorite();
        var mediaTypes = ['movies', 'tv'];

        customFavorite.getTypesWithoutSystem(favorite).reverse().forEach(function (typeName) {
            var typeUid = favorite.customTypes[typeName];
            var typeList = favorite[typeUid] || [];

            var typeCards = favorite.customTypes.card.filter(function (card) { return typeList.indexOf(card.id) !== -1 });
            var lineItems = Lampa.Arrays.clone(typeCards.slice(0, 20));

            var i = 0;
            mediaTypes.forEach(function (m) {
                var filter = Lampa.Utils.filterCardsByType(typeCards, m);

                if (filter.length) {
                    Lampa.Arrays.insert(lineItems, i, {
                        cardClass: function cardClass() {
                            return new CustomFavoriteFolder(filter, {
                                title: typeName,
                                category: typeUid,
                                media: m
                            });
                        }
                    });
                    i++;
                }
            });

            lineItems = lineItems.slice(0, 20);
            lineItems.forEach(function(item) {
                item.ready = false;
            });

            if (lineItems.length > 0) {
                object.activity.component().append({
                    title: typeName,
                    results: lineItems,
                    type: typeUid
                });
            }
        });
    }

    var favoritePageSvc = new FavoritePageService();

    function CardFavoriteService() {
        this.extendContextMenu = function (object) {
            var self = this;

            var bookmarkMenuItem = $('body > .selectbox').find('.selectbox-item__title').filter(function () {
                return $(this).text() === Lampa.Lang.translate('title_book');
            });

            customFavorite.getTypes().forEach(function (customCategory) {
                var $menuItem = $('<div class="selectbox-item selector"><div class="selectbox-item__title">' + customCategory + '</div><div class="selectbox-item__checkbox"></div></div>');
                $menuItem.insertBefore(bookmarkMenuItem.parent());
                $menuItem.on('hover:enter', function () {
                    var category = $(this).find('.selectbox-item__title').text();
                    var type = customFavorite.toggleCard(category, object.data);
                    $(this).toggleClass('selectbox-item--checked');

                    setTimeout(function () {
                        if (object.card) {
                            self.refreshCustomFavoriteIcon(object);
                        } else {
                            self.refreshBookmarkIcon();
                        }
                    }, 0);

                    favoritePageSvc.refresh(type);
                });

                if (customFavorite.getTypeList(customCategory).indexOf(object.data.id) >= 0) {
                    $menuItem.addClass('selectbox-item--checked');
                }
            });

            Lampa.Controller.collectionSet($('body > .selectbox').find('.scroll__body'));

            setTimeout(function () {
                var $menuItems = $('body > .selectbox').find('.selector');
                if ($menuItems.length > 0) {
                    Lampa.Controller.focus($menuItems.get(0));
                    Navigator.focus($menuItems.get(0));
                }
            }, 10);
        };

        this.refreshCustomFavoriteIcon = function (object) {
            var customFavCards = customFavorite.getCards();

            var $iconHolder = $('.card__icons-inner', object.card);

            var id = object.data.id;
            var anyFavorite = customFavCards.indexOf(id) >= 0;

            var $starIcon = $('.icon--star', $iconHolder);
            var hasIcon = $starIcon.length !== 0;
            var hasHiddenIcon = hasIcon && $starIcon.hasClass('hide');

            if (anyFavorite) {
                if (!hasIcon) {
                    $iconHolder.prepend(Lampa.Template.get('custom-fav-icon'));
                } else if (hasHiddenIcon) {
                    $starIcon.removeClass('hide');
                }
            } else {
                if (hasIcon && !hasHiddenIcon) {
                    $starIcon.addClass('hide');
                }
            }
        }

        this.refreshBookmarkIcon = function () {
            var active = Lampa.Activity.active();

            if (active.component !== 'full') {
                return;
            }

            var card = active.card;
            var anyCustomFavorite = customFavorite.getCards().indexOf(card.id) !== -1;

            var favStates = anyCustomFavorite ? {} : Lampa.Favorite.check(card);
            var anyFavorite = anyCustomFavorite || Object.keys(favStates).filter(function (favType) {
                return favType !== 'history' && favType !== 'any';
            }).some(function (favType) {
                return !!favStates[favType];
            });

            var $svg = $(".button--book svg path", active.activity.render());

            if (anyFavorite) {
                $svg.attr('fill', 'currentColor');
            } else {
                $svg.attr('fill', 'transparent');
            };
        }
    }

    var cardFavoriteSvc = new CardFavoriteService();

    function start() {
        if (window.custom_favorites) {
            return;
        }

        window.custom_favorites = true;

        Lampa.Storage.listener.follow('change', function(event) {
            if (event.name == 'lampac_sync_favorite' && event.value == 0) {
                Lampa.Storage.set(STORAGE_KEY, '{}', true);
                Lampa.Storage.set(STORAGE_SYNC_KEY, 0, true);

                customFavorite.init({});
            }
        });

        HOST = Lampa.Storage.get('custom_favorite_host', '') || HOST;
        new SyncService().start();

        Lampa.Utils.putScript(['https://levende.github.io/lampa-plugins/listener-extensions.js'], function () {
            Lampa.Listener.follow('card', function (event) {
                if (event.type !== 'build') {
                    return;
                }

                var originalFavorite = event.object.favorite;
                event.object.favorite = function () {
                    originalFavorite.apply(this, arguments);
                    cardFavoriteSvc.refreshCustomFavoriteIcon(event.object);
                }

                var originalOnMenu = event.object.onMenu;
                event.object.onMenu = function () {
                    originalOnMenu.apply(this, arguments);
                    cardFavoriteSvc.extendContextMenu(event.object);
                }
            });
        });

        var favoriteGet = Lampa.Favorite.get;

        Lampa.Favorite.get = function (params) {
            if (!params || !params.type) {
                return favoriteGet.apply(this, arguments);
            }

            var favorite = customFavorite.getFavorite();

            if (favorite &&
                favorite.hasOwnProperty(params.type) &&
                Array.isArray(favorite[params.type]) &&
                customFavorite.hasTypeId(favorite, params.type)) {

                var cardIds = favorite[params.type];
                var customTypeCards = favorite.customTypes.card;

                var filtered = [];
                for (var i = 0; i < customTypeCards.length; i++) {
                    var favCard = customTypeCards[i];
                    if (cardIds.indexOf(favCard.id) !== -1) {
                        filtered.push(favCard);
                    }
                }
                
                return filtered;
            }

            return favoriteGet.apply(this, arguments);
        };

        Lampa.Lang.add({
            rename: {
                en: 'Rename',
                uk: 'Змінити ім’я',
                ru: 'Изменить имя'
            },
            invalid_name: {
                en: 'Invalid name',
                uk: 'Некоректне ім’я',
                ru: 'Некорректное имя'
            }
        });
        Lampa.Template.add('custom-fav-icon', '<div class="card__icon icon--star"><svg width="24" height="23" viewBox="0 0 24 23" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.6162 7.10981L15.8464 7.55198L16.3381 7.63428L22.2841 8.62965C22.8678 8.72736 23.0999 9.44167 22.6851 9.86381L18.4598 14.1641L18.1104 14.5196L18.184 15.0127L19.0748 20.9752C19.1622 21.5606 18.5546 22.002 18.025 21.738L12.6295 19.0483L12.1833 18.8259L11.7372 19.0483L6.34171 21.738C5.81206 22.002 5.20443 21.5606 5.29187 20.9752L6.18264 15.0127L6.25629 14.5196L5.9069 14.1641L1.68155 9.86381C1.26677 9.44167 1.49886 8.72736 2.08255 8.62965L8.02855 7.63428L8.52022 7.55198L8.75043 7.10981L11.5345 1.76241C11.8078 1.23748 12.5589 1.23748 12.8322 1.76241L15.6162 7.10981Z" stroke="currentColor" stroke-width="2.2"></path></svg></div>');

        $('<style>').prop('type', 'text/css').html(
            '.card__icon { position: relative; } ' +
            '.icon--star svg { position: absolute; height: 60%; width: 60%; top: 50%; left: 50%; transform: translate(-50%, -50%) }' +
            '.new-custom-type .register__counter { display:flex; justify-content:center; align-items:center }' +
            '.new-custom-type .register__counter img { height:2.2em; padding:0.4em; }' +
            '.register.custom-type { background-image: url("https://levende.github.io/lampa-plugins/assets/tap.svg"); background-repeat: no-repeat; background-position: 90% 90%; background-size: 20%; }'
        ).appendTo('head');

        Lampa.Listener.follow('full', function (event) {
            if (event.type == 'complite') {
                var active = Lampa.Activity.active();
                cardFavoriteSvc.refreshBookmarkIcon();

                var $btnBook = $(".button--book", active.activity.render());
                $btnBook.on('hover:enter', function () {
                    cardFavoriteSvc.extendContextMenu({ data: active.card });
                });
            }
        });

        Lampa.Storage.listener.follow('change', function (event) {
            if (event.name !== 'activity') {
                return;
            }

            if (Lampa.Activity.active().component === 'bookmarks') {
                if ($('.new-custom-type').length !== 0) {
                    return;
                }

                favoritePageSvc.renderAddButton();
                var favorite = customFavorite.getFavorite();

                favoritePageSvc.renderLines();

                customFavorite.getTypesWithoutSystem(favorite).reverse().forEach(function (typeName) {
                    var typeUid = favorite.customTypes[typeName];
                    var typeList = favorite[typeUid] || [];
                    var typeCounter = typeList.length;

                    favoritePageSvc.renderCustomFavoriteButton({
                        name: typeName,
                        uid: typeUid,
                        counter: typeCounter
                    });
                });

                Lampa.Activity.active().activity.toggle();
            }
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