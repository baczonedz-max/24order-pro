// Builds public/data/paradis.json, the demo menu used until the full 24order
// menu endpoint (prices, sizes, photos, extras) is available.
// Run: node scripts/build-demo-data.mjs
import fs from 'node:fs';

const F = 'https://paradis-server.24order.com/storage/foods/';
const C = 'https://paradis-server.24order.com/storage/categories/';
const SAUCES = ['Hvitløksaus', 'Tomatsaus', 'Bearnaisesaus', 'BBQ-saus', 'Chilisaus', 'Jalapenos'];
const sauceExtras = SAUCES.map((n) => ({ name: n, state: 'optional', extra: 25 }));

const pz = [
  ['NAPOLI', '1794752166_NAPOLI4.webp', 180, 250, 'Ost, pizzasaus, skinke, salami'],
  ['MEXICO', '1794752319_MEXICO4.webp', 190, 270, 'Ost, pizzasaus, skinke, biffkjøtt, paprika, chillipepper'],
  ['NORGESPIZZA', '1794752466_NORGESPIZZA.webp', 190, 270, 'Ost, pizzasaus, skinke, champignon, løk, kjøttboller, bacon'],
  ['CALIFORNIA', '1794752576_CALIFORNIA.webp', 190, 270, 'Biff, ferske tomater, løk, paprika, BBQ-saus, fersk dill'],
  ['PARADIS', '1794752689_PARADIS.webp', 190, 270, 'Ost, pizzasaus, champignon, paprika, skinke, biff, italiensk kjøttdeig'],
  ['MILANO', '1794752828_MILANO4.webp', 190, 270, 'Ost, pizzasaus, champignon, paprika, skinke, salami, ananas'],
  ['SARPSBORG', '1794752861_SARPSBORG.webp', 190, 270, 'Ost, pizzasaus, skinke, salami, pepperoni, paprika, italiensk kjøttdeig'],
  ['HOLLYWOOD', '1794752940_HOLLYWOOD.webp', 190, 270, 'Ost, pizzasaus, skinke, salami, pepperoni, kjøttboller'],
  ['FRANSK', '1794753268_FRANSK.webp', 190, 270, 'Ost, pizzasaus, skinke, salami, champignon, biff'],
  ['SPESIAL', '1794753631_SPESIAL.webp', 195, 280, 'Ost, pizzasaus, alt av kjøtt og grønnsaker skåret i små biter'],
  ['AMERICAN WAY', '1794753914_AMERICAN%20WAY.webp', 190, 270, 'Ost, pizzasaus, skinke, salami, kjøttboller (barnepizza)'],
  ['BOSTON', '1794754476_BOSTON.webp', 190, 270, 'Ost, pizzasaus, champignon, paprika, skinke, salami, pepperoni'],
  ['GRENSELØS', '1794754609_Lag%20din%20egen%20pizza%20copy.webp', 190, 270, 'Sett sammen egen pizza. Fem ingredienser (over fem, M: 190,- S: 270,-)'],
  ['L.A.', '1794754737_L.A.webp', 190, 270, 'Ost, pizzasaus, paprika, skinke, salami, biff, kjøttboller'],
  ['SPANIA', '1794830055_SPANIA.webp', 190, 270, 'Ost, pizzasaus, skinke, salami, pepperoni, champignon, purreløk'],
  ['TURBO', '1794830159_TURBO.webp', 180, 260, 'Ost, pizzasaus, champignon, paprika, skinke, biff, hvitløk'],
  ['VEGETAR', '1794830286_VEGETAR3.webp', 180, 250, 'Ost, pizzasaus, champignon, paprika, mais, løk, oliven, ananas'],
  ['KEBABPIZZA', '1794830445_KEBABPIZZA6.webp', 190, 270, 'Ost, pizzasaus, kebabkjøtt, champignon, paprika, mais, løk, peppermix'],
  ['PEPPERONI', '1794830783_PEPPERONI.webp', 190, 270, 'Ost, pizzasaus, pepperoni, biff, løkringer, bacon'],
  ['MUSLIMSK PIZZA', '1794831020_MUSLIMSK%20PIZZA.webp', 190, 270, 'Ost, pizzasaus, champignon, paprika, biff, mais, løk, peppermix'],
  ['KYLLINGPIZZA', '1794831086_KYLLINGPIZZA.webp', 190, 270, 'Ost, pizzasaus, marinert kylling, grønnsaker'],
];

