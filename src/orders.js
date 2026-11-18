// Orders: prices, extras and tax are always worked out here from the database.
// The POS (or any client) sends only food ids, sizes, chosen extras and quantities.

export const STATUSES = ['new', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'];
export const TYPES = ['takeaway', 'dine_in', 'delivery'];
export const PAYMENTS = ['cash', 'card', 'vipps', 'unpaid'];

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** Full menu for the POS: categories → foods → sizes + components. */
export async function loadCatalog(db, { activeOnly = true } = {}) {
  const [cats, foods, sizes, comps] = await db.batch([
    db.prepare(`SELECT * FROM categories ${activeOnly ? 'WHERE active = 1' : ''} ORDER BY sort, id`),
    db.prepare(`SELECT * FROM foods ${activeOnly ? 'WHERE active = 1' : ''} ORDER BY sort, id`),
    db.prepare(`SELECT * FROM food_sizes ORDER BY sort, id`),
    db.prepare(`SELECT * FROM food_components ORDER BY sort, id`),
  ]);
  const sizesBy = group(sizes.results, 'food_id');
  const compsBy = group(comps.results, 'food_id');
  const foodsBy = group(
    foods.results.map((f) => ({
      ...f,
      sizes: sizesBy[f.id] || [],
      components: (compsBy[f.id] || []).map((c) => ({ ...c, extra_by_size: c.extra_by_size ? JSON.parse(c.extra_by_size) : null })),
    })),
    'category_id',
  );
  return cats.results.map((c) => ({ ...c, footer: c.footer_json ? JSON.parse(c.footer_json) : null, foods: foodsBy[c.id] || [] }));
}

function group(rows, key) {
  const out = {};
  for (const r of rows) (out[r[key]] ||= []).push(r);
  return out;
}

const extraPrice = (comp, size) => {
  if (comp.extra_by_size && size?.code && comp.extra_by_size[size.code] !== undefined) return Number(comp.extra_by_size[size.code]);
  return Number(comp.extra_price || 0);
};

/**
 * Price a cart. items: [{ food_id, size_id, qty, add: [componentId], remove: [componentId], note }]
 * Prices include VAT (Norway). Discount: { type: 'percent'|'amount', value }.
 */
export async function priceCart(db, { items = [], type = 'takeaway', discount = null }) {
  if (!Array.isArray(items) || !items.length) throw httpError(422, 'The cart is empty');
  if (items.length > 100) throw httpError(422, 'Too many items');
  const ids = [...new Set(items.map((i) => Number(i.food_id)))];
  const ph = ids.map(() => '?').join(',');
  const [foods, sizes, comps] = await db.batch([
    db.prepare(`SELECT * FROM foods WHERE id IN (${ph})`).bind(...ids),
    db.prepare(`SELECT * FROM food_sizes WHERE food_id IN (${ph})`).bind(...ids),
    db.prepare(`SELECT * FROM food_components WHERE food_id IN (${ph})`).bind(...ids),
  ]);
  const foodById = Object.fromEntries(foods.results.map((f) => [f.id, f]));

  const lines = items.map((it, idx) => {
    const food = foodById[Number(it.food_id)];
    if (!food || !food.active) throw httpError(422, `Item ${idx + 1}: product not available`);
    const qty = Math.trunc(Number(it.qty));
    if (!(qty >= 1 && qty <= 99)) throw httpError(422, `Item ${idx + 1}: quantity must be 1–99`);
    const fs = sizes.results.filter((s) => s.food_id === food.id).sort((a, b) => a.sort - b.sort);
    const size = it.size_id ? fs.find((s) => s.id === Number(it.size_id)) : fs[0];
    if (!size) throw httpError(422, `Item ${idx + 1}: size not found`);
    const fc = comps.results.filter((c) => c.food_id === food.id).map((c) => ({ ...c, extra_by_size: c.extra_by_size ? JSON.parse(c.extra_by_size) : null }));
    const added = (it.add || []).map((id) => fc.find((c) => c.id === Number(id) && c.state === 'optional')).filter(Boolean);
    const removed = (it.remove || []).map((id) => fc.find((c) => c.id === Number(id) && c.state === 'selected')).filter(Boolean);
    const extras = added.reduce((a, c) => a + extraPrice(c, size), 0);
    const unit = round2(Number(size.price) + extras);
    const taxRate = type === 'dine_in' ? Number(food.tax_dinein) : Number(food.tax_takeaway);
    return {
      food_id: food.id,
      name: food.name,
      number: food.number,
      size_label: fs.length > 1 ? size.label || size.code : null,
      qty,
      unit_price: unit,
      tax_rate: taxRate,
      line_total: round2(unit * qty),
      added: added.map((c) => ({ id: c.id, name: c.name, price: extraPrice(c, size) })),
      removed: removed.map((c) => ({ id: c.id, name: c.name })),
      note: it.note ? String(it.note).slice(0, 200) : null,
    };
  });

  const subtotal = round2(lines.reduce((a, l) => a + l.line_total, 0));
  let disc = 0;
  if (discount && Number(discount.value) > 0) {
    disc = discount.type === 'percent' ? (subtotal * Math.min(100, Number(discount.value))) / 100 : Math.min(subtotal, Number(discount.value));
  }
  disc = round2(disc);
  const factor = subtotal ? (subtotal - disc) / subtotal : 1;
  // VAT is included in the prices: tax = gross × rate / (100 + rate), after the discount.
  const taxByRate = {};
  for (const l of lines) {
    const gross = l.line_total * factor;
    taxByRate[l.tax_rate] = (taxByRate[l.tax_rate] || 0) + (gross * l.tax_rate) / (100 + l.tax_rate);
  }
  const taxes = Object.entries(taxByRate).map(([rate, amount]) => ({ rate: Number(rate), amount: round2(amount) }));
  const total = round2(subtotal - disc);
  return { lines, subtotal, discount: disc, taxes, tax_total: round2(taxes.reduce((a, t) => a + t.amount, 0)), total };
}

export async function createOrder(db, body, user) {
  const type = TYPES.includes(body.type) ? body.type : 'takeaway';
  const payment = PAYMENTS.includes(body.payment_method) ? body.payment_method : 'cash';
  const priced = await priceCart(db, { items: body.items, type, discount: body.discount });
  const code = await newCode(db);
  const now = new Date().toISOString();
  const status = body.status === 'completed' ? 'completed' : 'new';
  const order = await db.prepare(
    `INSERT INTO orders(code, status, type, source, customer_name, customer_phone, table_no, address, note,
       subtotal, discount, tax_total, total, payment_method, paid, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
  ).bind(
    code, status, type, body.source === 'online' ? 'online' : 'pos',
    clip(body.customer_name, 80), clip(body.customer_phone, 30), clip(body.table_no, 20), clip(body.address, 200), clip(body.note, 300),
    priced.subtotal, priced.discount, priced.tax_total, priced.total, payment, payment === 'unpaid' ? 0 : 1, user?.id ?? null, now, now,
  ).first();
  await db.batch([
    ...priced.lines.map((l) => db.prepare(
      `INSERT INTO order_items(order_id, food_id, name, size_label, qty, unit_price, tax_rate, line_total, added_json, removed_json, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(order.id, l.food_id, l.name, l.size_label, l.qty, l.unit_price, l.tax_rate, l.line_total,
      l.added.length ? JSON.stringify(l.added) : null, l.removed.length ? JSON.stringify(l.removed) : null, l.note)),
    db.prepare(`INSERT INTO order_events(order_id, status, user_id, at) VALUES (?, ?, ?, ?)`).bind(order.id, status, user?.id ?? null, now),
  ]);
  return getOrder(db, order.id);
}

