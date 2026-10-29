// api/bookings.js
// POST  (public)  — a visitor's booking from the chat assistant or the
//                   booking page. Validated, then saved: into SQLite when the
//                   local admin server is the host, or into the cloud inbox
//                   (lib/remoteInbox.js) when running on Vercel.
// GET   (admin)   — Authorization: Bearer ADMIN_SYNC_TOKEN → the cloud inbox.
// DELETE(admin)   — same token, body { ids: [...] } → remove synced items.

const { checkRateLimit } = require('../lib/rateLimit');
const { validateBooking } = require('../lib/tools');
const inbox = require('../lib/remoteInbox');
const store = require('../lib/store');

const ALLOWED_ORIGINS = (process.env.VELIX_ALLOWED_ORIGINS || 'https://velixweb.xyz,https://www.velixweb.xyz,http://localhost:3000').split(',').map((o) => o.trim());
const METHODS = { zoom: 'Zoom / زوم', video: 'Google Meet', phone: 'Phone / تلفون', whatsapp: 'WhatsApp / واتساب' };
const DAYS_AR = { Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء', Wednesday: 'الأربعاء', Thursday: 'الخميس', Saturday: 'السبت' };

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
}
function isAdmin(req) {
  const t = process.env.ADMIN_SYNC_TOKEN;
  return !!t && t.length >= 16 && req.headers.authorization === `Bearer ${t}`;
}
function localDbWorks() {
  try { require('../lib/db').getDb(); return true; } catch (e) { return false; }
}
const clip = (v, n) => (v == null ? '' : String(v).trim().slice(0, n));

module.exports = async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }

  if (req.method === 'GET' || req.method === 'DELETE') {
    if (!isAdmin(req)) { res.status(401).json({ error: 'Unauthorized' }); return; }
    if (!inbox.enabled()) { res.status(503).json({ error: 'Cloud inbox not configured' }); return; }
    try {
      if (req.method === 'GET') { res.status(200).json({ items: await inbox.list() }); return; }
      const ids = Array.isArray((req.body || {}).ids) ? req.body.ids.map(String).slice(0, 500) : [];
      res.status(200).json({ removed: await inbox.remove(ids) });
    } catch (err) { res.status(502).json({ error: err.message }); }
    return;
  }

  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const ip = (req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || 'unknown').split(',')[0].trim();
  if (!checkRateLimit(`ip:${ip}:bookings`).allowed) { res.status(429).json({ error: 'Too many requests. Please try again shortly.' }); return; }

  const b = req.body || {};
  const input = { date: clip(b.date, 10), hour: Number(b.hour), method: clip(b.method, 20), name: clip(b.name, 120), phone: clip(b.phone, 40), need: clip(b.need, 600) };
  if (!input.name) { res.status(400).json({ error: 'Name is required.' }); return; }
  if (!METHODS[input.method]) { res.status(400).json({ error: 'Unknown call method.' }); return; }
  const v = validateBooking(input);
  if (!v.ok) { res.status(400).json({ error: v.error }); return; }

  const when = `${input.date} ${String(input.hour).padStart(2, '0')}:00`;
  const lead = {
    name: input.name,
    phone: input.phone,
    projectDetails: `📅 استشارة مجانية — ${DAYS_AR[v.weekday] || v.weekday} ${when} (عمّان) · ${METHODS[input.method]}${input.need ? '\n' + input.need : ''}`,
    timeline: `${v.weekday} ${when} · ${input.method}`,
    source: clip(b.source, 60) || 'Website Booking',
    sessionId: clip(b.sessionId, 120) || null,
    kind: 'booking',
    booking: { date: input.date, hour: input.hour, weekday: v.weekday, method: input.method, lang: b.lang === 'en' ? 'en' : 'ar' }
  };

  try {
    if (localDbWorks()) {
      await store.saveLead(lead);
      await store.logEvent({ type: 'booking_requested', sessionId: lead.sessionId, payload: { when, method: input.method } });
    } else if (inbox.enabled()) {
      await inbox.push(lead);
    } else {
      res.status(503).json({ error: 'Booking storage is not configured.' });
      return;
    }
  } catch (err) {
    console.error('[bookings] save failed', err);
    res.status(502).json({ error: 'Could not save the booking.' });
    return;
  }
  res.status(200).json({ success: true, booking: Object.assign({ name: input.name }, lead.booking) });
};
