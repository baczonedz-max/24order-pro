// Menu feed for the MTV builder, and read-only proxies to 24order.
// source=db   – this dashboard's own database (default once products exist)
// source=demo – public/data/<restaurant>.json
// source=live – 24order AI Agent API (names and descriptions only)
import { loadCatalog } from './orders.js';

const SERVER_RE = /^[a-z0-9-]+\.24order\.com$/i;

export async function menuRoute(c) {
  const url = new URL(c.req.url);
  const source = url.searchParams.get('source') || 'db';
  const env = c.env;

  if (source === 'db') {
    const cats = await loadCatalog(env.DB);
    const s = await env.DB.prepare(`SELECT key, value FROM settings`).all();
    const set = Object.fromEntries(s.results.map((r) => [r.key, r.value]));
    return c.json({ success: true, data: {
      restaurant: { name: set.restaurant_name || '', logo: set.restaurant_logo || null, currency: set.currency || 'kr', priceStyle: 'dash' },
      source: 'db',
      categories: cats.map((cat) => ({
        id: cat.id, name: cat.name, image: cat.image, footer: cat.footer,
        foods: cat.foods.map((f) => ({
          id: f.id, number: f.number, name: f.name, image: f.image, description: f.description || '',
          prices: f.sizes.map((z) => ({ size: z.code || '', label: z.label || '', price: z.price })),
          components: f.components.map((cp) => ({ name: cp.name, state: cp.state, extra: cp.extra_by_size || cp.extra_price })),
        })),
      })),
    } });
  }

  if (source === 'demo') {
    const restaurant = (url.searchParams.get('restaurant') || 'paradis').replace(/[^a-z0-9-]/gi, '');
    const res = await env.ASSETS.fetch(new Request(new URL(`/data/${restaurant}.json`, url)));
    if (!res.ok) return c.json({ success: false, message: 'Unknown demo restaurant' }, 404);
    return c.json({ success: true, data: await res.json() });
  }

  let base = env.ORDER_API_BASE;
  const server = url.searchParams.get('server');
  if (server) {
    if (!SERVER_RE.test(server)) return c.json({ success: false, message: 'Server must be a *.24order.com host' }, 400);
    base = `https://${server}/api/v1/ai-agent`;
  }
  const api = new URL(`${base}/menu`);
  const branch = url.searchParams.get('branche_id');
  if (branch) api.searchParams.set('branche_id', branch);
  const upstream = await fetch(api.toString(), { headers: { accept: 'application/json' }, cf: { cacheTtl: 120 } });
  if (!upstream.ok) return c.json({ success: false, message: `24order answered ${upstream.status}` }, 502);
  const body = await upstream.json();
  return c.json({ success: true, data: {
    restaurant: { name: (server || 'server').split('.')[0].replace(/-server$/, ''), logo: null, currency: 'kr', priceStyle: 'dash' },
    source: 'live',
    missing: ['prices', 'sizes', 'images', 'components'],
    categories: (body.data || []).map((cat) => ({
      id: cat.id, name: cat.name, image: null,
      foods: (cat.foods || []).map((f, i) => ({
        id: f.id, number: i + 1, name: f.name, image: null, prices: [], description: f.description || '',
        components: (f.description || '').split(/,|\bog\b|\band\b/i).map((s) => s.trim()).filter(Boolean).map((name) => ({ name, state: 'selected' })),
      })),
    })),
  } });
}

export async function statsRoute(c) {
  if (!c.env.STATS_API_KEY) return c.json({ success: false, message: 'STATS_API_KEY is not set' }, 501);
  const res = await fetch(`${c.env.MAIN_API_BASE}/stats/clients`, { headers: { 'X-API-Key': c.env.STATS_API_KEY, accept: 'application/json' } });
  return new Response(await res.text(), { status: res.status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
