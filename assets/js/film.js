/* ==========================================================================
   VELIX — "How a website is made", drawn live on <canvas>
   One continuous shot in four chapters, driven by a single value t (0 → 1):
     Code (0.04–0.32) → Design (0.32–0.56) → Security (0.56–0.78) → Launch (0.78–1)
   No video files: everything is drawn, so it is sharp on every screen and
   weighs a few kilobytes.
   ========================================================================== */
(function (global) {
  'use strict';

  var C = {
    bg: '#050506', panel: '#111317', panel2: '#191C21', line: 'rgba(237,238,240,0.2)',
    text: '#EDEEF0', soft: '#8D939B', faint: 'rgba(237,238,240,0.35)', ghost: 'rgba(237,238,240,0.08)',
    ok: '#46D39A', threat: '#FF5C5C'
  };
  var MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  var SANS = 'Archivo, "Helvetica Neue", Arial, sans-serif';
  var KUFI = '"Noto Kufi Arabic", "IBM Plex Sans Arabic", Tahoma, sans-serif';

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function lerp(a, b, p) { return a + (b - a) * p; }
  function easeOut(p) { return 1 - Math.pow(1 - p, 3); }
  function easeInOut(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // deterministic pseudo-random
  function rnd(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  /* The code that gets "typed" in chapter 1 ------------------------------ */
  var CODE = [
    [['<', 't'], ['html', 'k'], [' lang', 'a'], ['="ar"', 's'], [' dir', 'a'], ['="rtl"', 's'], ['>', 't']],
    [['  <', 't'], ['header', 'k'], [' class', 'a'], ['="nav"', 's'], ['>', 't']],
    [['    <', 't'], ['a', 'k'], [' href', 'a'], ['="/"', 's'], ['>', 't'], ['شركتك', 'x'], ['</', 't'], ['a', 'k'], ['>', 't']],
    [['  </', 't'], ['header', 'k'], ['>', 't']],
    [['  <', 't'], ['main', 'k'], ['>', 't']],
    [['    <', 't'], ['h1', 'k'], ['>', 't'], ['مصمم لعملائك', 'x'], ['</', 't'], ['h1', 'k'], ['>', 't']],
    [['    <', 't'], ['a', 'k'], [' class', 'a'], ['="btn"', 's'], ['>', 't'], ['Get started', 'x'], ['</', 't'], ['a', 'k'], ['>', 't']],
    [['  </', 't'], ['main', 'k'], ['>', 't']],
    [['</', 't'], ['html', 'k'], ['>', 't']],
    [['', 't']],
    [['.', 't'], ['btn', 'k'], [' { ', 't'], ['background', 'a'], [': ', 't'], ['#EDEEF0', 's'], ['; }', 't']],
    [['@media', 'k'], [' (', 't'], ['max-width', 'a'], [': ', 't'], ['640px', 's'], [') { … }', 't']]
  ];
  var CODE_TOTAL = CODE.reduce(function (n, line) { return n + line.reduce(function (m, tk) { return m + tk[0].length; }, 0) + 1; }, 0);
  var TONE = { t: C.faint, k: C.text, a: C.soft, s: '#C3C9D1', x: C.text };

  /* Page layout assembled in chapter 2 (unit coordinates inside the window body) */
  var BLOCKS = [
    { x: 0.05, y: 0.05, w: 0.18, h: 0.06, kind: 'logo' },
    { x: 0.55, y: 0.065, w: 0.08, h: 0.03, kind: 'link' },
    { x: 0.66, y: 0.065, w: 0.08, h: 0.03, kind: 'link' },
    { x: 0.77, y: 0.045, w: 0.18, h: 0.07, kind: 'btn' },
    { x: 0.05, y: 0.22, w: 0.5, h: 0.2, kind: 'title' },
    { x: 0.05, y: 0.46, w: 0.42, h: 0.035, kind: 'text' },
    { x: 0.05, y: 0.52, w: 0.34, h: 0.035, kind: 'text' },
    { x: 0.05, y: 0.61, w: 0.2, h: 0.08, kind: 'btn' },
    { x: 0.6, y: 0.2, w: 0.35, h: 0.5, kind: 'image' },
    { x: 0.05, y: 0.77, w: 0.28, h: 0.18, kind: 'card' },
    { x: 0.36, y: 0.77, w: 0.28, h: 0.18, kind: 'card' },
    { x: 0.67, y: 0.77, w: 0.28, h: 0.18, kind: 'card' }
  ];

  function create(canvas) {
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, dpr = 1;
    var lang = 'en';
    var rtlPage = false;

    function resize() {
      dpr = Math.min(global.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function stage() {
      var mobile = W < 760;
      var ww = mobile ? Math.min(W * 0.86, 460) : Math.min(W * 0.48, 880);
      var wh = ww * 0.64;
      var cx = mobile ? W / 2 : (rtlPage ? W * 0.29 : W * 0.71);
      var cy = mobile ? H * 0.3 : H * 0.44;
      return { x: cx - ww / 2, y: cy - wh / 2, w: ww, h: wh, cx: cx, cy: cy, k: ww / 700, mobile: mobile };
    }

    function background(t, s) {
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      // a quiet dot field that drifts with the story
      var gap = 34, off = (t * 120) % gap;
      ctx.fillStyle = 'rgba(237,238,240,0.06)';
      for (var y = -gap; y < H + gap; y += gap) {
        for (var x = -gap; x < W + gap; x += gap) {
          var dx = x + off, dy = y + off * 0.4;
          var d = Math.hypot(dx - s.cx, dy - s.cy);
          var a = clamp(1 - d / (Math.max(W, H) * 0.7), 0, 1);
          if (a <= 0.02) continue;
          ctx.globalAlpha = a;
          ctx.fillRect(dx, dy, 1.2, 1.2);
        }
      }
      ctx.globalAlpha = 1;
      // soft light behind the window
      var g = ctx.createRadialGradient(s.cx, s.cy, 0, s.cx, s.cy, s.w * 0.9);
      g.addColorStop(0, 'rgba(210,220,235,0.07)'); g.addColorStop(1, 'rgba(210,220,235,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }

    function lockIcon(x, y, size, closed, color) {
      ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = Math.max(1.2, size * 0.14);
      var bw = size * 0.8, bh = size * 0.6;
      rr(ctx, x - bw / 2, y - bh / 2 + size * 0.15, bw, bh, size * 0.12); ctx.fill();
      ctx.beginPath();
      var shackleLift = (1 - closed) * size * 0.28;
      ctx.arc(x, y - size * 0.12 - shackleLift, size * 0.26, Math.PI, 0);
      ctx.lineTo(x + size * 0.26, y + size * 0.05 - shackleLift * (closed < 1 ? 0.6 : 0));
      ctx.moveTo(x - size * 0.26, y - size * 0.12 - shackleLift); ctx.lineTo(x - size * 0.26, y + size * 0.05);
      ctx.stroke(); ctx.restore();
    }

    function windowChrome(s, title, lockClosed, alpha) {
      var bar = 30 * s.k + 6;
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20;
      rr(ctx, s.x, s.y, s.w, s.h, 12 * s.k + 4); ctx.fillStyle = C.panel; ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
      // top bar
      ctx.beginPath(); ctx.moveTo(s.x, s.y + bar); ctx.lineTo(s.x + s.w, s.y + bar); ctx.strokeStyle = C.line; ctx.stroke();
      for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(s.x + 16 * s.k + 8 + i * (14 * s.k + 4), s.y + bar / 2, 3.2 * s.k + 1.5, 0, 7); ctx.fillStyle = 'rgba(237,238,240,0.18)'; ctx.fill(); }
      // address pill
      var pw = s.w * 0.46, ph = bar * 0.56, px = s.x + s.w / 2 - pw / 2, py = s.y + (bar - ph) / 2;
      rr(ctx, px, py, pw, ph, ph / 2); ctx.fillStyle = C.panel2; ctx.fill();
      var fs = Math.max(9, 11 * s.k + 2);
      ctx.font = '500 ' + fs + 'px ' + SANS; ctx.fillStyle = C.soft; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var hasLock = lockClosed >= 0;
      ctx.fillText(title, px + pw / 2 + (hasLock ? fs * 0.6 : 0), py + ph / 2 + 0.5);
      if (hasLock) {
        var tw = ctx.measureText(title).width;
        lockIcon(px + pw / 2 - tw / 2 - fs * 0.4, py + ph / 2, fs * 0.95, lockClosed, lockClosed > 0.95 ? C.ok : C.soft);
      }
      ctx.restore();
      return { x: s.x, y: s.y + bar, w: s.w, h: s.h - bar };
    }

    /* Chapter 1: code typing ---------------------------------------------- */
    function drawCode(body, s, p, alpha, clock) {
      if (alpha <= 0) return;
      ctx.save(); ctx.globalAlpha = alpha;
      rr(ctx, body.x + 1, body.y, body.w - 2, body.h - 1, 10 * s.k); ctx.clip();
      var fs = Math.max(8.5, 13.5 * s.k), lh = fs * 1.62;
      var x0 = body.x + 44 * s.k + 10, y0 = body.y + 22 * s.k + 8;
      var budget = Math.floor(p * CODE_TOTAL);
      var lastX = x0, lastY = y0;
      ctx.textBaseline = 'top';
      for (var i = 0; i < CODE.length; i++) {
        var y = y0 + i * lh;
        if (y > body.y + body.h - lh * 0.6) break;
        ctx.font = fs * 0.85 + 'px ' + MONO; ctx.fillStyle = 'rgba(237,238,240,0.18)'; ctx.textAlign = 'right';
        ctx.fillText(String(i + 1), x0 - 14 * s.k - 4, y + 1);
        ctx.textAlign = 'left';
        var x = x0;
        for (var j = 0; j < CODE[i].length && budget > 0; j++) {
          var tk = CODE[i][j], txt = tk[0];
          var shown = txt.slice(0, Math.min(txt.length, budget)); budget -= shown.length;
          var arabic = tk[1] === 'x' && /[؀-ۿ]/.test(txt);
          ctx.font = (arabic ? '500 ' + fs * 1.02 + 'px ' + KUFI : fs + 'px ' + MONO);
          ctx.fillStyle = TONE[tk[1]];
          if (arabic) { ctx.direction = 'rtl'; ctx.textAlign = 'right'; var aw = ctx.measureText(txt).width; ctx.fillText(shown, x + aw, y - fs * 0.12); ctx.direction = 'ltr'; ctx.textAlign = 'left'; x += aw; }
          else { ctx.fillText(shown, x, y); x += ctx.measureText(shown).width; }
        }
        if (budget >= 0) { lastX = x; lastY = y; }
        budget -= 1;
        if (budget < 0) break;
      }
      // caret
      if (Math.floor(clock / 530) % 2 === 0 || (p > 0 && p < 1)) { ctx.fillStyle = C.text; ctx.fillRect(lastX + 1, lastY, Math.max(1.5, 2 * s.k), fs * 1.15); }
      ctx.restore();
    }

    /* Chapter 2: the page assembles, then flips to Arabic ------------------ */
    function pageBlocks(body, s, p, flip, alpha, opts) {
      if (alpha <= 0) return;
      opts = opts || {};
      ctx.save(); ctx.globalAlpha = alpha;
      rr(ctx, body.x + 1, body.y, body.w - 2, body.h - 1, 10 * s.k); ctx.clip();
      var pad = 0;
      for (var i = 0; i < BLOCKS.length; i++) {
        var b = BLOCKS[i];
        var appear = opts.instant ? 1 : seg(p, i * 0.045, i * 0.045 + 0.28);
        if (appear <= 0) continue;
        var e = easeOut(appear);
        var bx = lerp(b.x, 1 - b.x - b.w, easeInOut(flip));
        var x = body.x + bx * body.w, y = body.y + b.y * body.h + (1 - e) * 14 * s.k, w = b.w * body.w, h = b.h * body.h;
        var outline = clamp(appear * 2, 0, 1), fill = clamp(appear * 2 - 1, 0, 1);
        ctx.lineWidth = 1;
        // wireframe first
        ctx.strokeStyle = 'rgba(237,238,240,' + (0.35 * outline * (1 - fill * 0.7)) + ')';
        ctx.setLineDash([4, 4]); rr(ctx, x, y, w, h, 4 * s.k); ctx.stroke(); ctx.setLineDash([]);
        if (fill <= 0) continue;
        ctx.globalAlpha = alpha * fill;
        switch (b.kind) {
          case 'logo':
            ctx.beginPath(); ctx.arc(x + h / 2, y + h / 2, h * 0.38, 0, 7); ctx.strokeStyle = C.text; ctx.lineWidth = Math.max(1.5, h * 0.16); ctx.stroke();
            ctx.fillStyle = C.soft; rr(ctx, x + h * 1.1, y + h * 0.3, w - h * 1.2, h * 0.4, 2); ctx.fill(); break;
          case 'link': ctx.fillStyle = 'rgba(237,238,240,0.3)'; rr(ctx, x, y + h * 0.3, w, h * 0.4, 2); ctx.fill(); break;
          case 'btn': ctx.fillStyle = C.text; rr(ctx, x, y, w, h, 4 * s.k); ctx.fill(); break;
          case 'title':
            ctx.fillStyle = C.text;
            var fs = Math.max(11, h * 0.36);
            var ar = flip > 0.5;
            ctx.font = (ar ? '600 ' + fs * 0.95 + 'px ' + KUFI : '600 ' + fs + 'px ' + SANS);
            ctx.textBaseline = 'top';
            ctx.direction = ar ? 'rtl' : 'ltr'; ctx.textAlign = ar ? 'right' : 'left';
            var tx = ar ? x + w : x;
            var lines = ar ? ['مصمم', 'لعملائك.'] : ['Built for', 'your customers.'];
            var swap = 1 - Math.abs(flip - 0.5) * 2; // dips at the moment of the flip
            ctx.globalAlpha = alpha * fill * Math.max(0, 1 - swap * 1.6);
            ctx.fillText(lines[0], tx, y + (ar ? -fs * 0.1 : 0));
            ctx.fillText(lines[1], tx, y + fs * (ar ? 1.15 : 1.1));
            ctx.direction = 'ltr'; ctx.textAlign = 'left';
            break;
          case 'text': ctx.fillStyle = 'rgba(237,238,240,0.28)'; rr(ctx, x, y, w, h, 2); ctx.fill(); break;
          case 'image':
            var g = ctx.createLinearGradient(x, y, x + w, y + h);
            g.addColorStop(0, '#2A2E34'); g.addColorStop(1, '#14161A');
            ctx.fillStyle = g; rr(ctx, x, y, w, h, 6 * s.k); ctx.fill();
            // a ring, quietly, like the VELIX mark
            ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.24, 0, 7); ctx.strokeStyle = 'rgba(237,238,240,0.5)'; ctx.lineWidth = Math.min(w, h) * 0.06; ctx.stroke();
            break;
          case 'card':
            ctx.fillStyle = C.panel2; rr(ctx, x, y, w, h, 5 * s.k); ctx.fill();
            ctx.fillStyle = 'rgba(237,238,240,0.25)'; rr(ctx, x + w * 0.1, y + h * 0.25, w * 0.5, h * 0.14, 2); ctx.fill();
            ctx.fillStyle = 'rgba(237,238,240,0.12)'; rr(ctx, x + w * 0.1, y + h * 0.55, w * 0.75, h * 0.12, 2); ctx.fill();
            break;
        }
        ctx.globalAlpha = alpha;
      }
      ctx.restore();
    }

    /* Chapter 3: shield, scan, threats bouncing off ------------------------ */
    function security(s, body, p, fade) {
      if (p <= 0 || fade <= 0) return;
      var gapA = 22 * s.k + 10, gapB = gapA + 10 * s.k + 6;
      var hx = s.w / 2 + gapA, hy = s.h / 2 + gapA;
      ctx.save(); ctx.globalAlpha = fade;
      // the shield draws itself around the site (a rounded frame, traced clockwise)
      var draw = easeOut(seg(p, 0, 0.35));
      function frame(off, r) {
        ctx.beginPath(); rr(ctx, s.cx - s.w / 2 - off, s.cy - s.h / 2 - off, s.w + off * 2, s.h + off * 2, r);
      }
      var perim = 2 * (s.w + s.h + gapA * 4);
      ctx.setLineDash([perim * draw, perim]); frame(gapA, 18 * s.k + 6);
      ctx.strokeStyle = 'rgba(237,238,240,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.setLineDash([2, 6]); frame(gapB, 24 * s.k + 8);
      ctx.strokeStyle = 'rgba(237,238,240,' + (0.14 * draw) + ')'; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
      // threats arrive from outside and stop at the shield
      var N = 16;
      for (var i = 0; i < N; i++) {
        var start = 0.18 + rnd(i) * 0.55, life = 0.22;
        var q = seg(p, start, start + life);
        if (q <= 0 || q >= 1) continue;
        var ang = rnd(i + 40) * Math.PI * 2;
        var ca = Math.abs(Math.cos(ang)) || 1e-6, sa = Math.abs(Math.sin(ang)) || 1e-6;
        var R = Math.min(hx / ca, hy / sa);              // where this direction meets the shield
        var far = Math.max(W, H) * 0.8;
        var travel = clamp(q / 0.7, 0, 1);
        var d = lerp(far, R, easeInOut(travel));
        var px = s.cx + Math.cos(ang) * d, py = s.cy + Math.sin(ang) * d;
        if (q < 0.7) {
          var tx = s.cx + Math.cos(ang) * (d + 46 * s.k + 10), ty = s.cy + Math.sin(ang) * (d + 46 * s.k + 10);
          var g = ctx.createLinearGradient(tx, ty, px, py); g.addColorStop(0, 'rgba(255,92,92,0)'); g.addColorStop(1, 'rgba(255,92,92,0.85)');
          ctx.strokeStyle = g; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(px, py); ctx.stroke();
          ctx.fillStyle = C.threat; ctx.beginPath(); ctx.arc(px, py, 2.6, 0, 7); ctx.fill();
        } else {
          var f = (q - 0.7) / 0.3;
          ctx.strokeStyle = 'rgba(237,238,240,' + (0.85 * (1 - f)) + ')'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(px, py, 4 + f * 18 * s.k, 0, 7); ctx.stroke();
        }
      }
      // a scan line passes over the page
      var scan = seg(p, 0.25, 0.65);
      if (scan > 0 && scan < 1) {
        var sy = body.y + body.h * scan;
        var sg = ctx.createLinearGradient(0, sy - 40 * s.k, 0, sy);
        sg.addColorStop(0, 'rgba(237,238,240,0)'); sg.addColorStop(1, 'rgba(237,238,240,0.16)');
        ctx.save(); rr(ctx, body.x, body.y, body.w, body.h, 8); ctx.clip();
        ctx.fillStyle = sg; ctx.fillRect(body.x, sy - 40 * s.k, body.w, 40 * s.k);
        ctx.fillStyle = 'rgba(237,238,240,0.6)'; ctx.fillRect(body.x, sy, body.w, 1);
        ctx.restore();
      }
      ctx.restore();
    }

    function checklist(s, p, fade, labels) {
      if (p <= 0 || fade <= 0 || s.mobile) return;
      var fs = Math.max(11, 13 * s.k + 3);
      ctx.save(); ctx.globalAlpha = fade;
      ctx.font = '500 ' + fs + 'px ' + (lang === 'ar' ? KUFI : SANS); ctx.textBaseline = 'middle';
      var ph = fs * 2.3, colW = s.w / 2 - 8;
      var top = s.y + s.h + 22 * s.k + 10 + 24 * s.k + 18;   // below the shield frame
      for (var i = 0; i < labels.length; i++) {
        var q = easeOut(seg(p, 0.35 + i * 0.12, 0.5 + i * 0.12));
        if (q <= 0) continue;
        var col = i % 2, row = Math.floor(i / 2);
        if (rtlPage) col = 1 - col;
        var bx = s.x + col * (colW + 16), y = top + row * (ph + 10) + ph / 2 + (1 - q) * 10;
        ctx.globalAlpha = fade * q;
        rr(ctx, bx, y - ph / 2, colW, ph, ph / 2); ctx.fillStyle = 'rgba(17,19,23,0.92)'; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
        var cx = rtlPage ? bx + colW - fs * 1.2 : bx + fs * 1.2, cy = y;
        ctx.beginPath(); ctx.arc(cx, cy, fs * 0.58, 0, 7); ctx.fillStyle = 'rgba(70,211,154,0.16)'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx - fs * 0.25, cy); ctx.lineTo(cx - fs * 0.05, cy + fs * 0.2); ctx.lineTo(cx + fs * 0.28, cy - fs * 0.2);
        ctx.strokeStyle = C.ok; ctx.lineWidth = 1.8; ctx.stroke();
        ctx.fillStyle = C.text;
        if (rtlPage) { ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.fillText(labels[i], bx + colW - fs * 2.2, y + 1); }
        else { ctx.direction = 'ltr'; ctx.textAlign = 'left'; ctx.fillText(labels[i], bx + fs * 2.2, y + 1); }
        ctx.direction = 'ltr';
      }
      ctx.restore();
    }

    /* Chapter 4: launch on laptop + phone --------------------------------- */
    function launch(s, p, liveLabel) {
      if (p <= 0) return;
      var e = easeOut(p);
      ctx.save();
      // laptop base
      ctx.globalAlpha = e;
      var bw = s.w * 1.16, bh = 14 * s.k + 6;
      ctx.beginPath();
      ctx.moveTo(s.cx - s.w / 2 - 2, s.y + s.h + 2);
      ctx.lineTo(s.cx + s.w / 2 + 2, s.y + s.h + 2);
      ctx.lineTo(s.cx + bw / 2, s.y + s.h + bh);
      ctx.lineTo(s.cx - bw / 2, s.y + s.h + bh);
      ctx.closePath();
      var g = ctx.createLinearGradient(0, s.y + s.h, 0, s.y + s.h + bh); g.addColorStop(0, '#2B2F35'); g.addColorStop(1, '#16181B');
      ctx.fillStyle = g; ctx.fill();
      ctx.fillStyle = 'rgba(237,238,240,0.15)'; rr(ctx, s.cx - s.w * 0.08, s.y + s.h + 2, s.w * 0.16, bh * 0.25, 2); ctx.fill();

      // phone slides in beside the laptop
      var phH = s.h * 0.92, phW = phH * 0.5;
      var side = (s.mobile ? 1 : (rtlPage ? -1 : 1));
      var targetX = s.mobile ? s.x + s.w - phW * 0.92 : (side > 0 ? s.x + s.w - phW * 0.7 : s.x - phW * 0.3);
      var px = lerp(targetX + side * 60 * s.k, targetX, e), py = s.y + s.h + bh - phH + 4;
      ctx.globalAlpha = e;
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
      rr(ctx, px, py, phW, phH, phW * 0.16); ctx.fillStyle = '#0B0C0E'; ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(237,238,240,0.28)'; ctx.lineWidth = 1.2; ctx.stroke();
      var inset = phW * 0.07;
      var screen = { x: px + inset, y: py + inset * 2.2, w: phW - inset * 2, h: phH - inset * 3.2 };
      // mobile layout of the same page, in Arabic
      ctx.save(); rr(ctx, screen.x, screen.y, screen.w, screen.h, phW * 0.08); ctx.clip();
      ctx.fillStyle = C.panel; ctx.fillRect(screen.x, screen.y, screen.w, screen.h);
      ctx.fillStyle = C.text;
      var u = screen.w;
      ctx.beginPath(); ctx.arc(screen.x + u * 0.85, screen.y + u * 0.13, u * 0.06, 0, 7); ctx.strokeStyle = C.text; ctx.lineWidth = u * 0.025; ctx.stroke();
      ctx.fillStyle = 'rgba(237,238,240,0.3)'; rr(ctx, screen.x + u * 0.08, screen.y + u * 0.1, u * 0.14, u * 0.05, 1); ctx.fill();
      ctx.font = '600 ' + u * 0.11 + 'px ' + KUFI; ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillStyle = C.text;
      ctx.fillText('مصمم', screen.x + u * 0.9, screen.y + u * 0.32);
      ctx.fillText('لعملائك.', screen.x + u * 0.9, screen.y + u * 0.48);
      ctx.direction = 'ltr'; ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(237,238,240,0.25)'; rr(ctx, screen.x + u * 0.25, screen.y + u * 0.72, u * 0.65, u * 0.04, 1); ctx.fill();
      ctx.fillStyle = C.text; rr(ctx, screen.x + u * 0.42, screen.y + u * 0.84, u * 0.48, u * 0.12, u * 0.03); ctx.fill();
      var ig = ctx.createLinearGradient(0, screen.y + u * 1.05, 0, screen.y + u * 1.7); ig.addColorStop(0, '#2A2E34'); ig.addColorStop(1, '#14161A');
      ctx.fillStyle = ig; rr(ctx, screen.x + u * 0.08, screen.y + u * 1.05, u * 0.84, u * 0.62, u * 0.05); ctx.fill();
      ctx.restore();

      // "Live" status under the laptop
      var lp = easeOut(seg(p, 0.35, 0.7));
      if (lp > 0) {
        ctx.globalAlpha = lp;
        var fs = Math.max(11, 13 * s.k + 3);
        ctx.font = '600 ' + fs + 'px ' + (lang === 'ar' ? KUFI : SANS); ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
        var ly = s.y + s.h + bh + fs * 2.4;
        var tw = ctx.measureText(liveLabel).width;
        ctx.fillStyle = C.ok; ctx.beginPath(); ctx.arc(s.cx - tw / 2 - fs * 0.8, ly, fs * 0.3, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(s.cx - tw / 2 - fs * 0.8, ly, fs * 0.3 + (1 - (Date.now() % 1600) / 1600) * fs * 0.6, 0, 7);
        ctx.strokeStyle = 'rgba(70,211,154,' + ((Date.now() % 1600) / 1600 * 0.6) + ')'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = C.text; ctx.direction = lang === 'ar' ? 'rtl' : 'ltr';
        ctx.fillText(liveLabel, s.cx + fs * 0.2, ly + 1);
        ctx.direction = 'ltr';
      }
      ctx.restore();
    }

    /* Compose one frame --------------------------------------------------- */
    var copy = {
      en: { editor: 'index.html', site: 'yourbusiness.com', live: 'Live, fast and protected', checks: ['HTTPS everywhere', 'Firewall & hardened forms', 'Automated backups', 'Monthly security check'] },
      ar: { editor: 'index.html', site: 'yourbusiness.com', live: 'الموقع يعمل، سريع ومحمي', checks: ['اتصال مشفّر HTTPS', 'جدار حماية ونماذج محصّنة', 'نسخ احتياطي تلقائي', 'فحص أمني شهري'] }
    };

    function render(t, clock) {
      if (!W) resize();
      var s = stage();
      background(t, s);
      var L = copy[lang] || copy.en;

      var intro = easeOut(seg(t, 0, 0.05));
      var pCode = seg(t, 0.04, 0.3);
      var pDesign = seg(t, 0.32, 0.56);
      var pSec = seg(t, 0.56, 0.78);
      var pLaunch = seg(t, 0.78, 0.96);

      // window position eases slightly up when the laptop arrives
      var lift = easeInOut(pLaunch) * s.h * 0.08;
      s.y -= lift; s.cy -= lift;
      if (!s.mobile) { var shift = easeInOut(pLaunch) * s.w * 0.08 * (rtlPage ? 1 : -1); s.x += shift; s.cx += shift; }
      var appearScale = lerp(0.94, 1, intro || (t > 0 ? 1 : 0));
      if (appearScale !== 1) {
        ctx.save(); ctx.translate(s.cx, s.cy); ctx.scale(appearScale, appearScale); ctx.translate(-s.cx, -s.cy);
      }

      var title = t < 0.33 ? L.editor : L.site;
      var lock = t < 0.6 ? (t < 0.33 ? -1 : 0) : easeOut(seg(t, 0.62, 0.7));
      security(s, { x: s.x, y: s.y + 36 * s.k, w: s.w, h: s.h - 36 * s.k }, pSec, 1 - seg(t, 0.8, 0.9) * 0.85);
      var body = windowChrome(s, title, lock, Math.max(0.0001, t <= 0 ? 1 : 1));

      var codeAlpha = 1 - seg(t, 0.32, 0.38);
      drawCode(body, s, t < 0.04 ? 0 : pCode, codeAlpha, clock);
      var flip = seg(pDesign, 0.62, 0.9);
      pageBlocks(body, s, seg(pDesign, 0.05, 0.62), flip, seg(t, 0.34, 0.38));

      if (appearScale !== 1) ctx.restore();

      checklist(s, pSec, 1 - seg(t, 0.8, 0.86), L.checks);
      launch(s, pLaunch, L.live);

      // vignette
      var v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      v.addColorStop(0, 'rgba(5,5,6,0)'); v.addColorStop(1, 'rgba(5,5,6,0.7)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }

    return {
      resize: resize,
      render: render,
      setLang: function (l) { lang = l === 'ar' ? 'ar' : 'en'; rtlPage = lang === 'ar'; }
    };
  }

  global.VelixFilm = { create: create };
})(window);