export async function getOrder(db, id) {
  const [o, items, events] = await db.batch([
    db.prepare(`SELECT * FROM orders WHERE id = ?`).bind(id),
    db.prepare(`SELECT * FROM order_items WHERE order_id = ? ORDER BY id`).bind(id),
    db.prepare(`SELECT e.status, e.at, u.name AS user_name FROM order_events e LEFT JOIN users u ON u.id = e.user_id WHERE order_id = ? ORDER BY e.id`).bind(id),
  ]);
  const order = o.results[0];
  if (!order) return null;
  order.items = items.results.map((i) => ({ ...i, added: i.added_json ? JSON.parse(i.added_json) : [], removed: i.removed_json ? JSON.parse(i.removed_json) : [] }));
  order.events = events.results;
  return order;
}

export async function setStatus(db, id, status, user) {
  if (!STATUSES.includes(status)) throw httpError(422, 'Unknown status');
  const now = new Date().toISOString();
  const res = await db.batch([
    db.prepare(`UPDATE orders SET status = ?, updated_at = ? WHERE id = ?`).bind(status, now, id),
    db.prepare(`INSERT INTO order_events(order_id, status, user_id, at) VALUES (?, ?, ?, ?)`).bind(id, status, user?.id ?? null, now),
  ]);
  if (!res[0].meta.changes) throw httpError(404, 'Order not found');
  return getOrder(db, id);
}

