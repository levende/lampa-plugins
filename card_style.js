(function () {
    'use strict';

    function getColor(rating, alpha) {
        var rgb = '';

        if (rating >= 0 && rating <= 3) rgb = '231, 76, 60';
        else if (rating > 3 && rating <= 5) rgb = '230, 126, 34'
        else if (rating > 5 && rating <= 6.5) rgb = '241, 196, 15';
        else if (rating > 6.5 && rating < 8) rgb = '52, 152, 219';
        else if (rating >= 8 && rating <= 10) rgb = '46, 204, 113';

        if (rgb) {
            return 'rgba(' + rgb + ', ' + alpha + ')'
        }

        return null;
    }

    function start() {
        if (window.card_style) return;
        window.card_style = true;

        var style = document.createElement('style');
        style.innerHTML =
            '.card__vote {' +
                'right: 0;' +
                'bottom: 0;' +
                'padding: 0.2em 0.45em;' +
                'border-radius: 0.75em 0;' +
            '}' +
            '.card__view .card__age {' +
                'right: 0;' +
                'top: 0;' +
                'padding: 0.2em 0.45em;' +
                'border-radius: 0 0.75em;' +
                'background: rgba(0, 0, 0, 0.5);' +
                'position: absolute;' +
                'margin-top: 0;' +
                'font-size: 1.3em;' +
            '}' +
            '.card__icons {' +
                'top: 2.4em;' +
            '}';

        document.head.appendChild(style);

        var CardMaker = Lampa.Maker.map('Card');
        var originalOnVisible = CardMaker.Card.onVisible;
        CardMaker.Card.onVisible = function () {
            originalOnVisible.apply(this, arguments);
            var tv = this.html.getElementsByClassName('card__type');
            if (tv.length > 0) {
                var element = tv[0];
                element.style.left = '0';
                element.style.top = '0';
                element.style.padding = '0.3em 0.6em';
                element.style.borderRadius = '1.2em 0';
                element.style.background = 'rgba(0, 0, 0, 0.5)';

                element.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="1.7em" height="1.7em" viewBox="0 0 51.802 51.801" xml:space="preserve"><path d="M47.947 4.43H12.495A3.86 3.86 0 0 0 8.64 8.284v2.641h-.466a3.86 3.86 0 0 0-3.855 3.854v2.642h-.465A3.86 3.86 0 0 0 0 21.275v22.242a3.86 3.86 0 0 0 3.854 3.854h35.453a3.86 3.86 0 0 0 3.855-3.854v-2.644h.465a3.86 3.86 0 0 0 3.854-3.854v-2.641h.467a3.86 3.86 0 0 0 3.854-3.854V8.284a3.857 3.857 0 0 0-3.855-3.854m-8.75 25.987v12.99H3.963V21.385h35.234zm4.321 6.494h-.355V21.275a3.86 3.86 0 0 0-3.855-3.854H12.604v-.001H8.641v-1.266h-.357v-1.266h35.235V36.91zm4.321-6.494h-.356V14.78a3.86 3.86 0 0 0-3.854-3.854H12.604V8.394H47.84z" fill="currentColor"></path><path d="m26.401 30.446-5.788-4.215a1.916 1.916 0 0 0-3.044 1.549v8.43a1.914 1.914 0 0 0 1.916 1.916c.398 0 .794-.125 1.128-.367l5.788-4.215a1.92 1.92 0 0 0 0-3.098" fill="currentColor"></path></svg>';
            }
            var vote = this.html.getElementsByClassName('card__vote');
            if (vote.length > 0) {
                var voteValue = parseFloat(vote[0].textContent.trim());
                var color = getColor(voteValue, 0.7);
                vote[0].style.backgroundColor = color;
            }

            var age = this.html.querySelector('.card__age');
            var view = this.html.querySelector('.card__view');

            if (age && view) {
                view.appendChild(age);
            }
        };
    }

    start();
})();