/* ==========================================================================
   VELIX — cinematic homepage controller
   - Scroll position drives the drawn film (assets/js/film.js).
   - One caption is on screen at a time, like subtitles.
   - Chapter buttons under the film jump to each part.
   Requires gsap + ScrollTrigger (assets/vendor).
   ========================================================================== */
(function () {
  'use strict';

  var body = document.body;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Caption windows on the film's 0→1 timeline: [in, out]
  var CAPS = [
    { sel: '.c-cap-intro', from: -1, to: 0.06 },
    { sel: '.c-cap-ch[data-ch="1"]', from: 0.09, to: 0.3 },
    { sel: '.c-cap-ch[data-ch="2"]', from: 0.34, to: 0.54 },
    { sel: '.c-cap-ch[data-ch="3"]', from: 0.58, to: 0.76 },
    { sel: '.c-cap-ch[data-ch="4"]', from: 0.8, to: 2 }
  ];
  var CHAPTERS = [[0.04, 0.32], [0.32, 0.56], [0.56, 0.78], [0.78, 1]];

  function lang() { return document.documentElement.getAttribute('lang') === 'ar' ? 'ar' : 'en'; }

  function initFilm() {
    var section = document.querySelector('.c-hero');
    var canvas = document.getElementById('filmCanvas');
    if (!section || !canvas || !window.VelixFilm) return;
    var film = VelixFilm.create(canvas);
    film.setLang(lang());
    film.resize();

    var caps = CAPS.map(function (c) { return { el: section.querySelector(c.sel), from: c.from, to: c.to, on: false }; });
    var chaps = Array.prototype.slice.call(section.querySelectorAll('.c-chap'));
    var target = 0, current = 0, visible = true, raf = 0;

    function setCaptions(t) {
      caps.forEach(function (c) {
        var on = t >= c.from && t < c.to;
        if (on === c.on || !c.el) return;
        c.on = on;
        c.el.classList.toggle('is-on', on);
      });
      chaps.forEach(function (b, i) {
        var r = CHAPTERS[i];
        var p = Math.max(0, Math.min(1, (t - r[0]) / (r[1] - r[0])));
        b.style.setProperty('--p', p.toFixed(3));
        b.classList.toggle('is-current', t >= r[0] && t < r[1]);
      });
    }

    function frame(now) {
      raf = 0;
      current += (target - current) * (reduced ? 1 : 0.14);
      if (Math.abs(target - current) < 0.0004) current = target;
      film.render(current, now || 0);
      setCaptions(current);
      // keep animating while catching up, or for the caret blink / live pulse
      if (visible) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && visible) raf = requestAnimationFrame(frame); }

    if (typeof ScrollTrigger !== 'undefined' && !reduced) {
      ScrollTrigger.create({
        trigger: section, start: 'top top', end: 'bottom bottom',
        onUpdate: function (self) { target = self.progress; kick(); },
        onToggle: function (self) { visible = true; kick(); }
      });
      ScrollTrigger.create({
        trigger: section, start: 'bottom top+=80',
        onEnter: function () { body.classList.add('past-hero'); },
        onLeaveBack: function () { body.classList.remove('past-hero'); }
      });
    }

    // Only animate while the film is on screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting; if (visible) kick();
      }).observe(section.querySelector('.c-hero-pin'));
    }

    // Chapter buttons scroll to the middle of each chapter
    chaps.forEach(function (b, i) {
      b.addEventListener('click', function () {
        var r = CHAPTERS[i];
        var mid = r[0] + (r[1] - r[0]) * 0.55;
        var y = section.offsetTop + (section.offsetHeight - window.innerHeight) * mid;
        window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
      });
    });

    window.addEventListener('resize', function () { film.resize(); kick(); });
    document.addEventListener('velix:langchange', function () { film.setLang(lang()); kick(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(kick);

    if (reduced) { target = current = 0.97; body.classList.add('past-hero'); }
    kick();
  }

  function initServices() {
    var items = Array.prototype.slice.call(document.querySelectorAll('.c-svc'));
    var num = document.getElementById('cSvcNum');
    if (!items.length || typeof ScrollTrigger === 'undefined') return;
    items[0].classList.add('is-active');
    items.forEach(function (item) {
      ScrollTrigger.create({
        trigger: item, start: 'top 60%', end: 'bottom 40%',
        onToggle: function (self) {
          if (!self.isActive) return;
          items.forEach(function (x) { x.classList.toggle('is-active', x === item); });
          if (num) num.textContent = item.getAttribute('data-n');
        }
      });
    });
  }

  function initProcess() {
    var fill = document.getElementById('cTrackFill');
    if (!fill || typeof gsap === 'undefined') return;
    gsap.fromTo(fill, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.c-process', start: 'top 70%', end: 'bottom 70%', scrub: 0.5 } });
  }

  function initBreak() {
    var section = document.querySelector('.c-break');
    if (!section || typeof gsap === 'undefined') return;
    var frame = section.querySelector('.c-break-frame');
    var img = section.querySelector('.c-break-frame img');
    var lines = section.querySelectorAll('.c-break-title span');
    gsap.timeline({ scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.7 } })
      .fromTo(frame, { clipPath: 'inset(48% 38% 48% 38% round 4px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 0.5, ease: 'none' }, 0)
      .fromTo(img, { scale: 1.5 }, { scale: 1, duration: 0.7, ease: 'none' }, 0)
      .fromTo(lines, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.14, stagger: 0.08, ease: 'power3.out' }, 0.5)
      .to({}, { duration: 0.2 }, 0.8);
  }

  function init() {
    if (reduced || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') body.classList.add('reduced');
    else { gsap.registerPlugin(ScrollTrigger); ScrollTrigger.config({ ignoreMobileResize: true }); }
    initFilm();
    if (!body.classList.contains('reduced')) { initServices(); initProcess(); initBreak(); }
    document.addEventListener('velix:langchange', function () { if (window.ScrollTrigger) ScrollTrigger.refresh(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
