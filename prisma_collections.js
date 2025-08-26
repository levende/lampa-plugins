(function () {
  'use strict';

  function Collection(data) {
    this.data = data;

    function remove(elem) {
      if (elem) elem.remove();
    }

    this.build = function () {
      this.item = Lampa.Template.js('prisma_collection');
      this.img = this.item.find('.card__img');
      this.item.find('.card__title').text(Lampa.Utils.capitalizeFirstLetter(data.title));

      this.item.addEventListener('visible', this.visible.bind(this));
    };

    this.image = function () {
      var _this = this;

      this.img.onload = function () {
        _this.item.classList.add('card--loaded');
      };

      this.img.onerror = function () {
        _this.img.src = './img/img_broken.svg';
      };
    };

    this.create = function () {
      var _this2 = this;

      this.build();
      this.item.addEventListener('hover:focus', function () {
        if (_this2.onFocus) _this2.onFocus(_this2.item, data);
      });
      this.item.addEventListener('hover:touch', function () {
        if (_this2.onTouch) _this2.onTouch(_this2.item, data);
      });
      this.item.addEventListener('hover:hover', function () {
        if (_this2.onHover) _this2.onHover(_this2.item, data);
      });
      this.item.addEventListener('hover:enter', function () {
        Lampa.Activity.push({
          url: data.hpu,
          collection: data,
          title: Lampa.Utils.capitalizeFirstLetter(data.title),
          component: 'prisma_collections_view',
          page: 1
        });
      });
      this.image();
    };

    this.append = function (data, append) {
      var _this3 = this;
      data.forEach(function (element) {
        var card = new Card(element, {
          card_collection: true,
          object: object
        });
        card.create();
        card.onFocus = function (target, card_data) {
          last = target;
          scroll.update(card.render(), true);
          Background.change(Utils$2.cardImgBackground(card_data));
          if (scroll.isEnd()) _this3.next();
        };
        card.onEnter = function (target, card_data) {
          Lampa.Activity.push({
            url: card_data.url,
            id: card_data.id,
            title: Lang.translate('title_collections') + ' - ' + card_data.title,
            component: 'collections_view',
            source: object.source,
            page: 1
          });
        };
        card.onMenu = function (target, card_data) { };
        card.visible();
        body.append(card.render());
        if (append) Controller.collectionAppend(card.render());
        items.push(card);
      });
    };

    this.visible = function () {
      this.img.src = 'https://img.pris.cam/t/p/w780' + data.img;
      if (this.onVisible) this.onVisible(this.item, data);
    };

    this.destroy = function () {
      this.img.onerror = function () { };

      this.img.onload = function () { };

      this.img.src = '';
      remove(this.item);
      this.item = null;
      this.img = null;
    };
    
    this.render = function (js) {
      return js ? this.item : $(this.item);
    };
  }

  var network = new Lampa.Reguest();
  var api_url = 'https://ws.pris.cam/api/collections/';

  function main(params, oncomplite, onerror) {
    var status = new Lampa.Status(collections.length);

    status.onComplite = function () {
      var keys = Object.keys(status.data);
      var sort = collections.map(function (a) {
        return a.hpu;
      });

      if (keys.length) {
        var fulldata = [];
        keys.sort(function (a, b) {
          return sort.indexOf(a) - sort.indexOf(b);
        });
        keys.forEach(function (key) {
          var data = status.data[key];
          data.cardClass = function (elem, param) {
            return new Collection(elem, param);
          };

          fulldata.push(data);
        });
        oncomplite(fulldata);
      } else onerror();
    };
  }

  function collection(params, oncomplite, onerror) {
    params.page = params.page || 1;
    var url = api_url + 'list?page=' + params.page;

    network.silent(url, function (data) {
      data.collection = true;
      data.total_pages = data.total_pages || 15;

      data.cardClass = function (elem, param) {
        return new Collection(elem, param);
      };

      oncomplite(data);
    }, onerror, false);
  }

  function full(params, oncomplite, onerror) {
    network.silent(api_url + 'view/' + params.url + '?page=' + params.page, function (data) {
      data.total_pages = data.total_pages || 15;
      oncomplite(data);
    }, onerror, false);
  }

  function clear() {
    network.clear();
  }

  var Api = {
    main: main,
    collection: collection,
    full: full,
    clear: clear,
  };

  function component$1(object) {
    var comp = new Lampa.InteractionCategory(object);

    comp.create = function () {
      this.activity.loader(true);
      Api.full(object, this.build.bind(this), this.empty.bind(this));
    };

    comp.nextPageReuest = function (object, resolve, reject) {
      Api.full(object, resolve.bind(comp), reject.bind(comp));
    };

    return comp;
  }

  function component(object) {
    var comp = new Lampa.InteractionCategory(object);

    comp.create = function () {
      this.activity.loader(true);
      Api.collection(object, this.build.bind(this), this.empty.bind(this));
    };

    comp.next = function () {
      var _this2 = this;
      object.page++;
      Api.collection(object, function (result) {
        _this2.append(result, true);
      }, function () {
      });
    }

    comp.nextPageReuest = function (object, resolve, reject) {
      Api.collection(object, resolve.bind(comp), reject.bind(comp));
    };

    comp.cardRender = function (object, element, card) {
      card.onMenu = false;

      card.onEnter = function () {
        Lampa.Activity.push({
          url: element.id,
          title: element.title,
          component: 'prisma_collection',
          page: 1
        });
      };
    };

    return comp;
  }

  function startPlugin() {
    if (window.prisma_collections) return;
    window.prisma_collections = true;

    var manifest = {
      type: 'video',
      version: '1.0.0',
      name: 'Подборки',
      description: '',
      component: 'prisma_collections'
    };

    Lampa.Manifest.plugins = manifest;

    Lampa.Component.add('prisma_collections_collection', component);
    Lampa.Component.add('prisma_collections_view', component$1);
    Lampa.Template.add('prisma_collection', "<div class=\"card prisma-collection-card selector layer--visible layer--render card--collection\">\n        <div class=\"card__view\">\n            <img src=\"./img/img_load.svg\" class=\"card__img\">\n            </div><div class=\"card__title\"></div>\n    </div>");
    var style = "\n        <style>\n        .prisma-collection-card__head{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:justify;-webkit-justify-content:space-between;-moz-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;padding:.5em 1em;color:#fff;font-size:1em;font-weight:500;position:absolute;top:0;left:0;width:100%}.prisma-collection-card__bottom{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;padding:.5em 1em;background-color:rgba(0,0,0,0.5);color:#fff;font-size:1em;font-weight:400;-webkit-border-radius:1em;-moz-border-radius:1em;border-radius:1em;position:absolute;bottom:0;left:0;width:100%}.prisma-collection-card__liked{padding-left:1em;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center}.prisma-collection-card__liked .full-review__like-icon{margin-top:-0.2em}.prisma-collection-card__liked .full-review__like-counter{font-weight:600}.prisma-collection-card__items{background:rgba(0,0,0,0.5);padding:.3em;-webkit-border-radius:.2em;-moz-border-radius:.2em;border-radius:.2em}.prisma-collection-card__user-name{padding:0 1em;margin-left:auto}.prisma-collection-card__user-icon{width:2em;height:2em;-webkit-border-radius:100%;-moz-border-radius:100%;border-radius:100%;background-color:#fff;border:.2em solid #fff}.prisma-collection-card__user-icon img{width:100%;height:100%;-webkit-border-radius:100%;-moz-border-radius:100%;border-radius:100%;opacity:0}.prisma-collection-card__user-icon.loaded img{opacity:1}.category-full .prisma-collection-card{padding-bottom:2em}body.glass--style .prisma-collection-card__bottom,body.glass--style .prisma-collection-card__items{background-color:rgba(0,0,0,0.3);-webkit-backdrop-filter:blur(1.6em);backdrop-filter:blur(1.6em)}body.light--version .prisma-collection-card__bottom{-webkit-border-radius:0;-moz-border-radius:0;border-radius:0}@media screen and (max-width:767px){.category-full .prisma-collection-card{width:33.3%}}@media screen and (max-width:580px){.category-full .prisma-collection-card{width:50%}}@media screen and (max-width:991px){body.light--version .category-full .prisma-collection-card{width:33.3%}}@media screen and (max-width:580px){body.light--version .category-full .prisma-collection-card{width:50%}}@media screen and (max-width:991px){body.light--version.size--bigger .category-full .prisma-collection-card{width:50%}}\n        </style>\n    ";
    Lampa.Template.add('prisma_collections_css', style);
    $('body').append(Lampa.Template.get('prisma_collections_css', {}, true));

    var icon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.01 2.92007L18.91 5.54007C20.61 6.29007 20.61 7.53007 18.91 8.28007L13.01 10.9001C12.34 11.2001 11.24 11.2001 10.57 10.9001L4.67 8.28007C2.97 7.53007 2.97 6.29007 4.67 5.54007L10.57 2.92007C11.24 2.62007 12.34 2.62007 13.01 2.92007Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M3 11C3 11.84 3.63 12.81 4.4 13.15L11.19 16.17C11.71 16.4 12.3 16.4 12.81 16.17L19.6 13.15C20.37 12.81 21 11.84 21 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M3 16C3 16.93 3.55 17.77 4.4 18.15L11.19 21.17C11.71 21.4 12.3 21.4 12.81 21.17L19.6 18.15C20.45 17.77 21 16.93 21 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

    function add() {
      var button = $("<li class=\"menu__item selector\"><div class=\"menu__ico\">" + icon + "\n            </div>\n            <div class=\"menu__text\">".concat(manifest.name, "</div>\n        </li>"));
      button.on('hover:enter', function () {
        Lampa.Activity.push({
          url: '',
          title: manifest.name,
          component: 'prisma_collections_collection',
          page: 1
        });
      });
      $('.menu .menu__list').eq(0).append(button);
    }

    if (window.appready) add(); else {
      Lampa.Listener.follow('app', function (e) {
        if (e.type == 'ready') add();
      });
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
