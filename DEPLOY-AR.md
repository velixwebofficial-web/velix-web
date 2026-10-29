# VELIX v9 — خطوات الرفع

## 1) الموقع الجديد (التصميم)
1. فك الضغط فوق مجلد مشروعك `velix-web-main` واستبدل الملفات.
   - ما في داخله مجلد `data` ولا `public-data` عشان ما تنمسح مشاريعك وقاعدة البيانات.
2. من المجلد:
   ```
   git add -A
   git commit -m "VELIX v9 redesign + new AI assistant"
   git push
   ```
3. GitHub Pages بحدّث velixweb.xyz خلال دقيقة أو دقيقتين.

## 2) المساعد الذكي (Claude)
لحد ما تعمل هاي الخطوة، المساعد شغّال **بالوضع الذكي بدون إنترنت**: بجاوب عن الأسعار، عدد المشاريع (من الموقع نفسه)، التقنيات، المدة، ويحجز عبر واتساب.

لتشغيله الكامل:
1. ادخل vercel.com ← **Add New → Project** ← اختار نفس الريبو `velix-web`.
2. قبل Deploy افتح **Environment Variables** وحط:
   - `ANTHROPIC_API_KEY` = مفتاحك من console.anthropic.com
3. اكبس **Deploy** وانسخ الرابط اللي بيطلعلك (مثلاً `https://velix-web.vercel.app`).
4. افتح `assets/js/config.js` وعدّل:
   ```js
   aiEnabled: true,
   apiBase: 'https://velix-web.vercel.app'
   ```
5. `git add -A && git commit -m "enable AI" && git push`

## شو بيعرف المساعد
- عدد المشاريع المنشورة على الموقع (بيتحدّث لحاله لما تضيف مشروع من لوحة التحكم).
- اللغات والتقنيات: HTML, CSS, JavaScript, TypeScript, React, Next.js, Tailwind, GSAP, Node.js, REST APIs, PostgreSQL, SQLite, WordPress, Vercel, GitHub.
- الأسعار (تبدأ من) والإضافات الشهرية.
- **حجز موعد**: بياخد اليوم والساعة وطريقة المكالمة والاسم والرقم، وبيطلعلك زر "أكّد على واتساب" برسالة جاهزة لرقمك 0799691748.
- المواعيد: السبت–الخميس، 10:00–16:00 بتوقيت عمّان.

لتعديل أي معلومة: ملفات `knowledge/*.json`.
