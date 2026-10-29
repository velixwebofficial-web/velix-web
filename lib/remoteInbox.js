// lib/remoteInbox.js
// A tiny cloud "inbox" for bookings and leads made on the LIVE site.
//
// Why: the public site is static (GitHub Pages) and the admin room runs on
// the owner's own computer (server.js + SQLite), so a visitor's browser can
// never reach the admin database directly. Instead:
//   1. The visitor's booking is POSTed to /api/bookings on Vercel, which
//      stores it in Upstash Redis (free tier, added from Vercel → Storage).
//   2. The admin server pulls that inbox every 30 seconds (lib/inboxSync.js),
//      writes each item into the local `leads` table, then removes it from
//      the cloud. It shows up in Admin → Leads as a "New" card.
//
// Works with either env naming Vercel/Upstash provide:
//   KV_REST_API_URL + KV_REST_API_TOKEN   (Vercel KV / Upstash via Vercel)
//   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN

const KEY = 'velix:inbox';

function cfg() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}
function enabled() { return !!cfg(); }

async function redis(command) {
  const c = cfg();
  if (!c) throw new Error('Cloud inbox is not configured (KV_REST_API_URL / KV_REST_API_TOKEN).');
  const r = await fetch(c.url, { method: 'POST', headers: { Authorization: `Bearer ${c.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(command) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.error) throw new Error(`Redis error: ${data.error || r.status}`);
  return data.result;
}

async function push(item) {
  const id = item.id || `in_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const record = Object.assign({}, item, { id, createdAt: item.createdAt || new Date().toISOString() });
  await redis(['HSET', KEY, id, JSON.stringify(record)]);
  return record;
}

async function list() {
  const flat = (await redis(['HGETALL', KEY])) || [];
  const out = [];
  for (let i = 0; i < flat.length; i += 2) { try { out.push(JSON.parse(flat[i + 1])); } catch (e) { /* skip bad row */ } }
  return out.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

async function remove(ids) {
  if (!ids || !ids.length) return 0;
  return redis(['HDEL', KEY, ...ids]);
}

module.exports = { enabled, push, list, remove };
