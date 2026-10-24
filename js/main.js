/**
 * WeekendEnglish.it
 * No cookies, no analytics, no network calls. Everything below runs locally.
 *
 * This file holds the page chrome and the smaller demos. The larger ones
 * have their own files: film.js (hero film), simulator.js (post-call loop),
 * lesson.js (exercise player) and booking.js (calendar).
 */

(function () {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Runs a DOM update inside a view transition where the browser has them
    // and motion is welcome; otherwise just runs it.
    // A transition started while another is still animating skips the first
    // one, and its `ready` promise rejects with an AbortError. The DOM update
    // still runs, so that rejection is expected and swallowed here.
    function withTransition(update) {
        if (!prefersReducedMotion && document.startViewTransition) {
            const transition = document.startViewTransition(update);
            transition.ready.catch(function () {});
            transition.finished.catch(function () {});
        } else {
            update();
        }
    }

    window.WE = { prefersReducedMotion: prefersReducedMotion, withTransition: withTransition };

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
        body: 'Ciao Cameron,\n\nVorrei partecipare al pilota della piattaforma.\n\n' +
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
       01 · Journey: the phone shows the screen for the active step. On wide
       screens the step crossing the middle of the viewport wins; on phones
       the steps are a swipe row and the centred card wins.
       --------------------------------------------------------------------- */

    function initJourney() {
        const list = document.getElementById('journey-steps');
        const phone = document.getElementById('journey-phone');
        if (!list || !phone) return;

        const steps = Array.from(list.querySelectorAll('.jstep'));
        const screens = Array.from(phone.querySelectorAll('.screen'));
        const narrow = window.matchMedia('(max-width: 900px)');
        let active = 0;
        let observer = null;

        function setActive(i) {
            if (i === active) return;
            active = i;
            steps.forEach(function (s, j) {
                s.classList.toggle('is-active', j === i);
                if (j === i) s.setAttribute('aria-current', 'step');
                else s.removeAttribute('aria-current');
            });
            screens.forEach(function (s, j) { s.classList.toggle('is-active', j === i); });
        }

        function observe() {
            if (observer) observer.disconnect();
            if (!('IntersectionObserver' in window)) return;
            const options = narrow.matches
                ? { root: list, threshold: 0.6 }
                : { rootMargin: '-45% 0px -45% 0px' };
            observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) setActive(steps.indexOf(entry.target));
                });
            }, options);
            steps.forEach(function (s) { observer.observe(s); });
        }

        steps.forEach(function (step, i) {
            const btn = step.querySelector('.jstep__btn');
            if (!btn) return;
            btn.addEventListener('click', function () {
                setActive(i);
                const behavior = prefersReducedMotion ? 'auto' : 'smooth';
                if (narrow.matches) {
                    list.scrollTo({ left: step.offsetLeft - list.offsetLeft - (list.clientWidth - step.clientWidth) / 2, behavior: behavior });
                } else {
                    step.scrollIntoView({ block: 'center', behavior: behavior });
                }
            });
        });

        steps[0].setAttribute('aria-current', 'step');
        observe();
        narrow.addEventListener('change', observe);
    }

    /* ---------------------------------------------------------------------
       02 · The zero: six post-call chores get crossed off one by one while
       the counter falls to 0.
       --------------------------------------------------------------------- */

    function initZero() {
        const num = document.getElementById('zero-num');
        const items = Array.from(document.querySelectorAll('#zero-list li'));
        if (!num || !items.length) return;

        if (prefersReducedMotion) {
            items.forEach(function (li) { li.classList.add('is-struck'); });
            num.textContent = '0';
            return;
        }

        num.textContent = String(items.length);
        onVisible(document.getElementById('zero-list'), function () {
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
       03 · Evidence: observations light up the transcript lines they cite.
       Hover or focus previews; a click or tap pins it.
       --------------------------------------------------------------------- */

    function initEvidence() {
        const lines = document.getElementById('transcript-lines');
        const obs = Array.from(document.querySelectorAll('#observations .obs__item[data-obs]'));
        const toggle = document.getElementById('only-learner');
        if (!lines) return;
        const rows = Array.from(lines.querySelectorAll('li'));
        let pinned = null;

        function show(key) {
            lines.classList.toggle('has-link', !!key);
            rows.forEach(function (row) {
                const keys = (row.dataset.obs || '').split(' ');
                row.classList.toggle('is-linked', !!key && keys.indexOf(key) !== -1);
            });
        }

        obs.forEach(function (item) {
            const key = item.dataset.obs;
            item.setAttribute('role', 'button');
            item.setAttribute('aria-pressed', 'false');
            item.addEventListener('mouseenter', function () { if (!pinned) show(key); });
            item.addEventListener('mouseleave', function () { if (!pinned) show(null); });
            item.addEventListener('focus', function () { if (!pinned) show(key); });
            item.addEventListener('blur', function () { if (!pinned) show(null); });

            function togglePin() {
                pinned = pinned === key ? null : key;
                obs.forEach(function (o) {
                    const on = o.dataset.obs === pinned;
                    o.classList.toggle('is-active', on);
                    o.setAttribute('aria-pressed', String(on));
                });
                show(pinned);
            }

            item.addEventListener('click', togglePin);
            item.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePin(); }
                if (e.key === 'Escape' && pinned) { togglePin(); }
            });
        });

        if (toggle) {
            toggle.addEventListener('change', function () {
                lines.classList.toggle('only-learner', toggle.checked);
            });
        }
    }

    /* ---------------------------------------------------------------------
       04 · Learner app tabs (ARIA tabs pattern, panels swapped inside a
       view transition)
       --------------------------------------------------------------------- */

    function initTabs(container) {
        if (!container) return;
        const tabs = Array.from(container.querySelectorAll('[role="tab"]'));

        function select(tab, focus) {
            withTransition(function () {
                tabs.forEach(function (t) {
                    const on = t === tab;
                    t.setAttribute('aria-selected', String(on));
                    t.tabIndex = on ? 0 : -1;
                    const panel = document.getElementById(t.getAttribute('aria-controls'));
                    if (panel) panel.hidden = !on;
                });
            });
            if (focus) tab.focus();
        }

        tabs.forEach(function (tab, i) {
            tab.addEventListener('click', function () { select(tab, false); });
            tab.addEventListener('keydown', function (e) {
                let next = null;
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = tabs[(i + 1) % tabs.length];
                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = tabs[(i - 1 + tabs.length) % tabs.length];
                if (e.key === 'Home') next = tabs[0];
                if (e.key === 'End') next = tabs[tabs.length - 1];
                if (next) { e.preventDefault(); select(next, true); }
            });
        });
    }

    /* ---------------------------------------------------------------------
       04 · Evidence chart: one row per objective, one column per week.
       Squares are measured exercise results, diamonds are observations
       inferred from calls. Shape carries the distinction as well as colour.
       --------------------------------------------------------------------- */

    const CHART = {
        weeks: ['sett. 1', 'sett. 2', 'sett. 3', 'sett. 4', 'sett. 5', 'sett. 6'],
        rows: [
            {
                name: 'Chiedere chiarimenti',
                state: 'Dimostrato a distanza di tempo',
                marks: [
                    { w: 0, k: 'ok', tip: 'Esercizio corretto' },
                    { w: 1, k: 'ok', tip: 'Esercizio corretto' },
                    { w: 1, k: 'miss', tip: 'Esercizio sbagliato' },
                    { w: 2, k: 'ok', tip: 'Esercizio corretto' },
                    { w: 4, k: 'inf', tip: 'Dalla call: usato bene, riga 12' },
                    { w: 5, k: 'ok', tip: 'Ripasso a distanza, contesto nuovo: corretto' }
                ]
            },
            {
                name: 'Past simple, eventi conclusi',
                state: 'In esercizio · ripasso tra 7 giorni',
                marks: [
                    { w: 2, k: 'inf', tip: 'Dalla call: un caso, certezza bassa' },
                    { w: 4, k: 'inf', tip: 'Dalla call: due casi, certezza media' },
                    { w: 4, k: 'miss', tip: 'Esercizio sbagliato' },
                    { w: 4, k: 'ok', tip: 'Esercizio corretto' },
                    { w: 5, k: 'ok', tip: 'Esercizio corretto' },
                    { w: 5, k: 'ok', tip: 'Esercizio corretto' }
                ]
            },
            {
                name: 'suggest + -ing',
                state: 'Da confermare · un solo caso',
                marks: [
                    { w: 4, k: 'inf', tip: 'Dalla call: un caso, certezza bassa' }
                ]
            }
        ]
    };

    const SVG_NS = 'http://www.w3.org/2000/svg';

    function svgEl(name, attrs, parent) {
        const el = document.createElementNS(SVG_NS, name);
        Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
        if (parent) parent.appendChild(el);
        return el;
    }

    function initChart() {
        const svg = document.getElementById('evchart-svg');
        const tip = document.getElementById('evchart-tip');
        const tbody = document.getElementById('evchart-tbody');
        if (!svg) return;
        const plot = svg.parentElement;
        const desc = svg.querySelector('desc');
        let layout = '';

        function draw() {
            const width = plot.clientWidth;
            if (!width) return;
            const mode = width < 520 ? 'narrow' : 'wide';
            if (mode === layout) return;
            layout = mode;

            Array.from(svg.childNodes).forEach(function (n) { if (n !== desc) svg.removeChild(n); });

            const narrow = mode === 'narrow';
            const VW = narrow ? 300 : 640;
            const left = narrow ? 4 : 200;
            const right = VW - 10;
            const top = 26;
            const rowGap = narrow ? 92 : 64;
            const firstRow = narrow ? 82 : 62;
            const VH = firstRow + rowGap * (CHART.rows.length - 1) + (narrow ? 24 : 30);
            const colW = (right - left) / CHART.weeks.length;
            svg.setAttribute('viewBox', '0 0 ' + VW + ' ' + VH);

            // Week columns
            CHART.weeks.forEach(function (label, i) {
                const x = left + colW * (i + 0.5);
                svgEl('line', { x1: left + colW * i, x2: left + colW * i, y1: top - 8, y2: VH - 6, class: 'grid-line' }, svg);
                const t = svgEl('text', { x: x, y: top - 12, 'text-anchor': 'middle', class: 'axis-text' }, svg);
                t.textContent = narrow ? 's' + (i + 1) : label;
            });
            svgEl('line', { x1: right, x2: right, y1: top - 8, y2: VH - 6, class: 'grid-line' }, svg);

            CHART.rows.forEach(function (row, r) {
                const y = firstRow + rowGap * r;
                svgEl('line', { x1: left, x2: right, y1: y, y2: y, class: 'row-line' }, svg);

                const name = svgEl('text', { x: narrow ? left : 0, y: narrow ? y - 30 : y - 3, class: 'row-text' }, svg);
                name.textContent = row.name;
                const state = svgEl('text', { x: narrow ? left : 0, y: narrow ? y - 16 : y + 13, class: 'state-text' }, svg);
                state.textContent = row.state;

                // Spread marks that share a week around the column centre.
                const perWeek = {};
                row.marks.forEach(function (m) { (perWeek[m.w] = perWeek[m.w] || []).push(m); });

                Object.keys(perWeek).forEach(function (w) {
                    const group = perWeek[w];
                    const step = narrow ? 13 : 17;
                    group.forEach(function (m, j) {
                        const cx = left + colW * (Number(w) + 0.5) + (j - (group.length - 1) / 2) * step;
                        const g = svgEl('g', { class: 'mk', tabindex: '0', role: 'img' }, svg);
                        g.setAttribute('aria-label', row.name + ', ' + CHART.weeks[m.w] + ': ' + m.tip);
                        svgEl('rect', { x: cx - 11, y: y - 11, width: 22, height: 22, class: 'hit' }, g);
                        if (m.k === 'inf') {
                            svgEl('path', { d: 'M' + cx + ' ' + (y - 8) + ' L' + (cx + 8) + ' ' + y + ' L' + cx + ' ' + (y + 8) + ' L' + (cx - 8) + ' ' + y + 'Z', class: 'mk-inferred' }, g);
                        } else {
                            svgEl('rect', {
                                x: cx - 6, y: y - 6, width: 12, height: 12, rx: 2.5,
                                class: m.k === 'ok' ? 'mk-measured' : 'mk-measured-miss'
                            }, g);
                        }
                        g.dataset.tip = m.tip;
                        g.dataset.head = row.name + ' · ' + CHART.weeks[m.w];
                    });
                });
            });

            if (!prefersReducedMotion && svg.animate) {
                Array.from(svg.querySelectorAll('.mk')).forEach(function (g, i) {
                    g.animate([{ opacity: 0, transform: 'scale(0.2)' }, { opacity: 1, transform: 'scale(1)' }],
                        { duration: 520, delay: 200 + i * 45, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'backwards' });
                });
            }
        }

        function showTip(g) {
            if (!tip) return;
            const pr = plot.getBoundingClientRect();
            const gr = g.getBoundingClientRect();
            tip.innerHTML = '';
            const head = document.createElement('b');
            head.textContent = g.dataset.head;
            tip.appendChild(head);
            tip.appendChild(document.createTextNode(g.dataset.tip));
            tip.hidden = false;
            const x = Math.min(Math.max(gr.left + gr.width / 2 - pr.left, 90), pr.width - 90);
            tip.style.left = x + 'px';
            tip.style.top = (gr.top - pr.top) + 'px';
        }

        function hideTip() {
            if (tip) tip.hidden = true;
        }

        svg.addEventListener('pointerover', function (e) {
            const g = e.target.closest('.mk');
            if (g) showTip(g);
        });
        svg.addEventListener('pointerout', function (e) {
            if (e.target.closest('.mk')) hideTip();
        });
        svg.addEventListener('focusin', function (e) {
            const g = e.target.closest('.mk');
            if (g) showTip(g);
        });
        svg.addEventListener('focusout', hideTip);

        if (tbody) {
            CHART.rows.forEach(function (row) {
                const tr = document.createElement('tr');
                const count = function (k) { return row.marks.filter(function (m) { return m.k === k; }).length; };
                [row.name, count('ok'), count('miss'), count('inf'), row.state].forEach(function (v, i) {
                    const cell = document.createElement(i === 0 ? 'th' : 'td');
                    if (i === 0) cell.scope = 'row';
                    cell.textContent = v;
                    tr.appendChild(cell);
                });
                tbody.appendChild(tr);
            });
        }

        // Draw once the chart is actually laid out: it may start in a
        // hidden tab panel, and the layout depends on its width.
        if ('ResizeObserver' in window) {
            new ResizeObserver(draw).observe(plot);
        } else {
            window.addEventListener('resize', draw);
        }
        draw();
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
        initJourney();
        initZero();
        initEvidence();
        initTabs(document.querySelector('.app__nav'));
        initChart();
        initYear();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
