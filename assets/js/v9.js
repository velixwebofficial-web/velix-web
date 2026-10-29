/* VELIX v9 — shared behaviour on every public page:
   scroll progress bar, header hide-on-scroll, reveal-on-scroll, and
   automatic reveal hooks for the existing inner-page components. */
(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.add('js-v9');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Progress bar
  var bar = document.createElement('div');
  bar.className = 'v9-progress';
  document.body.appendChild(bar);

  var nav = document.querySelector('.navbar');
  var lastY = window.scrollY, ticking = false;
  function onScroll() {
    var y = window.scrollY, h = doc.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, y / h) : 0) + ')';
    if (nav) {
      nav.classList.toggle('is-scrolled', y > 24);
      var menuOpen = document.body.classList.contains('nav-open');
      if (!menuOpen && y > 400 && y > lastY + 6) nav.classList.add('v9-hide');
      else if (y < lastY - 6 || y < 400) nav.classList.remove('v9-hide');
    }
    lastY = y; ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // Auto-tag inner-page components so they reveal like the homepage
  var auto = '.page-header .container > *, .section-head, .service-card, .value-card, .testimonial-card, .narrative-card, .process-step, .faq-item, .about-timeline-item, .service-detail > .container > *, .contact-info-item, .contact-form-card, .quote-card, .cta-band, .founder, .svc-row';
  if (!document.body.classList.contains('home')) {
    document.querySelectorAll(auto).forEach(function (el) { if (!el.closest('[data-rv]')) el.setAttribute('data-rv', ''); });
  }

  function reveal() {
    var items = document.querySelectorAll('[data-rv]:not(.in)');
    var groups = new Map();
    items.forEach(function (el) {
      var p = el.parentElement, i = groups.get(p) || 0;
      el.style.setProperty('--d', (Math.min(i, 6) * 0.07) + 's');
      groups.set(p, i + 1);
    });
    if (reduce || !('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) {
      // Anything already on screen at load shows straight away
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0 && !document.body.classList.contains('home')) el.classList.add('in');
      else io.observe(el);
    });
  }
  window.VELIX_V9 = { reveal: reveal };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', reveal); else reveal();
  // Portfolio cards render later from data — pick them up too
  document.addEventListener('velix:projects-rendered', reveal);

  // Menu always opens at the top
  var mnav = document.getElementById('mobileNav');
  if (mnav && 'MutationObserver' in window) new MutationObserver(function () {
    if (mnav.classList.contains('is-open')) { var b = mnav.querySelector('.mobile-nav-body'); if (b) b.scrollTop = 0; }
  }).observe(mnav, { attributes: true, attributeFilter: ['class'] });

  // Any [data-open-chat] button opens the assistant
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-open-chat]');
    if (b && window.VELIX_CHAT) { e.preventDefault(); window.VELIX_CHAT.open(); }
  });
})();
