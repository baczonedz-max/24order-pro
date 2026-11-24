// D1 schema. Tables are created on the first request, so a new database needs no manual step.
// Each statement is idempotent; bump SCHEMA_VERSION and add statements to migrate later.

export const SCHEMA_VERSION = 4;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS media (
     key TEXT PRIMARY KEY,
     mime TEXT NOT NULL,
     data BLOB NOT NULL,
     w INTEGER NOT NULL DEFAULT 0,
     h INTEGER NOT NULL DEFAULT 0,
     source TEXT NOT NULL DEFAULT 'upload',
     updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`,
  `CREATE TABLE IF NOT EXISTS users (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL,
     email TEXT NOT NULL UNIQUE COLLATE NOCASE,
     password_hash TEXT NOT NULL,
     role TEXT NOT NULL DEFAULT 'admin',
     active INTEGER NOT NULL DEFAULT 1,
     created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS sessions (
     token_hash TEXT PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     expires_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS categories (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL,
     image TEXT,
     sort INTEGER NOT NULL DEFAULT 0,
     active INTEGER NOT NULL DEFAULT 1,
     footer_json TEXT)`,
  `CREATE TABLE IF NOT EXISTS foods (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
     number INTEGER,
     name TEXT NOT NULL,
     description TEXT,
     image TEXT,
     type TEXT NOT NULL DEFAULT 'other',
     tax_takeaway REAL NOT NULL DEFAULT 15,
     tax_dinein REAL NOT NULL DEFAULT 25,
     active INTEGER NOT NULL DEFAULT 1,
     sort INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS food_sizes (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     food_id INTEGER NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
     code TEXT,
     label TEXT,
     price REAL NOT NULL,
     sort INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS food_components (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     food_id INTEGER NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     state TEXT NOT NULL DEFAULT 'selected',
     extra_price REAL NOT NULL DEFAULT 0,
     extra_by_size TEXT,
     sort INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS orders (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     code TEXT NOT NULL UNIQUE,
     status TEXT NOT NULL DEFAULT 'new',
     type TEXT NOT NULL DEFAULT 'takeaway',
     source TEXT NOT NULL DEFAULT 'pos',
     customer_name TEXT,
     customer_phone TEXT,
     table_no TEXT,
     address TEXT,
     note TEXT,
     subtotal REAL NOT NULL DEFAULT 0,
     discount REAL NOT NULL DEFAULT 0,
     tax_total REAL NOT NULL DEFAULT 0,
     total REAL NOT NULL DEFAULT 0,
     payment_method TEXT NOT NULL DEFAULT 'cash',
     paid INTEGER NOT NULL DEFAULT 0,
     created_by INTEGER REFERENCES users(id),
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
     updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))`,
  `CREATE INDEX IF NOT EXISTS orders_created ON orders(created_at)`,
  `CREATE INDEX IF NOT EXISTS orders_updated ON orders(updated_at)`,
  `CREATE TABLE IF NOT EXISTS order_items (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
     food_id INTEGER,
     name TEXT NOT NULL,
     size_label TEXT,
     qty INTEGER NOT NULL,
     unit_price REAL NOT NULL,
     tax_rate REAL NOT NULL,
     line_total REAL NOT NULL,
     added_json TEXT,
     removed_json TEXT,
     note TEXT)`,
  `CREATE TABLE IF NOT EXISTS order_events (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
     status TEXT NOT NULL,
     user_id INTEGER,
     at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))`,
];

let ready = false;

/** Create tables once per Worker instance; seed the demo menu into an empty database. */
export async function ensureSchema(env, request) {
  if (ready) return;
  const row = await env.DB.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='settings'`).first();
  let version = 0;
  if (row) {
    const v = await env.DB.prepare(`SELECT value FROM settings WHERE key='schema_version'`).first();
    version = Number(v?.value || 0);
  }
  if (version < SCHEMA_VERSION) {
    await env.DB.batch(SCHEMA.map((s) => env.DB.prepare(s)));
    await env.DB.prepare(`INSERT OR REPLACE INTO settings(key, value) VALUES ('schema_version', ?)`).bind(String(SCHEMA_VERSION)).run();
    const count = await env.DB.prepare(`SELECT COUNT(*) AS n FROM categories`).first();
    if (!count?.n) await seedDemoMenu(env, request);
    else {
      if (version < 3) await refreshDemoPhotos(env, request);
      if (version < 4) await fillRestaurantInfo(env, request);
    }
  }
  ready = true;
}

/** Put the Paradis demo menu into the database so POS works from the first minute. */
async function seedDemoMenu(env, request) {
  const res = await env.ASSETS.fetch(new Request(new URL('/data/paradis.json', request.url)));
  if (!res.ok) return;
  const data = await res.json();
  await importMenu(env, data, { replace: false });
  const r = data.restaurant || {};
  await env.DB.batch([
    env.DB.prepare(`INSERT OR REPLACE INTO settings(key, value) VALUES ('restaurant_name', ?)`).bind(r.name || 'Restaurant'),
    env.DB.prepare(`INSERT OR REPLACE INTO settings(key, value) VALUES ('restaurant_logo', ?)`).bind(r.logo || ''),
    env.DB.prepare(`INSERT OR REPLACE INTO settings(key, value) VALUES ('currency', ?)`).bind(r.currency || 'kr'),
  ]);
}

/** v3: demo products that were seeded with their category's photo get their own photo. */
async function refreshDemoPhotos(env, request) {
  const res = await env.ASSETS.fetch(new Request(new URL('/data/paradis.json', request.url)));
  if (!res.ok) return;
  const data = await res.json();
  const stmts = (data.categories || []).flatMap((c) => (c.foods || []).filter((f) => f.image).map((f) =>
    env.DB.prepare(`UPDATE foods SET image = ? WHERE name = ? AND image LIKE '%/storage/categories/%'`).bind(f.image, f.name)));
  if (stmts.length) await env.DB.batch(stmts);
}

/** v4: a restaurant without a name or logo gets the demo restaurant's (never overwrites a value that is set). */
async function fillRestaurantInfo(env, request) {
  const res = await env.ASSETS.fetch(new Request(new URL('/data/paradis.json', request.url)));
  if (!res.ok) return;
  const r = (await res.json()).restaurant || {};
  const put = (key, value) => env.DB.prepare(
    `INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value WHERE settings.value IS NULL OR settings.value = ''`,
  ).bind(key, value);
  await env.DB.batch([put('restaurant_name', r.name || 'Restaurant'), put('restaurant_logo', r.logo || ''), put('currency', r.currency || 'kr')]);
}

/** Import a menu in the app's JSON format (see scripts/build-demo-data.mjs). */
export async function importMenu(env, data, { replace = false } = {}) {
  if (replace) await env.DB.batch([env.DB.prepare(`DELETE FROM categories`)]);
  let catSort = 0;
  for (const c of data.categories || []) {
    const cat = await env.DB.prepare(`INSERT INTO categories(name, image, sort, footer_json) VALUES (?, ?, ?, ?) RETURNING id`)
      .bind(c.name, c.image || null, catSort++, c.footer ? JSON.stringify(c.footer) : null)
      .first();
    let foodSort = 0;
    for (const f of c.foods || []) {
      const type = /pizza/i.test(c.name) ? 'pizza' : /drikke|drink|boisson/i.test(c.name) ? 'drink' : 'other';
      const food = await env.DB.prepare(
        `INSERT INTO foods(category_id, number, name, description, image, type, sort) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      ).bind(cat.id, f.number ?? null, f.name, f.description || null, f.image || null, type, foodSort++).first();
      const stmts = [];
      (f.prices || []).forEach((p, i) => {
        stmts.push(env.DB.prepare(`INSERT INTO food_sizes(food_id, code, label, price, sort) VALUES (?, ?, ?, ?, ?)`)
          .bind(food.id, p.size || null, p.label || null, Number(p.price) || 0, i));
      });
      (f.components || []).forEach((cp, i) => {
        const bySize = cp.extra && typeof cp.extra === 'object' ? JSON.stringify(cp.extra) : null;
        const flat = typeof cp.extra === 'number' ? cp.extra : 0;
        stmts.push(env.DB.prepare(`INSERT INTO food_components(food_id, name, state, extra_price, extra_by_size, sort) VALUES (?, ?, ?, ?, ?, ?)`)
          .bind(food.id, cp.name, cp.state === 'optional' ? 'optional' : 'selected', flat, bySize, i));
      });
      if (stmts.length) await env.DB.batch(stmts);
    }
  }
}
