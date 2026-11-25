// Builds public/data/paradis.json from the restaurant's real 24order menu (the public API its order site uses):
// every category and product with its photo, sizes and prices, included ingredients, extras (with per-size
// prices), "choose one" groups and the ingredient photos.
// Run: node scripts/import-24order.mjs [server]   (default: paradis-server.24order.com)
import fs from 'node:fs';

const SERVER = process.argv[2] || 'paradis-server.24order.com';
const API = `https://${SERVER}/api/v1/general`;
const HEAD = { 'User-Agent': 'Mozilla/5.0 (24order-pro menu import)', Accept: 'application/json' };
const get = async (path) => {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(`${API}/${path}`, { headers: HEAD });
    if (r.ok) return (await r.json()).data;
    await new Promise((res) => setTimeout(res, 800));
  }
  throw new Error(`GET ${path} failed`);
};
const enc = (u) => (u ? encodeURI(decodeURI(u)) : null);

// Choices the restaurant sells as "one or the other" but lists as plain extras.
const CHOICES = {
  'KEBAB I RULL': { group: 'Kjøtt', items: { Kebab: '/img/dish/rull.kebab.webp', Kylling: 'https://paradis-server.24order.com/storage/foods/' + encodeURI('1794751528_Rullekebab kylling 1.webp') }, default: 'Kebab' },
};

const cats = await get('categories?platform=shop&lang=no');
const categories = [];
for (const c of cats) {
  const list = [];
  for (let page = 1; page < 20; page++) {
    const part = await get(`foods-light?category_slug=${encodeURIComponent(c.slug)}&page=${page}&page_size=50&platform=shop&lang=no`);
    list.push(...part);
    if (part.length < 50) break;
  }
  const foods = [];
  for (const [i, lite] of list.entries()) {
    const f = await get(`foods/${encodeURIComponent(lite.slug)}?platform=shop&lang=no`);
    // Sizes: every bread × size. One size called "Pris" means "no sizes".
    const breads = f.prices || [];
    const prices = [];
    for (const b of breads) for (const d of b.data || []) {
      const size = d.data?.name && d.data.name !== 'Pris' ? d.data.name : '';
      prices.push({ size: `${b.bread_id}-${d.size_id}`, label: [size, breads.length > 1 ? b.name : ''].filter(Boolean).join(' '), price: Number(d.price) || 0 });
    }
    if (!prices.length) prices.push({ size: '', label: '', price: Number(f.price) || 0 });
    // Ingredients and extras.
    const choice = CHOICES[f.name];
    const components = [];
    for (const g of f.components || []) {
      for (const it of g.items || []) {
        const byPrice = (it.prices || []).filter((p) => p.price_extra != null || p.price != null);
        const extra = byPrice.length
          ? Object.fromEntries(byPrice.map((p) => [`${p.bread_id}-${p.size_id}`, Number(p.price_extra ?? p.price) || 0]))
          : Number(it.price_extra ?? it.price) || 0;
        const comp = { name: it.name, state: it.basic ? 'selected' : 'optional', extra, icon: enc(it.icon) };
        if (g.single_select) comp.choice = g.name;
        if (choice && choice.items[it.name] !== undefined) {
          comp.choice = choice.group;
          comp.image = choice.items[it.name];
          comp.state = it.name === choice.default ? 'selected' : 'optional';
          comp.extra = 0;
        }
        components.push(comp);
      }
    }
    foods.push({
      id: f.id, number: f.number ?? i + 1, name: f.name, image: enc(f.image),
      description: f.desc || f.note || components.filter((x) => x.state === 'selected' && !x.choice).map((x) => x.name).join(', '),
      prices, components,
      allergens: (f.allergies || []).map((a) => a.name).filter(Boolean),
    });
    process.stdout.write('.');
  }
  categories.push({ id: c.id, name: c.name, image: enc(c.image || c.icon), foods });
  console.log(` ${c.name}: ${foods.length}`);
}

const old = JSON.parse(fs.readFileSync(new URL('../public/data/paradis.json', import.meta.url), 'utf8'));

