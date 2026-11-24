// Photos of a dish with the customer's changes in it ("without salad", "with extra cheese"…), made on demand.
// The first time a change is asked for, FLUX.2 (Workers AI, free daily quota) edits the restaurant's own photo;
// the result is stored in the media table and every later customer gets it at once.
//
// GET /api/shop/dish?food=<id>&img=<photo url>&ch=+12,-5   (component ids: + added, - removed)
//   → { status: 'ready', url } | { status: 'pending' } | { status: 'none' }
import { httpError } from './orders.js';

const MODEL = '@cf/black-forest-labs/flux-2-klein-9b';
const MAX_CHANGES = 3;      // bigger combinations show the nearest photo plus labels
const DAILY_CAP = 80;       // never more than this many new photos per day (the free quota is usually reached first)
const STALE_MS = 120_000;   // a job that hasn't finished in 2 minutes may be retried

// Norwegian (and common) ingredient names → what the photo model understands best.
const EN = [
  [/ekstra ost|^ost$|pizzaost|cheddar|mozzarella/i, 'melted cheese'], [/pommes|fries/i, 'french fries'],
  [/isbergsalat|^salat$|lettuce/i, 'green lettuce'], [/rødløk|red onion/i, 'sliced red onion'], [/purreløk/i, 'leek'],
  [/løkring/i, 'onion rings'], [/hvitløksaus|garlic sauce/i, 'creamy white garlic sauce'], [/hvitløk/i, 'chopped garlic'],
  [/løk|onion/i, 'sliced onion'], [/kebabsaus/i, 'white kebab sauce'], [/x-?dressing|dressing/i, 'creamy white dressing'],
  [/bearnaise/i, 'béarnaise sauce'], [/bbq/i, 'barbecue sauce'], [/chilisaus|chili sauce/i, 'red chili sauce'],
  [/pizzasaus|tomatsaus|tomato sauce/i, 'tomato sauce'], [/tomat/i, 'tomato'], [/agurk|cucumber/i, 'cucumber'],
  [/mais|corn/i, 'sweet corn'], [/ananas|pineapple/i, 'pineapple chunks'], [/jalape/i, 'green jalapeño slices'],
  [/chilli|chili/i, 'red chili pepper slices'], [/paprika|peppermix/i, 'bell pepper strips'], [/champignon|sopp/i, 'sliced mushrooms'],
  [/oliven/i, 'black olives'], [/kjøttboll/i, 'meatballs'], [/kjøttdeig/i, 'minced beef'], [/biff/i, 'beef strips'],
  [/kebab/i, 'kebab meat'], [/kylling|chicken/i, 'chicken'], [/skinke/i, 'ham'], [/salami/i, 'salami'],
  [/pepperoni/i, 'pepperoni'], [/bacon/i, 'bacon'], [/reke/i, 'shrimp'], [/tunfisk/i, 'tuna'], [/dill/i, 'fresh dill'], [/\begg/i, 'egg'],
];
const en = (name) => (EN.find(([re]) => re.test(name))?.[1]) || name;

function dishWord(food, cat) {
  const s = `${cat} ${food.name}`;
  if (/pizza/i.test(s)) return 'pizza';
  if (/burger|hamburg/i.test(s)) return 'burger meal';
  if (/rull|wrap|pita/i.test(s)) return 'kebab wraps';
  if (/kebab|middag/i.test(s)) return 'kebab plate';
  if (/salat/i.test(s)) return 'salad';
  return 'dish';
}

function prompt(dish, added, removed) {
  const where = { pizza: 'baked on top of the pizza, cooked and melted into it', 'burger meal': 'inside the burger in its natural place', 'kebab wraps': 'in the filling, visible at the open ends of the wraps', 'kebab plate': 'on the plate with the kebab', salad: 'mixed into the salad' }[dish] || 'on the dish';
  const parts = [];
  for (const a of added) parts.push(`Add ${en(a)} ${where}, a natural restaurant amount.`);
  for (const r of removed) parts.push(`Remove all the ${en(r)} from the ${dish}; where it was, show what is naturally underneath.`);
  return `Edit this photo of a ${dish}. ${parts.join(' ')} Keep everything else exactly the same: same food, same arrangement, same lighting, same camera angle, framing and size, same plain white background. Professional realistic food photography, everything cooked, sharp and appetizing.`;
}

const hex = async (s, n) => [...new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, n);

