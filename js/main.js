/**
 * WeekendEnglish.it
 * No cookies, no analytics, no network calls. Everything below runs locally.
 *
 * Page chrome and the small effects live here. The hero film is in film.js
 * and the exercise demo in lesson.js.
 */

(function () {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Runs a DOM update inside a view transition where the browser has them
    // and motion is welcome; otherwise just runs it. A transition started
    // while another is still animating skips the first one, and its `ready`
    // promise rejects with an AbortError; the update still runs, so that
    // rejection is expected and swallowed.
    function withTransition(update) {
        if (!prefersReducedMotion && document.startViewTransition) {
            const transition = document.startViewTransition(update);
            transition.ready.catch(function () {});
            transition.finished.catch(function () {});
        } else {
            update();
        }
    }

    /* ---------------------------------------------------------------------
       Theme toggle. color-scheme on <html> drives every light-dark() token,
       so switching is one attribute. The choice is kept in localStorage,
       which is a preference on this device, not tracking.
       --------------------------------------------------------------------- */

    function initTheme() {
        const btn = document.getElementById('theme-toggle');
        if (!btn) return;
        const root = document.documentElement;
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

        function current() {
            return root.dataset.theme || (systemDark.matches ? 'dark' : 'light');
        }

        function label() {
            btn.setAttribute('aria-label', current() === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro');
        }

        btn.addEventListener('click', function () {
            const next = current() === 'dark' ? 'light' : 'dark';
            withTransition(function () { root.dataset.theme = next; });
            try { localStorage.setItem('we-theme', next); } catch (e) {}
            label();
        });

        systemDark.addEventListener('change', label);
        label();
    }

    /* ---------------------------------------------------------------------
       Invitation email
       --------------------------------------------------------------------- */

    const INVITE = {
        subject: 'Weekend English: vorrei partecipare al pilota',
        body: 'Ciao,\n\nVorrei partecipare al pilota di Weekend English.\n\n' +
              'Uso l\'inglese per: ...\nMi interessano: ...\nGli orari che preferisco: ...\n\nGrazie.'
    };

    function initMailto() {
        const cta = document.getElementById('apply-cta');
        if (!cta) return;
        cta.href = 'mailto:info@weekendenglish.it?subject=' + encodeURIComponent(INVITE.subject) +
            '&body=' + encodeURIComponent(INVITE.body);
    }

    /* ---------------------------------------------------------------------
       Scroll-driven chrome: masthead rule, mobile action bar, current nav
       --------------------------------------------------------------------- */

    function initScrollChrome() {
        const masthead = document.getElementById('masthead');
        const actionBar = document.getElementById('action-bar');
        let ticking = false;

        function update() {
            const y = window.scrollY;
            if (masthead) masthead.classList.toggle('is-stuck', y > 8);
            if (actionBar) actionBar.classList.toggle('is-visible', y > window.innerHeight * 0.8);
            ticking = false;
        }

        window.addEventListener('scroll', function () {
            if (!ticking) {
                ticking = true;
                window.requestAnimationFrame(update);
            }
        }, { passive: true });

        update();

        const links = Array.from(document.querySelectorAll('.nav a[href^="#"]'));
        if (!links.length || !('IntersectionObserver' in window)) return;
        const byId = {};
        links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });

        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                links.forEach(function (a) { a.removeAttribute('aria-current'); });
                const link = byId[entry.target.id];
                if (link) link.setAttribute('aria-current', 'true');
            });
        }, { rootMargin: '-50% 0px -50% 0px' });

        Object.keys(byId).forEach(function (id) {
            const section = document.getElementById(id);
            if (section) observer.observe(section);
        });
    }

    /* ---------------------------------------------------------------------
       Reveal on enter
       --------------------------------------------------------------------- */

    function onVisible(el, callback, options) {
        if (!('IntersectionObserver' in window)) { callback(); return; }
        const observer = new IntersectionObserver(function (entries) {
            if (!entries[0].isIntersecting) return;
            observer.disconnect();
            callback();
        }, options || { threshold: 0.2 });
        observer.observe(el);
    }

    function initReveals() {
        const targets = Array.from(document.querySelectorAll('.reveal'));
        if (!targets.length) return;

        if (prefersReducedMotion || !('IntersectionObserver' in window)) {
            targets.forEach(function (el) { el.classList.add('is-visible'); });
            return;
        }

        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

        targets.forEach(function (el) { observer.observe(el); });

        // Safety net. A browser suspends rendering work (rAF, observer
        // delivery) for a page opened in a background tab, so the page can
        // finish loading with nothing revealed. Once everything has loaded,
        // reveal whatever is already on screen.
        window.addEventListener('load', function () {
            targets.forEach(function (el) {
                if (el.classList.contains('is-visible')) return;
                const rect = el.getBoundingClientRect();
                if (rect.top < window.innerHeight && rect.bottom > 0) {
                    el.classList.add('is-visible');
                    observer.unobserve(el);
                }
            });
        });
    }

    /* ---------------------------------------------------------------------
       For the teacher: six post-lesson chores get crossed off one by one
       while the counter falls to 0.
       --------------------------------------------------------------------- */

    function initZero() {
        const num = document.getElementById('zero-num');
        const list = document.getElementById('zero-list');
        if (!num || !list) return;
        const items = Array.from(list.querySelectorAll('li'));

        if (prefersReducedMotion) {
            items.forEach(function (li) { li.classList.add('is-struck'); });
            num.textContent = '0';
            return;
        }

        num.textContent = String(items.length);
        onVisible(list, function () {
            items.forEach(function (li, i) {
                window.setTimeout(function () {
                    li.classList.add('is-struck');
                    num.textContent = String(items.length - i - 1);
                    num.animate(
                        [{ transform: 'translateY(-0.08em) scale(1.06)' }, { transform: 'none' }],
                        { duration: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
                    );
                }, 350 + i * 380);
            });
        }, { threshold: 0.5 });
    }

    /* ---------------------------------------------------------------------
       Housekeeping
       --------------------------------------------------------------------- */

    function initYear() {
        const el = document.getElementById('current-year');
        if (!el) return;
        const year = String(new Date().getFullYear());
        el.textContent = year;
        el.setAttribute('datetime', year);
    }

    function init() {
        initTheme();
        initMailto();
        initScrollChrome();
        initReveals();
        initZero();
        initYear();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
