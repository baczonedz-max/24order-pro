// 24order Pro – Cloudflare Worker (Hono).
// /api/* is handled here; everything else is the dashboard (./dist) and static files.
import { Hono } from 'hono';
import { ensureSchema } from './db.js';
import { listMedia, getMedia, putMedia, deleteMedia, generateImage, aiStatus } from './media.js';
import { hashPassword, verifyPassword, startSession, endSession, currentUser, requireUser } from './auth.js';
import { loadCatalog, priceCart, createOrder, getOrder, setStatus, listOrders, summary, STATUSES } from './orders.js';
import { menuRoute, statsRoute } from './menu24.js';
import { shopMenu, shopPrice, shopPlaceOrder, shopTrack } from './shop.js';

const app = new Hono().basePath('/api');

app.onError((err, c) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  return c.json({ success: false, message: err.message || 'Server error' }, status);
});

// Make sure the database tables exist before any API call.
app.use('*', async (c, next) => {
  if (!c.env.DB) return c.json({ success: false, message: 'D1 database is not bound (binding "DB")' }, 500);
  await ensureSchema(c.env, c.req.raw);
  await next();
});

app.get('/health', (c) => c.json({ ok: true }));

/* ---------- setup & auth ---------- */
app.get('/setup', async (c) => {
  const n = await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM users`).first();
  return c.json({ success: true, data: { needsSetup: !n.n } });
});

app.post('/setup', async (c) => {
  const n = await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM users`).first();
  if (n.n) return c.json({ success: false, message: 'Already set up' }, 409);
  const { name, email, password } = await c.req.json();
  validateAccount(name, email, password);
  const user = await c.env.DB.prepare(`INSERT INTO users(name, email, password_hash, role) VALUES (?, ?, ?, 'admin') RETURNING id, name, email, role`)
    .bind(String(name).trim(), String(email).trim(), await hashPassword(password)).first();
  await startSession(c, user.id);
  return c.json({ success: true, data: user });
});

app.post('/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  const u = await c.env.DB.prepare(`SELECT * FROM users WHERE email = ? AND active = 1`).bind(String(email || '').trim()).first();
  if (!u || !(await verifyPassword(String(password || ''), u.password_hash))) {
    return c.json({ success: false, message: 'Wrong email or password' }, 401);
  }
  await startSession(c, u.id);
  return c.json({ success: true, data: { id: u.id, name: u.name, email: u.email, role: u.role } });
});

app.post('/auth/logout', async (c) => {
  await endSession(c);
  return c.json({ success: true });
});

app.get('/auth/me', async (c) => {
  const user = await currentUser(c);
  if (!user) return c.json({ success: false, message: 'Unauthorized' }, 401);
  return c.json({ success: true, data: user });
});

/* ---------- everything below needs a signed-in user ---------- */
const priv = new Hono();
priv.use('*', requireUser);

priv.get('/settings', async (c) => {
  const rows = await c.env.DB.prepare(`SELECT key, value FROM settings WHERE key != 'schema_version'`).all();
  return c.json({ success: true, data: Object.fromEntries(rows.results.map((r) => [r.key, r.value])) });
});

priv.get('/catalog', async (c) => c.json({ success: true, data: await loadCatalog(c.env.DB) }));

priv.post('/cart/price', async (c) => c.json({ success: true, data: await priceCart(c.env.DB, await c.req.json()) }));

priv.get('/orders', async (c) => c.json({ success: true, data: await listOrders(c.env.DB, c.req.query()), now: new Date().toISOString() }));

priv.post('/orders', async (c) => {
  const order = await createOrder(c.env.DB, await c.req.json(), c.get('user'));
  return c.json({ success: true, data: order });
});

priv.get('/orders/:id', async (c) => {
  const order = await getOrder(c.env.DB, Number(c.req.param('id')));
  if (!order) return c.json({ success: false, message: 'Order not found' }, 404);
  return c.json({ success: true, data: order });
});

priv.patch('/orders/:id/status', async (c) => {
  const { status } = await c.req.json();
  return c.json({ success: true, data: await setStatus(c.env.DB, Number(c.req.param('id')), status, c.get('user')) });
});

priv.get('/dashboard/summary', async (c) => {
  const { from, to } = c.req.query();
  const start = from || new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const end = to || new Date(Date.now() + 864e5).toISOString();
  return c.json({ success: true, data: await summary(c.env.DB, start, end), statuses: STATUSES });
});

// 24order client statistics (needs STATS_API_KEY): signed-in users only.
priv.get('/stats', (c) => statsRoute(c));

/* ---------- MTV (TV menus): public, the TVs read it without signing in ---------- */
app.get('/menu', (c) => menuRoute(c));

/* ---------- Customer ordering page ("order" link): public ---------- */
app.get('/shop/menu', (c) => shopMenu(c));
app.post('/shop/price', (c) => shopPrice(c));
app.post('/shop/orders', (c) => shopPlaceOrder(c));
app.get('/shop/orders/:code', (c) => shopTrack(c));

/* ---------- Media (ingredient photos): read is public so TVs and the order page can show them ---------- */
app.get('/media', async (c) => c.json({ success: true, data: await listMedia(c.env.DB) }));
app.get('/media/:key', (c) => getMedia(c));
priv.put('/media/:key', (c) => putMedia(c));
priv.delete('/media/:key', (c) => deleteMedia(c));
priv.post('/ai/image', (c) => generateImage(c));
priv.get('/ai/status', (c) => aiStatus(c));

app.route('/', priv);

function validateAccount(name, email, password) {
  const err = (m) => Object.assign(new Error(m), { status: 422 });
  if (!name || String(name).trim().length < 2) throw err('Name is too short');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email || '').trim())) throw err('Email is not valid');
  if (!password || String(password).length < 8) throw err('Password must have at least 8 characters');
}

export default {
  fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return app.fetch(request, env, ctx);
    return env.ASSETS.fetch(request);
  },
};