export async function listOrders(db, q) {
  const where = [];
  const args = [];
  if (q.status && q.status !== 'all') {
    if (q.status === 'active') where.push(`status IN ('new','accepted','preparing','ready')`);
    else { where.push('status = ?'); args.push(q.status); }
  }
  if (q.type && TYPES.includes(q.type)) { where.push('type = ?'); args.push(q.type); }
  if (q.from) { where.push('created_at >= ?'); args.push(q.from); }
  if (q.to) { where.push('created_at < ?'); args.push(q.to); }
  if (q.since) { where.push('updated_at > ?'); args.push(q.since); }
  if (q.search) {
    where.push('(code LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)');
    const s = `%${String(q.search).slice(0, 40)}%`;
    args.push(s, s, s);
  }
  const limit = Math.min(200, Math.max(1, Number(q.limit) || 50));
  const offset = Math.max(0, Number(q.offset) || 0);
  const sql = `SELECT o.*, (SELECT SUM(qty) FROM order_items WHERE order_id = o.id) AS item_count,
    (SELECT group_concat(qty || '× ' || name, ', ') FROM order_items WHERE order_id = o.id) AS items_preview FROM orders o
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
  const rows = await db.prepare(sql).bind(...args, limit, offset).all();
  return rows.results;
}

export async function summary(db, from, to) {
  const r = await db.prepare(
    `SELECT COUNT(*) AS orders,
            COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total END), 0) AS revenue,
            COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 END), 0) AS cancelled,
            COALESCE(SUM(CASE WHEN status IN ('new','accepted','preparing','ready') THEN 1 END), 0) AS active,
            COALESCE(SUM(CASE WHEN type = 'takeaway' THEN 1 END), 0) AS takeaway,
            COALESCE(SUM(CASE WHEN type = 'dine_in' THEN 1 END), 0) AS dine_in,
            COALESCE(SUM(CASE WHEN type = 'delivery' THEN 1 END), 0) AS delivery
     FROM orders WHERE created_at >= ? AND created_at < ?`,
  ).bind(from, to).first();
  const top = await db.prepare(
    `SELECT i.name, SUM(i.qty) AS qty, SUM(i.line_total) AS total, MAX(f.image) AS image FROM order_items i
     JOIN orders o ON o.id = i.order_id LEFT JOIN foods f ON f.id = i.food_id
     WHERE o.created_at >= ? AND o.created_at < ? AND o.status != 'cancelled' GROUP BY i.name ORDER BY qty DESC LIMIT 5`,
  ).bind(from, to).all();
  // Raw points for the sales chart; the browser groups them by local hour or day.
  const points = await db.prepare(
    `SELECT created_at AS t, total FROM orders WHERE created_at >= ? AND created_at < ? AND status != 'cancelled' ORDER BY created_at LIMIT 5000`,
  ).bind(from, to).all();
  const recent = await db.prepare(
    `SELECT id, code, status, type, table_no, customer_name, total, created_at FROM orders ORDER BY created_at DESC LIMIT 6`,
  ).all();
  return { ...r, top: top.results, points: points.results, recent: recent.results };
}

async function newCode(db) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < 5; i++) {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    const code = [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
    const hit = await db.prepare(`SELECT 1 FROM orders WHERE code = ?`).bind(code).first();
    if (!hit) return code;
  }
  throw httpError(500, 'Could not create an order code');
}

const clip = (v, n) => (v === undefined || v === null || v === '' ? null : String(v).slice(0, n));

export function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}
