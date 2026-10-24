/**
 * WeekendEnglish.it — exercise player
 *
 * A sample sequence generated from the demo call, with the seven initial
 * exercise types from the spec. Answers are checked in the browser with the
 * same kind of answer rules a lesson template would carry, including
 * legitimate alternatives for the written response. Nothing is stored.
 */

(function () {
    'use strict';

    const lesson = document.getElementById('lesson');
    if (!lesson) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
    const TOTAL = 7;
    const done = new Set();

    const tabs = Array.from(lesson.querySelectorAll('[role="tab"]'));
    const bar = document.getElementById('lesson-bar');
    const score = document.getElementById('lesson-score');
    const toastEl = document.getElementById('lesson-toast');

    /* ---------------------------------------------------------------------
       Tabs
       --------------------------------------------------------------------- */

    function select(index, focus) {
        tabs.forEach(function (t, i) {
            const on = i === index;
            t.setAttribute('aria-selected', String(on));
            t.tabIndex = on ? 0 : -1;
            const panel = document.getElementById(t.getAttribute('aria-controls'));
            if (panel) panel.hidden = !on;
        });
        if (focus) tabs[index].focus();
        tabs[index].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
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

    function complete(index) {
        if (done.has(index)) return;
        done.add(index);
        tabs[index].classList.add('is-done');
        if (bar) bar.style.setProperty('--done', String(done.size / TOTAL));
        if (score) score.textContent = done.size + ' di ' + TOTAL + ' esercizi completati';
        if (done.size === TOTAL) {
            toast('Sequenza completata. Il prossimo ripasso arriva tra qualche giorno.');
        }
    }

    function clearShake(el, cls) {
        el.addEventListener('animationend', function handler() {
            el.classList.remove(cls);
            el.removeEventListener('animationend', handler);
        });
    }

    /* ---------------------------------------------------------------------
       Multiple choice (gap fill, reading, listening)
       --------------------------------------------------------------------- */

    const CHOICE = {
        gap: {
            index: 1,
            right: 'sent',
            ok: ['Giusto. ', '«Last Tuesday» indica un momento concluso, quindi serve il past simple: sent.'],
            wrong: {
                'has sent': ['Non ancora. ', '«has sent» è present perfect, che non va con un momento preciso come «last Tuesday». Riprova.'],
                'have sent': ['Non ancora. ', '«have sent» è present perfect, e in più non concorda con «the supplier». Riprova.']
            },
            onRight: function () {
                const slot = document.getElementById('gap-slot');
                if (slot) {
                    slot.textContent = 'sent';
                    slot.classList.add('is-filled');
                }
            }
        },
        read: {
            index: 6,
            right: 'confirm',
            ok: ['Giusto. ', '«…if you confirm the order by 15 November». Il 31 marzo è fino a quando vale il prezzo, non la scadenza per confermare.'],
            wrong: {
                sign: ['Non ancora. ', 'Il 31 marzo è fino a quando vale il prezzo. Rileggi la condizione dopo «if».'],
                delivery: ['Non ancora. ', 'La consegna resta uguale: «Delivery stays at ten working days».']
            }
        },
        listen: {
            index: 7,
            right: 'bridge',
            ok: ['Giusto. ', '«We\'ll meet at the bridge, not at the café».'],
            wrong: {
                cafe: ['Attenzione al «not». ', 'Il café è dove non si vedranno: «at the bridge, not at the café».'],
                station: ['Non ancora. ', 'La stazione non viene nominata. Riascolta la fine del messaggio.']
            }
        }
    };

    lesson.querySelectorAll('.choices[data-ex]').forEach(function (group) {
        const key = group.dataset.ex;
        const cfg = CHOICE[key];
        if (!cfg) return;
        const buttons = Array.from(group.querySelectorAll('.choice'));
        let attempts = 0;

        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                attempts++;
                const value = btn.dataset.value;
                if (value === cfg.right) {
                    btn.classList.add('is-right');
                    buttons.forEach(function (b) { b.disabled = true; });
                    const suffix = attempts > 1 ? ' Tentativi: ' + attempts + '.' : '';
                    feedback(key, 'right', cfg.ok[0], cfg.ok[1] + suffix);
                    if (cfg.onRight) cfg.onRight();
                    complete(cfg.index);
                } else {
                    btn.classList.add('is-wrong');
                    btn.disabled = true;
                    const msg = cfg.wrong[value];
                    feedback(key, 'wrong', msg[0], msg[1]);
                }
            });
        });
    });

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
                feedback('order', 'right', 'Giusto. ', 'Dopo suggest il verbo va in -ing: «I suggest waiting». Si può dire anche «I suggest (that) we wait».');
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
            const fb = lesson.querySelector('[data-feedback="order"]');
            if (fb) { fb.className = 'feedback'; fb.textContent = ''; }
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
                    feedback('fix', 'right', 'Trovato. ', '«Yesterday» chiude l\'azione nel passato: «we had a long call». È lo stesso errore delle righe 2 e 9 della call.');
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
       Meaning matching
       --------------------------------------------------------------------- */

    const match = document.getElementById('match');
    if (match) {
        const items = Array.from(match.querySelectorAll('.match__item'));
        const targets = Array.from(match.querySelectorAll('.match__target'));
        let picked = null;
        let pairs = 0;

        items.forEach(function (item) {
            item.addEventListener('click', function () {
                if (item.classList.contains('is-paired')) return;
                items.forEach(function (i) { i.classList.remove('is-picked'); });
                picked = item;
                item.classList.add('is-picked');
            });
        });

        targets.forEach(function (target) {
            target.addEventListener('click', function () {
                if (target.classList.contains('is-paired')) return;
                if (!picked) {
                    feedback('match', 'hint', 'Prima la frase. ', 'Tocca una frase a sinistra, poi la sua funzione.');
                    return;
                }
                if (picked.dataset.key === target.dataset.key) {
                    pairs++;
                    [picked, target].forEach(function (el) {
                        el.classList.remove('is-picked');
                        el.classList.add('is-paired');
                        el.dataset.n = String(pairs);
                        el.disabled = true;
                    });
                    picked = null;
                    if (pairs === items.length) {
                        feedback('match', 'right', 'Tutte giuste. ', 'Il chiarimento appartiene al filone «chiarire il significato»; la preferenza motivata e la proposta finale al filone «arrivare a una decisione».');
                        complete(4);
                    } else {
                        const fb = lesson.querySelector('[data-feedback="match"]');
                        if (fb) { fb.className = 'feedback'; fb.textContent = ''; }
                    }
                } else {
                    target.classList.add('is-wrong');
                    clearShake(target, 'is-wrong');
                    feedback('match', 'wrong', 'Non questa. ', 'Chiediti cosa vuole ottenere chi parla con quella frase.');
                }
            });
        });
    }

    /* ---------------------------------------------------------------------
       Short written response. The answer rule accepts several correct
       structures, flags the targeted error (suggest/recommend + to) and
       treats anything else as "not recognised" rather than "wrong".
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
            feedback('write', 'hint', 'Manca il verbo chiave. ', 'Usa suggest o recommend: è l\'obiettivo che questo esercizio verifica.');
            return;
        }
        if (TO_INF.test(text)) {
            feedback('write', 'wrong', 'Quasi. ', 'Dopo suggest e recommend non va «to» più verbo. Prova con «I suggest leaving at 8» oppure «I suggest (that) we leave at 8».');
            return;
        }
        if (GOOD.some(function (re) { return re.test(text); })) {
            const time = /\b(8|eight)\b/i.test(text) ? '' : ' Potresti aggiungere l\'orario: «at 8».';
            feedback('write', 'right', 'Va bene. ', '«' + text + '» è corretta. Valgono anche «I\'d suggest we leave at 8» o «I recommend leaving later»: le risposte giuste sono più di una.' + time);
            complete(5);
            return;
        }
        feedback('write', 'hint', 'Struttura non riconosciuta. ', 'Le forme più comuni sono «I suggest + -ing» e «I suggest (that) we + verbo». Se pensi che la tua frase sia giusta, usa «Segnala un errore».');
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

    /* ---------------------------------------------------------------------
       Listening, read aloud by the browser's own speech synthesis. No audio
       file and no network request; if the browser has no voice, the
       transcript opens instead.
       --------------------------------------------------------------------- */

    const play = document.getElementById('listen-play');
    const text = document.getElementById('listen-text');
    const note = document.getElementById('listen-note');
    if (play && text) {
        const wrap = play.closest('.listen');
        const label = play.querySelector('span');
        const synth = window.speechSynthesis;

        if (!synth || typeof window.SpeechSynthesisUtterance !== 'function') {
            play.disabled = true;
            if (note) note.textContent = 'Il tuo browser non ha una voce di sintesi: apri la trascrizione qui sotto.';
            const details = text.closest('details');
            if (details) details.open = true;
        } else {
            function pickVoice() {
                const voices = synth.getVoices();
                return voices.find(function (v) { return /^en[-_]GB/i.test(v.lang); }) ||
                       voices.find(function (v) { return /^en/i.test(v.lang); }) || null;
            }

            function stop() {
                wrap.classList.remove('is-playing');
                label.textContent = 'Ascolta il messaggio vocale';
            }

            play.addEventListener('click', function () {
                if (synth.speaking) { synth.cancel(); stop(); return; }
                const u = new SpeechSynthesisUtterance(text.textContent);
                u.lang = 'en-GB';
                u.rate = 0.95;
                const voice = pickVoice();
                if (voice) u.voice = voice;
                u.onstart = function () {
                    wrap.classList.add('is-playing');
                    label.textContent = 'Ferma';
                };
                u.onend = stop;
                u.onerror = stop;
                synth.speak(u);
            });
        }
    }

    /* ---------------------------------------------------------------------
       Error report
       --------------------------------------------------------------------- */

    const report = document.getElementById('report-error');
    if (report) {
        report.addEventListener('click', function () {
            toast('Segnalazione registrata. In questa demo non viene inviato niente.');
        });
    }
})();
