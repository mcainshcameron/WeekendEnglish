/**
 * WeekendEnglish.it
 * No cookies, no analytics, no network calls. Everything below runs locally.
 */

(function () {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------------------------------------------------------------------
       Diagnosi widget
       --------------------------------------------------------------------- */

    const DIAGNOSES = {
        anxiety: {
            label: 'Diagnosi A',
            title: 'Ti blocca la paura di sbagliare',
            body: 'Le regole le sai. Quello che si inceppa è il momento in cui devi prendere la parola davanti a colleghi che ti stanno valutando.',
            remedyTitle: 'Il rimedio',
            remedy: 'Ripetiamo la situazione che temi finché smette di sembrarti un esame.',
            cta: 'Prova una sessione',
            subject: 'Weekend English: mi blocco quando devo parlare',
            mailBody: 'Ciao Cameron,\n\nHo fatto il test sul sito. Mi blocco nel momento in cui devo prendere la parola.\n\nIl mio ruolo è: ...\nQuello che devo affrontare a breve è: ...\n\nGrazie.'
        },
        vocab: {
            label: 'Diagnosi B',
            title: 'Vocabolario passivo',
            body: 'Leggendo capisci tutto. Parlando torni sempre sulle stesse parole, perché sono le uniche che ti arrivano in tempo.',
            remedyTitle: 'Il rimedio',
            remedy: 'Ti fermo quando ripieghi sulla parola facile e ti faccio cercare quella precisa, finché non arriva da sola.',
            cta: 'Prova una sessione',
            subject: 'Weekend English: uso sempre le stesse parole',
            mailBody: 'Ciao Cameron,\n\nHo fatto il test sul sito. Capisco molto più di quello che riesco a usare quando parlo.\n\nIl mio ruolo è: ...\nQuello che devo affrontare a breve è: ...\n\nGrazie.'
        },
        speed: {
            label: 'Diagnosi C',
            title: 'Traduci invece di parlare',
            body: 'Componi la frase in italiano e poi la traduci. Il ritardo si sente, e chi ascolta lo legge come insicurezza.',
            remedyTitle: 'Il rimedio',
            remedy: 'Lavoriamo sulle formule pronte per le situazioni che ripeti ogni settimana, così parti già in inglese.',
            cta: 'Prova una sessione',
            subject: 'Weekend English: traduco mentre parlo',
            mailBody: 'Ciao Cameron,\n\nHo fatto il test sul sito. Traduco dall\'italiano mentre parlo e questo mi rallenta.\n\nIl mio ruolo è: ...\nQuello che devo affrontare a breve è: ...\n\nGrazie.'
        }
    };

    const BASE_MAILTO = {
        subject: 'Weekend English: prima chiamata',
        body: 'Ciao Cameron,\n\nVorrei fare una prima chiamata.\n\nIl mio ruolo è: ...\nQuello che devo affrontare a breve è: ...\n\nGrazie.'
    };

    function mailtoHref(subject, body) {
        return 'mailto:info@weekendenglish.it?subject=' +
            encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    }

    function initDiagnosis() {
        const options = Array.from(document.querySelectorAll('.audit__option'));
        const panel = document.getElementById('audit-result');
        if (!options.length || !panel) return;

        options.forEach(function (option) {
            option.addEventListener('click', function () {
                const key = option.dataset.audit;
                const data = DIAGNOSES[key];
                if (!data) return;

                options.forEach(function (other) {
                    other.setAttribute('aria-pressed', String(other === option));
                });

                panel.innerHTML =
                    '<p class="meta">' + data.label + '</p>' +
                    '<h3>' + data.title + '</h3>' +
                    '<p>' + data.body + '</p>' +
                    '<div class="audit__remedy">' +
                        '<div>' +
                            '<p class="meta">' + data.remedyTitle + '</p>' +
                            '<p>' + data.remedy + '</p>' +
                        '</div>' +
                        '<a class="btn" href="' + mailtoHref(data.subject, data.mailBody) + '">' +
                            data.cta +
                        '</a>' +
                    '</div>';

                panel.hidden = false;

                // Carry the diagnosis into the main application email, so the
                // message Cameron receives already says what to work on.
                const applyCta = document.getElementById('apply-cta');
                if (applyCta) {
                    applyCta.href = mailtoHref(data.subject, data.mailBody);
                }
            });
        });
    }

    /* ---------------------------------------------------------------------
       Scroll-driven chrome: masthead rule, mobile action bar, reveals
       --------------------------------------------------------------------- */

    function initScrollChrome() {
        const masthead = document.getElementById('masthead');
        const actionBar = document.getElementById('action-bar');
        let ticking = false;

        function update() {
            const y = window.scrollY;
            if (masthead) masthead.classList.toggle('is-stuck', y > 8);
            if (actionBar) actionBar.classList.toggle('is-visible', y > window.innerHeight * 0.6);
            ticking = false;
        }

        window.addEventListener('scroll', function () {
            if (!ticking) {
                ticking = true;
                window.requestAnimationFrame(update);
            }
        }, { passive: true });

        update();
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

        // Safety net. The reveal styles hide content until the observer runs,
        // and a browser suspends its rendering lifecycle (rAF, scroll events,
        // IntersectionObserver delivery) while the page is hidden — so a page
        // opened in a background tab can finish loading with nothing revealed.
        // Once everything else has loaded, reveal anything already on screen
        // rather than trusting the observer to have fired.
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
       Housekeeping
       --------------------------------------------------------------------- */

    function initYear() {
        const el = document.getElementById('current-year');
        if (!el) return;
        const year = String(new Date().getFullYear());
        el.textContent = year;
        el.setAttribute('datetime', year);
    }

    function initBaseMailto() {
        // Built here rather than hand-encoded in the markup, so the copy above
        // stays readable and the encoding can't drift.
        const applyCta = document.getElementById('apply-cta');
        if (applyCta) applyCta.href = mailtoHref(BASE_MAILTO.subject, BASE_MAILTO.body);
    }

    function init() {
        initBaseMailto();
        initDiagnosis();
        initScrollChrome();
        initReveals();
        initYear();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
