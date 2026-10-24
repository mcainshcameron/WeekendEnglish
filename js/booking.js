/**
 * WeekendEnglish.it — booking demo
 *
 * Cameron's availability is defined in Rome time (Mon–Thu, 19:00–22:00,
 * 30-minute calls with a 15-minute buffer). The calendar starts from today's
 * real date and shows every slot in the viewer's own time zone, converted
 * with Intl, so daylight-saving changes come out right. Taken slots are
 * pseudo-random but stable for a given date. Nothing is booked.
 */

(function () {
    'use strict';

    const daysEl = document.getElementById('booking-days');
    const slotsEl = document.getElementById('booking-slots');
    if (!daysEl || !slotsEl) return;

    const HOST_TZ = 'Europe/Rome';
    const SLOTS = [[19, 0], [19, 45], [20, 30], [21, 15]];
    const DAYS_SHOWN = 4;
    const CANCEL_HOURS = 12;

    const select = document.getElementById('tz-select');
    const zoneEl = document.getElementById('booking-zone');
    const repeat = document.getElementById('booking-repeat');
    const confirmEl = document.getElementById('booking-confirm');
    const okEl = document.getElementById('booking-ok');
    const timeline = document.getElementById('booking-timeline');
    const withTransition = (window.WE && window.WE.withTransition) || function (fn) { fn(); };

    const browserTz = (function () {
        try { return Intl.DateTimeFormat().resolvedOptions().timeZone || HOST_TZ; } catch (e) { return HOST_TZ; }
    })();

    let viewerTz = browserTz;
    let days = [];
    let dayIndex = 0;
    let chosen = null;     // { day, slot }

    /* ---------------------------------------------------------------------
       Time-zone arithmetic without a library
       --------------------------------------------------------------------- */

    const partFormatters = {};
    function parts(ts, tz) {
        if (!partFormatters[tz]) {
            partFormatters[tz] = new Intl.DateTimeFormat('en-US', {
                timeZone: tz, hourCycle: 'h23',
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short'
            });
        }
        const out = {};
        partFormatters[tz].formatToParts(new Date(ts)).forEach(function (p) { out[p.type] = p.value; });
        return out;
    }

    // Offset of tz from UTC at instant ts, in ms.
    function offset(ts, tz) {
        const p = parts(ts, tz);
        const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
        return asUtc - Math.floor(ts / 1000) * 1000;
    }

    // The UTC instant at which the wall clock in tz reads y-m-d h:mi.
    function zoned(y, m, d, h, mi, tz) {
        const guess = Date.UTC(y, m - 1, d, h, mi);
        let ts = guess - offset(guess, tz);
        const again = guess - offset(ts, tz);
        if (again !== ts) ts = again;
        return ts;
    }

    function fmt(ts, tz, opts) {
        return new Intl.DateTimeFormat('it-IT', Object.assign({ timeZone: tz }, opts)).format(new Date(ts));
    }

    function time(ts, tz) {
        return fmt(ts, tz, { hour: '2-digit', minute: '2-digit' });
    }

    function dayLabel(ts, tz) {
        return fmt(ts, tz, { weekday: 'short', day: 'numeric' });
    }

    function longDay(ts, tz) {
        const s = fmt(ts, tz, { weekday: 'long', day: 'numeric', month: 'long' });
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    function sameDay(a, b, tz) {
        return fmt(a, tz, { year: 'numeric', month: 'numeric', day: 'numeric' }) ===
               fmt(b, tz, { year: 'numeric', month: 'numeric', day: 'numeric' });
    }

    function zoneName(tz) {
        if (tz === browserTz) return tz + ' (il tuo)';
        return tz;
    }

    /* ---------------------------------------------------------------------
       Availability
       --------------------------------------------------------------------- */

    // Small stable hash, so the same date always has the same taken slots.
    function hash(str) {
        let h = 2166136261;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    function buildDays() {
        const now = Date.now();
        const today = parts(now, HOST_TZ);
        const out = [];
        for (let add = 1; out.length < DAYS_SHOWN && add < 21; add++) {
            // Noon avoids any DST edge when stepping whole days.
            const noon = zoned(+today.year, +today.month, +today.day + add, 12, 0, HOST_TZ);
            const p = parts(noon, HOST_TZ);
            if (['Mon', 'Tue', 'Wed', 'Thu'].indexOf(p.weekday) === -1) continue;
            const key = p.year + '-' + p.month + '-' + p.day;
            const slots = SLOTS.map(function (hm, i) {
                return {
                    ts: zoned(+p.year, +p.month, +p.day, hm[0], hm[1], HOST_TZ),
                    taken: hash(key + ':' + i) % 3 === 0
                };
            });
            // Always leave at least two open slots on a day.
            if (slots.filter(function (s) { return !s.taken; }).length < 2) {
                slots[1].taken = false;
                slots[2].taken = false;
            }
            out.push({ noon: noon, slots: slots });
        }
        return out;
    }

    /* ---------------------------------------------------------------------
       Rendering
       --------------------------------------------------------------------- */

    function renderDays() {
        daysEl.innerHTML = '';
        days.forEach(function (day, i) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'bday';
            btn.setAttribute('aria-pressed', String(i === dayIndex));
            const wd = document.createElement('span');
            wd.textContent = fmt(day.noon, HOST_TZ, { weekday: 'short' });
            const dn = document.createElement('b');
            dn.textContent = fmt(day.noon, HOST_TZ, { day: 'numeric' });
            btn.append(wd, dn);
            btn.setAttribute('aria-label', longDay(day.noon, HOST_TZ));
            btn.addEventListener('click', function () {
                dayIndex = i;
                renderDays();
                renderSlots();
            });
            daysEl.appendChild(btn);
        });
    }

    function renderSlots() {
        slotsEl.innerHTML = '';
        const day = days[dayIndex];
        day.slots.forEach(function (slot, i) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'slot';
            btn.style.setProperty('--i', String(i));
            btn.disabled = slot.taken;
            const isChosen = chosen && chosen.day === dayIndex && chosen.slot === i;
            btn.setAttribute('aria-pressed', String(!!isChosen));

            const t = document.createElement('b');
            t.textContent = time(slot.ts, viewerTz);
            const small = document.createElement('small');
            if (slot.taken) {
                small.textContent = 'occupato';
            } else if (!sameDay(slot.ts, day.noon, viewerTz) || viewerTz !== HOST_TZ) {
                small.textContent = sameDay(slot.ts, day.noon, viewerTz)
                    ? 'Roma ' + time(slot.ts, HOST_TZ)
                    : dayLabel(slot.ts, viewerTz) + ' · Roma ' + time(slot.ts, HOST_TZ);
            } else {
                small.textContent = '30 min';
            }
            btn.append(t, small);
            btn.setAttribute('aria-label', (slot.taken ? 'Occupato, ' : '') + longDay(slot.ts, viewerTz) + ', ore ' + time(slot.ts, viewerTz));

            btn.addEventListener('click', function () {
                chosen = { day: dayIndex, slot: i };
                withTransition(function () {
                    Array.from(slotsEl.children).forEach(function (b, j) { b.setAttribute('aria-pressed', String(j === i)); });
                    renderConfirm();
                });
            });
            slotsEl.appendChild(btn);
        });
    }

    function renderConfirm() {
        if (!chosen) { confirmEl.hidden = true; return; }
        const slot = days[chosen.day].slots[chosen.slot];
        const ts = slot.ts;
        const when = longDay(ts, viewerTz) + ', ' + time(ts, viewerTz);
        const host = viewerTz === HOST_TZ ? '' : 'Per Cameron: ' + time(ts, HOST_TZ) + ' a Roma.';
        const weekday = fmt(ts, viewerTz, { weekday: 'long' });

        okEl.textContent = '';
        okEl.appendChild(document.createTextNode(repeat && repeat.checked
            ? 'Ogni ' + weekday + ' alle ' + time(ts, viewerTz) + ', a partire da ' + longDay(ts, viewerTz).toLowerCase()
            : 'Call confermata: ' + when));
        const sub = document.createElement('small');
        sub.textContent = [host, 'Esempio: non viene prenotato niente.'].filter(Boolean).join(' ');
        okEl.appendChild(sub);

        const rows = [
            ['Subito', 'Conferma con il link della call'],
            [dayLabel(ts - 24 * 3600e3, viewerTz) + ', ' + time(ts - 24 * 3600e3, viewerTz), 'Promemoria il giorno prima'],
            [time(ts - 3600e3, viewerTz), 'Promemoria un\'ora prima, con il link'],
            ['Fino a ' + dayLabel(ts - CANCEL_HOURS * 3600e3, viewerTz) + ', ' + time(ts - CANCEL_HOURS * 3600e3, viewerTz), 'Puoi cancellare da solo, lo slot torna libero'],
            ['Dopo la call', 'La sequenza successiva arriva da sola']
        ];

        timeline.innerHTML = '';
        rows.forEach(function (r, i) {
            const li = document.createElement('li');
            li.style.setProperty('--i', String(i));
            if (i === rows.length - 1) li.className = 'is-last';
            const b = document.createElement('b');
            b.textContent = r[1];
            const span = document.createElement('span');
            span.textContent = r[0];
            li.append(b, span);
            timeline.appendChild(li);
        });
        confirmEl.hidden = false;
    }

    function renderZone() {
        if (zoneEl) zoneEl.textContent = 'Orari mostrati nel fuso ' + zoneName(viewerTz);
    }

    function renderAll() {
        renderZone();
        renderDays();
        renderSlots();
        renderConfirm();
    }

    /* ---------------------------------------------------------------------
       Wiring
       --------------------------------------------------------------------- */

    if (select) {
        // Offer the reader's own zone by name if it isn't already listed.
        const autoOption = select.querySelector('option[value="auto"]');
        if (autoOption) autoOption.textContent = 'Il tuo · ' + browserTz.replace(/_/g, ' ');
        select.addEventListener('change', function () {
            viewerTz = select.value === 'auto' ? browserTz : select.value;
            renderAll();
        });
    }

    if (repeat) repeat.addEventListener('change', function () { withTransition(renderConfirm); });

    try {
        days = buildDays();
        renderAll();
    } catch (e) {
        // Intl time-zone support is universal in current browsers; if it is
        // missing, leave the static note in place rather than a broken widget.
        slotsEl.innerHTML = '<p class="booking__nojs">Il calendario di esempio non è disponibile in questo browser.</p>';
    }
})();
