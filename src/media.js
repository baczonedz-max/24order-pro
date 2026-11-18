// Ingredient photos (and later other images) stored in D1, plus AI image generation through Workers AI.
import { httpError } from './orders.js';

const KEY = /^[a-z0-9_:.-]{1,80}$/;
const TYPES = new Set(['image/webp', 'image/png', 'image/jpeg']);
const MAX = 1_500_000; // bytes; D1 rows can hold up to 2 MB

/** Keys with their size and version, so the browser can build cache-busting URLs. */
export async function listMedia(db) {
  const rows = await db.prepare(`SELECT key, mime, w, h, source, updated_at FROM media ORDER BY key`).all();
  return rows.results;
}

export async function getMedia(c) {
  const key = c.req.param('key');
  if (!KEY.test(key)) throw httpError(400, 'Bad key');
  const row = await c.env.DB.prepare(`SELECT mime, data, updated_at FROM media WHERE key = ?`).bind(key).first();
  if (!row) throw httpError(404, 'Not found');
  const bytes = row.data instanceof ArrayBuffer ? new Uint8Array(row.data) : new Uint8Array(row.data);
  return new Response(bytes, {
    headers: {
      'content-type': row.mime,
      // URLs carry ?v=updated_at, so a long cache is safe.
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}

export async function putMedia(c) {
  const key = c.req.param('key');
  if (!KEY.test(key)) throw httpError(400, 'Bad key');
  const mime = (c.req.header('content-type') || '').split(';')[0].trim();
  if (!TYPES.has(mime)) throw httpError(415, 'Use a WebP, PNG or JPEG image');
  const buf = await c.req.arrayBuffer();
  if (!buf.byteLength || buf.byteLength > MAX) throw httpError(413, 'Image is empty or larger than 1.5 MB');
  const w = Math.min(4096, Math.max(0, Number(c.req.query('w')) || 0));
  const h = Math.min(4096, Math.max(0, Number(c.req.query('h')) || 0));
  const source = c.req.query('source') === 'ai' ? 'ai' : 'upload';
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `INSERT INTO media (key, mime, data, w, h, source, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET mime = excluded.mime, data = excluded.data, w = excluded.w, h = excluded.h, source = excluded.source, updated_at = excluded.updated_at`,
  ).bind(key, mime, buf, w, h, source, now).run();
  return c.json({ success: true, data: { key, mime, w, h, source, updated_at: now } });
}

export async function deleteMedia(c) {
  const key = c.req.param('key');
  if (!KEY.test(key)) throw httpError(400, 'Bad key');
  await c.env.DB.prepare(`DELETE FROM media WHERE key = ?`).bind(key).run();
  return c.json({ success: true });
}

/** Generate one photo with Workers AI (FLUX.1 schnell, free daily quota). Returns base64 JPEG. */
export async function generateImage(c) {
  if (!c.env.AI) throw httpError(501, 'AI is not available in this environment');
  const body = await c.req.json().catch(() => ({}));
  const prompt = String(body.prompt || '').trim().slice(0, 1500);
  if (prompt.length < 10) throw httpError(422, 'Prompt is too short');
  const seed = Number.isInteger(body.seed) ? body.seed : Math.floor(Math.random() * 1e9);
  const out = await c.env.AI.run('@cf/black-forest-labs/flux-1-schnell', { prompt, steps: 8, seed });
  if (!out?.image) throw httpError(502, 'The AI did not return an image');
  return c.json({ success: true, data: { image: out.image, mime: 'image/jpeg', seed } });
}
