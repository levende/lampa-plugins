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
        this.item.find('.luno-collection-card__items').text(data.items_count + ' Карточек');
        this.item.find('.luno-collection-card__date').text(Lampa.Utils.parseTime(data.time).full);

        if (data.rating && data.rating != 0) {
          this.item.find('.luno-collection-card__rating-value').text(Lampa.Utils.bigNumberToShort(data.rating));
        } else {
          this.item.find('.luno-collection-card__rating').remove();
        }

        if (data.views && data.views != 0) {
          this.item.find('.luno-collection-card__views').text(Lampa.Utils.bigNumberToShort(data.views) + ' просмотров');
        }
        this.item.find('.full-review__like-counter').text(Lampa.Utils.bigNumberToShort(data.liked));
        this.item.find('.luno-collection-card__description').text(data.description);
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
            url: data.id,
            collection: data,
            title: Lampa.Utils.capitalizeFirstLetter(data.title),
            component: 'prisma_collections_view',
            page: 1
          });
        });
        this.image();
      };

      this.visible = function () {
        this.img.src = Lampa.Api.img(data.backdrop_path, 'w500');
        if (this.onVisible) this.onVisible(this.item, data);
      };

      this.destroy = function () {
        this.img.onerror = function () {};

        this.img.onload = function () {};

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
      Lampa.Template.add('prisma_collection', '<div class="card luno-collection-card selector layer--visible layer--render card--collection">\n        <div class="card__view">\n            <img src="./img/img_load.svg" class="card__img">\n            <div class="luno-collection-card__content">\n                <div class="luno-collection-card__head">\n                    <div class="luno-collection-card__items"></div>\n                    <div class="luno-collection-card__date"></div>\n                </div>\n                <div class="luno-collection-card__info">\n                    <div class="luno-collection-card__meta">\n                        <div class="luno-collection-card__rating">\n                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">\n                                <path opacity="0.5" d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" fill="#FFD500"/>\n                                <path d="M10.4127 8.49812L10.5766 8.20419C11.2099 7.06807 11.5266 6.5 12 6.5C12.4734 6.5 12.7901 7.06806 13.4234 8.20419L13.5873 8.49813C13.7672 8.82097 13.8572 8.98239 13.9975 9.0889C14.1378 9.19541 14.3126 9.23495 14.6621 9.31402L14.9802 9.38601C16.2101 9.66428 16.825 9.80341 16.9713 10.2739C17.1176 10.7443 16.6984 11.2345 15.86 12.215L15.643 12.4686C15.4048 12.7472 15.2857 12.8865 15.2321 13.0589C15.1785 13.2312 15.1965 13.4171 15.2325 13.7888L15.2653 14.1272C15.3921 15.4353 15.4554 16.0894 15.0724 16.3801C14.6894 16.6709 14.1137 16.4058 12.9622 15.8756L12.6643 15.7384C12.337 15.5878 12.1734 15.5124 12 15.5124C11.8266 15.5124 11.663 15.5878 11.3357 15.7384L11.0378 15.8756C9.88633 16.4058 9.31059 16.6709 8.92757 16.3801C8.54456 16.0894 8.60794 15.4353 8.7347 14.1272L8.76749 13.7888C8.80351 13.4171 8.82152 13.2312 8.76793 13.0589C8.71434 12.8865 8.59521 12.7472 8.35696 12.4686L8.14005 12.215C7.30162 11.2345 6.88241 10.7443 7.02871 10.2739C7.17501 9.80341 7.78994 9.66427 9.01977 9.38601L9.33794 9.31402C9.68743 9.23495 9.86217 9.19541 10.0025 9.0889C10.1428 8.98239 10.2328 8.82097 10.4127 8.49812Z" fill="#FFD500"/>\n                            </svg>\n                            <span class="luno-collection-card__rating-value"></span>\n                        </div>\n                        <div class="luno-collection-card__views"></div>\n                        <div class="luno-collection-card__user">\n                            \n                            <div class="luno-collection-card__user-name"></div>\n                        </div>\n                        <div class="luno-collection-card__liked">\n                            <div class="full-review__like-icon">\n                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">\n                                    <path d="M17 2C15.0413 2 13.2705 2.80444 12 4.10095C10.7296 2.80457 8.95874 2 7 2C3.13403 2 0 5.13403 0 9C0 12.866 4 16 12 22C20 16 24 12.866 24 9C24 5.13403 20.866 2 17 2Z" fill="#E32402"/>\n                                </svg>\n                            </div>\n                            <div class="full-review__like-counter"></div>\n                        </div>\n                    </div>\n                    <div class="luno-collection-card__description"></div>\n                </div>\n            </div>\n        </div>\n        <div class="card__title"></div>\n    </div>');
      var style = "\n        <style>\n .category-full .luno-collection-card__content {display:none!important}        .luno-collection-card__content{position:absolute;bottom:0;left:0;width:100%;display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-webkit-flex-direction:column;-ms-flex-direction:column;flex-direction:column;background:-webkit-gradient(linear,left top,left bottom,from(rgba(0,0,0,0)),to(rgba(0,0,0,0.85)));background:-webkit-linear-gradient(top,rgba(0,0,0,0) 0,rgba(0,0,0,0.85) 100%);background:-o-linear-gradient(top,rgba(0,0,0,0) 0,rgba(0,0,0,0.85) 100%);background:linear-gradient(180deg,rgba(0,0,0,0) 0,rgba(0,0,0,0.85) 100%);padding-top:2em}.luno-collection-card__head{display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:justify;-webkit-justify-content:space-between;-ms-flex-pack:justify;justify-content:space-between;padding:0 1em .5em 1em;color:#fff;font-size:1em;font-weight:500}.luno-collection-card__info{padding:.5em 1em 1em 1em}.luno-collection-card__meta{display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-ms-flex-align:center;align-items:center;gap:1em;-webkit-flex-wrap:wrap;-ms-flex-wrap:wrap;flex-wrap:wrap;margin-bottom:.75em;font-size:.9em;color:rgba(255,255,255,0.9)}.luno-collection-card__rating{font-weight:600;color:#ffd700;display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-ms-flex-align:center;align-items:center}.luno-collection-card__rating svg{width:24px;height:24px;display:inline-block;vertical-align:middle;margin-right:.3em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}.luno-collection-card__rating-value{display:inline-block}.luno-collection-card__views{color:rgba(255,255,255,0.8)}.luno-collection-card__user{display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-ms-flex-align:center;align-items:center;gap:.5em;margin-left:auto}.luno-collection-card__user-name{color:rgba(255,255,255,0.9);font-weight:500}.luno-collection-card__user-icon{width:1.8em;height:1.8em;-webkit-border-radius:100%;border-radius:100%;background-color:#fff;border:.15em solid rgba(255,255,255,0.3);-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;overflow:hidden}.luno-collection-card__user-icon img{width:100%;height:100%;-webkit-border-radius:100%;border-radius:100%;opacity:0;-o-object-fit:cover;object-fit:cover}.luno-collection-card__user-icon.loaded img{opacity:1}.luno-collection-card__liked{display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-ms-flex-align:center;align-items:center;gap:.3em}.luno-collection-card__liked .full-review__like-icon{width:1em;height:1.2em;color:rgba(255,255,255,0.9)}.luno-collection-card__liked .full-review__like-counter{font-weight:600;color:rgba(255,255,255,0.9)}.luno-collection-card__description{font-size:1em;color:rgba(255,255,255,0.75);line-height:1.2;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;margin-top:.5em}.luno-collection-card__items{background:rgba(0,0,0,0.5);padding:.3em .6em;-webkit-border-radius:.3em;border-radius:.3em;font-weight:600}.luno-collection-card__date{font-size:.85em;opacity:.8}.category-full{margin-top:-0.5rem !important;padding-top:0 !important}.luno-collection-hero:first-child{margin-top:-2em !important}@media screen and (max-width:480px){.luno-collection-hero:first-child{margin-top:-1em !important}}.category-full .luno-collection-card{padding-bottom:2em}body.glass--style .luno-collection-card__bottom,body.glass--style .luno-collection-card__items{background-color:rgba(0,0,0,0.3);-webkit-backdrop-filter:blur(1.6em);backdrop-filter:blur(1.6em)}body.light--version .luno-collection-card__bottom{-webkit-border-radius:0;border-radius:0}@media screen and (max-width:767px){.items-cards .luno-collection-card{width: 30.7em !important} .category-full .luno-collection-card{width:33.3%}}@media screen and (max-width:580px){.category-full .luno-collection-card{width:50%}}@media screen and (max-width:991px){body.light--version .category-full .luno-collection-card{width:33.3%}}@media screen and (max-width:580px){body.light--version .category-full .luno-collection-card{width:50%}}@media screen and (max-width:991px){body.light--version.size--bigger .category-full .luno-collection-card{width:50%}}.category-full .card-back,.category-full .card-more,.items-cards:has(.luno-collection-card) .card-back,.items-cards:has(.luno-collection-card) .card-more{width:21.3%;margin-bottom:2em}.category-full .card-back__box,.category-full .card-more__box,.items-cards:has(.luno-collection-card) .card-back__box,.items-cards:has(.luno-collection-card) .card-more__box{padding-bottom:60%}@media screen and (max-width:767px){.category-full .card-back,.category-full .card-more,.items-cards:has(.luno-collection-card) .card-back,.items-cards:has(.luno-collection-card) .card-more{width:21.3%}}@media screen and (max-width:580px){.category-full .card-back,.category-full .card-more,.items-cards:has(.luno-collection-card) .card-back,.items-cards:has(.luno-collection-card) .card-more{width:50%}}@media screen and (max-width:991px){body.light--version .category-full .card-back,body.light--version .category-full .card-more,body.light--version .items-cards:has(.luno-collection-card) .card-back,body.light--version .items-cards:has(.luno-collection-card) .card-more{width:21.3%}}@media screen and (max-width:580px){body.light--version .category-full .card-back,body.light--version .category-full .card-more,body.light--version .items-cards:has(.luno-collection-card) .card-back,body.light--version .items-cards:has(.luno-collection-card) .card-more{width:50%}}@media screen and (min-width:767px){body.size--bigger .category-full .card-back,body.size--bigger .category-full .card-more,body.size--bigger .items-cards:has(.luno-collection-card) .card-back,body.size--bigger .items-cards:has(.luno-collection-card) .card-more{font-size:1.14em}}.luno-collection-hero{position:relative;min-height:400px;overflow:hidden;margin-top:0 !important;margin-bottom:-6 !important;padding-top:0 !important;background:-webkit-linear-gradient(315deg,rgba(26,26,27,0.9) 0,rgba(12,12,18,0.9) 100%);background:-o-linear-gradient(315deg,rgba(26,26,27,0.9) 0,rgba(12,12,18,0.9) 100%);background:linear-gradient(135deg,rgba(26,26,27,0.9) 0,rgba(12,12,18,0.9) 100%);background-size:cover;background-position:center;visibility:visible !important;display:block !important;opacity:1 !important;-webkit-transform:none !important;-ms-transform:none !important;transform:none !important;width:100%;-webkit-box-sizing:border-box;box-sizing:border-box}.luno-collection-hero__backdrop{position:absolute;top:0;left:0;width:100%;height:100%;background-size:cover;background-position:center;z-index:0}.luno-collection-hero__mask{position:absolute;top:0;left:0;width:100%;height:100%;background:-webkit-gradient(linear,left top,left bottom,from(rgba(0,0,0,0.2)),color-stop(50%,rgba(0,0,0,0.5)),to(#000));background:-webkit-linear-gradient(top,rgba(0,0,0,0.2) 0,rgba(0,0,0,0.5) 50%,#000 100%);background:-o-linear-gradient(top,rgba(0,0,0,0.2) 0,rgba(0,0,0,0.5) 50%,#000 100%);background:linear-gradient(180deg,rgba(0,0,0,0.2) 0,rgba(0,0,0,0.5) 50%,#000 100%);z-index:1}.luno-collection-hero__content{position:relative;z-index:2;padding:3rem 2rem;padding-bottom:3rem;display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-webkit-flex-direction:column;-ms-flex-direction:column;flex-direction:column;gap:1rem}.luno-collection-hero__title{font-size:3rem;font-weight:700;color:rgba(255,255,255,0.95);margin:0;text-shadow:0 2px 8px rgba(0,0,0,0.8),0 4px 16px rgba(0,0,0,0.6)}.luno-collection-hero__description{font-size:1.3rem;color:rgba(255,255,255,0.9);margin:0;max-width:800px;line-height:1.6;text-shadow:0 1px 4px rgba(0,0,0,0.8),0 2px 8px rgba(0,0,0,0.6)}.luno-collection-hero__meta{display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;gap:1.5rem;-webkit-flex-wrap:wrap;-ms-flex-wrap:wrap;flex-wrap:wrap;-webkit-box-align:center;-webkit-align-items:center;-ms-flex-align:center;align-items:center;font-size:.95rem;color:rgba(255,255,255,0.85);margin-top:.5rem;text-shadow:0 1px 3px rgba(0,0,0,0.8)}.luno-collection-hero__items,.luno-collection-hero__views,.luno-collection-hero__liked{font-weight:500}.luno-collection-hero__rating{font-weight:600;color:#ffd700;text-shadow:0 1px 3px rgba(0,0,0,0.9)}.luno-collection-hero__author{margin-top:1rem}.luno-collection-hero__author-link{display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-ms-flex-align:center;align-items:center;gap:.75rem;text-decoration:none;color:rgba(255,255,255,0.9);-webkit-transition:color 200ms;-o-transition:color 200ms;transition:color 200ms;padding:.5rem 1rem;-webkit-border-radius:200px;border-radius:200px;background:rgba(0,0,0,0.4);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.2);-webkit-box-shadow:0 2px 8px rgba(0,0,0,0.3);box-shadow:0 2px 8px rgba(0,0,0,0.3);width:-webkit-fit-content;width:-moz-fit-content;width:fit-content}.luno-collection-hero__author-icon{width:2rem;height:2rem;-webkit-border-radius:50%;border-radius:50%;-o-object-fit:cover;object-fit:cover;border:1px solid rgba(255,255,255,0.2);overflow:hidden;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}.luno-collection-hero__author-icon img{width:100%;height:100%;-o-object-fit:cover;object-fit:cover}.luno-collection-hero__author-name{font-size:.9rem;font-weight:500;-webkit-transition:color 200ms;-o-transition:color 200ms;transition:color 200ms}@media screen and (max-width:768px){.luno-collection-hero{min-height:300px}.luno-collection-hero__content{padding:2rem 1.5rem}.luno-collection-hero__title{font-size:2rem}.luno-collection-hero__description{font-size:1rem}.luno-collection-hero__meta{font-size:.85rem;gap:1rem}}\n        </style>\n    ";
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