let id = 1;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const comps = (d) => d.split(/,\s*/).map((s) => ({ name: cap(s), state: 'selected' }));

const pizza = {
  id: 1,
  name: 'Pizza',
  image: C + '1794833205_Pizza.webp',
  footer: [
    { label: 'EKSTRA OST', value: 'M: 25,- / S: 35,-', icon: 'cheese' },
    { label: 'EKSTRA SAUS', value: '25,-', icon: 'sauce', note: 'Hvitløksaus / tomatsaus / bearnaisesaus / BBQ-saus / chillisaus / jalapenos' },
  ],
  foods: pz.map((p, i) => ({
    id: id++,
    number: i + 1,
    name: p[0],
    image: F + p[1],
    prices: [
      { size: 'M', label: 'Medium', price: p[2] },
      { size: 'S', label: 'Stor', price: p[3] },
    ],
    description: p[4],
    components: [...comps(p[4]), { name: 'Ekstra ost', state: 'optional', extra: { M: 25, S: 35 } }, ...sauceExtras],
  })),
};

const ADD = ['Mais', 'Løk', 'Ost', 'Ananas', 'Hvitløk', 'Jalapenos', 'Tomater', 'X-dressing'].map((n) => ({ name: n, state: 'optional', extra: 5 }));
const kebabImg = C + '1794833229_kebab%202.webp';
const kb = [
  // Kebab or chicken: choose one; each choice shows its own photo of the dish.
  ['KEBAB I RULL', 120, 'Kebab / kylling', [
    { name: 'Kebab', state: 'selected', choice: 'Kjøtt', image: F + encodeURI('1794750428_RULL.webp') },
    { name: 'Kylling', state: 'optional', choice: 'Kjøtt', image: F + encodeURI('1794751528_Rullekebab kylling 1.webp') },
  ]],
  ['EKSTRA STOR TYRKISK KEBAB', 120],
  ['STOR TYRKISK KEBAB', 110],
  ['LITEN TYRKISK KEBAB', 100],
  ['EKSTRA STOR KYLLINGKEBAB', 120],
  ['STOR KYLLINGKEBAB', 110],
  ['LITEN KYLLINGKEBAB', 100],
  ['KEBABMIDDAG (TYRKISK)', 160, 'Med / uten pommes frites (+10,-)', [{ name: 'Pommes frites', state: 'optional', extra: 10 }]],
  ['KYLLINGMIDDAG (TYRKISK)', 160, 'Med / uten pommes frites (+10,-)', [{ name: 'Pommes frites', state: 'optional', extra: 10 }]],
];
const one = (price) => [{ size: '', label: '', price }];
const kebab = {
  id: 2,
  name: 'Kebab',
  image: kebabImg,
  footer: [{ label: 'EKSTRA TILBEHØR', value: '5,-', note: 'Mais / løk / ost / ananas / hvitløk / jalapenos / tomater / x-dressing' }],
  foods: kb.map((k, i) => ({ id: id++, number: i + 1, name: k[0], image: kebabImg, prices: one(k[1]), description: k[2] || '', components: [...(k[3] || []), ...ADD] })),
};

const hImg = C + '1794833183_Hamburger.webp';
const hb = [
  ['HAMBURGER MENY 200G', 140, 'm/salat og pommes frites', true],
  ['HAMBURGER MENY 150G', 125, 'm/salat og pommes frites', true],
  ['HAMBURGER 200G', 120, ''],
  ['HAMBURGER 150G', 100, ''],
];
const burgers = {
  id: 3,
  name: 'Hamburgere',
  image: hImg,
  footer: [{ label: 'TILLEGG FOR OST', value: '5,-' }],
  foods: hb.map((h, i) => ({
    id: id++, number: i + 1, name: h[0], image: hImg, prices: one(h[1]), description: h[2],
    components: [...(h[3] ? [{ name: 'Salat', state: 'selected' }, { name: 'Pommes frites', state: 'selected' }] : []), { name: 'Ost', state: 'optional', extra: 5 }],
  })),
};

