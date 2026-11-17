// 24order Pro – Cloudflare Worker
// Serves the static app from ./public and a small JSON API under /api/*.
// API keys live only here (Cloudflare secrets), never in the browser.

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...extra } });

// Only talk to 24order servers, so the proxy can't be used to reach other hosts.
const SERVER_RE = /^[a-z0-9-]+\.24order\.com$/i;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    try {
      if (url.pathname === '/api/health') return json({ ok: true });

      if (url.pathname === '/api/menu' && request.method === 'GET') {
        return await getMenu(url, env, ctx);
      }

      if (url.pathname === '/api/stats' && request.method === 'GET') {
        return await getStats(env);
      }

      if (url.pathname.startsWith('/api/')) {
        return json({ success: false, message: 'Not found' }, 404);
      }

      return env.ASSETS.fetch(request);
    } catch (err) {
      return json({ success: false, message: String(err && err.message || err) }, 500);
    }
  },
};

/**
 * GET /api/menu?source=demo&restaurant=paradis
 * GET /api/menu?source=live&server=paradis-server.24order.com&branche_id=1
 *
 * Always answers in the app's own menu format (see public/data/README.md).
 * "live" uses the 24order AI Agent API, which today returns only ids, names and
 * descriptions; prices, sizes, photos and extras need a fuller endpoint.
 */
async function getMenu(url, env, ctx) {
  const source = url.searchParams.get('source') || 'demo';

  if (source === 'demo') {
    const restaurant = (url.searchParams.get('restaurant') || 'paradis').replace(/[^a-z0-9-]/gi, '');
    const res = await env.ASSETS.fetch(new Request(new URL(`/data/${restaurant}.json`, url)));
    if (!res.ok) return json({ success: false, message: 'Unknown demo restaurant' }, 404);
    return json({ success: true, data: await res.json() });
  }

  // Live data from a 24order server
  let base = env.ORDER_API_BASE;
  const server = url.searchParams.get('server');
  if (server) {
    if (!SERVER_RE.test(server)) return json({ success: false, message: 'Server must be a *.24order.com host' }, 400);
    base = `https://${server}/api/v1/ai-agent`;
  }
  const api = new URL(`${base}/menu`);
  const branch = url.searchParams.get('branche_id');
  if (branch) api.searchParams.set('branche_id', branch);

  const cache = caches.default;
  const cacheKey = new Request(api.toString());
  let upstream = await cache.match(cacheKey);
  if (!upstream) {
    upstream = await fetch(api.toString(), { headers: { accept: 'application/json' } });
    if (upstream.ok) {
      const copy = new Response(upstream.clone().body, upstream);
      copy.headers.set('cache-control', 'public, max-age=120');
      ctx.waitUntil(cache.put(cacheKey, copy));
    }
  }
  if (!upstream.ok) return json({ success: false, message: `24order answered ${upstream.status}` }, 502);

  const body = await upstream.json();
  return json({ success: true, data: fromAiAgentMenu(body.data || [], server || 'server.24order.com') });
}

// Map the AI Agent API menu into the app's menu format.
function fromAiAgentMenu(categories, server) {
  return {
    restaurant: { name: server.split('.')[0].replace(/-server$/, ''), logo: null, currency: 'kr', priceStyle: 'dash' },
    source: 'live',
    missing: ['prices', 'sizes', 'images', 'components'],
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      image: null,
      foods: (c.foods || []).map((f, i) => ({
        id: f.id,
        number: i + 1,
        name: f.name,
        image: null,
        prices: [],
        description: f.description || '',
        components: (f.description || '')
          .split(/,|\bog\b|\band\b/i)
          .map((s) => s.trim())
          .filter(Boolean)
          .map((name) => ({ name, state: 'selected' })),
      })),
    })),
  };
}

// GET /api/stats – proxied so the key never reaches the browser.
async function getStats(env) {
  if (!env.STATS_API_KEY) return json({ success: false, message: 'STATS_API_KEY is not set' }, 501);
  const res = await fetch(`${env.MAIN_API_BASE}/stats/clients`, {
    headers: { 'X-API-Key': env.STATS_API_KEY, accept: 'application/json' },
  });
  const text = await res.text();
  return new Response(text, { status: res.status, headers: JSON_HEADERS });
}
