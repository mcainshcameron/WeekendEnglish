/**
 * WeekendEnglish.it — post-call loop simulator
 *
 * Plays a scripted run of the background job for six scenarios: the normal
 * case and the five ways the spec says input can go wrong. Every scenario
 * ends with something useful for the learner and nothing for Cameron to do;
 * technical problems go to the maintenance log only.
 *
 * Times shown in the log are simulated (they start when the call ends) and
 * the playback is sped up. Nothing here talks to a server.
 */

(function () {
    'use strict';

    const root = document.getElementById('sim');
    if (!root) return;

    const STAGES = ['transcript', 'evidence', 'record', 'plan', 'generate', 'validate', 'publish'];
    const CALL_END = 19 * 3600 + 58 * 60 + 40;   // 19:58:40, simulated
    const STEP_MS = 560;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const LEARNER = {
        idle:     ['idle', 'Nessuna elaborazione', 'La bacheca mostra lo stato in modo semplice, senza dettagli tecnici.'],
        working:  ['working', 'In preparazione', 'La call è finita. La prossima sequenza è in preparazione.'],
        ready:    ['ready', 'Sequenza pronta', '3 obiettivi e 5 esercizi, costruiti sulla call di stasera.'],
        fallback: ['fallback', 'Ripasso pronto', 'Dalla call di stasera non sono arrivate prove affidabili. Intanto c\'è un ripasso dal tuo percorso, senza commenti inventati sulla call.']
    };

    /* ---------------------------------------------------------------------
       Scenario scripts. s = simulated seconds after the call ended.
       --------------------------------------------------------------------- */

    function opening() {
        return [
            { s: 0, ev: 'call.completed', msg: 'sessione s-2410 · Marta · 28 min', learner: 'working', stage: ['transcript', 'active'] }
        ];
    }

    function analysis(t0) {
        return [
            { s: t0, ev: 'job.start', msg: 'chiave s-2410/transcript · tentativo 1', stage: ['evidence', 'active'] },
            { s: t0 + 4, ev: 'evidence', msg: 'solo righe di Marta · 2 difficoltà · 2 punti di forza · 1 lettura esclusa', cls: 'ok', stage: ['evidence', 'done'] },
            { s: t0 + 5, ev: 'record.update', msg: 'osservazioni dedotte salvate separate dai risultati misurati', cls: 'ok', stage: ['record', 'done'] },
            { s: t0 + 7, ev: 'plan', msg: 'nuovo: past simple · ripasso: chiarimenti · verifica: suggest + -ing', cls: 'ok', stage: ['plan', 'done'] },
            { s: t0 + 8, ev: 'generate', msg: '5 esercizi da 3 modelli di lezione validati', stage: ['generate', 'active'] }
        ];
    }

    function finish(t0, ready, extra) {
        return [
            { s: t0, ev: 'publish', msg: 'versione L-2410-1 salvata · avviso inviato per email', cls: 'ok', stage: ['publish', 'done'], learner: 'ready' },
            { s: t0, ev: 'fine', msg: extra || ('da trascrizione a pubblicazione: ' + clock(t0 - ready, true) + ' · azioni di Cameron: 0'), cls: 'done' }
        ];
    }

    function validateOk(t0) {
        return [
            { s: t0, ev: 'generate', msg: 'esercizi pronti', cls: 'ok', stage: ['generate', 'done'] },
            { s: t0, ev: 'validate', msg: 'struttura, chiavi, livello, coerenza: ok', stage: ['validate', 'active'] },
            { s: t0 + 4, ev: 'validate', msg: '5/5 superati · secondo controllo separato: ok', cls: 'ok', stage: ['validate', 'done'] }
        ];
    }

    function fallback(t0, reason) {
        return [
            { s: t0, ev: 'fallback', msg: reason, cls: 'warn', fallback: 'active' },
            { s: t0 + 2, ev: 'fallback', msg: 'si continua dal curriculum: ripasso validato + prossimo obiettivo in programma', cls: 'ok', fallback: 'done' },
            { s: t0 + 3, ev: 'publish', msg: 'pubblicato senza riferimenti alla call · avviso inviato', cls: 'ok', stage: ['publish', 'done'], learner: 'fallback' },
            { s: t0 + 3, ev: 'fine', msg: 'nessun feedback inventato · azioni di Cameron: 0', cls: 'done' }
        ];
    }

    const SCENARIOS = {
        normal: function () {
            return opening().concat(
                [{ s: 146, ev: 'transcript.ready', msg: '28 min · 2 parlanti riconosciuti', cls: 'ok', stage: ['transcript', 'done'] }],
                analysis(147),
                validateOk(160),
                finish(165, 146)
            );
        },

        late: function () {
            return opening().concat(
                [
                    { s: 60, ev: 'transcript.wait', msg: 'non ancora disponibile · riprovo tra 2 min (1/6)', cls: 'warn', stage: ['transcript', 'warn'] },
                    { s: 180, ev: 'transcript.wait', msg: 'non ancora disponibile · riprovo tra 4 min (2/6)', cls: 'warn' },
                    { s: 420, ev: 'transcript.ready', msg: 'arrivata con 7 min di ritardo · 2 parlanti', cls: 'ok', stage: ['transcript', 'done'], maint: 'info · trascrizione in ritardo di 7 min, recuperata da sola' }
                ],
                analysis(421),
                validateOk(434),
                finish(439, 420)
            );
        },

        dup: function () {
            return opening().concat(
                [
                    { s: 146, ev: 'transcript.ready', msg: '28 min · 2 parlanti riconosciuti', cls: 'ok', stage: ['transcript', 'done'] },
                    { s: 146, ev: 'transcript.ready', msg: 'evento ripetuto · chiave già in lavorazione · ignorato', cls: 'warn', maint: 'evento duplicato scartato (s-2410)' }
                ],
                analysis(147),
                validateOk(160),
                finish(165, 146, 'assegnazioni create: 1 · azioni di Cameron: 0'),
                [{ s: 300, ev: 'transcript.ready', msg: 'evento ripetuto dopo la pubblicazione · nessuna sequenza duplicata', cls: 'warn', maint: 'secondo duplicato scartato (s-2410)' }]
            );
        },

        invalid: function () {
            return opening().concat(
                [{ s: 146, ev: 'transcript.ready', msg: '28 min · 2 parlanti riconosciuti', cls: 'ok', stage: ['transcript', 'done'] }],
                analysis(147),
                [
                    { s: 160, ev: 'generate', msg: 'esercizi pronti', cls: 'ok', stage: ['generate', 'done'] },
                    { s: 160, ev: 'validate', msg: 'controllo in corso', stage: ['validate', 'active'] },
                    { s: 163, ev: 'validate', msg: 'es. 3 «riordina»: due ordini corretti, la chiave ne prevede uno', cls: 'err', stage: ['validate', 'fail'] },
                    { s: 166, ev: 'generate', msg: 'es. 3 rigenerato · tentativo 2/3', stage: ['validate', 'active'] },
                    { s: 169, ev: 'validate', msg: 'es. 3 ancora ambiguo', cls: 'err', stage: ['validate', 'fail'] },
                    { s: 172, ev: 'generate', msg: 'es. 3 rigenerato · tentativo 3/3', stage: ['validate', 'active'] },
                    { s: 175, ev: 'validate', msg: 'fallito di nuovo · sostituito con l\'esercizio base già validato', cls: 'warn', maint: 'es. 3 sostituito con il modello base dopo 3 tentativi' },
                    { s: 177, ev: 'validate', msg: '5/5 pronti · secondo controllo separato: ok', cls: 'ok', stage: ['validate', 'done'] }
                ],
                finish(178, 146)
            );
        },

        speakers: function () {
            return opening().concat(
                [
                    { s: 146, ev: 'transcript.ready', msg: '2 voci rilevate · attribuzione incerta su 9 righe', cls: 'warn', stage: ['transcript', 'done'] },
                    { s: 147, ev: 'evidence', msg: 'non si può separare Cameron da Marta con certezza · nessuna prova estratta', cls: 'err', stage: ['evidence', 'fail'], maint: 'attribuzione dei parlanti incerta (s-2410)' },
                    { s: 147, ev: 'skip', msg: 'profilo, piano e generazione dalla call: saltati', skip: ['record', 'plan', 'generate', 'validate'] }
                ],
                fallback(149, 'le frasi di Cameron non devono mai essere attribuite a Marta')
            );
        },

        missing: function () {
            return opening().concat(
                [
                    { s: 120, ev: 'transcript.wait', msg: 'non disponibile · riprovo (1/6)', cls: 'warn', stage: ['transcript', 'warn'] },
                    { s: 900, ev: 'transcript.wait', msg: 'non disponibile · riprovo (4/6)', cls: 'warn' },
                    { s: 7200, ev: 'transcript.missing', msg: 'nessuna trascrizione dopo 6 tentativi', cls: 'err', stage: ['transcript', 'fail'], maint: 'trascrizione mancante (s-2410) · da controllare col fornitore' },
                    { s: 7200, ev: 'skip', msg: 'nessuna analisi della call', skip: ['evidence', 'record', 'plan', 'generate', 'validate'] }
                ],
                fallback(7201, 'niente call da analizzare, il percorso non si ferma')
            );
        }
    };

    /* ---------------------------------------------------------------------
       Rendering
       --------------------------------------------------------------------- */

    const log = document.getElementById('sim-log');
    const maint = document.getElementById('sim-maint');
    const learner = document.getElementById('sim-learner');
    const clockEl = document.getElementById('sim-clock');
    const fill = document.getElementById('pipeline-fill');
    const fallbackNode = document.getElementById('pipeline-fallback');
    const runBtn = document.getElementById('sim-run');
    const announce = document.getElementById('sim-announce');
    const nodes = {};
    root.querySelectorAll('[data-stage]').forEach(function (li) { nodes[li.dataset.stage] = li; });

    let timers = [];
    let runId = 0;

    function pad(n) { return String(n).padStart(2, '0'); }

    function clock(s, short) {
        if (short) {
            const m = Math.floor(s / 60);
            return m ? m + ' min ' + (s % 60) + ' s' : s + ' s';
        }
        const t = CALL_END + s;
        return pad(Math.floor(t / 3600) % 24) + ':' + pad(Math.floor(t / 60) % 60) + ':' + pad(t % 60);
    }

    function setLearner(key) {
        const v = LEARNER[key];
        learner.dataset.state = v[0];
        learner.querySelector('.sim__badge').textContent = v[1];
        learner.querySelector('p').textContent = v[2];
    }

    // The line only runs through an unbroken chain of finished stages, so a
    // fallback run never looks like it went through the skipped ones.
    function updateFill() {
        let last = -1;
        for (let i = 0; i < STAGES.length; i++) {
            if (nodes[STAGES[i]].dataset.state !== 'done') break;
            last = i;
        }
        fill.style.setProperty('--p', String(Math.max(0, last) / (STAGES.length - 1)));
    }

    function reset() {
        timers.forEach(clearTimeout);
        timers = [];
        STAGES.forEach(function (name) { delete nodes[name].dataset.state; });
        delete fallbackNode.dataset.state;
        fill.classList.remove('is-fallback');
        fill.style.setProperty('--p', '0');
        log.innerHTML = '';
        maint.innerHTML = '';
        clockEl.textContent = '--:--:--';
        setLearner('idle');
    }

    function addLine(step) {
        const li = document.createElement('li');
        if (step.cls) li.className = 'is-' + step.cls;
        [['t', clock(step.s)], ['ev', step.ev], ['msg', step.msg]].forEach(function (part) {
            const span = document.createElement('span');
            span.className = part[0];
            span.textContent = part[1];
            li.appendChild(span);
        });
        log.appendChild(li);
        log.scrollTop = log.scrollHeight;
    }

    function apply(step) {
        addLine(step);
        clockEl.textContent = clock(step.s);
        if (step.stage) nodes[step.stage[0]].dataset.state = step.stage[1];
        if (step.skip) step.skip.forEach(function (name) { nodes[name].dataset.state = 'skip'; });
        if (step.learner) setLearner(step.learner);
        if (step.fallback) {
            fallbackNode.dataset.state = step.fallback;
            fill.classList.add('is-fallback');
        }
        if (step.maint) {
            const li = document.createElement('li');
            li.textContent = clock(step.s) + '  ' + step.maint;
            maint.appendChild(li);
        }
        updateFill();
    }

    function run() {
        const checked = root.querySelector('input[name="scenario"]:checked');
        const script = SCENARIOS[checked ? checked.value : 'normal']();
        const id = ++runId;
        reset();
        runBtn.setAttribute('aria-busy', 'true');
        announce.textContent = '';

        function done() {
            if (id !== runId) return;
            runBtn.removeAttribute('aria-busy');
            if (!maint.children.length) {
                const li = document.createElement('li');
                li.className = 'is-empty';
                li.textContent = 'Vuoto';
                maint.appendChild(li);
            }
            const last = script[script.length - 1];
            announce.textContent = 'Simulazione finita. ' + learner.querySelector('.sim__badge').textContent + '. ' + last.msg + '.';
        }

        if (reduce) {
            script.forEach(apply);
            done();
            return;
        }

        script.forEach(function (step, i) {
            timers.push(setTimeout(function () {
                if (id !== runId) return;
                apply(step);
                if (i === script.length - 1) done();
            }, 250 + i * STEP_MS));
        });
    }

    runBtn.addEventListener('click', run);

    // Choosing a different scenario clears the previous run so the log never
    // mixes two stories.
    root.querySelectorAll('input[name="scenario"]').forEach(function (input) {
        input.addEventListener('change', function () {
            runId++;
            reset();
            runBtn.removeAttribute('aria-busy');
            const idle = document.createElement('li');
            idle.className = 'is-idle';
            idle.textContent = 'Scenario pronto. Premi «Avvia la simulazione».';
            log.appendChild(idle);
            const empty = document.createElement('li');
            empty.className = 'is-empty';
            empty.textContent = 'Vuoto';
            maint.appendChild(empty);
        });
    });

    // Run the normal scenario once, the first time the simulator is seen, so
    // the section never sits there looking empty.
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(function (entries) {
            if (!entries[0].isIntersecting) return;
            io.disconnect();
            if (!log.querySelector('li:not(.is-idle)')) run();
        }, { threshold: 0.35 });
        io.observe(root);
    }
})();
