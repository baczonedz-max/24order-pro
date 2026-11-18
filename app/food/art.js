// Vector art for ingredients, used by the product builder (pizza toppings, burger layers, thumbnails).
// Everything is drawn in code, so any restaurant's menu gets visuals without uploading images.

/* ---------- 1. Recognise an ingredient from its name (NO / EN / FR / AR) ---------- */
const RULES = [
  ['sauce_white', /hvitløks?saus|garlic sauce|aioli|bearnaise|béarnaise|dressing|majones|mayo|rømme|sour cream|sauce blanche|ثوم|مايونيز/i],
  ['sauce_bbq', /bbq|barbecue|barbeque/i],
  ['sauce_chili', /chili ?saus|chilisaus|chili sauce|sriracha|hot sauce|sauce piquante|harissa/i],
  ['sauce_tomato', /pizzasaus|tomatsaus|tomato sauce|sauce tomate|marinara|ketchup|صلصة/i],
  ['cheese', /\bost\b|ekstra ost|cheese|fromage|mozzarella|cheddar|parmesan|feta|gouda|جبن/i],
  ['onion_rings', /løkring|onion ring|rondelles/i],
  ['leek', /purreløk|vårløk|leek|poireau|spring onion/i],
  ['garlic', /hvitløk|garlic|\bail\b|ثوم/i],
  ['onion', /løk|onion|oignon|بصل/i],
  ['pepperoni', /pepperoni/i],
  ['salami', /salami/i],
  ['ham', /skinke|\bham\b|jambon|لحم مدخن/i],
  ['bacon', /bacon|lardon/i],
  ['mushroom', /champignon|sopp|mushroom|فطر/i],
  ['jalapeno', /jalape/i],
  ['chili', /chilli|chili|piment|فلفل حار/i],
  ['pepper', /paprika|peppermix|bell pepper|poivron|فلفل/i],
  ['olive', /oliven|olive|زيتون/i],
  ['pineapple', /ananas|pineapple|أناناس/i],
  ['corn', /\bmais\b|corn|maïs|ذرة/i],
  ['meatball', /kjøttbolle|meatball|boulette/i],
  ['chicken', /kylling|chicken|poulet|دجاج/i],
  ['kebab', /kebab|shawarma|gyros|شاورما/i],
  ['beef', /biff|kjøtt|beef|b(œ|oe)uf|steak|viande|لحم/i],
  ['tomato', /tomat|tomato|tomate|طماطم/i],
  ['pickles', /agurk|pickle|cornichon|cucumber|خيار/i],
  ['lettuce', /salat|lettuce|salade|grønnsaker|vegetables|légumes|isberg|خس/i],
  ['herbs', /dill|basilikum|basil|oregano|persille|parsley|ruccola|rucola|roquette|بقدونس/i],
  ['fries', /pommes|fries|frites|بطاطس/i],
  ['egg', /\begg\b|œuf|oeuf|بيض/i],
  ['shrimp', /reke|shrimp|prawn|crevette|روبيان/i],
  ['tuna', /tunfisk|tuna|thon|تونة/i],
];

export function kindOf(name = '') {
  for (const [k, re] of RULES) if (re.test(name)) return k;
  return 'generic';
}
export const isSauce = (k) => k.startsWith('sauce_');

/** Which visual a product gets: a pizza seen from above, a stacked burger, or the product photo. */
export function modeOf(food, categoryName = '') {
  const s = `${categoryName} ${food.name}`;
  if (/pizza|calzone|pizze/i.test(s)) return 'pizza';
  if (/burger|hamburg/i.test(s)) return 'burger';
  return 'photo';
}

