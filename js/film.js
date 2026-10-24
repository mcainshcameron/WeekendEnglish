/**
 * WeekendEnglish.it — the hero film
 *
 * Motion in code: the whole 16-second explainer is one function, seek(t),
 * that turns a time in seconds into the exact state of every element on the
 * stage. Nothing is tweened against the clock and nothing remembers the
 * previous frame, so playing, pausing and dragging the scrubber all go
 * through the same path and always agree.
 *
 * Springs are closed-form (a damped harmonic oscillator evaluated directly),
 * the sheet morphs between scene shapes instead of cutting, and the subtitle
 * track is kinetic type. Layout lives in css/film.css; this file only reads
 * it back (scene boxes and radii) and writes transforms, opacity and a few
 * custom properties.
 */

(function () {
    'use strict';

    const stage = document.getElementById('film-stage');
    if (!stage) return;

    const DURATION = 16;
    const SCENE = 4;
    const HOLD_MS = 1600;
    const FPS = 60;

    const CAPTIONS = [
        'Marta fa lezione con l\'insegnante, con la trascrizione attiva e dichiarata.',
        'Finita la lezione, il sistema legge le frasi di Marta e segna cosa ripassare.',
        'Da quelle frasi nascono gli esercizi, con gli argomenti di cui Marta ha parlato.',
        'Gli esercizi arrivano sul telefono di Marta. L\'insegnante non ha preparato niente.'
    ];

    const CHAPTERS = ['La lezione', 'Le sue frasi', 'Gli esercizi', 'Sul telefono'];

    const TYPED = 'I suggest leaving at 8.';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------------------------------------------------------------------
       Easing and helpers
       --------------------------------------------------------------------- */

    function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
    function lerp(a, b, p) { return a + (b - a) * p; }
    function prog(t, start, dur) { return clamp01((t - start) / dur); }
    function easeOut(p) { return 1 - Math.pow(1 - p, 3); }
    function easeInOut(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
    function bump(p) { return Math.sin(clamp01(p) * Math.PI); }

    // Underdamped spring, x(t) = 1 - e^(-ζωt)(cos ω_d t + (ζω/ω_d) sin ω_d t).
    // p runs 0..1 over the spring's duration; ζ = 0.55 overshoots ~12% and is
    // visually settled well before p = 1, so clamping there never jumps.
    function spring(p, zeta, freq) {
        if (p <= 0) return 0;
        if (p >= 1) return 1;
        const z = zeta || 0.55;
        const w = (freq || 3.1) * 2 * Math.PI;
        const wd = w * Math.sqrt(1 - z * z);
        return 1 - Math.exp(-z * w * p) * (Math.cos(wd * p) + (z * w / wd) * Math.sin(wd * p));
    }

    function pad(n, len) {
        return String(n).padStart(len, '0');
    }

    function clock(sec) {
        const s = Math.max(0, Math.floor(sec));
        return pad(Math.floor(s / 60), 2) + ':' + pad(s % 60, 2);
    }

    /* ---------------------------------------------------------------------
       Element registry, with write-through caching so a frame only touches
       the styles that actually changed.
       --------------------------------------------------------------------- */

    const scenes = Array.from(stage.querySelectorAll('.scene'));
    const sheetEdge = stage.querySelector('.film__sheet-edge');
    const sheetFace = stage.querySelector('.film__sheet');
    const sheetWrap = stage.querySelector('.film__sheet-wrap');
    const caption = document.getElementById('film-subtitle');
    const timerEl = stage.querySelector('[data-film-timer]');
    const zeroEl = stage.querySelector('[data-film-zero]');
    const typedEl = stage.querySelector('[data-film-typed]');
    const tokens = ['t0', 't1', 't2', 't3'].map(function (k) { return stage.querySelector('[data-k="' + k + '"]'); });
    // On screen the tokens read waiting · I · suggest · until March; the
    // answer is I · suggest · waiting · until March.
    const TOKEN_TARGET = [1, 2, 0, 3];
    const waves = {
        c: Array.from(stage.querySelectorAll('[data-wave="c"] i')),
        m: Array.from(stage.querySelectorAll('[data-wave="m"] i'))
    };

    const els = {};
    stage.querySelectorAll('[data-k]').forEach(function (el) { els[el.dataset.k] = el; });

    const cache = new WeakMap();
    function write(el, prop, value) {
        let c = cache.get(el);
        if (!c) { c = {}; cache.set(el, c); }
        if (c[prop] === value) return;
        c[prop] = value;
        if (prop.charAt(0) === '-') el.style.setProperty(prop, value);
        else el.style[prop] = value;
    }

    let U = 10;               // px per --u, refreshed by measure()
    let W = 0;
    let H = 0;
    let rects = [];
    let radii = [];
    let tokenShift = [0, 0, 0, 0];   // px each token travels to reach its slot

    // Opacity plus a transform built from offsets in --u, a scale and an
    // optional rotation. The unit keeps motion proportional at every size.
    function put(el, o, xu, yu, s, extra) {
        if (!el) return;
        write(el, 'opacity', o >= 0.999 ? '1' : o <= 0.001 ? '0' : o.toFixed(3));
        const tx = (xu || 0) * U;
        const ty = (yu || 0) * U;
        const sc = s === undefined ? 1 : s;
        write(el, 'transform',
            'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px) scale(' + sc.toFixed(4) + ')' + (extra || ''));
    }

    // Spring entrance at local time lt: fades in fast, travels from (x, y)
    // and scale s to rest.
    function enter(el, lt, start, opt) {
        const o = opt || {};
        const e = spring(prog(lt, start, o.dur || 0.75));
        const a = clamp01((lt - start) / (o.fade || 0.22));
        put(el, a * (o.alpha === undefined ? 1 : o.alpha),
            (o.x || 0) * (1 - e), (o.y === undefined ? 1.4 : o.y) * (1 - e),
            lerp(o.s === undefined ? 1 : o.s, 1, e), o.extra);
        return e;
    }

    /* ---------------------------------------------------------------------
       Measurement: the CSS decides where each scene's sheet lands.
       --------------------------------------------------------------------- */

    function measure() {
        W = stage.clientWidth;
        H = stage.clientHeight;
        if (!W) return false;
        const unit = getComputedStyle(stage).getPropertyValue('--u').trim();
        U = W * (parseFloat(unit) || 1) / 100;
        rects = scenes.map(function (s) {
            return { x: s.offsetLeft, y: s.offsetTop, w: s.offsetWidth, h: s.offsetHeight };
        });
        radii = scenes.map(function (s) {
            return parseFloat(getComputedStyle(s).borderTopLeftRadius) || 12;
        });
        if (tokens.every(Boolean)) {
            const gap = parseFloat(getComputedStyle(tokens[0].parentElement).columnGap) || 0;
            let x = tokens[0].offsetLeft;
            const target = [];
            TOKEN_TARGET.forEach(function (i) {
                target[i] = x;
                x += tokens[i].offsetWidth + gap;
            });
            tokenShift = tokens.map(function (tk, i) { return target[i] - tk.offsetLeft; });
        }
        return true;
    }

    function mixRect(a, b, p) {
        return { x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), w: lerp(a.w, b.w, p), h: lerp(a.h, b.h, p) };
    }

    function insetFor(r, grow, radius) {
        const top = Math.max(0, r.y - grow);
        const left = Math.max(0, r.x - grow);
        const right = Math.max(0, W - (r.x + r.w) - grow);
        const bottom = Math.max(0, H - (r.y + r.h) - grow);
        return 'inset(' + top.toFixed(1) + 'px ' + right.toFixed(1) + 'px ' + bottom.toFixed(1) +
            'px ' + left.toFixed(1) + 'px round ' + Math.max(0, radius + grow).toFixed(1) + 'px)';
    }

    /* ---------------------------------------------------------------------
       The sheet: grows in at the start, then morphs from each scene's shape
       to the next one with a spring, so the film reads as one continuous
       object rather than a slideshow.
       --------------------------------------------------------------------- */

    function drawSheet(t) {
        let r;
        let rad;
        let bz = 0;
        let alpha = 1;

        if (t < SCENE - 0.35) {
            const p = spring(prog(t, 0, 0.9), 0.62);
            const r0 = rects[0];
            const cx = r0.x + r0.w / 2;
            const cy = r0.y + r0.h / 2;
            const s = lerp(0.35, 1, p);
            r = { x: cx - (r0.w * s) / 2, y: cy - (r0.h * s) / 2, w: r0.w * s, h: r0.h * s };
            rad = radii[0];
            alpha = clamp01(t / 0.2);
        } else {
            let i = Math.min(scenes.length - 1, Math.floor((t + 0.35) / SCENE));
            const p = spring(prog(t, i * SCENE - 0.35, 1), 0.6);
            r = mixRect(rects[i - 1], rects[i], p);
            rad = lerp(radii[i - 1], radii[i], clamp01(p));
            if (i === scenes.length - 1) bz = clamp01(p);
        }

        const edge = lerp(1, 0.7 * U, bz);
        write(sheetWrap, 'opacity', alpha.toFixed(3));
        write(sheetEdge, 'clipPath', insetFor(r, 0, rad));
        write(sheetFace, 'clipPath', insetFor(r, -edge, rad - edge));
        write(sheetEdge, '--bz', bz.toFixed(3));
    }

    /* ---------------------------------------------------------------------
       Scene visibility: content fades in after the sheet has arrived and
       fades out just before it moves on.
       --------------------------------------------------------------------- */

    function sceneAlpha(i, t) {
        const start = i * SCENE;
        const fadeIn = clamp01((t - start - (i === 0 ? 0.35 : 0.2)) / 0.3);
        const fadeOut = i === scenes.length - 1 ? 1 : 1 - clamp01((t - start - 3.62) / 0.3);
        return Math.min(fadeIn, fadeOut);
    }

    /* ---------------------------------------------------------------------
       Scenes
       --------------------------------------------------------------------- */

    // Deterministic "voice" for the waveform bars: two incommensurate sines,
    // so the pattern never visibly repeats within a scene.
    function voice(t, j) {
        return Math.abs(Math.sin(t * 9.1 + j * 1.71) * Math.sin(t * 5.3 + j * 0.83));
    }

    function speaking(lt) {
        if (lt > 0.35 && lt < 1.35) return 'c';
        if (lt >= 1.45 && lt < 2.85) return 'm';
        return '';
    }

    function sceneCall(lt) {
        enter(els['tile-c'], lt, 0.35, { y: 1.6, s: 0.92 });
        enter(els['tile-m'], lt, 0.5, { y: 1.6, s: 0.92 });
        enter(els.rec, lt, 0.8, { x: -2, y: 0 });

        const pressed = bump(prog(lt, 2.95, 0.3));
        const endIn = clamp01((lt - 0.95) / 0.3);
        put(els.end, endIn, 0, 0, 1 - pressed * 0.1);

        const ended = spring(prog(lt, 3.1, 0.7));
        put(els.ended, clamp01((lt - 3.1) / 0.15), 0, 0, lerp(0.6, 1, ended));

        const who = lt < 3.1 ? speaking(lt) : '';
        ['c', 'm'].forEach(function (k) {
            waves[k].forEach(function (bar, j) {
                const v = who === k ? 0.18 + 0.82 * voice(lt, j) : 0.12;
                write(bar, 'transform', 'scaleY(' + v.toFixed(3) + ')');
            });
        });

        if (timerEl) {
            const secs = 27 * 60 + 52 + Math.min(lt, 3.1) * 5.5;
            const text = clock(secs);
            if (timerEl.textContent !== text) timerEl.textContent = text;
        }
    }

    function sceneTranscript(lt) {
        enter(els.txhead, lt, 0.3, { y: 0.8 });
        const dim = easeInOut(prog(lt, 2.0, 0.45));
        for (let i = 0; i < 5; i++) {
            const el = els['l' + i];
            const isTeacher = el && el.dataset.who === 'c';
            const e = spring(prog(lt, 0.45 + i * 0.3, 0.7));
            const a = clamp01((lt - 0.45 - i * 0.3) / 0.2) * (isTeacher ? lerp(1, 0.32, dim) : 1);
            put(el, a, 0, 1.2 * (1 - e), 1);
        }
        ['m1', 'm2', 'm3'].forEach(function (k, i) {
            write(els[k], '--hl', easeInOut(prog(lt, 2.0 + i * 0.25, 0.45)).toFixed(3));
        });
        enter(els.txnote, lt, 2.45, { y: 0.8 });
    }

    // The learner's sentences turn into three exercises: a gap fill from line
    // 2, a word-ordering task from line 4, and a written task built on the
    // topic of the conversation.
    function sceneExercises(lt) {
        for (let i = 0; i < 3; i++) {
            enter(els['e' + i], lt, 0.3 + i * 0.18, { y: 2, s: 0.94 });
            const pop = spring(prog(lt, 0.75 + i * 0.18, 0.6), 0.45);
            put(els['e' + i + 's'], clamp01((lt - 0.75 - i * 0.18) / 0.12), 0, 0, lerp(0.4, 1, pop));
        }

        // Gap fill: the right option lights up, then drops into the gap.
        write(els.e0o, '--on', easeOut(prog(lt, 1.15, 0.3)).toFixed(3));
        const fill = spring(prog(lt, 1.45, 0.6), 0.5);
        put(els.e0a, clamp01((lt - 1.45) / 0.12), 0, -1.2 * (1 - fill), lerp(0.6, 1, fill));

        // Ordering: each token slides to its slot in the right sentence.
        const order = spring(prog(lt, 1.35, 0.9), 0.62);
        tokens.forEach(function (tk, i) {
            put(tk, 1, (tokenShift[i] / U) * order, 0, 1);
        });

        // Writing: the answer types itself out.
        if (typedEl) {
            const n = Math.round(prog(lt, 1.9, 1.3) * TYPED.length);
            const text = TYPED.slice(0, n);
            if (typedEl.textContent !== text) typedEl.textContent = text;
        }
    }

    function scenePublish(lt) {
        put(els.notch, clamp01((lt - 0.3) / 0.3), 0, 0, 1);
        enter(els.note, lt, 0.6, { y: -4, s: 0.9, dur: 0.85 });
        for (let i = 0; i < 3; i++) {
            enter(els['q' + i], lt, 1.15 + i * 0.18, { y: 1.2 });
        }
        enter(els.zero, lt, 1.6, { x: 3, y: 0, dur: 0.9 });
        if (zeroEl) {
            const n = String(Math.round(lerp(6, 0, easeOut(prog(lt, 1.7, 1.1)))));
            if (zeroEl.textContent !== n) zeroEl.textContent = n;
        }
    }

    const SCENES = [sceneCall, sceneTranscript, sceneExercises, scenePublish];

    /* ---------------------------------------------------------------------
       Subtitles: rebuilt when the scene changes, then each word lifts in.
       --------------------------------------------------------------------- */

    let captionScene = -1;
    let captionWords = [];

    function drawCaption(i, lt) {
        if (!caption) return;
        if (i !== captionScene) {
            captionScene = i;
            caption.textContent = '';
            captionWords = CAPTIONS[i].split(' ').map(function (word, j, all) {
                const span = document.createElement('span');
                span.className = 'cw';
                span.textContent = word + (j < all.length - 1 ? ' ' : '');
                caption.appendChild(span);
                return span;
            });
            caption.classList.toggle('is-side', i === scenes.length - 1);
        }
        const out = i === scenes.length - 1 ? 1 : 1 - clamp01((lt - 3.6) / 0.3);
        const start = i === scenes.length - 1 ? 2.2 : 0.45;
        captionWords.forEach(function (w, j) {
            const e = spring(prog(lt, start + j * 0.045, 0.6), 0.7);
            put(w, clamp01((lt - start - j * 0.045) / 0.25) * out, 0, 0.9 * (1 - e), 1);
        });
    }

    /* ---------------------------------------------------------------------
       seek(t): the only thing that draws.
       --------------------------------------------------------------------- */

    const chapterLabel = document.getElementById('film-chapter');
    const frameLabel = document.getElementById('film-frameno');
    const timeLabel = document.getElementById('film-time');
    const range = document.getElementById('film-range');
    const scrub = range ? range.parentElement : null;
    const chapterButtons = Array.from(document.querySelectorAll('#film-chapters button'));
    let lastChapter = -1;

    function seek(t) {
        if (!rects.length && !measure()) return;
        const tt = Math.max(0, Math.min(DURATION, t));
        const index = Math.min(scenes.length - 1, Math.floor(tt / SCENE));

        drawSheet(tt);

        scenes.forEach(function (scene, i) {
            const a = sceneAlpha(i, tt);
            write(scene, 'opacity', a.toFixed(3));
            write(scene, 'visibility', a > 0 ? 'visible' : 'hidden');
            // Only scenes that can be seen get computed. Leaving a hidden
            // scene's elements where they were is safe, because the scene
            // always re-renders fully before it fades back in.
            if (a > 0 || i === index) SCENES[i](tt - i * SCENE);
        });

        drawCaption(index, tt - index * SCENE);

        if (index !== lastChapter) {
            lastChapter = index;
            if (chapterLabel) chapterLabel.textContent = pad(index + 1, 2) + ' · ' + CHAPTERS[index];
            chapterButtons.forEach(function (b, i) {
                if (i === index) b.setAttribute('aria-current', 'true');
                else b.removeAttribute('aria-current');
            });
        }

        if (frameLabel) frameLabel.textContent = 'fotogramma ' + pad(Math.round(tt * FPS), 4);
        if (timeLabel) timeLabel.textContent = clock(tt) + ' / ' + clock(DURATION);
        if (range && document.activeElement !== range) range.value = tt.toFixed(2);
        if (range) range.setAttribute('aria-valuetext', clock(tt) + ', capitolo ' + (index + 1) + ', ' + CHAPTERS[index]);
        if (scrub) write(scrub, '--p', (tt / DURATION).toFixed(4));
    }

    /* ---------------------------------------------------------------------
       Player
       --------------------------------------------------------------------- */

    const playBtn = document.getElementById('film-play');
    const film = document.getElementById('film');

    let t = prefersReducedMotion ? DURATION - 1.2 : 0;
    let playing = false;
    let wantsPlay = !prefersReducedMotion;   // the reader's intent
    let inView = false;
    let raf = 0;
    let last = 0;
    let holdStart = 0;

    function syncButton() {
        if (!playBtn) return;
        playBtn.setAttribute('aria-pressed', String(playing));
        playBtn.setAttribute('aria-label', playing ? 'Metti in pausa il film' : 'Riproduci il film');
    }

    function tick(now) {
        if (!playing) { raf = 0; return; }
        const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
        last = now;
        if (t >= DURATION) {
            if (!holdStart) holdStart = now;
            if (now - holdStart > HOLD_MS) { t = 0; holdStart = 0; }
        } else {
            t = Math.min(DURATION, t + dt);
        }
        seek(t);
        raf = requestAnimationFrame(tick);
    }

    function updatePlayback() {
        const should = wantsPlay && inView && !document.hidden;
        if (should === playing) return;
        playing = should;
        syncButton();
        if (playing) {
            last = 0;
            if (t >= DURATION) t = 0;
            if (!raf) raf = requestAnimationFrame(tick);
        }
    }

    if (playBtn) {
        playBtn.addEventListener('click', function () {
            wantsPlay = !playing;
            if (wantsPlay) inView = true;
            updatePlayback();
            syncButton();
        });
    }

    if (range) {
        range.addEventListener('input', function () {
            t = parseFloat(range.value) || 0;
            holdStart = 0;
            seek(t);
        });
    }

    // Jumping to a chapter while paused lands on its settled frame, where
    // everything in the scene is on screen; while playing it starts the
    // chapter from the top.
    chapterButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            const i = Number(btn.dataset.chapter);
            t = i * SCENE + (playing ? 0.05 : (i === 0 ? 2.6 : i === scenes.length - 1 ? 3.6 : 3.3));
            holdStart = 0;
            seek(t);
        });
    });

    document.addEventListener('visibilitychange', updatePlayback);

    if ('IntersectionObserver' in window && film) {
        new IntersectionObserver(function (entries) {
            inView = entries[0].isIntersecting;
            updatePlayback();
        }, { threshold: 0.25 }).observe(film);
    } else {
        inView = true;
    }

    if ('ResizeObserver' in window) {
        new ResizeObserver(function () {
            if (measure()) seek(t);
        }).observe(stage);
    } else {
        window.addEventListener('resize', function () { if (measure()) seek(t); });
    }

    stage.classList.add('is-ready');
    measure();
    seek(t);
    syncButton();
    updatePlayback();
})();