// Keep extras the restaurant sells but hasn't set up in 24order (e.g. the extra sauces on its pizza menu),
// and give dishes without any listed ingredients a suggested set, so every product can be changed.
// Suggested ingredients are free to remove and marked "suggested" (the restaurant can edit them later).
const oldFoods = new Map(old.categories.flatMap((c) => c.foods).map((f) => [f.name.toUpperCase().replace(/\s+/g, ' '), f]));
const SUGGEST = [
  [/KYLLINGSALAT/i, ['Kylling', 'Isbergsalat', 'Tomat', 'Agurk', 'Rødløk', 'Mais', 'Dressing']],
  [/SKINKESALAT/i, ['Skinke', 'Isbergsalat', 'Tomat', 'Agurk', 'Rødløk', 'Mais', 'Dressing']],
  [/KYLLING.*(KEBAB|MIDDAG)|KYLLINGKEBAB/i, ['Kylling', 'Isbergsalat', 'Tomat', 'Agurk', 'Rødløk', 'Kebabsaus']],
  [/KEBAB|MIDDAG/i, ['Kebabkjøtt', 'Isbergsalat', 'Tomat', 'Agurk', 'Rødløk', 'Kebabsaus']],
];
for (const c of categories) for (const f of c.foods) {
  const prev = oldFoods.get(f.name.toUpperCase().replace(/\s+/g, ' ').replace('–', '-')) || oldFoods.get(f.name.toUpperCase().replace(' - ', ' – '));
  const have = new Set(f.components.map((x) => x.name.toLowerCase()));
  for (const pc of prev?.components || []) {
    if (have.has(pc.name.toLowerCase()) || pc.choice) continue;
    if (pc.state !== 'optional') continue;
    // Per-size prices from the old data are keyed by its size codes (M, S…): map them to the new sizes by position.
    let extra = pc.extra ?? 0;
    if (extra && typeof extra === 'object') {
      const oldCodes = (prev.prices || []).map((p) => p.size);
      extra = Object.fromEntries(f.prices.map((p, k) => [p.size, Number(extra[oldCodes[k]] ?? Object.values(extra)[k] ?? 0)]));
    }
    f.components.push({ name: pc.name, state: 'optional', extra });
    have.add(pc.name.toLowerCase());
  }
  if (!f.components.some((x) => x.state === 'selected' && !x.choice)) {
    const s = SUGGEST.find(([re]) => re.test(f.name));
    // When the meat is already a "choose one" group (Kebab / Kylling), don't suggest a meat too.
    const names = s ? (f.components.some((x) => x.choice) ? s[1].slice(1) : s[1]) : [];
    f.components.unshift(...names.filter((n) => !have.has(n.toLowerCase())).map((n) => ({ name: n, state: 'selected', extra: 0, suggested: true })));
  }
}
// Every product that can be changed gets extras, using the restaurant's own extras and prices:
// the 5 kr toppings from its kebab menu and its sauces (sold at 25 kr each).
const kebabExtras = (categories.flatMap((c) => c.foods).find((f) => f.name === 'EKSTRA STOR TYRKISK KEBAB')?.components || [])
  .filter((x) => x.state === 'optional').map(({ name, extra, icon }) => ({ name, extra, icon }));
const sauceFoods = (categories.find((c) => /saus/i.test(c.name))?.foods || []).map((f) => ({ name: f.name, extra: f.prices[0]?.price || 25, icon: f.image }));
const PIZZA_TOPPINGS = ['Skinke', 'Salami', 'Pepperoni', 'Biffkjøtt', 'Kebabkjøtt', 'Kylling', 'Kjøttboller', 'Bacon', 'Champignon', 'Paprika', 'Løk', 'Mais', 'Ananas', 'Oliven', 'Jalapenos', 'Hvitløk', 'Chillipepper', 'Purreløk'];
const EXTRAS = [
  [/^HAMBURGER/i, () => [...kebabExtras.filter((x) => !/ananas/i.test(x.name)), ...sauceFoods]],
  [/SALAT/i, () => [...kebabExtras, ...sauceFoods]],
  [/POMMES/i, () => sauceFoods],
  [/KEBAB|MIDDAG/i, () => sauceFoods],
  [/GRENSELØS/i, () => PIZZA_TOPPINGS.map((name) => ({ name, extra: 0 }))],
];
const BASE = [
  [/^HAMBURGER (150|200)G/i, ['Isbergsalat', 'Tomat', 'Agurk', 'Burgerdressing']],
  [/^HAMBURGER MENY/i, ['Tomat', 'Agurk', 'Burgerdressing']],
  [/GRENSELØS/i, ['Ost', 'Pizzasaus']],
];
for (const c of categories) for (const f of c.foods) {
  const have = new Set(f.components.map((x) => x.name.toLowerCase()));
  for (const [re, names] of BASE) if (re.test(f.name)) for (const n of names) if (!have.has(n.toLowerCase())) {
    f.components.unshift({ name: n, state: 'selected', extra: 0, suggested: true }); have.add(n.toLowerCase());
  }
  const set = EXTRAS.find(([re]) => re.test(f.name));
  if (set) for (const x of set[1]()) if (!have.has(x.name.toLowerCase())) {
    f.components.push({ name: x.name, state: 'optional', extra: x.extra, icon: x.icon || null, suggested: true }); have.add(x.name.toLowerCase());
  }
  if (/GRENSELØS/i.test(f.name)) f.description = 'Lag din egen pizza: velg ingrediensene du vil ha (inntil fem).';
}

// Suggested ingredients get the restaurant's own photo of the same ingredient when it has one.
const iconOf = new Map();
for (const c of categories) for (const f of c.foods) for (const x of f.components) if (x.icon && !iconOf.has(x.name.toLowerCase())) iconOf.set(x.name.toLowerCase(), x.icon);
const ALIAS = { tomat: ['tomater', 'tomat'], rødløk: ['løk', 'rødløk'], kebabkjøtt: ['kebab'], isbergsalat: ['salat', 'isbergsalat'], kebabsaus: ['x-dressing', 'dressing'], dressing: ['x-dressing'], kylling: ['kylling'], skinke: ['skinke'], mais: ['mais'], agurk: ['agurk'] };
for (const c of categories) for (const f of c.foods) for (const x of f.components) {
  if (x.icon) continue;
  const names = ALIAS[x.name.toLowerCase()] || [x.name.toLowerCase()];
  const hit = names.map((n) => iconOf.get(n)).find(Boolean);
  if (hit) x.icon = hit;
}

const data = { restaurant: old.restaurant, source: `24order:${SERVER}`, imported_at: new Date().toISOString(), categories };
fs.writeFileSync(new URL('../public/data/paradis.json', import.meta.url), JSON.stringify(data, null, 1));
console.log('categories', categories.length, 'foods', categories.reduce((a, c) => a + c.foods.length, 0));
