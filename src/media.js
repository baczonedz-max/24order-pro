// Ingredient photos (and later other images) stored in D1, plus AI image generation through Workers AI.
import { httpError } from './orders.js';

const KEY = /^[a-z0-9_:.-]{1,80}$/;
const TYPES = new Set(['image/webp', 'image/png', 'image/jpeg']);
const MAX = 1_500_000; // bytes; D1 rows can hold up to 2 MB

/** Keys with their size and version, so the browser can build cache-busting URLs. */
export async function listMedia(db) {
  const rows = await db.prepare(`SELECT key, mime, w, h, source, updated_at FROM media WHERE key NOT LIKE 'dish.%' ORDER BY key`).all();
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
/* ---------- AI image generation: Gemini first (if a key is set), Workers AI as a backup ---------- */
const geminiKey = (env) => env.GEMINI_API_KEY || env.GOOGLE_API_KEY || env.GEMINI_KEY || '';

/** Which image generators this deployment can use (never returns the key itself). */
export function aiStatus(c) {
  return c.json({ success: true, data: { gemini: !!geminiKey(c.env), workersAi: !!c.env.AI, geminiModel: c.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image' } });
}

async function viaGemini(env, prompt) {
  const model = env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': geminiKey(env) },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${prompt}. Square image.` }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw httpError(res.status === 429 ? 429 : 502, `Gemini: ${json.error?.message || `HTTP ${res.status}`}`);
  const cand = json.candidates?.[0];
  const part = cand?.content?.parts?.find((p) => p.inlineData || p.inline_data);
  const data = part?.inlineData || part?.inline_data;
  if (!data?.data) throw httpError(502, `Gemini did not return an image${cand?.finishReason ? ` (${cand.finishReason})` : ''}`);
  return { image: data.data, mime: data.mimeType || data.mime_type || 'image/png', provider: 'gemini' };
}

async function viaWorkersAi(env, prompt) {
  // FLUX.1 schnell accepts only { prompt, steps } (steps max 8); each call is already random.
  const out = await env.AI.run('@cf/black-forest-labs/flux-1-schnell', { prompt, steps: 8 });
  if (!out?.image) throw httpError(502, 'The AI did not return an image');
  return { image: out.image, mime: 'image/jpeg', provider: 'workers-ai' };
}

export async function generateImage(c) {
  const env = c.env;
  if (!geminiKey(env) && !env.AI) throw httpError(501, 'No image AI is configured (set GEMINI_API_KEY in Cloudflare)');
  const body = await c.req.json().catch(() => ({}));
  const prompt = String(body.prompt || '').trim().slice(0, 1500);
  if (prompt.length < 10) throw httpError(422, 'Prompt is too short');

  const errors = [];
  if (geminiKey(env)) {
    try { return c.json({ success: true, data: await viaGemini(env, prompt) }); } catch (e) { errors.push(e); }
  }
  if (env.AI) {
    try { return c.json({ success: true, data: await viaWorkersAi(env, prompt) }); } catch (e) { errors.push(e); }
  }
  const quota = errors.some((e) => e.status === 429 || /4006|quota|exhausted|allocation/i.test(e.message));
  throw httpError(quota ? 429 : errors[0]?.status || 502, errors.map((e) => e.message).join(' · '));
}
