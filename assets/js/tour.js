/*
	Guided tour — first-visit walkthrough for raimonvibe.com
	Paired with assets/css/tour.css. Vanilla JS: no jQuery, no icon font.

	How it works
	  - ROUTE is one continuous journey across index -> about -> casestudy.
	    Reaching the end of a page's leg navigates to the next page and resumes there.
	  - ASIDES give the smaller pages a single contextual note plus a way into the
	    full tour, so the launcher does something useful everywhere.
	  - It runs once per visitor (localStorage); the launcher replays it on demand.
*/

(function () {

	'use strict';

	var DONE_KEY = 'rv-tour-v1-done';
	var RESUME_KEY = 'rv-tour-v1-resume';
	var AUTOSTART_DELAY = 900;

	// Content.
	// ------------------------------------------------------------------
	// target:   CSS selector. Omit for a centred step with no spotlight.
	// minWidth: only include the step at this viewport width and up.
	// cta:      replaces the primary button with a link.

	var ROUTE = [
		{
			page: 'index.html',
			steps: [
				{
					target: '#intro .inner',
					title: 'Welcome to raimonvibe',
					body: '<p>We build responsive websites by hand — HTML, CSS and JavaScript, no page-builder bloat.</p><p>This short tour walks you through what we make, what it costs, and how to reach us. About a minute.</p>'
				},
				{
					target: '#sidebar nav',
					minWidth: 737,
					title: 'Four stops',
					body: '<p>Welcome, who we are, what we do, and how to get in touch.</p><p>This menu follows you down the page, so you can jump anywhere at any time.</p>'
				},
				{
					target: '#one > section:nth-of-type(1) .content .inner',
					title: 'Websites for businesses',
					body: '<p>The core service: a fast, mobile-first site that puts your services, location and contact details in front of people.</p><p>The panels below this one open other sides of the work — our study blogs, and the software engineering projects.</p>'
				},
				{
					target: '#one > section:nth-of-type(4) .content .inner',
					title: 'See it in action',
					body: '<p>Two short demos of real builds: the coding process, and how the result reflows across screen sizes.</p><p>The <strong>Meadowbrook case study</strong> button goes deeper on one project — we\'ll stop there later in the tour.</p>'
				},
				{
					target: '#two .features',
					title: 'What\'s in every build',
					body: '<p>A responsive layout, reliable behaviour across browsers, social links wired up, and a colour scheme designed around your brand rather than a stock theme.</p>'
				},
				{
					target: '#two > .inner > ul.actions',
					title: 'What it costs',
					body: '<p>A complete landing page starts around <strong>$400</strong>.</p><p>The button opens our Fiverr listing, where the packages are laid out in full.</p>'
				},
				{
					target: '#three form',
					title: 'Get in touch',
					body: '<p>Tell us what you need: pick a reason, set a priority, write a line or two.</p><p>It lands straight in our inbox and we reply as soon as we can.</p>'
				}
			]
		},
		{
			page: 'about.html',
			steps: [
				{
					target: '#main .inner',
					title: 'Why we do this',
					body: '<p>A little background. We\'re lifelong learners: writing code, writing blogs, tinkering with 3D printing.</p><p>If you\'d rather see the code than read about it, the link in the second paragraph opens our projects page.</p>'
				}
			]
		},
		{
			page: 'casestudy.html',
			steps: [
				{
					target: '#main .inner h1',
					title: 'Case study: Meadowbrook',
					body: '<p>A children\'s farm website, built to feel like walking into a petting zoo — hay, chickens, room to be curious.</p><p>This page is about the thinking behind it, not just the screenshots.</p>'
				},
				{
					target: '#main .inner ul',
					title: 'What went into it',
					body: '<p>Four concrete decisions: a gentle introduction, clearly separated sections, soft imagery, and a layout that stays calm on a phone.</p><p>That same pattern is what we bring to client work.</p>'
				},
				{
					title: 'That\'s the tour',
					body: '<p>You\'ve seen the services, what\'s included, the price, and the work behind it.</p><p>If something here fits what you need, the contact form is one click away.</p>',
					restart: true,
					cta: { label: 'Get in touch', href: 'index.html#three' }
				}
			]
		}
	];

	var ASIDES = {
		'elements.html': [
			{
				target: '#main .inner h1',
				title: 'The component library',
				body: '<p>Every text style, form field, table, button and icon used across the site, gathered on one page.</p><p>It\'s our reference while designing — handy for picking out what your own pages should use.</p>'
			}
		],
		'generic.html': [
			{
				target: '#main .inner h1',
				title: 'A page template',
				body: '<p>Kept as a clean starting point when a new section gets added to the site.</p>'
			}
		],
		'legalnotice.html': [
			{
				target: '#main .inner',
				title: 'Legal notice',
				body: '<p>Who is behind this site, the business details, and the terms that apply to the work we deliver.</p>'
			}
		],
		'privacynotice.html': [
			{
				target: '#main .inner h1',
				title: 'Privacy policy',
				body: '<p>What we collect — analytics and whatever you send through the contact form — why we collect it, and how to have it removed.</p>'
			}
		]
	};

	// State.
	// ------------------------------------------------------------------

	var flow = [];
	var isAside = false;
	var index = -1;
	var els = null;
	var launcher = null;
	var lastFocus = null;
	var target = null;
	var frame = null;
	var running = false;
	var placed = false;

	// Helpers.
	// ------------------------------------------------------------------

	function store(kind, method, key, value) {
		try {
			var s = kind === 'session' ? window.sessionStorage : window.localStorage;
			if (method === 'get') return s.getItem(key);
			if (method === 'set') return s.setItem(key, value);
			return s.removeItem(key);
		}
		catch (e) {
			// Private browsing / storage disabled: the tour just won't remember.
			return null;
		}
	}

	function pageKey() {
		var path = window.location.pathname.replace(/\/+$/, '');
		var name = path.substring(path.lastIndexOf('/') + 1).toLowerCase();
		return name || 'index.html';
	}

	function reducedMotion() {
		return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	function clamp(value, min, max) {
		if (max < min) return min;
		return Math.min(Math.max(value, min), max);
	}

	function visible(el) {
		if (!el || !el.getClientRects().length) return false;
		var style = window.getComputedStyle(el);
		return style.visibility !== 'hidden' && style.display !== 'none';
	}

	function resolve(step) {
		if (!step.target) return null;
		var el = document.querySelector(step.target);
		return visible(el) ? el : false;
	}

	// Flow.
	// ------------------------------------------------------------------

	function buildFlow() {
		var page = pageKey();
		var width = window.innerWidth;
		var out = [];

		if (ASIDES[page]) {
			isAside = true;
			ASIDES[page].forEach(function (step) {
				out.push({ page: page, step: step });
			});
			return out;
		}

		isAside = false;
		ROUTE.forEach(function (leg) {
			leg.steps.forEach(function (step) {
				if (step.minWidth && width < step.minWidth) return;
				out.push({ page: leg.page, step: step });
			});
		});
		return out;
	}

	function firstIndexOnPage(page) {
		for (var i = 0; i < flow.length; i++) {
			if (flow[i].page === page) return i;
		}
		return -1;
	}

	// Overlay.
	// ------------------------------------------------------------------

	function build() {
		if (els) return;

		var root = document.createElement('div');
		root.className = 'rv-tour';
		root.setAttribute('role', 'dialog');
		root.setAttribute('aria-modal', 'true');
		root.setAttribute('aria-labelledby', 'rv-tour-title');
		root.innerHTML =
			'<div class="rv-tour__blocker"></div>' +
			'<div class="rv-tour__veil"></div>' +
			'<div class="rv-tour__spot"></div>' +
			'<div class="rv-tour__card" tabindex="-1">' +
				'<button type="button" class="rv-tour__close" aria-label="Close tour">&times;</button>' +
				'<p class="rv-tour__count" aria-live="polite"></p>' +
				'<h2 class="rv-tour__title" id="rv-tour-title"></h2>' +
				'<div class="rv-tour__body"></div>' +
				'<ul class="rv-tour__dots"></ul>' +
				'<div class="rv-tour__nav">' +
					'<button type="button" class="rv-tour__skip rv-tour__quiet">Skip</button>' +
					'<span class="rv-tour__spacer"></span>' +
					'<button type="button" class="rv-tour__back">Back</button>' +
					'<button type="button" class="rv-tour__next rv-tour__primary">Next</button>' +
				'</div>' +
			'</div>';

		document.body.appendChild(root);

		els = {
			root: root,
			veil: root.querySelector('.rv-tour__veil'),
			spot: root.querySelector('.rv-tour__spot'),
			card: root.querySelector('.rv-tour__card'),
			close: root.querySelector('.rv-tour__close'),
			count: root.querySelector('.rv-tour__count'),
			title: root.querySelector('.rv-tour__title'),
			body: root.querySelector('.rv-tour__body'),
			dots: root.querySelector('.rv-tour__dots'),
			skip: root.querySelector('.rv-tour__skip'),
			back: root.querySelector('.rv-tour__back'),
			next: root.querySelector('.rv-tour__next')
		};

		els.close.addEventListener('click', function () { finish(true); });
		els.skip.addEventListener('click', function () { finish(true); });
		els.back.addEventListener('click', function () { step(-1); });
		els.next.addEventListener('click', function () { step(1); });
	}

	function buildDots(current) {
		var html = '';
		for (var i = 0; i < flow.length; i++) {
			var cls = 'rv-tour__dot';
			if (i < current) cls += ' is-done';
			else if (i === current) cls += ' is-current';
			html += '<li class="' + cls + '"></li>';
		}
		els.dots.innerHTML = html;
	}

	// Positioning.
	// ------------------------------------------------------------------

	function reposition() {
		if (!running || !els) return;

		var rect = target ? target.getBoundingClientRect() : null;
		var vw = window.innerWidth;
		var vh = window.innerHeight;

		if (rect) {
			var pad = 10;
			els.spot.style.top = (rect.top - pad) + 'px';
			els.spot.style.left = (rect.left - pad) + 'px';
			els.spot.style.width = (rect.width + pad * 2) + 'px';
			els.spot.style.height = (rect.height + pad * 2) + 'px';
		}

		// Below 737px the card is docked to the bottom by CSS.
		if (vw <= 736) return;

		var cw = els.card.offsetWidth;
		var ch = els.card.offsetHeight;
		var gap = 18;
		var edge = 18;
		var top;
		var left;

		// A target that fills most of the screen can't be cleared, only annotated.
		var oversized = rect && (rect.height > vh * 0.62 || rect.width * rect.height > vw * vh * 0.42);

		if (!rect) {
			left = (vw - cw) / 2;
			top = (vh - ch) / 2;
		}
		else if (oversized) {
			if (rect.right + gap + cw <= vw - edge) {
				left = rect.right + gap;
				top = (vh - ch) / 2;
			}
			else if (rect.left - gap - cw >= edge) {
				left = rect.left - gap - cw;
				top = (vh - ch) / 2;
			}
			else {
				// Nothing fits beside it: park in the corner as an annotation.
				left = vw - cw - edge;
				top = vh - ch - edge;
			}
		}
		else if (rect.bottom + gap + ch <= vh - edge) {
			top = rect.bottom + gap;
			left = rect.left + rect.width / 2 - cw / 2;
		}
		else if (rect.top - gap - ch >= edge) {
			top = rect.top - gap - ch;
			left = rect.left + rect.width / 2 - cw / 2;
		}
		else if (rect.right + gap + cw <= vw - edge) {
			left = rect.right + gap;
			top = rect.top + rect.height / 2 - ch / 2;
		}
		else if (rect.left - gap - cw >= edge) {
			left = rect.left - gap - cw;
			top = rect.top + rect.height / 2 - ch / 2;
		}
		else {
			left = vw - cw - edge;
			top = vh - ch - edge;
		}

		els.card.style.top = clamp(top, edge, vh - ch - edge) + 'px';
		els.card.style.left = clamp(left, edge, vw - cw - edge) + 'px';
	}

	function queueReposition() {
		if (frame) return;
		frame = window.requestAnimationFrame(function () {
			frame = null;
			reposition();
		});
	}

	function scrollIntoPlace(el, done) {
		var rect = el.getBoundingClientRect();
		var vh = window.innerHeight;

		if (rect.top >= 80 && rect.bottom <= vh - 24) {
			done();
			return;
		}

		if (reducedMotion()) {
			el.scrollIntoView({ block: 'center', inline: 'nearest' });
			done();
			return;
		}

		el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

		// Wait for the smooth scroll to settle before measuring. Polled on a timer
		// rather than animation frames, which are suspended in a hidden tab.
		var last = null;
		var stable = 0;
		var tries = 0;

		(function poll() {
			var y = window.pageYOffset;
			stable = (y === last) ? stable + 1 : 0;
			last = y;
			if (stable >= 3 || ++tries > 45) {
				done();
				return;
			}
			window.setTimeout(poll, 32);
		})();
	}

	// Steps.
	// ------------------------------------------------------------------

	function render(i) {
		var entry = flow[i];
		var data = entry.step;

		index = i;
		target = resolve(data);

		els.root.setAttribute('data-mode', target ? 'spot' : 'center');
		els.title.innerHTML = data.title;
		els.body.innerHTML = data.body;

		if (flow.length > 1) {
			els.count.textContent = 'Step ' + (i + 1) + ' of ' + flow.length;
			els.count.style.display = '';
			els.dots.style.display = '';
			buildDots(i);
		}
		else {
			els.count.style.display = 'none';
			els.dots.style.display = 'none';
		}

		var isLast = (i === flow.length - 1);

		els.back.style.display = (i === 0) ? 'none' : '';
		els.back.textContent = 'Back';

		if (data.restart) {
			els.back.style.display = '';
			els.back.textContent = 'Restart';
		}

		if (data.cta) {
			els.next.textContent = data.cta.label;
		}
		else if (isAside) {
			els.next.textContent = 'Take the full tour';
		}
		else {
			els.next.textContent = isLast ? 'Finish' : 'Next';
		}

		els.skip.textContent = isLast ? 'Close' : 'Skip';

		function settled() {
			// Position straight away so the first paint is right even if animation
			// frames aren't running, then refine once the card has its final height.
			if (!placed) {
				// Without this the spotlight animates out of the top-left corner.
				placed = true;
				els.spot.classList.add('is-instant');
				reposition();
				window.setTimeout(function () {
					if (els) els.spot.classList.remove('is-instant');
				}, 60);
			}
			else {
				reposition();
			}

			window.requestAnimationFrame(reposition);
		}

		if (target) scrollIntoPlace(target, settled);
		else settled();
	}

	function goTo(i, direction) {
		if (i < 0) {
			finish(true);
			return;
		}

		if (i >= flow.length) {
			finish(false);
			return;
		}

		var entry = flow[i];

		if (entry.page !== pageKey()) {
			store('session', 'set', RESUME_KEY, JSON.stringify({ index: i, page: entry.page }));
			window.location.href = entry.page;
			return;
		}

		// Skip past steps whose target isn't on this page (or is hidden here).
		if (entry.step.target && resolve(entry.step) === false) {
			goTo(i + (direction || 1), direction || 1);
			return;
		}

		render(i);
	}

	function step(direction) {
		var data = flow[index] && flow[index].step;

		if (direction > 0 && data) {
			if (data.cta) {
				finish(false, data.cta.href);
				return;
			}
			if (isAside) {
				store('local', 'remove', DONE_KEY);
				store('session', 'set', RESUME_KEY, JSON.stringify({ index: 0, page: ROUTE[0].page }));
				window.location.href = ROUTE[0].page;
				return;
			}
		}

		if (direction < 0 && data && data.restart) {
			restart();
			return;
		}

		goTo(index + direction, direction);
	}

	function restart() {
		if (pageKey() !== ROUTE[0].page) {
			store('session', 'set', RESUME_KEY, JSON.stringify({ index: 0, page: ROUTE[0].page }));
			window.location.href = ROUTE[0].page;
			return;
		}
		window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
		goTo(0, 1);
	}

	// Keyboard.
	// ------------------------------------------------------------------

	function onKeydown(event) {
		if (!running) return;

		if (event.key === 'Escape') {
			event.preventDefault();
			finish(true);
			return;
		}

		if (event.key === 'ArrowRight') {
			event.preventDefault();
			step(1);
			return;
		}

		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			if (els.back.style.display !== 'none') step(-1);
			return;
		}

		if (event.key !== 'Tab') return;

		// Keep focus inside the card. offsetParent is null for the hidden Back button.
		var focusable = Array.prototype.filter.call(els.card.querySelectorAll('button'), function (button) {
			return button.offsetParent !== null;
		});
		if (!focusable.length) return;

		var first = focusable[0];
		var last = focusable[focusable.length - 1];

		if (event.shiftKey && (document.activeElement === first || document.activeElement === els.card)) {
			event.preventDefault();
			last.focus();
		}
		else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	// Lifecycle.
	// ------------------------------------------------------------------

	function start(at) {
		flow = buildFlow();
		if (!flow.length) return;

		build();
		running = true;
		placed = false;
		lastFocus = document.activeElement;
		document.body.classList.add('rv-tour-active');

		var from = (typeof at === 'number') ? at : firstIndexOnPage(pageKey());
		if (from < 0) from = 0;

		goTo(from, 1);

		// A timer rather than an animation frame: still fires in a hidden tab, so the
		// overlay can't end up stuck at opacity 0 with focus left on the page.
		window.setTimeout(function () {
			if (!els) return;
			els.root.classList.add('is-visible');
			els.next.focus();
		}, 20);

		window.addEventListener('scroll', queueReposition, true);
		window.addEventListener('resize', queueReposition);
		document.addEventListener('keydown', onKeydown, true);
		// A tour opened in a background tab has paused transitions; re-measure on return.
		document.addEventListener('visibilitychange', reposition);
	}

	function finish(skipped, href) {
		if (!running) return;

		running = false;
		store('local', 'set', DONE_KEY, skipped ? 'skipped' : 'completed');
		store('session', 'remove', RESUME_KEY);

		window.removeEventListener('scroll', queueReposition, true);
		window.removeEventListener('resize', queueReposition);
		document.removeEventListener('keydown', onKeydown, true);
		document.removeEventListener('visibilitychange', reposition);

		els.root.classList.remove('is-visible');
		document.body.classList.remove('rv-tour-active');

		window.setTimeout(function () {
			if (els && els.root.parentNode) els.root.parentNode.removeChild(els.root);
			els = null;
			target = null;
			index = -1;

			if (href) {
				window.location.href = href;
				return;
			}

			if (launcher) launcher.focus();
			else if (lastFocus && lastFocus.focus) lastFocus.focus();
		}, reducedMotion() ? 0 : 260);
	}

	// Cookie consent.
	// ------------------------------------------------------------------
	// The CookieScript banner sits at z-index 999997, well above the tour, and
	// shows on exactly the same visit the tour wants to auto-start. Wait for the
	// visitor to answer it first.

	function consentPending() {
		return visible(document.getElementById('cookiescript_injected'));
	}

	function whenConsentSettled(callback) {
		if (!consentPending()) {
			callback();
			return;
		}

		var waited = 0;
		var timer = window.setInterval(function () {
			waited += 400;

			if (!consentPending()) {
				window.clearInterval(timer);
				window.setTimeout(callback, 500);
				return;
			}

			// Still undecided after 25s: don't pile on. The launcher stays available.
			if (waited >= 25000) window.clearInterval(timer);
		}, 400);
	}

	// Launcher.
	// ------------------------------------------------------------------

	function addLauncher(pulse) {
		var button = document.createElement('button');
		button.type = 'button';
		button.className = 'rv-tour-launcher';
		button.setAttribute('aria-label', 'Take the guided tour of this site');
		button.innerHTML =
			'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
				'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
				'<circle cx="12" cy="12" r="9"></circle>' +
				'<path d="M15.6 8.4 13.2 13.2 8.4 15.6 10.8 10.8Z"></path>' +
			'</svg>' +
			'<span>Tour</span>' +
			(pulse ? '<span class="rv-tour-launcher__pulse"></span>' : '');

		button.addEventListener('click', function () {
			start();
		});

		document.body.appendChild(button);
		launcher = button;
	}

	// Boot.
	// ------------------------------------------------------------------

	function boot() {
		var page = pageKey();
		var hasSteps = !!ASIDES[page] || firstIndexOnPage(page) > -1 || ROUTE.some(function (leg) {
			return leg.page === page;
		});

		flow = buildFlow();
		if (!flow.length) return;
		if (!hasSteps && !isAside) return;

		var done = store('local', 'get', DONE_KEY);
		addLauncher(!done);

		// Resuming a leg that started on another page.
		var resume = store('session', 'get', RESUME_KEY);
		if (resume) {
			store('session', 'remove', RESUME_KEY);
			try {
				var parsed = JSON.parse(resume);
				if (parsed && parsed.page === page && typeof parsed.index === 'number') {
					whenConsentSettled(function () { start(parsed.index); });
					return;
				}
			}
			catch (e) { /* malformed: fall through to the normal rules */ }
		}

		// Explicit request via ?tour=1.
		if (/[?&]tour=1(&|$)/.test(window.location.search)) {
			whenConsentSettled(function () { start(); });
			return;
		}

		// First visit.
		if (!done) {
			window.setTimeout(function () {
				whenConsentSettled(function () { start(); });
			}, AUTOSTART_DELAY);
		}
	}

	if (document.readyState === 'complete') boot();
	else window.addEventListener('load', function () { window.setTimeout(boot, 150); });

})();
