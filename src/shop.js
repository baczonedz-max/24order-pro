// Customer ordering page ("order" link): public, read-only menu plus placing and tracking orders.
// Nothing here needs a signed-in user, so it returns only what a customer may see.
import { loadCatalog, priceCart, createOrder, httpError } from './orders.js';

const SHOP_TYPES = ['takeaway', 'delivery'];

/* Allergens (the 14 EU/Norwegian ones), guessed from the dish name, category and ingredients
   until the restaurant sets them itself. The page says they are a guide. */
const ALLERGEN_RULES = [
  ['gluten', /pizza|deig|brød|pita|tortilla|lefse|nachos|krutong|burger|kebab(?!tallerken)|wrap|innbakt|panert|nugget|bread|bun|calzone|baguette/i],
  ['milk', /\bost\b|ost[,\s]|ost$|cheese|mozzarella|cheddar|parmesan|feta|fløte|rømme|yoghurt|smør|bearnaise|hvitløk\w*\s?saus|kebabsaus|dressing|melk|cream|creme/i],
  ['egg', /\begg|majones|mayo|aioli|bearnaise|remulade/i],
  ['fish', /fisk|tunfisk|laks|ansjos|torsk|fish|tuna|salmon/i],
  ['crustaceans', /reke|scampi|kreps|krabbe|hummer|shrimp|prawn/i],
  ['molluscs', /blåskjell|musling|blekksprut|calamari|skjell/i],
  ['mustard', /sennep|mustard/i],
  ['sesame', /sesam|tahini/i],
  ['peanuts', /peanøtt|peanut/i],
  ['nuts', /nøtt|mandel|cashew|pistasj|walnut|hazelnut/i],
  ['soy', /soya|\bsoy/i],
  ['celery', /selleri|celery/i],
];

function guessAllergens(food, categoryName) {
  const base = food.components.filter((c) => c.state === 'selected').map((c) => c.name).join(', ');
  const text = [food.name, categoryName, food.description || '', base].join(' · ');
  const hits = ALLERGEN_RULES.filter(([, re]) => re.test(text)).map(([k]) => k);
  if (food.type === 'pizza' && !hits.includes('gluten')) hits.unshift('gluten');
  if (/drikke|drink|boisson/i.test(categoryName)) return [];
  return hits;
}

const slug = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'menu';

export async function shopMenu(c) {
  const db = c.env.DB;
  const [cats, s] = await Promise.all([loadCatalog(db), db.prepare(`SELECT key, value FROM settings`).all()]);
  const set = Object.fromEntries(s.results.map((r) => [r.key, r.value]));
  const used = new Set();
  return c.json({ success: true, data: {
    restaurant: { name: set.restaurant_name || '', logo: set.restaurant_logo || null, currency: set.currency || 'kr' },
    categories: cats.filter((cat) => cat.foods.length).map((cat) => {
      let sl = slug(cat.name);
      while (used.has(sl)) sl += '-' + cat.id;
      used.add(sl);
      return {
        id: cat.id, slug: sl, name: cat.name, image: cat.image, footer: cat.footer,
        foods: cat.foods.map((f) => ({
          id: f.id, number: f.number, name: f.name, description: f.description || '', image: f.image, type: f.type,
          sizes: f.sizes.map((z) => ({ id: z.id, code: z.code, label: z.label, price: z.price })),
          components: f.components.map((cp) => ({ id: cp.id, name: cp.name, state: cp.state, extra_price: cp.extra_price, extra_by_size: cp.extra_by_size, choice: cp.choice || null, image: cp.image || null })),
          allergens: guessAllergens(f, cat.name),
        })),
      };
    }),
  } });
}

function cleanItems(items) {
  if (!Array.isArray(items)) throw httpError(422, 'The cart is empty');
  if (items.length > 40) throw httpError(422, 'Too many items');
  return items.map((i) => ({
    food_id: i.food_id, size_id: i.size_id, qty: i.qty,
    add: Array.isArray(i.add) ? i.add.slice(0, 40) : [], remove: Array.isArray(i.remove) ? i.remove.slice(0, 40) : [],
    note: i.note,
  }));
}

export async function shopPrice(c) {
  const body = await c.req.json();
  const type = SHOP_TYPES.includes(body.type) ? body.type : 'takeaway';
  return c.json({ success: true, data: await priceCart(c.env.DB, { items: cleanItems(body.items), type }) });
}

export async function shopPlaceOrder(c) {
  const body = await c.req.json();
  if (body.website) throw httpError(422, 'Rejected'); // hidden field: only bots fill it in
  const err = (m) => httpError(422, m);
  const name = String(body.customer_name || '').trim();
  const phone = String(body.customer_phone || '').trim();
  const type = SHOP_TYPES.includes(body.type) ? body.type : 'takeaway';
  if (name.length < 2) throw err('name');
  if ((phone.match(/\d/g) || []).length < 8) throw err('phone');
  if (type === 'delivery' && String(body.address || '').trim().length < 5) throw err('address');
  const order = await createOrder(c.env.DB, {
    items: cleanItems(body.items), type, source: 'online', payment_method: 'unpaid', status: 'new',
    customer_name: name, customer_phone: phone, address: type === 'delivery' ? body.address : null, note: body.note,
  }, null);
  return c.json({ success: true, data: publicOrder(order) });
}

export async function shopTrack(c) {
  const code = String(c.req.param('code') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  const o = await c.env.DB.prepare(`SELECT * FROM orders WHERE code = ? AND source = 'online'`).bind(code).first();
  if (!o) return c.json({ success: false, message: 'Order not found' }, 404);
  const items = await c.env.DB.prepare(`SELECT name, size_label, qty, line_total, added_json, removed_json FROM order_items WHERE order_id = ? ORDER BY id`).bind(o.id).all();
  return c.json({ success: true, data: publicOrder({ ...o, items: items.results.map((i) => ({ ...i, added: JSON.parse(i.added_json || '[]'), removed: JSON.parse(i.removed_json || '[]') })) }) });
}

// Only what the customer needs to see: no phone, no address, no staff names.
function publicOrder(o) {
  return {
    code: o.code, status: o.status, type: o.type, total: o.total, tax_total: o.tax_total,
    created_at: o.created_at, updated_at: o.updated_at, first_name: String(o.customer_name || '').split(/\s+/)[0],
    items: (o.items || []).map((i) => ({ name: i.name, size_label: i.size_label, qty: i.qty, line_total: i.line_total,
      added: (i.added || []).map((a) => a.name), removed: (i.removed || []).map((r) => r.name) })),
  };
}
