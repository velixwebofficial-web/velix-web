/* ==========================================================================
   VELIX — booking page controller (book.html)
   Works on the static host with no backend:
   - Builds the next 14 bookable days (Saturday–Thursday) and hourly slots
     10:00–17:00 Amman time (GMT+3, Jordan has no daylight saving).
   - Shows the visitor's own local time next to each slot when it differs.
   - On submit, opens WhatsApp with the booking already written, in the
     visitor's language. WhatsApp is the delivery path that always works.
   - If the Web3Forms key in script.js is configured, the booking is also
     emailed; the local admin CRM gets a best-effort copy too.
   - Offers an .ics file so the visitor can hold the time in their calendar.
   ========================================================================== */
(function () {
  'use strict';

  var WA_NUMBER = '962799691748';
  var AMMAN_OFFSET_H = 3;
  var DAYS_AHEAD = 14;
  var HOURS = [10, 11, 12, 13, 14, 15, 16, 17];
  var MIN_LEAD_MS = 2 * 60 * 60 * 1000; // a slot today must be at least 2h away
  var FRIDAY = 5;

  var form = document.getElementById('bookForm');
  if (!form) return;
  var daysEl = document.getElementById('bkDays');
  var slotsEl = document.getElementById('bkSlots');
  var errEl = document.getElementById('bkError');
  var done = document.getElementById('bkDone');
  var state = { day: null, slot: null, lastBooking: null };

  function lang() { return document.documentElement.getAttribute('lang') === 'ar' ? 'ar' : 'en'; }
  function t(key, fb) {
    if (window.VELIX_I18N) { var v = window.VELIX_I18N.t(key); if (v !== null && v !== undefined) return v; }
    return fb;
  }
  function locale() { return lang() === 'ar' ? 'ar-JO-u-nu-latn' : 'en-GB'; }
  function fmt(date, opts) {
    try { return new Intl.DateTimeFormat(locale(), Object.assign({ timeZone: 'Asia/Amman' }, opts)).format(date); }
    catch (e) { return date.toUTCString(); }
  }
  function pad(n) { return String(n).padStart(2, '0'); }

  // Amman calendar date for "now"
  function ammanToday() {
    var a = new Date(Date.now() + AMMAN_OFFSET_H * 3600e3);
    return { y: a.getUTCFullYear(), m: a.getUTCMonth(), d: a.getUTCDate() };
  }
  // UTC instant of an Amman wall-clock time
  function ammanInstant(y, m, d, h) { return new Date(Date.UTC(y, m, d, h - AMMAN_OFFSET_H, 0, 0)); }

  function bookableDays() {
    var base = ammanToday(), out = [];
    for (var i = 0; out.length < DAYS_AHEAD && i < DAYS_AHEAD + 4; i++) {
      var noon = new Date(Date.UTC(base.y, base.m, base.d + i, 12 - AMMAN_OFFSET_H));
      var amm = new Date(noon.getTime() + AMMAN_OFFSET_H * 3600e3);
      if (amm.getUTCDay() === FRIDAY) continue;
      var day = { y: amm.getUTCFullYear(), m: amm.getUTCMonth(), d: amm.getUTCDate(), noon: noon };
      if (slotsFor(day).length) out.push(day);
    }
    return out;
  }
  function slotsFor(day) {
    var now = Date.now();
    return HOURS.map(function (h) { return { h: h, at: ammanInstant(day.y, day.m, day.d, h) }; })
      .filter(function (s) { return s.at.getTime() - now >= MIN_LEAD_MS; });
  }

  var visitorTz = (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return ''; } })();
  var sameTz = (function () {
    var off = -new Date().getTimezoneOffset() / 60;
    return off === AMMAN_OFFSET_H;
  })();

  function renderDays() {
    var days = bookableDays();
    daysEl.innerHTML = '';
    days.forEach(function (day, i) {
      var id = 'bkd' + i;
      var label = document.createElement('label');
      label.className = 'bk-day';
      label.innerHTML = '<input type="radio" name="day" id="' + id + '" value="' + i + '"/>' +
        '<span><small>' + fmt(day.noon, { weekday: 'short' }) + '</small><b>' + day.d + '</b><em>' + fmt(day.noon, { month: 'short' }) + '</em></span>';
      label.querySelector('input').addEventListener('change', function () { state.day = day; state.slot = null; renderSlots(); clearError(); });
      daysEl.appendChild(label);
      if (state.day && state.day.y === day.y && state.day.m === day.m && state.day.d === day.d) label.querySelector('input').checked = true;
    });
  }

  function renderSlots() {
    slotsEl.innerHTML = '';
    if (!state.day) {
      slotsEl.innerHTML = '<p class="bk-hint">' + t('t_v7_b_pick_day_first', 'Choose a day to see available times.') + '</p>';
      return;
    }
    slotsFor(state.day).forEach(function (s, i) {
      var label = document.createElement('label');
      label.className = 'bk-slot';
      var local = sameTz ? '' : '<small>' + new Intl.DateTimeFormat(locale(), { hour: '2-digit', minute: '2-digit', hour12: false }).format(s.at) + ' ' + t('t_v7_b_your_time', 'your time') + '</small>';
      label.innerHTML = '<input type="radio" name="slot" value="' + s.h + '"/><span>' + pad(s.h) + ':00' + local + '</span>';
      var input = label.querySelector('input');
      if (state.slot && state.slot.h === s.h) input.checked = true;
      input.addEventListener('change', function () { state.slot = s; clearError(); });
      slotsEl.appendChild(label);
    });
  }

  function showError(msg) { errEl.textContent = msg; errEl.hidden = false; errEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  function clearError() { errEl.hidden = true; }

  function modeLabel(v) {
    return { meet: t('t_v7_b_m_meet', 'Video call') + ' (Google Meet)', phone: t('t_v7_b_m_phone', 'Phone call'), whatsapp: t('t_v7_b_m_wa', 'WhatsApp call') }[v] || v;
  }
  function needLabel(v) {
    var opt = form.querySelector('select[name="need"] option[value="' + v + '"]');
    return opt ? opt.textContent : v;
  }
  function whenLabel(slot) {
    return fmt(slot.at, { weekday: 'long', day: 'numeric', month: 'long' }) + ' · ' + pad(slot.h) + ':00 ' + (lang() === 'ar' ? '(بتوقيت عمّان)' : '(Amman time)');
  }

  function buildMessage(b) {
    var ar = lang() === 'ar';
    var L = ar
      ? ['طلب حجز استشارة — VELIX', 'الاسم', 'الموعد', 'الطريقة', 'المطلوب', 'النشاط / الموقع', 'رقم الواتساب', 'البريد', 'ملاحظات']
      : ['Consultation booking — VELIX', 'Name', 'When', 'How', 'Need', 'Business / website', 'WhatsApp', 'Email', 'Notes'];
    var lines = [L[0], '', L[1] + ': ' + b.name, L[2] + ': ' + b.when, L[3] + ': ' + b.how, L[4] + ': ' + b.need];
    if (b.business) lines.push(L[5] + ': ' + b.business);
    lines.push(L[6] + ': ' + b.phone);
    if (b.email) lines.push(L[7] + ': ' + b.email);
    if (b.notes) lines.push(L[8] + ': ' + b.notes);
    return lines.join('\n');
  }

  function sendCopies(b) {
    // Admin CRM (only exists when the local server is running) — never blocks
    try {
      if (window.VELIX && VELIX.leads) {
        VELIX.leads.create({ name: b.name, phone: b.phone, email: b.email, company: b.business, projectDetails: b.need + (b.notes ? ' — ' + b.notes : ''), timeline: b.when + ' / ' + b.how, source: 'Booking' }).catch(function () {});
      }
    } catch (e) {}
    // Email via Web3Forms, only if a real key is configured in script.js
    try {
      if (typeof velixFormsAreLive === 'function' && velixFormsAreLive() && typeof VELIX_CONFIG !== 'undefined') {
        fetch(VELIX_CONFIG.web3formsEndpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ access_key: VELIX_CONFIG.web3formsKey, subject: 'Booking — ' + b.name + ' — ' + b.when, from_name: 'VELIX Website', name: b.name, phone: b.phone, email: b.email || undefined, business: b.business, need: b.need, when: b.when, how: b.how, notes: b.notes })
        }).catch(function () {});
      }
    } catch (e) {}
  }

  function icsFor(b) {
    function stamp(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
    var end = new Date(b.at.getTime() + 30 * 60e3);
    var body = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//VELIX Web Solutions//Booking//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT', 'UID:' + Date.now() + '@velixweb.xyz', 'DTSTAMP:' + stamp(new Date()),
      'DTSTART:' + stamp(b.at), 'DTEND:' + stamp(end),
      'SUMMARY:' + (lang() === 'ar' ? 'استشارة مع VELIX' : 'Consultation with VELIX'),
      'DESCRIPTION:' + b.how.replace(/,/g, '\\,') + ' — ' + b.need.replace(/,/g, '\\,') + '\\nhello@velixweb.xyz · +962 79 969 1748',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    return new Blob([body], { type: 'text/calendar;charset=utf-8' });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearError();
    if (!state.day || !state.slot) { showError(t('t_v7_b_err_slot', 'Please choose a day and a time.')); return; }
    var name = form.elements.namedItem('name').value.trim();
    var phone = form.elements.namedItem('phone').value.trim();
    form.elements.namedItem('name').closest('.bk-field').classList.toggle('is-invalid', !name);
    form.elements.namedItem('phone').closest('.bk-field').classList.toggle('is-invalid', phone.replace(/\D/g, '').length < 7);
    if (!name || phone.replace(/\D/g, '').length < 7) { showError(t('t_v7_b_err_fields', 'Please add your name and WhatsApp number.')); return; }

    var b = {
      name: name, phone: phone,
      email: form.elements.namedItem('email').value.trim(),
      business: form.elements.namedItem('business').value.trim(),
      need: needLabel(form.elements.namedItem('need').value),
      notes: form.elements.namedItem('notes').value.trim(),
      how: modeLabel(form.querySelector('input[name="mode"]:checked').value),
      when: whenLabel(state.slot),
      at: state.slot.at
    };
    state.lastBooking = b;
    var url = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(buildMessage(b));
    var mode = form.querySelector('input[name="mode"]:checked').value;
    var btn = form.querySelector('.bk-submit'); btn.disabled = true;

    function showDone(saved) {
      document.getElementById('bkSumWhen').textContent = b.when;
      document.getElementById('bkSumHow').textContent = b.how;
      var wa = document.getElementById('bkWaAgain'); wa.href = url; wa.style.display = saved ? 'none' : '';
      var h = done.querySelector('h2'), p = done.querySelector('p');
      h.setAttribute('data-i18n', saved ? 't_v9_bk_ok_t' : 't_v7_b_done_t'); h.textContent = t(saved ? 't_v9_bk_ok_t' : 't_v7_b_done_t', saved ? 'You are booked.' : 'Almost done.');
      p.setAttribute('data-i18n', saved ? 't_v9_bk_ok_b' : 't_v7_b_done_b'); p.textContent = t(saved ? 't_v9_bk_ok_b' : 't_v7_b_done_b', '');
      form.hidden = true; done.hidden = false; done.focus();
      done.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    // 1) Save straight to the admin room (Leads). 2) If that is not reachable, fall back to WhatsApp.
    var cfg = window.VELIX_CONFIG || {};
    var api = (cfg.apiBase || '').replace(/\/$/, '') + '/api/bookings';
    var dd = state.day;
    fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      date: dd.y + '-' + pad(dd.m + 1) + '-' + pad(dd.d), hour: state.slot.h, method: mode === 'meet' ? 'video' : mode,
      name: b.name, phone: b.phone, need: [b.need, b.business, b.email, b.notes].filter(Boolean).join(' · '), lang: lang(), source: 'Website Booking Page'
    }) }).then(function (r) { return r.json().then(function (d) { return r.ok && d && d.success; }, function () { return false; }); })
      .catch(function () { return false; })
      .then(function (saved) {
        btn.disabled = false;
        if (saved) { showDone(true); return; }
        sendCopies(b);
        var win = window.open(url, '_blank');
        if (win) { try { win.opener = null; } catch (e) {} }
        showDone(false);
        if (!win) window.location.href = url; // popup blocked: go straight to WhatsApp
      });
  });

  document.getElementById('bkIcs').addEventListener('click', function () {
    if (!state.lastBooking) return;
    var a = document.createElement('a');
    a.href = URL.createObjectURL(icsFor(state.lastBooking));
    a.download = 'velix-consultation.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  });
  document.getElementById('bkAgain').addEventListener('click', function () {
    done.hidden = true; form.hidden = false; state.slot = null; renderSlots();
    form.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });

  // ?need=store etc. preselects the service (links from services can use it)
  try {
    var need = new URLSearchParams(location.search).get('need');
    if (need && form.querySelector('select[name="need"] option[value="' + need + '"]')) form.elements.namedItem('need').value = need;
  } catch (e) {}

  document.addEventListener('velix:langchange', function () { renderDays(); renderSlots(); });
  renderDays(); renderSlots();
})();