export async function shopDish(c) {
  const env = c.env;
  const db = env.DB;
  const foodId = Number(c.req.query('food'));
  const img = String(c.req.query('img') || '').slice(0, 500);
  const tokens = String(c.req.query('ch') || '').split(',').map((t) => t.trim()).filter((t) => /^[+-]\d{1,9}$/.test(t));
  if (!foodId || !img || !tokens.length || tokens.length > MAX_CHANGES) throw httpError(422, 'Bad request');

  const [food, comps, cat] = await Promise.all([
    db.prepare(`SELECT id, name, image, category_id FROM foods WHERE id = ? AND active = 1`).bind(foodId).first(),
    db.prepare(`SELECT id, name, state, image FROM food_components WHERE food_id = ?`).bind(foodId).all(),
    db.prepare(`SELECT c.name FROM categories c JOIN foods f ON f.category_id = c.id WHERE f.id = ?`).bind(foodId).first(),
  ]);
  if (!food) throw httpError(404, 'Not found');
  // Only the product's own photo or one of its option photos can be edited.
  const photos = new Set([food.image, ...comps.results.map((x) => x.image)].filter(Boolean));
  if (!photos.has(img)) throw httpError(422, 'Unknown photo');
  const byId = Object.fromEntries(comps.results.map((x) => [x.id, x]));
  const added = [], removed = [];
  for (const t of tokens) {
    const comp = byId[Number(t.slice(1))];
    if (!comp) throw httpError(422, 'Unknown ingredient');
    if (t[0] === '+' && comp.state === 'optional') added.push(comp.name);
    else if (t[0] === '-' && comp.state === 'selected') removed.push(comp.name);
    else throw httpError(422, 'Bad change');
  }
  const key = 'dish.' + (await hex(`${foodId}|${img}|${[...tokens].sort().join(',')}`, 24));

  const have = await db.prepare(`SELECT updated_at FROM media WHERE key = ?`).bind(key).first();
  if (have) return c.json({ success: true, data: { status: 'ready', url: `/api/media/${key}?v=${encodeURIComponent(have.updated_at)}` } });
  if (!env.AI || env.AI_DISH === 'off') return c.json({ success: true, data: { status: 'none' } });

  const now = Date.now();
  const job = await db.prepare(`SELECT status, started_at FROM dish_jobs WHERE key = ?`).bind(key).first();
  if (job?.status === 'running' && now - Date.parse(job.started_at) < STALE_MS) return c.json({ success: true, data: { status: 'pending' } });
  // Free quota used up today: don't try again before tomorrow (UTC).
  const today = new Date().toISOString().slice(0, 10);
  const flags = await db.prepare(`SELECT key, value FROM settings WHERE key IN ('dish_quota_day', 'dish_count_day', 'dish_count')`).all();
  const f = Object.fromEntries(flags.results.map((r) => [r.key, r.value]));
  if (f.dish_quota_day === today) return c.json({ success: true, data: { status: 'none' } });
  const count = f.dish_count_day === today ? Number(f.dish_count || 0) : 0;
  if (count >= DAILY_CAP) return c.json({ success: true, data: { status: 'none' } });

  await db.batch([
    db.prepare(`INSERT INTO dish_jobs(key, status, started_at) VALUES (?, 'running', ?) ON CONFLICT(key) DO UPDATE SET status = 'running', started_at = excluded.started_at, error = NULL`).bind(key, new Date(now).toISOString()),
    db.prepare(`INSERT OR REPLACE INTO settings(key, value) VALUES ('dish_count_day', ?)`).bind(today),
    db.prepare(`INSERT OR REPLACE INTO settings(key, value) VALUES ('dish_count', ?)`).bind(String(count + 1)),
  ]);
  const src = new URL(`/img/dish/src/${await hex(img, 16)}.jpg`, c.req.url);
  c.executionCtx.waitUntil(generate(env, key, src, prompt(dishWord(food, cat?.name || ''), added, removed)));
  return c.json({ success: true, data: { status: 'pending' } });
}

async function generate(env, key, srcUrl, text) {
  const db = env.DB;
  try {
    const res = await env.ASSETS.fetch(new Request(srcUrl));
    if (!res.ok) throw new Error('No source photo for this product');
    const form = new FormData();
    form.append('prompt', text);
    form.append('input_image_0', new Blob([await res.arrayBuffer()], { type: 'image/jpeg' }), 'in.jpg');
    form.append('width', '1024');
    form.append('height', '1024');
    const body = new Response(form);
    const out = await env.AI.run(MODEL, { multipart: { body: body.body, contentType: body.headers.get('content-type') } });
    if (!out?.image) throw new Error('The AI returned no image');
    const bin = atob(out.image);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const mime = bytes[0] === 0x89 ? 'image/png' : bytes[0] === 0xff ? 'image/jpeg' : 'image/webp';
    await db.batch([
      db.prepare(`INSERT OR REPLACE INTO media (key, mime, data, w, h, source, updated_at) VALUES (?, ?, ?, 1024, 1024, 'ai-dish', ?)`).bind(key, mime, bytes.buffer, new Date().toISOString()),
      db.prepare(`UPDATE dish_jobs SET status = 'done' WHERE key = ?`).bind(key),
    ]);
  } catch (e) {
    const msg = String(e?.message || e).slice(0, 300);
    const stmts = [db.prepare(`UPDATE dish_jobs SET status = 'failed', error = ? WHERE key = ?`).bind(msg, key)];
    if (/4006|allocation|quota|neurons/i.test(msg)) stmts.push(db.prepare(`INSERT OR REPLACE INTO settings(key, value) VALUES ('dish_quota_day', ?)`).bind(new Date().toISOString().slice(0, 10)));
    await db.batch(stmts);
  }
}
