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
      methods: { zoom: 'Zoom', video: 'Google Meet', phone: 'Phone call', whatsapp: 'WhatsApp call' },
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
      methods: { zoom: 'زوم', video: 'Google Meet', phone: 'مكالمة تلفون', whatsapp: 'مكالمة واتساب' },
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
    var f = siteFacts(), n = f && f.projectCount, done = CFG.projectsDone || 79;
    var some = n ? f.projects.slice(0, 4).join(lang() === 'ar' ? '، ' : ', ') : '';
    if (lang() === 'ar') return 'اشتغلنا <strong>أكثر من ' + done + ' مشروع</strong> من أول ما بلّشنا' + (n ? '، ومنشور منهم على موقعنا <strong>' + n + '</strong> مشاريع، منها: ' + some + '.' : '.') + ' شوفهم بصفحة <a href="portfolio.html">أعمالنا</a>.';
    return 'We have delivered <strong>' + done + '+ projects</strong> since we started' + (n ? ', and <strong>' + n + '</strong> of them are published on our website, including ' + some + '.' : '.') + ' See them on the <a href="portfolio.html">Portfolio page</a>.';
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

  /* ---------------- offline booking engine ----------------
     Understands one-shot requests like "بدي موعد بكرا زوم الساعة 11" or
     "book me Sunday at 2pm on WhatsApp", confirms the slot, then asks only
     for what is missing (day → time → method → name → phone) and hands
     back a WhatsApp confirmation + calendar file. Rules match booking.json. */
  var BK = (function () {
    var DAY_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    var DAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var WD = [
      [0, ['الاحد', 'احد', 'sunday', 'sun']], [1, ['الاثنين', 'اثنين', 'الاتنين', 'اتنين', 'تنين', 'monday', 'mon']],
      [2, ['الثلاثاء', 'الثلاثا', 'ثلاثا', 'التلاتا', 'تلاتا', 'tuesday', 'tue']], [3, ['الاربعاء', 'الاربعا', 'اربعا', 'wednesday', 'wed']],
      [4, ['الخميس', 'خميس', 'thursday', 'thu']], [5, ['الجمعه', 'جمعه', 'friday', 'fri']], [6, ['السبت', 'سبت', 'saturday', 'sat']]
    ];
    var NUMW = { 'وحده': 1, 'واحده': 1, 'ثنتين': 2, 'تنتين': 2, 'اثنتين': 2, 'ثلاث': 3, 'تلات': 3, 'اربع': 4, 'اربعه': 4, 'خمس': 5, 'خمسه': 5, 'عشر': 10, 'عشره': 10, 'حداش': 11, 'احدعش': 11, 'احدعشر': 11, 'اطنعش': 12, 'اتناعش': 12, 'ثنعش': 12, 'تنعش': 12 };
    function digits(t) { return String(t).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; }).replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; }); }
    function N(t) { return norm(digits(t)); }
    function has(t, list) { return list.some(function (w) { return new RegExp('(^|[^\\u0600-\\u06FFa-z])' + w + '($|[^\\u0600-\\u06FFa-z])').test(t); }); }
    // Amman is UTC+3 all year: work in "Amman wall-clock" UTC fields
    function nowA() { return new Date(Date.now() + 3 * 3600e3); }
    function dayStart(offset) { var n = nowA(); return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + offset); }
    function wd(ms) { return new Date(ms).getUTCDay(); }
    function iso(ms) { var d = new Date(ms); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); }
    function slotUTC(day, hour) { return day + (hour - 3) * 3600e3; }

    function intent(text) {
      var t = N(text);
      return /(احجز|حجز|موعد|مواعيد|استشار|اجتماع|ميتنج|ميتينج|زوم|zoom|book|appoint|meeting|schedule|consult)/.test(t);
    }
    function parse(text, opts) {
      opts = opts || {};
      var t = ' ' + N(text) + ' ', out = {};
      // day
      if (/بعد ?بكر|بعد ?غد|after tomorrow/.test(t)) out.day = dayStart(2);
      else if (/بكرا|بكره|بكرة|بكير بكرا|غدا|بالغد|tomorrow|tmrw/.test(t)) out.day = dayStart(1);
      else if (/اليوم|هلا اليوم|today|tonight/.test(t)) out.day = dayStart(0);
      else {
        WD.forEach(function (w) {
          if (out.day == null && has(t, w[1])) { var off = (w[0] - wd(dayStart(0)) + 7) % 7; out.day = dayStart(off); out.dayAsked = w[0]; out.sameWeekday = off === 0; }
        });
        var dm = /(\d{1,2})\s*[\/\-.]\s*(\d{1,2})(?:\s*[\/\-.]\s*(\d{2,4}))?/.exec(t);
        if (out.day == null && dm) {
          var n = nowA(), y = dm[3] ? (+dm[3] < 100 ? 2000 + +dm[3] : +dm[3]) : n.getUTCFullYear();
          var ms = Date.UTC(y, +dm[2] - 1, +dm[1]);
          if (!dm[3] && ms < dayStart(0)) ms = Date.UTC(y + 1, +dm[2] - 1, +dm[1]);
          out.day = ms;
        }
      }
      // time
      var tt = t.replace(/(\d{1,2})\s*[\/\-.]\s*(\d{1,2})(\s*[\/\-.]\s*\d{2,4})?/, ' ');
      var m = /(?:الساعه|ساعه|الساعة|ع الساعه|عالساعه|at|@)\s*(\d{1,2})(?::(\d{2}))?/.exec(tt) || /(\d{1,2}):(\d{2})/.exec(tt) || /(\d{1,2})\s*(am|pm|ص|م|الصبح|صباحا|الظهر|ظهرا|العصر|عصرا|المسا|مساء|مساءا|بالليل)/.exec(tt);
      var h = null, min = 0;
      if (m) { h = +m[1]; min = m[2] && /^\d+$/.test(m[2]) ? +m[2] : 0; }
      else { Object.keys(NUMW).forEach(function (w) { if (h == null && has(tt, ['الساعه ' + w, 'ع ' + w, w + ' الصبح', w + ' العصر', w + ' المسا', w + ' الظهر'])) h = NUMW[w]; }); }
      if (h == null && opts.awaitHour) { var lone = /^\s*(\d{1,2})\s*$/.exec(tt); if (lone) h = +lone[1]; }
      if (h != null && h <= 24) {
        var pm = /(pm|العصر|عصرا|المسا|مساء|بالليل|الظهر|ظهرا|\sم\s)/.test(tt), am = /(am|الصبح|صباحا|\sص\s)/.test(tt);
        if (pm && h < 12) h += 12; else if (!am && h >= 1 && h <= 6) h += 12;
        out.hour = h; out.minute = min;
      }
      // method
      if (/زوم|zoom/.test(t)) out.method = 'zoom';
      else if (/جوجل ميت|google meet|\bmeet\b|ميت|فيديو|video/.test(t)) out.method = 'video';
      else if (/واتس|whats ?app/.test(t)) out.method = 'whatsapp';
      else if (/تلفون|تليفون|هاتف|اتصال|اتصل|مكالمه عادي|phone|call me|normal call/.test(t)) out.method = 'phone';
      // phone
      var ph = digits(text).replace(/[\s\-()]/g, '').match(/\+?\d{7,15}/);
      if (ph) out.phone = ph[0];
      // name
      var nm = /(?:اسمي|انا اسمي|my name is|this is)\s+([^\d,،.!?؟]{2,40})/i.exec(text);
      if (nm) out.name = nm[1].trim().split(/\s+/).slice(0, 3).join(' ');
      return out;
    }
    function hourLabel(h, ar) {
      var hh = h % 12 || 12;
      if (!ar) return hh + ':00 ' + (h < 12 ? 'AM' : 'PM');
      return hh + ':00 ' + (h < 12 ? 'الصبح' : h < 14 ? 'الظهر' : h < 17 ? 'العصر' : 'المسا');
    }
    function dayLabel(day, ar) {
      var d = wd(day), rel = (day - dayStart(0)) / 864e5;
      var name = ar ? DAY_AR[d] : DAY_EN[d], dt = new Date(day), short = dt.getUTCDate() + '/' + (dt.getUTCMonth() + 1);
      if (rel === 0) return (ar ? 'اليوم ' : 'today, ') + name + ' ' + short;
      if (rel === 1) return (ar ? 'بكرا ' : 'tomorrow, ') + name + ' ' + short;
      return name + ' ' + short;
    }
    // first valid hour on a day (or null)
    function firstHour(day) { for (var h = 10; h <= 16; h++) if (slotUTC(day, h) - Date.now() >= 2 * 3600e3) return h; return null; }
    function nextDays(n) { var out = []; for (var o = 0; o <= 14 && out.length < n; o++) { var d = dayStart(o); if (wd(d) !== 5 && firstHour(d) != null) out.push(d); } return out; }
    function checkDay(day) {
      if (day < dayStart(0)) return 'past';
      if (day > dayStart(14)) return 'far';
      if (wd(day) === 5) return 'friday';
      if (firstHour(day) == null) return 'full';
      return null;
    }
    function checkSlot(day, hour) {
      if (hour < 10 || hour > 16) return 'hours';
      if (slotUTC(day, hour) - Date.now() < 2 * 3600e3) return 'soon';
      return null;
    }
    function ics(b) {
      var st = new Date(slotUTC(b.day, b.hour)), en = new Date(st.getTime() + 30 * 6e4);
      var f = function (d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); };
      var body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//VELIX//Booking//EN', 'BEGIN:VEVENT', 'UID:' + Date.now() + '@velixweb.xyz', 'DTSTAMP:' + f(new Date()), 'DTSTART:' + f(st), 'DTEND:' + f(en),
        'SUMMARY:VELIX — Free consultation', 'DESCRIPTION:Free 30-minute consultation with VELIX Web Solutions. WhatsApp +962799691748', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(body);
    }
    return { intent: intent, parse: parse, hourLabel: hourLabel, dayLabel: dayLabel, nextDays: nextDays, firstHour: firstHour, checkDay: checkDay, checkSlot: checkSlot, ics: ics, iso: iso, wd: wd, dayStart: dayStart, DAY_AR: DAY_AR, DAY_EN: DAY_EN };
  })();

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
      '<div class="vc-ok">' + (ar ? '✓ انحجز موعدك ووصلنا' : '✓ Booked — we have it') + '</div></div>';
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

    /* ---------- offline booking conversation ---------- */
    var bk = null;
    var BT = {
      ar: {
        askDay: 'أكيد! 🙌 أي يوم بناسبك؟', askHour: 'وأي ساعة بتناسبك؟ مواعيدنا من <strong>10 الصبح</strong> لـ <strong>4 العصر</strong> بتوقيت عمّان.',
        askMethod: 'كيف بتحب نحكي؟ <strong>زوم</strong>، <strong>Google Meet</strong>، <strong>تلفون</strong> ولا <strong>واتساب</strong>؟',
        askName: 'عشان أثبتلك الموعد، شو اسمك الكريم؟', askPhone: 'تشرفنا يا <strong>{n}</strong>! شو رقم تلفونك (واتساب)؟ عشان نبعتلك التأكيد{z}.',
        zoomLink: ' ورابط الاجتماع', badPhone: 'الرقم مش واضح معي 🙏 اكتبه أرقام بس، مثلاً <span dir="ltr">0791234567</span>.',
        friday: 'الجمعة إجازة عنا 🙂 شو رأيك بيوم من هدول؟', past: 'هاد اليوم راح 😅 اختار يوم من هدول:', far: 'منحجز لحد أسبوعين لقدّام بس. اختار يوم أقرب:',
        full: 'مواعيد اليوم خلصت. شو رأيك بكرا أو يوم ثاني؟', hours: 'مواعيدنا من <strong>10 الصبح</strong> لـ <strong>4 العصر</strong>. اختار ساعة من هدول:',
        soon: 'هاد الوقت قريب كثير، لازم يكون بعد ساعتين على الأقل. أقرب موعد فاضي:', ok: 'تمام ✅', on: 'على',
        at: 'الساعة', done: 'خلصنا! 🎉 هاي تفاصيل موعدك. اكبس <strong>أكّد على واتساب</strong> وبتوصلنا الرسالة جاهزة، ومنأكدلك بأسرع وقت.',
        cardT: 'موعدك مع VELIX', cal: 'أضف للتقويم', cancel: 'ولا يهمك، لغيت الحجز. إذا بدك موعد بأي وقت احكيلي 👍',
        mZoom: 'زوم', mMeet: 'Google Meet', mPhone: 'تلفون', mWa: 'واتساب', back: 'نرجع للحجز: '
      },
      en: {
        askDay: 'Sure! 🙌 Which day works for you?', askHour: 'And what time suits you? We take calls from <strong>10 AM</strong> to <strong>4 PM</strong> Amman time.',
        askMethod: 'How would you like to talk? <strong>Zoom</strong>, <strong>Google Meet</strong>, <strong>phone</strong> or <strong>WhatsApp</strong>?',
        askName: 'To lock it in, what is your name?', askPhone: 'Nice to meet you, <strong>{n}</strong>! What is your phone (WhatsApp) number? We will send the confirmation{z} there.',
        zoomLink: ' and the meeting link', badPhone: "I couldn't read that number 🙏 Please type digits only, e.g. <span dir=\"ltr\">0791234567</span>.",
        friday: "We're off on Fridays 🙂 How about one of these?", past: 'That day has passed 😅 Pick one of these:', far: 'We book up to two weeks ahead. Pick a closer day:',
        full: "Today's slots are gone. How about tomorrow or another day?", hours: 'We take calls from <strong>10 AM</strong> to <strong>4 PM</strong>. Pick a time:',
        soon: 'That is a bit too soon — slots need to be at least 2 hours away. Nearest free time:', ok: 'Got it ✅', on: 'on',
        at: 'at', done: "All set! 🎉 Here are your details. Tap <strong>Confirm on WhatsApp</strong> to send them to us, and we'll confirm right away.",
        cardT: 'Your call with VELIX', cal: 'Add to calendar', cancel: 'No problem, booking cancelled. Just tell me whenever you want a slot 👍',
        mZoom: 'Zoom', mMeet: 'Google Meet', mPhone: 'Phone', mWa: 'WhatsApp', back: 'Back to your booking: '
      }
    };
    function bt(k) { return (BT[lang()] || BT.en)[k]; }
    function mName(m) { return s('methods')[m] || m; }
    function chips(list) {
      quick.innerHTML = list.map(function (q) { return '<button type="button" class="vc-chip" dir="auto">' + esc(q) + '</button>'; }).join('');
      Array.prototype.forEach.call(quick.children, function (b) { b.addEventListener('click', function () { send(b.textContent); }); });
    }
    function dayChips() { var ar = lang() === 'ar'; return BK.nextDays(4).map(function (d) { return BK.dayLabel(d, ar); }); }
    function hourChips(day) {
      var ar = lang() === 'ar', out = [], from = day != null ? BK.firstHour(day) : 10;
      for (var h = from || 10; h <= 16; h++) out.push(BK.hourLabel(h, ar));
      return out;
    }
    function methodChips() { return [bt('mZoom'), bt('mMeet'), bt('mPhone'), bt('mWa')]; }
    function nextQuestion(prefix) {
      prefix = prefix ? prefix + '<br>' : '';
      if (bk.day == null) { bk.await = 'day'; chips(dayChips()); return prefix + bt('askDay'); }
      if (bk.hour == null) { bk.await = 'hour'; chips(hourChips(bk.day)); return prefix + bt('askHour'); }
      if (!bk.method) { bk.await = 'method'; chips(methodChips()); return prefix + bt('askMethod'); }
      if (!bk.name) { bk.await = 'name'; quick.innerHTML = ''; return prefix + bt('askName'); }
      if (!bk.phone) { bk.await = 'phone'; quick.innerHTML = ''; return prefix + bt('askPhone').replace('{n}', esc(bk.name)).replace('{z}', bk.method === 'zoom' || bk.method === 'video' ? bt('zoomLink') : ''); }
      return null;
    }
    function summaryLine() {
      var ar = lang() === 'ar', parts = [];
      if (bk.day != null) parts.push('<strong>' + BK.dayLabel(bk.day, ar) + '</strong>');
      if (bk.hour != null) parts.push(bt('at') + ' <strong dir="auto">' + BK.hourLabel(bk.hour, ar) + '</strong>');
      if (bk.method) parts.push(bt('on') + ' <strong>' + mName(bk.method) + '</strong>');
      return bt('ok') + ' ' + parts.join(' ');
    }
    var BOOK_API = (CFG.apiBase || '').replace(/\/$/, '') + '/api/bookings';
    function finish() {
      var b = bk; bk = null; quick.innerHTML = '';
      return { pending: b };
    }
    function bookingCardHTML(b, ok) {
      var ar = lang() === 'ar', dIso = BK.iso(b.day), wd = BK.wd(b.day);
      var rows = '<div class="vc-row"><span>' + esc(BK.dayLabel(b.day, ar)) + '</span><b dir="auto">' + esc(BK.hourLabel(b.hour, ar)) + '</b></div>' +
        '<div class="vc-row"><span>' + esc(mName(b.method)) + '</span><b>' + esc(b.name) + '</b></div>' +
        '<div class="vc-row"><span>' + (ar ? 'الرقم' : 'Phone') + '</span><b dir="ltr">' + esc(b.phone) + '</b></div>';
      var extra;
      if (ok) {
        extra = '<div class="vc-ok">' + (ar ? '✓ انحجز موعدك ووصلنا' : '✓ Booked — we have it') + '</div>' +
          '<a class="vc-cal" href="' + BK.ics(b) + '" download="velix-consultation.ics">' + bt('cal') + '</a>';
      } else {
        var msg = ['مرحبا VELIX 👋 بدي أحجز استشارة مجانية:', 'الاسم: ' + b.name, 'الرقم: ' + b.phone,
          'الموعد: ' + BK.DAY_AR[wd] + ' ' + dIso + ' الساعة ' + String(b.hour).padStart(2, '0') + ':00 (توقيت عمّان)', 'الطريقة: ' + (STR.ar.methods[b.method] || b.method)].join('\n');
        extra = '<a class="vc-cta" href="https://wa.me/' + WA + '?text=' + encodeURIComponent(msg) + '" target="_blank" rel="noopener">' + (ar ? 'ابعت الحجز على واتساب' : 'Send booking on WhatsApp') + '</a>';
      }
      return '<div class="vc-card"><div class="vc-card__t">' + bt('cardT') + '</div>' + rows + extra + '</div>';
    }
    async function saveBooking(b) {
      var body = { date: BK.iso(b.day), hour: b.hour, method: b.method, name: b.name, phone: b.phone, lang: lang(), source: 'Website Chat Booking',
        sessionId: VELIX.session ? VELIX.session.getToken() : convId };
      var ctl = window.AbortController ? new AbortController() : null, timer = ctl && setTimeout(function () { ctl.abort(); }, 12000);
      try {
        var r = await fetch(BOOK_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined });
        var data = await r.json().catch(function () { return {}; });
        return r.ok && data.success ? { ok: true } : { ok: false, error: data.error || ('HTTP ' + r.status), invalid: r.status === 400 };
      } catch (e) { return { ok: false, error: 'network' }; }
      finally { if (timer) clearTimeout(timer); }
    }
    function looksLikeName(text) {
      var t = text.trim();
      return t.length >= 2 && t.length <= 40 && !/\d/.test(t) && !/[?؟]/.test(t) && t.split(/\s+/).length <= 4;
    }
    // returns an array of bot bubbles (html), or null if this isn't a booking turn
    function bookingTurn(text) {
      var starting = !bk && BK.intent(text);
      if (!bk && !starting) return null;
      var t = norm(text);
      if (bk && /(الغي|الغاء|كنسل|ما بدي|خلص لا|cancel|never ?mind|forget it)/.test(t)) { bk = null; quick.innerHTML = ''; return [bt('cancel')]; }
      if (!bk) bk = {};
      var p = BK.parse(text, { awaitHour: bk.await === 'hour' });
      var got = false;
      if (bk.await === 'name' && !p.name && !p.phone && looksLikeName(text) && !p.method && p.day == null && p.hour == null && !fallbackAnswer(text)) p.name = text.trim().replace(/^(انا|أنا|اسمي)\s+/, '');
      if (bk.await === 'phone' && !p.phone) {
        // a question mid-booking → answer it, then come back
        var faq = fallbackAnswer(text);
        if (faq && !looksLikeName(text)) return [faq, bt('back') + nextQuestion('')];
        return [bt('badPhone')];
      }
      ['method', 'name', 'phone'].forEach(function (k) { if (p[k]) { bk[k] = p[k]; got = true; } });
      var problems = [];
      if (p.day != null) {
        var dErr = BK.checkDay(p.day);
        if (dErr) { problems.push(bt(dErr)); bk.day = null; chips(dayChips()); }
        else { bk.day = p.day; got = true; }
      }
      if (p.hour != null) { bk.hour = p.hour; got = true; }
      if (bk.hour != null) {
        var hErr = BK.checkSlot(bk.day != null ? bk.day : BK.dayStart(1), bk.hour);
        if (hErr === 'hours' || (hErr === 'soon' && bk.day != null)) {
          problems.push(bt(hErr)); bk.hour = null;
          chips(hourChips(bk.day != null && BK.checkDay(bk.day) === null ? bk.day : null));
          return [problems.join('<br>')];
        }
      }
      if (problems.length) return [problems.join('<br>')];
      if (!got && !starting) {
        var f = fallbackAnswer(text);
        if (f) { var q = nextQuestion(''); return q ? [f, bt('back') + q] : [f]; }
      }
      var ack = (p.day != null || p.hour != null || p.method) && (bk.day != null || bk.hour != null || bk.method) ? summaryLine() : '';
      var q2 = nextQuestion(ack);
      return q2 ? [q2] : finish();
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
        await offline(text);
      }
    }

    async function offline(text) {
      var bb = bookingTurn(text);
      if (!bb) return fallback(text);
      var tp = typing();
      if (bb.pending) {
        var b = bb.pending, res = await saveBooking(b), ar = lang() === 'ar';
        tp.remove();
        if (res.ok) {
          bb = [(ar ? 'تم! 🎉 موعدك انحجز يا <strong>' + esc(b.name) + '</strong>، وفريقنا رح يتواصل معك على <span dir="ltr">' + esc(b.phone) + '</span> قبل الموعد' + (b.method === 'zoom' || b.method === 'video' ? ' ويبعتلك رابط الاجتماع' : '') + '.'
                 : 'Done! 🎉 You are booked, <strong>' + esc(b.name) + '</strong>. Our team will contact you on <span dir="ltr">' + esc(b.phone) + '</span> before the call' + (b.method === 'zoom' || b.method === 'video' ? ' with the meeting link' : '') + '.'), bookingCardHTML(b, true)];
          record('[booking saved] ' + BK.iso(b.day) + ' ' + b.hour + ':00 ' + b.method + ' ' + b.name + ' ' + b.phone, 'bot');
        } else {
          bb = [(ar ? 'ما قدرت أثبّت الحجز من هون هلّق 🙏 اكبس الزر وبيوصلنا موعدك جاهز على واتساب.' : "I couldn't save the booking from here right now 🙏 Tap the button and it reaches us on WhatsApp."), bookingCardHTML(b, false)];
          record('[booking NOT saved: ' + res.error + '] ' + BK.iso(b.day) + ' ' + b.hour + ':00 ' + b.name + ' ' + b.phone, 'bot');
        }
        bb.forEach(function (h) { bubble(h, 'bot'); });
        return;
      }
      await new Promise(function (r) { setTimeout(r, 450 + Math.random() * 350); });
      tp.remove();
      bb.forEach(function (h) { bubble(h, 'bot'); });
      record(bb.join(' | ').replace(/<[^>]+>/g, ''), 'bot');
    }

    async function send(text) {
      text = (text || '').trim(); if (!text || busy) return;
      busy = true; quick.innerHTML = '';
      bubble(esc(text), 'user'); record(text, 'user'); input.value = '';
      if (aiDown || !CFG.aiEnabled) await offline(text); else await ai(text);
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
