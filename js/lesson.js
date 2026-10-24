/**
 * WeekendEnglish.it — exercise demo
 *
 * Four exercises generated from a sample lesson. Each tab names the lines of
 * the transcript it came from, and selecting it lights those lines up, so
 * the reader can see the exercise being born from the conversation.
 * Answers are checked in the browser; nothing is stored or sent.
 */

(function () {
    'use strict';

    const lesson = document.getElementById('lesson');
    if (!lesson) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
    const TOTAL = 4;
    const done = new Set();

    const tabs = Array.from(lesson.querySelectorAll('[role="tab"]'));
    const lines = Array.from(document.querySelectorAll('#transcript-lines li'));
    const bar = document.getElementById('lesson-bar');
    const score = document.getElementById('lesson-score');
    const toastEl = document.getElementById('lesson-toast');

    /* ---------------------------------------------------------------------
       Tabs, linked to the transcript lines each exercise came from
       --------------------------------------------------------------------- */

    function linkLines(src) {
        lines.forEach(function (li) {
            const keys = (li.dataset.src || '').split(' ');
            li.classList.toggle('is-linked', keys.indexOf(src) !== -1);
        });
        const wrap = lines.length ? lines[0].parentElement : null;
        if (wrap) wrap.classList.toggle('has-link', !!src);
    }

    function select(index, focus) {
        tabs.forEach(function (t, i) {
            const on = i === index;
            t.setAttribute('aria-selected', String(on));
            t.tabIndex = on ? 0 : -1;
            const panel = document.getElementById(t.getAttribute('aria-controls'));
            if (panel) panel.hidden = !on;
        });
        linkLines(tabs[index].dataset.src);
        if (focus) tabs[index].focus();
    }

    tabs.forEach(function (tab, i) {
        tab.addEventListener('click', function () { select(i, false); });
        tab.addEventListener('keydown', function (e) {
            let next = -1;
            if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
            if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
            if (e.key === 'Home') next = 0;
            if (e.key === 'End') next = tabs.length - 1;
            if (next >= 0) { e.preventDefault(); select(next, true); }
        });
    });

    const nextBtn = lesson.querySelector('[data-lx-next]');
    if (nextBtn) nextBtn.addEventListener('click', function () { select(1, true); });

    // Light up the first exercise's lines once the demo is on screen, so the
    // link between lesson and exercise is visible before anyone clicks.
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(function (entries) {
            if (!entries[0].isIntersecting) return;
            io.disconnect();
            const current = tabs.find(function (t) { return t.getAttribute('aria-selected') === 'true'; });
            if (current) linkLines(current.dataset.src);
        }, { threshold: 0.4 });
        io.observe(lesson);
    } else {
        linkLines(tabs[0].dataset.src);
    }

    /* ---------------------------------------------------------------------
       Shared helpers
       --------------------------------------------------------------------- */

    let toastTimer = 0;
    function toast(text) {
        if (!toastEl) return;
        toastEl.textContent = text;
        toastEl.classList.add('is-on');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 3200);
    }

    function feedback(key, kind, title, text) {
        const el = lesson.querySelector('[data-feedback="' + key + '"]');
        if (!el) return;
        el.className = 'feedback is-' + kind;
        el.textContent = '';
        const b = document.createElement('b');
        b.textContent = title;
        el.appendChild(b);
        el.appendChild(document.createTextNode(text));
    }

    function clearFeedback(key) {
        const el = lesson.querySelector('[data-feedback="' + key + '"]');
        if (el) { el.className = 'feedback'; el.textContent = ''; }
    }

    function complete(index) {
        if (done.has(index)) return;
        done.add(index);
        tabs[index].classList.add('is-done');
        if (bar) bar.style.setProperty('--done', String(done.size / TOTAL));
        if (score) score.textContent = done.size + ' di ' + TOTAL + ' esercizi completati';
        if (done.size === TOTAL) {
            toast('Fatto. La prossima lezione riparte da qui.');
        }
    }

    function clearShake(el, cls) {
        el.addEventListener('animationend', function handler() {
            el.classList.remove(cls);
            el.removeEventListener('animationend', handler);
        });
    }

    /* ---------------------------------------------------------------------
       Gap fill
       --------------------------------------------------------------------- */

    const GAP_WRONG = {
        'has sent': ['Non ancora. ', '«has sent» è present perfect, che non va con un momento preciso come «last Tuesday». Riprova.'],
        'have sent': ['Non ancora. ', '«have sent» è present perfect, e in più non concorda con «the supplier». Riprova.']
    };

    const gapGroup = lesson.querySelector('.choices[data-ex="gap"]');
    if (gapGroup) {
        const buttons = Array.from(gapGroup.querySelectorAll('.choice'));
        let attempts = 0;
        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                attempts++;
                if (btn.dataset.value === 'sent') {
                    btn.classList.add('is-right');
                    buttons.forEach(function (b) { b.disabled = true; });
                    const slot = document.getElementById('gap-slot');
                    if (slot) { slot.textContent = 'sent'; slot.classList.add('is-filled'); }
                    feedback('gap', 'right', 'Giusto. ', '«Last Tuesday» indica un momento concluso, quindi serve il past simple: sent.' + (attempts > 1 ? ' Tentativi: ' + attempts + '.' : ''));
                    complete(1);
                } else {
                    btn.classList.add('is-wrong');
                    btn.disabled = true;
                    const msg = GAP_WRONG[btn.dataset.value];
                    feedback('gap', 'wrong', msg[0], msg[1]);
                }
            });
        });
    }

    /* ---------------------------------------------------------------------
       Sentence ordering, with FLIP so tokens glide between bank and answer
       --------------------------------------------------------------------- */

    const answer = document.getElementById('order-answer');
    const bank = document.getElementById('order-bank');
    const TARGET = 'I suggest waiting until March.';

    function flipMove(token, destination) {
        const first = token.getBoundingClientRect();
        destination.appendChild(token);
        if (reduce || !token.animate) return;
        const last = token.getBoundingClientRect();
        token.animate([
            { transform: 'translate(' + (first.left - last.left) + 'px,' + (first.top - last.top) + 'px)' },
            { transform: 'none' }
        ], { duration: 420, easing: SPRING });
    }

    if (answer && bank) {
        const tokens = Array.from(bank.querySelectorAll('.token'));
        let solved = false;

        tokens.forEach(function (token) {
            token.addEventListener('click', function () {
                if (solved) return;
                flipMove(token, token.parentElement === bank ? answer : bank);
                answer.classList.remove('is-wrong');
            });
        });

        document.getElementById('order-check').addEventListener('click', function () {
            if (solved) return;
            const words = Array.from(answer.querySelectorAll('.token')).map(function (t) { return t.dataset.word; });
            if (words.length < tokens.length) {
                feedback('order', 'hint', 'Manca qualcosa. ', 'Usa tutte e cinque le parole.');
                return;
            }
            if (words.join(' ') === TARGET) {
                solved = true;
                answer.classList.add('is-right');
                feedback('order', 'right', 'Giusto. ', 'Dopo suggest il verbo va in -ing: «I suggest waiting». È la correzione che l\'insegnante ti aveva dato a voce.');
                complete(2);
            } else {
                answer.classList.add('is-wrong');
                clearShake(answer, 'is-wrong');
                feedback('order', 'wrong', 'Non ancora. ', 'L\'ordine è soggetto, verbo, verbo in -ing, poi il resto.');
            }
        });

        document.getElementById('order-reset').addEventListener('click', function () {
            if (solved) return;
            tokens.forEach(function (t) { bank.appendChild(t); });
            answer.classList.remove('is-wrong');
            clearFeedback('order');
        });
    }

    /* ---------------------------------------------------------------------
       Error correction
       --------------------------------------------------------------------- */

    const fixme = document.getElementById('fixme');
    if (fixme) {
        const parts = Array.from(fixme.querySelectorAll('.fixme__part'));
        parts.forEach(function (part) {
            part.addEventListener('click', function () {
                if (fixme.dataset.solved) return;
                if (part.hasAttribute('data-wrong')) {
                    fixme.dataset.solved = 'true';
                    part.classList.add('is-found');
                    const fix = document.createElement('span');
                    fix.className = 'fixme__fix';
                    fix.textContent = 'had';
                    part.after(fix);
                    parts.forEach(function (p) { p.disabled = true; });
                    feedback('fix', 'right', 'Trovato. ', '«Yesterday» chiude l\'azione nel passato: «we had a long call». È lo stesso errore della riga 6.');
                    complete(3);
                } else {
                    part.classList.add('is-wrong');
                    clearShake(part, 'is-wrong');
                    feedback('fix', 'hint', 'Questa parte va bene. ', 'Guarda il verbo: con «yesterday», quale forma serve?');
                }
            });
        });
    }

    /* ---------------------------------------------------------------------
       Short written response. The answer rule accepts several correct
       structures, flags the targeted error (suggest + to) and treats
       anything else as "not recognised" rather than "wrong".
       --------------------------------------------------------------------- */

    const writeInput = document.getElementById('write-input');
    const KEY = /\b(suggest|suggests|suggested|recommend|recommends|recommended)\b/i;
    const TO_INF = /\b(suggest|recommend)(s|ed)?\s+to\s+[a-z]+/i;
    const GOOD = [
        /\b(suggest|recommend)(s|ed)?\s+(that\s+)?(we|you|they|everyone|everybody|the group|us)\s+[a-z]+/i,
        /\b(suggest|recommend)(s|ed)?\s+[a-z]+ing\b/i
    ];

    function checkWriting() {
        const text = writeInput.value.trim();
        if (!text) {
            feedback('write', 'hint', 'Scrivi una frase. ', 'Basta una riga.');
            return;
        }
        if (!KEY.test(text)) {
            feedback('write', 'hint', 'Manca il verbo chiave. ', 'Usa suggest: è quello su cui stai lavorando.');
            return;
        }
        if (TO_INF.test(text)) {
            feedback('write', 'wrong', 'Quasi. ', 'Dopo suggest non va «to» più verbo. Prova con «I suggest leaving at 8» oppure «I suggest (that) we leave at 8».');
            return;
        }
        if (GOOD.some(function (re) { return re.test(text); })) {
            const time = /\b(8|eight)\b/i.test(text) ? '' : ' Potresti aggiungere l\'orario: «at 8».';
            feedback('write', 'right', 'Va bene. ', '«' + text + '» è corretta. Vale anche «I\'d suggest we leave at 8»: le risposte giuste sono più di una.' + time);
            complete(4);
            return;
        }
        feedback('write', 'hint', 'Struttura non riconosciuta. ', 'Le forme più comuni sono «I suggest + -ing» e «I suggest (that) we + verbo».');
    }

    if (writeInput) {
        document.getElementById('write-check').addEventListener('click', checkWriting);
        writeInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) checkWriting();
        });
        document.getElementById('write-sample').addEventListener('click', function () {
            writeInput.value = 'I suggest to leave at 8 because it is cold.';
            checkWriting();
            writeInput.focus();
        });
    }
})();
