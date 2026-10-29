// lib/inboxSync.js
// Runs inside the local admin server (server.js). Every 30 seconds it pulls
// bookings/leads that visitors made on the live site (stored in the cloud
// inbox by api/bookings.js on Vercel), saves each one into the local SQLite
// `leads` table — so it appears in Admin → Leads — then clears them from the
// cloud. Needs in .env.local:
//   VELIX_REMOTE_API=https://your-project.vercel.app
//   ADMIN_SYNC_TOKEN=<same long random value as on Vercel>

const INTERVAL_MS = 30 * 1000;

async function syncOnce() {
  const base = (process.env.VELIX_REMOTE_API || '').replace(/\/$/, '');
  const token = process.env.ADMIN_SYNC_TOKEN || '';
  if (!base || !token) return { skipped: true };
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const r = await fetch(`${base}/api/bookings`, { headers });
  if (!r.ok) throw new Error(`inbox GET ${r.status}`);
  const { items = [] } = await r.json();
  if (!items.length) return { imported: 0 };

  const { getDb } = require('./db');
  const db = getDb();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO leads (id, name, phone, email, company, project_details, budget, timeline, source, session_id, status, created_at)
    VALUES (@id, @name, @phone, @email, '', @project_details, '', @timeline, @source, @session_id, 'New', @created_at)
  `);
  const done = [];
  for (const it of items) {
    try {
      insert.run({
        id: String(it.id), name: String(it.name || 'Website visitor').slice(0, 200), phone: String(it.phone || '').slice(0, 60),
        email: String(it.email || '').slice(0, 200), project_details: String(it.projectDetails || '').slice(0, 2000),
        timeline: String(it.timeline || '').slice(0, 100), source: String(it.source || 'Website Booking').slice(0, 100),
        session_id: it.sessionId || null, created_at: it.createdAt || new Date().toISOString()
      });
      try {
        db.prepare(`INSERT INTO activity_log (id, text, icon) VALUES (?, ?, 'dot')`)
          .run(require('crypto').randomUUID(), `New booking from the website: ${it.name} — ${it.timeline || ''}`);
      } catch (e) { /* activity log is optional */ }
      done.push(String(it.id));
    } catch (e) { console.error('[inbox] could not import', it.id, e.message); }
  }
  if (done.length) await fetch(`${base}/api/bookings`, { method: 'DELETE', headers, body: JSON.stringify({ ids: done }) });
  if (done.length) console.log(`  [inbox] imported ${done.length} booking(s)/lead(s) from the live site`);
  return { imported: done.length };
}

function start() {
  if (!process.env.VELIX_REMOTE_API || !process.env.ADMIN_SYNC_TOKEN) {
    console.log('  Live-site inbox:           off (set VELIX_REMOTE_API + ADMIN_SYNC_TOKEN in .env.local)');
    return;
  }
  console.log(`  Live-site inbox:           syncing every 30s from ${process.env.VELIX_REMOTE_API}`);
  const tick = () => syncOnce().catch((e) => console.warn('  [inbox] sync failed:', e.message));
  setTimeout(tick, 3000);
  setInterval(tick, INTERVAL_MS).unref();
}

module.exports = { start, syncOnce };
