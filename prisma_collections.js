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
        this.item.find('.cub-collection-card__items').text(data.items_count);
        this.item.find('.cub-collection-card__date').text(Lampa.Utils.parseTime(data.time).full);
        this.item.find('.cub-collection-card__views').text(Lampa.Utils.bigNumberToShort(data.views));
        this.item.find('.full-review__like-counter').text(Lampa.Utils.bigNumberToShort(data.liked));
        this.item.addEventListener('visible', this.visible.bind(this));
      };
      /**
       * Загрузить картинку
       */


      this.image = function () {
        var _this = this;

        this.img.onload = function () {
          _this.item.classList.add('card--loaded');
        };

        this.img.onerror = function () {
          _this.img.src = './img/img_broken.svg';
        };
      };
      /**
       * Создать
       */


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
            url: data.id,
            collection: data,
            title: Lampa.Utils.capitalizeFirstLetter(data.title),
            component: 'prisma_collections_view',
            page: 1
          });
        });
        this.image();
      };
      /**
       * Загружать картинку если видна карточка
       */


      this.visible = function () {
        this.img.src = Lampa.Api.img(data.backdrop_path, 'w500');
        if (this.onVisible) this.onVisible(this.item, data);
      };
      /**
       * Уничтожить
       */


      this.destroy = function () {
        this.img.onerror = function () {};

        this.img.onload = function () {};

        this.img.src = '';
        remove(this.item);
        this.item = null;
        this.img = null;
      };
      /**
       * Рендер
       * @returns {object}
       */


      this.render = function (js) {
        return js ? this.item : $(this.item);
      };
    }

    var network = new Lampa.Reguest();
    var api_url = 'https://ws.pris.cam/api/collections/';
    var collections = [{
      hpu: 'new',
      title: 'Новинки'
    }, {
      hpu: 'top',
      title: 'В топе'
    }, {
      hpu: 'week',
      title: 'Популярные за неделю'
    }, {
      hpu: 'month',
      title: 'Популярные за месяц'
    }, {
      hpu: 'all',
      title: 'Все коллекции'
    }];

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
            data.title = collections.find(function (item) {
              return item.hpu == key;
            }).title;

            data.cardClass = function (elem, param) {
              return new Collection(elem, param);
            };

            fulldata.push(data);
          });
          oncomplite(fulldata);
        } else onerror();
      };

      collections.forEach(function (item) {
        var url = api_url + 'list?category=' + item.hpu;
        network.silent(url, function (data) {
          data.collection = true;
          data.line_type = 'collection';
          data.category = item.hpu;
          status.append(item.hpu, data);
        }, status.error.bind(status), false, false);
      });
    }

    function collection(params, oncomplite, onerror) {
      var url = api_url + 'list?category=' + params.url + '&page=' + params.page;

      network.silent(url, function (data) {
        data.collection = true;
        data.total_pages = data.total_pages || 15;
        data.cardClass = function (elem, param) {
          return new Collection(elem, param);
        };

        oncomplite(data);
      }, onerror, false, false);
    }

    function full(params, oncomplite, onerror) {
      network.silent(api_url + 'view/' + params.url + '?page=' + params.page, function (data) {
        data.total_pages = data.total_pages || 15;
        data.results = data.items;
        data.results.forEach(function(item) {
          if (item.type == 'tv') {
            item.name = item.title;
            item.original_name = item.name;
            delete item.title;
          }
        })
        oncomplite(data);
      }, onerror, false, false);
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

    function component$2(object) {
      var comp = new Lampa.InteractionMain(object);

      comp.create = function () {
        var _this = this;

        this.activity.loader(true);
        Api.main(object, function (data) {
          _this.build(data);
        }, this.empty.bind(this));
        return this.render();
      };

      comp.onMore = function (data) {
        Lampa.Activity.push({
          url: data.category,
          title: data.title,
          component: 'prisma_collections_collection',
          page: 1
        });
      };

      return comp;
    }

    function component$1(object) {
      var comp = new Lampa.InteractionCategory(object);

      comp.create = function () {
        var _this = this;

        Api.full(object, function (data) {
          _this.build(data);

          comp.render().find('.category-full').addClass('mapping--grid cols--6');
        }, this.empty.bind(this));
      };

      comp.nextPageReuest = function (object, resolve, reject) {
        Api.full(object, resolve.bind(comp), reject.bind(comp));
      };

      return comp;
    }

    function component(object) {
      var comp = new Lampa.InteractionCategory(object);

      comp.create = function () {
        Api.collection(object, this.build.bind(this), this.empty.bind(this));
      };

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
      var manifest = {
        type: 'video',
        version: '1.1.2',
        name: 'Подборки',
        description: '',
        component: 'prisma_collections'
      };
      Lampa.Manifest.plugins = manifest;
      Lampa.Component.add('prisma_collections_main', component$2);
      Lampa.Component.add('prisma_collections_collection', component);
      Lampa.Component.add('prisma_collections_view', component$1);
      Lampa.Template.add('prisma_collection', "<div class=\"card cub-collection-card selector layer--visible layer--render card--collection\">\n        <div class=\"card__view\">\n            <img src=\"./img/img_load.svg\" class=\"card__img\">\n            <div class=\"cub-collection-card__head\">\n                <div class=\"cub-collection-card__items\"></div>\n                <div class=\"cub-collection-card__date cub-collection-card__items\"></div>\n            </div>\n            <div class=\"cub-collection-card__bottom\">\n                <div class=\"cub-collection-card__views\"></div>\n                <div class=\"cub-collection-card__liked\">\n                    <div class=\"full-review__like-icon\">\n                        <svg width=\"29\" height=\"27\" viewBox=\"0 0 29 27\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                            <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M8.0131 9.05733H3.75799C2.76183 9.05903 1.80696 9.45551 1.10257 10.1599C0.39818 10.8643 0.00170332 11.8192 0 12.8153V23.0778C0.00170332 24.074 0.39818 25.0289 1.10257 25.7333C1.80696 26.4377 2.76183 26.8341 3.75799 26.8358H23.394C24.2758 26.8354 25.1294 26.5252 25.8056 25.9594C26.4819 25.3936 26.9379 24.6082 27.094 23.7403L28.9408 13.4821C29.038 12.9408 29.0153 12.3849 28.8743 11.8534C28.7333 11.3218 28.4774 10.8277 28.1247 10.4058C27.7721 9.98391 27.3311 9.6445 26.833 9.41151C26.3349 9.17852 25.7918 9.05762 25.2419 9.05733H18.5043V3.63509C18.5044 2.90115 18.2824 2.18438 17.8673 1.57908C17.4522 0.973783 16.8636 0.508329 16.179 0.243966C15.4943 -0.0203976 14.7456 -0.0712821 14.0315 0.0980078C13.3173 0.267298 12.6712 0.648829 12.178 1.1924L12.1737 1.19669C10.5632 2.98979 9.70849 5.78681 8.79584 7.79142C8.6423 8.14964 8.45537 8.49259 8.23751 8.81574C8.16898 8.90222 8.09358 8.98301 8.01203 9.05733H8.0131ZM6.54963 23.6147H3.75799C3.68706 23.6147 3.61686 23.6005 3.55156 23.5728C3.48626 23.5452 3.42719 23.5046 3.37789 23.4536C3.32786 23.4047 3.28819 23.3463 3.26126 23.2817C3.23433 23.2171 3.22068 23.1478 3.22113 23.0778V12.8164C3.22068 12.7464 3.23433 12.6771 3.26126 12.6125C3.28819 12.548 3.32786 12.4895 3.37789 12.4406C3.42719 12.3896 3.48626 12.3491 3.55156 12.3214C3.61686 12.2937 3.68706 12.2795 3.75799 12.2795H6.54963V23.6147ZM9.77077 11.7599C10.3704 11.336 10.8649 10.7803 11.216 10.1353C11.8221 8.94289 12.3599 7.71687 12.8265 6.46324C13.2315 5.33852 13.818 4.28775 14.5627 3.3527C14.6197 3.29181 14.6935 3.24913 14.7747 3.23003C14.8559 3.21093 14.9409 3.21625 15.0191 3.24533C15.0976 3.27557 15.165 3.32913 15.2122 3.3988C15.2594 3.46848 15.2842 3.55093 15.2832 3.63509V10.6679C15.2831 10.8794 15.3246 11.0889 15.4055 11.2844C15.4864 11.4799 15.605 11.6575 15.7546 11.8071C15.9042 11.9566 16.0818 12.0753 16.2773 12.1562C16.4727 12.237 16.6822 12.2786 16.8938 12.2785H25.2419C25.3207 12.2784 25.3986 12.2961 25.4698 12.3301C25.5409 12.3641 25.6036 12.4136 25.6531 12.4749C25.7042 12.5345 25.7411 12.6049 25.7612 12.6807C25.7813 12.7566 25.784 12.836 25.7691 12.913L23.9223 23.1723C23.8993 23.296 23.834 23.4077 23.7376 23.4885C23.6412 23.5692 23.5197 23.6138 23.394 23.6147H9.77077V11.7599Z\" fill=\"currentColor\"></path>\n                        </svg>\n                    </div>\n                    <div class=\"full-review__like-counter\"></div>\n                </div>\n                \n                \n            </div>\n        </div>\n        <div class=\"card__title\"></div>\n    </div>");
      var style = "\n        <style>\n        .cub-collection-card__head{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:justify;-webkit-justify-content:space-between;-moz-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;padding:.5em 1em;color:#fff;font-size:1em;font-weight:500;position:absolute;top:0;left:0;width:100%}.cub-collection-card__bottom{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;padding:.5em 1em;background-color:rgba(0,0,0,0.5);color:#fff;font-size:1em;font-weight:400;-webkit-border-radius:1em;-moz-border-radius:1em;border-radius:1em;position:absolute;bottom:0;left:0;width:100%}.cub-collection-card__liked{padding-left:1em;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center}.cub-collection-card__liked .full-review__like-icon{margin-top:-0.2em}.cub-collection-card__liked .full-review__like-counter{font-weight:600}.cub-collection-card__items{background:rgba(0,0,0,0.5);padding:.3em;-webkit-border-radius:.2em;-moz-border-radius:.2em;border-radius:.2em} .category-full .cub-collection-card{padding-bottom:2em}body.glass--style .cub-collection-card__bottom,body.glass--style .cub-collection-card__items{background-color:rgba(0,0,0,0.3);-webkit-backdrop-filter:blur(1.6em);backdrop-filter:blur(1.6em)}body.light--version .cub-collection-card__bottom{-webkit-border-radius:0;-moz-border-radius:0;border-radius:0}@media screen and (max-width:767px){.category-full .cub-collection-card{width:33.3%}}@media screen and (max-width:580px){.category-full .cub-collection-card{width:50%}}@media screen and (max-width:991px){body.light--version .category-full .cub-collection-card{width:33.3%}}@media screen and (max-width:580px){body.light--version .category-full .cub-collection-card{width:50%}}@media screen and (max-width:991px){body.light--version.size--bigger .category-full .cub-collection-card{width:50%}}\n        </style>\n    ";
      Lampa.Template.add('prisma_collections_css', style);
      $('body').append(Lampa.Template.get('prisma_collections_css', {}, true));

      function add() {
        var icon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.01 2.92007L18.91 5.54007C20.61 6.29007 20.61 7.53007 18.91 8.28007L13.01 10.9001C12.34 11.2001 11.24 11.2001 10.57 10.9001L4.67 8.28007C2.97 7.53007 2.97 6.29007 4.67 5.54007L10.57 2.92007C11.24 2.62007 12.34 2.62007 13.01 2.92007Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M3 11C3 11.84 3.63 12.81 4.4 13.15L11.19 16.17C11.71 16.4 12.3 16.4 12.81 16.17L19.6 13.15C20.37 12.81 21 11.84 21 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M3 16C3 16.93 3.55 17.77 4.4 18.15L11.19 21.17C11.71 21.4 12.3 21.4 12.81 21.17L19.6 18.15C20.45 17.77 21 16.93 21 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
      var button = $("<li class=\"menu__item selector\"><div class=\"menu__ico\">" + icon + "\n            </div>\n            <div class=\"menu__text\">".concat(manifest.name, "</div>\n        </li>"));
        button.on('hover:enter', function () {
          Lampa.Activity.push({
            url: '',
            title: manifest.name,
            component: 'prisma_collections_main',
            page: 1
          });
        });
        $('.menu .menu__list').eq(0).append(button);
      }

      if (window.appready) add();else {
        Lampa.Listener.follow('app', function (e) {
          if (e.type == 'ready') add();
        });
      }
    }

    if (!window.prisma_collections_ready && Lampa.Manifest.app_digital >= 242) startPlugin();

})();