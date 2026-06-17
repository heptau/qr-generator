(function () {
	var lang = (navigator.language || '').split('-')[0];
	var supported = ['cs', 'es'];
	var locale = supported.indexOf(lang) !== -1 ? lang : 'en';

	document.documentElement.lang = locale;
	window.__locale = locale;
	window.__ready = false;
	window.__ = function (k) {
		return k;
	};

	function apply() {
		var el;
		el = document.querySelector('title[data-i18n]');
		if (el) document.title = window.__(el.getAttribute('data-i18n'));
		[].slice.call(document.querySelectorAll('[data-i18n]')).forEach(function (e) {
			if (e.tagName === 'TITLE') return;
			e.textContent = window.__(e.getAttribute('data-i18n'));
		});
		window.__ready = true;
		document.dispatchEvent(new Event('i18n-ready'));
	}

	var s = document.createElement('script');
	s.src = 'lang/' + locale + '.js';
	s.onload = apply;
	s.onerror = function () {
		if (locale !== 'en') {
			var fb = document.createElement('script');
			fb.src = 'lang/en.js';
			fb.onload = apply;
			fb.onerror = function () {
				window.__ready = true;
				document.dispatchEvent(new Event('i18n-ready'));
			};
			document.head.appendChild(fb);
			return;
		}
		window.__ready = true;
		document.dispatchEvent(new Event('i18n-ready'));
	};
	document.head.appendChild(s);
})();
