/* ==========================================================================
   VELIX v9 — homepage controller
   Preloader → hero intro → project fan, honest counters, principles
   carousel (autoplay + pause), draggable work rail, stacking process cards.
   Uses GSAP + ScrollTrigger when present, degrades to CSS otherwise.
   ========================================================================== */
(function () {
  'use strict';
  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var G = window.gsap, ST = window.ScrollTrigger;
  if (G && ST) G.registerPlugin(ST);
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var T = function (k, f) { var v = window.VELIX_I18N && window.VELIX_I18N.t(k); return v || f; };
  var isRTL = function () { return doc.getAttribute('dir') === 'rtl'; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* ---------- seamless marquees: duplicate the content once ---------- */
  $$('.v9-marquee__track, .v9-tech__track').forEach(function (t) { t.innerHTML += t.innerHTML; t.lastElementChild && $$(':scope > *', t).slice(t.children.length / 2).forEach(function (n) { n.setAttribute('aria-hidden', 'true'); }); });

  /* ---------- projects ---------- */
  var projects = [], loaded = false;
  function isConcept(p) { return /concept|كونسبت|فكرة/i.test((p.title || '') + ' ' + (p.category || '')); }
  function cleanTitle(p) { return String(p.title || '').replace(/\s*\((concept)\)\s*/i, ' ').trim(); }
  function href(p) { return p.slug ? 'project.html?slug=' + encodeURIComponent(p.slug) : 'project.html?id=' + encodeURIComponent(p.id); }
  function tagHTML(p) { var c = isConcept(p); var label = c ? T('t_v9_wk_concept', 'Concept') : (String(p.category || '').trim() || T('t_v9_wk_client', 'Project')); return '<span class="v9-tag' + (c ? ' v9-tag--concept' : '') + '">' + esc(label) + '</span>'; }

  /* ---------- hero fan ---------- */
  var fanCards = [], fanTimer = null;
  var SLOTS = [
    { x: 0, y: 0, r: 0, z: 0, s: 1, o: 1 },
    { x: 26, y: -8, r: 8, z: -120, s: .88, o: .8 },
    { x: -24, y: 7, r: -8, z: -200, s: .8, o: .6 }
  ];
  function placeFan(animate) {
    fanCards.forEach(function (el, i) {
      var s = SLOTS[i] || SLOTS[2], dir = isRTL() ? -1 : 1;
      var props = { xPercent: -50 + s.x * dir, yPercent: -50 + s.y, rotation: s.r * dir, z: s.z, scale: s.s, opacity: s.o, zIndex: 10 - i };
      if (G && animate) G.to(el, Object.assign({ duration: 1.1, ease: 'expo.out' }, props));
      else if (G) G.set(el, props);
      else { el.style.zIndex = 10 - i; el.style.transform = 'translate(' + (-50 + s.x * dir) + '%,' + (-50 + s.y) + '%) rotate(' + s.r * dir + 'deg) scale(' + s.s + ')'; el.style.opacity = s.o; }
    });
  }
  function buildFan() {
    var fan = $('#v9Fan'); if (!fan) return;
    var withCover = projects.filter(function (p) { return p.cover; }).slice(0, 3);
    if (!withCover.length) { fan.innerHTML = '<div class="v9-fan__empty"><img src="assets/img/logo-mark-light.png" alt=""/></div>'; return; }
    fan.innerHTML = withCover.map(function (p) {
      return '<figure class="v9-fan__card"><img src="' + esc(p.cover) + '" alt="" decoding="async"/><figcaption><span>' + esc(cleanTitle(p)) + '</span><em>' + esc(p.category || '') + '</em></figcaption></figure>';
    }).join('');
    fanCards = $$('.v9-fan__card', fan);
    placeFan(false);
    if (G) G.set(fanCards, { opacity: 0, y: 80 });
  }
  function introFan() {
    if (!fanCards.length) return;
    if (G && !reduce) {
      G.to(fanCards, { y: 0, duration: 1.4, ease: 'expo.out', stagger: .12, onStart: function () { placeFan(true); } });
    } else placeFan(false);
    if (fanCards.length > 1 && !reduce) {
      clearInterval(fanTimer);
      fanTimer = setInterval(function () { if (document.hidden) return; fanCards.push(fanCards.shift()); placeFan(true); }, 3800);
    }
    // gentle pointer tilt
    var stage = $('#v9Stage');
    if (fine && G && stage && !reduce) {
      window.addEventListener('pointermove', function (e) {
        var rx = (e.clientY / window.innerHeight - .5) * -8, ry = (e.clientX / window.innerWidth - .5) * 10;
        G.to('#v9Fan', { rotationX: rx, rotationY: ry, duration: 1.2, ease: 'power3.out' });
      }, { passive: true });
    }
  }

  /* ---------- work rail ---------- */
  function buildWork() {
    var track = $('#v9Track'), sec = $('#work'); if (!track) return;
    if (!loaded) return;
    if (!projects.length) { sec.style.display = 'none'; return; }
    track.innerHTML = projects.map(function (p) {
      var media = p.cover ? '<img src="' + esc(p.cover) + '" alt="' + esc(cleanTitle(p)) + '" loading="lazy" draggable="false"/>' : '<div class="v9-wcard__ph"><b>' + esc(cleanTitle(p)) + '</b></div>';
      return '<a class="v9-wcard" href="' + href(p) + '" draggable="false"><div class="v9-wcard__media">' + tagHTML(p) + media + '<span class="v9-wcard__view">' + esc(T('t_v9_wk_view', 'View project')) + '</span></div><div class="v9-wcard__meta"><h3>' + esc(cleanTitle(p)) + '</h3><span>' + esc(String(p.category || '').replace(/^\s*concept\s*[·\-–|]\s*/i, '')) + '</span></div></a>';
    }).join('');
    if (G && !reduce) {
      G.from($$('.v9-wcard', track), { x: isRTL() ? -120 : 120, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: .08, scrollTrigger: { trigger: track, start: 'top 85%', once: true } });
    }
    updateArrows();
  }
  var rail = $('#v9Rail');
  function step() { var c = $('.v9-wcard', rail); return c ? c.getBoundingClientRect().width + 20 : 400; }
  function updateArrows() {
    if (!rail) return;
    var max = rail.scrollWidth - rail.clientWidth, pos = Math.abs(rail.scrollLeft);
    var prev = $('#v9Prev'), next = $('#v9Next');
    if (prev) prev.disabled = pos < 4;
    if (next) next.disabled = pos > max - 4;
  }
  if (rail) {
    rail.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    $('#v9Prev').addEventListener('click', function () { rail.scrollBy({ left: (isRTL() ? 1 : -1) * step(), behavior: 'smooth' }); });
    $('#v9Next').addEventListener('click', function () { rail.scrollBy({ left: (isRTL() ? -1 : 1) * step(), behavior: 'smooth' }); });
    // mouse drag (touch already scrolls natively)
    var down = false, moved = false, sx = 0, sl = 0;
    rail.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = rail.scrollLeft; });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - sx;
      if (!moved && Math.abs(dx) > 6) { moved = true; rail.classList.add('is-drag'); }
      if (moved) rail.scrollLeft = sl - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return; down = false;
      if (moved) { setTimeout(function () { rail.classList.remove('is-drag'); }, 30); }
    });
    rail.addEventListener('click', function (e) { if (moved) { e.preventDefault(); moved = false; } }, true);
    // drag cursor
    var dc = $('#v9Drag');
    if (fine && dc) {
      rail.addEventListener('pointerenter', function () { dc.classList.add('is-on'); });
      rail.addEventListener('pointerleave', function () { dc.classList.remove('is-on'); });
      rail.addEventListener('pointerdown', function () { dc.classList.add('is-down'); });
      window.addEventListener('pointerup', function () { dc.classList.remove('is-down'); });
      window.addEventListener('pointermove', function (e) { dc.style.left = e.clientX + 'px'; dc.style.top = e.clientY + 'px'; }, { passive: true });
    }
  }

  /* ---------- counters ---------- */
  function countUp(el) {
    var to = parseInt(el.getAttribute('data-to'), 10) || 0;
    if (reduce || !G) { el.textContent = to; return; }
    var o = { v: 0 };
    G.to(o, { v: to, duration: 1.8, ease: 'power3.out', onUpdate: function () { el.textContent = Math.round(o.v); } });
  }
  function initCounters() {
    var els = $$('.v9-count');
    if (!('IntersectionObserver' in window)) { els.forEach(countUp); return; }
    var io = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) { countUp(e.target); io.unobserve(e.target); } }); }, { threshold: .4 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- principles carousel ---------- */
  (function principles() {
    var tabs = $$('.v9-pr__tab'), panes = $$('.v9-pr__pane'), btn = $('#v9PrPause');
    if (!tabs.length) return;
    var i = 0, t0 = performance.now(), DUR = 6000, paused = reduce, visible = false, elapsed = 0;
    function show(n) {
      i = (n + tabs.length) % tabs.length; elapsed = 0; t0 = performance.now();
      tabs.forEach(function (t, k) { t.classList.toggle('is-on', k === i); t.setAttribute('aria-selected', k === i); $('i b', t).style.width = k < i ? '100%' : '0%'; });
      panes.forEach(function (p, k) { p.classList.toggle('is-on', k === i); });
    }
    tabs.forEach(function (t, k) { t.addEventListener('click', function () { show(k); }); });
    btn.addEventListener('click', function () {
      paused = !paused; btn.setAttribute('aria-pressed', paused);
      var s = $('.sr', btn); s.setAttribute('data-i18n', paused ? 't_v9_play' : 't_v9_pause'); s.textContent = T(paused ? 't_v9_play' : 't_v9_pause', paused ? 'Play' : 'Pause');
      t0 = performance.now() - elapsed;
    });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; t0 = performance.now() - elapsed; }, { threshold: .3 }).observe($('.v9-pr__box'));
    (function loop(now) {
      if (!paused && visible && !document.hidden) {
        elapsed = now - t0;
        $('i b', tabs[i]).style.width = Math.min(100, elapsed / DUR * 100) + '%';
        if (elapsed >= DUR) show(i + 1);
      } else t0 = now - elapsed;
      requestAnimationFrame(loop);
    })(performance.now());
    show(0);
  })();

  /* ---------- process cards: earlier cards sink as the next one lands ---------- */
  function initProcess() {
    if (!G || !ST || reduce) return;
    var cards = $$('.v9-ps__card');
    cards.forEach(function (c, k) {
      if (k === cards.length - 1) return;
      G.to(c, { scale: .94, filter: 'brightness(.6)', ease: 'none', scrollTrigger: { trigger: cards[k + 1], start: 'top bottom-=10%', end: 'top 30%', scrub: true } });
    });
  }

  /* ---------- section heads: lift words in ---------- */
  function initParallax() {
    if (!G || !ST || reduce) return;
    G.to('.v9-glow--a', { yPercent: 30, ease: 'none', scrollTrigger: { trigger: '.v9-hero', start: 'top top', end: 'bottom top', scrub: true } });
    G.to('#v9Stage', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: '.v9-hero', start: 'top top', end: 'bottom top', scrub: true } });
    G.from('.v9-cta__title', { scale: .86, ease: 'none', scrollTrigger: { trigger: '.v9-cta', start: 'top bottom', end: 'center center', scrub: true } });
  }

  /* ---------- hero intro ---------- */
  function heroIntro() {
    var lines = $$('.v9-line > span'), bits = $$('[data-hero]');
    if (G && !reduce) {
      var tl = G.timeline({ defaults: { ease: 'expo.out' } });
      tl.from(lines, { yPercent: 110, duration: 1.3, stagger: .1 })
        .from(bits, { y: 30, opacity: 0, duration: 1.1, stagger: .08 }, '-=1')
        .add(introFan, '-=1.1')
        .from('.v9-marquee', { opacity: 0, duration: 1 }, '-=.8');
    } else introFan();
  }

  /* ---------- preloader ---------- */
  function preloader(done) {
    var pre = $('#v9Pre');
    if (!doc.classList.contains('v9-pre-on') || !pre) { done(); return; }
    try { sessionStorage.setItem('v9-seen', '1'); } catch (e) {}
    var num = $('#v9PreNum'), bar = $('#v9PreBar'), start = performance.now(), MIN = 1400, loaded = document.readyState === 'complete', v = 0;
    window.addEventListener('load', function () { loaded = true; });
    setTimeout(function () { loaded = true; }, 4000);
    (function tick(now) {
      var t = Math.min(1, (now - start) / MIN), target = loaded ? 100 * t : Math.min(88, 100 * t);
      v += (target - v) * .18; if (loaded && t >= 1 && v > 99.4) v = 100;
      num.textContent = Math.round(v); bar.style.width = v + '%';
      if (v < 100) return requestAnimationFrame(tick);
      if (G) {
        G.to(pre, { yPercent: -100, duration: 1, ease: 'expo.inOut', delay: .15, onComplete: function () { pre.remove(); doc.classList.remove('v9-pre-on'); } });
        setTimeout(done, 550);
      } else { pre.remove(); doc.classList.remove('v9-pre-on'); done(); }
    })(start);
  }

  /* ---------- boot ---------- */
  if (G && !reduce) { G.set('.v9-line > span', { yPercent: 110 }); G.set('[data-hero]', { opacity: 0 }); }
  var dataReady = window.VELIX && window.VELIX.ready ? window.VELIX.ready.catch(function () {}) : Promise.resolve();
  dataReady.then(function () {
    try { projects = (window.VELIX.projects.featured().length ? window.VELIX.projects.featured() : window.VELIX.projects.all()) || []; } catch (e) { projects = []; }
    var allCount = 0; try { allCount = window.VELIX.projects.all().length; } catch (e) {}
    var pc = $('#v9ProjCount');
    if (pc) { if (allCount > 0) pc.setAttribute('data-to', allCount); else pc.closest('.v9-stat').style.display = 'none'; }
    loaded = true; buildFan(); buildWork();
  }).then(function () {
    if (G) { G.set('.v9-line > span', { clearProps: 'all' }); G.set('[data-hero]', { clearProps: 'all' }); }
    preloader(function () { heroIntro(); initCounters(); initProcess(); initParallax(); if (ST) ST.refresh(); });
  });

  // Re-render text built in JS when the language changes
  document.addEventListener('velix:langchange', function () { buildWork(); placeFan(false); });
})();
