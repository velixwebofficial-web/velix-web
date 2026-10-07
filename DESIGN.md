# VELIX public site design (v6: the drawn film)

## Idea
The homepage opens with a short film about how a VELIX website is made, drawn live in the
browser and played by scrolling:
1. **Code:** an editor types the first lines of a bilingual page.
2. **Design:** the page assembles block by block, then flips from English to Arabic.
3. **Security:** a shield frames the site, attacks bounce off, and the checks appear:
   HTTPS, firewall and hardened forms, backups, monthly security check.
4. **Launch:** the site lands on a laptop and a phone, with the padlock closed and "Live".

One caption is on screen at a time. The chapter bar under the film works like a video timeline, and
each chapter is clickable. "Skip intro" jumps straight to the services.

## Why visitors stay (the order of the page)
It answers a visitor's questions in the order they ask them:
- **What do you do?** The film and its headline: "We build websites and keep them safe."
- **Can you do what I need?** What we build, with a real timeline for each service.
- **Will my site be safe?** "Security is built in": five concrete things, no adjectives.
- **Show me.** Recent work, from the admin dashboard.
- **How painful is this for me?** How a project runs: fixed price first, design seen live.
- **Who are you?** The brand scene.
- **Questions**, then **Tell us what you're building**, with email, WhatsApp and the quote form.

## System
- **Colour:** night `#050506`, silver-white text `#EDEEF0`, steel `#8D939B`. Green `#46D39A` only means
  "secure / live", and red `#FF5C5C` only means "attack".
- **Type:** Archivo (wide, like the VELIX wordmark), Noto Kufi Arabic and IBM Plex Sans Arabic.
  Fonts are self-hosted in `assets/fonts/`.
- **Every inner page** uses the same dark theme (`assets/css/velix.css`).

## Files
- `assets/js/film.js`: the film itself (canvas drawing, a few KB, no video files).
- `assets/js/home.js`: scroll → film, captions and chapters, plus the other homepage scroll moments.
- `assets/css/home.css`: homepage layout. GSAP + ScrollTrigger are bundled in `assets/vendor/`.
- `style.css` is still used by `admin.html`.

## Editing the film
Captions are normal translated text (`t_v6_*` keys in `assets/js/i18n.js`). The words drawn inside
the film (checklist, "Live, fast and protected", the sample page text) live in the `copy` and `CODE`
objects in `assets/js/film.js`. Chapter timing is in `CHAPTERS` / `CAPS` in `home.js` and the `seg()`
calls in `film.js`.

## Accessibility
With "reduce motion" turned on, the film shows its final frame and all captions are listed, with no scrubbing.