/* ---------- 2. Small seeded random, so pieces land in the same place every time ---------- */
export function rng(seed) {
  let s = (Number(seed) * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/** Evenly spread points inside a circle (best-candidate sampling). */
export function scatter(seed, n, radius) {
  const r = rng(seed);
  const pts = [];
  for (let i = 0; i < n; i++) {
    let best = null;
    let bestD = -1;
    for (let k = 0; k < 18; k++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * radius;
      const p = { x: Math.cos(a) * d, y: Math.sin(a) * d, rot: r() * 360, s: 0.85 + r() * 0.3 };
      const near = pts.reduce((m, q) => Math.min(m, Math.hypot(q.x - p.x, q.y - p.y)), Infinity);
      if (near > bestD) { bestD = near; best = p; }
    }
    pts.push(best);
  }
  return pts;
}

/* ---------- 3. Pieces: one ingredient, centred on 0,0, about 28 units wide ---------- */
const drop = (fill, stroke) => `<path d="M0 -13 C6 -4 10 1 10 5 A10 10 0 0 1 -10 5 C-10 1 -6 -4 0 -13 Z" fill="${fill}" stroke="${stroke}" stroke-width="1.2"/><ellipse cx="-3.5" cy="3" rx="2.2" ry="3.2" fill="#fff" opacity=".35"/>`;

export const PIECES = {
  cheese: `<path d="M-13 7 L13 7 L13 -1 L-8 -10 Z" fill="#f8c93e" stroke="#dca32a" stroke-width="1.2" stroke-linejoin="round"/><path d="M-8 -10 L13 -1 L13 1 L-9 -8 Z" fill="#fbdc72"/><circle cx="-3" cy="2" r="2.2" fill="#e3ac2e"/><circle cx="5" cy="3.5" r="1.6" fill="#e3ac2e"/><circle cx="8" cy="-1" r="1.2" fill="#e3ac2e"/>`,
  sauce_tomato: drop('#d9452b', '#b5321d'),
  sauce_white: drop('#f6efdc', '#d8ccae'),
  sauce_bbq: drop('#6e2f1a', '#4e1f10'),
  sauce_chili: drop('#ea5320', '#c23c12'),
  ham: `<rect x="-11" y="-9" width="22" height="18" rx="5" fill="#f29fa6" stroke="#de7e86" stroke-width="1.2"/><path d="M-7 -3 Q0 -6 7 -2 M-6 3 Q1 0 6 4" stroke="#fbd0d3" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
  salami: `<circle r="12" fill="#b3222f" stroke="#86131f" stroke-width="1.6"/><circle cx="-5" cy="-4" r="1.9" fill="#f5cfc4"/><circle cx="4" cy="-6" r="1.4" fill="#f5cfc4"/><circle cx="6" cy="3" r="2" fill="#f5cfc4"/><circle cx="-2" cy="5" r="1.5" fill="#f5cfc4"/><circle cx="-7" cy="3" r="1.1" fill="#f5cfc4"/><circle cx="1" cy="-1" r="1.1" fill="#f5cfc4"/>`,
  pepperoni: `<circle r="10.5" fill="#c9352a" stroke="#97211a" stroke-width="1.6"/><circle cx="-3.5" cy="-3" r="1.5" fill="#97211a"/><circle cx="4" cy="-2" r="1.2" fill="#97211a"/><circle cx="1" cy="4" r="1.6" fill="#97211a"/><ellipse cx="-4" cy="-5" rx="3" ry="1.4" fill="#fff" opacity=".22"/>`,
  mushroom: `<path d="M-12 1 C-12 -11 12 -11 12 1 Z" fill="#ead9bd" stroke="#a88a66" stroke-width="1.3"/><path d="M-4 1 L-3.5 10 Q0 12 3.5 10 L4 1" fill="#f3e8d4" stroke="#a88a66" stroke-width="1.3"/><path d="M-8 -1 Q-6 -5 -3 -6 M8 -1 Q6 -5 3 -6" stroke="#c9ad88" stroke-width="1" fill="none"/>`,
  onion: `<circle r="10" fill="none" stroke="#b57bc4" stroke-width="3"/><circle r="6" fill="none" stroke="#dcb8e3" stroke-width="1.6"/>`,
  leek: `<circle r="9" fill="none" stroke="#8cbf57" stroke-width="3"/><circle r="5" fill="none" stroke="#cfe7ad" stroke-width="1.6"/>`,
  garlic: `<path d="M0 -11 C7 -6 9 3 6 9 Q0 12 -6 9 C-9 3 -7 -6 0 -11 Z" fill="#f6f0e2" stroke="#d6c9ad" stroke-width="1.2"/><path d="M0 -9 Q2 0 0 10" stroke="#e2d7bf" stroke-width="1" fill="none"/>`,
  pepper: `<path d="M-12 5 Q0 -12 12 5" fill="none" stroke="#2f9e45" stroke-width="5" stroke-linecap="round"/><path d="M-9 8 Q2 -2 11 10" fill="none" stroke="#e03b2c" stroke-width="4" stroke-linecap="round"/>`,
  jalapeno: `<circle r="9.5" fill="#5daf3a" stroke="#3d8a24" stroke-width="1.8"/><circle r="5.5" fill="#cfe8a9"/><circle cx="-2" cy="-1" r="1.2" fill="#f5f0cf"/><circle cx="2" cy="1" r="1.2" fill="#f5f0cf"/><circle cx="0" cy="-3" r="1" fill="#f5f0cf"/>`,
  chili: `<path d="M-11 3 Q-2 -9 11 -3" fill="none" stroke="#d62a1e" stroke-width="4.5" stroke-linecap="round"/><path d="M11 -3 l3 -3" stroke="#3d8a24" stroke-width="2.5" stroke-linecap="round"/>`,
  olive: `<circle r="8" fill="none" stroke="#2a2a2a" stroke-width="5"/><path d="M-5 -6 A8 8 0 0 1 3 -8" stroke="#777" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
  pineapple: `<path d="M-10 8 L0 -11 L10 8 Q0 11 -10 8 Z" fill="#f8d64a" stroke="#ddb228" stroke-width="1.3" stroke-linejoin="round"/><path d="M-4 3 L4 3 M-2 -2 L2 -2" stroke="#ecc137" stroke-width="1.4" stroke-linecap="round"/>`,
  corn: `<rect x="-8" y="-6" width="7" height="7" rx="2.5" fill="#f7c93c" stroke="#dba51f"/><rect x="1" y="-8" width="7" height="7" rx="2.5" fill="#f7c93c" stroke="#dba51f"/><rect x="-3" y="2" width="7" height="7" rx="2.5" fill="#f7c93c" stroke="#dba51f"/>`,
  meatball: `<circle r="9.5" fill="#6e3a22" stroke="#4f2614" stroke-width="1.4"/><circle cx="-3" cy="-3.5" r="3" fill="#8d5232" opacity=".8"/><circle cx="3" cy="3" r="1" fill="#3e1d0f"/><circle cx="-2" cy="4" r="1" fill="#3e1d0f"/>`,
  chicken: `<path d="M-11 -2 Q-9 -10 0 -9 Q10 -10 11 -1 Q12 8 2 9 Q-10 10 -11 -2 Z" fill="#e2a656" stroke="#bf8037" stroke-width="1.3"/><path d="M-6 -4 Q0 -7 6 -3" stroke="#f3c983" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  kebab: `<path d="M-12 2 Q-8 -8 0 -5 Q8 -2 12 -8 L12 -2 Q8 5 0 1 Q-8 -2 -12 8 Z" fill="#8c4c2a" stroke="#6a3519" stroke-width="1.2"/><path d="M-9 1 Q-4 -4 2 -2" stroke="#b56d40" stroke-width="1.6" fill="none"/>`,
  beef: `<circle cx="-5" cy="-3" r="5" fill="#7b4026"/><circle cx="4" cy="-4" r="4" fill="#8c4c2e"/><circle cx="1" cy="4" r="5" fill="#6a351e"/><circle cx="-6" cy="5" r="3" fill="#8c4c2e"/><circle cx="7" cy="4" r="3" fill="#7b4026"/>`,
  bacon: `<path d="M-13 -4 Q-7 -9 -1 -4 T12 -4 L13 3 Q7 -2 1 3 T-12 3 Z" fill="#bd3f35" stroke="#94281f" stroke-width="1.1"/><path d="M-12 -0.5 Q-6 -5 0 -0.5 T12.5 -0.5" stroke="#f3c7b3" stroke-width="1.8" fill="none"/>`,
  tomato: `<circle r="11" fill="#e2382b" stroke="#c12a1f" stroke-width="1.4"/><path d="M0 -8 L0 8 M-7 -4 L7 4 M-7 4 L7 -4" stroke="#f08669" stroke-width="2.2"/><circle cx="-3" cy="-4" r="1.1" fill="#fbe39e"/><circle cx="4" cy="-2" r="1.1" fill="#fbe39e"/><circle cx="-1" cy="5" r="1.1" fill="#fbe39e"/><circle r="2.4" fill="#f4a08a"/>`,
  pickles: `<circle r="9.5" fill="#8db65a" stroke="#6b9440" stroke-width="1.6"/><circle r="6" fill="none" stroke="#b9d68c" stroke-width="1.2"/><circle cx="-2" cy="-2" r=".9" fill="#e6f0cf"/><circle cx="2" cy="2" r=".9" fill="#e6f0cf"/>`,
  lettuce: `<path d="M-12 4 Q-14 -4 -7 -6 Q-6 -12 0 -10 Q6 -13 8 -6 Q14 -5 12 3 Q8 10 0 8 Q-8 11 -12 4 Z" fill="#7cc24a" stroke="#579a2d" stroke-width="1.3"/><path d="M-6 3 Q0 -2 6 -5 M0 0 L1 6" stroke="#aedc85" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
  herbs: `<path d="M0 10 Q0 0 -2 -10 M0 4 Q-6 0 -9 -4 M0 4 Q6 1 9 -3 M-1 -3 Q-5 -6 -6 -10 M-1 -3 Q3 -7 5 -10" stroke="#3f9536" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  fries: `<rect x="-9" y="-11" width="4.5" height="20" rx="1.5" fill="#f5c542" stroke="#d6a320" transform="rotate(-12)"/><rect x="-2.5" y="-12" width="4.5" height="22" rx="1.5" fill="#f8d058" stroke="#d6a320"/><rect x="4" y="-10" width="4.5" height="19" rx="1.5" fill="#f5c542" stroke="#d6a320" transform="rotate(10)"/>`,
  egg: `<path d="M-12 0 Q-12 -10 -2 -10 Q10 -11 12 -1 Q13 9 1 10 Q-12 10 -12 0 Z" fill="#fffdf5" stroke="#e6dfcc" stroke-width="1.2"/><circle cx="0" cy="0" r="5" fill="#f8b416" stroke="#e39b0b"/><circle cx="-1.5" cy="-1.5" r="1.4" fill="#fff" opacity=".6"/>`,
  shrimp: `<path d="M8 -8 A10 10 0 1 0 9 6" fill="none" stroke="#f39a6a" stroke-width="6" stroke-linecap="round"/><path d="M-3 -9 L-1 -3 M-8 -3 L-3 0 M-7 5 L-2 3" stroke="#fbd0b4" stroke-width="1.4"/>`,
  tuna: `<path d="M-10 -4 Q-2 -10 6 -5 Q12 0 6 6 Q-3 10 -9 4 Q-12 0 -10 -4 Z" fill="#d9a59b" stroke="#b9837a" stroke-width="1.2"/><path d="M-6 -2 Q0 -4 5 0 M-6 3 Q0 1 4 4" stroke="#f0cbc3" stroke-width="1.3" fill="none"/>`,
};

const HUES = ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#14b8a6', '#8b5cf6', '#ef4444', '#0ea5e9'];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function hueOf(name) {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return HUES[h % HUES.length];
}

export function piece(kind, name = '') {
  if (PIECES[kind]) return PIECES[kind];
  const c = hueOf(name);
  return `<circle r="12" fill="${c}" opacity=".18"/><circle r="12" fill="none" stroke="${c}" stroke-width="1.6"/><text y="4.5" text-anchor="middle" font-size="13" font-weight="700" fill="${c}" font-family="Readex Pro, sans-serif">${esc((name.trim()[0] || '?').toUpperCase())}</text>`;
}

/* ---------- 4. Burger layers: drawn at width W, top edge at y = 0 ---------- */
const W = 190;
const sauceColors = { sauce_white: ['#f6efdc', '#ddd0b0'], sauce_bbq: ['#6e2f1a', '#4e1f10'], sauce_chili: ['#ea5320', '#c23c12'], sauce_tomato: ['#d23b26', '#a92c19'] };

export const BUN_TOP = {
  h: 60,
  svg: `<defs><linearGradient id="bunTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4bd66"/><stop offset=".7" stop-color="#d9893a"/><stop offset="1" stop-color="#b9692a"/></linearGradient></defs>
  <path d="M2 52 C2 12 40 0 95 0 C150 0 188 12 188 52 Q188 60 178 60 L12 60 Q2 60 2 52 Z" fill="url(#bunTop)"/>
  <path d="M30 18 C50 8 80 5 100 6" stroke="#fde3b0" stroke-width="7" stroke-linecap="round" fill="none" opacity=".55"/>
  ${[[40, 26, -20], [64, 16, 10], [92, 12, -5], [120, 15, 25], [146, 24, -15], [54, 36, 30], [84, 28, 0], [112, 30, -25], [136, 38, 12], [100, 42, 40], [72, 44, -10]]
    .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="4" ry="2" fill="#fff5dc" transform="rotate(${r} ${x} ${y})"/>`).join('')}`,
};
export const BUN_BOTTOM = {
  h: 28,
  svg: `<path d="M4 0 L186 0 Q191 0 189 7 L184 21 Q182 28 174 28 L16 28 Q8 28 6 21 L1 7 Q-1 0 4 0 Z" fill="#df9a48"/><rect x="2" y="0" width="186" height="6" rx="3" fill="#f6d9a0"/>`,
};

export function layer(kind, name = '') {
  switch (kind) {
    case 'beef': case 'kebab': case 'meatball': case 'generic_meat':
      return { h: 26, svg: `<rect x="6" y="0" width="178" height="26" rx="13" fill="#5b2f1c"/><rect x="10" y="2" width="170" height="8" rx="4" fill="#7a4228" opacity=".9"/>${[24, 46, 70, 96, 122, 148, 168].map((x, i) => `<circle cx="${x}" cy="${16 + (i % 2) * 4}" r="2" fill="#3c1c0e"/>`).join('')}` };
    case 'chicken':
      return { h: 26, svg: `<path d="M8 10 Q10 0 30 2 Q60 -2 95 1 Q130 -2 160 2 Q182 0 183 12 Q185 26 165 26 L25 26 Q6 26 8 10 Z" fill="#d9963f"/>${[22, 40, 62, 84, 108, 130, 152, 170].map((x, i) => `<circle cx="${x}" cy="${6 + (i % 3) * 5}" r="${2 + (i % 2)}" fill="#f2c06c"/>`).join('')}` };
    case 'cheese':
      return { h: 8, svg: `<path d="M-4 0 L194 0 L194 7 L170 7 Q166 20 160 7 L104 7 Q99 24 93 7 L40 7 Q35 18 30 7 L-4 7 Z" fill="#f9c22e"/><rect x="-4" y="0" width="198" height="2.5" fill="#fcd96a"/>` };
    case 'lettuce':
      return { h: 12, svg: `<path d="M-8 6 Q2 -4 12 6 T32 6 T52 6 T72 6 T92 6 T112 6 T132 6 T152 6 T172 6 T198 6 L194 12 L-4 12 Z" fill="#74b843" stroke="#5a9930" stroke-width="1.2" stroke-linejoin="round"/>` };
    case 'tomato':
      return { h: 10, svg: [[44, '#e23b2e'], [95, '#e8463a'], [146, '#e23b2e']].map(([x, c]) => `<ellipse cx="${x}" cy="5" rx="32" ry="5.5" fill="${c}" stroke="#bf2a1e"/><ellipse cx="${x}" cy="4" rx="22" ry="2.6" fill="#f2836a"/>`).join('') };
    case 'onion': case 'leek': {
      const c = kind === 'onion' ? '#c08bd0' : '#8cbf57';
      return { h: 7, svg: [30, 70, 110, 150].map((x) => `<ellipse cx="${x}" cy="3.5" rx="22" ry="3.2" fill="none" stroke="${c}" stroke-width="2.4"/>`).join('') };
    }
    case 'onion_rings':
      return { h: 14, svg: [40, 95, 150].map((x) => `<ellipse cx="${x}" cy="7" rx="26" ry="6" fill="none" stroke="#d6963a" stroke-width="6"/><ellipse cx="${x}" cy="6" rx="26" ry="6" fill="none" stroke="#efbe6a" stroke-width="2"/>`).join('') };
    case 'bacon':
      return { h: 9, svg: `<path d="M0 3 Q12 -3 24 3 T48 3 T72 3 T96 3 T120 3 T144 3 T168 3 T190 3 L190 9 Q178 4 166 9 T142 9 T118 9 T94 9 T70 9 T46 9 T22 9 T0 9 Z" fill="#b83a30"/><path d="M2 6 Q14 1 26 6 T50 6 T74 6 T98 6 T122 6 T146 6 T170 6 T190 6" stroke="#f2c9b4" stroke-width="1.6" fill="none"/>` };
    case 'egg':
      return { h: 12, svg: `<path d="M2 8 Q8 0 40 2 Q95 -2 150 2 Q186 0 188 8 Q186 12 150 12 L40 12 Q4 12 2 8 Z" fill="#fffdf5" stroke="#e6dfcc"/><ellipse cx="95" cy="4" rx="22" ry="7" fill="#f8b416"/>` };
    case 'pickles': case 'jalapeno': {
      const [f, s] = kind === 'pickles' ? ['#8db65a', '#6b9440'] : ['#5daf3a', '#3d8a24'];
      return { h: 7, svg: [30, 68, 106, 144, 170].map((x) => `<ellipse cx="${x}" cy="3.5" rx="15" ry="3.5" fill="${f}" stroke="${s}"/>`).join('') };
    }
    case 'pepper': case 'chili':
      return { h: 8, svg: `<path d="M10 4 Q60 -2 100 4" stroke="#2f9e45" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M90 5 Q140 0 180 4" stroke="#e03b2c" stroke-width="5" stroke-linecap="round" fill="none"/>` };
    case 'sauce_white': case 'sauce_bbq': case 'sauce_chili': case 'sauce_tomato': {
      const [f, s] = sauceColors[kind];
      return { h: 6, svg: `<path d="M4 2 Q50 -2 95 2 T186 2 L186 5 L150 5 Q146 15 141 5 L60 5 Q56 13 51 5 L4 5 Z" fill="${f}" stroke="${s}" stroke-width=".8"/>` };
    }
    case 'mushroom':
      return { h: 9, svg: [30, 70, 110, 150].map((x) => `<path d="M${x - 18} 8 Q${x} -6 ${x + 18} 8 Z" fill="#ead9bd" stroke="#a88a66"/>`).join('') };
    case 'pineapple':
      return { h: 9, svg: `<rect x="10" y="0" width="170" height="9" rx="4.5" fill="#f8d64a" stroke="#ddb228"/>` };
    case 'ham': case 'salami': case 'pepperoni': {
      const c = kind === 'ham' ? ['#f29fa6', '#de7e86'] : ['#b3222f', '#86131f'];
      return { h: 8, svg: `<path d="M0 4 Q20 -2 40 4 T80 4 T120 4 T160 4 T190 4 L190 8 L0 8 Z" fill="${c[0]}" stroke="${c[1]}"/>` };
    }
    default: {
      const c = hueOf(name);
      return { h: 8, svg: `<rect x="8" y="0" width="174" height="8" rx="4" fill="${c}" opacity=".85"/>` };
    }
  }
}
export const LAYER_W = W;
