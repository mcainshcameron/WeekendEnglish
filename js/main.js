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
            title: 'Imposter syndrome',
            body: 'Non è un problema di inglese, è un problema di <strong>fiducia</strong>. Sai le regole, ma la paura di sbagliare ti blocca proprio nel momento in cui dovresti prendere la parola.',
            remedyTitle: 'Il rimedio',
            remedy: 'Simulazioni high-stakes in ambiente protetto. Ti abituiamo alla pressione finché non diventa noia.',
            cta: 'Prenota la simulazione',
            subject: 'Richiesta Coaching: Superare l\'Ansia',
            mailBody: 'Ciao Cameron,\n\nHo fatto il test sul sito e il mio problema principale è l\'ansia da prestazione. Vorrei sapere come possiamo lavorarci.\n\nGrazie.'
        },
        vocab: {
            label: 'Diagnosi B',
            title: 'Passive vocabulary gap',
            body: 'Conosci migliaia di parole — le leggi senza sforzo — ma ne usi solo un paio di centinaia quando parli. Il tuo <strong>vocabolario attivo</strong> è arrugginito.',
            remedyTitle: 'Il rimedio',
            remedy: 'Esercizi di active recall immediato. Ti forziamo a usare sinonimi professionali finché non diventano automatici.',
            cta: 'Sblocca il vocabolario',
            subject: 'Richiesta Coaching: Migliorare il Vocabolario',
            mailBody: 'Ciao Cameron,\n\nHo fatto il test e vorrei trasformare il mio vocabolario passivo in attivo. Parliamone.\n\nGrazie.'
        },
        speed: {
            label: 'Diagnosi C',
            title: 'The translation trap',
            body: 'Pensi in italiano e traduci in inglese. È questo a creare il <strong>ritardo di due secondi</strong> che uccide la tua naturalezza e ti fa sembrare meno sicuro di quanto sei.',
            remedyTitle: 'Il rimedio',
            remedy: 'Training per pensare direttamente in inglese. Eliminiamo il passaggio intermedio: parli alla velocità del pensiero.',
            cta: 'Velocizza il pensiero',
            subject: 'Richiesta Coaching: Fluency Training',
            mailBody: 'Ciao Cameron,\n\nIl mio blocco principale è la traduzione mentale. Voglio imparare a pensare in inglese.\n\nAttendo info.'
        }
    };

    const BASE_MAILTO = {
        subject: 'Richiesta Audit Weekend English',
        body: 'Ciao Cameron,\n\nVorrei candidarmi per un audit del mio inglese professionale.\n\nIl mio ruolo è: ...\n\nGrazie!'
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
