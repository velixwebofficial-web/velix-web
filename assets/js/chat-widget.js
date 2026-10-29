/* ==========================================================================
   VELIX — AI chat assistant widget (v3)
   - Talks to /api/chat (Claude) through VELIX_CONFIG.apiBase, streaming.
   - Sends live site facts (published project count + titles) so the AI only
     ever quotes the real number.
   - Renders light markdown (bold, bullets, links), auto text direction.
   - Booking: the AI books the free consultation; the visitor confirms it on
     WhatsApp with one tap (works on any host, nothing gets lost).
   - If the AI is unreachable, a bilingual keyword assistant answers instead,
     tuned for Jordanian/Gulf dialect, and always offers WhatsApp/booking.
   ========================================================================== */
(function () {
  'use strict';
  var CFG = window.VELIX_CONFIG || {};
  var API = (CFG.apiBase || '').replace(/\/$/, '') + '/api/chat';
  var WA = '962799691748';
  var CONTACT = { phone: '+962 79 969 1748', email: 'hello@velixweb.xyz', wa: 'https://wa.me/' + WA, ig: 'https://www.instagram.com/velix.web/' };

  function lang() { return (window.VELIX_I18N && window.VELIX_I18N.getLang) ? window.VELIX_I18N.getLang() : (document.documentElement.lang === 'ar' ? 'ar' : 'en'); }

  /* ---------------- strings ---------------- */
  var STR = {
    en: {
      open: 'Chat with VELIX', name: 'VELIX Assistant', status: 'Online · replies in seconds', close: 'Close chat',
      placeholder: 'Ask about prices, projects, booking…', send: 'Send',
      greeting: "Hi! I'm the VELIX assistant. I can tell you about our work, prices and the technologies we use, or book you a free 30-minute consultation.",
      quick: ['What are your prices?', 'How many projects have you done?', 'Which technologies do you use?', 'Book a free consultation'],
      bookTitle: 'Consultation requested', bookConfirm: 'Confirm on WhatsApp', bookNote: 'Tap the button to send us the booking. We will confirm right away.',
      methods: { video: 'Video call', phone: 'Phone call', whatsapp: 'WhatsApp call' },
      quoteTitle: 'Indicative price', quoteRef: 'Ref', startingFrom: 'Starting from', perMonth: '/ month', quoteNote: 'Starting price. The final price is confirmed in writing after the free consultation.',
      human: 'Talk to the team directly:', waBtn: 'WhatsApp', callBtn: 'Call', bookBtn: 'Book a consultation',
      retry: "Sorry, I couldn't finish that reply. Please try again, or message us on WhatsApp.",
      fallbackUnknown: "Good question. The team can answer that exactly. Message us on WhatsApp or book a free consultation:"
    },
    ar: {
      open: 'احكِ مع VELIX', name: 'مساعد VELIX', status: 'متصل · بيرد خلال ثواني', close: 'إغلاق المحادثة',
      placeholder: 'اسأل عن الأسعار، المشاريع، الحجز…', send: 'إرسال',
      greeting: 'أهلاً! أنا مساعد VELIX. بقدر أحكيلك عن شغلنا وأسعارنا والتقنيات اللي بنشتغل فيها، أو أحجزلك استشارة مجانية مدتها 30 دقيقة.',
      quick: ['كم الأسعار؟', 'كم مشروع اشتغلتوا؟', 'شو التقنيات اللي بتستخدموها؟', 'بدي أحجز استشارة'],
      bookTitle: 'تم طلب الاستشارة', bookConfirm: 'أكّد على واتساب', bookNote: 'اكبس الزر لتبعتلنا الحجز، وبنأكدلك فوراً.',
      methods: { video: 'مكالمة فيديو', phone: 'مكالمة هاتفية', whatsapp: 'مكالمة واتساب' },
      quoteTitle: 'سعر تقديري', quoteRef: 'المرجع', startingFrom: 'يبدأ من', perMonth: '/ شهرياً', quoteNote: 'هذا سعر يبدأ من. السعر النهائي بيتأكد كتابياً بعد الاستشارة المجانية.',
      human: 'احكِ مع الفريق مباشرة:', waBtn: 'واتساب', callBtn: 'اتصال', bookBtn: 'احجز استشارة',
      retry: 'آسف، ما قدرت أكمّل الرد. جرّب كمان مرة، أو راسلنا على واتساب.',
      fallbackUnknown: 'سؤال حلو، والفريق بيجاوبك عليه بالزبط. راسلنا على واتساب أو احجز استشارة مجانية:'
    }
  };
  function s(k) { var t = STR[lang()] || STR.en; return t[k] !== undefined ? t[k] : STR.en[k]; }

  /* ---------------- site facts ---------------- */
  function siteFacts() {
    try {
      var all = (window.VELIX && VELIX.projects && VELIX.projects.all) ? VELIX.projects.all() : [];
      return { projectCount: all.length, projects: all.slice(0, 30).map(function (p) { return p.title; }) };
    } catch (e) { return null; }
  }

  /* ---------------- fallback (no AI) ---------------- */
  function norm(t) {
    return (t || '').toLowerCase()
      .replace(/[ً-ْـ]/g, '')          // harakat + tatweel
      .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي');
  }
  function projectsAnswer() {
    var f = siteFacts(); var n = f && f.projectCount;
    if (lang() === 'ar') return n ? 'منشور على موقعنا حالياً <strong>' + n + '</strong> مشاريع، منها: ' + f.projects.slice(0, 4).join('، ') + '. شوفها كلها بصفحة <a href="portfolio.html">أعمالنا</a>.' : 'بتقدر تشوف مشاريعنا بصفحة <a href="portfolio.html">أعمالنا</a>.';
    return n ? 'We currently have <strong>' + n + '</strong> projects on our site, including ' + f.projects.slice(0, 4).join(', ') + '. See them all on the <a href="portfolio.html">Portfolio page</a>.' : 'You can see our work on the <a href="portfolio.html">Portfolio page</a>.';
  }
  var FAQ = [
    { k: ['price', 'cost', 'how much', 'pricing', 'budget', 'quote', 'سعر', 'اسعار', 'بكم', 'قديش', 'قداش', 'كم بكلف', 'بكلف', 'تكلف', 'كلفه', 'تكلفه', 'فلوس', 'مصاري', 'دينار', 'باقه', 'باقات'],
      en: 'Our starting prices (JOD):<ul><li>Landing page from <strong>200</strong></li><li>Business website from <strong>350</strong> (Professional from 650)</li><li>Online store from <strong>400</strong> (Advanced from 800)</li><li>Signature cinematic website from <strong>900</strong></li><li>Web systems and dashboards from <strong>1,500</strong></li></ul>The final price is confirmed in writing after a free consultation.',
      ar: 'أسعارنا تبدأ من (بالدينار):<ul><li>صفحة هبوط من <strong>200</strong></li><li>موقع شركة من <strong>350</strong> (الاحترافي من 650)</li><li>متجر إلكتروني من <strong>400</strong> (المتقدم من 800)</li><li>موقع سينمائي مخصص من <strong>900</strong></li><li>أنظمة ويب ولوحات تحكم من <strong>1,500</strong></li></ul>والسعر النهائي بيتأكد كتابياً بعد استشارة مجانية.' },
    { k: ['how many projects', 'projects have you', 'portfolio', 'previous work', 'your work', 'examples', 'كم مشروع', 'مشاريع', 'مشروع اشتغلتو', 'اعمالكم', 'اعمال', 'شغلكم', 'نماذج', 'بورتفوليو'], fn: projectsAnswer },
    { k: ['technolog', 'tech', 'stack', 'language', 'framework', 'database', 'react', 'next', 'node', 'wordpress', 'تقنيات', 'تقنيه', 'لغات', 'لغه برمجه', 'برمجه', 'داتابيز', 'قاعده بيانات', 'قواعد بيانات', 'بتستخدمو', 'بتشتغلو فيه'],
      en: 'We pick the stack per project:<ul><li><strong>Front-end:</strong> HTML, CSS, JavaScript, TypeScript, React, Next.js, Tailwind CSS, GSAP</li><li><strong>Back-end:</strong> Node.js, REST APIs</li><li><strong>Databases:</strong> PostgreSQL, SQLite</li><li><strong>CMS:</strong> WordPress or a custom dashboard</li><li><strong>Hosting:</strong> Vercel, GitHub</li></ul>',
      ar: 'بنختار التقنية حسب المشروع:<ul><li><strong>الواجهة:</strong> HTML وCSS وJavaScript وTypeScript وReact وNext.js وTailwind CSS وGSAP</li><li><strong>الخلفية:</strong> Node.js وREST APIs</li><li><strong>قواعد البيانات:</strong> PostgreSQL وSQLite</li><li><strong>إدارة المحتوى:</strong> WordPress أو لوحة تحكم خاصة</li><li><strong>الاستضافة:</strong> Vercel وGitHub</li></ul>' },
    { k: ['book', 'appointment', 'meeting', 'consult', 'call me', 'schedule', 'احجز', 'حجز', 'موعد', 'استشاره', 'اجتماع', 'ميتنج', 'كول', 'اتصلو'],
      en: 'The consultation is <strong>free, 30 minutes</strong>, Saturday to Thursday, 10:00–17:00 Amman time, by video, phone or WhatsApp. Pick a time on the <a href="book.html">booking page</a>.',
      ar: 'الاستشارة <strong>مجانية ومدتها 30 دقيقة</strong>، من السبت للخميس، من 10 الصبح لـ 5 المسا بتوقيت عمّان، فيديو أو تلفون أو واتساب. اختار موعدك من <a href="book.html">صفحة الحجز</a>.' },
    { k: ['how long', 'timeline', 'duration', 'delivery', 'weeks', 'days', 'مده', 'وقت', 'قديش بياخد', 'كم يوم', 'كم اسبوع', 'متى بتسلمو', 'تسليم'],
      en: 'Typically: landing pages <strong>1–2 weeks</strong>, business websites <strong>2–4 weeks</strong>, stores and platforms <strong>4–8 weeks</strong>. We confirm a firm date after a short scoping chat.',
      ar: 'عادةً: صفحة الهبوط <strong>1–2 أسبوع</strong>، موقع الشركة <strong>2–4 أسابيع</strong>، المتاجر والأنظمة <strong>4–8 أسابيع</strong>. والموعد النهائي بنحدده بعد ما نفهم مشروعك.' },
    { k: ['service', 'what do you do', 'offer', 'store', 'shop', 'ecommerce', 'website', 'خدمات', 'شو بتعملو', 'شو بتقدمو', 'متجر', 'موقع', 'بدي موقع', 'بدي متجر', 'تطبيق'],
      en: 'We design, build and secure: business websites, online stores, landing pages, cinematic brand websites, and web systems with dashboards. Tell me what you have in mind and I will suggest the right fit.',
      ar: 'بنصمّم وبنبني وبنحمي: مواقع شركات، متاجر إلكترونية، صفحات هبوط، مواقع سينمائية للبراندات، وأنظمة ويب بلوحات تحكم. احكيلي شو ببالك وبقترحلك الأنسب.' },
    { k: ['security', 'secure', 'hack', 'protect', 'ssl', 'https', 'حمايه', 'امان', 'اختراق', 'هكر'],
      en: 'Security is built in: HTTPS, hardened forms, rate limiting, secure admin sign-in, updates and backups. There is also a monthly protection plan with a written report (35 JOD/month).',
      ar: 'الحماية جزء من البناء: HTTPS، ونماذج محمية، وحد للطلبات، ودخول آمن للوحة التحكم، وتحديثات ونسخ احتياطية. وفي كمان خطة حماية شهرية مع تقرير مكتوب (35 دينار بالشهر).' },
    { k: ['hosting', 'domain', 'maintenance', 'support', 'استضافه', 'دومين', 'صيانه', 'دعم'],
      en: 'We can handle hosting and domain for you. Our care plan (15 JOD/month or 150/year) covers hosting, updates, backups and small edits.',
      ar: 'بنقدر نتكفّل بالاستضافة والدومين. وخطة الرعاية (15 دينار بالشهر أو 150 بالسنة) بتشمل الاستضافة والتحديثات والنسخ الاحتياطي والتعديلات الصغيرة.' },
    { k: ['contact', 'phone', 'whatsapp', 'email', 'number', 'تواصل', 'رقم', 'واتس', 'ايميل', 'تلفون', 'هاتف'],
      en: 'WhatsApp or call <strong>' + CONTACT.phone + '</strong>, or email <strong>' + CONTACT.email + '</strong>.',
      ar: 'واتساب أو اتصال على <strong dir="ltr">' + CONTACT.phone + '</strong>، أو إيميل <strong>' + CONTACT.email + '</strong>.' },
    { k: ['hello', 'hi', 'hey', 'salam', 'مرحبا', 'هلا', 'السلام', 'اهلين', 'صباح', 'مسا'],
      en: 'Hello! How can I help? You can ask about prices, our projects, technologies, or booking a consultation.',
      ar: 'أهلاً وسهلاً! كيف بقدر أساعدك؟ اسألني عن الأسعار، أو مشاريعنا، أو التقنيات، أو احجز استشارة.' }
  ];
  function fallbackAnswer(text) {
    var t = norm(text), best = null, score = 0;
    FAQ.forEach(function (f) {
      var sc = 0; f.k.forEach(function (k) { if (t.indexOf(norm(k)) !== -1) sc += k.length > 4 ? 2 : 1; });
      if (sc > score) { score = sc; best = f; }
    });
    if (!best) return null;
    return best.fn ? best.fn() : (lang() === 'ar' ? best.ar : best.en);
  }

  /* ---------------- rendering ---------------- */
  function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
  function md(text) {
    var lines = esc(text).split('\n'), out = [], list = false;
    lines.forEach(function (l) {
      var m = /^\s*(?:[-•*]|\d+[.)])\s+(.*)$/.exec(l);
      if (m) { if (!list) { out.push('<ul>'); list = true; } out.push('<li>' + m[1] + '</li>'); return; }
      if (list) { out.push('</ul>'); list = false; }
      out.push(l ? l + '<br>' : '<br>');
    });
    if (list) out.push('</ul>');
    return out.join('')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(https?:\/\/[^\s<]+[^\s<.,،)])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/(<br>)+$/, '');
  }
  function actionsHTML() {
    return '<div class="vc-actions"><a class="vc-act vc-act--wa" href="' + CONTACT.wa + '" target="_blank" rel="noopener">' + s('waBtn') + '</a>' +
      '<a class="vc-act" href="book.html">' + s('bookBtn') + '</a><a class="vc-act" href="tel:+' + WA + '">' + s('callBtn') + '</a></div>';
  }
  function bookingCard(r) {
    var b = r.booking, ar = lang() === 'ar';
    var days = { Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء', Wednesday: 'الأربعاء', Thursday: 'الخميس', Saturday: 'السبت' };
    var day = ar ? (days[b.weekday] || b.weekday) : b.weekday;
    return '<div class="vc-card"><div class="vc-card__t">' + s('bookTitle') + '</div>' +
      '<div class="vc-row"><span>' + esc(day) + ' · ' + esc(b.date) + '</span><b dir="ltr">' + String(b.hour).padStart(2, '0') + ':00</b></div>' +
      '<div class="vc-row"><span>' + esc(s('methods')[b.method] || b.method) + '</span><b>' + esc(b.name) + '</b></div>' +
      '<a class="vc-cta" href="' + esc(r.whatsappUrl) + '" target="_blank" rel="noopener">' + s('bookConfirm') + '</a>' +
      '<p class="vc-note">' + s('bookNote') + '</p></div>';
  }
  function quoteCard(q) {
    var ar = lang() === 'ar';
    var nm = function (x) { return esc(ar && x.name_ar ? x.name_ar : x.name); };
    var rows = '<div class="vc-row"><span>' + nm(q.package) + '</span><b>' + s('startingFrom') + ' ' + q.package.price + ' ' + q.currency + '</b></div>';
    (q.addons || []).forEach(function (a) {
      rows += '<div class="vc-row"><span>' + nm(a) + '</span><b>' + (a.price === null ? '—' : a.price + ' ' + q.currency + (a.unit === 'per_month' ? ' ' + s('perMonth') : '')) + '</b></div>';
    });
    return '<div class="vc-card"><div class="vc-card__t">' + s('quoteTitle') + ' <small>' + s('quoteRef') + ' ' + esc(q.referenceNumber) + '</small></div>' + rows + '<p class="vc-note">' + s('quoteNote') + '</p></div>';
  }

  /* ---------------- widget ---------------- */
  function injectCSS() {
    if (document.getElementById('vc-css')) return;
    var l = document.createElement('link'); l.id = 'vc-css'; l.rel = 'stylesheet';
    var me = document.querySelector('script[src*="chat-widget"]');
    l.href = me ? me.getAttribute('src').replace(/js\/chat-widget\.js.*$/, 'css/chat.css') : 'assets/css/chat.css';
    document.head.appendChild(l);
  }

  function init() {
    if (!window.VELIX) return;
    injectCSS();
    var root = document.createElement('div');
    root.className = 'vc';
    root.innerHTML =
      '<button class="vc-toggle" type="button" aria-expanded="false"><span class="vc-toggle__ring"></span>' +
        '<svg class="vc-i-chat" viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>' +
        '<svg class="vc-i-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
      '<section class="vc-panel" role="dialog" aria-modal="false">' +
        '<header class="vc-head"><div class="vc-avatar">V</div><div class="vc-who"><strong class="vc-name"></strong><span class="vc-status"></span></div>' +
          '<button class="vc-close" type="button"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>' +
        '<div class="vc-body" aria-live="polite"></div>' +
        '<div class="vc-quick"></div>' +
        '<form class="vc-form"><input class="vc-input" type="text" autocomplete="off" maxlength="1500"><button class="vc-send" type="submit"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></form>' +
      '</section>';
    document.body.appendChild(root);

    var toggle = root.querySelector('.vc-toggle'), panel = root.querySelector('.vc-panel'), body = root.querySelector('.vc-body');
    var quick = root.querySelector('.vc-quick'), form = root.querySelector('.vc-form'), input = root.querySelector('.vc-input');
    var history = [], state = 'discovery', aiDown = false, busy = false;
    var convId = VELIX.uid ? VELIX.uid('conv') : 'conv_' + Date.now(), transcript = [];

    function labels() {
      toggle.setAttribute('aria-label', s('open'));
      panel.setAttribute('aria-label', s('name'));
      root.querySelector('.vc-name').textContent = s('name');
      root.querySelector('.vc-status').textContent = s('status');
      root.querySelector('.vc-close').setAttribute('aria-label', s('close'));
      input.placeholder = s('placeholder'); input.setAttribute('aria-label', s('placeholder'));
      root.querySelector('.vc-send').setAttribute('aria-label', s('send'));
      root.setAttribute('dir', lang() === 'ar' ? 'rtl' : 'ltr');
    }
    labels();

    function scroll() { body.scrollTop = body.scrollHeight; }
    function bubble(html, who) {
      var b = document.createElement('div'); b.className = 'vc-b vc-b--' + who; b.setAttribute('dir', 'auto'); b.innerHTML = html;
      body.appendChild(b); scroll(); return b;
    }
    function typing() { var t = document.createElement('div'); t.className = 'vc-b vc-b--bot vc-typing'; t.innerHTML = '<i></i><i></i><i></i>'; body.appendChild(t); scroll(); return t; }
    function record(text, who) {
      transcript.push({ text: text, who: who, at: new Date().toISOString() });
      try { VELIX.conversations.save({ id: convId, messages: transcript }); } catch (e) {}
    }
    function renderQuick() {
      quick.innerHTML = s('quick').map(function (q) { return '<button type="button" class="vc-chip" dir="auto">' + esc(q) + '</button>'; }).join('');
      Array.prototype.forEach.call(quick.children, function (b) { b.addEventListener('click', function () { send(b.textContent); }); });
    }

    function fallback(text) {
      var t = typing();
      setTimeout(function () {
        t.remove();
        var a = fallbackAnswer(text);
        if (a) { bubble(a, 'bot'); record(a, 'bot'); }
        else { bubble(s('fallbackUnknown') + actionsHTML(), 'bot'); record('[fallback: actions]', 'bot'); }
      }, 500 + Math.random() * 300);
    }

    async function ai(text) {
      var t = typing(), b = null, acc = '';
      try {
        var r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: VELIX.session ? VELIX.session.getToken() : convId, message: text, history: history, state: state, lang: lang(), siteFacts: siteFacts() }) });
        if (!r.ok || !r.body) { var e = new Error('http'); e.down = true; throw e; }
        var reader = r.body.getReader(), dec = new TextDecoder(), buf = '', errored = false;
        t.remove();
        while (true) {
          var chunk = await reader.read(); if (chunk.done) break;
          buf += dec.decode(chunk.value, { stream: true });
          var lines = buf.split('\n'); buf = lines.pop();
          lines.forEach(function (line) {
            if (!line.trim()) return; var ev; try { ev = JSON.parse(line); } catch (x) { return; }
            if (ev.type === 'text') { if (!b) b = bubble('', 'bot'); acc += ev.delta; b.innerHTML = md(acc); scroll(); }
            else if (ev.type === 'tool_result' && ev.result && ev.result.success) {
              if (ev.tool === 'book_consultation') { bubble(bookingCard(ev.result), 'bot'); b = null; acc += '\n'; }
              else if (ev.tool === 'generate_quote') { bubble(quoteCard(ev.result.quote), 'bot'); b = null; acc += '\n'; }
              else if (ev.tool === 'escalate_to_human') { bubble(s('human') + actionsHTML(), 'bot'); b = null; acc += '\n'; }
            }
            else if (ev.type === 'done') { state = ev.state || state; }
            else if (ev.type === 'error') { errored = true; }
          });
        }
        if (errored && !acc.trim()) bubble(s('retry') + actionsHTML(), 'bot');
        if (acc.trim()) { history.push({ role: 'user', content: text }, { role: 'assistant', content: acc.trim() }); history = history.slice(-20); record(acc.trim(), 'bot'); }
      } catch (err) {
        t.remove();
        if (b) b.remove();
        if (err && err.down) aiDown = true; // only a missing/broken endpoint switches to the offline assistant
        else if (!err || err.name !== 'TypeError') { bubble(s('retry') + actionsHTML(), 'bot'); return; }
        aiDown = true;
        fallback(text);
      }
    }

    async function send(text) {
      text = (text || '').trim(); if (!text || busy) return;
      busy = true; quick.innerHTML = '';
      bubble(esc(text), 'user'); record(text, 'user'); input.value = '';
      if (aiDown || !CFG.aiEnabled) fallback(text); else await ai(text);
      busy = false;
    }

    function open(v) {
      panel.classList.toggle('is-open', v); toggle.classList.toggle('is-open', v); toggle.setAttribute('aria-expanded', v ? 'true' : 'false');
      if (v && !body.dataset.greeted) { body.dataset.greeted = '1'; var g = s('greeting'); bubble(g, 'bot'); record(g, 'bot'); renderQuick(); }
      if (v && matchMedia('(min-width: 700px)').matches) setTimeout(function () { input.focus(); }, 250);
    }
    toggle.addEventListener('click', function () { open(!panel.classList.contains('is-open')); });
    root.querySelector('.vc-close').addEventListener('click', function () { open(false); });
    form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('is-open')) open(false); });
    document.addEventListener('velix:langchange', function () { labels(); if (quick.childElementCount) renderQuick(); });
    window.VELIX_CHAT = { open: function () { open(true); } };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