const simple = (cid, name, img, items) => ({
  id: cid, name, image: img,
  foods: items.map((it, i) => ({ id: id++, number: i + 1, name: it[0], image: it[2] || img, prices: one(it[1]), description: it[3] || '', components: [], tag: it[4] || null })),
});
const salater = simple(4, 'Salater', C + '1794833021_Salater2.webp', [['KYLLINGSALAT', 90], ['SKINKESALAT', 90]]);
const pommes = simple(5, 'Pommes frites', C + '1794833267_chips.webp', [['POMMES FRITES – STOR', 60], ['POMMES FRITES – LITEN', 40]]);
const drikke = simple(6, 'Drikke', C + '1794833133_Drikke.webp', [['MINERALVANN 1,5 LITER (TAKEAWAY)', 55, null, '', '1,5 L'], ['MINERALVANN 0,5 LITER', 35, null, '', '0,5 L']]);
const sauser = simple(7, 'Sauser', C + '1794833050_dressing.webp', [['Hvitløksaus', 25], ['BBQ-saus', 25], ['Chilisaus', 25], ['Bearnaisesaus', 25], ['Tomatsaus', 25]]);
sauser.footer = [{ label: 'PRIS PER SAUS', value: '25,-' }];

const data = {
  restaurant: {
    name: 'Paradis Pizza AS',
    logo: 'https://paradis-server.24order.com/storage/settings_setup/1794749967_Asset%2025@4x.webp',
    currency: 'kr',
    priceStyle: 'dash',
    country: 'NO',
  },
  source: 'demo',
  categories: [pizza, kebab, burgers, salater, pommes, drikke, sauser],
};

// Each product's own photo, as shown on paradis-order.24order.com (pizzas already have theirs above).
const PHOTOS = {
  'KEBAB I RULL': '1794750428_RULL.webp',
  'EKSTRA STOR TYRKISK KEBAB': '1794831387_TYRKISK KEBAB.webp',
  'STOR TYRKISK KEBAB': '1794831332_TYRKISK KEBAB.webp',
  'LITEN TYRKISK KEBAB': '1794831357_TYRKISK KEBAB.webp',
  'EKSTRA STOR KYLLINGKEBAB': '1794751546_Rullekebab kylling 1.webp',
  'STOR KYLLINGKEBAB': '1794751528_Rullekebab kylling 1.webp',
  'LITEN KYLLINGKEBAB': '1794751580_Rullekebab kylling 1.webp',
  'KEBABMIDDAG (TYRKISK)': '1794832857_KEBABMIDDAG (TYRKISK).webp',
  'KYLLINGMIDDAG (TYRKISK)': '1794832300_KYLLINGMIDDAG (TYRKISK) .webp',
  'HAMBURGER MENY 200G': '1794750658_Hamburgertallerken.webp',
  'HAMBURGER MENY 150G': '1794750674_Hamburgertallerken.webp',
  'HAMBURGER 150G': '1794750694_Hamburge.webp',
  'HAMBURGER 200G': '1794750710_Hamburge.webp',
  'KYLLINGSALAT': '1794750730_Kyllingsalat.webp',
  'SKINKESALAT': '1794750745_Skinkesalat.webp',
  'POMMES FRITES – STOR': '1794750846_Chips.webp',
  'POMMES FRITES – LITEN': '1794750864_Chips.webp',
  'Hvitløksaus': '1794750879_Hvitløkssaus.webp',
  'BBQ-saus': '1794750890_BBQsuce.webp',
  'Chilisaus': '1794750903_CHILLISAUS.webp',
  'Bearnaisesaus': '1794750917_Béarnaisesaus.webp', // the server stores the accent decomposed (e + ´)
  'Tomatsaus': '1794750939_Tomatsaus2.webp',
  'MINERALVANN 0,5 LITER': '1794751364_MINERALVANN 0,5 LITER.webp',
  'MINERALVANN 1,5 LITER (TAKEAWAY)': '1794751478_MINERALVANN 1,5 LITER.webp',
};
for (const c of data.categories) for (const f of c.foods) if (PHOTOS[f.name]) f.image = F + encodeURI(PHOTOS[f.name]);

fs.writeFileSync(new URL('../public/data/paradis.json', import.meta.url), JSON.stringify(data, null, 1));
console.log('categories', data.categories.length, 'foods', data.categories.reduce((a, c) => a + c.foods.length, 0));
