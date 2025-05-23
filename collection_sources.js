(function () {
    'use strict';

    var Utils = {
        Array: {
            find: function (array, predicate) {
                for (var i = 0; i < array.length; i++) {
                    if (predicate(array[i], i, array)) {
                        return array[i];
                    }
                }
                return null;
            }
        }
    };

    var collectionsSources = [
        {
            id: 'cub',
            name: 'CUB',
            collectionsListUrl: Lampa.Utils.protocol() + Lampa.Manifest.cub_domain + '/api/collections/list/',
            fullCollectionBaseUrl: Lampa.Utils.protocol() + Lampa.Manifest.cub_domain + '/api/collections/view/',
            img: Lampa.Api.img('7FZEiwSNKoV6f7eSiRzfhdTYyxC.jpg', 'w300'),
            mapper: function(data) {
                data.results.forEach(function(element) {
                    element.poster_path = element.img;
                });
                return {
                    collection: true,
                    total_pages: data.total_pages || 5,
                    results: data.results,
                    source: 'cub'
                };
            }
        }
    ];

    var CollectionsApi = {
        network: new Lampa.Reguest(),
        
        getMain: function(params, onComplete, onError) {
            var source = params.source;
            if (!source) {
                var menuData = {
                    collection: true,
                    results: collectionsSources.map(function(sourceConfig) {
                        return {
                            title: sourceConfig.name,
                            hpu: '?source=' + sourceConfig.id,
                            source: sourceConfig.id,
                            img: sourceConfig.img
                        };
                    })
                };
                onComplete(menuData);
                return;
            }

            var sourceConfig = Utils.Array.find(collectionsSources, function(item) { return item.id === source; });
            if (!sourceConfig) {
                onError("Unknown collection source");
                return;
            }
            
            var url = sourceConfig.collectionsListUrl + '?page=' + (params.page || 1);
            
            this.network.silent(url, function(data) {
                try {
                    var mappedData = sourceConfig.mapper(data);
                    
                    if (sourceConfig.imgProxy && mappedData && mappedData.results) {
                        mappedData.results.forEach(function(item) {
                            if (item.img) {
                                item.img = sourceConfig.imgProxy + item.img;
                            }
                        });
                    }

                    onComplete(mappedData);
                } catch (e) {
                    onError("Data mapping error: " + e.message);
                }
            }, onError);
        },
        
        getFull: function(params, onComplete, onError) {
            var source = params.source;
            var sourceConfig = Utils.Array.find(collectionsSources, function(item) { return item.id === source; });
            
            if (!sourceConfig) {
                onError("Unknown collection source");
                return;
            }
            
            var url = sourceConfig.fullCollectionBaseUrl + params.url + '?page=' + (params.page || 1);
            
            this.network.silent(url, function(data) {
                try {
                    data.source = source;
                    data.total_pages = data.total_pages || 15;
                    onComplete(data);
                } catch (e) {
                    onError("Data processing error: " + e.message);
                }
            }, onError);
        },
        
        clear: function() {
            this.network.clear();
        }
    };

    function CollectionSourcesComponent(object) {
        var component = new Lampa.InteractionCategory(object);

        component.create = function() {
            CollectionsApi.getMain(object, this.build.bind(this), this.empty.bind(this));
        };

        component.nextPageReuest = function(object, resolve, reject) {
            CollectionsApi.getMain(object, resolve.bind(component), reject.bind(component));
        };

        component.cardRender = function(object, element, card) {
            card.onMenu = false;

            var pushActivity = function() {
                Lampa.Activity.push({
                    url: element.hpu,
                    title: element.title,
                    component: element.source ? 'collection_sources' : 'collection_content',
                    page: 1,
                    source: element.source || object.source
                });
            };

            card.onEnter = pushActivity;
        };

        return component;
    }

    function CollectionComponent(object) {
        var component = new Lampa.InteractionCategory(object);

        component.create = function() {
            CollectionsApi.getFull(object, this.build.bind(this), this.empty.bind(this));
        };

        component.nextPageReuest = function(object, resolve, reject) {
            CollectionsApi.getFull(object, resolve.bind(component), reject.bind(component));
        };

        return component;
    }

    function addCategoryButton() {
        var collectionsText = Lampa.Lang.translate('collections');
        var $button = $(
            '<li class="menu__item selector" data-action="collection_sources">' +
            '  <div class="menu__ico">' +
            '    <svg width="191" height="239" viewBox="0 0 191 239" fill="none" xmlns="http://www.w3.org/2000/svg">' +
            '      <path fill-rule="evenodd" clip-rule="evenodd" d="M35.3438 35.3414V26.7477C35.3438 19.9156 38.0594 13.3543 42.8934 8.51604C47.7297 3.68251 54.2874 0.967027 61.125 0.966431H164.25C171.086 0.966431 177.643 3.68206 182.482 8.51604C187.315 13.3524 190.031 19.91 190.031 26.7477V186.471C190.031 189.87 189.022 193.192 187.133 196.018C185.245 198.844 182.561 201.046 179.421 202.347C176.28 203.647 172.825 203.988 169.492 203.325C166.158 202.662 163.096 201.026 160.692 198.623L155.656 193.587V220.846C155.656 224.245 154.647 227.567 152.758 230.393C150.87 233.219 148.186 235.421 145.046 236.722C141.905 238.022 138.450 238.363 135.117 237.7C131.783 237.037 128.721 235.401 126.317 232.998L78.3125 184.993L30.3078 232.998C27.9041 235.401 24.8419 237.037 21.5084 237.7C18.1748 238.363 14.7195 238.022 11.5794 236.722C8.43922 235.421 5.75517 233.219 3.86654 230.393C1.9779 227.567 0.969476 224.245 0.96875 220.846V61.1227C0.96875 54.2906 3.68437 47.7293 8.51836 42.891C13.3547 38.0575 19.9124 35.342 26.75 35.3414H35.3438ZM138.469 220.846V61.1227C138.469 58.8435 137.563 56.6576 135.952 55.046C134.34 53.4343 132.154 52.5289 129.875 52.5289H26.75C24.4708 52.5289 22.2849 53.4343 20.6733 55.046C19.0617 56.6576 18.1562 58.8435 18.1562 61.1227V220.846L66.1609 172.841C69.3841 169.619 73.755 167.809 78.3125 167.809C82.87 167.809 87.2409 169.619 90.4641 172.841L138.469 220.846ZM155.656 169.284L172.844 186.471V26.7477C172.844 24.4685 171.938 22.2826 170.327 20.671C168.715 19.0593 166.529 18.1539 164.25 18.1539H61.125C58.8458 18.1539 56.6599 19.0593 55.0483 20.671C53.4367 22.2826 52.5312 24.4685 52.5312 26.7477V35.3414H129.875C136.711 35.3414 143.268 38.0571 148.107 42.891C152.94 47.7274 155.656 54.285 155.656 61.1227V169.284Z" fill="currentColor"/>' +
            '    </svg>' +
            '  </div>' +
            '  <div class="menu__text">' + collectionsText + '</div>' +
            '</li>'
        );

        $button.on('hover:enter', function() {
            Lampa.Activity.push({
                url: '',
                title: collectionsText,
                component: 'collection_sources',
                page: 1
            });
        });

        $('.menu .menu__list').eq(0).append($button);
    }

    function initPlugin() {
        if (window.collection_sources_plugin) return;
        window.collection_sources_plugin = true;

        window.Lampa.CollectionSources = collectionsSources;

        var manifest = {
            type: 'video',
            version: '1.0.0',
            name: 'Collection sources',
            component: 'collection_sources'
        };
        
        Lampa.Lang.add({
            collections: {
                en: 'Collections',
                uk: 'Колекції',
                ru: 'Коллекции'
            },
        });
        
        Lampa.Manifest.plugins = manifest;
        Lampa.Component.add('collection_sources', CollectionSourcesComponent);
        Lampa.Component.add('collection_content', CollectionComponent);

        addCategoryButton();

        Lampa.Listener.send('collection_sources', 'ready');
    }

    if (window.appready) {
        initPlugin();
    } else {
        Lampa.Listener.follow('app', function(e) {
            if (e.type === 'ready') initPlugin();
        });
    }
})();