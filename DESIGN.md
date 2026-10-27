# VELIX public site design (v7: one cinematic frame, then a page that moves at your speed)

## What changed from v6 and why
- **The scroll-driven film is gone.** It pinned the page for five screens, so visitors had to keep
  scrolling through animation before learning anything. The homepage is now ~6,000px tall instead
  of ~13,000px, and nothing is pinned: every section scrolls at the visitor's own speed.
- **Cinema now lives in the first frame only:** letterbox bars open, the photo pushes in slowly,
  the window light turns VELIX blue and breathes, film grain, the headline rises line by line.
  After that, sections simply fade up once as they arrive.
- **Brand blue is back.** Royal Blue `#1D4EFF` is the one light source on the night page. It only means
  "act here" (buttons, active states) or "light" (glows). Everything else stays silver.
- **No fixed timelines anywhere.** Timelines depend on scope, complexity and requirements, confirmed
  in a written proposal.
- **Every CTA goes to one place:** `book.html`, a free 30-minute consultation.
- Removed the footer newsletter (it posted to an API that does not exist on the static host, so
  every signup failed) and fixed the Instagram link to @velix.jo26.

## Homepage order (each section answers one client question)
1. **Hero** — What do you do? "Websites that win you clients." + Book / See work + three proof points.
2. **Services** — Can you build what I need? Four cards: business sites, stores, landing pages, systems.
3. **Work** — Show me. Featured projects from the admin; the section hides itself if none are published.
4. **Security** — Will it be safe? The differentiator, with four concrete checks.
5. **Process** — How painful is this? Four steps, proposal before work.
6. **FAQ** — The last doubts.
7. **CTA** — One next step: book a consultation (or WhatsApp).

## Booking page (`book.html`)
Four short steps on one screen: meeting type → day (next 14 days, Sat–Thu) → time (10:00–17:00
Amman time, with the visitor's local time shown when different) → details. Submitting opens WhatsApp
with the booking already written in the visitor's language, which always works on a static host.
If a Web3Forms key is set in `assets/js/script.js` it is also emailed, and the admin CRM gets a copy
when the local server runs. The visitor can add the slot to their calendar (.ics).
Edit hours/days in the constants at the top of `assets/js/book.js`.

## System
- **Colour:** night `#050506`, silver text `#EDEEF0`, steel `#8D939B`, blue `#1D4EFF` / `#3D68FF`.
- **Type:** Archivo, Noto Kufi Arabic, IBM Plex Sans Arabic (self-hosted in `assets/fonts/`).
- **Files:** `assets/css/home.css` + `assets/js/home.js` (homepage, no libraries),
  `assets/css/book.css` + `assets/js/book.js` (booking). The v7 brand layer is at the end of `velix.css`.
- **Translations:** new strings use `t_v7_*` keys in `assets/js/i18n.js`.

## Accessibility
"Reduce motion" turns off every animation and shows all content immediately. Arabic mirrors the
hero photo so the text and the laptop never collide.
