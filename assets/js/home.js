/* ==========================================================================
   VELIX — homepage v7 controller (no libraries)
   - Reveals sections once as they enter the viewport. Nothing is pinned,
     so the page always scrolls at the visitor's own speed.
   - Lights up service cards where the pointer is.
   - Turns the header solid once the hero has passed.
   - Hides "Selected work" if there are no published projects yet, rather
     than showing an empty section.
   ========================================================================== */
(function () {
  'use strict';
  var doc = document.documentElement;
  var body = document.body;
  doc.classList.add('js');

  function reveal() {
    var items = document.querySelectorAll('[data-rv]');
    // Stagger siblings that share a parent so groups arrive in sequence
    var groups = new Map();
    items.forEach(function (el) {
      var p = el.parentElement, i = groups.get(p) || 0;
      el.style.setProperty('--d', (Math.min(i, 5) * 0.08) + 's');
      groups.set(p, i + 1);
    });
    if (!('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  function header() {
    var hero = document.querySelector('.h-hero');
    if (!hero || !('IntersectionObserver' in window)) { body.classList.add('past-hero'); return; }
    new IntersectionObserver(function (entries) {
      body.classList.toggle('past-hero', !entries[0].isIntersecting);
    }, { rootMargin: '-80px 0px 0px 0px', threshold: 0 }).observe(hero);
  }

  function spotlight() {
    if (!window.matchMedia('(hover: hover)').matches) return;
    document.querySelectorAll('.h-svc').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  function emptyWork() {
    var grid = document.getElementById('homeFeaturedGrid');
    var section = document.getElementById('portfolio');
    if (!grid || !section) return;
    function check() {
      var hasCards = !!grid.querySelector('.portfolio-card');
      var empty = grid.querySelector('.portfolio-empty');
      var loading = empty && /loading|جار/i.test(empty.textContent || '');
      section.classList.toggle('is-empty', !hasCards && !loading);
    }
    new MutationObserver(check).observe(grid, { childList: true, subtree: true });
    setTimeout(function () { if (!grid.querySelector('.portfolio-card')) section.classList.add('is-empty'); }, 6000);
  }

  function init() { reveal(); header(); spotlight(); emptyWork(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
